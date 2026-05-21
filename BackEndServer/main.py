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


BROKER_HOST = "172.20.10.14"
BROKER_PORT = 8883
TOPIC = "iot/sensor/dht22/secure"

MQTT_USERNAME = "sentinelcredentials"
MQTT_PASSWORD = "admin321"

CA_CERT = r"C:\mosquitto\certs\ca.crt"

FIREBASE_SERVICE_ACCOUNT = r"C:\Users\methd\Downloads\Sentinel Guard (2)\Sentinel Guard\serviceAccountKey.json"

SENSOR_COLLECTION = "sensor_data"
SECURITY_COLLECTION = "security_events"
SYSTEM_LOG_COLLECTION = "system_logs"

AES_KEY = b"12345678ABCDEFGH"
AES_IV = b"HGFEDCBA87654321"
HMAC_KEY = b"sentinel_guard_key"

DEVICE_ID = "esp32_001"
SENSOR_LABEL = "Indoor"

last_sequence_id = 0
last_valid_humidity = None
last_valid_temperature = None

HUMIDITY_SPIKE_THRESHOLD = 15
HUMIDITY_INVALID_MIN_STREAK = 3
HUMIDITY_ROLLING_WINDOW = 5

humidity_valid_streak = 0
humidity_window_values = []

DDOS_THRESHOLD = 20
DDOS_TIME_WINDOW = 5
DDOS_COOLDOWN = 10

packet_time_history = []
ddos_block_until = 0

REPLAY_THRESHOLD = 5
REPLAY_TIME_WINDOW = 10
REPLAY_BLOCK_DURATION = 30

replay_time_history = []
replay_block_until = 0

FDI_MIN_TEMP = -45
FDI_MAX_TEMP = 85
FDI_MIN_HUM = -5
FDI_MAX_HUM = 105


firebase_key = credentials.Certificate(FIREBASE_SERVICE_ACCOUNT)
firebase_admin.initialize_app(firebase_key)
db = firestore.client()


def now():
    return datetime.now().strftime("%Y-%m-%d %H:%M:%S")


def upload_sensor_data(sensor_data):
    try:
        db.collection(SENSOR_COLLECTION).add(sensor_data)
        return True
    except Exception as error:
        print("Firebase sensor_data upload failed:", error)
        return False


def upload_security_event(event_type, message, seq=None, raw=None):
    try:
        security_record = {
            "deviceId": DEVICE_ID,
            "eventType": event_type,
            "message": message,
            "sequence_id": seq,
            "timestamp": now(),
            "acknowledged": False,
        }

        if raw:
            security_record["raw_packet"] = raw

        db.collection(SECURITY_COLLECTION).add(security_record)

        print("----------------------------------------")
        print("SECURITY EVENT UPLOADED")
        print(f"Event Type   : {event_type}")
        print(f"Message      : {message}")
        print(f"Sequence ID  : {seq}")
        print("----------------------------------------")

    except Exception as error:
        print("Firebase security_events upload failed:", error)


def upload_system_log(level, message, details=None):
    try:
        log_record = {
            "deviceId": DEVICE_ID,
            "level": level,
            "message": message,
            "timestamp": now(),
        }

        if details:
            log_record.update(details)

        db.collection(SYSTEM_LOG_COLLECTION).add(log_record)

    except Exception as error:
        print(f"Firebase system_logs upload failed: {error}")


def upload_mitigation_event(action, reason, duration_seconds=None):
    try:
        mitigation_record = {
            "deviceId": DEVICE_ID,
            "eventType": "mitigation_applied",
            "mitigationAction": action,
            "message": reason,
            "duration_seconds": duration_seconds,
            "timestamp": now(),
            "acknowledged": False,
        }

        db.collection(SECURITY_COLLECTION).add(mitigation_record)

        print("----------------------------------------")
        print("MITIGATION EVENT UPLOADED")
        print(f"Action       : {action}")
        print(f"Reason       : {reason}")

        if duration_seconds:
            print(f"Duration     : {duration_seconds} seconds")

        print("----------------------------------------")

    except Exception as error:
        print("Firebase mitigation upload failed:", error)


# Detects packet flooding using a time window
def detect_ddos():
    global packet_time_history, ddos_block_until

    current_time = time.time()

    if current_time < ddos_block_until:
        return "blocked", len(packet_time_history)

    packet_time_history.append(current_time)

    packet_time_history = [
        packet_time for packet_time in packet_time_history
        if current_time - packet_time <= DDOS_TIME_WINDOW
    ]

    packet_count = len(packet_time_history)

    if packet_count >= DDOS_THRESHOLD:
        ddos_block_until = current_time + DDOS_COOLDOWN
        return "detected", packet_count

    return "normal", packet_count


