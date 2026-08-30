import { MotorArbiter } from '../src/robot/MotorArbiter';
import { DriveCommand, STOP_COMMAND } from '../src/robot/types';

const discrete = (direction: 'F' | 'B' | 'L' | 'R' | 'S'): DriveCommand => ({
  kind: 'discrete',
  direction,
});

describe('MotorArbiter', () => {
  let arbiter: MotorArbiter;

  beforeEach(() => {
    arbiter = new MotorArbiter();
  });

  it('returns STOP when no claimants', () => {
    expect(arbiter.getActiveClaimant()).toBeNull();
    expect(arbiter.getWinningCommand()).toEqual(STOP_COMMAND);
  });

  it('MANUAL beats FOLLOW', () => {
    arbiter.claim('FOLLOW', discrete('F'));
    arbiter.claim('MANUAL', discrete('L'));

    expect(arbiter.getActiveClaimant()).toBe('MANUAL');
    expect(arbiter.getWinningCommand()).toEqual(discrete('L'));
  });

  it('EMERGENCY beats all other claimants', () => {
    arbiter.claim('FOLLOW', discrete('F'));
    arbiter.claim('MANUAL', discrete('R'));
    arbiter.claim('WEB', discrete('B'));
    arbiter.claim('EMERGENCY', discrete('F')); // forced to STOP

    expect(arbiter.isEmergencyActive()).toBe(true);
    expect(arbiter.getActiveClaimant()).toBe('EMERGENCY');
    expect(arbiter.getWinningCommand()).toEqual(STOP_COMMAND);
  });

  it('release(EMERGENCY) is ignored — must clearEmergency', () => {
    arbiter.claim('EMERGENCY', discrete('S'));
    arbiter.release('EMERGENCY');

    expect(arbiter.isEmergencyActive()).toBe(true);
    expect(arbiter.getActiveClaimant()).toBe('EMERGENCY');
  });

  it('clearEmergency restores next-highest claimant (WEB)', () => {
    arbiter.claim('WEB', discrete('F'));
    arbiter.claim('MANUAL', discrete('L'));
    arbiter.claim('EMERGENCY', discrete('S'));

    arbiter.release('MANUAL');
    arbiter.clearEmergency();

    expect(arbiter.isEmergencyActive()).toBe(false);
    expect(arbiter.getActiveClaimant()).toBe('WEB');
    expect(arbiter.getWinningCommand()).toEqual(discrete('F'));
  });

  it('release MANUAL restores WEB or stop', () => {
    arbiter.claim('WEB', discrete('B'));
    arbiter.claim('MANUAL', discrete('F'));
    expect(arbiter.getActiveClaimant()).toBe('MANUAL');

    arbiter.release('MANUAL');
    expect(arbiter.getActiveClaimant()).toBe('WEB');
    expect(arbiter.getWinningCommand()).toEqual(discrete('B'));

    arbiter.release('WEB');
    expect(arbiter.getActiveClaimant()).toBeNull();
    expect(arbiter.getWinningCommand()).toEqual(STOP_COMMAND);
  });

  it('notifies subscribers on claim/release', () => {
    const listener = jest.fn();
    const unsub = arbiter.subscribe(listener);

    arbiter.claim('MANUAL', discrete('F'));
    arbiter.release('MANUAL');
    expect(listener).toHaveBeenCalledTimes(2);

    unsub();
    arbiter.claim('WEB', discrete('L'));
    expect(listener).toHaveBeenCalledTimes(2);
  });
});
