import { useSettingsStore } from '../store/useSettingsStore';
import { useSleepStore } from '../store/useSleepStore';
import { useEmotionStore } from '../store/useEmotionStore';
import IdleBehaviorEngine from './IdleBehaviorEngine';

class SleepSystem {
  private static instance: SleepSystem;
  private timerId: ReturnType<typeof setTimeout> | null = null;
  private isRunning: boolean = false;

  private constructor() {}

  public static getInstance(): SleepSystem {
    if (!SleepSystem.instance) {
      SleepSystem.instance = new SleepSystem();
    }
    return SleepSystem.instance;
  }

  /**
   * Starts monitoring for inactivity.
   */
  public start() {
    if (this.isRunning) return;
    this.isRunning = true;
    console.log('SleepSystem: Starting inactivity check.');
    this.resetTimer();
  }

  /**
   * Stops checking for inactivity (e.g. if settings change or manual overrides are active).
   */
  public stop() {
    this.isRunning = false;
    if (this.timerId) {
      clearTimeout(this.timerId);
      this.timerId = null;
    }
  }

  /**
   * Resets the inactivity sleep timer. Wakes up the robot if currently asleep.
   */
  public reportActivity() {
    const { isAsleep } = useSleepStore.getState();
    if (isAsleep) {
      this.wakeUp();
    } else {
      this.resetTimer();
    }
  }

  private resetTimer() {
    if (this.timerId) {
      clearTimeout(this.timerId);
    }

    if (!this.isRunning) return;

    const { display } = useSettingsStore.getState();
    
    // If sleepTimeout is configured as 0, disable sleep mode completely
    if (display.sleepTimeout <= 0) {
      return;
    }

    const timeoutMs = display.sleepTimeout * 60 * 1000;

    this.timerId = setTimeout(() => {
      this.goToSleep();
    }, timeoutMs);
  }

  private goToSleep() {
    console.log('SleepSystem: Sleep timeout reached. Going to sleep.');
    
    // Pause idle micro-animations while sleeping
    IdleBehaviorEngine.stop();

    // Mark as asleep and change visual emotion
    useSleepStore.getState().setAsleep(true);
    useEmotionStore.getState().setEmotion('SLEEPY');
  }

  private wakeUp() {
    console.log('SleepSystem: Activity detected. Waking up.');
    
    useSleepStore.getState().setAsleep(false);
    useEmotionStore.getState().setEmotion('IDLE');
    
    // Resume idle animations
    IdleBehaviorEngine.start();
    
    // Restart the timer loop
    this.resetTimer();
  }
}

export default SleepSystem.getInstance();
