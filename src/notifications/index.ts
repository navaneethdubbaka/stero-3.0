export type { NotificationSource } from './packages';
export { categorizePackage } from './packages';
export { NotificationRouter } from './NotificationRouter';
export {
  routeNotification,
  isInQuietHours,
  isSourceEnabled,
  maybeSummarizeForLlm,
  NOTIFICATION_DEBOUNCE_MS,
} from './routeLogic';
export type {
  NotificationPrefs,
  NativeNotificationEvent,
  AnnounceMode,
} from './routeLogic';
