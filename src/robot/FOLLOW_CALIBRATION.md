# Follow mode calibration

Vision-relative closed loop (no IMU / encoders). Pose → `NavigationEngine` →
`FOLLOW` claimant on `MotorArbiter`.

## Inputs (from Page 2 TrackingEngine)

| Field | Role |
|-------|------|
| `steerZone` | LEFT / CENTER / RIGHT from offset vs deadband |
| `distanceIntent` | APPROACH / HOLD / TOO_CLOSE vs Settings `followDistance` |
| `distanceZone` | Native CLOSE / MEDIUM / FAR (CLOSE blocks forward) |
| `targetLocked` | Lost after ~800ms without person |

Soft ranging constants: see [`src/vision/TRACKING_CALIBRATION.md`](../vision/TRACKING_CALIBRATION.md).
Shoulder-width meters are approximate — tune `followDistance` and
`trackingSensitivity` in Settings without rebuild.

## Discrete commands

| Situation | Command |
|-----------|---------|
| Not locked | `S` (release FOLLOW claim) |
| LEFT / RIGHT | `L` / `R` |
| CENTER + APPROACH (not CLOSE) | `F` |
| CENTER + HOLD / TOO_CLOSE / CLOSE | `S` |

## Anti-spin

Continuous `L` or `R` for **2500ms** → force `S` until `steerZone === CENTER`
or lock lost. Prevents endless rotate on noisy offset.

## Camera host

Pose only streams while `VisionScreen` is mounted. Leaving Vision while Follow
is on → lock lost → SEARCHING (motors stopped) until Follow is stopped or
Vision is reopened.
