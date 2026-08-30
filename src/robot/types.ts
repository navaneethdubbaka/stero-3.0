/** Discrete Protocol v1 directions (Arduino F/B/L/R/S). */
export type MovementDirection = 'F' | 'B' | 'L' | 'R' | 'S';

/**
 * Who is requesting motor control.
 * Higher priority always wins when multiple claimants are active.
 */
export type MotorClaimant =
  | 'EMERGENCY'
  | 'MANUAL'
  | 'WEB'
  | 'FOLLOW'
  | 'DANCE'
  | 'IDLE';

/** Priority: EMERGENCY > MANUAL > WEB > FOLLOW > DANCE > IDLE */
export const CLAIMANT_PRIORITY: Record<MotorClaimant, number> = {
  EMERGENCY: 100,
  MANUAL: 80,
  WEB: 60,
  FOLLOW: 40,
  DANCE: 20,
  IDLE: 0,
};

export type DiscreteDriveCommand = {
  kind: 'discrete';
  direction: MovementDirection;
};

export type DiffDriveCommand = {
  kind: 'diff';
  /** Left motor PWM 0–255 */
  left: number;
  /** Right motor PWM 0–255 */
  right: number;
};

export type DriveCommand = DiscreteDriveCommand | DiffDriveCommand;

export const STOP_COMMAND: DiscreteDriveCommand = {
  kind: 'discrete',
  direction: 'S',
};

export type RobotControllerStatus = {
  isConnected: boolean;
  motorSpeed: number;
  currentDirection: MovementDirection;
  activeClaimant: MotorClaimant | null;
  emergencyActive: boolean;
  lastWrite: string | null;
  useDifferentialDrive: boolean;
};
