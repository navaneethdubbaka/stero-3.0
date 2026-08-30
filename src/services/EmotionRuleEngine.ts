import { useEmotionStore } from '../store/useEmotionStore';
import type { CompanionState } from '../robot/companionTypes';

const PIPELINE_EMOTIONS = new Set([
  'LISTENING',
  'THINKING',
  'SPEAKING',
  'SLEEPY',
  'SAD',
]);

class EmotionRuleEngine {
  private static instance: EmotionRuleEngine;

  private constructor() {}

  public static getInstance(): EmotionRuleEngine {
    if (!EmotionRuleEngine.instance) {
      EmotionRuleEngine.instance = new EmotionRuleEngine();
    }
    return EmotionRuleEngine.instance;
  }

  /**
   * Drive face emotion from companion life-cycle transitions.
   * FOLLOWING leaves gaze/idle as-is; IDLE only clears pipeline emotions
   * (does not clobber wink / ALERT micro-idle overlays).
   */
  public onCompanionState(state: CompanionState): void {
    const { setEmotion, currentEmotion } = useEmotionStore.getState();

    switch (state) {
      case 'SLEEP':
        setEmotion('SLEEPY');
        break;
      case 'LISTENING':
        setEmotion('LISTENING');
        break;
      case 'THINKING':
        setEmotion('THINKING');
        break;
      case 'SPEAKING':
        setEmotion('SPEAKING');
        break;
      case 'ERROR':
        setEmotion('SAD');
        break;
      case 'MANUAL':
        setEmotion('ALERT');
        break;
      case 'DANCING':
        setEmotion('EXCITED');
        break;
      case 'FOLLOWING':
        // Keep IDLE / gaze overlays — no emotion change
        break;
      case 'IDLE':
        if (PIPELINE_EMOTIONS.has(currentEmotion)) {
          setEmotion('IDLE');
        }
        break;
      default:
        break;
    }
  }

  /**
   * Overlay / one-shot emotions (not companion states).
   * Pipeline voice/sleep emotions should prefer CompanionStateMachine.
   */
  public triggerEvent(
    event:
      | 'WAKE_WORD'
      | 'START_LISTENING'
      | 'LISTENING_ERROR'
      | 'THINKING'
      | 'SPEAKING'
      | 'SPEAKING_END'
      | 'NOTIFICATION'
      | 'INACTIVITY'
      | 'SYSTEM_ERROR'
      | 'PERSON_FOUND'
  ) {
    const { setEmotion } = useEmotionStore.getState();
    console.log(`EmotionRuleEngine: Processing event: ${event}`);

    switch (event) {
      case 'WAKE_WORD':
        setEmotion('HAPPY');
        break;
      case 'START_LISTENING':
        setEmotion('LISTENING');
        break;
      case 'LISTENING_ERROR':
        setEmotion('CONFUSED');
        break;
      case 'THINKING':
        setEmotion('THINKING');
        break;
      case 'SPEAKING':
        setEmotion('SPEAKING');
        break;
      case 'SPEAKING_END':
        setEmotion('IDLE');
        break;
      case 'NOTIFICATION':
        setEmotion('SURPRISED');
        break;
      case 'INACTIVITY':
        setEmotion('SLEEPY');
        break;
      case 'SYSTEM_ERROR':
        setEmotion('SAD');
        break;
      case 'PERSON_FOUND':
        setEmotion('ALERT');
        break;
      default:
        setEmotion('IDLE');
    }
  }
}

export default EmotionRuleEngine.getInstance();
