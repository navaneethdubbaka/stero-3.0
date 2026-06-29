import { useEmotionStore } from '../store/useEmotionStore';

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
   * Translates application events into visual emotion updates on the robot face.
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
      default:
        setEmotion('IDLE');
    }
  }
}

export default EmotionRuleEngine.getInstance();
