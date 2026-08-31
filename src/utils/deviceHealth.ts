import { NativeModules, NativeEventEmitter, Platform } from 'react-native';
import { create } from 'zustand';
import { isLowBattery, LOW_BATTERY_PERCENT } from './battery';
import { isThermalSevere } from './thermal';
import { logInfo } from './logger';

const DeviceHealth = NativeModules.DeviceHealth;

export type DeviceHealthSnapshot = {
  batteryPercent: number;
  thermalStatus: number;
  lowBattery: boolean;
  thermalSevere: boolean;
};

type HealthState = DeviceHealthSnapshot & {
  apply: (batteryPercent: number, thermalStatus: number) => void;
};

export const useDeviceHealthStore = create<HealthState>((set) => ({
  batteryPercent: -1,
  thermalStatus: 0,
  lowBattery: false,
  thermalSevere: false,
  apply: (batteryPercent, thermalStatus) =>
    set({
      batteryPercent,
      thermalStatus,
      lowBattery: isLowBattery(batteryPercent),
      thermalSevere: isThermalSevere(thermalStatus),
    }),
}));

let started = false;
let emitter: NativeEventEmitter | null = null;
let sub: { remove: () => void } | null = null;

function applyRaw(batteryPercent: number, thermalStatus: number): void {
  const prev = useDeviceHealthStore.getState();
  useDeviceHealthStore.getState().apply(batteryPercent, thermalStatus);
  const next = useDeviceHealthStore.getState();
  if (next.lowBattery && !prev.lowBattery) {
    logInfo(`battery ${batteryPercent}% ≤ ${LOW_BATTERY_PERCENT}% — Follow blocked`);
  }
  if (next.thermalSevere && !prev.thermalSevere) {
    logInfo(`thermal status ${thermalStatus} ≥ severe`);
  }
}

export function getDeviceHealth(): DeviceHealthSnapshot {
  const s = useDeviceHealthStore.getState();
  return {
    batteryPercent: s.batteryPercent,
    thermalStatus: s.thermalStatus,
    lowBattery: s.lowBattery,
    thermalSevere: s.thermalSevere,
  };
}

export async function refreshDeviceHealth(): Promise<DeviceHealthSnapshot> {
  if (Platform.OS !== 'android' || !DeviceHealth) {
    return getDeviceHealth();
  }
  try {
    const h = await DeviceHealth.getHealth();
    applyRaw(h.batteryPercent ?? -1, h.thermalStatus ?? 0);
  } catch {
    // native missing in tests
  }
  return getDeviceHealth();
}

export function startDeviceHealth(): void {
  if (started || Platform.OS !== 'android' || !DeviceHealth) {
    void refreshDeviceHealth();
    return;
  }
  started = true;
  emitter = new NativeEventEmitter(DeviceHealth);
  sub = emitter.addListener('onHealthChanged', (event: { batteryPercent?: number; thermalStatus?: number }) => {
    applyRaw(event.batteryPercent ?? -1, event.thermalStatus ?? 0);
  });
  void refreshDeviceHealth();
}

export function stopDeviceHealth(): void {
  sub?.remove();
  sub = null;
  started = false;
}

export function setFaceBrightness(value: number): void {
  if (Platform.OS !== 'android' || !DeviceHealth) return;
  try {
    DeviceHealth.setFaceBrightness(value);
  } catch {
    // ignore
  }
}

export function restoreFaceBrightness(): void {
  setFaceBrightness(-1);
}

export async function shareDiagnosticsZip(jsonMeta: string): Promise<boolean> {
  if (Platform.OS !== 'android' || !DeviceHealth) {
    return false;
  }
  try {
    await DeviceHealth.shareDiagnosticsZip(jsonMeta);
    return true;
  } catch (e) {
    console.warn('[DeviceHealth] shareDiagnosticsZip failed', e);
    return false;
  }
}
