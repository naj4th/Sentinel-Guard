#include <WiFi.h>
#include <WiFiClientSecure.h>
#include <PubSubClient.h>
#include <DHTesp.h>
#include "mbedtls/aes.h"
#include "mbedtls/base64.h"
#include "mbedtls/md.h"
#include <string.h>

DHTesp dhtSensor;

const char* wifiName = "VICTUS_GAMING_7916";
const char* wifiPassword = "54535453";

const char* brokerAddress = "172.20.10.14";
const int brokerPort = 8883;
const char* publishTopic = "iot/sensor/dht22/secure";

const char* brokerUsername = "sentinelcredentials";
const char* brokerPassword = "admin321";

const int dhtPin = 4;

const float lowestTemperatureLimit = 0.0;
const float highestTemperatureLimit = 40.0;
const float lowestHumidityLimit = 20.0;
const float highestHumidityLimit = 90.0;

const unsigned char aesSecretKey[16] = {
  '1','2','3','4','5','6','7','8',
  'A','B','C','D','E','F','G','H'
};

const unsigned char aesInitialVector[16] = {
  'H','G','F','E','D','C','B','A',
  '8','7','6','5','4','3','2','1'
};

const unsigned char hmacSecretKey[] = "sentinel_guard_key";

WiFiClientSecure secureWifiClient;
PubSubClient mqttClient(secureWifiClient);

unsigned long sequenceNumber = 0;

// Connects ESP32 to the WiFi network
void connectToWifi() {
  Serial.print("Connecting to WiFi: ");
  Serial.println(wifiName);

  WiFi.disconnect(true);
  delay(1000);

  WiFi.mode(WIFI_STA);
  WiFi.begin(wifiName, wifiPassword);

  int wifiTryCount = 0;

  while (WiFi.status() != WL_CONNECTED && wifiTryCount < 30) {
    delay(500);
    Serial.print(".");
    wifiTryCount++;
  }

  Serial.println();

  if (WiFi.status() == WL_CONNECTED) {
    Serial.println("WiFi connected");
    Serial.print("ESP32 IP: ");
    Serial.println(WiFi.localIP());
  } else {
    Serial.println("WiFi connection FAILED");
    Serial.print("WiFi status code: ");
    Serial.println(WiFi.status());
  }
}

// Connects ESP32 to the secure MQTT broker
void connectToMqttBroker() {
  while (!mqttClient.connected()) {
    Serial.print("Connecting to secure MQTT broker... ");

    String mqttClientId = "ESP32-SECURE-";
    mqttClientId += String((uint32_t)ESP.getEfuseMac(), HEX);

    if (mqttClient.connect(mqttClientId.c_str(), brokerUsername, brokerPassword)) {
      Serial.println("connected!");
      Serial.println("TLS encrypted + credentials verified.");
    } else {
      Serial.print("failed, rc=");
      Serial.print(mqttClient.state());
      Serial.println(" retrying in 2 seconds");
      delay(2000);
    }
  }
}

// Checks if temperature is within the expected range
bool isTemperatureValid(float temperatureValue) {
  if (isnan(temperatureValue)) {
    return false;
  }

  if (temperatureValue < lowestTemperatureLimit || temperatureValue > highestTemperatureLimit) {
    return false;
  }

  return true;
}

// Checks if humidity is within the expected range
bool isHumidityValid(float humidityValue) {
  if (isnan(humidityValue)) {
    return false;
  }

  if (humidityValue < lowestHumidityLimit || humidityValue > highestHumidityLimit) {
    return false;
  }

  return true;
}

// Decides the packet status according to sensor validity
String getSensorPacketStatus(bool temperatureValid, bool humidityValid) {
  if (temperatureValid && humidityValid) {
    return "valid";
  }

  if (!temperatureValid && !humidityValid) {
    return "invalid";
  }

  return "partial_valid";
}

// Adds PKCS7 padding before AES encryption
int applyPkcs7Padding(const uint8_t* inputData, int inputLength, uint8_t* paddedOutput, int blockSize) {
  int paddingLength = blockSize - (inputLength % blockSize);
  int paddedLength = inputLength + paddingLength;

  memcpy(paddedOutput, inputData, inputLength);

  for (int index = inputLength; index < paddedLength; index++) {
    paddedOutput[index] = paddingLength;
  }

  return paddedLength;
}

// Converts byte array output into hex text
String convertBytesToHex(const unsigned char* dataBytes, size_t dataLength) {
  String hexOutput = "";
  char hexBuffer[3];

  for (size_t index = 0; index < dataLength; index++) {
    sprintf(hexBuffer, "%02x", dataBytes[index]);
    hexOutput += hexBuffer;
  }

  return hexOutput;
}

// Encrypts JSON text using AES-CBC and returns Base64 ciphertext
String encryptJsonData(String plainTextJson) {
  const int blockSize = 16;

  uint8_t paddedInput[256];
  uint8_t encryptedOutput[256];
  unsigned char ivForEncryption[16];

  int plainTextLength = plainTextJson.length();

  int paddedInputLength = applyPkcs7Padding(
    (const uint8_t*)plainTextJson.c_str(),
    plainTextLength,
    paddedInput,
    blockSize
  );

  memcpy(ivForEncryption, aesInitialVector, 16);

  mbedtls_aes_context aesContext;
  mbedtls_aes_init(&aesContext);
  mbedtls_aes_setkey_enc(&aesContext, aesSecretKey, 128);

  mbedtls_aes_crypt_cbc(
    &aesContext,
    MBEDTLS_AES_ENCRYPT,
    paddedInputLength,
    ivForEncryption,
    paddedInput,
    encryptedOutput
  );

  mbedtls_aes_free(&aesContext);

  unsigned char base64Output[512];
  size_t base64Length = 0;

  int resultCode = mbedtls_base64_encode(
    base64Output,
    sizeof(base64Output),
    &base64Length,
    encryptedOutput,
    paddedInputLength
  );

  if (resultCode != 0) {
    Serial.print("Base64 encode failed, rc=");
    Serial.println(resultCode);
    return "";
  }

  String encryptedBase64Text = "";

  for (size_t index = 0; index < base64Length; index++) {
    encryptedBase64Text += (char)base64Output[index];
  }

  return encryptedBase64Text;
}

