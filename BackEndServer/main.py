import json
import base64
import ssl
import time
from datetime import datetime

import firebase_admin
from firebase_admin import credentials, firestore
from Crypto.Cipher import AES
from Crypto.Hash import HMAC, SHA256
from paho.mqtt import client as mqtt

import anomaly_detector


# =========================
# MQTT CONFIG
# =========================
BROKER_HOST = "Akila"
BROKER_PORT = 8883
TOPIC = "iot/sensor/dht22/secure"

CA_CERT = r"C:\mosquitto\certs\ca.crt"


# =========================
# FIREBASE CONFIG
# =========================
FIREBASE_SERVICE_ACCOUNT = r"C:\Users\ASUS\Downloads\Sentinel Guard (2)\Sentinel Guard\serviceAccountKey.json"

SENSOR_COLLECTION   = "sensor_data"
SECURITY_COLLECTION = "security_events"
SYSTEM_LOG_COLLECTION = "system_logs"


# =========================
# CRYPTO CONFIG
# =========================
AES_KEY  = b"12345678ABCDEFGH"
AES_IV   = b"HGFEDCBA87654321"
HMAC_KEY = b"my_hmac_secret_2026"


# =========================
# DEVICE STATE
# =========================
DEVICE_ID        = "esp32_001"
last_sequence_id = 0

# Set to "Outdoor" if this ESP32 is placed outside.
# Indoor  normal range: 22°C – 35°C
# Outdoor normal range: 22°C – 38°C
SENSOR_LABEL = "Indoor"

# Tracks the last valid humidity received from the ESP32.
# When the DHT22 fails to read (humidity_valid = False), the packet
# arrives with humidity = None. Without this, the terminal shows
# "INVALID" indefinitely and None gets stored in Firebase.
# The anomaly_detector module maintains its own internal copy for
# feature computation — this one is for display and Firebase records.
_last_valid_humidity = None

# Tracks the last valid temperature from the ESP32.
# When the DHT22 fails at high heat (temperature_valid = False), temperature
# arrives as None and Step 8 is skipped — so out_of_range never fires on the
# way UP through the threshold. This lets us still check the bound using the
# last known value and report the anomaly at the right time.
_last_valid_temp = None

HUMIDITY_SPIKE_THRESHOLD     = 15
HUMIDITY_INVALID_MIN_STREAK  = 3
HUMIDITY_ROLLING_WINDOW      = 5
_humidity_valid_streak       = 0
_humidity_rolling            = []


# =========================
# DDOS DETECTION CONFIG
# =========================
DDOS_THRESHOLD   = 20       # maximum packets allowed
DDOS_TIME_WINDOW = 5        # seconds
DDOS_COOLDOWN    = 10       # seconds to block traffic after detection

message_times  = []
ddos_block_until = 0        # each time until which incoming traffic is blocked 


# =========================
# REPLAY ATTACK MITIGATION CONFIG
# =========================
REPLAY_THRESHOLD      = 5   # max replay attempts before blocking
REPLAY_TIME_WINDOW    = 10  # seconds to track replay attempts in
REPLAY_BLOCK_DURATION = 30  # seconds to block device after threshold hit

replay_attempt_times = []
replay_block_until   = 0    # epoch time until which device is blocked


# =========================
# FDI RANGE GUARD CONFIG
# Fast pre-ML check; catches physically impossible values before anomaly_detector runs
# =========================
FDI_MIN_TEMP = -45
FDI_MAX_TEMP = 85
FDI_MIN_HUM  = -5
FDI_MAX_HUM  = 105


# =========================
# FIREBASE INIT
# =========================
cred = credentials.Certificate(FIREBASE_SERVICE_ACCOUNT)
firebase_admin.initialize_app(cred)
db = firestore.client()


def now():
    return datetime.now().strftime("%Y-%m-%d %H:%M:%S")


def upload_sensor_data(data):
    try:
        db.collection(SENSOR_COLLECTION).add(data)
        return True
    except Exception as e:
        print("Firebase sensor_data upload failed:", e)
        return False