# Detects repeated sequence IDs
def detect_and_mitigate_replay(sequence_id):
    global replay_time_history, replay_block_until

    current_time = time.time()

    if current_time < replay_block_until:
        remaining_time = int(replay_block_until - current_time)
        return True, True, None, remaining_time

    if sequence_id <= last_sequence_id:
        replay_time_history.append(current_time)

        replay_time_history[:] = [
            replay_time for replay_time in replay_time_history
            if current_time - replay_time <= REPLAY_TIME_WINDOW
        ]

        attempt_count = len(replay_time_history)

        if attempt_count >= REPLAY_THRESHOLD:
            replay_block_until = current_time + REPLAY_BLOCK_DURATION
            return True, False, attempt_count, None

        return True, False, attempt_count, None

    return False, False, 0, None


# Checks impossible sensor values before ML detection
def check_fdi_range(sensor_packet):
    anomaly_detected = False
    reasons = []

    temperature_valid = sensor_packet.get("temperature_valid", False)
    humidity_valid = sensor_packet.get("humidity_valid", False)

    if temperature_valid:
        temperature_value = sensor_packet.get("temperature")

        if temperature_value is not None:
            try:
                temperature_value = float(temperature_value)

                if temperature_value < FDI_MIN_TEMP or temperature_value > FDI_MAX_TEMP:
                    anomaly_detected = True
                    reasons.append(
                        f"temperature {temperature_value}°C outside valid range "
                        f"[{FDI_MIN_TEMP}–{FDI_MAX_TEMP}°C]"
                    )

            except ValueError:
                anomaly_detected = True
                reasons.append("temperature is not numeric")

    if humidity_valid:
        humidity_value = sensor_packet.get("humidity")

        if humidity_value is not None:
            try:
                humidity_value = float(humidity_value)

                if humidity_value < FDI_MIN_HUM or humidity_value > FDI_MAX_HUM:
                    anomaly_detected = True
                    reasons.append(
                        f"humidity {humidity_value}% outside valid range "
                        f"[{FDI_MIN_HUM}–{FDI_MAX_HUM}%]"
                    )

            except ValueError:
                anomaly_detected = True
                reasons.append("humidity is not numeric")

    return anomaly_detected, reasons


def resolve_display_humidity(raw_humidity, anomaly_result):
    if raw_humidity is not None:
        return raw_humidity, "live"

    if anomaly_result and anomaly_result.get("humidity_used") is not None:
        return anomaly_result["humidity_used"], anomaly_result.get("humidity_source", "estimated")

    return None, "unavailable"


# Removes PKCS7 padding from decrypted AES data
def pkcs7_unpad(decrypted_data):
    padding_length = decrypted_data[-1]

    if padding_length < 1 or padding_length > 16:
        raise ValueError("Invalid padding")

    if decrypted_data[-padding_length:] != bytes([padding_length]) * padding_length:
        raise ValueError("Bad PKCS7 padding")

    return decrypted_data[:-padding_length]


# Decrypts AES-CBC Base64 ciphertext
def decrypt_aes_base64(encrypted_base64):
    encrypted_data = base64.b64decode(encrypted_base64)
    aes_cipher = AES.new(AES_KEY, AES.MODE_CBC, AES_IV)
    decrypted_data = aes_cipher.decrypt(encrypted_data)

    return pkcs7_unpad(decrypted_data).decode("utf-8")


# Creates HMAC-SHA256 for integrity verification
def compute_hmac_hex(data_text):
    hmac_checker = HMAC.new(HMAC_KEY, digestmod=SHA256)
    hmac_checker.update(data_text.encode("utf-8"))

    return hmac_checker.hexdigest()


def print_sensor_output(sequence_id, temperature, raw_humidity, display_humidity,
                        humidity_source, temp_status, hum_status,
                        packet_status, timestamp, upload_success, anomaly_result):
    print("New Sensor Packet Received")
    print("----------------------------------------")
    print(f"Device ID          : {DEVICE_ID}")
    print(f"Sequence ID        : {sequence_id}")

    if temperature is not None:
        print(f"Temperature        : {temperature} C")
    else:
        print("Temperature        : INVALID")

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
        "broker": BROKER_HOST,
        "port": BROKER_PORT,
        "topic": TOPIC,
        "sensorLabel": SENSOR_LABEL,
        "modelReady": model_ready,
    })

    print("Waiting for ESP32 sensor packets...")


