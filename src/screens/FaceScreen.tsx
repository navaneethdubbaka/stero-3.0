import React, { useState, useEffect, useRef } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, ScrollView, TouchableWithoutFeedback } from 'react-native';
import { FaceEngine } from '../face/FaceEngine';
import { useEmotionStore, EmotionType, startBlinkingLoop, stopBlinkingLoop } from '../store/useEmotionStore';

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

export const FaceScreen: React.FC = () => {
  const { currentEmotion, setEmotion, isSpeaking, setSpeaking } = useEmotionStore();
  const [showTray, setShowTray] = useState(false);
  const [menuVisible, setMenuVisible] = useState(false);
  const lastTap = useRef<number>(0);

  // Start the blinking loop on mount and stop on unmount
  useEffect(() => {
    startBlinkingLoop();
    return () => {
      stopBlinkingLoop();
    };
  }, []);

  const handleDoubleTap = () => {
    const now = Date.now();
    const DOUBLE_TAP_DELAY = 300;
    if (now - lastTap.current < DOUBLE_TAP_DELAY) {
      setMenuVisible((prev) => !prev);
    }
    lastTap.current = now;
  };

  return (
    <TouchableWithoutFeedback onPress={handleDoubleTap}>
      <View style={styles.container}>
        {/* Full-screen Face Canvas */}
        <FaceEngine />

        {/* Floating Toggle Button for Debug Tray */}
        {menuVisible && (
          <TouchableOpacity
            style={styles.floatingButton}
            onPress={() => setShowTray(!showTray)}
            activeOpacity={0.8}
          >
            <Text style={styles.floatingButtonText}>{showTray ? '✕' : '⚙'}</Text>
          </TouchableOpacity>
        )}

        {/* Glassmorphic Debug Tray */}
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
  floatingButtonText: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: 'bold',
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
});
