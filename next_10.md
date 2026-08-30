# ABIOGENESIS — Next 10 Stages

**Document:** `next_10.md`  
**Product:** ABIOGENESIS / Stero 3.0 companion robot  
**Audience:** Implementation agents and human maintainers  
**App today:** npm `0.0.1` · Android `versionName 1.0` / `versionCode 1` · debug-signed release builds  
**Spec sources:** `PRD.md`, `tasks.md`, live code under `src/` + `android/.../companion/`

---

## How to use this document

Each **Stage (Page N)** is a self-contained implementation plan. Work them **in order** unless a stage explicitly says it can run in parallel.

When starting a stage in chat, say:

> Implement **Page N** from `next_10.md` only.

Do not pull work from later pages into the current page. Each page ends with **Done when** gates and a suggested **Android release bump**.

---

# Part A — Current reality (backfill)

## A1. What the robot actually is today

```
Android phone (brain)                     Arduino Uno + L293D
┌──────────────────────────────────┐      ┌─────────────────────┐
│ React Native 0.86 + Zustand      │ USB  │ companion_control   │
│ Face / Voice / LLM / Notifications│─────►│ F B L R S + V:PWM  │
│ MediaPipe pose telemetry (UI only)│115200│ 3s watchdog stop   │
│ Open-loop motor heartbeat        │◄─────│ ACK echo            │
└──────────────────────────────────┘      └─────────────────────┘
```

The phone is the brain. Arduino only drives motors. There is **no onboard rover odometry, IMU, encoder, force sensor, or SLAM** in this repo. “Motion” today means **open-loop command forcing**: press/hold → send `F`/`B`/`L`/`R` → 1s heartbeat → release → `S`.

**Important distinction (your current setup):**

| Term people say | What exists in code | What is missing |
|-----------------|---------------------|-----------------|
| Force / command tracking | Manual + web + heartbeat writing serial chars | Closed-loop rover motion (measure → correct) |
| Human / body motion tracking | MediaPipe pose on `VisionScreen` (offset, shoulder width, FAR/MEDIUM/CLOSE) | Pose never drives motors |
| Rover motion tracking | — | Encoders / IMU / wheel odometry / dead reckoning |
| Follow mode | Settings knobs only (`followDistance`, `trackingSensitivity`) | Tracking Engine + Navigation Engine |

So: vision can *see* a person; the drivetrain can *be forced* by UI/web; those two loops are **not connected**. That is the largest product gap versus `PRD.md` MVP (“Human Following”).

## A2. Module inventory — built vs hollow

### Working (shippable as companion shell)

| Area | Key files | Notes |
|------|-----------|--------|
| USB serial | `UsbSerialModule.kt`, `UsbSerialService.ts` | Auto-connect, VID probing, write/read |
| Manual drive | `ManualControlScreen.tsx`, `useRobotStore.ts` | D-pad + PWM + heartbeat |
| Wi‑Fi pilot | `WebControllerModule.kt`, `WebControllerService.ts` | NanoHTTPD `:8080` → `setDirection` |
| Face | `FaceEngine.tsx`, `useEmotionStore.ts`, face MP4s | Video-clip emotions |
| Voice loop | `VoiceModule.kt`, `VoiceService.ts` | Sonic wake → STT → LLM → TTS |
| LLM | `LlmClient.ts`, `ChatCompletionService.ts`, `PersonalityEngine.ts`, `ContextBuilder.ts` | OpenAI-compatible |
| Memory (light) | `MemoryService.ts`, `useMemoryStore.ts` | Heuristics + SharedPrefs; boot init weak |
| Notifications | `NotificationListenerService.kt`, `NotificationOverlay.tsx` | Face overlay |
| Sleep / idle | `SleepSystem.ts`, `IdleBehaviorEngine.ts`, `EmotionRuleEngine.ts` | Mostly wired on Face |
| Vision telemetry | `VisionCameraView.kt`, `VisionScreen.tsx` | Landmarks + HUD; **no autonomy** |
| Settings | `SettingsScreen.tsx`, `useSettingsStore.ts` | AI/Voice/Robot/Display/Logs |
| Serial debug | `SerialTestScreen.tsx` | Roundtrip diagnostics |

