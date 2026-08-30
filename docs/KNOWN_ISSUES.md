# Known issues — MVP 2.0.0

Honest limitations for demos and external testers. Not a bug dump of every log line.

## Hardware / autonomy (by design)

- **No IMU, encoders, wheel odometry, force sensing, or SLAM** in this repo. The Arduino only drives motors; the phone never measures rover pose.
- **Open-loop motors.** Follow and dance send discrete `F`/`B`/`L`/`R`/`S` (and PWM `V:`) with heartbeat. There is no closed-loop speed or heading correction.
- **Follow distance is vision-relative** (pose / shoulder heuristics), not meter-accurate ranging.

## Vision AI

- Vision AI needs a **Face or Vision screen camera host** (preview running) to capture a still.
- Multimodal LLM support varies by provider; when images are rejected, the app uses a **pose / telemetry fallback**.
- Continuous video understanding and on-device VLM are out of scope for MVP.

## Release signing

- Without `android/keystore.properties`, release builds **fall back to the debug keystore** (Gradle warning). Fine for local smoke tests; **not** suitable for trusted sideload / Play.
- Never commit keystores or passwords. See [RELEASE.md](./RELEASE.md).

## Feature stability

- **Dance** and **Vision AI** are shipped and toggleable (`allowVisionAi` in Settings). Treat as demo features if flaky on a given device or API.
- Landscape lock is intentional for the face robot form factor.

## Memory

- Persistence is **SharedPrefs + versioned schema**, not MMKV/SQLite/RAG. Clear app storage wipes companion memory.

## Platform

- **Android-only** companion brain for MVP. iOS shipping is out of scope.
- Play Console listing / store assets are not part of this freeze.
