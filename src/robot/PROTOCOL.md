# ABIOGENESIS Motor Serial Protocol

Baud: **115200**. Line-terminated commands (`\n`). Arduino ACKs with `ACK:<command>`.

Safety: if no command arrives for **3 seconds**, motors stop (firmware watchdog).
The app sends a **1-second heartbeat** while moving to keep the watchdog happy.

---

## Protocol v1 (default)

| Command | Meaning |
|---------|---------|
| `F` | Both motors forward |
| `B` | Both motors backward |
| `L` | Rotate left |
| `R` | Rotate right |
| `S` | Stop / release |
| `V:XXX` | Set shared PWM speed `0–255` |

Used by Manual Drive, Web pilot, and (later) Follow when differential drive is off.

---

## Protocol v2 — differential PWM

| Command | Meaning |
|---------|---------|
| `M:<left>,<right>` | Per-motor PWM `0–255`, run directions same as forward |

Example: `M:180,120` — left faster than right (gentle curve while moving forward).

**App gate:** Settings → Robot → `useDifferentialDrive` (default **false**).
When the flag is off, `RobotController` never emits `M:` even if a claimant requests diff.

**Sign / direction convention (Page 1):** both sides use the same run directions as discrete `F` (`moveForward`). Asymmetric PWM steers by speed difference only. Reverse-per-side rotation via signed PWM is deferred to Follow polish.

---

## Ownership

Only `RobotController` writes production motor bytes (`F/B/L/R/S`, `V:`, `M:`).

`SerialTestScreen` may still call `UsbSerialService.write` for diagnostics.
