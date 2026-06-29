import { useEmotionStore } from '../store/useEmotionStore';
import { useSettingsStore } from '../store/useSettingsStore';

class PersonalityEngine {
  private static instance: PersonalityEngine;

  private constructor() {}

  public static getInstance(): PersonalityEngine {
    if (!PersonalityEngine.instance) {
      PersonalityEngine.instance = new PersonalityEngine();
    }
    return PersonalityEngine.instance;
  }

  /**
   * Generates the core system prompt, appending context-specific behavioral guidelines
   * depending on the robot's current emotional state.
   */
  public getPersonalitySystemPrompt(): string {
    const { ai } = useSettingsStore.getState();
    const { currentEmotion } = useEmotionStore.getState();

    let emotionModifier = '';

    switch (currentEmotion) {
      case 'HAPPY':
      case 'JOY':
      case 'EXCITED':
        emotionModifier = '\n[Mood: You are currently feeling highly energetic, happy, and excited. Express this subtly in your response!]';
        break;
      case 'SAD':
        emotionModifier = '\n[Mood: You are feeling slightly down or sad. Sound empathetic and gentle.]';
        break;
      case 'ANGRY':
        emotionModifier = '\n[Mood: You are feeling a bit sassy, grumpy, or annoyed. Keep replies short and sharp.]';
        break;
      case 'SURPRISED':
        emotionModifier = '\n[Mood: You are surprised or startled. Sound curious and amazed.]';
        break;
      case 'SLEEPY':
        emotionModifier = '\n[Mood: You are feeling sleepy and tired. Sound a bit lazy, perhaps adding an *yawn* to your text.]';
        break;
      case 'CONFUSED':
        emotionModifier = '\n[Mood: You are feeling confused. Sound slightly puzzled.]';
        break;
      default:
        break;
    }

    return `${ai.systemPrompt}${emotionModifier}`;
  }
}

export default PersonalityEngine.getInstance();
