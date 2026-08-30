import { NativeModules } from 'react-native';
import { Storage, SCHEMA_VERSION, KEYS } from '../src/memory/Storage';

const prefs: Record<string, string> = {};

jest.mock('react-native', () => ({
  NativeModules: {
    SharedPrefs: {
      getString: jest.fn(async (key: string, def: string) =>
        key in prefs ? prefs[key] : def
      ),
      setString: jest.fn(async (key: string, value: string) => {
        prefs[key] = value;
        return true;
      }),
      remove: jest.fn(async (key: string) => {
        delete prefs[key];
        return true;
      }),
    },
  },
}));

describe('Storage', () => {
  beforeEach(() => {
    for (const k of Object.keys(prefs)) delete prefs[k];
    jest.clearAllMocks();
  });

  it('treats missing schema as v1 and migrates to SCHEMA_VERSION', async () => {
    expect(await Storage.getSchemaVersion()).toBe(1);
    await Storage.runMigrations();
    expect(await Storage.getSchemaVersion()).toBe(SCHEMA_VERSION);
    expect(prefs[KEYS.schemaVersion]).toBe(String(SCHEMA_VERSION));
  });

  it('getJson / setJson round-trip', async () => {
    await Storage.setJson(KEYS.robotMemory, { userName: 'Ada', facts: [] });
    const data = await Storage.getJson<{ userName: string }>(KEYS.robotMemory);
    expect(data?.userName).toBe('Ada');
  });

  it('clearAllCompanionData removes memory and chat, keeps settings', async () => {
    await Storage.setJson(KEYS.settings, { ai: { model: 'x' } });
    await Storage.setJson(KEYS.robotMemory, { userName: 'Bob' });
    await Storage.setJson(KEYS.chatLogs, { messages: [1] });
    await Storage.clearAllCompanionData();
    expect(await Storage.getJson(KEYS.robotMemory)).toBeNull();
    expect(await Storage.getJson(KEYS.chatLogs)).toBeNull();
    expect(await Storage.getJson(KEYS.settings)).toEqual({ ai: { model: 'x' } });
  });

  it('skips migrations when already at SCHEMA_VERSION', async () => {
    prefs[KEYS.schemaVersion] = String(SCHEMA_VERSION);
    await Storage.runMigrations();
    expect(NativeModules.SharedPrefs.setString).not.toHaveBeenCalledWith(
      KEYS.schemaVersion,
      expect.anything()
    );
  });
});
