import {
  computeDeadband,
  computeSteerZone,
  estimateDistanceM,
  computeDistanceIntent,
  computeConfidence,
} from '../src/vision/trackingMath';
import type { Landmark } from '../src/vision/VisionCameraView';

describe('trackingMath', () => {
  describe('computeDeadband', () => {
    it('maps sensitivity 1.0 → 0.05', () => {
      expect(computeDeadband(1.0)).toBeCloseTo(0.05, 5);
    });

    it('maps sensitivity 0.5 → 0.15', () => {
      expect(computeDeadband(0.5)).toBeCloseTo(0.15, 5);
    });

    it('maps sensitivity 0.1 → 0.23', () => {
      expect(computeDeadband(0.1)).toBeCloseTo(0.23, 5);
    });

    it('clamps sensitivity above 1 and below 0.1', () => {
      expect(computeDeadband(2)).toBeCloseTo(0.05, 5);
      expect(computeDeadband(0)).toBeCloseTo(0.23, 5);
    });
  });

  describe('computeSteerZone', () => {
    const deadband = 0.15;

    it('returns CENTER inside deadband', () => {
      expect(computeSteerZone(0, deadband)).toBe('CENTER');
      expect(computeSteerZone(0.15, deadband)).toBe('CENTER');
      expect(computeSteerZone(-0.15, deadband)).toBe('CENTER');
    });

    it('returns LEFT when offset left of deadband', () => {
      expect(computeSteerZone(-0.16, deadband)).toBe('LEFT');
    });

    it('returns RIGHT when offset right of deadband', () => {
      expect(computeSteerZone(0.16, deadband)).toBe('RIGHT');
    });
  });

  describe('estimateDistanceM', () => {
    it('estimates farther for smaller shoulder width', () => {
      const far = estimateDistanceM(0.08);
      const near = estimateDistanceM(0.3);
      expect(far).toBeGreaterThan(near);
    });

    it('clamps to [0.4, 5.0]', () => {
      expect(estimateDistanceM(0.001)).toBe(5.0);
      expect(estimateDistanceM(2)).toBe(0.4);
    });
  });

  describe('computeDistanceIntent', () => {
    it('APPROACH when farther than followDistance + 0.25', () => {
      expect(computeDistanceIntent(2.0, 1.0)).toBe('APPROACH');
    });

    it('TOO_CLOSE when closer than followDistance - 0.25', () => {
      expect(computeDistanceIntent(0.5, 1.0)).toBe('TOO_CLOSE');
    });

    it('HOLD within tolerance band', () => {
      expect(computeDistanceIntent(1.0, 1.0)).toBe('HOLD');
      expect(computeDistanceIntent(1.2, 1.0)).toBe('HOLD');
      expect(computeDistanceIntent(0.8, 1.0)).toBe('HOLD');
    });
  });

  describe('computeConfidence', () => {
    it('returns 0 for empty landmarks', () => {
      expect(computeConfidence([])).toBe(0);
    });

    it('averages shoulder presence/visibility', () => {
      const landmarks: Landmark[] = Array.from({ length: 13 }, () => ({
        x: 0,
        y: 0,
        z: 0,
        presence: 0,
        visibility: 0,
      }));
      landmarks[11] = { x: 0.3, y: 0.4, z: 0, presence: 1, visibility: 0.8 };
      landmarks[12] = { x: 0.6, y: 0.4, z: 0, presence: 1, visibility: 1 };
      // (0.9 + 1.0) / 2 = 0.95
      expect(computeConfidence(landmarks)).toBeCloseTo(0.95, 5);
    });
  });
});