// Creates HMAC-SHA256 value for the encrypted payload
String createHmacValue(String encryptedText) {
  unsigned char hmacResult[32];

  mbedtls_md_context_t hmacContext;
  mbedtls_md_init(&hmacContext);

  const mbedtls_md_info_t* sha256Info = mbedtls_md_info_from_type(MBEDTLS_MD_SHA256);

  mbedtls_md_setup(&hmacContext, sha256Info, 1);
  mbedtls_md_hmac_starts(&hmacContext, hmacSecretKey, strlen((const char*)hmacSecretKey));
  mbedtls_md_hmac_update(&hmacContext, (const unsigned char*)encryptedText.c_str(), encryptedText.length());
  mbedtls_md_hmac_finish(&hmacContext, hmacResult);
  mbedtls_md_free(&hmacContext);

  return convertBytesToHex(hmacResult, 32);
}

void setup() {
  Serial.begin(115200);
  delay(2000);

  Serial.println("=================================");
  Serial.println("ESP32 SENTINEL GUARD STARTED");
  Serial.println("AES-128 + HMAC-SHA256 + MQTTS");
  Serial.println("=================================");

  dhtSensor.setup(dhtPin, DHTesp::DHT22);

  connectToWifi();

  secureWifiClient.setInsecure();
  secureWifiClient.setTimeout(15000);

  mqttClient.setServer(brokerAddress, brokerPort);
  mqttClient.setBufferSize(1024);
}

void loop() {
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("WiFi disconnected. Reconnecting...");
    connectToWifi();
    delay(2000);
    return;
  }

  if (!mqttClient.connected()) {
    connectToMqttBroker();
  }

  mqttClient.loop();

  TempAndHumidity sensorData = dhtSensor.getTempAndHumidity();

  float temperatureReading = sensorData.temperature;
  float humidityReading = sensorData.humidity;

  Serial.println("----------------------------------");
  Serial.println("Reading sensor...");
  Serial.print("Temperature: ");
  Serial.println(temperatureReading);
  Serial.print("Humidity:    ");
  Serial.println(humidityReading);

  bool temperatureValid = isTemperatureValid(temperatureReading);
  bool humidityValid = isHumidityValid(humidityReading);

  String packetStatus = getSensorPacketStatus(temperatureValid, humidityValid);

  if (!temperatureValid) {
    Serial.println("WARNING: Temperature flagged as INVALID.");
  }

  if (!humidityValid) {
    Serial.println("WARNING: Humidity flagged as INVALID.");
  }

  sequenceNumber++;

  String plainJson = "{";
  plainJson += "\"sequence_id\":";
  plainJson += String(sequenceNumber);
  plainJson += ",";
  plainJson += "\"temperature_valid\":";
  plainJson += (temperatureValid ? "true" : "false");
  plainJson += ",";
  plainJson += "\"temperature\":";
  plainJson += (temperatureValid ? String(temperatureReading, 2) : "null");
  plainJson += ",";
  plainJson += "\"temperature_status\":\"";
  plainJson += (temperatureValid ? "valid" : "invalid");
  plainJson += "\",";
  plainJson += "\"humidity_valid\":";
  plainJson += (humidityValid ? "true" : "false");
  plainJson += ",";
  plainJson += "\"humidity\":";
  plainJson += (humidityValid ? String(humidityReading, 2) : "null");
  plainJson += ",";
  plainJson += "\"humidity_status\":\"";
  plainJson += (humidityValid ? "valid" : "invalid");
  plainJson += "\",";
  plainJson += "\"packet_status\":\"";
  plainJson += packetStatus;
  plainJson += "\",";
  plainJson += "\"status\":\"";
  plainJson += packetStatus;
  plainJson += "\"";
  plainJson += "}";

  Serial.println("Plain JSON:");
  Serial.println(plainJson);

  String encryptedBase64 = encryptJsonData(plainJson);

  if (encryptedBase64.length() == 0) {
    Serial.println("Encryption failed. Packet not sent.");
    delay(3000);
    return;
  }

  String hmacHexValue = createHmacValue(encryptedBase64);

  String finalPacket = "{";
  finalPacket += "\"sequence_id\":";
  finalPacket += String(sequenceNumber);
  finalPacket += ",";
  finalPacket += "\"ciphertext\":\"";
  finalPacket += encryptedBase64;
  finalPacket += "\",";
  finalPacket += "\"hmac\":\"";
  finalPacket += hmacHexValue;
  finalPacket += "\"";
  finalPacket += "}";

  Serial.print("Packet length: ");
  Serial.println(finalPacket.length());
  Serial.println("Final secure packet:");
  Serial.println(finalPacket);

  if (!mqttClient.connected()) {
    Serial.println("MQTT disconnected before publish. Reconnecting...");
    connectToMqttBroker();
  }

  bool publishSuccess = mqttClient.publish(publishTopic, finalPacket.c_str());

  if (publishSuccess) {
    Serial.println(">>> Secure publish SUCCESS");
  } else {
    Serial.println(">>> Secure publish FAILED");
    Serial.print("MQTT state: ");
    Serial.println(mqttClient.state());
  }

  delay(3000);
}