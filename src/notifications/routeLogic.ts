import type { NotificationSource } from './packages';
import { categorizePackage } from './packages';

export const NOTIFICATION_DEBOUNCE_MS = 1500;
export const CALL_HOLD_MS = 45_000;

export type AnnounceMode = 'face_only' | 'speak';

export type NotificationPrefs = {
  whatsapp: boolean;
  telegram: boolean;
  sms: boolean;
  phone: boolean;
  other: boolean;
  announceMode: AnnounceMode;
  summarizeAlerts: boolean;
  dndEnabled: boolean;
  dndStart: string;
  dndEnd: string;
};

export type NativeNotificationEvent = {
  packageName?: string;
  title?: string;
  text?: string;
  category?: string;
  isOngoing?: boolean;
  key?: string;
};

export type RouteDecision =
  | { accept: false; reason: string }
  | {
      accept: true;
      source: NotificationSource;
      sender: string;
      message: string;
      showBody: boolean;
      isCall: boolean;
      debounceKey: string;
    };

export function parseHm(value: string): number {
  const m = /^(\d{1,2}):(\d{2})$/.exec((value || '').trim());
  if (!m) return 0;
  const h = Math.min(23, Math.max(0, parseInt(m[1], 10)));
  const min = Math.min(59, Math.max(0, parseInt(m[2], 10)));
  return h * 60 + min;
}

/** Inclusive start, exclusive end; wraps overnight. */
export function isInQuietHours(
  now: Date,
  prefs: Pick<NotificationPrefs, 'dndEnabled' | 'dndStart' | 'dndEnd'>
): boolean {
  if (!prefs.dndEnabled) return false;
  const minutes = now.getHours() * 60 + now.getMinutes();
  const start = parseHm(prefs.dndStart);
  const end = parseHm(prefs.dndEnd);
  if (start === end) return true;
  if (start < end) return minutes >= start && minutes < end;
  return minutes >= start || minutes < end;
}

export function isSourceEnabled(
  source: NotificationSource,
  prefs: NotificationPrefs
): boolean {
  switch (source) {
    case 'WhatsApp':
      return prefs.whatsapp;
    case 'Telegram':
      return prefs.telegram;
    case 'SMS':
      return prefs.sms;
    case 'Call':
      return prefs.phone;
    default:
      return prefs.other;
  }
}

/**
 * Privacy: never send notification bodies to an LLM unless summarizeAlerts.
 * Page 13 stub — even when the flag is true we do not upload (no ChatCompletion).
 */
export function maybeSummarizeForLlm(
  _body: string,
  summarizeAlerts: boolean,
  llm?: (prompt: string) => Promise<string>
): Promise<string | null> {
  if (!summarizeAlerts || !llm) {
    return Promise.resolve(null);
  }
  // Opt-in exists but Page 13 does not call the LLM.
  return Promise.resolve(null);
}

export function routeNotification(
  event: NativeNotificationEvent,
  prefs: NotificationPrefs,
  now: Date,
  lastByKey: Map<string, number>
): RouteDecision {
  const packageName = event.packageName || '';
  const title = (event.title || '').trim();
  const text = (event.text || '').trim();
  if (!packageName && !title && !text) {
    return { accept: false, reason: 'empty' };
  }

  const source = categorizePackage(packageName, event.category);
  const isCall = source === 'Call';

  if (!isSourceEnabled(source, prefs)) {
    return { accept: false, reason: `source ${source} disabled` };
  }

  if (!isCall && isInQuietHours(now, prefs)) {
    return { accept: false, reason: 'dnd' };
  }

  const debounceKey = `${packageName}|${title}`;
  const last = lastByKey.get(debounceKey);
  if (last !== undefined && now.getTime() - last < NOTIFICATION_DEBOUNCE_MS) {
    return { accept: false, reason: 'debounce' };
  }

  return {
    accept: true,
    source,
    sender: title || source,
    message: text,
    showBody: prefs.announceMode === 'speak',
    isCall,
    debounceKey,
  };
}