def on_message(client, userdata, msg):
    global last_sequence_id, last_valid_humidity, last_valid_temperature
    global humidity_valid_streak, humidity_window_values
    global ddos_block_until

    raw_text = msg.payload.decode(errors="ignore").strip().strip("\x00")

    if not raw_text:
        return

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

    try:
        probe_packet = json.loads(raw_text)

        if ("temperature" in probe_packet or "humidity" in probe_packet) and "ciphertext" not in probe_packet:
            upload_security_event(
                "fdi_attack_unencrypted",
                f"Unencrypted FDI attempt — raw sensor fields without encryption: "
                f"temp={probe_packet.get('temperature')} hum={probe_packet.get('humidity')}",
                raw=raw_text
            )
            return

    except json.JSONDecodeError:
        pass

    try:
        outer_packet = json.loads(raw_text)

        sequence_id = outer_packet["sequence_id"]
        ciphertext = outer_packet["ciphertext"]
        received_hmac = outer_packet["hmac"]

    except json.JSONDecodeError as error:
        packet_rate = len(packet_time_history)

        if packet_rate >= DDOS_THRESHOLD:
            ddos_block_until = time.time() + DDOS_COOLDOWN

            upload_security_event(
                "ddos_attack",
                f"DDoS flood with non-JSON packets: "
                f"{packet_rate} packets in {DDOS_TIME_WINDOW}s. Cooldown {DDOS_COOLDOWN}s.",
                raw=raw_text
            )

        elif packet_rate > 3:
            pass

        else:
            upload_security_event("malformed_packet", f"Possible FDI Detected: {error}", raw=raw_text)

        return

    except KeyError:
        packet_rate = len(packet_time_history)

        if packet_rate >= DDOS_THRESHOLD:
            ddos_block_until = time.time() + DDOS_COOLDOWN

            print("ALERT: DDOS ATTACK DETECTED (crafted JSON flood)")
            print("----------------------------------------")
            print(f"Packets Received : {packet_rate}")
            print(f"Time Window      : {DDOS_TIME_WINDOW} seconds")
            print(f"Threshold        : {DDOS_THRESHOLD} packets")
            print(f"Mitigation       : Incoming packets ignored for {DDOS_COOLDOWN} seconds")
            print("----------------------------------------")

            upload_security_event(
                "ddos_attack",
                f"DDoS flood with crafted JSON packets (missing crypto fields): "
                f"{packet_rate} packets in {DDOS_TIME_WINDOW}s. Cooldown {DDOS_COOLDOWN}s.",
                raw=raw_text
            )

        elif packet_rate > 3:
            pass

        else:
            upload_security_event(
                "malformed_packet",
                "Possible DDOS_Detected"
                "(sequence_id / ciphertext / hmac).",
                raw=raw_text
            )

        return

    try:
        expected_hmac = compute_hmac_hex(ciphertext)
        hmac_valid = expected_hmac == received_hmac

    except Exception as error:
        upload_security_event("processing_error", f"HMAC computation error: {error}", sequence_id, raw_text)
        return

    if not hmac_valid:
        print("ALERT: HMAC VERIFICATION FAILED")
        print("----------------------------------------")
        print(f"Sequence ID : {sequence_id}")
        print("Detection   : Forged / tampered packet")
        print("Mitigation  : Packet rejected before decryption")
        print("----------------------------------------")

        upload_security_event(
            "integrity_violation",
            "HMAC verification failed. Packet rejected before decryption.",
            sequence_id,
            raw_text
        )
        return

    is_replay, block_active, attempt_count, block_remaining = detect_and_mitigate_replay(sequence_id)

    if block_active:
        print("ALERT: PACKET DROPPED — Device blocked due to replay mitigation")
        print("----------------------------------------")
        print(f"Sequence ID     : {sequence_id}")
        print(f"Block Remaining : {block_remaining} seconds")
        print("----------------------------------------")
        return

    if is_replay:
        print("ALERT: REPLAY ATTACK DETECTED")
        print("----------------------------------------")
        print(f"Received Sequence ID : {sequence_id}")
        print(f"Last Accepted ID     : {last_sequence_id}")
        print(f"Attempt Count        : {attempt_count}/{REPLAY_THRESHOLD} in {REPLAY_TIME_WINDOW}s window")
        print("Mitigation           : Packet rejected")
        print("----------------------------------------")

        if attempt_count >= REPLAY_THRESHOLD:
            print(f"MITIGATION: Replay threshold exceeded — device blocked for {REPLAY_BLOCK_DURATION}s")

            upload_security_event(
                "replay_attack",
                f"Replay detected. Seq {sequence_id}, last accepted {last_sequence_id}. "
                f"Attempt {attempt_count}/{REPLAY_THRESHOLD}.",
                sequence_id,
                raw_text
            )

            upload_mitigation_event(
                "temporary_block",
                f"Device blocked after {attempt_count} replay attempts in {REPLAY_TIME_WINDOW}s",
                duration_seconds=REPLAY_BLOCK_DURATION
            )

        else:
            upload_security_event(
                "replay_attack",
                f"Replay detected. Seq {sequence_id}, last accepted {last_sequence_id}. "
                f"Attempt {attempt_count}/{REPLAY_THRESHOLD}.",
                sequence_id,
                raw_text
            )

        return

    try:
        plain_text = decrypt_aes_base64(ciphertext)
        inner_packet = json.loads(plain_text)
        inner_sequence_id = inner_packet.get("sequence_id")

    except Exception as error:
        print(f"ALERT: DECRYPTION FAILED — {error}")
        upload_security_event("decryption_error", f"AES decryption failed: {error}", sequence_id, raw_text)
        return

    if inner_sequence_id != sequence_id:
        print("ALERT: SEQUENCE ID MISMATCH")
        print("----------------------------------------")
        print(f"Outer Sequence ID : {sequence_id}")
        print(f"Inner Sequence ID : {inner_sequence_id}")
        print("----------------------------------------")

        upload_security_event(
            "sequence_mismatch",
            f"Outer seq {sequence_id} does not match inner seq {inner_sequence_id}. Packet rejected.",
            sequence_id,
            raw_text
        )
        return

    try:
        fdi_detected, fdi_reasons = check_fdi_range(inner_packet)

    except Exception as error:
        upload_security_event("fdi_check_error", f"FDI range check error: {error}", sequence_id, raw_text)
        return

    if fdi_detected:
        print("ALERT: FDI / RANGE VIOLATION DETECTED")
        print("----------------------------------------")
        print(f"Sequence ID : {sequence_id}")
        print(f"Temperature : {inner_packet.get('temperature')}")
        print(f"Humidity    : {inner_packet.get('humidity')}")
        print(f"Reason      : {', '.join(fdi_reasons)}")
        print("Mitigation  : Packet rejected")
        print("----------------------------------------")

        upload_security_event(
            "fdi_attack",
            f"False Data Injection: {', '.join(fdi_reasons)}",
            sequence_id,
            raw_text
        )
        return

    last_sequence_id = sequence_id

    temperature_valid = inner_packet.get("temperature_valid", False)
    humidity_valid = inner_packet.get("humidity_valid", False)

    temperature = inner_packet.get("temperature") if temperature_valid else None
    raw_humidity = inner_packet.get("humidity") if humidity_valid else None

    if raw_humidity is not None:
        last_valid_humidity = raw_humidity

    if temperature is None and last_valid_temperature is not None:
        low, high = anomaly_detector.TEMP_BOUNDS.get(SENSOR_LABEL.lower(), (22, 38))

        if last_valid_temperature < low or last_valid_temperature > high:
            reason = (
                f"Temperature sensor went invalid while last known reading "
                f"({last_valid_temperature}C) was out of range [{low}-{high}C]"
            )

            print("ALERT: TEMPERATURE OUT OF RANGE — SENSOR NOW INVALID")
            print("----------------------------------------")
            print(f"Last Valid Temp : {last_valid_temperature} C")
            print(f"Normal Range    : {low}-{high} C")
            print("----------------------------------------")

            upload_security_event("anomaly_detected", reason, sequence_id)

    if temperature is not None:
        last_valid_temperature = temperature

    humidity_anomaly = False
    humidity_anomaly_reason = ""

    if humidity_valid and raw_humidity is not None:
        if humidity_window_values:
            average_humidity = sum(humidity_window_values) / len(humidity_window_values)
            humidity_change = abs(float(raw_humidity) - average_humidity)

            if humidity_change >= HUMIDITY_SPIKE_THRESHOLD:
                humidity_anomaly = True
                humidity_anomaly_reason = (
                    f"Humidity spike: {raw_humidity}% "
                    f"(avg {average_humidity:.1f}%, jumped {humidity_change:.1f}%)"
                )

        humidity_window_values.append(float(raw_humidity))

        if len(humidity_window_values) > HUMIDITY_ROLLING_WINDOW:
            humidity_window_values.pop(0)

        humidity_valid_streak += 1

    else:
        if humidity_valid_streak >= HUMIDITY_INVALID_MIN_STREAK:
            humidity_anomaly = True
            humidity_anomaly_reason = (
                f"DHT22 humidity suddenly invalid after "
                f"{humidity_valid_streak} consecutive valid readings"
            )

        humidity_valid_streak = 0

    if humidity_anomaly:
        print("ALERT: HUMIDITY ANOMALY DETECTED")
        print("----------------------------------------")
        print(f"Sequence ID : {sequence_id}")
        print(f"Reason      : {humidity_anomaly_reason}")
        print("----------------------------------------")

        upload_security_event("humidity_anomaly", humidity_anomaly_reason, sequence_id)

    temperature_status = inner_packet.get("temperature_status", "unknown")
    humidity_status = inner_packet.get("humidity_status", "unknown")
    packet_status = inner_packet.get("packet_status", inner_packet.get("status", "unknown"))
    timestamp = now()

    temperature_bounds = {"indoor": (22, 35), "outdoor": (22, 38)}
    low_limit, high_limit = temperature_bounds.get(SENSOR_LABEL.strip().lower(), (22, 38))

    temperature_out_of_bounds = temperature is not None and (
        float(temperature) < low_limit or float(temperature) > high_limit
    )

    anomaly_result = None

    if temperature is not None:
        try:
            anomaly_result = anomaly_detector.predict(
                temperature=temperature,
                humidity=raw_humidity,
                sensor_label=SENSOR_LABEL
            )

        except Exception as error:
            print(f"[AnomalyDetector] Prediction failed: {error}")
            anomaly_result = None

    if anomaly_result is None and temperature is not None:
        anomaly_result = {
            "anomaly_detected": 1 if temperature_out_of_bounds else 0,
            "anomaly_proba": 1.0 if temperature_out_of_bounds else 0.0,
            "out_of_range": temperature_out_of_bounds,
            "humidity_used": raw_humidity,
            "humidity_source": "live" if raw_humidity else "unavailable",
        }

    if anomaly_result is not None and temperature_out_of_bounds:
        anomaly_result["anomaly_detected"] = 1
        anomaly_result["out_of_range"] = True

    if anomaly_result and anomaly_result.get("anomaly_detected") == 1:
        upload_security_event(
            event_type="anomaly_detected",
            message=(
                f"Anomaly on {SENSOR_LABEL}. "
                f"Temp: {temperature}C (range {low_limit}-{high_limit}C)  "
                f"Humidity: {anomaly_result.get('humidity_used')}%  "
                f"Confidence: {anomaly_result.get('anomaly_proba', 0) * 100:.1f}%  "
                f"OutOfRange: {anomaly_result.get('out_of_range')}"
            ),
            seq=sequence_id
        )

    display_humidity, humidity_source = resolve_display_humidity(raw_humidity, anomaly_result)

    firebase_record = {
        "deviceId": DEVICE_ID,
        "sequence_id": sequence_id,
        "temperature": temperature,
        "humidity": display_humidity,
        "humidity_source": humidity_source,
        "temperature_status": temperature_status,
        "humidity_status": humidity_status,
        "packet_status": packet_status,
        "timestamp": timestamp,
        "sensor_label": SENSOR_LABEL,
        "anomaly_detected": anomaly_result.get("anomaly_detected") if anomaly_result else None,
        "anomaly_proba": anomaly_result.get("anomaly_proba") if anomaly_result else None,
        "out_of_range": anomaly_result.get("out_of_range") if anomaly_result else None,
    }

    upload_success = upload_sensor_data(firebase_record)

    upload_system_log("info", "Sensor packet accepted", {
        "sequenceId": sequence_id,
        "temperature": temperature,
        "humidity": display_humidity,
        "humiditySource": humidity_source,
        "packetStatus": packet_status,
        "anomalyDetected": anomaly_result.get("anomaly_detected") if anomaly_result else None,
        "firebaseUpload": upload_success,
    })

    print_sensor_output(
        sequence_id,
        temperature,
        raw_humidity,
        display_humidity,
        humidity_source,
        temperature_status,
        humidity_status,
        packet_status,
        timestamp,
        upload_success,
        anomaly_result
    )


mqtt_receiver = mqtt.Client(mqtt.CallbackAPIVersion.VERSION2)

mqtt_receiver.on_connect = on_connect
mqtt_receiver.on_message = on_message

mqtt_receiver.username_pw_set(MQTT_USERNAME, MQTT_PASSWORD)

mqtt_receiver.tls_set(cert_reqs=ssl.CERT_NONE)
mqtt_receiver.tls_insecure_set(True)

mqtt_receiver.connect(BROKER_HOST, BROKER_PORT, 60)
mqtt_receiver.loop_forever()