def upload_security_event(event_type, message, seq=None, raw=None):
    try:
        event = {
            "deviceId":     DEVICE_ID,
            "eventType":    event_type,
            "message":      message,
            "sequence_id":  seq,
            "timestamp":    now(),
            "acknowledged": False,
        }
        if raw:
            event["raw_packet"] = raw

        db.collection(SECURITY_COLLECTION).add(event)

        print("----------------------------------------")
        print("SECURITY EVENT UPLOADED")
        print(f"Event Type   : {event_type}")
        print(f"Message      : {message}")
        print(f"Sequence ID  : {seq}")
        print("----------------------------------------")

    except Exception as e:
        print("Firebase security_events upload failed:", e)


def upload_system_log(level, message, details=None):
    """
    Writes a general operational log entry to system_logs.

    level   : "info" | "warning" | "error"
    message : short human-readable description
    details : optional dict of extra fields
    """
    try:
        entry = {
            "deviceId":  DEVICE_ID,
            "level":     level,
            "message":   message,
            "timestamp": now(),
        }
        if details:
            entry.update(details)
        db.collection(SYSTEM_LOG_COLLECTION).add(entry)
    except Exception as e:
        print(f"Firebase system_logs upload failed: {e}")


def upload_mitigation_event(action, reason, duration_seconds=None):
    try:
        event = {
            "deviceId":         DEVICE_ID,
            "eventType":        "mitigation_applied",
            "mitigationAction": action,
            "message":          reason,
            "duration_seconds": duration_seconds,
            "timestamp":        now(),
            "acknowledged":     False,
        }
        db.collection(SECURITY_COLLECTION).add(event)

        print("----------------------------------------")
        print("MITIGATION EVENT UPLOADED")
        print(f"Action       : {action}")
        print(f"Reason       : {reason}")
        if duration_seconds:
            print(f"Duration     : {duration_seconds} seconds")
        print("----------------------------------------")

    except Exception as e:
        print("Firebase mitigation upload failed:", e)


def detect_ddos():
    """
    Tracks packet rate and enforces a cooldown block when the threshold is exceeded.

    Returns:
        ("detected" | "blocked" | "normal", packet_count)
    """
    global message_times, ddos_block_until

    current_time = time.time()

    # If currently in cooldown block, reject without updating the window
    if current_time < ddos_block_until:
        return "blocked", len(message_times)

    message_times.append(current_time)
    message_times = [t for t in message_times if current_time - t <= DDOS_TIME_WINDOW]
    packet_count  = len(message_times)

    if packet_count > DDOS_THRESHOLD:
        ddos_block_until = current_time + DDOS_COOLDOWN
        return "detected", packet_count

    return "normal", packet_count


def detect_and_mitigate_replay(seq):
    """
    Checks if the incoming sequence ID is a replay.
    Tracks attempt rate and blocks the device if the threshold is exceeded.

    Returns:
        (is_replay: bool, block_active: bool, attempt_count: int, block_remaining: int)
    """
    global replay_attempt_times, replay_block_until

    current_time = time.time()

    if current_time < replay_block_until:
        remaining = int(replay_block_until - current_time)
        return True, True, None, remaining

    if seq <= last_sequence_id:
        replay_attempt_times.append(current_time)
        replay_attempt_times[:] = [
            t for t in replay_attempt_times
            if current_time - t <= REPLAY_TIME_WINDOW
        ]

        attempt_count = len(replay_attempt_times)

        if attempt_count >= REPLAY_THRESHOLD:
            replay_block_until = current_time + REPLAY_BLOCK_DURATION
            return True, False, attempt_count, None

        return True, False, attempt_count, None

    return False, False, 0, None