### Spec’d but not implemented (or UI-only)

| Feature | Evidence |
|---------|----------|
| Human Follow closed loop | `VisionScreen` never calls `useRobotStore.setDirection` |
| Tracking / Navigation engines | No `src/robot/` services; folders empty |
| Eye contact | No landmark → pupil/face offset |
| Vision AI (“what do you see?”) | No frame capture → LLM path |
| Dance mode | Absent |
| Protocol v2 `M:left,right` | Arduino + app still discrete `F/B/L/R/S` |
| MMKV / SQLite | SharedPrefs only |
| Skia procedural face / real blink render | `@shopify/react-native-skia` unused; `isBlinking` unused by UI |
| Production signing / Proguard / CI | Debug keystore; Proguard off; no release scripts |
| Formal robot state machine | Informal event wiring only (`PRD` §29) |
| Rover proprioception (IMU/encoders/force) | Nowhere in firmware or native |

### Empty / placeholder dirs

`src/robot/`, `src/notifications/`, `src/settings/`, `src/utils/` — create real modules as stages demand; do not leave logic forever in screens.

## A3. Current release posture

| Item | Value | Risk |
|------|-------|------|
| npm version | `0.0.1` | Not aligned with Android |
| `versionName` / `versionCode` | `1.0` / `1` | No staged bumps |
| Signing | Debug keystore in release | Cannot ship Play / sideload trust |
| Proguard / R8 | Disabled | Larger, less hardened APK |
| CI | None | Regressions only found on device |
| Orientation | Landscape locked | Correct for face robot |

## A4. Guiding principles for the next 10 pages

1. **Close the follow loop before fancy autonomy.** Pose → command → stop is the MVP differentiator.
2. **One arbiter owns the motors.** Manual, web, follow, dance, and voice must not fight.
3. **Settings must become live.** `followDistance` / `trackingSensitivity` / `motorSpeed` must affect runtime.
4. **Firmware stays thin.** Prefer phone-side intelligence; only extend Arduino when PWM differential or telemetry needs it.
5. **Every stage ships an installable Android build** with a version bump and a short test checklist.
6. **No rover SLAM in these 10 pages.** That stays Future V3 (`PRD` §33). These stages use **vision-relative** control, not map-based navigation.

## A5. Suggested version ladder across the 10 pages

| After stage | `versionName` | `versionCode` | Label |
|-------------|---------------|---------------|-------|
| Baseline (today) | `1.0` | 1 | Companion shell |
| Page 1 | `1.1.0` | 2 | Robot core + arbitration |
| Page 2 | `1.2.0` | 3 | Tracking store |
| Page 3 | `1.3.0` | 4 | Follow MVP |
| Page 4 | `1.4.0` | 5 | Eye contact |
| Page 5 | `1.5.0` | 6 | State machine |
| Page 6 | `1.6.0` | 7 | Vision AI |
| Page 7 | `1.7.0` | 8 | Dance / entertain |
| Page 8 | `1.8.0` | 9 | Memory / persistence |
| Page 9 | `1.9.0` | 10 | Face polish |
| Page 10 | `2.0.0` | 20 | Production MVP freeze |

Bump `package.json` version to match `versionName` when touching Android version fields.

---

# Part B — Gap map (features missing now)

Grouped by product surface; each maps to one or more pages.

1. **Motor ownership / arbitration** → Page 1  
2. **Tracking data model + settings live-wire** → Page 2  
3. **Human follow navigation** → Page 3  
4. **Eye contact / social gaze** → Page 4  
5. **Formal companion state machine** → Page 5  
6. **Vision → LLM** → Page 6  
7. **Dance + scripted motion** → Page 7  
8. **Durable memory / boot correctness** → Page 8  
9. **Face liveliness (blink, transitions)** → Page 9  
10. **Release engineering + integration freeze** → Page 10  

