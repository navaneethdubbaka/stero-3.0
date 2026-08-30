import { useMemoryStore } from '../store/useMemoryStore';

class MemoryService {
  private static instance: MemoryService;

  private constructor() {}

  public static getInstance(): MemoryService {
    if (!MemoryService.instance) {
      MemoryService.instance = new MemoryService();
    }
    return MemoryService.instance;
  }

  getUserName(): string {
    return useMemoryStore.getState().userName;
  }

  setUserName(name: string): void {
    useMemoryStore.getState().setUserName(name);
  }

  getPreferences(): string {
    return useMemoryStore.getState().userPreferences;
  }

  setPreferences(prefs: string): void {
    useMemoryStore.getState().setUserPreferences(prefs);
  }

  getFacts(): string[] {
    return [...useMemoryStore.getState().facts];
  }

  addFact(fact: string): void {
    useMemoryStore.getState().addFact(fact);
  }

  clearMemory(): void {
    useMemoryStore.getState().clearMemory();
  }

  getFriendshipLevel(): number {
    return useMemoryStore.getState().friendshipLevel;
  }

  /**
   * Lightweight rapport bump after a successful user→assistant turn.
   */
  noteSuccessfulDialogue(): void {
    const { friendshipLevel, updateFriendshipLevel } = useMemoryStore.getState();
    updateFriendshipLevel(Math.min(100, friendshipLevel + 1));
  }

  /**
   * Formats the stored memories into a clean text block for the LLM system prompt.
   */
  public getMemoryContext(): string {
    const { userName, userPreferences, facts, friendshipLevel } =
      useMemoryStore.getState();
    const parts: string[] = [];

    if (userName) {
      parts.push(`User Name: ${userName}`);
    }
    if (userPreferences) {
      parts.push(`User Preferences: ${userPreferences}`);
    }
    if (facts.length > 0) {
      parts.push('Facts learned about user:\n' + facts.map((f) => `- ${f}`).join('\n'));
    }
    parts.push(`Friendship/Rapport Level: ${friendshipLevel}/100`);

    return `### COMPANION MEMORY ENGINE\n${parts.join('\n\n')}\n---`;
  }

  /**
   * Snapshot for Settings LOGS UI.
   */
  getSnapshot(): {
    userName: string;
    userPreferences: string;
    facts: string[];
    friendshipLevel: number;
  } {
    const s = useMemoryStore.getState();
    return {
      userName: s.userName,
      userPreferences: s.userPreferences,
      facts: [...s.facts],
      friendshipLevel: s.friendshipLevel,
    };
  }

  /**
   * Check user utterance for simple settings changes like names or preferences.
   */
  public parseBasicHeuristics(userUtterance: string): void {
    const nameMatch = userUtterance.match(
      /(?:my name is|call me|i am|i'm)\s+([A-Za-z\s]+)/i
    );
    if (nameMatch && nameMatch[1]) {
      const name = nameMatch[1].trim();
      const capitalized = name
        .split(' ')
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
        .join(' ');

      if (
        capitalized.split(' ').length <= 3 &&
        !['sorry', 'fine', 'ready', 'happy', 'sad'].includes(capitalized.toLowerCase())
      ) {
        useMemoryStore.getState().setUserName(capitalized);
        console.log(`MemoryService: Extracted user name from utterance: "${capitalized}"`);
      }
    }

    const prefMatch = userUtterance.match(
      /(?:my favorite|i love|i like)\s+([A-Za-z\s]+)/i
    );
    if (prefMatch && prefMatch[1]) {
      const pref = prefMatch[1].trim();
      if (pref.split(' ').length <= 6) {
        useMemoryStore.getState().addFact(`User likes/loves: ${pref}`);
      }
    }
  }
}

export default MemoryService.getInstance();
