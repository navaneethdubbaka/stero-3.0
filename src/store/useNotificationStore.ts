import { create } from 'zustand';

export interface AppNotification {
  id: string;
  source: 'WhatsApp' | 'Telegram' | 'SMS' | 'Call' | 'Email' | 'Calendar' | 'System';
  sender: string;
  message: string;
  timestamp: number;
}

interface NotificationState {
  notifications: AppNotification[];
  activeNotification: AppNotification | null;
  addNotification: (notification: Omit<AppNotification, 'id' | 'timestamp'>) => void;
  setActiveNotification: (notification: AppNotification | null) => void;
  clearNotifications: () => void;
}

export const useNotificationStore = create<NotificationState>((set) => ({
  notifications: [],
  activeNotification: null,

  addNotification: (notification) => {
    const newNotification: AppNotification = {
      ...notification,
      id: Math.random().toString(36).substring(7),
      timestamp: Date.now(),
    };
    set((state) => ({
      notifications: [newNotification, ...state.notifications].slice(0, 100), // Keep last 100
      activeNotification: newNotification, // Set newly received notification as active
    }));
  },

  setActiveNotification: (notification) => set({ activeNotification: notification }),
  clearNotifications: () => set({ notifications: [], activeNotification: null }),
}));
