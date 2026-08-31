# Follow mode calibration

Vision-relative closed loop (no IMU / encoders). Pose → `NavigationEngine` →
`FOLLOW` claimant on `MotorArbiter`.

**Firmware:** flash [`Arduino Codes/companion_control.ino`](../../Arduino%20Codes/companion_control.ino)
with Protocol **v2.1** (`M:l,r` signed, `ACK:M` / `NAK:M`). Confirm in Serial Debugger
with `M:180,120` and `M:-120,120`.

## Inputs (from Page 2 TrackingEngine)

| Field | Role |
|-------|------|
| `steerZone` | LEFT / CENTER / RIGHT from offset vs deadband |
| `distanceIntent` | APPROACH / HOLD / TOO_CLOSE vs Settings `followDistance` |
| `distanceZone` | Native CLOSE / MEDIUM / FAR (CLOSE blocks forward) |
| `targetLocked` | Lost after ~800ms without person |
| `offset` | Continuous lateral error for curve / spin |

Soft ranging constants: see [`src/vision/TRACKING_CALIBRATION.md`](../vision/TRACKING_CALIBRATION.md).
Shoulder-width meters are approximate — tune `followDistance` and
`trackingSensitivity` in Settings without rebuild.

## Protocol v1 (differential OFF)

| Situation | Command |
|-----------|---------|
| Not locked | `S` (release FOLLOW claim) |
| LEFT / RIGHT | `L` / `R` |
| CENTER + APPROACH (not CLOSE) | `F` |
| CENTER + HOLD / TOO_CLOSE / CLOSE | `S` |

## Protocol v2.1 (differential ON — default)

| Situation | `M:left,right` |
|-----------|----------------|
| Not locked / CLOSE / HOLD | `0,0` → stop |
| CENTER + FAR + APPROACH | Equal forward PWM ≈ `followMaxPwm` |
| CENTER + MEDIUM + APPROACH | Equal mid PWM |
| Mild offset (curve) | Both ≥ 0; person left → left < right |
| Large offset (spin) | Opposite signs (`-pwm,+pwm` or `+pwm,-pwm`) |

PWM is **slewed** (±32 per tick @ ~18 Hz) so Follow does not jump 0→255 in one frame.
CLOSE / stop jumps to zero immediately for shin safety.

### Settings tunables

| Setting | Default | Notes |
|---------|---------|-------|
| `useDifferentialDrive` | ON | Auto-fallback to v1 on `NAK:M` / missing `ACK:M` |
| `followMaxPwm` | 180 | Also clamped to Manual `motorSpeed` |
| `followMinPwm` | 80 | Floor so motors still move on carpet |
| `curveGain` | 1.0 | Raise on slick tile; lower if oversteering |
| `maxRotateBurstMs` | 2500 | Anti-spin cap for continuous rotate |

### Surface notes

| Surface | Tip |
|---------|-----|
| Carpet / soft | Raise `followMinPwm` (90–110) so curves don’t stall |
| Tile / hard | Lower `followMaxPwm` / `curveGain` to avoid skate |
| Outdoor grit | Prefer lower max PWM; battery drain is higher with spin |

## Anti-spin

Continuous spin / `L`/`R` for **`maxRotateBurstMs`** → force stop until re-centered
or lock lost. Prevents endless rotate on noisy offset.

## Camera host

Pose only streams while `VisionScreen` is mounted. Leaving Vision while Follow
is on → lock lost → SEARCHING (motors stopped) until Follow is stopped or
Vision is reopened.
