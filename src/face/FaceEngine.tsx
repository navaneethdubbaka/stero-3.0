import React, { useState, useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Video from 'react-native-video';
import { useEmotionStore, EmotionType } from '../store/useEmotionStore';

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

export const FaceEngine: React.FC = () => {
  const currentEmotion = useEmotionStore((state) => state.currentEmotion);
  const [activeReady, setActiveReady] = useState(false);

  const isIdle = currentEmotion === 'IDLE';
  const activeVideoSource = emotionVideos[currentEmotion];

  // When emotion changes, reset ready state for the active player
  useEffect(() => {
    if (!isIdle) {
      setActiveReady(false);
    }
  }, [currentEmotion, isIdle]);

  return (
    <View style={styles.container} pointerEvents="none">
      {/* 1. Permanent Idle Player (Plays normal face continuously) */}
      <Video
        source={emotionVideos.IDLE}
        style={[
          styles.video,
          { opacity: isIdle || !activeReady ? 1 : 0 },
        ]}
        resizeMode="contain"
        repeat={true}
        muted={true}
        playInBackground={false}
        disableFocus={true}
        paused={!isIdle && activeReady}
      />

      {/* 2. Dynamic Emotion Player */}
      {!isIdle && (
        <Video
          source={activeVideoSource}
          style={[
            styles.video,
            styles.absoluteVideo,
            { opacity: activeReady ? 1 : 0 },
          ]}
          resizeMode="contain"
          repeat={true}
          muted={true}
          playInBackground={false}
          disableFocus={true}
          onReadyForDisplay={() => setActiveReady(true)}
        />
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
});
