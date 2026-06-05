# 🛡️ Sentinel Guard

> Secure IoT Biodiversity Monitoring System — CSG3101 Applied Project

Sentinel Guard is a full-stack IoT security platform that collects environmental sensor data from distributed ESP32 nodes, detects network-layer attacks in real time using HMAC-SHA256 verification and an ML classifier, and exposes everything through a web dashboard and mobile app.

---

## 📋 Table of Contents

- [Overview](#overview)
- [Architecture](#architecture)
- [Features](#features)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
- [Team](#team)
- [Security](#security)
- [License](#license)

---

## Overview

Sentinel Guard monitors temperature and humidity readings from ESP32/DHT22 sensor nodes deployed in the field. Every message is signed with HMAC-SHA256 at the hardware level. A backend ML microservice analyses traffic patterns and flags anomalies — including Man-in-the-Middle attacks, replay attacks, and ARP poisoning — before data ever reaches the database. Administrators can respond directly from the dashboard by isolating nodes, blocking IPs, or rotating HMAC keys.

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        IoT Layer                            │
│   ESP32 + DHT22  ──HMAC-SHA256──►  MQTT Broker             │
└───────────────────────────┬─────────────────────────────────┘
                            │
┌───────────────────────────▼─────────────────────────────────┐
│                      Backend Layer                          │
│   Go HTTP API (port 8080)  ◄──►  ML Microservice (port 5000)│
│           │                                                 │
│           ▼                                                 │
│   Firebase / Firestore  (sensor_data · alerts)              │
└───────────────────────────┬─────────────────────────────────┘
                            │  Firestore listeners
          ┌─────────────────┴──────────────────┐
          ▼                                    ▼
┌─────────────────┐                 ┌──────────────────────┐
│   Web Dashboard │                 │    Mobile App        │
│  Vite + React   │                 │  Expo SDK 54         │
│  (Firebase      │                 │  (Expo Router v4)    │
│   Hosting)      │                 │                      │
└─────────────────┘                 └──────────────────────┘
```

---

## Features

### Sensor Monitoring
- Live temperature and humidity readings from multiple ESP32 nodes
- Historical trend charts with configurable time ranges
- Per-node status indicators (online / offline / compromised)

### Attack Detection
- HMAC-SHA256 signature verification on every inbound message
- ML classifier flags MiTM, replay, and ARP poisoning attacks
- Real-time alert feed with severity levels and timestamps

### Mitigation Controls *(admin only)*
- Isolate a compromised sensor node
- Block a suspicious IP address
- Rotate HMAC keys for one or all nodes

### Role-Based Access
- Admin accounts: full dashboard access including Alerts, Logs, and Admin pages
- Standard accounts: read-only sensor view

### Cross-Platform UI
| Platform | Stack | Pages / Tabs |
|----------|-------|-------------|
| Web | Vite + React 18 + React Router v6 | Login · Dashboard · Sensors · Alerts · Admin · Logs |
| Mobile | Expo SDK 54 + Expo Router v4 | Home · Sensors · Alerts · Profile |

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| IoT Hardware | ESP32, DHT22 |
| Message Transport | MQTT broker |
| Backend API | Go (HTTP, port 8080) |
| ML Microservice | Python (port 5000) |
| Database | Firebase Firestore |
| Auth | Firebase Authentication |
| Web Frontend | Vite, React 18, React Router v6, Recharts |
| Mobile Frontend | Expo SDK 54, Expo Router v4, react-native-svg |
| Hosting | Firebase Hosting (web), Expo Go (mobile dev) |
| Security | HMAC-SHA256, AES encryption |

---

## Project Structure

```
sentinel-guard/
├── web/                    # Vite + React web dashboard
│   ├── src/
│   │   ├── pages/          # Login, Dashboard, Sensors, Alerts, Admin, Logs
│   │   ├── components/     # Shared UI components
│   │   └── services/       # Firebase service layer (USE_MOCK flag)
│   └── firebase.json
│
├── mobile/                 # Expo mobile app
│   ├── app/
│   │   └── (tabs)/         # Home, Sensors, Alerts, Profile
│   └── services/           # Shared service layer (USE_MOCK flag)
│
├── backend/                # Go HTTP API
│   └── main.go
│
├── ml/                     # ML attack classifier microservice
│
└── firmware/               # ESP32 Arduino firmware
```

---

## Getting Started

### Prerequisites

- Node.js 18+
- Go 1.21+
- Python 3.10+
- Firebase CLI (`npm install -g firebase-tools`)
- Expo CLI (`npm install -g expo-cli`)

### Web Dashboard

```bash
cd web
npm install --legacy-peer-deps
npm run dev
```

Deploy to Firebase Hosting:
```bash
firebase deploy --only hosting
```

### Mobile App

```bash
cd mobile
npm install --legacy-peer-deps
npx expo start --tunnel   # or --lan for local network
```

Scan the QR code with Expo Go on Android or iOS.

> ⚠️ Do not target the `web` platform in Expo — use Android/iOS only via Expo Go.

### Backend API

```bash
cd backend
go run main.go
# Listens on :8080
```

### ML Microservice

```bash
cd ml
pip install -r requirements.txt
python app.py
# Listens on :5000
```

### Environment Variables

Copy `.env.example` to `.env` in each sub-project and fill in your Firebase credentials.  
The backend expects a `config.yaml` with HMAC secret keys and ML API key — **never commit real keys**.

---

## Team

| Name | Role | Responsibilities |
|------|------|-----------------|
| Najath | Frontend / Admin | Web dashboard, mobile app, CI |
| Akila Wakista | Backend / Admin | Firebase, Firestore, Cloud Functions, RBAC |
| Ravindu Gunasekara | Security | HMAC-SHA256, AES encryption, key management |
| Julian Mendis | IoT / Hardware | ESP32 firmware, DHT22 integration, MQTT |

---

## Security

Sentinel Guard is designed with security at every layer:

- **Transport**: All sensor payloads are HMAC-SHA256 signed at the node before transmission
- **Detection**: An ML classifier runs server-side to identify MiTM, replay, and ARP poisoning attacks
- **Encryption**: AES encryption protects sensitive payloads in transit
- **Auth**: Firebase Authentication gates all dashboard access; admin capabilities require elevated role claims
- **Rules**: Firestore security rules restrict read/write access per collection and role

### Reporting a Vulnerability

If you discover a security issue, please open a private GitHub Security Advisory rather than a public issue.

---

## License

This project was developed as part of the CSG3101 Applied Project at university. All rights reserved by the project team.