Out of scope for these 10 pages (backlog after Page 10): encoder/IMU rover odometry, force/torque sensing hardware, SLAM, multi-person ID, face recognition, local RAG, Play Store listing, iOS product.

---

# Part C — The next 10 pages

---

# Page 1 — Robot Core Hardening & Motor Arbitration

**Theme:** Make movement a first-class module with a single owner, before autonomy.  
**Release target:** `1.1.0` (versionCode 2)  
**Calendar:** ~3–5 days  
**Depends on:** nothing (first page)  
**Unlocks:** Pages 2–3, 5, 7

## Why this page exists

Today motors are driven from:

- `ManualControlScreen` → `useRobotStore.setDirection`
- `WebControllerService` → same store
- (soon) vision follow, dance, voice “go forward”

There is no priority, no emergency stop surface shared by all, no `src/robot/` package, and no path toward Protocol v2 differential drive. Open-loop “force commands” stay, but they must be **owned**.

## Current baseline

- Protocol v1: `F|B|L|R|S`, `V:0-255`, ACK echo, 3s Arduino watchdog  
- Heartbeat every 1s while moving (`useRobotStore`)  
- Empty `src/robot/`

## Deliverables

1. Create `src/robot/` module:
   - `RobotController.ts` — sole public API: `connect`, `stop`, `drive(direction|diff)`, `setSpeed`, `getStatus`
   - `MotorArbiter.ts` — priority stack: `EMERGENCY` > `MANUAL` > `WEB` > `FOLLOW` > `DANCE` > `IDLE`
   - `types.ts` — directions, claimants, connection status
2. Refactor `useRobotStore` to call `RobotController` (keep Zustand as UI state mirror).
3. Route Manual + Web through arbiter claimants; releasing Manual restores lower claimant or Stop.
4. Add global **Emergency Stop** (Face long-press or Home hardware-style button) → `EMERGENCY` claimant forces `S` until cleared.
5. Document Protocol v2 sketch in code comments / small `src/robot/PROTOCOL.md`:
   - Keep v1 working
   - Add optional `M:<left>,<right>\n` (0–255) for later follow smoothness — **implement Arduino + writer stubs**, enable only behind a settings flag `useDifferentialDrive` default **false**
6. Wire Settings `robot.motorSpeed` so changing it calls `RobotController.setSpeed` live (today store default and settings can drift).

## Modules touched

`src/robot/*` (new), `useRobotStore.ts`, `ManualControlScreen.tsx`, `WebControllerService.ts`, `HomeScreen.tsx` / `FaceScreen.tsx` (E-stop), `companion_control.ino` (optional v2), `UsbSerialService.ts`, Settings robot tab.

## Implementation order

1. Types + arbiter (unit-testable priority rules in Jest if feasible)  
2. Controller wrapping USB writes  
3. Refactor store + Manual + Web  
4. E-stop UI  
5. Optional firmware `M:` parser behind flag  
6. Release build smoke

## Done when

- [ ] Only `RobotController` writes motor serial bytes (grep confirms)  
- [ ] Manual press beats Follow claimant (Follow may not exist yet — simulate with fake claimant test)  
- [ ] E-stop always wins and clears heartbeat  
- [ ] Settings motor speed affects Arduino immediately  
- [ ] `npx react-native run-android --mode=release` installable as `1.1.0`

## Explicitly not in this page

Follow loop, eye contact, dance sequences, production keystore.

---

# Page 2 — Tracking Engine (Pose → App State)

**Theme:** Turn VisionScreen telemetry into a reusable tracking service. Still **no motors**.  
**Release target:** `1.2.0` (versionCode 3)  
**Calendar:** ~3–4 days  
**Depends on:** Page 1 recommended (shared types); can start types-only in parallel  
**Unlocks:** Pages 3–4

## Why this page exists

`VisionCameraView.kt` already emits `personFound`, `offset`, `shoulderWidth`, `distanceZone`, landmarks. That data dies inside `VisionScreen` local state. Follow settings are stored but unread by vision.

