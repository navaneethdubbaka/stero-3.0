import React, { useState, useEffect, useRef } from 'react';
import { StyleSheet, View, Animated } from 'react-native';
import Video from 'react-native-video';
import { useEmotionStore, EmotionType } from '../store/useEmotionStore';
import { useSleepStore } from '../store/useSleepStore';
import { GazeOverlay } from './GazeOverlay';

const CROSSFADE_MS = 280;
const LID_CLOSE_MS = 140;

const emotionVideos: Record<EmotionType, any> = {
  IDLE: require('../assets/faces/normal.mp4'),
  HAPPY: require('../assets/faces/pleased.mp4'),
  LISTENING: require('../assets/faces/voice.mp4'),
  THINKING: require('../assets/faces/loading.mp4'),
  SPEAKING: require('../assets/faces/voice.mp4'),
  SURPRISED: require('../assets/faces/surprised.mp4'),
  SLEEPY: require('../assets/faces/snoozing.mp4'),
  SAD: require('../assets/faces/sad.mp4'),
  ANGRY: require('../assets/faces/angry.mp4'),
  EXCITED: require('../assets/faces/crazy.mp4'),
  JOY: require('../assets/faces/laughing.mp4'),
  CONFUSED: require('../assets/faces/crazy.mp4'),
  ALERT: require('../assets/faces/error.mp4'),
  MESSAGE: require('../assets/faces/voice.mp4'),
  LOW_BATTERY: require('../assets/faces/low_battery.mp4'),
  HEART: require('../assets/faces/heart.mp4'),
  MAIL: require('../assets/faces/normal.mp4'),
  WINKING: require('../assets/faces/winking.mp4'),
  DEAD: require('../assets/faces/out_of_service.mp4'),
};

export const FaceEngine: React.FC<{ thermalSevere?: boolean }> = ({
  thermalSevere = false,
}) => {
  const currentEmotion = useEmotionStore((state) => state.currentEmotion);
  const isBlinking = useEmotionStore((state) => state.isBlinking);
  const isAsleep = useSleepStore((state) => state.isAsleep);
  const [activeReady, setActiveReady] = useState(false);

  const idleOpacity = useRef(new Animated.Value(1)).current;
  const emotionOpacity = useRef(new Animated.Value(0)).current;
  const lidClose = useRef(new Animated.Value(0)).current;

  const isIdle = currentEmotion === 'IDLE';
  const activeVideoSource = emotionVideos[currentEmotion];
  const allowBlink =
    !isAsleep && currentEmotion !== 'SLEEPY' && currentEmotion !== 'DEAD';

  // When emotion changes, reset ready state for the active player
  useEffect(() => {
    if (!isIdle) {
      setActiveReady(false);
      emotionOpacity.setValue(0);
      idleOpacity.setValue(1);
    } else {
      Animated.parallel([
        Animated.timing(idleOpacity, {
          toValue: 1,
          duration: CROSSFADE_MS,
          useNativeDriver: true,
        }),
        Animated.timing(emotionOpacity, {
          toValue: 0,
          duration: CROSSFADE_MS,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [currentEmotion, isIdle, idleOpacity, emotionOpacity]);

  // Crossfade when emotion player is ready
  useEffect(() => {
    if (!isIdle && activeReady) {
      Animated.parallel([
        Animated.timing(emotionOpacity, {
          toValue: 1,
          duration: CROSSFADE_MS,
          useNativeDriver: true,
        }),
        Animated.timing(idleOpacity, {
          toValue: 0,
          duration: CROSSFADE_MS,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [activeReady, isIdle, emotionOpacity, idleOpacity]);

  // Eyelid blink animation
  useEffect(() => {
    if (!allowBlink) {
      lidClose.setValue(0);
      return;
    }
    Animated.timing(lidClose, {
      toValue: isBlinking ? 1 : 0,
      duration: LID_CLOSE_MS,
      useNativeDriver: false, // height anim
    }).start();
  }, [isBlinking, allowBlink, lidClose]);

  const lidHeight = lidClose.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '42%'],
  });

  const pauseIdle = (!isIdle && activeReady) || isAsleep;
  const pauseEmotion = isAsleep;
  const skipDualPlayer = thermalSevere && !isIdle;

  return (
    <View style={styles.container} pointerEvents="none">
      {/* 1. Permanent Idle Player — skipped under thermal severe + emotion to save heat */}
      {!skipDualPlayer && (
        <Animated.View style={[styles.videoWrap, { opacity: idleOpacity }]}>
          <Video
            source={emotionVideos.IDLE}
            style={styles.video}
            resizeMode="contain"
            repeat={true}
            muted={true}
            playInBackground={false}
            disableFocus={true}
            paused={pauseIdle}
            maxBitRate={thermalSevere ? 400000 : undefined}
          />
        </Animated.View>
      )}

      {/* 2. Dynamic Emotion Player */}
      {!isIdle && (
        <Animated.View
          style={[styles.videoWrap, styles.absoluteVideo, { opacity: emotionOpacity }]}
        >
          <Video
            source={activeVideoSource}
            style={styles.video}
            resizeMode="contain"
            repeat={true}
            muted={true}
            playInBackground={false}
            disableFocus={true}
            paused={pauseEmotion}
            maxBitRate={thermalSevere ? 400000 : undefined}
            onReadyForDisplay={() => setActiveReady(true)}
          />
        </Animated.View>
      )}

      {/* 3. Social gaze pupils */}
      <GazeOverlay />

      {/* 4. Eyelid blink overlay (Page 9) */}
      {allowBlink && (
        <View style={styles.lidLayer} pointerEvents="none">
          <Animated.View style={[styles.lidTop, { height: lidHeight }]} />
          <Animated.View style={[styles.lidBottom, { height: lidHeight }]} />
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
    height: '100%',
    backgroundColor: '#000000',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  videoWrap: {
    width: '100%',
    height: '100%',
  },
  video: {
    width: '100%',
    height: '100%',
    transform: [{ scale: 1.45 }],
  },
  absoluteVideo: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  lidLayer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 20,
  },
  lidTop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    backgroundColor: '#000000',
    borderBottomLeftRadius: 8,
    borderBottomRightRadius: 8,
  },
  lidBottom: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#000000',
    borderTopLeftRadius: 8,
    borderTopRightRadius: 8,
  },
});
