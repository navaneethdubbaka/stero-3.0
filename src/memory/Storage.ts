import { NativeModules } from 'react-native';

const { SharedPrefs } = NativeModules;

/** Current on-disk schema. Unversioned installs are treated as v1. */
export const SCHEMA_VERSION = 2;

export const KEYS = {
  schemaVersion: 'abiogenesis.schemaVersion',
  settings: 'settings',
  robotMemory: 'robot_memory',
  chatLogs: 'chat_logs',
} as const;

/**
 * Thin SharedPrefs wrapper for companion persistence (Page 8).
 * Keeps existing key names so old installs still load.
 */
class StorageImpl {
  async getString(key: string, defaultValue = ''): Promise<string> {
    try {
      if (!SharedPrefs?.getString) return defaultValue;
      const value = await SharedPrefs.getString(key, defaultValue);
      return value ?? defaultValue;
    } catch (e) {
      console.error('Storage.getString failed', key, e);
      return defaultValue;
    }
  }

  async setString(key: string, value: string): Promise<void> {
    try {
      if (!SharedPrefs?.setString) return;
      await SharedPrefs.setString(key, value);
    } catch (e) {
      console.error('Storage.setString failed', key, e);
    }
  }

  async remove(key: string): Promise<void> {
    try {
      if (SharedPrefs?.remove) {
        await SharedPrefs.remove(key);
        return;
      }
      // Fallback if native remove missing: empty string
      await this.setString(key, '');
    } catch (e) {
      console.error('Storage.remove failed', key, e);
    }
  }

  async getJson<T>(key: string): Promise<T | null> {
    const raw = await this.getString(key, '');
    if (!raw) return null;
    try {
      return JSON.parse(raw) as T;
    } catch (e) {
      console.error('Storage.getJson parse failed', key, e);
      return null;
    }
  }

  async setJson(key: string, value: unknown): Promise<void> {
    await this.setString(key, JSON.stringify(value));
  }

  async getSchemaVersion(): Promise<number> {
    const raw = await this.getString(KEYS.schemaVersion, '');
    if (!raw) return 1; // unversioned = v1
    const n = parseInt(raw, 10);
    return Number.isFinite(n) && n > 0 ? n : 1;
  }

  async setSchemaVersion(version: number): Promise<void> {
    await this.setString(KEYS.schemaVersion, String(version));
  }

  /**
   * Migrate from detected version up to SCHEMA_VERSION.
   * v1 → v2: no-op on payload keys; only stamps schema version.
   */
  async runMigrations(): Promise<void> {
    let from = await this.getSchemaVersion();
    if (from >= SCHEMA_VERSION) {
      return;
    }
    while (from < SCHEMA_VERSION) {
      await this.migrate(from);
      from += 1;
      await this.setSchemaVersion(from);
    }
  }

  private async migrate(from: number): Promise<void> {
    if (from === 1) {
      // v1 → v2: existing settings / robot_memory / chat_logs stay as-is
      console.log('Storage: migrate v1 → v2 (stamp only)');
      return;
    }
    console.warn(`Storage: no migration defined for v${from}`);
  }

  /** Clears memory + chat; leaves settings intact. */
  async clearAllCompanionData(): Promise<void> {
    await this.remove(KEYS.robotMemory);
    await this.remove(KEYS.chatLogs);
  }
}

export const Storage = new StorageImpl();
export default Storage;
