import { useSettingsStore } from '../store/useSettingsStore';
import { useNotificationStore } from '../store/useNotificationStore';
import {
  CALL_HOLD_MS,
  maybeSummarizeForLlm,
  routeNotification,
  type NativeNotificationEvent,
  type NotificationPrefs,
} from './routeLogic';
import type { NotificationSource } from './packages';

const lastByKey = new Map<string, number>();
let callClearTimer: ReturnType<typeof setTimeout> | null = null;
let activeCallKey: string | null = null;

function prefsFromStore(): NotificationPrefs {
  return useSettingsStore.getState().notifications;
}

function clearCallTimer(): void {
  if (callClearTimer) {
    clearTimeout(callClearTimer);
    callClearTimer = null;
  }
}

function endCallHold(): void {
  clearCallTimer();
  activeCallKey = null;
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { CompanionStateMachine } = require('../robot/CompanionStateMachine');
    if (CompanionStateMachine.getState() === 'INTERRUPTED') {
      CompanionStateMachine.dispatch('CALL_END');
    }
  } catch (e) {
    console.warn('[NotificationRouter] CALL_END failed', e);
  }
}

function beginCallHold(key: string): void {
  activeCallKey = key || 'call';
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { FollowMode } = require('../robot/FollowMode');
    if (FollowMode.isEnabled()) {
      FollowMode.stop();
    }
  } catch {
    // ignore
  }
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { DanceMode } = require('../robot/DanceMode');
    if (DanceMode.isEnabled()) {
      DanceMode.stop('call');
    }
  } catch {
    // ignore
  }
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { CompanionStateMachine } = require('../robot/CompanionStateMachine');
    CompanionStateMachine.dispatch('CALL_START');
  } catch (e) {
    console.warn('[NotificationRouter] CALL_START failed', e);
  }
  clearCallTimer();
  callClearTimer = setTimeout(() => {
    endCallHold();
  }, CALL_HOLD_MS);
}

function speakIfNeeded(sender: string, message: string, showBody: boolean): void {
  if (!showBody) return;
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const VoiceService = require('../voice/VoiceService').default;
    const preview = message ? `${sender}. ${message.slice(0, 80)}` : sender;
    void VoiceService.speak(preview);
  } catch {
    // TTS optional
  }
}

class NotificationRouterImpl {
  ingest(event: NativeNotificationEvent, now: Date = new Date()) {
    const prefs = prefsFromStore();
    const decision = routeNotification(event, prefs, now, lastByKey);
    if (!decision.accept) {
      return decision;
    }

    lastByKey.set(decision.debounceKey, now.getTime());
    if (lastByKey.size > 80) {
      const first = lastByKey.keys().next().value;
      if (first) lastByKey.delete(first);
    }

    void maybeSummarizeForLlm(decision.message, prefs.summarizeAlerts);

    const storeSource: NotificationSource | 'System' = decision.source;
    useNotificationStore.getState().addNotification({
      source: storeSource === 'Other' ? 'System' : storeSource,
      sender: decision.sender,
      message: decision.message,
      showBody: decision.showBody,
    });

    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const SleepSystem = require('../services/SleepSystem').default;
      SleepSystem.reportActivity();
    } catch {
      // ignore
    }

    if (decision.isCall) {
      beginCallHold(event.key || decision.debounceKey);
    }

    speakIfNeeded(decision.sender, decision.message, decision.showBody);
    return decision;
  }

  ingestRemoved(event: NativeNotificationEvent): void {
    const key = event.key || '';
    if (activeCallKey && (key === activeCallKey || categorizeIsCall(event))) {
      endCallHold();
    }
  }

  /** Test helper */
  _resetForTests(): void {
    lastByKey.clear();
    clearCallTimer();
    activeCallKey = null;
  }
}

function categorizeIsCall(event: NativeNotificationEvent): boolean {
  const { categorizePackage } = require('./packages');
  return categorizePackage(event.packageName || '', event.category) === 'Call';
}

export const NotificationRouter = new NotificationRouterImpl();
