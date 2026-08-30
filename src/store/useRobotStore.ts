import { create } from 'zustand';
import { RobotController } from '../robot/RobotController';
import type { MotorClaimant, MovementDirection } from '../robot/types';

export type { MovementDirection } from '../robot/types';

interface RobotState {
  isConnected: boolean;
  motorSpeed: number;
  currentDirection: MovementDirection;
  activeClaimant: MotorClaimant | null;
  emergencyActive: boolean;
  setConnected: (connected: boolean) => void;
  mirrorMotorState: (partial: {
    motorSpeed?: number;
    currentDirection?: MovementDirection;
    activeClaimant?: MotorClaimant | null;
    emergencyActive?: boolean;
  }) => void;
  /** MANUAL claimant — use from ManualControlScreen */
  requestManualDrive: (direction: MovementDirection) => void;
  /** WEB claimant — use from WebControllerService */
  requestWebDrive: (direction: MovementDirection) => void;
  setMotorSpeed: (speed: number) => void;
  emergencyStop: () => void;
  clearEmergency: () => void;
  /** @deprecated Prefer requestManualDrive / requestWebDrive — kept for thin compatibility */
  setDirection: (direction: MovementDirection) => void;
}

export const useRobotStore = create<RobotState>((set) => ({
  isConnected: false,
  motorSpeed: 150,
  currentDirection: 'S',
  activeClaimant: null,
  emergencyActive: false,

  setConnected: (connected) => set({ isConnected: connected }),

  mirrorMotorState: (partial) => set((state) => ({ ...state, ...partial })),

  requestManualDrive: (direction) => {
    RobotController.requestManualDrive(direction);
  },

  requestWebDrive: (direction) => {
    RobotController.requestWebDrive(direction);
  },

  setMotorSpeed: (speed) => {
    RobotController.setSpeed(speed);
  },

  emergencyStop: () => {
    RobotController.emergencyStop();
  },

  clearEmergency: () => {
    RobotController.clearEmergency();
  },

  // Compatibility: treat anonymous setDirection as MANUAL
  setDirection: (direction) => {
    RobotController.requestManualDrive(direction);
  },
}));

// Wire controller ↔ store mirror once at module load
RobotController.attachStore({
  setConnected: (connected) => useRobotStore.getState().setConnected(connected),
  mirrorMotorState: (partial) => useRobotStore.getState().mirrorMotorState(partial),
});
RobotController.start();
