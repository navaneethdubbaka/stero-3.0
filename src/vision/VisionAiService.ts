import ChatCompletionService, {
  VisionImageUnsupportedError,
} from '../llm/ChatCompletionService';
import type { ChatMessage } from '../llm/LlmClient';
import { useSettingsStore } from '../store/useSettingsStore';
import { useTrackingStore } from '../store/useTrackingStore';
import { useSleepStore } from '../store/useSleepStore';
import { captureStill, hasStillCaptureHost } from './captureStill';

export type VisionIntent = 'see' | 'read' | 'count' | 'find';

const SYSTEM_VISION =
  'You are ABIOGENESIS, a friendly robot companion. Describe only what is visible in the attached camera still. Keep answers short (1–3 sentences). Do not invent details. Never store or request personal data.';

class VisionAiServiceImpl {
  matchIntent(text: string): VisionIntent | null {
    const t = text.trim();
    if (!t) return null;

    if (
      /what\s+do\s+you\s+see/i.test(t) ||
      /look\s+around/i.test(t) ||
      /describe(\s+what\s+you\s+see)?/i.test(t) ||
      /what('?s|\s+is)\s+(in\s+front|around)/i.test(t)
    ) {
      return 'see';
    }
    if (/read(\s+this|\s+the\s+text)?/i.test(t) || /what\s+does\s+(it|this)\s+say/i.test(t)) {
      return 'read';
    }
    if (
      /count\s+(the\s+)?people/i.test(t) ||
      /how\s+many\s+people/i.test(t) ||
      /how\s+many\s+(persons|humans)/i.test(t)
    ) {
      return 'count';
    }
    if (/\bfind\s+(a|an|the)\s+\w+/i.test(t) || /\blook\s+for\s+(a|an|the)\s+\w+/i.test(t)) {
      return 'find';
    }
    return null;
  }

  async answer(text: string): Promise<string> {
    const intent = this.matchIntent(text);
    if (!intent) {
      return 'I am not sure what you want me to look at.';
    }

    const { ai } = useSettingsStore.getState();
    const asleep = useSleepStore.getState().isAsleep;

    if (asleep) {
      return 'I am sleepy and the camera is off. Wake me first.';
    }

    if (!ai.allowVisionAi) {
      return this.fallbackFromPose(intent, 'Vision AI is turned off in Settings.');
    }

    if (!hasStillCaptureHost()) {
      return this.fallbackFromPose(
        intent,
        'Open Face or Vision so I can see, then ask again.'
      );
    }

    try {
      const still = await captureStill({
        maxEdgePx: ai.visionMaxEdgePx || 768,
        jpegQuality: 75,
        saveDebug: !!ai.debugSaveVisionStills,
      });

      const prompt = this.buildIntentPrompt(intent, text);
      const messages: ChatMessage[] = [
        { role: 'system', content: SYSTEM_VISION },
        {
          role: 'user',
          content: [
            { type: 'text', text: prompt },
            {
              type: 'image_url',
              image_url: {
                url: `data:image/jpeg;base64,${still.jpegBase64}`,
              },
            },
          ],
        },
      ];

      try {
        const reply = await ChatCompletionService.generateVisionCompletion(messages);
        return reply.trim() || this.fallbackFromPose(intent);
      } catch (err: any) {
        if (err instanceof VisionImageUnsupportedError) {
          console.warn('VisionAiService: provider rejected image, using pose fallback');
          return this.fallbackFromPose(
            intent,
            'My vision model could not read the photo.'
          );
        }
        console.warn('VisionAiService: vision LLM failed, pose fallback', err);
        return this.fallbackFromPose(intent, 'I could not reach the vision model.');
      }
    } catch (captureErr: any) {
      console.warn('VisionAiService: capture failed', captureErr);
      if (captureErr?.message === 'NO_CAMERA') {
        return this.fallbackFromPose(
          intent,
          'Open Face or Vision so I can see, then ask again.'
        );
      }
      return this.fallbackFromPose(intent, 'I could not grab a camera frame.');
    }
  }

  private buildIntentPrompt(intent: VisionIntent, utterance: string): string {
    switch (intent) {
      case 'see':
        return `The user asked: "${utterance}". Briefly describe what you see in this camera frame.`;
      case 'read':
        return `The user asked: "${utterance}". Read any clearly visible text in this frame. If none, say so.`;
      case 'count':
        return `The user asked: "${utterance}". Count how many people are visible in this frame.`;
      case 'find':
        return `The user asked: "${utterance}". Look for the object they named and say if you see it and where roughly.`;
      default:
        return utterance;
    }
  }

  /**
   * Text-only summary from MediaPipe pose metrics when images are unavailable.
   */
  fallbackFromPose(intent: VisionIntent, preface?: string): string {
    const snap = useTrackingStore.getState();
    const parts: string[] = [];
    if (preface) parts.push(preface);

    if (!snap.personFound && !snap.targetLocked) {
      parts.push("I don't see a person in pose tracking right now.");
      return parts.join(' ');
    }

    const dist =
      snap.distanceZone === 'CLOSE'
        ? 'close'
        : snap.distanceZone === 'MEDIUM'
          ? 'medium distance'
          : 'far away';

    let side = 'roughly centered';
    if (snap.offset < -0.08) side = 'slightly to your left';
    else if (snap.offset > 0.08) side = 'slightly to your right';

    if (intent === 'count') {
      parts.push(
        `Pose tracking sees about one person, ${dist}, ${side}. I cannot count more precisely without a vision model.`
      );
    } else if (intent === 'read') {
      parts.push(
        `I see one person (${dist}, ${side}), but I cannot read text without a vision-capable model.`
      );
    } else if (intent === 'find') {
      parts.push(
        `Pose tracking only confirms a person (${dist}, ${side}). I cannot search for objects without a vision model.`
      );
    } else {
      parts.push(`I see one person, roughly ${dist}, ${side}.`);
    }

    return parts.join(' ');
  }
}

export const VisionAiService = new VisionAiServiceImpl();
export default VisionAiService;