## Current baseline

- Native: `VisionCameraView.processPoseResult()`  
- JS: `VisionCameraView.tsx` event bridge  
- UI: skeleton + HUD on `VisionScreen`  
- Settings: `followDistance`, `trackingSensitivity` unused by vision

## Deliverables

1. `src/vision/TrackingEngine.ts` (or `src/robot/TrackingEngine.ts` if you prefer robot-owned sensing):
   - Subscribe to pose events (from a headless camera host **or** VisionScreen forwarding)
   - Maintain `useTrackingStore`: `personFound`, `offset`, `distanceZone`, `shoulderWidth`, `confidence`, `lostMs`, `targetLocked`
2. Target selection: largest / most confident person (even if only one pose stream today).
3. Dead-zone + sensitivity: map `trackingSensitivity` → center deadband width for `offset` (e.g. 0.05–0.25 normalized).
4. Distance mapping: map shoulder width / zone toward a soft estimate vs `followDistance` (document calibration constants; no hardware ranging).
5. Events: `PERSON_FOUND`, `PERSON_LOST`, `TARGET_UPDATED` for emotion/sleep hooks later.
6. Refactor `VisionScreen` to **read store** for HUD (single source of truth).
7. Optional: lightweight headless pose host component usable from Face later (can be stubbed if Face integration is Page 4/5).

## Modules touched

`src/vision/*`, new `useTrackingStore.ts`, `VisionScreen.tsx`, `useSettingsStore.ts` (read path), possibly `FaceScreen.tsx` mount plan (document only if not implementing headless yet).

## Implementation order

1. Zustand tracking store  
2. Engine that normalizes native events  
3. Sensitivity / distance helpers using settings  
4. VisionScreen refactor  
5. Lost-target timeout logic  
6. Release smoke (camera still paints skeleton)

## Done when

- [ ] Pose HUD updates from store, not only local React state  
- [ ] Changing tracking sensitivity visibly changes “CENTER” deadband behavior in HUD  
- [ ] `PERSON_LOST` fires after configurable timeout when landmarks drop  
- [ ] No motor commands introduced yet (assert Follow claimant unused)  
- [ ] Version `1.2.0`

## Explicitly not in this page

Calling `setDirection`, eye pupils, LLM vision.

---

# Page 3 — Follow Mode (Closed-Loop Human Following)

**Theme:** Connect tracking → arbiter → motors. This is the rover “motion tracking” you are missing: **vision-relative closed loop**, not IMU odometry.  
**Release target:** `1.3.0` (versionCode 4)  
**Calendar:** ~5–7 days  
**Depends on:** Pages 1–2  
**Unlocks:** Pages 4–5, MVP claim “Human Following”

## Why this page exists

PRD Tasks 35–36 and Phase 5 require follow. Settings already pretend it exists. Without this page the product is a talking face on wheels you drive yourself.

## Control strategy (v1 — discrete, safe)

```
pose offset / zone
        ↓
NavigationEngine.tick()
        ↓
claim FOLLOW on MotorArbiter
        ↓
LEFT | RIGHT | FORWARD | STOP  (Protocol v1)
```

Rules (tune via settings):

| Condition | Command |
|-----------|---------|
| No person / lost | `S` (or release FOLLOW claim) |
| Offset left of deadband | `L` |
| Offset right of deadband | `R` |
| Center + FAR | `F` |
| Center + MEDIUM (near followDistance) | `S` or gentle hold |
| Center + CLOSE | `S` (never push into user) |
| Manual / E-stop active | Follow yields |

Optional stretch (same page only if time left): if `useDifferentialDrive`, emit soft `M:l,r` for smoother centering — otherwise stay on v1.

## Deliverables

1. `src/robot/NavigationEngine.ts` — pure mapping from tracking snapshot + settings → command.  
2. `src/robot/FollowMode.ts` — start/stop, tick loop (10–15 Hz or on pose event), claimant lifecycle.  
3. UI:
   - Toggle **Follow** on `VisionScreen` and/or Face menu  
   - Status chip: `FOLLOWING` / `SEARCHING` / `HOLD` / `OFF`  
