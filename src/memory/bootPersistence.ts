import { Storage } from './Storage';
import { useSettingsStore } from '../store/useSettingsStore';
import { useMemoryStore } from '../store/useMemoryStore';
import { useConversationStore } from '../store/useConversationStore';

let bootPromise: Promise<void> | null = null;
let booted = false;

/**
 * One-shot persistence boot: migrate → settings → memory → chat (trim).
 * Safe to call from App and Home; only runs once.
 */
export async function ensureBooted(): Promise<void> {
  if (booted) return;
  if (bootPromise) return bootPromise;

  bootPromise = (async () => {
    try {
      await Storage.runMigrations();
      await useSettingsStore.getState().initializeSettings();
      await useMemoryStore.getState().initializeMemory();
      await useConversationStore.getState().initializeLogs();
      useConversationStore.getState().trimMessages();
      booted = true;
      console.log('bootPersistence: companion storage ready');
    } catch (e) {
      console.error('bootPersistence: failed', e);
      // Allow retry on next ensureBooted call
      bootPromise = null;
      throw e;
    }
  })();

  return bootPromise;
}

/** Test helper */
export function _resetBootForTests(): void {
  booted = false;
  bootPromise = null;
}
