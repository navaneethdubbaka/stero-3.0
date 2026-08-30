import { useEmotionStore } from '../store/useEmotionStore';

class IdleBehaviorEngine {
  private static instance: IdleBehaviorEngine;
  private timerId: ReturnType<typeof setTimeout> | null = null;
  private isRunning: boolean = false;

  private constructor() {}

  public static getInstance(): IdleBehaviorEngine {
    if (!IdleBehaviorEngine.instance) {
      IdleBehaviorEngine.instance = new IdleBehaviorEngine();
    }
    return IdleBehaviorEngine.instance;
  }

  /**
   * Starts the randomized loop of micro-animations.
   */
  public start() {
    if (this.isRunning) return;
    this.isRunning = true;
    console.log('IdleBehaviorEngine: Starting micro-action loop.');
    this.scheduleNextAction();
  }

  /**
   * Stops the idle loop when conversation or other activity begins.
   */
  public stop() {
    this.isRunning = false;
    if (this.timerId) {
      clearTimeout(this.timerId);
      this.timerId = null;
    }
    console.log('IdleBehaviorEngine: Stopped.');
  }

  private scheduleNextAction() {
    if (!this.isRunning) return;

    // PRD face idle: micro-actions every 30–90 seconds
    const delay = Math.random() * 60000 + 30000;
    this.timerId = setTimeout(() => {
      this.performRandomAction();
      this.scheduleNextAction();
    }, delay);
  }

  private performRandomAction() {
    const { currentEmotion, setEmotion } = useEmotionStore.getState();

    // Only run micro-animations if currently IDLE (not speaking, listening, or sleeping)
    if (currentEmotion !== 'IDLE') {
      return;
    }

    let actions = ['WINK', 'LOOK_AROUND', 'YAWN'];
    // Skip LOOK_AROUND when someone is locked — EyeContactEngine owns gaze
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const { useTrackingStore } = require('../store/useTrackingStore');
      if (useTrackingStore.getState().targetLocked) {
        actions = ['WINK', 'YAWN'];
      }
    } catch {
      // ignore
    }

    const randomAction = actions[Math.floor(Math.random() * actions.length)];

    console.log(`IdleBehaviorEngine: Running micro-action -> ${randomAction}`);

    switch (randomAction) {
      case 'WINK':
        setEmotion('WINKING');
        setTimeout(() => {
          if (useEmotionStore.getState().currentEmotion === 'WINKING') {
            setEmotion('IDLE');
          }
        }, 1000);
        break;

      case 'LOOK_AROUND':
        setEmotion('ALERT');
        setTimeout(() => {
          if (useEmotionStore.getState().currentEmotion === 'ALERT') {
            setEmotion('IDLE');
          }
        }, 1500);
        break;

      case 'YAWN':
        setEmotion('SLEEPY');
        setTimeout(() => {
          if (useEmotionStore.getState().currentEmotion === 'SLEEPY') {
            setEmotion('IDLE');
          }
        }, 2000);
        break;

      default:
        break;
    }
  }
}

export default IdleBehaviorEngine.getInstance();
