# Release builds (MVP 2.2.0)

Production-style Android APKs for ABIOGENESIS companion. Debug installs (`npm run android`) are unchanged. Field notes: [`docs/FIELD.md`](./FIELD.md).

## Version

| Field | Value |
|-------|-------|
| `package.json` version | `2.2.0` |
| `versionName` | `2.2.0` |
| `versionCode` | `22` |

## Create a release keystore (once)

Do **not** commit `.jks` / `.keystore` files or passwords.

```bash
keytool -genkeypair -v \
  -storetype PKCS12 \
  -keystore android/abiogenesis-release.jks \
  -alias abiogenesis \
  -keyalg RSA \
  -keysize 2048 \
  -validity 10000
```

## Configure signing

1. Copy the example properties file:

```bash
cp android/keystore.properties.example android/keystore.properties
```

2. Edit `android/keystore.properties` (paths relative to the `android/` Gradle root):

```properties
storeFile=abiogenesis-release.jks
storePassword=YOUR_STORE_PASSWORD
keyAlias=abiogenesis
keyPassword=YOUR_KEY_PASSWORD
```

`android/keystore.properties`, `*.jks`, and `*.keystore` (except `debug.keystore`) are gitignored.

If `keystore.properties` is **missing**, `assembleRelease` still succeeds but signs with the **debug** keystore and prints a Gradle warning. That is fine for local smoke tests — **production / sideload demos must use a real release keystore**.

## Build & install

From the repo root:

```bash
npm run android:release
npm run android:install:release
```

**Windows (PowerShell / cmd)** if the npm script shell does not find `./gradlew`:

```bat
cd android
gradlew.bat assembleRelease
gradlew.bat installRelease
```

**macOS / Linux:**

```bash
cd android && ./gradlew assembleRelease
cd android && ./gradlew installRelease
```

### APK output

```
android/app/build/outputs/apk/release/app-release.apk
```

R8 minify + resource shrink are enabled for release. Keep rules live in `android/app/proguard-rules.pro`.

## Feature flags shipped

| Feature | Control | Notes |
|---------|---------|--------|
| Vision AI | Settings → `allowVisionAi` | Needs Face/Vision camera host + LLM that accepts images (pose fallback if not) |
| Dance | Voice / Face / Home | Abort on USB loss, E-stop, manual, wake, sleep |

## Release notes — 2.0.0 MVP freeze

- Robot core: `RobotController` + `MotorArbiter` (manual / follow / dance / web / E-stop)
- Human follow (open-loop vision-relative), eye contact gaze, companion state machine
- Vision AI stills (“what do you see?”), dance routines, versioned memory boot persistence
- Face blink overlay + emotion crossfade
- Release signing via `keystore.properties`, R8 on, docs under `docs/`

Honest gaps: see [KNOWN_ISSUES.md](./KNOWN_ISSUES.md). Device gate: [TEST_PLAN_MVP.md](./TEST_PLAN_MVP.md).
