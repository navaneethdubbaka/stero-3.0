# Tracking calibration (soft ranging)

No depth camera or ToF. Distance is estimated from **normalized shoulder width**
(MediaPipe landmarks 11–12, |xL − xR| in image space).

```
estimatedDistanceM = clamp(K / max(shoulderWidth, 0.01), MIN, MAX)
```

| Constant | Value | Notes |
|----------|-------|--------|
| `K` (`DISTANCE_SCALE_K`) | `0.4` | Tunable; larger K → farther estimate for same width |
| `MIN` | `0.4` m | Floor |
| `MAX` | `5.0` m | Ceiling |
| Intent tolerance | `±0.25` m | vs Settings `followDistance` |

Native `distanceZone` (`CLOSE` / `MEDIUM` / `FAR`) uses fixed width thresholds in
Kotlin (`>0.28` / `≥0.14`) and remains raw telemetry alongside the soft meter estimate.

**Deadband** (horizontal):

```
deadband = 0.05 + (1 - trackingSensitivity) * 0.20
```

Settings `trackingSensitivity` ∈ `[0.1, 1.0]` → deadband ∈ ~`[0.05, 0.23]`.