def check_fdi_range(data):
    """
    Fast pre-ML range guard for physically impossible sensor values.
    Runs before anomaly_detector to catch clear FDI attempts early.

    Only checks values the ESP32 has marked as valid — invalid readings
    (humidity_valid=False, temperature_valid=False) are skipped so that
    normal DHT22 read failures don't get flagged as FDI and block the packet.

    Returns:
        (anomaly_detected: bool, reasons: list[str])
    """
    anomaly_detected = False
    reasons = []

    temp_valid = data.get("temperature_valid", False)
    hum_valid  = data.get("humidity_valid",    False)

    if temp_valid:
        temperature = data.get("temperature")
        if temperature is not None:
            try:
                temperature = float(temperature)
                if temperature < FDI_MIN_TEMP or temperature > FDI_MAX_TEMP:
                    anomaly_detected = True
                    reasons.append(
                        f"temperature {temperature}°C outside valid range "
                        f"[{FDI_MIN_TEMP}–{FDI_MAX_TEMP}°C]"
                    )
            except ValueError:
                anomaly_detected = True
                reasons.append("temperature is not numeric")

    if hum_valid:
        humidity = data.get("humidity")
        if humidity is not None:
            try:
                humidity = float(humidity)
                if humidity < FDI_MIN_HUM or humidity > FDI_MAX_HUM:
                    anomaly_detected = True
                    reasons.append(
                        f"humidity {humidity}% outside valid range "
                        f"[{FDI_MIN_HUM}–{FDI_MAX_HUM}%]"
                    )
            except ValueError:
                anomaly_detected = True
                reasons.append("humidity is not numeric")

    return anomaly_detected, reasons


def resolve_display_humidity(raw_humidity, anomaly_result):
    """
    Returns the humidity value to show in the terminal and store in Firebase.

    Priority:
      1. Live reading from ESP32 (if valid)
      2. The value the anomaly model actually used (last_known or fallback)
      3. None only if the model did not run at all
    """
    if raw_humidity is not None:
        return raw_humidity, "live"
    if anomaly_result and anomaly_result.get("humidity_used") is not None:
        return anomaly_result["humidity_used"], anomaly_result.get("humidity_source", "estimated")
    return None, "unavailable"


def pkcs7_unpad(data):
    pad_len = data[-1]
    if pad_len < 1 or pad_len > 16:
        raise ValueError("Invalid padding")
    if data[-pad_len:] != bytes([pad_len]) * pad_len:
        raise ValueError("Bad PKCS7 padding")
    return data[:-pad_len]


def decrypt_aes_base64(enc_b64):
    encrypted = base64.b64decode(enc_b64)
    cipher    = AES.new(AES_KEY, AES.MODE_CBC, AES_IV)
    decrypted = cipher.decrypt(encrypted)
    return pkcs7_unpad(decrypted).decode("utf-8")


def compute_hmac_hex(data):
    h = HMAC.new(HMAC_KEY, digestmod=SHA256)
    h.update(data.encode("utf-8"))
    return h.hexdigest()


def print_sensor_output(seq, temperature, raw_humidity, display_humidity,
                        humidity_source, temp_status, hum_status,
                        packet_status, timestamp, upload_success, anomaly_result):
    print("New Sensor Packet Received")
    print("----------------------------------------")
    print(f"Device ID          : {DEVICE_ID}")
    print(f"Sequence ID        : {seq}")

    if temperature is not None:
        print(f"Temperature        : {temperature} C")
    else:
        print("Temperature        : INVALID")

    # Show resolved humidity — never blank after the first valid reading
    if display_humidity is not None:
        source_note = f"  [{humidity_source}]" if humidity_source != "live" else ""
        print(f"Humidity           : {display_humidity} %{source_note}")
    else:
        print("Humidity           : INVALID")

    print(f"Temperature Status : {temp_status}")
    print(f"Humidity Status    : {hum_status}")
    print(f"Packet Status      : {packet_status}")
    print(f"Timestamp          : {timestamp}")

    if anomaly_result:
        if "error" in anomaly_result:
            print(f"Anomaly Detection  : ERROR — {anomaly_result['error']}")
        elif anomaly_result["anomaly_detected"] == 1:
            print(f"Anomaly Detection  : ANOMALY DETECTED")
            print(f"Confidence         : {anomaly_result['anomaly_proba'] * 100:.1f}%")
            if anomaly_result["out_of_range"]:
                print(f"Reason             : Temperature out of normal range")
        else:
            print(f"Anomaly Detection  : Normal")
            print(f"Confidence         : {(1 - anomaly_result['anomaly_proba']) * 100:.1f}% normal")

    if upload_success:
        print("Firebase Upload    : SUCCESS")
    else:
        print("Firebase Upload    : FAILED")

    print("----------------------------------------")


