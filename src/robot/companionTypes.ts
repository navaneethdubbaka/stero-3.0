export type CompanionState =
  | 'SLEEP'
  | 'IDLE'
  | 'LISTENING'
  | 'THINKING'
  | 'SPEAKING'
  | 'FOLLOWING'
  | 'DANCING'
  | 'MANUAL'
  | 'INTERRUPTED'
  | 'ERROR';

export type CompanionEvent =
  | 'WAKE'
  | 'LISTEN_START'
  | 'THINK'
  | 'SPEAK'
  | 'SPEAK_END'
  | 'LISTEN_ERROR'
  | 'FOLLOW_START'
  | 'FOLLOW_STOP'
  | 'MANUAL_ON'
  | 'MANUAL_OFF'
  | 'SLEEP'
  | 'DANCE_START'
  | 'DANCE_END'
  | 'CALL_START'
  | 'CALL_END'
  | 'ERROR'
  | 'CLEAR_ERROR';

export interface TransitionRecord {
  from: CompanionState;
  to: CompanionState;
  event: CompanionEvent;
  at: number;
  reason?: string;
}

export interface DispatchResult {
  ok: boolean;
  from: CompanionState;
  to: CompanionState;
  reason?: string;
}
