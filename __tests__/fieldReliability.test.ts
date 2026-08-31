import { sanitizeLogMessage, logInfo, getLogRing, clearLogRing } from '../src/utils/logger';
import { isLowBattery, LOW_BATTERY_PERCENT } from '../src/utils/battery';
import { isThermalSevere, THERMAL_STATUS_SEVERE } from '../src/utils/thermal';

describe('logger', () => {
  beforeEach(() => {
    clearLogRing();
  });

  it('redacts API keys', () => {
    expect(sanitizeLogMessage('sk-abcdefghijklmnopqrstuvwxyz')).toContain('[redacted]');
    expect(sanitizeLogMessage('api_key=secret123')).toContain('[redacted]');
  });

  it('keeps a ring of entries', () => {
    logInfo('usb reconnect');
    expect(getLogRing()[0].message).toBe('usb reconnect');
  });
});

describe('battery / thermal gates', () => {
  it('low battery at 15%', () => {
    expect(isLowBattery(LOW_BATTERY_PERCENT)).toBe(true);
    expect(isLowBattery(14)).toBe(true);
    expect(isLowBattery(16)).toBe(false);
    expect(isLowBattery(-1)).toBe(false);
  });

  it('thermal severe at Android SEVERE+', () => {
    expect(isThermalSevere(THERMAL_STATUS_SEVERE)).toBe(true);
    expect(isThermalSevere(2)).toBe(false);
  });
});