def on_connect(client, userdata, flags, reason_code, properties=None):
    print("MQTT Receiver Started")
    print("Connected to broker:", reason_code)
    client.subscribe(TOPIC)
    print("Subscribed topic   :", TOPIC)

    model_ready = anomaly_detector.is_ready()
    if model_ready:
        print("Anomaly Model      : Loaded and ready")
    else:
        print("Anomaly Model      : NOT LOADED — check models/ folder")

    upload_system_log("info", "MQTT receiver started", {
        "broker":      BROKER_HOST,
        "port":        BROKER_PORT,
        "topic":       TOPIC,
        "sensorLabel": SENSOR_LABEL,
        "modelReady":  model_ready,
    })
    print("Waiting for ESP32 sensor packets...")


def on_message(client, userdata, msg):
    global last_sequence_id, _last_valid_humidity, _last_valid_temp
    global _humidity_valid_streak, _humidity_rolling
    global ddos_block_until

    # ── Decode and sanitise payload ────────────────────────────────────────
    raw_text = msg.payload.decode(errors="ignore").strip().strip("\x00")

    # Empty payload — MQTT keep-alive / broker control / retained null.
    # Nothing to parse, silently drop.
    if not raw_text:
        return

    # ================================================================
    # STEP 1 — DDOS DETECTION
    # ================================================================
    ddos_status, packet_count = detect_ddos()

    if ddos_status == "detected":
        print("ALERT: DDOS ATTACK DETECTED")
        print("----------------------------------------")
        print(f"Packets Received : {packet_count}")
        print(f"Time Window      : {DDOS_TIME_WINDOW} seconds")
        print(f"Threshold        : {DDOS_THRESHOLD} packets")
        print(f"Mitigation       : Incoming packets ignored for {DDOS_COOLDOWN} seconds")
        print("----------------------------------------")
        upload_security_event(
            "ddos_attack",
            f"DDoS detected: {packet_count} packets within {DDOS_TIME_WINDOW}s. "
            f"Cooldown activated for {DDOS_COOLDOWN}s.",
            raw=raw_text
        )
        return

    if ddos_status == "blocked":
        print("DDOS MITIGATION ACTIVE - Packet ignored")
        return

    # ================================================================
    # STEP 2 — UNENCRYPTED FDI DETECTOR
    # Catches valid JSON with sensor fields but no crypto envelope.
    # Must run before the outer JSON parse so it fires BEFORE KeyError.
    # ================================================================
    try:
        _probe = json.loads(raw_text)
        if ("temperature" in _probe or "humidity" in _probe) and "ciphertext" not in _probe:
            upload_security_event(
                "fdi_attack_unencrypted",
                f"Unencrypted FDI attempt — raw sensor fields without encryption: "
                f"temp={_probe.get('temperature')} hum={_probe.get('humidity')}",
                raw=raw_text
            )
            return
    except json.JSONDecodeError:
        pass  # not JSON — handled below

    # ================================================================
    # STEP 3 — PARSE OUTER PACKET STRUCTURE
    # Three separate except clauses so each failure type is handled
    # correctly and never logged under the wrong event type.
    # ================================================================
    try:
        packet        = json.loads(raw_text)
        seq           = packet["sequence_id"]
        ciphertext    = packet["ciphertext"]
        received_hmac = packet["hmac"]

    except json.JSONDecodeError as e:
        # Not valid JSON at all — empty, binary, or garbage payload.
        # Rate-aware: if this is part of a flood, log ddos_attack.
        _rate = len(message_times)
        if _rate >= DDOS_THRESHOLD:
            ddos_block_until = time.time() + DDOS_COOLDOWN
            upload_security_event(
                "ddos_attack",
                f"DDoS flood with non-JSON packets: "
                f"{_rate} packets in {DDOS_TIME_WINDOW}s. Cooldown {DDOS_COOLDOWN}s.",
                raw=raw_text
            )
        elif _rate > 3:
            pass   # rate rising — flood buildup, silently drop
        else:
            upload_security_event("malformed_packet", f"Bad structure: {e}", raw=raw_text)
        return

    except KeyError:
        # Valid JSON but missing crypto fields (sequence_id / ciphertext / hmac).
        # This is a crafted packet — DDoS test tools, probing scripts, etc.
        # Already counted in the DDoS window by detect_ddos() above.
        # Silently drop — do NOT log as malformed_packet.
        return

    # ================================================================
    # STEP 4 — HMAC VERIFICATION
    # ================================================================
    try:
        expected_hmac = compute_hmac_hex(ciphertext)
        hmac_valid    = (expected_hmac == received_hmac)
    except Exception as e:
        upload_security_event("processing_error", f"HMAC computation error: {e}", seq, raw_text)
        return

    if not hmac_valid:
        print("ALERT: HMAC VERIFICATION FAILED")
        print("----------------------------------------")
        print(f"Sequence ID : {seq}")
        print("Detection   : Forged / tampered packet")
        print("Mitigation  : Packet rejected before decryption")
        print("----------------------------------------")
        upload_security_event(
            "integrity_violation",
            "HMAC verification failed. Packet rejected before decryption.",
            seq, raw_text
        )
        return

    # ================================================================
    # STEP 5 — REPLAY DETECTION
    # ================================================================
    is_replay, block_active, attempt_count, block_remaining = detect_and_mitigate_replay(seq)

    if block_active:
        print("ALERT: PACKET DROPPED — Device blocked due to replay mitigation")
        print("----------------------------------------")
        print(f"Sequence ID     : {seq}")
        print(f"Block Remaining : {block_remaining} seconds")
        print("----------------------------------------")
        return

    if is_replay:
        print("ALERT: REPLAY ATTACK DETECTED")
        print("----------------------------------------")
        print(f"Received Sequence ID : {seq}")
        print(f"Last Accepted ID     : {last_sequence_id}")
        print(f"Attempt Count        : {attempt_count}/{REPLAY_THRESHOLD} in {REPLAY_TIME_WINDOW}s window")
        print("Mitigation           : Packet rejected")
        print("----------------------------------------")
        if attempt_count >= REPLAY_THRESHOLD:
            print(f"MITIGATION: Replay threshold exceeded — device blocked for {REPLAY_BLOCK_DURATION}s")
            upload_security_event(
                "replay_attack",
                f"Replay detected. Seq {seq}, last accepted {last_sequence_id}. "
                f"Attempt {attempt_count}/{REPLAY_THRESHOLD}.",
                seq, raw_text
            )
            upload_mitigation_event(
                "temporary_block",
                f"Device blocked after {attempt_count} replay attempts in {REPLAY_TIME_WINDOW}s",
                duration_seconds=REPLAY_BLOCK_DURATION
            )
        else:
            upload_security_event(
                "replay_attack",
                f"Replay detected. Seq {seq}, last accepted {last_sequence_id}. "
                f"Attempt {attempt_count}/{REPLAY_THRESHOLD}.",
                seq, raw_text
            )
        return

    # ================================================================
    # STEP 6 — AES DECRYPTION
    # ================================================================
    try:
        plain     = decrypt_aes_base64(ciphertext)
        data      = json.loads(plain)
        inner_seq = data.get("sequence_id")
    except Exception as e:
        print(f"ALERT: DECRYPTION FAILED — {e}")
        upload_security_event("decryption_error", f"AES decryption failed: {e}", seq, raw_text)
        return

    # ================================================================
    # STEP 7 — SEQUENCE ID MISMATCH
    # ================================================================
    if inner_seq != seq:
        print("ALERT: SEQUENCE ID MISMATCH")
        print("----------------------------------------")
        print(f"Outer Sequence ID : {seq}")
        print(f"Inner Sequence ID : {inner_seq}")
        print("----------------------------------------")
        upload_security_event(
            "sequence_mismatch",
            f"Outer seq {seq} does not match inner seq {inner_seq}. Packet rejected.",
            seq, raw_text
        )
        return

    # ================================================================
    # STEP 8 — FDI RANGE GUARD (pre-ML)
    # ================================================================
    try:
        fdi_detected, fdi_reasons = check_fdi_range(data)
    except Exception as e:
        upload_security_event("fdi_check_error", f"FDI range check error: {e}", seq, raw_text)
        return

    if fdi_detected:
        print("ALERT: FDI / RANGE VIOLATION DETECTED")
        print("----------------------------------------")
        print(f"Sequence ID : {seq}")
        print(f"Temperature : {data.get('temperature')}")
        print(f"Humidity    : {data.get('humidity')}")
        print(f"Reason      : {', '.join(fdi_reasons)}")
        print("Mitigation  : Packet rejected")
        print("----------------------------------------")
        upload_security_event(
            "fdi_attack",
            f"False Data Injection: {', '.join(fdi_reasons)}",
            seq, raw_text
        )
        return

    # All security checks passed — accept packet
    last_sequence_id = seq

    # ================================================================
    # STEP 9 — EXTRACT SENSOR VALUES
    # ================================================================
    temp_valid  = data.get("temperature_valid", False)
    hum_valid   = data.get("humidity_valid",    False)

    temperature  = data.get("temperature") if temp_valid else None
    raw_humidity = data.get("humidity")    if hum_valid  else None

    if raw_humidity is not None:
        _last_valid_humidity = raw_humidity

    # Last-valid-temp check: flag if sensor went invalid while already out of range
    if temperature is None and _last_valid_temp is not None:
        low, high = anomaly_detector.TEMP_BOUNDS.get(SENSOR_LABEL.lower(), (22, 38))
        if _last_valid_temp < low or _last_valid_temp > high:
            reason = (
                f"Temperature sensor went invalid while last known reading "
                f"({_last_valid_temp}C) was out of range [{low}-{high}C]"
            )
            print("ALERT: TEMPERATURE OUT OF RANGE — SENSOR NOW INVALID")
            print("----------------------------------------")
            print(f"Last Valid Temp : {_last_valid_temp} C")
            print(f"Normal Range    : {low}-{high} C")
            print("----------------------------------------")
            upload_security_event("anomaly_detected", reason, seq)

    if temperature is not None:
        _last_valid_temp = temperature

    # ================================================================
    # STEP 10 — HUMIDITY SPIKE / SUDDEN INVALID DETECTION
    # ================================================================
    hum_anomaly        = False
    hum_anomaly_reason = ""

    if hum_valid and raw_humidity is not None:
        if _humidity_rolling:
            avg    = sum(_humidity_rolling) / len(_humidity_rolling)
            change = abs(float(raw_humidity) - avg)
            if change >= HUMIDITY_SPIKE_THRESHOLD:
                hum_anomaly        = True
                hum_anomaly_reason = (
                    f"Humidity spike: {raw_humidity}% "
                    f"(avg {avg:.1f}%, jumped {change:.1f}%)"
                )
        _humidity_rolling.append(float(raw_humidity))
        if len(_humidity_rolling) > HUMIDITY_ROLLING_WINDOW:
            _humidity_rolling.pop(0)
        _humidity_valid_streak += 1
    else:
        if _humidity_valid_streak >= HUMIDITY_INVALID_MIN_STREAK:
            hum_anomaly        = True
            hum_anomaly_reason = (
                f"DHT22 humidity suddenly invalid after "
                f"{_humidity_valid_streak} consecutive valid readings"
            )
        _humidity_valid_streak = 0

    if hum_anomaly:
        print("ALERT: HUMIDITY ANOMALY DETECTED")
        print("----------------------------------------")
        print(f"Sequence ID : {seq}")
        print(f"Reason      : {hum_anomaly_reason}")
        print("----------------------------------------")
        upload_security_event("humidity_anomaly", hum_anomaly_reason, seq)

    temp_status   = data.get("temperature_status", "unknown")
    hum_status    = data.get("humidity_status",    "unknown")
    packet_status = data.get("packet_status", data.get("status", "unknown"))
    timestamp     = now()

    # ================================================================
    # STEP 11 — ML ANOMALY DETECTION
    # ================================================================
    BOUNDS      = {"indoor": (22, 35), "outdoor": (22, 38)}
    _low, _high = BOUNDS.get(SENSOR_LABEL.strip().lower(), (22, 38))
    _temp_oob   = temperature is not None and (
        float(temperature) < _low or float(temperature) > _high
    )

    anomaly_result = None

    if temperature is not None:
        try:
            anomaly_result = anomaly_detector.predict(
                temperature  = temperature,
                humidity     = raw_humidity,
                sensor_label = SENSOR_LABEL
            )
        except Exception as e:
            print(f"[AnomalyDetector] Prediction failed: {e}")
            anomaly_result = None

    # Hard bounds fallback — fires even if ML failed
    if anomaly_result is None and temperature is not None:
        anomaly_result = {
            "anomaly_detected": 1 if _temp_oob else 0,
            "anomaly_proba":    1.0 if _temp_oob else 0.0,
            "out_of_range":     _temp_oob,
            "humidity_used":    raw_humidity,
            "humidity_source":  "live" if raw_humidity else "unavailable",
        }

    # Hard bounds always win over ML prediction
    if anomaly_result is not None and _temp_oob:
        anomaly_result["anomaly_detected"] = 1
        anomaly_result["out_of_range"]     = True

    if anomaly_result and anomaly_result.get("anomaly_detected") == 1:
        upload_security_event(
            event_type = "anomaly_detected",
            message    = (
                f"Anomaly on {SENSOR_LABEL}. "
                f"Temp: {temperature}C (range {_low}-{_high}C)  "
                f"Humidity: {anomaly_result.get('humidity_used')}%  "
                f"Confidence: {anomaly_result.get('anomaly_proba', 0) * 100:.1f}%  "
                f"OutOfRange: {anomaly_result.get('out_of_range')}"
            ),
            seq = seq
        )

    # ================================================================
    # STEP 12 — BUILD + UPLOAD FIREBASE RECORD
    # ================================================================
    display_humidity, humidity_source = resolve_display_humidity(raw_humidity, anomaly_result)

    record = {
        "deviceId":           DEVICE_ID,
        "sequence_id":        seq,
        "temperature":        temperature,
        "humidity":           display_humidity,
        "humidity_source":    humidity_source,
        "temperature_status": temp_status,
        "humidity_status":    hum_status,
        "packet_status":      packet_status,
        "timestamp":          timestamp,
        "sensor_label":       SENSOR_LABEL,
        "anomaly_detected":   anomaly_result.get("anomaly_detected") if anomaly_result else None,
        "anomaly_proba":      anomaly_result.get("anomaly_proba")     if anomaly_result else None,
        "out_of_range":       anomaly_result.get("out_of_range")      if anomaly_result else None,
    }

    upload_success = upload_sensor_data(record)

    upload_system_log("info", "Sensor packet accepted", {
        "sequenceId":      seq,
        "temperature":     temperature,
        "humidity":        display_humidity,
        "humiditySource":  humidity_source,
        "packetStatus":    packet_status,
        "anomalyDetected": anomaly_result.get("anomaly_detected") if anomaly_result else None,
        "firebaseUpload":  upload_success,
    })

    print_sensor_output(
        seq, temperature, raw_humidity, display_humidity,
        humidity_source, temp_status, hum_status,
        packet_status, timestamp, upload_success, anomaly_result
    )


client = mqtt.Client(mqtt.CallbackAPIVersion.VERSION2)
client.on_connect = on_connect
client.on_message = on_message


# =========================
# TLS CONFIG
# =========================
client.tls_set(
    ca_certs  = CA_CERT,
    certfile  = None,
    keyfile   = None,
    cert_reqs = ssl.CERT_REQUIRED
)

# If TLS certificate error occurs during testing, comment the block above
# and use these two lines temporarily:
# client.tls_set(cert_reqs=ssl.CERT_NONE)
# client.tls_insecure_set(True)


client.connect(BROKER_HOST, BROKER_PORT, 60)
client.loop_forever()
