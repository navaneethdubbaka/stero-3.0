import React from 'react';
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
  const { currentEmotion } = useEmotionStore();
  const videoSource = emotionVideos[currentEmotion] || emotionVideos.IDLE;

  return (
    <View style={styles.container} pointerEvents="none">
      <Video
        key={currentEmotion}
        source={videoSource}
        style={styles.video}
        resizeMode="contain"
        repeat={true}
        muted={true}
        playInBackground={false}
        disableFocus={true}
      />
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
});

