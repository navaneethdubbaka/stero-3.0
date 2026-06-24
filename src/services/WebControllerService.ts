import { NativeModules, Platform, DeviceEventEmitter } from 'react-native';
import { useRobotStore, MovementDirection } from '../store/useRobotStore';

const WebController = NativeModules.WebController;

export class WebControllerService {
  private static isRunningState = false;
  private static serverUrl: string | null = null;
  private static eventListener: any = null;

  static async isRunning(): Promise<boolean> {
    if (Platform.OS !== 'android' || !WebController) return false;
    try {
      return await WebController.isRunning();
    } catch {
      return false;
    }
  }

  static async getIpAddress(): Promise<string> {
    if (Platform.OS !== 'android' || !WebController) return '127.0.0.1';
    try {
      return await WebController.getIpAddress();
    } catch {
      return '127.0.0.1';
    }
  }

  static async startServer(port: number = 8080): Promise<string | null> {
    if (Platform.OS !== 'android' || !WebController) return null;
    try {
      const url = await WebController.startServer(port);
      this.isRunningState = true;
      this.serverUrl = url;
      this.setupEventListener();
      
      // Initial sync of robot state to web controller
      this.syncState();

      console.log(`[WebControllerService] Web server running at ${url}`);
      return url;
    } catch (e) {
      console.error('[WebControllerService] Failed to start server:', e);
      return null;
    }
  }

  static async stopServer(): Promise<void> {
    if (Platform.OS !== 'android' || !WebController) return;
    try {
      await WebController.stopServer();
      this.isRunningState = false;
      this.serverUrl = null;
      this.removeEventListener();
      console.log('[WebControllerService] Web server stopped');
    } catch (e) {
      console.error('[WebControllerService] Failed to stop server:', e);
    }
  }

  static getServerUrl(): string | null {
    return this.serverUrl;
  }

  // Sync state from Zustand to the WebController module so GET /api/status returns accurate values
  static syncState() {
    if (Platform.OS !== 'android' || !WebController || !this.isRunningState) return;
    
    const store = useRobotStore.getState();
    WebController.syncRobotState(
      store.currentDirection,
      store.motorSpeed,
      store.isConnected
    ).catch((err: any) => console.warn('Failed to sync state to web server:', err));
  }

  private static setupEventListener() {
    this.removeEventListener();

    // Listen for incoming commands from Web Controller clients
    this.eventListener = DeviceEventEmitter.addListener('onWebServerCommand', (event) => {
      const { command, speed } = event;
      console.log(`[WebControllerService] Web client command: ${command}, speed: ${speed}`);

      const store = useRobotStore.getState();

      if (speed !== undefined && speed !== store.motorSpeed) {
        store.setMotorSpeed(speed);
      }

      if (command && command !== store.currentDirection) {
        store.setDirection(command as MovementDirection);
      }

      // Sync state back to confirm
      this.syncState();
    });
  }

  private static removeEventListener() {
    if (this.eventListener) {
      this.eventListener.remove();
      this.eventListener = null;
    }
  }
}

// Subscribe to Zustand store changes to automatically sync state to Web Controller
useRobotStore.subscribe((state) => {
  if (Platform.OS === 'android' && WebController && (WebControllerService as any).isRunningState) {
    WebController.syncRobotState(
      state.currentDirection,
      state.motorSpeed,
      state.isConnected
    ).catch(() => {});
  }
});
