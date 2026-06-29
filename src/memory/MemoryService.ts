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

  /**
   * Formats the stored memories into a clean text block to be injected into the LLM system prompt context.
   */
  public getMemoryContext(): string {
    const { userName, userPreferences, facts, friendshipLevel } = useMemoryStore.getState();
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
   * Check user utterance for simple settings changes like names or basic preference statements.
   */
  public parseBasicHeuristics(userUtterance: string): void {
    // Match "my name is [name]" or "call me [name]" or "i am [name]"
    const nameMatch = userUtterance.match(/(?:my name is|call me|i am|i'm)\s+([A-Za-z\s]+)/i);
    if (nameMatch && nameMatch[1]) {
      const name = nameMatch[1].trim();
      // Capitalize first letter of each word
      const capitalized = name
        .split(' ')
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
        .join(' ');
        
      if (capitalized.split(' ').length <= 3 && !['sorry', 'fine', 'ready', 'happy', 'sad'].includes(capitalized.toLowerCase())) {
        useMemoryStore.getState().setUserName(capitalized);
        console.log(`MemoryService: Extracted user name from utterance: "${capitalized}"`);
      }
    }

    // Match basic preferences like "my favorite color is [color]"
    const prefMatch = userUtterance.match(/(?:my favorite|i love|i like)\s+([A-Za-z\s]+)/i);
    if (prefMatch && prefMatch[1]) {
      const pref = prefMatch[1].trim();
      if (pref.split(' ').length <= 6) {
        useMemoryStore.getState().addFact(`User likes/loves: ${pref}`);
      }
    }
  }
}

export default MemoryService.getInstance();
