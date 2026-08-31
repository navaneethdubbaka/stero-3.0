import { nextUsbBackoffMs, shouldPollForDevices, USB_BACKOFF_MAX_MS } from '../src/services/usbBackoff';

describe('usbBackoff', () => {
  it('starts at 1s and doubles', () => {
    expect(nextUsbBackoffMs(0)).toBe(1000);
    expect(nextUsbBackoffMs(1)).toBe(2000);
    expect(nextUsbBackoffMs(2)).toBe(4000);
  });

  it('caps at 30s', () => {
    expect(nextUsbBackoffMs(20)).toBe(USB_BACKOFF_MAX_MS);
  });

  it('does not poll when no devices', () => {
    expect(shouldPollForDevices(0)).toBe(false);
    expect(shouldPollForDevices(1)).toBe(true);
  });
});
