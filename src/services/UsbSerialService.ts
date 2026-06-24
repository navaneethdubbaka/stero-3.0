import { NativeModules, Platform } from 'react-native';
import { useRobotStore } from '../store/useRobotStore';

const UsbSerial = NativeModules.UsbSerial;

// Debug: Log whether the native module was found
if (Platform.OS === 'android') {
  if (UsbSerial) {
    console.log('[UsbSerialService] ✅ Native UsbSerial module FOUND');
  } else {
    console.error('[UsbSerialService] ❌ Native UsbSerial module is NULL/UNDEFINED — all writes will fail!');
    console.error('[UsbSerialService] Available NativeModules:', Object.keys(NativeModules));
  }
}

export type UsbSerialStatus = {
  nativeModuleAvailable: boolean;
  isConnected: boolean;
  lastError: string | null;
  lastAction: string;
};

export class UsbSerialService {
  private static isConnectedState = false;
  private static lastError: string | null = null;
  private static lastAction: string = 'idle';

  static getStatus(): UsbSerialStatus {
    return {
      nativeModuleAvailable: Platform.OS === 'android' && !!UsbSerial,
      isConnected: this.isConnectedState,
      lastError: this.lastError,
      lastAction: this.lastAction,
    };
  }

  static async listDevices() {
    if (Platform.OS !== 'android' || !UsbSerial) {
      this.lastAction = 'listDevices: skipped (not android or no native module)';
      return [];
    }
    try {
      this.lastAction = 'listDevices: calling native...';
      const devices = await UsbSerial.listDevices();
      this.lastAction = `listDevices: found ${devices.length} device(s)`;
      return devices;
    } catch (e: any) {
      this.lastError = `listDevices failed: ${e.message}`;
      this.lastAction = `listDevices: ERROR`;
      console.warn('Failed to list USB devices:', e);
      return [];
    }
  }

  static async connect(deviceId: number, baudRate: number = 115200): Promise<boolean> {
    if (Platform.OS !== 'android' || !UsbSerial) {
      // DO NOT silently succeed in mock mode — report failure
      this.lastError = 'Native UsbSerial module not available';
      this.lastAction = 'connect: FAILED (no native module)';
      this.isConnectedState = false;
      useRobotStore.getState().setConnected(false);
      return false;
    }
    try {
      this.lastAction = 'connect: requesting permission...';
      const hasPermission = await UsbSerial.requestPermission(deviceId);
      if (!hasPermission) {
        this.lastError = 'USB permission denied by user';
        this.lastAction = 'connect: permission DENIED';
        console.warn('USB permission denied by user');
        return false;
      }

      this.lastAction = `connect: opening port at ${baudRate} baud...`;
      const success = await UsbSerial.connect(deviceId, baudRate);
      if (success) {
        this.isConnectedState = true;
        this.lastError = null;
        this.lastAction = 'connect: SUCCESS — waiting for Arduino bootloader...';
        useRobotStore.getState().setConnected(true);

        // Wait for Arduino bootloader to finish (DTR toggle triggers reset)
        await new Promise<void>(resolve => setTimeout(resolve, 2500));
        this.lastAction = 'connect: READY — port open and Arduino initialized';
        return true;
      }
      this.lastError = 'connect() returned false';
      this.lastAction = 'connect: FAILED (returned false)';
      return false;
    } catch (e: any) {
      this.lastError = `connect failed: ${e.message || e}`;
      this.lastAction = `connect: ERROR — ${e.message || e}`;
      console.error('Failed to connect to USB device:', e);
      useRobotStore.getState().setConnected(false);
      return false;
    }
  }

  static async disconnect(): Promise<void> {
    this.isConnectedState = false;
    useRobotStore.getState().setConnected(false);
    this.lastAction = 'disconnect: disconnected';
    if (Platform.OS !== 'android' || !UsbSerial) {
      return;
    }
    try {
      await UsbSerial.disconnect();
    } catch (e) {
      console.warn('Error during disconnect:', e);
    }
  }

  static async write(data: string): Promise<boolean> {
    if (Platform.OS !== 'android' || !UsbSerial) {
      // Not on Android or native module missing — fail silently
      return false;
    }
    if (!this.isConnectedState) {
      // Not connected — don't even try
      return false;
    }
    try {
      await UsbSerial.write(data);
      return true;
    } catch (e: any) {
      console.error('Failed to write to USB Serial:', e);
      this.lastError = `write failed: ${e.message || e}`;
      this.lastAction = `write: ERROR — ${e.message || e}`;
      this.isConnectedState = false;
      useRobotStore.getState().setConnected(false);
      return false;
    }
  }

  static async autoConnect(): Promise<boolean> {
    console.log('[UsbSerialService] Running auto-connect probe...');
    this.lastAction = 'autoConnect: probing...';
    const devices = await this.listDevices();
    if (devices.length === 0) {
      console.log('[UsbSerialService] No USB devices detected.');
      this.lastError = 'No USB serial devices found';
      this.lastAction = 'autoConnect: no devices found';
      useRobotStore.getState().setConnected(false);
      return false;
    }

    // Known Arduino / USB-to-Serial Vendor IDs
    const ARDUINO_VENDORS = [
      9025, // 0x2341 (Arduino LLC)
      6790, // 0x1A86 (Qinheng/CH340)
      1027, // 0x0403 (FTDI)
      4292, // 0x10C4 (CP210x)
      1659, // 0x067B (Prolific PL2303)
    ];

    // Find the device matching one of the known Vendor IDs
    let targetDevice = devices.find((d: any) => ARDUINO_VENDORS.includes(d.vendorId));

    if (targetDevice) {
      console.log(`[UsbSerialService] Matched Arduino/Serial device: VID=${targetDevice.vendorId} PID=${targetDevice.productId}`);
      this.lastAction = `autoConnect: found Arduino (VID=${targetDevice.vendorId})`;
    } else {
      targetDevice = devices[0];
      console.log(`[UsbSerialService] No matching Arduino Vendor ID. Defaulting to first device: VID=${targetDevice.vendorId}`);
      this.lastAction = `autoConnect: using first device (VID=${targetDevice.vendorId})`;
    }

    const connected = await this.connect(targetDevice.deviceId, 115200);
    if (connected) {
      console.log('[UsbSerialService] Auto-connection successful!');
      return true;
    }
    return false;
  }
}
