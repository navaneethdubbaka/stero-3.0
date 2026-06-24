# ABIOGENESIS — Companion Robot Control System

A React Native Android application that controls a companion robot via USB serial communication to an Arduino board. The Android phone acts as the robot's brain — running AI, displaying an animated face, and sending motor commands through USB-OTG to an Arduino motor shield.

---

## Architecture Overview

```
┌─────────────────────────┐        USB-OTG Cable        ┌──────────────────────┐
│    Android Phone         │ ◄══════════════════════════► │   Arduino Uno        │
│                          │     Serial @ 115200 baud     │   + Motor Shield     │
│  ┌────────────────────┐  │                              │                      │
│  │  React Native App  │  │   Commands: "F\n" "B\n"      │  AF_DCMotor Left(2)  │
│  │  (TypeScript)      │──┼──"L\n" "R\n" "S\n"──────────►│  AF_DCMotor Right(3) │
│  │                    │  │   "V:180\n"                  │                      │
│  │  UsbSerialService  │  │                              │  Responses: "ACK:F"  │
│  │       ↕            │◄─┼──────────────────────────────│  (echo diagnostic)   │
│  │  NativeModules     │  │                              │                      │
│  │  (Kotlin Bridge)   │  │                              └──────────────────────┘
│  └────────────────────┘  │
└─────────────────────────┘
```

### Connection Flow

