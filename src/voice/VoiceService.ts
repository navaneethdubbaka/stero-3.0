import { NativeModules, NativeEventEmitter, PermissionsAndroid, Platform } from 'react-native';
import { useVoiceStore } from '../store/useVoiceStore';
import { useEmotionStore } from '../store/useEmotionStore';
import { useSettingsStore } from '../store/useSettingsStore';
import { useConversationStore } from '../store/useConversationStore';
import MemoryService from '../memory/MemoryService';
import ContextBuilder from '../llm/ContextBuilder';
import ChatCompletionService from '../llm/ChatCompletionService';

const { VoiceModule } = NativeModules;
const voiceEventEmitter = new NativeEventEmitter(VoiceModule);

class VoiceService {
  private static instance: VoiceService;
  private isListeningToEvents = false;
  private isTransitioningToListen = false;
  private isSpeakingState = false;

  private constructor() {}

  public static getInstance(): VoiceService {
    if (!VoiceService.instance) {
      VoiceService.instance = new VoiceService();
    }
    return VoiceService.instance;
  }

  public async requestPermissions(): Promise<boolean> {
    if (Platform.OS !== 'android') return false;
    try {
      const granted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
        {
          title: 'Microphone Permission',
          message: 'ABIOGENESIS companion needs microphone access for wake word and speech recognition.',
          buttonNeutral: 'Ask Me Later',
          buttonNegative: 'Cancel',
          buttonPositive: 'OK',
        }
      );
      return granted === PermissionsAndroid.RESULTS.GRANTED;
    } catch (err) {
      console.warn(err);
      return false;
    }
  }

  private stripMarkdown(text: string): string {
    return text
      .replace(/[#*`_~]/g, '')                // remove markdown characters like #, *, `, _, ~
      .replace(/\[([^\]]+)\]\([^\)]+\)/g, '$1') // replace [text](url) with text
      .replace(/-\s+/g, '')                  // remove list bullet points
      .replace(/\s+/g, ' ')                  // normalize spaces
      .trim();
  }

  public setupEventListeners() {
    if (this.isListeningToEvents) return;

    // 1. Wake word detected
    voiceEventEmitter.addListener('onWakeWordDetected', async (data) => {
      console.log('VoiceService: onWakeWordDetected', data);
      if (this.isTransitioningToListen) return;
      this.isTransitioningToListen = true;

      const voiceStore = useVoiceStore.getState();
      const emotionStore = useEmotionStore.getState();

      voiceStore.setWakeWordDetected(true);
      emotionStore.setEmotion('HAPPY');

      if (this.isSpeakingState) {
        console.log('VoiceService: Wake word detected during speech. Interrupting TTS...');
        await this.stopSpeaking();
      }

      // Releasing microphone by stopping wake word engine before starting speech recognition
      await this.stopWakeWordDetection();
      
      // Let the happy face stay on screen for a moment
      setTimeout(async () => {
        emotionStore.setEmotion('LISTENING');
        voiceStore.setListening(true);
        await this.startSpeechRecognition();
      }, 1200);
    });

    // 2. Speech recognition partial result
    voiceEventEmitter.addListener('onSpeechPartialResult', (data) => {
      console.log('VoiceService: onSpeechPartialResult', data);
      useVoiceStore.getState().setRecognizedText(data.text);
    });

    // 3. Speech recognition final result
    voiceEventEmitter.addListener('onSpeechRecognized', async (data) => {
      console.log('VoiceService: onSpeechRecognized', data);
      this.isTransitioningToListen = false; // Reset flag

      const voiceStore = useVoiceStore.getState();
      const emotionStore = useEmotionStore.getState();

      voiceStore.setRecognizedText(data.text);
      voiceStore.setListening(false);
      
      if (data.text && data.text.trim().length > 0) {
        emotionStore.setEmotion('THINKING');
        await this.handleUserUtterance(data.text);
      } else {
        // Empty text, go back to idle and restart wake word
        emotionStore.setEmotion('IDLE');
        await this.startWakeWordDetection();
      }
    });

    // 4. Speech recognition error
    voiceEventEmitter.addListener('onSpeechError', async (error) => {
      console.warn('VoiceService: onSpeechError', error);
      this.isTransitioningToListen = false; // Reset flag

      const voiceStore = useVoiceStore.getState();
      const emotionStore = useEmotionStore.getState();

      voiceStore.setListening(false);
      
      // Show sad/confused look, then restart wake word detection
      emotionStore.setEmotion('CONFUSED');
      setTimeout(async () => {
        emotionStore.setEmotion('IDLE');
        await this.startWakeWordDetection();
      }, 2000);
    });

    // 5. TTS events
    voiceEventEmitter.addListener('onTtsStarted', async (data) => {
      console.log('VoiceService: onTtsStarted', data);
      this.isSpeakingState = true;
      useEmotionStore.getState().setEmotion('SPEAKING');
      
      // Keep wake word engine running during speech so the user can say "Sonic" to interrupt!
      await VoiceModule.startWakeWordDetection();
    });

    voiceEventEmitter.addListener('onTtsFinished', async (data) => {
      console.log('VoiceService: onTtsFinished', data);
      this.isSpeakingState = false;
      if (!this.isTransitioningToListen) {
        useEmotionStore.getState().setEmotion('IDLE');
        await this.startWakeWordDetection();
      }
    });

    voiceEventEmitter.addListener('onTtsStopped', async (data) => {
      console.log('VoiceService: onTtsStopped', data);
      this.isSpeakingState = false;
      if (!this.isTransitioningToListen) {
        useEmotionStore.getState().setEmotion('IDLE');
        await this.startWakeWordDetection();
      }
    });

    voiceEventEmitter.addListener('onTtsError', async (data) => {
      console.warn('VoiceService: onTtsError', data);
      this.isSpeakingState = false;
      if (!this.isTransitioningToListen) {
        useEmotionStore.getState().setEmotion('IDLE');
        await this.startWakeWordDetection();
      }
    });

    this.isListeningToEvents = true;
    console.log('VoiceService: Native event listeners registered.');
  }

  public async startWakeWordDetection(): Promise<boolean> {
    try {
      const hasPermission = await this.requestPermissions();
      if (!hasPermission) {
        console.warn('VoiceService: Audio recording permission denied.');
        return false;
      }
      this.setupEventListeners();
      
      const settings = useSettingsStore.getState().voice;
      await VoiceModule.setVoiceSettings(settings.speechRate, settings.volume);
      
      useVoiceStore.getState().resetVoiceState();
      await VoiceModule.startWakeWordDetection();
      console.log('VoiceService: Wake word detection started.');
      return true;
    } catch (e) {
      console.error('VoiceService: Failed to start wake word detection', e);
      return false;
    }
  }

  public async stopWakeWordDetection(): Promise<void> {
    try {
      await VoiceModule.stopWakeWordDetection();
      console.log('VoiceService: Wake word detection stopped.');
    } catch (e) {
      console.error('VoiceService: Failed to stop wake word detection', e);
    }
  }

  public async startSpeechRecognition(): Promise<void> {
    try {
      await VoiceModule.startSpeechRecognition();
      console.log('VoiceService: Speech recognition started.');
    } catch (e) {
      console.error('VoiceService: Failed to start speech recognition', e);
    }
  }

  public async stopSpeechRecognition(): Promise<void> {
    try {
      await VoiceModule.stopSpeechRecognition();
    } catch (e) {
      console.error('VoiceService: Failed to stop speech recognition', e);
    }
  }

  public async speak(text: string): Promise<string> {
    try {
      const settings = useSettingsStore.getState().voice;
      await VoiceModule.setVoiceSettings(settings.speechRate, settings.volume);
      const cleanText = this.stripMarkdown(text);
      console.log(`VoiceService: Speaking: "${cleanText}" (Original: "${text}") using voice: "${settings.voice}"`);
      const utteranceId = await VoiceModule.speak(cleanText, settings.voice || '');
      return utteranceId;
    } catch (e) {
      console.error('VoiceService: Failed to speak text', e);
      return '';
    }
  }

  public async stopSpeaking(): Promise<void> {
    try {
      await VoiceModule.stopSpeaking();
    } catch (e) {
      console.error('VoiceService: Failed to stop speaking', e);
    }
  }

  private async handleUserUtterance(text: string): Promise<void> {
    const conversationStore = useConversationStore.getState();

    // 1. Run memory heuristics on user input to extract any names or preferences
    MemoryService.parseBasicHeuristics(text);

    // 2. Build final prompt payload (combining system instructions, memory context, and history)
    const messages = ContextBuilder.buildContext(text);

    // 3. Add user message to conversation history
    conversationStore.addMessage('user', text);

    try {
      console.log('VoiceService: Sending request to ChatCompletionService:', messages);

      // 4. Request completion
      const assistantText = await ChatCompletionService.generateCompletion(messages);
      
      // 5. Add assistant message to history
      conversationStore.addMessage('assistant', assistantText);

      // 6. Read assistant response out loud (TTS)
      await this.speak(assistantText);

    } catch (error: any) {
      console.error('VoiceService: LLM Error', error);
      conversationStore.addMessage('system', `Error: ${error.message}`);
      await this.speak('Sorry, I had trouble connecting to my brain.');
    }
  }
}

export default VoiceService.getInstance();
