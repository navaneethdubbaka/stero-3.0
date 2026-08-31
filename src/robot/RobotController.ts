import { UsbSerialService } from '../services/UsbSerialService';
import { motorArbiter } from './MotorArbiter';
import { pushRobotWarning } from './RobotLog';
import {
  DriveCommand,
  MotorClaimant,
  MovementDirection,
  RobotControllerStatus,
  STOP_COMMAND,
} from './types';

type StoreMirror = {
  setConnected: (connected: boolean) => void;
  mirrorMotorState: (partial: {
    motorSpeed?: number;
    currentDirection?: MovementDirection;
    activeClaimant?: MotorClaimant | null;
    emergencyActive?: boolean;
  }) => void;
};

function clampSignedPwm(value: number): number {
  return Math.max(-255, Math.min(255, Math.round(value)));
}

/**
 * Sole production writer of motor serial commands.
 * Subscribes to MotorArbiter and applies the winning DriveCommand.
 */
class RobotControllerImpl {
  private heartbeatInterval: ReturnType<typeof setInterval> | null = null;
  private motorSpeed = 150;
  private currentDirection: MovementDirection = 'S';
  private lastWrite: string | null = null;
  private useDifferentialDrive = true;
  private started = false;
  private unsubscribe: (() => void) | null = null;
  private store: StoreMirror | null = null;
  /** After NAK / missing ACK, stay on v1 for this process. */
  private differentialFallbackLatched = false;
  private differentialProbePending = false;
  private differentialFallbackWarned = false;

  /** Wire Zustand mirror once (avoids circular import issues at call time). */
  attachStore(store: StoreMirror): void {
    this.store = store;
  }

  start(): void {
    if (this.started) {
      return;
    }
    this.started = true;
    this.unsubscribe = motorArbiter.subscribe(() => {
      this.applyWinningCommand();
    });
  }

  async connect(): Promise<boolean> {
    this.start();
    const ok = await UsbSerialService.autoConnect();
    this.store?.setConnected(ok);
    if (ok) {
      // Push current speed after bootloader wait completes inside autoConnect
      await this.writeRaw(`V:${this.motorSpeed}\n`);
    }
    return ok;
  }

  async disconnect(): Promise<void> {
    this.clearHeartbeat();
    await UsbSerialService.disconnect();
    this.store?.setConnected(false);
  }

  /**
   * USB dropped mid-drive: stop heartbeat so reconnect cannot duplicate intervals.
   * Does not open/close the port (already gone).
   */
  handleUsbLost(): void {
    this.start();
    this.clearHeartbeat();
    this.currentDirection = 'S';
    this.mirrorUi();
  }

  setUseDifferentialDrive(enabled: boolean): void {
    this.useDifferentialDrive = enabled;
    if (enabled) {
      // Allow retry after user re-enables in Settings
      this.differentialFallbackLatched = false;
      this.differentialFallbackWarned = false;
    }
  }

  getUseDifferentialDrive(): boolean {
    return this.useDifferentialDrive && !this.differentialFallbackLatched;
  }

  isDifferentialFallbackActive(): boolean {
    return this.differentialFallbackLatched;
  }

  setSpeed(speed: number): void {
    this.start();
    const validSpeed = Math.max(0, Math.min(255, Math.round(speed)));
    this.motorSpeed = validSpeed;
    this.store?.mirrorMotorState({ motorSpeed: validSpeed });
    void this.writeRaw(`V:${validSpeed}\n`);
  }

  getSpeed(): number {
    return this.motorSpeed;
  }

  /**
   * Claim MANUAL with a discrete direction.
   * Passing 'S' releases the MANUAL claim.
   */
  requestManualDrive(direction: MovementDirection): void {
    this.start();
    if (direction === 'S') {
      motorArbiter.release('MANUAL');
      // If nothing else claims, applyWinningCommand yields STOP
      this.applyWinningCommand();
      return;
    }
    motorArbiter.claim('MANUAL', { kind: 'discrete', direction });
  }

  /** Claim or release WEB based on direction. */
  requestWebDrive(direction: MovementDirection): void {
    this.start();
    if (direction === 'S') {
      motorArbiter.release('WEB');
      this.applyWinningCommand();
      return;
    }
    motorArbiter.claim('WEB', { kind: 'discrete', direction });
  }

  /** Claim or release FOLLOW based on direction (Protocol v1). */
  requestFollowDrive(direction: MovementDirection): void {
    this.start();
    if (direction === 'S') {
      motorArbiter.release('FOLLOW');
      this.applyWinningCommand();
      return;
    }
    motorArbiter.claim('FOLLOW', { kind: 'discrete', direction });
  }

  /**
   * Claim FOLLOW with Protocol v2.1 signed PWM.
   * Zero/zero releases the claim (same as discrete S).
   */
  requestFollowDiff(left: number, right: number): void {
    this.start();
    const l = clampSignedPwm(left);
    const r = clampSignedPwm(right);
    if (l === 0 && r === 0) {
      motorArbiter.release('FOLLOW');
      this.applyWinningCommand();
      return;
    }
    if (!this.getUseDifferentialDrive()) {
      // Flag off / fallback — map coarse intent to discrete
      this.requestFollowDrive(this.diffToDiscrete(l, r));
      return;
    }
    motorArbiter.claim('FOLLOW', { kind: 'diff', left: l, right: r });
  }

