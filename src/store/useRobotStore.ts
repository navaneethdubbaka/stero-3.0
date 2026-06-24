import { create } from 'zustand';
import { UsbSerialService } from '../services/UsbSerialService';

export type MovementDirection = 'F' | 'B' | 'L' | 'R' | 'S';

interface RobotState {
  isConnected: boolean;
  motorSpeed: number;
  currentDirection: MovementDirection;
  heartbeatInterval: any; // Reference to the periodic command interval
  setConnected: (connected: boolean) => void;
  setMotorSpeed: (speed: number) => void;
  setDirection: (direction: MovementDirection) => void;
}

export const useRobotStore = create<RobotState>((set, get) => ({
  isConnected: false,
  motorSpeed: 150,
  currentDirection: 'S',
  heartbeatInterval: null,

  setConnected: (connected) => set({ isConnected: connected }),
  setMotorSpeed: (speed) => {
    const validSpeed = Math.max(0, Math.min(255, speed));
    set({ motorSpeed: validSpeed });
    // Update the speed on the Arduino
    UsbSerialService.write(`V:${validSpeed}\n`);
  },
  setDirection: (direction) => {
    // Clear any existing heartbeat interval
    const existingInterval = get().heartbeatInterval;
    if (existingInterval) {
      clearInterval(existingInterval);
      set({ heartbeatInterval: null });
    }

    set({ currentDirection: direction });
    
    // Send the command immediately
    UsbSerialService.write(`${direction}\n`);

    // If we are moving (not stopping), establish a 1-second heartbeat to reset the Arduino's watchdog
    if (direction !== 'S') {
      const interval = setInterval(() => {
        UsbSerialService.write(`${direction}\n`);
      }, 1000);
      set({ heartbeatInterval: interval });
    }
  },
}));