4. Safety:
   - Auto-stop on USB disconnect  
   - Auto-stop when Face sleep engages  
   - Max continuous rotate time (anti-spin)  
5. Voice hooks (minimal): utterances matching `/follow me|stop following/` start/stop FollowMode (parse in `VoiceService` without expanding Vision AI).  
6. Calibration notes in `src/robot/FOLLOW_CALIBRATION.md` (shoulder-width vs distance is approximate).

## Modules touched

`NavigationEngine.ts`, `FollowMode.ts`, `VisionScreen.tsx`, `FaceScreen.tsx`, `VoiceService.ts`, `SleepSystem.ts`, `MotorArbiter` (Page 1), Settings robot tab copy (“these now affect Follow”).

## Implementation order

1. NavigationEngine pure functions + Jest cases for zones  
2. FollowMode + arbiter claim  
3. VisionScreen toggle  
4. Safety stops  
5. Voice start/stop  
6. Device trials at multiple distances  
7. Release `1.3.0`

## Done when

- [ ] With USB connected, enabling Follow makes rover center on person and advance when FAR  
- [ ] CLOSE stops forward motion  
- [ ] Manual override instantly takes wheels  
- [ ] Person loss → stop within ~500ms–1s  
- [ ] `followDistance` / `trackingSensitivity` change behavior without rebuild  
- [ ] Version `1.3.0`

## Explicitly not in this page

Eye contact animation, dance, map building, true meter-accurate ranging.

---

# Page 4 — Eye Contact & Social Gaze

**Theme:** Make the face look aware using the same tracking stream.  
**Release target:** `1.4.0` (versionCode 5)  
**Calendar:** ~3–5 days  
**Depends on:** Page 2 (Page 3 strongly preferred so face+follow coexist)  
**Unlocks:** Stronger companion feel; Page 5 emotions

## Why this page exists

PRD §24: pupils track face/head. Current face is full-screen video clips — limited pupil control. This page either:

- **Path A (preferred if assets allow):** drive a lightweight gaze overlay (Skia or SVG pupils) on top of videos, or  
- **Path B:** select alternate face clips / horizontal look variants (`LOOK_LEFT` / `LOOK_RIGHT` / `ALERT` already appear in idle engine)

Pick Path A if Skia dependency should finally earn its place; otherwise Path B ships faster.

## Deliverables

1. `src/face/EyeContactEngine.ts` — maps tracking `offset` (+ optional nose/eye landmarks) → gaze vector `[-1,1]`.  
2. Integrate on `FaceScreen` when tracking host is active (headless camera or interleaved preview — decide and document power cost).  
3. When person lost: return gaze to center with ease.  
4. Respect sleep: disable gaze camera work in sleep to save CPU/battery.  
5. EmotionRuleEngine: optional `PERSON_FOUND` → brief `HAPPY` / `ALERT` without spamming.

## Modules touched

`EyeContactEngine.ts`, `FaceEngine.tsx`, `FaceScreen.tsx`, tracking store, `SleepSystem.ts`, possibly Skia overlay component.

## Done when

- [ ] Visible gaze or look-variant responds to person lateral position  
- [ ] Sleep disables gaze pipeline  
- [ ] No regression to Follow (if Page 3 done)  
- [ ] Version `1.4.0`

## Explicitly not in this page

Full Skia rewrite of entire face; face recognition IDs.

---

# Page 5 — Companion State Machine & Behavior Arbitration

**Theme:** Replace ad-hoc triggers with an explicit robot life-cycle.  
**Release target:** `1.5.0` (versionCode 6)  
**Calendar:** ~4–6 days  
**Depends on:** Pages 1–3 (Page 4 optional)  
**Unlocks:** Pages 6–7 safe composition

## Why this page exists

