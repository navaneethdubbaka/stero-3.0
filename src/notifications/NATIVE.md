# Native notification extras (Page 13)

`NotificationListenerService` reads `StatusBarNotification` and broadcasts a fixed field set. JS must not assume other extras exist.

## Posted (`onNotificationReceived`)

| Field | Source | Notes |
|-------|--------|-------|
| `packageName` | `sbn.packageName` | e.g. `com.whatsapp` |
| `title` | extras `android.title` | sender / app title |
| `text` | extras `android.text` or `android.bigText` | preview body |
| `category` | `Notification.category` | e.g. `call`, `msg`, `email` |
| `isOngoing` | `sbn.isOngoing` | true for in-call / ongoing |
| `key` | `sbn.key` | unique; used to match removals |

## Removed (`onNotificationRemoved`)

| Field | Source |
|-------|--------|
| `packageName` | `sbn.packageName` |
| `key` | `sbn.key` |
| `category` | `Notification.category` |

Bodies are for on-device overlay / optional TTS only. They are **not** sent to the LLM unless Settings `summarizeAlerts` is on (Page 13 does not upload even then — stub only).
