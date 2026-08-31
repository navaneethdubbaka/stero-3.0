# ABIOGENESIS Motor Serial Protocol

Baud: **115200**. Line-terminated commands (`\n`). Arduino ACKs with `ACK:<command>` (v1) or `ACK:M` / `NAK:M` (v2.1).

Safety: if no command arrives for **3 seconds**, motors stop (firmware watchdog).
The app sends a **1-second heartbeat** while moving to keep the watchdog happy.

---

## Protocol v1 (always available)

| Command | Meaning |
|---------|---------|
| `F` | Both motors forward |
| `B` | Both motors backward |
| `L` | Rotate left |
| `R` | Rotate right |
| `S` | Stop / release |
| `V:XXX` | Set shared PWM speed `0–255` |

Used by Manual Drive, Web pilot, and Follow when differential drive is off (or after auto-fallback).

---

## Protocol v2.1 — signed differential PWM

| Command | Meaning |
|---------|---------|
| `M:<left>,<right>` | Per-motor signed PWM **`-255..255`** |

| Sign | Run direction (this L293D shield) |
|------|-----------------------------------|
| Positive | Same as discrete `F` (`BACKWARD`) |
| Negative | Reverse that side (`FORWARD`) |
| `0,0` | Full stop / RELEASE |

Examples:

- `M:180,120` — both forward; left faster → gentle curve (person on the right)
- `M:120,180` — both forward; right faster → curve toward person on the left
- `M:-140,140` — spin in place left (opposite signs)
- `M:140,-140` — spin in place right

**ACK:** success → `ACK:M` (stable token, not the payload). Parse failure → `NAK:M`.

**App gate:** Settings → Robot → `useDifferentialDrive` (default **true** after Page 11).
When the flag is off, `RobotController` never emits `M:` even if a claimant requests diff.

**Fallback:** if Follow’s first `M:` receives `NAK:M` (or no `ACK:M`), the app disables differential for the session, logs a one-shot Settings → LOGS warning, and Follow continues on v1 discrete commands.

---

## Ownership

Only `RobotController` writes production motor bytes (`F/B/L/R/S`, `V:`, `M:`).

`SerialTestScreen` may still call `UsbSerialService.write` for diagnostics (`M:180,120`, `M:-120,120`).
