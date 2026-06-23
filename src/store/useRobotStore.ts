import { create } from 'zustand';

export type MovementDirection = 'F' | 'B' | 'L' | 'R' | 'S';

interface RobotState {
  isConnected: boolean;
  motorSpeed: number;
  currentDirection: MovementDirection;
  setConnected: (connected: boolean) => void;
  setMotorSpeed: (speed: number) => void;
  setDirection: (direction: MovementDirection) => void;
}

export const useRobotStore = create<RobotState>((set) => ({
  isConnected: false,
  motorSpeed: 150,
  currentDirection: 'S',

  setConnected: (connected) => set({ isConnected: connected }),
  setMotorSpeed: (speed) => set({ motorSpeed: Math.max(0, Math.min(255, speed)) }),
  setDirection: (direction) => set({ currentDirection: direction }),
}));