1. **Physical Layer**: Android phone connects to Arduino via USB-OTG cable
2. **Native Layer (Kotlin)**: `UsbSerialModule.kt` uses [`usb-serial-for-android`](https://github.com/mik3y/usb-serial-for-android) library to open a serial port — handles USB permission requests, device probing, and raw byte I/O
3. **Bridge Layer**: React Native's `NativeModules` bridge exposes `UsbSerial.write()`, `UsbSerial.writeBytes()`, and `UsbSerial.read()` to JavaScript
4. **App Layer (TypeScript)**: `UsbSerialService.ts` wraps native calls with connection state management, auto-connect logic, and error handling
5. **Arduino Layer**: Reads serial buffer, parses single-character commands (`F`/`B`/`L`/`R`/`S`), and drives DC motors via the Adafruit Motor Shield

---

## Project Structure

```
Stero_3.0/
├── Arduino Codes/
│   ├── companion_control.ino    # Main robot control sketch (serial → motors)
│   └── test_motors.ino          # Standalone motor test (no serial needed)
├── android/
│   ├── settings.gradle          # Gradle config with JitPack for USB serial library
│   └── app/src/main/java/com/com.abiogenesis.companion/
│       ├── MainApplication.kt   # Registers CompanionPackage with React Native
│       ├── CompanionPackage.kt   # Exposes UsbSerialModule + SharedPrefsModule
│       ├── UsbSerialModule.kt    # Native USB serial bridge (Kotlin)
│       └── SharedPrefsModule.kt  # Persistent settings storage
├── src/
│   ├── navigation/
│   │   └── RootNavigator.tsx     # Stack navigator (Home → Face/ManualControl/Settings/SerialTest)
│   ├── screens/
│   │   ├── HomeScreen.tsx        # Dashboard with robot status cards
│   │   ├── FaceScreen.tsx        # Animated robot face display
│   │   ├── ManualControlScreen.tsx # D-pad motor control UI
│   │   ├── SettingsScreen.tsx    # AI/Voice/Robot/Display configuration
│   │   └── SerialTestScreen.tsx  # USB serial diagnostic debugger
│   ├── services/
│   │   └── UsbSerialService.ts   # TypeScript wrapper for native USB serial
│   └── store/
│       ├── useRobotStore.ts      # Motor state + heartbeat command loop (Zustand)
│       ├── useSettingsStore.ts   # Persistent settings (Zustand)
│       └── useEmotionStore.ts   # Face emotion state (Zustand)
└── package.json
```

---

## USB Serial Communication — How It Works

### Native Module: `UsbSerialModule.kt`

The Kotlin native module provides these methods to React Native:

| Method | Description |
|--------|-------------|
| `listDevices()` | Scans for USB serial devices using default + custom probers. Returns array of `{ deviceId, vendorId, productId, deviceName }` |
| `requestPermission(deviceId)` | Shows Android USB permission dialog. Returns `true` if granted |
| `connect(deviceId, baudRate)` | Opens the serial port at specified baud rate (115200). Sets DTR/RTS for Arduino reset |
| `write(string)` | Sends a UTF-8 string to the serial port (e.g., `"F\n"`) |
| `writeBytes(array)` | Sends raw byte array for guaranteed byte-level control (e.g., `[0x46, 0x0A]`) |
| `read()` | Reads available data from serial buffer (500ms timeout). Returns UTF-8 string |
| `disconnect()` | Closes the serial port |

**Device Detection**: The module includes a custom `ProbeTable` that covers:
- Arduino LLC genuine boards (VID `0x2341`) — CDC ACM driver
- CH340/CH341 clones (VID `0x1A86`) — Ch34x driver
- FTDI FT232R (VID `0x0403`) — FTDI driver
- CP2102/CP2105 (VID `0x10C4`) — CP21xx driver

### TypeScript Service: `UsbSerialService.ts`

Wraps the native module with:
- **Auto-connect**: Scans for devices, matches known Arduino vendor IDs, requests permission, opens port
- **Bootloader delay**: Waits 2.5s after connection for Arduino to finish resetting (DTR toggle triggers reset)
- **Connection state**: Tracks `isConnected` and syncs with Zustand store
- **Diagnostics**: Exposes `getStatus()` with `lastAction`, `lastError`, `nativeModuleAvailable`

### Motor Control: `useRobotStore.ts`

When a direction button is pressed:
1. Sends the command immediately: `UsbSerialService.write("F\n")`
2. Starts a **1-second heartbeat** that repeats the command — this resets the Arduino's 3-second safety watchdog
3. On button release, sends `"S\n"` (stop) and clears the heartbeat interval

### Arduino Protocol

| Command | Action |
|---------|--------|
| `F\n` | Both motors forward |
| `B\n` | Both motors backward |
| `L\n` | Left motor backward, right forward (rotate left) |
| `R\n` | Left motor forward, right backward (rotate right) |
| `S\n` | Release both motors (stop) |
| `V:XXX\n` | Set motor speed (0-255 PWM) |

The Arduino echoes `ACK:<command>` after processing each command for diagnostic verification.

**Safety**: If no command is received for 3 seconds, motors automatically stop (watchdog timeout).

---

## Setup & Installation

### Prerequisites

- Node.js ≥ 22.11.0
- Android SDK with USB debugging enabled
- Arduino IDE (to flash the Arduino sketch)
- USB-OTG cable to connect Android phone to Arduino

### 1. Install Dependencies

```bash
npm install
```

### 2. Flash Arduino

Open `Arduino Codes/companion_control.ino` in Arduino IDE, select your board (Uno), and upload at 115200 baud.

### 3. Build & Install on Phone

**Debug build** (with dev tools):
```bash
npx react-native run-android
```

**Release build** (optimized, no dev menu):
```bash
npx react-native run-android --mode=release
```

### 4. Connect & Test

1. Connect Arduino to phone via USB-OTG
2. Open app → tap **"Serial Debugger"** card
3. Tap **List Devices** → verify Arduino appears with correct VID/PID
4. Tap **Connect** → grant USB permission when prompted
5. Tap **Send "F\n"** → Arduino motors should spin forward
6. Tap **Read** → should see `ACK:F` response

---

## Debugging

### Serial Debugger Screen

The built-in Serial Debugger (`SerialTestScreen.tsx`) provides:
- Device listing with VID/PID display
- Connect/Disconnect with status indicators
- String-based write (`"F\n"`, `"S\n"`)
- Raw byte write (`[0x46, 0x0A]`)
- Read response from Arduino
- Combined Send + Read for roundtrip testing
- Timestamped log panel

### ADB Logcat

For native-level hex byte logging:
```bash
adb logcat -s UsbSerial:*
```

This shows exactly what bytes are being sent/received at the Kotlin layer:
```
D/UsbSerial: write() sending 2 bytes: 0x46,0x0A text="F\n"
D/UsbSerial: write() success
D/UsbSerial: read() got 6 bytes: "ACK:F"
```

---

## Key Technical Decisions

### Why Custom Native Module Instead of `react-native-serialport`?

The `react-native-serialport` npm package (used in the [reference repo](https://github.com/neosarchizo/dvm-rn-serial-comm)) was last updated in 2020 and targets React Native 0.67. Our custom Kotlin module with `usb-serial-for-android:3.8.0` provides:
- Compatibility with React Native 0.86+
- Direct byte-level control without Base64 encoding overhead
- Custom probing for Arduino clone boards (CH340, FTDI, CP210x)
- Full read/write capability with proper error handling

### Why UTF-8 Strings Instead of Base64?

The reference tutorial uses `Buffer.from([97]).toString('base64')` to encode data. Our approach sends plain UTF-8 strings directly — simpler, faster, and the Kotlin bridge preserves them correctly. The `writeBytes()` method is available as a fallback for guaranteed byte-level control.

### Why 115200 Baud Instead of 9600?

Higher baud rate reduces latency for real-time motor control. The Arduino and Android both support 115200 reliably over USB serial. The reference tutorial uses 9600 which adds ~1ms per byte of unnecessary delay.

---

## Tech Stack

| Component | Technology |
|-----------|-----------|
| Mobile App | React Native 0.86 (TypeScript) |
| State Management | Zustand |
| Navigation | React Navigation (Stack) |
| Face Animation | React Native Skia |
| Native Bridge | Kotlin (Android) |
| USB Serial Library | usb-serial-for-android 3.8.0 |
| Arduino | AFMotor library (Adafruit Motor Shield) |
| Build System | Gradle 9.3 |
