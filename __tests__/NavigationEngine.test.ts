import { computeFollowCommand } from '../src/robot/NavigationEngine';
import type { TrackingSnapshot } from '../src/vision/types';

const base = (overrides: Partial<TrackingSnapshot> = {}): TrackingSnapshot => ({
  personFound: true,
  targetLocked: true,
  offset: 0,
  shoulderWidth: 0.2,
  distanceZone: 'MEDIUM',
  landmarks: [],
  confidence: 1,
  deadband: 0.15,
  steerZone: 'CENTER',
  estimatedDistanceM: 1.0,
  distanceIntent: 'HOLD',
  lostMs: 0,
  error: null,
  lastUpdatedAt: Date.now(),
  ...overrides,
});

describe('NavigationEngine.computeFollowCommand', () => {
  it('returns S when target not locked', () => {
    expect(
      computeFollowCommand(base({ targetLocked: false, personFound: false }))
    ).toBe('S');
  });

  it('returns L when steerZone LEFT', () => {
    expect(computeFollowCommand(base({ steerZone: 'LEFT', offset: -0.2 }))).toBe(
      'L'
    );
  });

  it('returns R when steerZone RIGHT', () => {
    expect(computeFollowCommand(base({ steerZone: 'RIGHT', offset: 0.2 }))).toBe(
      'R'
    );
  });

  it('returns F when CENTER + APPROACH', () => {
    expect(
      computeFollowCommand(
        base({
          steerZone: 'CENTER',
          distanceIntent: 'APPROACH',
          distanceZone: 'FAR',
          estimatedDistanceM: 2.5,
        })
      )
    ).toBe('F');
  });

  it('returns S when CENTER + HOLD', () => {
    expect(
      computeFollowCommand(
        base({
          steerZone: 'CENTER',
          distanceIntent: 'HOLD',
          distanceZone: 'MEDIUM',
        })
      )
    ).toBe('S');
  });

  it('returns S when CENTER + TOO_CLOSE', () => {
    expect(
      computeFollowCommand(
        base({
          steerZone: 'CENTER',
          distanceIntent: 'TOO_CLOSE',
          distanceZone: 'CLOSE',
        })
      )
    ).toBe('S');
  });

  it('returns S when CENTER + APPROACH but native CLOSE overrides', () => {
    expect(
      computeFollowCommand(
        base({
          steerZone: 'CENTER',
          distanceIntent: 'APPROACH',
          distanceZone: 'CLOSE',
        })
      )
    ).toBe('S');
  });
});