  /** Generic claim for FOLLOW / DANCE modules. */
  claim(claimant: MotorClaimant, command: DriveCommand): void {
    this.start();
    motorArbiter.claim(claimant, command);
  }

  release(claimant: MotorClaimant): void {
    this.start();
    motorArbiter.release(claimant);
    this.applyWinningCommand();
  }

  emergencyStop(): void {
    this.start();
    motorArbiter.claim('EMERGENCY', STOP_COMMAND);
    // Immediate hard stop even before notify cycle
    this.clearHeartbeat();
    void this.writeRaw('S\n');
    this.currentDirection = 'S';
    this.mirrorUi();
  }

  clearEmergency(): void {
    this.start();
    motorArbiter.clearEmergency();
    this.applyWinningCommand();
  }

  stop(): void {
    this.start();
    this.clearHeartbeat();
    void this.writeRaw('S\n');
    this.currentDirection = 'S';
    this.mirrorUi();
  }

  getStatus(): RobotControllerStatus {
    return {
      isConnected: UsbSerialService.getStatus().isConnected,
      motorSpeed: this.motorSpeed,
      currentDirection: this.currentDirection,
      activeClaimant: motorArbiter.getActiveClaimant(),
      emergencyActive: motorArbiter.isEmergencyActive(),
      lastWrite: this.lastWrite,
      useDifferentialDrive: this.getUseDifferentialDrive(),
    };
  }

  private diffToDiscrete(left: number, right: number): MovementDirection {
    if (left === 0 && right === 0) return 'S';
    if (left < 0 && right > 0) return 'L';
    if (left > 0 && right < 0) return 'R';
    if (left > 0 || right > 0) return 'F';
    return 'B';
  }

  private applyWinningCommand(): void {
    const command = motorArbiter.getWinningCommand();
    this.mirrorUi();

    if (command.kind === 'discrete') {
      this.applyDiscrete(command.direction);
      return;
    }

    // Diff drive
    if (!this.getUseDifferentialDrive()) {
      this.applyDiscrete(this.diffToDiscrete(command.left, command.right));
      return;
    }

    const left = clampSignedPwm(command.left);
    const right = clampSignedPwm(command.right);
    const payload = `M:${left},${right}\n`;

    if (left === 0 && right === 0) {
      this.clearHeartbeat();
      void this.writeRaw('S\n');
      this.currentDirection = 'S';
      this.mirrorUi();
      return;
    }

    void this.writeDiffAndMaybeProbe(payload, left, right);
    this.currentDirection = this.diffToDiscrete(left, right);
    this.startHeartbeat(payload);
    this.mirrorUi();
  }

  private async writeDiffAndMaybeProbe(
    payload: string,
    left: number,
    right: number
  ): Promise<void> {
    const ok = await this.writeRaw(payload);
    if (!ok) {
      return;
    }
    if (this.differentialProbePending || this.differentialFallbackLatched) {
      return;
    }
    this.differentialProbePending = true;
    try {
      await new Promise<void>((r) => setTimeout(r, 180));
      const response = await UsbSerialService.read();
      const text = (response || '').trim();
      if (text.includes('NAK:M') || !text.includes('ACK:M')) {
        this.latchDifferentialFallback(
          text.includes('NAK:M')
            ? 'Firmware NAK:M — differential disabled; Follow using F/L/R/S'
            : 'No ACK:M for M: command — differential disabled; Follow using F/L/R/S (flash companion_control.ino v2.1)'
        );
        // Re-apply as discrete so motors keep moving
        this.applyDiscrete(this.diffToDiscrete(left, right));
      }
    } catch (e) {
      console.warn('[RobotController] differential probe failed', e);
    } finally {
      this.differentialProbePending = false;
    }
  }

  private latchDifferentialFallback(message: string): void {
    this.differentialFallbackLatched = true;
    if (!this.differentialFallbackWarned) {
      this.differentialFallbackWarned = true;
      pushRobotWarning(message);
    }
  }

  private applyDiscrete(direction: MovementDirection): void {
    this.currentDirection = direction;
    void this.writeRaw(`${direction}\n`);

    if (direction === 'S') {
      this.clearHeartbeat();
    } else {
      this.startHeartbeat(`${direction}\n`);
    }
    this.mirrorUi();
  }

  private startHeartbeat(payload: string): void {
    this.clearHeartbeat();
    this.heartbeatInterval = setInterval(() => {
      void this.writeRaw(payload);
    }, 1000);
  }

  private clearHeartbeat(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  private async writeRaw(data: string): Promise<boolean> {
    this.lastWrite = data.trim();
    return UsbSerialService.write(data);
  }

  private mirrorUi(): void {
    this.store?.mirrorMotorState({
      motorSpeed: this.motorSpeed,
      currentDirection: this.currentDirection,
      activeClaimant: motorArbiter.getActiveClaimant(),
      emergencyActive: motorArbiter.isEmergencyActive(),
    });
  }
}

export const RobotController = new RobotControllerImpl();
