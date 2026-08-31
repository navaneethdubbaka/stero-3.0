import { AppState, NativeEventEmitter, NativeModules, Platform } from 'react-native';
import { UsbSerialService } from './UsbSerialService';
import { useRobotStore } from '../store/useRobotStore';
import { RobotController } from '../robot/RobotController';
import { logInfo, logWarn } from '../utils/logger';
import {
  nextUsbBackoffMs,
  shouldPollForDevices,
  USB_FAILURES_BEFORE_ERROR,
} from './usbBackoff';

/**
 * Supervises USB serial reconnect with exponential backoff.
 * Does not spin when the cable is unplugged (listDevices empty).
 */
class UsbReconnectImpl {
  private started = false;
  private connecting = false;
  private timer: ReturnType<typeof setTimeout> | null = null;
  private attempt = 0;
  private consecutiveFailures = 0;
  private ownedError = false;
  private unsubStore: (() => void) | null = null;
  private unsubApp: (() => void) | null = null;
  private usbSub: { remove: () => void } | null = null;

  start(): void {
    if (this.started) {
      this.kick();
      return;
    }
    this.started = true;
    logInfo('UsbReconnect started');

    UsbSerialService.onConnectionLost = () => {
      RobotController.handleUsbLost();
      this.schedule();
    };

    let prev = useRobotStore.getState().isConnected;
    this.unsubStore = useRobotStore.subscribe((state) => {
      if (prev && !state.isConnected) {
        RobotController.handleUsbLost();
        this.schedule();
      }
      if (!prev && state.isConnected) {
        this.onConnected();
      }
      prev = state.isConnected;
    });

    const appSub = AppState.addEventListener('change', (next) => {
      if (next === 'active' && !useRobotStore.getState().isConnected) {
        this.kick();
      }
    });
    this.unsubApp = () => {
      appSub.remove();
    };

    if (Platform.OS === 'android' && NativeModules.UsbSerial) {
      const emitter = new NativeEventEmitter(NativeModules.UsbSerial);
      this.usbSub = emitter.addListener(
        'onUsbDeviceChanged',
        (event: { attached?: boolean }) => {
          if (event.attached) {
            this.attempt = 0;
            this.kick();
          } else {
            RobotController.handleUsbLost();
            void RobotController.disconnect();
          }
        }
      );
    }

    this.kick();
  }

  stop(): void {
    this.started = false;
    this.clearTimer();
    this.unsubStore?.();
    this.unsubStore = null;
    this.unsubApp?.();
    this.unsubApp = null;
    this.usbSub?.remove();
    this.usbSub = null;
    UsbSerialService.onConnectionLost = null;
  }

  /** Immediate probe (Home retry, USB attach). */
  kick(): void {
    this.clearTimer();
    void this.tryConnect();
  }

  private schedule(): void {
    if (!this.started) return;
    if (useRobotStore.getState().isConnected) return;
    this.clearTimer();
    const delay = nextUsbBackoffMs(this.attempt);
    this.attempt += 1;
    this.timer = setTimeout(() => {
      void this.tryConnect();
    }, delay);
  }

  private clearTimer(): void {
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
  }

  private onConnected(): void {
    this.attempt = 0;
    this.consecutiveFailures = 0;
    this.clearTimer();
    if (this.ownedError) {
      this.ownedError = false;
      try {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const { CompanionStateMachine } = require('../robot/CompanionStateMachine');
        CompanionStateMachine.dispatch('CLEAR_ERROR');
      } catch {
        // ignore
      }
    }
  }

  private async tryConnect(): Promise<void> {
    if (!this.started || this.connecting) return;
    if (useRobotStore.getState().isConnected) return;

    this.connecting = true;
    try {
      const devices = await UsbSerialService.listDevices();
      if (!shouldPollForDevices(devices.length)) {
        this.consecutiveFailures = 0;
        this.clearTimer();
        logInfo('UsbReconnect: no USB devices — waiting for attach');
        return;
      }

      const ok = await RobotController.connect();
      if (ok) {
        logInfo('UsbReconnect: connected');
        this.onConnected();
        return;
      }

      this.consecutiveFailures += 1;
      logWarn(
        `UsbReconnect: connect failed (${this.consecutiveFailures}/${USB_FAILURES_BEFORE_ERROR})`
      );
      if (this.consecutiveFailures >= USB_FAILURES_BEFORE_ERROR) {
        this.dispatchUsbError();
      }
      this.schedule();
    } finally {
      this.connecting = false;
    }
  }

  private dispatchUsbError(): void {
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const { CompanionStateMachine } = require('../robot/CompanionStateMachine');
      if (CompanionStateMachine.getState() !== 'ERROR') {
        const result = CompanionStateMachine.dispatch('ERROR');
        if (result.ok) {
          this.ownedError = true;
        }
      } else {
        this.ownedError = true;
      }
    } catch (e) {
      console.warn('[UsbReconnect] ERROR dispatch failed', e);
    }
  }
}

export const UsbReconnect = new UsbReconnectImpl();
