/**
 * USB reconnect backoff (pure helpers — no timers).
 * Delay sequence: 1s → 2s → 4s … capped at 30s.
 */
export const USB_BACKOFF_INITIAL_MS = 1000;
export const USB_BACKOFF_MAX_MS = 30_000;
export const USB_FAILURES_BEFORE_ERROR = 4;

export function nextUsbBackoffMs(attempt: number): number {
  const n = Math.max(0, Math.floor(attempt));
  const ms = USB_BACKOFF_INITIAL_MS * Math.pow(2, n);
  return Math.min(USB_BACKOFF_MAX_MS, ms);
}

/** No devices → do not schedule a tight poll; wait for attach / resume. */
export function shouldPollForDevices(deviceCount: number): boolean {
  return deviceCount > 0;
}
