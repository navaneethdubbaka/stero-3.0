import {
  CLAIMANT_PRIORITY,
  DriveCommand,
  MotorClaimant,
  STOP_COMMAND,
} from './types';

export type ArbiterListener = () => void;

/**
 * Priority stack for motor ownership.
 * Claimants hold a command; the highest-priority active claimant wins.
 * EMERGENCY can only be cleared via clearEmergency().
 */
export class MotorArbiter {
  private claims = new Map<MotorClaimant, DriveCommand>();
  private listeners = new Set<ArbiterListener>();

  claim(claimant: MotorClaimant, command: DriveCommand): void {
    if (claimant === 'EMERGENCY') {
      this.claims.set('EMERGENCY', STOP_COMMAND);
    } else {
      // While emergency is latched, still record the claim so it can
      // resume after clearEmergency — but winner stays EMERGENCY.
      this.claims.set(claimant, command);
    }
    this.notify();
  }

  release(claimant: MotorClaimant): void {
    if (claimant === 'EMERGENCY') {
      // Must use clearEmergency() — ignore accidental release.
      return;
    }
    if (!this.claims.has(claimant)) {
      return;
    }
    this.claims.delete(claimant);
    this.notify();
  }

  /** Only valid exit from EMERGENCY latch. */
  clearEmergency(): void {
    if (!this.claims.has('EMERGENCY')) {
      return;
    }
    this.claims.delete('EMERGENCY');
    this.notify();
  }

  isEmergencyActive(): boolean {
    return this.claims.has('EMERGENCY');
  }

  getActiveClaimant(): MotorClaimant | null {
    let best: MotorClaimant | null = null;
    let bestPriority = -1;

    for (const claimant of this.claims.keys()) {
      const priority = CLAIMANT_PRIORITY[claimant];
      if (priority > bestPriority) {
        bestPriority = priority;
        best = claimant;
      }
    }

    return best;
  }

  getWinningCommand(): DriveCommand {
    const winner = this.getActiveClaimant();
    if (!winner) {
      return STOP_COMMAND;
    }
    return this.claims.get(winner) ?? STOP_COMMAND;
  }

  /** Test / debug helper — wipe all claims including emergency. */
  reset(): void {
    this.claims.clear();
    this.notify();
  }

  subscribe(listener: ArbiterListener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notify(): void {
    for (const listener of this.listeners) {
      listener();
    }
  }
}

/** Shared arbiter used by RobotController and UI claimants. */
export const motorArbiter = new MotorArbiter();
