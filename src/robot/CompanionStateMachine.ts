import type {
  CompanionEvent,
  CompanionState,
  DispatchResult,
  TransitionRecord,
} from './companionTypes';
import { useCompanionStore } from '../store/useCompanionStore';

const HISTORY_LIMIT = 20;

type Listener = (record: TransitionRecord) => void;

/**
 * Exclusive display/behavior state for the companion.
 * Motor claims stay on MotorArbiter (Page 1); this machine arbitrates UI life-cycle.
 */
class CompanionStateMachineImpl {
  private state: CompanionState = 'IDLE';
  private history: TransitionRecord[] = [];
  private listeners = new Set<Listener>();

  getState(): CompanionState {
    return this.state;
  }

  getHistory(): TransitionRecord[] {
    return [...this.history];
  }

  /** FOLLOW_START allowed when not asleep, in manual pad, or dancing. */
  canFollow(): boolean {
    return this.state !== 'SLEEP' && this.state !== 'MANUAL' && this.state !== 'DANCING';
  }

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  /** Stub for Page 6+ dance — enters DANCING only from IDLE. */
  requestDanceStart(): DispatchResult {
    return this.dispatch('DANCE_START');
  }

  requestDanceEnd(): DispatchResult {
    return this.dispatch('DANCE_END');
  }

  dispatch(event: CompanionEvent): DispatchResult {
    const from = this.state;
    const resolved = this.resolve(from, event);

    if (!resolved.ok) {
      const reason = resolved.reason ?? `illegal: ${from} + ${event}`;
      useCompanionStore.getState().mirror({ lastReason: reason });
      return { ok: false, from, to: from, reason };
    }

    const to = resolved.to;
    if (to === from) {
      return { ok: true, from, to };
    }

    this.state = to;
    const record: TransitionRecord = {
      from,
      to,
      event,
      at: Date.now(),
    };
    this.history = [...this.history, record].slice(-HISTORY_LIMIT);

    useCompanionStore.getState().mirror({
      state: to,
      history: this.history,
      lastReason: null,
    });

    this.listeners.forEach((l) => {
      try {
        l(record);
      } catch (e) {
        console.warn('[CompanionStateMachine] listener error', e);
      }
    });

    try {
      // Lazy require avoids init-order cycles with EmotionRuleEngine
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const EmotionRuleEngine = require('../services/EmotionRuleEngine').default;
      EmotionRuleEngine.onCompanionState?.(to);
    } catch (e) {
      console.warn('[CompanionStateMachine] emotion sync failed', e);
    }

    return { ok: true, from, to };
  }

  private followStillOn(): boolean {
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const { FollowMode } = require('./FollowMode');
      return !!FollowMode.isEnabled?.();
    } catch {
      return false;
    }
  }

  private resolve(
    from: CompanionState,
    event: CompanionEvent
  ): { ok: true; to: CompanionState } | { ok: false; reason: string } {
    // SLEEP always wins
    if (event === 'SLEEP') {
      if (from === 'SLEEP') return { ok: true, to: 'SLEEP' };
      return { ok: true, to: 'SLEEP' };
    }

    switch (event) {
      case 'WAKE':
        if (from === 'SLEEP') return { ok: true, to: 'IDLE' };
        return { ok: true, to: from };

      case 'LISTEN_START':
        if (
          from === 'IDLE' ||
          from === 'FOLLOWING' ||
          from === 'SPEAKING' ||
          from === 'THINKING' ||
          from === 'LISTENING'
        ) {
          return { ok: true, to: 'LISTENING' };
        }
        return { ok: false, reason: `LISTEN_START rejected from ${from}` };

      case 'THINK':
        if (from === 'LISTENING') return { ok: true, to: 'THINKING' };
        return { ok: false, reason: `THINK rejected from ${from}` };

      case 'SPEAK':
        if (
          from === 'THINKING' ||
          from === 'LISTENING' ||
          from === 'IDLE' ||
          from === 'ERROR'
        ) {
          return { ok: true, to: 'SPEAKING' };
        }
        return { ok: false, reason: `SPEAK rejected from ${from}` };

      case 'SPEAK_END':
        if (from === 'SPEAKING' || from === 'THINKING' || from === 'LISTENING') {
          return { ok: true, to: this.followStillOn() ? 'FOLLOWING' : 'IDLE' };
        }
        return { ok: false, reason: `SPEAK_END rejected from ${from}` };

      case 'LISTEN_ERROR':
        if (from === 'LISTENING') {
          return { ok: true, to: this.followStillOn() ? 'FOLLOWING' : 'IDLE' };
        }
        return { ok: false, reason: `LISTEN_ERROR rejected from ${from}` };

      case 'FOLLOW_START':
        if (from === 'SLEEP' || from === 'MANUAL' || from === 'DANCING') {
          return { ok: false, reason: `FOLLOW_START rejected from ${from}` };
        }
        if (
          from === 'IDLE' ||
          from === 'FOLLOWING' ||
          from === 'LISTENING' ||
          from === 'THINKING' ||
          from === 'SPEAKING' ||
          from === 'ERROR'
        ) {
          // Voice/manual pipeline owns display while active — only claim FOLLOWING from IDLE/ERROR
          if (from === 'IDLE' || from === 'ERROR' || from === 'FOLLOWING') {
            return { ok: true, to: 'FOLLOWING' };
          }
          // Follow motors may start under voice; keep voice display state
          return { ok: true, to: from };
        }
        return { ok: false, reason: `FOLLOW_START rejected from ${from}` };

      case 'FOLLOW_STOP':
        if (from === 'FOLLOWING') {
          return { ok: true, to: 'IDLE' };
        }
        // Motors may stop while voice owns display — no companion change
        return { ok: true, to: from };

      case 'MANUAL_ON':
        if (from === 'SLEEP') {
          return { ok: false, reason: `MANUAL_ON rejected from ${from}` };
        }
        // From DANCING: pad aborts dance display → MANUAL
        return { ok: true, to: 'MANUAL' };

      case 'MANUAL_OFF':
        if (from === 'MANUAL') {
          return { ok: true, to: this.followStillOn() ? 'FOLLOWING' : 'IDLE' };
        }
        return { ok: true, to: from };

      case 'DANCE_START':
        if (from !== 'IDLE') {
          return { ok: false, reason: `DANCE_START only from IDLE (was ${from})` };
        }
        return { ok: true, to: 'DANCING' };

      case 'DANCE_END':
        if (from === 'DANCING') return { ok: true, to: 'IDLE' };
        return { ok: false, reason: `DANCE_END rejected from ${from}` };

      case 'ERROR':
        if (from === 'SLEEP') {
          return { ok: false, reason: 'ERROR rejected from SLEEP' };
        }
        return { ok: true, to: 'ERROR' };

      case 'CLEAR_ERROR':
        if (from === 'ERROR') return { ok: true, to: 'IDLE' };
        return { ok: false, reason: `CLEAR_ERROR rejected from ${from}` };

      default:
        return { ok: false, reason: `unknown event` };
    }
  }

  /** Test helper — reset without notifying emotion. */
  _resetForTests(state: CompanionState = 'IDLE'): void {
    this.state = state;
    this.history = [];
    useCompanionStore.getState().mirror({
      state,
      history: [],
      lastReason: null,
    });
  }
}

export const CompanionStateMachine = new CompanionStateMachineImpl();
