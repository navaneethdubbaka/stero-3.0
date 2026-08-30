# MVP test plan (2.0.0)

Manual checklist for external testers / demo units. Map: Pages 1–9 Done-whens + PRD §32 + crash/ANR rows.

Mark each row Pass / Fail / Skip. Prefer a **release** APK (`npm run android:release`) on a clean phone with USB-OTG + Arduino flashed (`companion_control.ino`).

---

## PRD §32 — MVP requirements

| # | Requirement | Gate | Pass |
|---|-------------|------|------|
| 1 | Face Engine | Blink visible while IDLE; emotion clips crossfade; sleep pauses blink/videos | ☐ |
| 2 | Sonic wake word | Wake → listening with mic permission | ☐ |
| 3 | Speech recognition | Spoken utterance → transcript in voice/chat path | ☐ |
| 4 | TTS | Assistant reply spoken aloud | ☐ |
| 5 | OpenAI-compatible LLM | Settings base URL + key → coherent reply | ☐ |
| 6 | WhatsApp (or any) notifications | Notification access → overlay on Face | ☐ |
| 7 | USB robot control | Manual D-pad + `ACK` in Serial Debugger | ☐ |
| 8 | Human Following | USB connected, Follow on → center + advance when FAR; CLOSE stops forward | ☐ |
| 9 | Emotion System | Companion state transitions drive face emotion (not only idle timers) | ☐ |

---

## Page 1 — Robot core + arbiter

| Check | Pass |
|-------|------|
| Only `RobotController` writes motor serial bytes (no stray screen writes) | ☐ |
| Manual press beats Follow claimant | ☐ |
| E-stop always wins and clears heartbeat | ☐ |
| Settings motor speed affects Arduino immediately (`V:PWM`) | ☐ |

## Page 2 — Tracking engine

| Check | Pass |
|-------|------|
| Pose HUD updates from tracking store | ☐ |
| Tracking sensitivity changes CENTER deadband in HUD | ☐ |
| `PERSON_LOST` after configurable timeout when landmarks drop | ☐ |

## Page 3 — Follow MVP

| Check | Pass |
|-------|------|
| Follow centers on person and advances when FAR | ☐ |
| CLOSE stops forward motion | ☐ |
| Manual override instantly takes wheels | ☐ |
| Person loss → stop within ~500ms–1s | ☐ |
| `followDistance` / `trackingSensitivity` change behavior without rebuild | ☐ |

## Page 4 — Eye contact

| Check | Pass |
|-------|------|
| Gaze / look-variant responds to person lateral position | ☐ |
| Sleep disables gaze pipeline | ☐ |
| No Follow regression | ☐ |

## Page 5 — Companion state machine

| Check | Pass |
|-------|------|
| Home/Face shows live companion state | ☐ |
| Illegal overlaps prevented (dance vs follow vs manual) via machine + arbiter | ☐ |
| Emotion changes primarily from state transitions | ☐ |

## Page 6 — Vision AI

| Check | Pass |
|-------|------|
| “What do you see?” yields spoken answer with camera context | ☐ |
| Pose fallback works when API rejects images | ☐ |
| No image retention by default | ☐ |
| Settings `allowVisionAi` can disable the feature | ☐ |

## Page 7 — Dance

| Check | Pass |
|-------|------|
| Dance runs end-to-end and returns to IDLE | ☐ |
| Manual / E-stop aborts immediately | ☐ |

## Page 8 — Memory / boot

| Check | Pass |
|-------|------|
| Kill app → relaunch preserves name/prefs/settings | ☐ |
| Memory init runs once at boot | ☐ |
| Clear-data path known (Android app info → Clear storage) | ☐ |

## Page 9 — Face polish

| Check | Pass |
|-------|------|
| Visible blink while IDLE | ☐ |
| No contradictory emotion setters for sleep/inactivity | ☐ |
| Face remains usable FPS feel on mid device with follow off | ☐ |

## Page 10 — Release engineering

| Check | Pass |
|-------|------|
| `versionName` 2.0.0 / `versionCode` 20 on installed APK | ☐ |
| With `android/keystore.properties` present, APK is **not** debug-signed | ☐ |
| Without properties, Gradle warns and debug-signs (smoke only) | ☐ |
| Release APK installs and launches after R8 minify | ☐ |

---

## Crash / ANR scenarios

| Scenario | Expected | Pass |
|----------|----------|------|
| USB unplug mid-Follow | Motors stop / follow aborts; app does not ANR; reconnect possible | ☐ |
| Deny camera permission | Vision/Follow degrade gracefully; no crash loop | ☐ |
| Deny microphone permission | Voice loop fails closed; UI explains / stays usable | ☐ |
| Bad / empty LLM API key | Chat/vision errors surfaced; no freeze | ☐ |
| Web pilot + Manual conflict | Arbiter priority respected; no stuck motors | ☐ |

---

## Sign-off

| Field | Value |
|-------|-------|
| Build (`versionName` / `versionCode`) | |
| Device / Android version | |
| Tester | |
| Date | |
| Notes | |