PRD §29 describes SLEEP → WAKE → LISTENING → THINKING → SPEAKING → IDLE. Today these are scattered across `VoiceService`, `SleepSystem`, `EmotionRuleEngine`, Follow toggles. Conflicts will worsen after Vision AI + Dance.

## Deliverables

1. `src/robot/CompanionStateMachine.ts` states:

```
SLEEP | IDLE | LISTENING | THINKING | SPEAKING |
FOLLOWING | DANCING | MANUAL | ERROR
```

2. Transition table with guards (e.g. cannot FOLLOW while MANUAL claimant held).  
3. Single `useCompanionStore` mirroring state for UI badges on Home/Face.  
4. Migrate:
   - Voice pipeline enters LISTENING/THINKING/SPEAKING  
   - Sleep enters SLEEP / leaves on wake word, touch, notification  
   - FollowMode enters FOLLOWING  
   - ManualControl forces MANUAL while pad held  
5. EmotionRuleEngine consumes state transitions (stop double-setting emotions from three places).  
6. Logging: ring buffer of last N transitions for Settings LOGS tab.

## Modules touched

New state machine + store, `VoiceService.ts`, `SleepSystem.ts`, `FollowMode.ts`, `FaceScreen.tsx`, `HomeScreen.tsx`, `EmotionRuleEngine.ts`.

## Done when

- [ ] Home/Face shows live companion state  
- [ ] Illegal overlaps prevented (dance vs follow vs manual) via machine + arbiter  
- [ ] Emotion changes primarily from state transitions  
- [ ] Version `1.5.0`

## Explicitly not in this page

New features (dance/vision AI) — only hooks/stubs for their states.

---

# Page 6 — Vision AI (See → Speak)

**Theme:** Camera frame questions through the existing LLM stack.  
**Release target:** `1.6.0` (versionCode 7)  
**Calendar:** ~5–7 days  
**Depends on:** Page 5 recommended; LLM stack already exists  
**Unlocks:** Richer companion demos

## Why this page exists

PRD §27 / Task 38: “What do you see?”, OCR-ish asks, count people. No frame pipeline today.

## Deliverables

1. Native or JS path to capture a JPEG/PNG still from the active camera session (`VisionCameraView` capture method or CameraX image).  
2. `src/vision/VisionAiService.ts`:
   - Build multimodal chat payload when provider supports images  
   - Fallback: text-only summary from pose metrics (“I see one person, roughly medium distance”) when no vision model  
3. Voice intents: see / read / count / find — route into VisionAiService before normal chat.  
4. Settings: toggle “Allow vision AI”, max image size, model override if needed.  
5. Face emotions: THINKING while waiting, SPEAKING on answer.  
6. Privacy: do not store images by default; optional debug save behind flag.

## Modules touched

`VisionCameraView.kt` (+ manager), `VisionAiService.ts`, `VoiceService.ts`, `ChatCompletionService.ts` / `LlmClient.ts`, Settings AI tab, state machine VISION or THINKING reuse.

## Done when

- [ ] “What do you see?” yields a spoken answer using camera context  
- [ ] Works offline-ish with pose fallback when API rejects images  
- [ ] No image retention by default  
- [ ] Version `1.6.0`

## Explicitly not in this page

Continuous video understanding, on-device VLM.

---

# Page 7 — Dance Mode & Scripted Behaviors

**Theme:** Entertainment motion + face sync under the arbiter.  
**Release target:** `1.7.0` (versionCode 8)  
**Calendar:** ~3–5 days  
**Depends on:** Pages 1 + 5  
**Unlocks:** Demo polish for Page 10

## Why this page exists

PRD §28 / Task 39. Good for demos; must never override E-stop/Manual.

## Deliverables

1. `src/robot/DanceMode.ts` — timeline of steps: `{ t, command|diff, emotion, optional tts }`.  
2. 1–2 built-in routines (`spin_happy`, `wiggle`).  
3. Start via voice “dance” / UI button; state `DANCING`.  
4. Abort on E-stop, Manual, USB drop, wake-word interrupt.  
5. Optional simple beat-less loop using existing TTS chime or silent motion if no audio assets.

