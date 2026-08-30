import {
  computeTargetGazeX,
  EyeContactEngine,
} from '../src/face/EyeContactEngine';

describe('computeTargetGazeX', () => {
  it('clamps offset * 2 to [-1, 1]', () => {
    expect(computeTargetGazeX(0, null)).toBe(0);
    expect(computeTargetGazeX(0.25, null)).toBeCloseTo(0.5, 5);
    expect(computeTargetGazeX(0.5, null)).toBe(1);
    expect(computeTargetGazeX(-0.5, null)).toBe(-1);
    expect(computeTargetGazeX(0.8, null)).toBe(1);
  });

  it('blends nose landmark when present', () => {
    // offset 0.25 → 0.5; nose at 0.6 → noseOffset 0.1 → *2 = 0.2
    // 0.7*0.5 + 0.3*0.2 = 0.35 + 0.06 = 0.41
    expect(computeTargetGazeX(0.25, 0.6)).toBeCloseTo(0.41, 5);
  });
});

describe('EyeContactEngine ease', () => {
  beforeEach(() => {
    EyeContactEngine.reset();
    EyeContactEngine.setEnabled(true);
  });

  it('eases toward 0 when unlocked via tickToward', () => {
    EyeContactEngine.tickToward(0.8, true, 200);
    expect(Math.abs(EyeContactEngine.getGaze().x)).toBeGreaterThan(0.1);

    // Several lost ticks should pull toward center
    for (let i = 0; i < 20; i++) {
      EyeContactEngine.tickToward(0, false, 100);
    }
    expect(EyeContactEngine.getGaze().x).toBeCloseTo(0, 1);
  });

  it('reset centers gaze', () => {
    EyeContactEngine.tickToward(1, true, 500);
    EyeContactEngine.reset();
    expect(EyeContactEngine.getGaze()).toEqual({ x: 0, y: 0 });
  });

  it('disabled snaps and holds center', () => {
    EyeContactEngine.tickToward(0.5, true, 200);
    EyeContactEngine.setEnabled(false);
    expect(EyeContactEngine.getGaze().x).toBe(0);
    // Public tick respects enabled flag
    EyeContactEngine.tick(200);
    expect(EyeContactEngine.getGaze().x).toBe(0);
  });
});
