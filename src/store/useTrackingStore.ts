import { create } from 'zustand';
import type {
  DistanceIntent,
  DistanceZone,
  Landmark,
  SteerZone,
  TrackingSnapshot,
} from '../vision/types';
import { DISTANCE_MAX_M } from '../vision/types';

export type TrackingState = TrackingSnapshot & {
  applySnapshot: (snapshot: TrackingSnapshot) => void;
  reset: () => void;
};

const initialSnapshot: TrackingSnapshot = {
  personFound: false,
  targetLocked: false,
  offset: 0,
  shoulderWidth: 0,
  distanceZone: 'FAR',
  landmarks: [],
  confidence: 0,
  deadband: 0.15,
  steerZone: 'CENTER',
  estimatedDistanceM: DISTANCE_MAX_M,
  distanceIntent: 'APPROACH',
  lostMs: 0,
  error: null,
  lastUpdatedAt: 0,
};

export const useTrackingStore = create<TrackingState>((set) => ({
  ...initialSnapshot,

  applySnapshot: (snapshot) => set({ ...snapshot }),

  reset: () => set({ ...initialSnapshot }),
}));

export type { DistanceIntent, DistanceZone, Landmark, SteerZone, TrackingSnapshot };
