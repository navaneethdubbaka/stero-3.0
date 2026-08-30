# ABIOGENESIS — Companion Robot Control System

A React Native Android application that controls a companion robot via USB serial communication to an Arduino board. The Android phone acts as the robot's brain — running AI, displaying an animated face, tracking people with the camera, and sending motor commands through USB-OTG to an Arduino motor shield.

**MVP freeze:** `2.0.0` (versionCode 20). Release signing, R8, and tester docs: [`docs/RELEASE.md`](docs/RELEASE.md), [`docs/TEST_PLAN_MVP.md`](docs/TEST_PLAN_MVP.md), [`docs/KNOWN_ISSUES.md`](docs/KNOWN_ISSUES.md).

---

## Architecture Overview

```
┌─────────────────────────────────┐   USB-OTG @ 115200   ┌──────────────────────┐
│  Android Phone (brain)          │◄════════════════════►│  Arduino Uno         │
│                                 │  F B L R S / V:PWM   │  + Motor Shield      │
│  Face / Voice / LLM / Memory    │◄──── ACK echo ───────│  Left(2) / Right(3)  │
│  MediaPipe pose → Tracking      │                      │  3s watchdog stop    │
│  Follow / Gaze / Dance / Vision │                      └──────────────────────┘
│  RobotController → USB serial   │
└─────────────────────────────────┘
```

There is **no** onboard IMU, encoders, odometry, or SLAM. Motion is **open-loop** command forcing from the phone.

### Control stack

1. **Physical:** USB-OTG phone ↔ Arduino serial
2. **Native (Kotlin):** `UsbSerialModule`, CameraX + MediaPipe, Voice, NanoHTTPD web pilot, SharedPrefs
3. **App (TypeScript):** services + Zustand stores
4. **Motors:** all wheel bytes go through `RobotController` + `MotorArbiter` (priority: E-stop > Manual > Follow/Dance > Web/Idle)
5. **Autonomy:** `TrackingEngine` → `FollowMode` / `NavigationEngine`; `EyeContactEngine` for gaze; `CompanionStateMachine` for IDLE / LISTENING / FOLLOW / DANCE / SLEEP overlaps
6. **Companion shell:** Face blink + emotion videos, Vision AI stills, DanceMode, versioned memory boot (`Storage` / `bootPersistence`)

### Connection Flow

1. Phone connects to Arduino via USB-OTG
2. `UsbSerialModule.kt` opens the port (`usb-serial-for-android`)
3. JS `UsbSerialService` / `RobotController` send commands; Arduino drives motors and echoes `ACK:`

---

## Project Structure

```
Stero_3.0/
├── Arduino Codes/
│   ├── companion_control.ino     # Serial → motors
│   └── test_motors.ino
├── android/
│   ├── keystore.properties.example
│   └── app/src/main/java/.../companion/
│       ├── UsbSerialModule.kt
│       ├── SharedPrefsModule.kt
│       ├── VisionCameraView / MediaPipe
│       ├── VoiceModule / WebController (NanoHTTPD)
│       └── …
├── docs/
│   ├── RELEASE.md
│   ├── TEST_PLAN_MVP.md
│   └── KNOWN_ISSUES.md
├── src/
│   ├── robot/                    # RobotController, MotorArbiter, Follow, Dance, CompanionStateMachine
│   ├── vision/                   # TrackingEngine, VisionAiService, captureStill
│   ├── face/                     # FaceEngine, EyeContactEngine, GazeOverlay
│   ├── memory/                   # Storage, bootPersistence, MemoryService
│   ├── voice/ / llm/ / services/ # Voice loop, LLM, USB, sleep/idle, web pilot
│   ├── store/                    # Zustand (robot, tracking, follow, companion, emotion, …)
│   ├── screens/                  # Home, Face, Vision, Manual, Settings, SerialTest
│   └── navigation/
└── package.json                  # version 2.0.0
```

---

## USB Serial Communication — How It Works

### Native Module: `UsbSerialModule.kt`

| Method | Description |
|--------|-------------|
| `listDevices()` | Scans USB serial devices |
| `requestPermission(deviceId)` | USB permission dialog |
| `connect(deviceId, baudRate)` | Open port (115200); DTR/RTS for Arduino reset |
| `write` / `writeBytes` | Send UTF-8 or raw bytes |
| `read()` | Read buffer (timeout) |
| `disconnect()` | Close port |

**Device Detection:** Arduino LLC (`0x2341`), CH340 (`0x1A86`), FTDI (`0x0403`), CP210x (`0x10C4`).

### TypeScript: `UsbSerialService` + `RobotController`

- Auto-connect, bootloader delay, connection state
- **MotorArbiter** claimants so Manual / Follow / Dance / Web do not fight
- Heartbeat while driving; E-stop clears claimants and sends `S`

### Arduino Protocol

| Command | Action |
|---------|--------|
| `F` / `B` / `L` / `R` / `S` | Drive / stop |
| `V:XXX` | PWM speed 0–255 |

Echo: `ACK:<command>`. Safety: 3s command watchdog stops motors.

---

## Setup & Installation

### Prerequisites

- Node.js ≥ 22.11.0
- Android SDK with USB debugging
- Arduino IDE + USB-OTG cable

### 1. Install Dependencies

```bash
npm install
```

### 2. Flash Arduino

Upload `Arduino Codes/companion_control.ino` at 115200 baud.

### 3. Build & Install on Phone

**Debug:**

```bash
npx react-native run-android
```

**Release APK** (signing + R8 — see [`docs/RELEASE.md`](docs/RELEASE.md)):

```bash
npm run android:release
npm run android:install:release
```

On Windows, if needed: `cd android` then `gradlew.bat assembleRelease`.

### 4. Connect & Test

1. USB-OTG phone ↔ Arduino  
2. Serial Debugger → List / Connect / grant USB  
3. Send `F` → motors; Read → `ACK:F`  
4. Full MVP gate: [`docs/TEST_PLAN_MVP.md`](docs/TEST_PLAN_MVP.md)

---

## Debugging

### Serial Debugger Screen

Device list, connect, string/byte write, read, roundtrip log.

### ADB Logcat

```bash
adb logcat -s UsbSerial:*
```

---

## Key Technical Decisions

### Why Custom Native USB Module?

`react-native-serialport` targets old RN. Custom Kotlin + `usb-serial-for-android:3.8.0` fits RN 0.86+, byte control, and clone board probing.

### Why Open-Loop Follow?

MVP closes pose → command → stop on the phone. Meter-accurate / map navigation needs hardware not in this BOM (see KNOWN_ISSUES / PRD Future V3).

### Why 115200 Baud?

Lower latency for real-time motor heartbeats than classic 9600 tutorials.

---

## Tech Stack

| Component | Technology |
|-----------|-----------|
| Mobile App | React Native 0.86 (TypeScript) |
| State | Zustand |
| Navigation | React Navigation |
| Face | Video clips + blink overlay (Skia available) |
| Vision | CameraX + MediaPipe Tasks |
| Motors | RobotController / MotorArbiter → USB serial |
| Wake / STT / TTS | Native Voice + ONNX wake word |
| Web pilot | NanoHTTPD |
| Arduino | AFMotor / L293D shield |
| Build | Gradle; release R8 + optional keystore.properties |
