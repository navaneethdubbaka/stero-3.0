import { useSettingsStore } from '../store/useSettingsStore';
import { useSleepStore } from '../store/useSleepStore';
import IdleBehaviorEngine from './IdleBehaviorEngine';
import { CompanionStateMachine } from '../robot/CompanionStateMachine';

class SleepSystem {
  private static instance: SleepSystem;
  private timerId: ReturnType<typeof setTimeout> | null = null;
  private isRunning: boolean = false;
  private unsubSettings: (() => void) | null = null;

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
    this.unsubSettings = useSettingsStore.subscribe((state, prev) => {
      if (state.display.sleepTimeout !== prev.display.sleepTimeout) {
        this.resetTimer();
      }
    });
    this.resetTimer();
  }

  /**
   * Stops checking for inactivity (e.g. if settings change or manual overrides are active).
   */
  public stop() {
    this.isRunning = false;
    this.unsubSettings?.();
    this.unsubSettings = null;
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

    // Stop Follow so motors do not keep driving while asleep
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const { FollowMode } = require('../robot/FollowMode');
      if (FollowMode.isEnabled()) {
        FollowMode.stop();
      }
    } catch (e) {
      console.warn('SleepSystem: Failed to stop FollowMode', e);
    }

    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const { DanceMode } = require('../robot/DanceMode');
      if (DanceMode.isEnabled()) {
        DanceMode.stop('sleep');
      }
    } catch (e) {
      console.warn('SleepSystem: Failed to stop DanceMode', e);
    }

    // Mark as asleep; companion machine drives SLEEPY emotion
    useSleepStore.getState().setAsleep(true);
    CompanionStateMachine.dispatch('SLEEP');
  }

  private wakeUp() {
    console.log('SleepSystem: Activity detected. Waking up.');
    
    useSleepStore.getState().setAsleep(false);
    CompanionStateMachine.dispatch('WAKE');
    
    // Resume idle animations
    IdleBehaviorEngine.start();
    
    // Restart the timer loop
    this.resetTimer();
  }
}

export default SleepSystem.getInstance();
