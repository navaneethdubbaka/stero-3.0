import React, { useState, useEffect, useRef } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, ScrollView, TouchableWithoutFeedback, NativeModules, NativeEventEmitter } from 'react-native';
import { FaceEngine } from '../face/FaceEngine';
import { useEmotionStore, EmotionType, startBlinkingLoop, stopBlinkingLoop } from '../store/useEmotionStore';
import { useSleepStore } from '../store/useSleepStore';
import { useNotificationStore } from '../store/useNotificationStore';
import { useRobotStore } from '../store/useRobotStore';
import { useFollowStore } from '../store/useFollowStore';
import { useCompanionStore } from '../store/useCompanionStore';
import { useDanceStore } from '../store/useDanceStore';
import { FollowMode } from '../robot/FollowMode';
import { DanceMode } from '../robot/DanceMode';
import { VisionCameraView } from '../vision/VisionCameraView';
import { TrackingEngine } from '../vision/TrackingEngine';
import EmotionRuleEngine from '../services/EmotionRuleEngine';
import VoiceService from '../voice/VoiceService';
import SleepSystem from '../services/SleepSystem';
import IdleBehaviorEngine from '../services/IdleBehaviorEngine';
import { NotificationOverlay } from '../components/NotificationOverlay';
import { useDeviceHealthStore } from '../utils/deviceHealth';
import { setFaceBrightness, restoreFaceBrightness } from '../utils/deviceHealth';
import { useSettingsStore } from '../store/useSettingsStore';

const { NotificationModule } = NativeModules;
const notificationEmitter = new NativeEventEmitter(NotificationModule);

const EMOTIONS: EmotionType[] = [
  'IDLE',
  'HAPPY',
  'LISTENING',
  'THINKING',
  'SPEAKING',
  'SLEEPY',
  'SURPRISED',
  'SAD',
  'ANGRY',
  'EXCITED',
  'JOY',
  'CONFUSED',
  'ALERT',
  'MESSAGE',
  'LOW_BATTERY',
  'HEART',
  'MAIL',
  'WINKING',
  'DEAD',
];

const LONG_PRESS_MS = 600;
const PERSON_FOUND_THROTTLE_MS = 8000;
const PERSON_FOUND_ALERT_MS = 800;

