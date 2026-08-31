import {
  computeFollowCommand,
  computeFollowDiff,
  slewPwm,
} from '../src/robot/NavigationEngine';
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

const tunables = {
  followMinPwm: 80,
  followMaxPwm: 180,
  curveGain: 1.0,
  spinOffset: 0.45,
};

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

describe('NavigationEngine.computeFollowDiff', () => {
  it('returns zeros when target not locked', () => {
    expect(
      computeFollowDiff(
        base({ targetLocked: false, personFound: false }),
        tunables
      )
    ).toEqual({ left: 0, right: 0, mode: 'stop' });
  });

  it('CENTER + FAR → equal forward PWM in [min, max]', () => {
    const cmd = computeFollowDiff(
      base({
        steerZone: 'CENTER',
        offset: 0,
        distanceIntent: 'APPROACH',
        distanceZone: 'FAR',
        estimatedDistanceM: 2.5,
      }),
      tunables
    );
    expect(cmd.mode).toBe('curve');
    expect(cmd.left).toBe(cmd.right);
    expect(cmd.left).toBeGreaterThanOrEqual(tunables.followMinPwm);
    expect(cmd.left).toBeLessThanOrEqual(tunables.followMaxPwm);
  });

  it('left offset → left PWM < right PWM, both ≥ 0 (curve)', () => {
    const cmd = computeFollowDiff(
      base({
        steerZone: 'LEFT',
        offset: -0.25,
        distanceIntent: 'APPROACH',
        distanceZone: 'FAR',
        estimatedDistanceM: 2.0,
      }),
      tunables
    );
    expect(cmd.mode).toBe('curve');
    expect(cmd.left).toBeLessThan(cmd.right);
    expect(cmd.left).toBeGreaterThanOrEqual(0);
    expect(cmd.right).toBeGreaterThanOrEqual(0);
  });

  it('CLOSE → zeros', () => {
    expect(
      computeFollowDiff(
        base({
          steerZone: 'CENTER',
          distanceIntent: 'APPROACH',
          distanceZone: 'CLOSE',
        }),
        tunables
      )
    ).toEqual({ left: 0, right: 0, mode: 'stop' });
  });

  it('large offset → spin with opposite signs', () => {
    const cmd = computeFollowDiff(
      base({
        steerZone: 'LEFT',
        offset: -0.6,
        distanceIntent: 'APPROACH',
        distanceZone: 'FAR',
      }),
      tunables
    );
    expect(cmd.mode).toBe('spin');
    expect(cmd.left).toBeLessThan(0);
    expect(cmd.right).toBeGreaterThan(0);
  });
});

describe('NavigationEngine.slewPwm', () => {
  it('limits step toward target', () => {
    expect(slewPwm(0, 180, 32)).toBe(32);
    expect(slewPwm(100, 90, 32)).toBe(90);
    expect(slewPwm(0, -100, 32)).toBe(-32);
  });
});