## Modules touched

`DanceMode.ts`, state machine, arbiter, `VoiceService.ts`, Face menu / Home card.

## Done when

- [ ] Dance runs end-to-end and returns to IDLE  
- [ ] Manual/E-stop aborts immediately  
- [ ] Version `1.7.0`

---

# Page 8 — Memory, Persistence & Boot Correctness

**Theme:** Backfill reliability of identity and history.  
**Release target:** `1.8.0` (versionCode 9)  
**Calendar:** ~4–6 days  
**Depends on:** can parallelize earlier, but integrate after Page 5 emotions settle  
**Unlocks:** Page 10 confidence

## Why this page exists

- `initializeMemory()` is not reliably called on cold start from Home  
- PRD promises MMKV/SQLite; app uses SharedPrefs JSON blobs  
- Friendship level / long conversations are shallow  
- Conversation + settings + memory keys are ad hoc

## Deliverables

1. Boot pipeline in `App.tsx` or `HomeScreen`: `initializeSettings` → `initializeMemory` → restore conversation summary.  
2. Introduce durable storage layer (`src/memory/Storage.ts`) — prefer MMKV if RN-compatible in this RN version; else structured SharedPrefs with versioned schema migrations.  
3. Schema version field + migration stub (`v1 → v2`).  
4. Memory API: get/set user name, preferences, facts; trim conversation to last N with export in LOGS.  
5. Fix friendship / preference updates on meaningful dialogues (lightweight).  
6. Settings LOGS: show memory snapshot + clear controls.

## Modules touched

`MemoryService.ts`, stores, `App.tsx` / `HomeScreen.tsx`, Settings LOGS, package deps if MMKV added.

## Done when

- [ ] Kill app → relaunch preserves name/prefs/settings  
- [ ] Memory init always runs once at boot  
- [ ] Clear-data path documented  
- [ ] Version `1.8.0`

## Explicitly not in this page

Full RAG vector store.

---

# Page 9 — Face Engine Polish (Blink, Transitions, Presence)

**Theme:** Close the “alive face” gaps without blocking autonomy.  
**Release target:** `1.9.0` (versionCode 10)  
**Calendar:** ~4–6 days  
**Depends on:** Page 4 if gaze overlay exists; else independent  
**Unlocks:** Page 10 presentation quality

## Why this page exists

Blink loop updates store flags that UI ignores. Idle behaviors exist but transitions can feel abrupt. Skia is unused.

## Deliverables

1. Wire blink: either short eyelid overlay or blink video cut that respects `isBlinking`.  
2. Smoother emotion crossfade between dual video players (already dual-player — tune timing).  
3. Align IdleBehaviorEngine intervals with PRD (30–90s) or document why 20–40s remains.  
4. Ensure `EmotionRuleEngine.INACTIVITY` or remove dead code path (unify with SleepSystem).  
5. Performance pass on FaceScreen (no camera+video+LLM pile-up when sleeping).

## Modules touched

`FaceEngine.tsx`, `useEmotionStore.ts`, `IdleBehaviorEngine.ts`, `EmotionRuleEngine.ts`, `FaceScreen.tsx`.

## Done when

- [ ] Visible blink while IDLE  
- [ ] No contradictory emotion setters for sleep/inactivity  
- [ ] Face remains ≥30 FPS feel on mid device with follow off  
- [ ] Version `1.9.0`

---

# Page 10 — Android Release Engineering & MVP Freeze

**Theme:** Ship a trustworthy **MVP companion** build, not a debug toy.  
**Release target:** `2.0.0` (versionCode 20)  
**Calendar:** ~5–8 days  
**Depends on:** Pages 1–9 (soft: Pages 6–7 can be feature-flagged off)  
**Unlocks:** External testers / demo units

## Why this page exists

Release builds still use the debug keystore; Proguard off; versions inconsistent; no single test gate for “MVP complete” vs PRD §32.

## MVP freeze definition (must all pass)

