import { VisionAiService } from '../src/vision/VisionAiService';
import { useTrackingStore } from '../src/store/useTrackingStore';
import { useSettingsStore } from '../src/store/useSettingsStore';
import { useSleepStore } from '../src/store/useSleepStore';

const mockCaptureStill = jest.fn();
const mockHasHost = jest.fn(() => false);
const mockGenerateVision = jest.fn();

jest.mock('../src/robot/RobotController', () => ({
  RobotController: {
    attachStore: jest.fn(),
    setSpeed: jest.fn(),
    setUseDifferentialDrive: jest.fn(),
    requestFollowDrive: jest.fn(),
    start: jest.fn(),
  },
}));

jest.mock('../src/vision/captureStill', () => ({
  captureStill: (...args: any[]) => mockCaptureStill(...args),
  hasStillCaptureHost: () => mockHasHost(),
}));

jest.mock('../src/llm/ChatCompletionService', () => ({
  __esModule: true,
  VisionImageUnsupportedError: class VisionImageUnsupportedError extends Error {
    constructor(m: string) {
      super(m);
      this.name = 'VisionImageUnsupportedError';
    }
  },
  default: {
    generateVisionCompletion: (...args: any[]) => mockGenerateVision(...args),
    generateCompletion: jest.fn(),
  },
}));

describe('VisionAiService', () => {
  beforeEach(() => {
    mockCaptureStill.mockReset();
    mockHasHost.mockReturnValue(false);
    mockGenerateVision.mockReset();
    useSleepStore.setState({ isAsleep: false });
    useSettingsStore.setState({
      ai: {
        ...useSettingsStore.getState().ai,
        allowVisionAi: true,
        visionMaxEdgePx: 768,
        visionModel: '',
        debugSaveVisionStills: false,
      },
    });
    useTrackingStore.getState().reset();
  });

  it('matches see / read / count / find intents', () => {
    expect(VisionAiService.matchIntent('What do you see?')).toBe('see');
    expect(VisionAiService.matchIntent('look around')).toBe('see');
    expect(VisionAiService.matchIntent('describe what you see')).toBe('see');
    expect(VisionAiService.matchIntent('read this text')).toBe('read');
    expect(VisionAiService.matchIntent('how many people')).toBe('count');
    expect(VisionAiService.matchIntent('count people')).toBe('count');
    expect(VisionAiService.matchIntent('find a bottle')).toBe('find');
    expect(VisionAiService.matchIntent('hello there')).toBeNull();
  });

  it('uses pose fallback when allowVisionAi is false (no capture)', async () => {
    useSettingsStore.setState({
      ai: { ...useSettingsStore.getState().ai, allowVisionAi: false },
    });
    useTrackingStore.getState().applySnapshot({
      ...useTrackingStore.getState(),
      personFound: true,
      targetLocked: true,
      offset: -0.2,
      distanceZone: 'MEDIUM',
      lastUpdatedAt: Date.now(),
    });

    const reply = await VisionAiService.answer('What do you see?');
    expect(mockCaptureStill).not.toHaveBeenCalled();
    expect(reply).toMatch(/Vision AI is turned off/i);
    expect(reply).toMatch(/one person/i);
    expect(reply).toMatch(/left/i);
  });

  it('pose fallback when nobody is tracked', () => {
    const reply = VisionAiService.fallbackFromPose('see');
    expect(reply).toMatch(/don't see a person/i);
  });

  it('captures and calls vision LLM when host is present', async () => {
    mockHasHost.mockReturnValue(true);
    mockCaptureStill.mockResolvedValue({
      jpegBase64: 'abc',
      width: 100,
      height: 80,
    });
    mockGenerateVision.mockResolvedValue('I see a desk and a window.');

    const reply = await VisionAiService.answer('What do you see?');
    expect(mockCaptureStill).toHaveBeenCalled();
    expect(mockGenerateVision).toHaveBeenCalled();
    expect(reply).toBe('I see a desk and a window.');
  });
});