export const FaceScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const currentEmotion = useEmotionStore((state) => state.currentEmotion);
  const setEmotion = useEmotionStore((state) => state.setEmotion);
  const isSpeaking = useEmotionStore((state) => state.isSpeaking);
  const setSpeaking = useEmotionStore((state) => state.setSpeaking);
  const isAsleep = useSleepStore((state) => state.isAsleep);
  const emergencyActive = useRobotStore((state) => state.emergencyActive);
  const emergencyStop = useRobotStore((state) => state.emergencyStop);
  const clearEmergency = useRobotStore((state) => state.clearEmergency);
  const isConnected = useRobotStore((state) => state.isConnected);
  const followEnabled = useFollowStore((state) => state.enabled);
  const followStatus = useFollowStore((state) => state.status);
  const companionState = useCompanionStore((state) => state.state);
  const danceEnabled = useDanceStore((state) => state.enabled);
  const danceStatus = useDanceStore((state) => state.status);
  const danceRoutine = useDanceStore((state) => state.routineId);
  const thermalSevere = useDeviceHealthStore((s) => s.thermalSevere);
  const lowBattery = useDeviceHealthStore((s) => s.lowBattery);
  const brightness = useSettingsStore((s) => s.display.brightness);

  const [showTray, setShowTray] = useState(false);
  const [menuVisible, setMenuVisible] = useState(false);
  const lastTap = useRef<number>(0);
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const longPressFired = useRef(false);
  const lastPersonFoundPing = useRef<number>(0);

  useEffect(() => {
    startBlinkingLoop();
    VoiceService.startWakeWordDetection();
    SleepSystem.start();
    IdleBehaviorEngine.start();

    let subscription: any;
    try {
      subscription = notificationEmitter.addListener('onNotificationReceived', (event) => {
        console.log('FaceScreen: Received notification event:', event);

        let source: 'WhatsApp' | 'Telegram' | 'SMS' | 'Call' | 'Email' | 'Calendar' | 'System' = 'System';
        const pkg = event.packageName.toLowerCase();

        if (pkg.includes('whatsapp')) source = 'WhatsApp';
        else if (pkg.includes('telegram')) source = 'Telegram';
        else if (pkg.includes('mms') || pkg.includes('sms') || pkg.includes('messaging')) source = 'SMS';
        else if (pkg.includes('dialer') || pkg.includes('phone') || pkg.includes('telecom')) source = 'Call';

        useNotificationStore.getState().addNotification({
          source,
          sender: event.title || 'Notification',
          message: event.text || '',
        });

        SleepSystem.reportActivity();
      });
    } catch (err) {
      console.warn('FaceScreen: Failed to setup notification listener', err);
    }

    const unsubTracking = TrackingEngine.subscribe((event) => {
      if (event !== 'PERSON_FOUND') return;
      const { currentEmotion: emo } = useEmotionStore.getState();
      if (emo !== 'IDLE') return;
      const now = Date.now();
      if (now - lastPersonFoundPing.current < PERSON_FOUND_THROTTLE_MS) return;
      lastPersonFoundPing.current = now;
      EmotionRuleEngine.triggerEvent('PERSON_FOUND');
      setTimeout(() => {
        if (useEmotionStore.getState().currentEmotion === 'ALERT') {
          useEmotionStore.getState().setEmotion('IDLE');
        }
      }, PERSON_FOUND_ALERT_MS);
    });

    return () => {
      stopBlinkingLoop();
      VoiceService.stopWakeWordDetection();
      VoiceService.stopSpeaking();
      SleepSystem.stop();
      IdleBehaviorEngine.stop();
      unsubTracking();
      if (subscription) {
        subscription.remove();
      }
      if (longPressTimer.current) {
        clearTimeout(longPressTimer.current);
      }
      if (!FollowMode.isEnabled()) {
        TrackingEngine.reset();
      }
    };
  }, []);

  useEffect(() => {
    setFaceBrightness(brightness);
    return () => {
      restoreFaceBrightness();
    };
  }, [brightness]);

  // Pause blink loop while asleep (videos pause in FaceEngine)
  useEffect(() => {
    if (isAsleep) {
      stopBlinkingLoop();
    } else {
      startBlinkingLoop();
    }
  }, [isAsleep]);

  const clearLongPress = () => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  };

  const handlePressIn = () => {
    longPressFired.current = false;
    clearLongPress();
    longPressTimer.current = setTimeout(() => {
      longPressFired.current = true;
      emergencyStop();
      SleepSystem.reportActivity();
    }, LONG_PRESS_MS);
  };

  const handlePressOut = () => {
    const wasLongPress = longPressFired.current;
    clearLongPress();
    if (wasLongPress) {
      return;
    }
    handleScreenPress();
  };

  const handleScreenPress = () => {
    SleepSystem.reportActivity();

    const now = Date.now();
    const DOUBLE_TAP_DELAY = 300;
    if (now - lastTap.current < DOUBLE_TAP_DELAY) {
      setMenuVisible((prev) => !prev);
    }
    lastTap.current = now;
  };

  const handlePoseDetected = (event: any) => {
    TrackingEngine.ingest(event.nativeEvent);
  };

  return (
    <TouchableWithoutFeedback onPressIn={handlePressIn} onPressOut={handlePressOut}>
      <View style={styles.container}>
        <FaceEngine thermalSevere={thermalSevere} />

        {/*
          Hidden pose host for gaze + Follow while Face is foreground.
          Unmounted in sleep, or when thermal is severe and Follow is off.
        */}
        {!isAsleep && !(thermalSevere && !followEnabled) && (
          <VisionCameraView
            style={styles.hiddenCamera}
            onPoseDetected={handlePoseDetected}
          />
        )}

        <NotificationOverlay />

        {isAsleep && (
          <View style={styles.dimmingOverlay} pointerEvents="none" />
        )}

        {emergencyActive && (
          <View style={styles.estopBanner} pointerEvents="none">
            <Text style={styles.estopBannerText}>E-STOP ACTIVE — clear from menu</Text>
          </View>
        )}

        {lowBattery && !emergencyActive && (
          <View style={styles.estopBanner} pointerEvents="none">
            <Text style={styles.estopBannerText}>LOW BATTERY — I need to charge</Text>
          </View>
        )}

        <View style={styles.companionChipWrap} pointerEvents="none">
          <View style={[styles.companionChip, menuVisible && styles.companionChipActive]}>
            <Text style={styles.companionChipText}>{companionState}</Text>
          </View>
        </View>

        {menuVisible && (
          <>
            <TouchableOpacity
              style={styles.floatingBackButton}
              onPress={() => navigation.navigate('Home')}
              activeOpacity={0.8}
            >
              <Text style={styles.floatingButtonText}>🏠</Text>
            </TouchableOpacity>
            {emergencyActive ? (
              <TouchableOpacity
                style={styles.floatingClearEstop}
                onPress={clearEmergency}
                activeOpacity={0.8}
              >
                <Text style={styles.floatingEstopText}>CLEAR</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={styles.floatingEstop}
                onPress={emergencyStop}
                activeOpacity={0.8}
              >
                <Text style={styles.floatingEstopText}>E-STOP</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={styles.floatingButton}
              onPress={() => setShowTray(!showTray)}
              activeOpacity={0.8}
            >
              <Text style={styles.floatingButtonText}>{showTray ? '✕' : '⚙'}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.floatingFollow,
                followEnabled ? styles.floatingFollowOn : styles.floatingFollowOff,
              ]}
              onPress={() => {
                if (FollowMode.isEnabled()) {
                  FollowMode.stop();
                } else if (isConnected) {
                  FollowMode.start();
                }
              }}
              activeOpacity={0.8}
            >
              <Text style={styles.floatingEstopText}>
                {followEnabled
                  ? `FOLLOW ${followStatus}`
                  : lowBattery
                    ? 'CHARGE'
                    : isConnected
                      ? 'FOLLOW'
                      : 'NO USB'}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.floatingDance,
                danceEnabled ? styles.floatingDanceOn : styles.floatingDanceOff,
              ]}
              onPress={() => {
                if (DanceMode.isEnabled()) {
                  DanceMode.stop('ui');
                } else {
                  DanceMode.start('spin_happy');
                }
              }}
              activeOpacity={0.8}
            >
              <Text style={styles.floatingEstopText}>
                {danceEnabled
                  ? `DANCE ${danceRoutine ?? danceStatus}`
                  : 'DANCE'}
              </Text>
            </TouchableOpacity>
          </>
        )}

        {menuVisible && showTray && (
          <View style={styles.tray}>
            <Text style={styles.trayTitle}>Robot Emotion Controls</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.scrollContent}
            >
              {EMOTIONS.map((emotion) => (
                <TouchableOpacity
                  key={emotion}
                  style={[
                    styles.button,
                    currentEmotion === emotion && styles.activeButton,
                  ]}
                  onPress={() => setEmotion(emotion)}
                  activeOpacity={0.7}
                >
                  <Text
                    style={[
                      styles.buttonText,
                      currentEmotion === emotion && styles.activeButtonText,
                    ]}
                  >
                    {emotion}
                  </Text>
                </TouchableOpacity>
              ))}

              <TouchableOpacity
                style={[styles.button, isSpeaking && styles.activeButtonSpeaking]}
                onPress={() => setSpeaking(!isSpeaking)}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    styles.buttonText,
                    isSpeaking && styles.activeButtonText,
                  ]}
                >
                  {isSpeaking ? 'STOP TALK' : 'START TALK'}
                </Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        )}
      </View>
    </TouchableWithoutFeedback>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  companionChipWrap: {
    position: 'absolute',
    top: 10,
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 5,
  },
  companionChip: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
  },
  companionChipActive: {
    backgroundColor: 'rgba(255, 255, 255, 0.16)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.22)',
  },
  companionChipText: {
    color: 'rgba(255, 255, 255, 0.55)',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.8,
    textAlign: 'center',
  },
  hiddenCamera: {
    position: 'absolute',
    width: 1,
    height: 1,
    opacity: 0,
    left: 0,
    top: 0,
    zIndex: -1,
  },
  floatingBackButton: {
    position: 'absolute',
    top: 20,
    left: 20,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.25)',
    zIndex: 10,
  },
  floatingEstop: {
    position: 'absolute',
    top: 20,
    left: 74,
    height: 44,
    paddingHorizontal: 12,
    borderRadius: 22,
    backgroundColor: '#B00020',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#FF3C3C',
    zIndex: 10,
  },
  floatingClearEstop: {
    position: 'absolute',
    top: 20,
    left: 74,
    height: 44,
    paddingHorizontal: 12,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 180, 0, 0.35)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#FFB400',
    zIndex: 10,
  },
  floatingEstopText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  floatingButton: {
    position: 'absolute',
    top: 20,
    right: 20,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.25)',
    zIndex: 10,
  },
  floatingFollow: {
    position: 'absolute',
    top: 72,
    right: 20,
    height: 36,
    paddingHorizontal: 12,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    zIndex: 10,
  },
  floatingFollowOff: {
    backgroundColor: 'rgba(0, 255, 200, 0.2)',
    borderColor: 'rgba(0, 255, 200, 0.45)',
  },
  floatingFollowOn: {
    backgroundColor: 'rgba(0, 255, 200, 0.45)',
    borderColor: '#00FFC8',
  },
  floatingDance: {
    position: 'absolute',
    top: 116,
    right: 20,
    height: 36,
    paddingHorizontal: 12,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    zIndex: 10,
  },
  floatingDanceOff: {
    backgroundColor: 'rgba(255, 120, 200, 0.2)',
    borderColor: 'rgba(255, 120, 200, 0.45)',
  },
  floatingDanceOn: {
    backgroundColor: 'rgba(255, 120, 200, 0.5)',
    borderColor: '#FF78C8',
  },
  floatingButtonText: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: 'bold',
  },
  estopBanner: {
    position: 'absolute',
    top: 72,
    left: 20,
    right: 20,
    backgroundColor: 'rgba(176, 0, 32, 0.85)',
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    zIndex: 9,
  },
  estopBannerText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
    textAlign: 'center',
  },
  tray: {
    position: 'absolute',
    bottom: 20,
    left: 20,
    right: 20,
    backgroundColor: 'rgba(20, 20, 20, 0.75)',
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 8,
  },
  trayTitle: {
    color: 'rgba(255, 255, 255, 0.6)',
    fontSize: 12,
    fontWeight: 'bold',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  scrollContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
  },
  button: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    marginRight: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  activeButton: {
    backgroundColor: '#00FFFF',
    borderColor: '#00FFFF',
  },
  activeButtonSpeaking: {
    backgroundColor: '#FF007F',
    borderColor: '#FF007F',
  },
  buttonText: {
    color: '#D0D0D0',
    fontSize: 13,
    fontWeight: '600',
  },
  activeButtonText: {
    color: '#000000',
    fontWeight: 'bold',
  },
  dimmingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    zIndex: 999,
  },
});
