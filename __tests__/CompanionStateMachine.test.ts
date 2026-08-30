import { CompanionStateMachine } from '../src/robot/CompanionStateMachine';
import { useCompanionStore } from '../src/store/useCompanionStore';

const followEnabled = { value: false };

jest.mock('../src/robot/FollowMode', () => ({
  FollowMode: {
    isEnabled: () => followEnabled.value,
    start: jest.fn(),
    stop: jest.fn(),
  },
}));

jest.mock('../src/services/EmotionRuleEngine', () => ({
  __esModule: true,
  default: {
    onCompanionState: jest.fn(),
    triggerEvent: jest.fn(),
  },
}));

describe('CompanionStateMachine', () => {
  beforeEach(() => {
    followEnabled.value = false;
    CompanionStateMachine._resetForTests('IDLE');
  });

  it('SLEEP blocks FOLLOW_START', () => {
    expect(CompanionStateMachine.dispatch('SLEEP').ok).toBe(true);
    expect(CompanionStateMachine.getState()).toBe('SLEEP');
    expect(CompanionStateMachine.canFollow()).toBe(false);

    const r = CompanionStateMachine.dispatch('FOLLOW_START');
    expect(r.ok).toBe(false);
    expect(CompanionStateMachine.getState()).toBe('SLEEP');
  });

  it('MANUAL blocks FOLLOW_START and restores FOLLOW on release when follow on', () => {
    expect(CompanionStateMachine.dispatch('MANUAL_ON').to).toBe('MANUAL');
    expect(CompanionStateMachine.canFollow()).toBe(false);
    expect(CompanionStateMachine.dispatch('FOLLOW_START').ok).toBe(false);

    followEnabled.value = true;
    expect(CompanionStateMachine.dispatch('MANUAL_OFF').to).toBe('FOLLOWING');
  });

  it('voice pipeline restores FOLLOWING when follow flag on', () => {
    followEnabled.value = true;
    expect(CompanionStateMachine.dispatch('FOLLOW_START').to).toBe('FOLLOWING');

    expect(CompanionStateMachine.dispatch('LISTEN_START').to).toBe('LISTENING');
    expect(CompanionStateMachine.dispatch('THINK').to).toBe('THINKING');
    expect(CompanionStateMachine.dispatch('SPEAK').to).toBe('SPEAKING');
    expect(CompanionStateMachine.dispatch('SPEAK_END').to).toBe('FOLLOWING');
  });

  it('voice pipeline returns IDLE when follow off', () => {
    expect(CompanionStateMachine.dispatch('LISTEN_START').to).toBe('LISTENING');
    expect(CompanionStateMachine.dispatch('THINK').to).toBe('THINKING');
    expect(CompanionStateMachine.dispatch('SPEAK').to).toBe('SPEAKING');
    expect(CompanionStateMachine.dispatch('SPEAK_END').to).toBe('IDLE');
  });

  it('DANCE_START only from IDLE', () => {
    expect(CompanionStateMachine.requestDanceStart().to).toBe('DANCING');
    expect(CompanionStateMachine.canFollow()).toBe(false);
    expect(CompanionStateMachine.dispatch('FOLLOW_START').ok).toBe(false);

    CompanionStateMachine._resetForTests('FOLLOWING');
    expect(CompanionStateMachine.requestDanceStart().ok).toBe(false);

    CompanionStateMachine._resetForTests('DANCING');
    expect(CompanionStateMachine.requestDanceEnd().to).toBe('IDLE');
  });

  it('MANUAL_ON from DANCING aborts to MANUAL', () => {
    CompanionStateMachine._resetForTests('DANCING');
    expect(CompanionStateMachine.dispatch('MANUAL_ON').to).toBe('MANUAL');
  });

  it('keeps a 20-entry ring buffer and mirrors store', () => {
    for (let i = 0; i < 25; i++) {
      CompanionStateMachine.dispatch('LISTEN_START');
      CompanionStateMachine.dispatch('LISTEN_ERROR');
    }
    const hist = CompanionStateMachine.getHistory();
    expect(hist.length).toBe(20);
    expect(useCompanionStore.getState().history.length).toBe(20);
    expect(useCompanionStore.getState().state).toBe('IDLE');
  });

  it('WAKE from SLEEP goes IDLE', () => {
    CompanionStateMachine.dispatch('SLEEP');
    expect(CompanionStateMachine.dispatch('WAKE').to).toBe('IDLE');
  });
});