| MVP item (PRD §32) | Gate |
|--------------------|------|
| Face Engine | Page 9 blink + emotions on device |
| Wake / STT / TTS | Full voice loop |
| OpenAI-compatible LLM | Settings-configured provider |
| Notifications | WhatsApp (or any) overlay on Face |
| USB robot control | Manual + ACK |
| Human Following | Page 3 on-device demo |
| Emotion System | State machine driven |

Feature flags allowed for Vision AI / Dance if unstable — document in release notes.

## Deliverables

1. **Signing:** create/release keystore instructions in `docs/RELEASE.md` (do not commit secrets); wire `signingConfigs.release` via `keystore.properties` gitignored.  
2. Enable R8/Proguard with keep rules for RN, USB serial, ONNX, MediaPipe, NanoHTTPD.  
3. Align versions: `package.json`, `versionName`, `versionCode`.  
4. Scripts in `package.json`:
   - `android:release` → assembleRelease  
   - `android:install:release`  
5. `docs/TEST_PLAN_MVP.md` — checklist mirroring Done-whens from Pages 1–9.  
6. Update root `README.md` architecture section to match reality (vision follow, arbiter, state machine).  
7. Crash/ANR pass: USB unplug mid-follow, deny camera, deny mic, bad API key.  
8. Tag git `v2.0.0` only when user asks to commit/tag.

## Modules touched

`android/app/build.gradle`, `.gitignore`, `docs/*`, `README.md`, `package.json`, possibly Proguard rules file.

## Done when

- [ ] Installable release APK signed with **non-debug** keystore on a clean phone  
- [ ] MVP checklist green  
- [ ] README matches code  
- [ ] Version `2.0.0` / versionCode 20  
- [ ] Known issues list written (honest about no IMU/SLAM)

## Explicitly not in this page

Play Console listing, iOS shipping, hardware redesign.

---

# Part D — Timeline roll-up

| Page | Focus | Est. calendar | Release |
|------|-------|---------------|---------|
| 1 | Robot core + arbiter | 3–5 d | 1.1.0 |
| 2 | Tracking engine | 3–4 d | 1.2.0 |
| 3 | Follow mode | 5–7 d | 1.3.0 |
| 4 | Eye contact | 3–5 d | 1.4.0 |
| 5 | State machine | 4–6 d | 1.5.0 |
| 6 | Vision AI | 5–7 d | 1.6.0 |
| 7 | Dance | 3–5 d | 1.7.0 |
| 8 | Memory / boot | 4–6 d | 1.8.0 |
| 9 | Face polish | 4–6 d | 1.9.0 |
| 10 | Release / MVP freeze | 5–8 d | **2.0.0** |

**Sequential critical path:** 1 → 2 → 3 → 5 → 10  
**Parallelizable after 1:** 8 (memory), parts of 9 (face)  
**Parallelizable after 5:** 6 and 7  

**Rough wall-clock if one implementer, mostly sequential:** ~6–9 weeks.  
**With parallel memory/face after Page 1:** ~5–7 weeks.

---

# Part E — Working agreement for later chats

1. One page per implementation session unless you explicitly ask to combine.  
2. Start by re-reading that page’s **Deliverables** and **Done when**.  
3. Do not invent IMU/force/SLAM hardware work inside these pages.  
4. Prefer extending `RobotController` / arbiter over sprinkling `UsbSerialService.write` in screens.  
5. After each page: release build + short note of what flipped from “missing” to “present”.

---

# Part F — One-line stage cheat sheet

1. **Own the motors.**  
2. **Own the pose stream.**  
3. **Follow the human.**  
4. **Look at the human.**  
5. **Make life-cycle explicit.**  
6. **Talk about what you see.**  
7. **Dance on command.**  
8. **Remember across reboots.**  
9. **Look alive when idle.**  
10. **Sign, harden, freeze MVP.**

---

*Generated from live Stero_3.0 codebase + `PRD.md` / `tasks.md`. Revisit this file after Page 10 for a `next_10_v2.md` covering odometry, force sensing, SLAM, and Play distribution if hardware appears.*
