# Field reliability (2.2.0)

How to run the companion as a **hours-long device**, not a demo APK.

## Chassis / phone

- Phone sits **landscape** in the chassis (app is orientation-locked).
- Leave **ventilation** around the phone. Follow + camera + face video + LLM will heat a pocket chassis.
- Thermal ≥ severe: pose camera pauses when Follow is off; face drops the dual video player. TTS still works.
- Battery ≤ 15%: Follow start is refused; the face shows low-battery; voice says “I need to charge”. There is **no dock**.

## USB-OTG power

- Prefer a **powered OTG hub** or a phone that can supply Arduino without collapsing.
- Unplug mid-Follow: motors stop (watchdog + Follow abort), UI shows USB offline, heartbeat is cleared so reconnect cannot duplicate intervals.
- Reconnect uses exponential backoff (1s → 30s). **No polling** when no USB devices are present — plug the cable or resume the app.
- Persistent connect failures (cable present) move companion state to `ERROR`. Tap the Home USB badge to retry.

## CI artifacts

GitHub Actions:

- **PRs:** `npx tsc --noEmit` + `npm test`
- **push to main:** same + `./gradlew assembleRelease`

If `android/keystore.properties` is **not** in CI, the release APK is **debug-signed** (Gradle warning). That artifact is for smoke tests only. Production sideload needs a real keystore — see [RELEASE.md](./RELEASE.md).

## Diagnostics

Settings → LOGS → **Share diagnostics**. File-only zip: USB lastAction, companion transitions, robot warnings, log ring. **No** chat transcripts or API keys. Firebase Crashlytics is not used.
