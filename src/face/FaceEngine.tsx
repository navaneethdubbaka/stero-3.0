import React, { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, {
  Defs,
  RadialGradient,
  Stop,
  Rect,
  Circle,
  Path,
} from 'react-native-svg';
import Animated, {
  useSharedValue,
  useAnimatedProps,
  withTiming,
  withSpring,
  withRepeat,
  cancelAnimation,
  useAnimatedStyle,
} from 'react-native-reanimated';
import { useEmotionStore } from '../store/useEmotionStore';

const AnimatedPath = Animated.createAnimatedComponent(Path);
const AnimatedCircle = Animated.createAnimatedComponent(Circle);
const AnimatedRect = Animated.createAnimatedComponent(Rect);

// Size Constants for the Face Layout
const CANVAS_WIDTH = 800;
const CANVAS_HEIGHT = 480;

export const FaceEngine: React.FC = () => {
  const { currentEmotion, isBlinking, isSpeaking } = useEmotionStore();

  // Left Eye Shared Values
  const leftTopEyelidY = useSharedValue(-100);
  const leftBottomEyelidY = useSharedValue(100);
  const leftEyelidRot = useSharedValue(0); // in degrees

  // Right Eye Shared Values
  const rightTopEyelidY = useSharedValue(-100);
  const rightBottomEyelidY = useSharedValue(100);
  const rightEyelidRot = useSharedValue(0);

  // Pupil Shared Values
  const pupilX = useSharedValue(0);
  const pupilY = useSharedValue(0);
  const pupilScale = useSharedValue(1);

  // Mouth Shared Values
  const mouthTopY = useSharedValue(50);
  const mouthBottomY = useSharedValue(50);
  const mouthScaleX = useSharedValue(1);
  const mouthOffsetY = useSharedValue(0);

  // Handle emotion changes
  useEffect(() => {
    // Stop any ongoing repeating speaking animations
    cancelAnimation(mouthTopY);
    cancelAnimation(mouthBottomY);
    cancelAnimation(mouthOffsetY);

    // Default animation configs
    const springConfig = { damping: 15, stiffness: 100 };
    const timingConfig = { duration: 300 };

    // Set target values based on emotion
    let targetLeftTopEyelidY = -100;
    let targetLeftBottomEyelidY = 100;
    let targetLeftEyelidRot = 0;

    let targetRightTopEyelidY = -100;
    let targetRightBottomEyelidY = 100;
    let targetRightEyelidRot = 0;

    let targetPupilX = 0;
    let targetPupilY = 0;
    let targetPupilScale = 1;

    let targetMouthTopY = 50;
    let targetMouthBottomY = 50;
    let targetMouthScaleX = 1;

    switch (currentEmotion) {
      case 'IDLE':
        targetLeftTopEyelidY = -80;
        targetLeftBottomEyelidY = 80;
        targetRightTopEyelidY = -80;
        targetRightBottomEyelidY = 80;
        targetMouthTopY = 50;
        targetMouthBottomY = 50; // flat closed line
        break;

      case 'HAPPY':
        targetLeftTopEyelidY = -100;
        targetLeftBottomEyelidY = 20; // squint up
        targetRightTopEyelidY = -100;
        targetRightBottomEyelidY = 20;
        targetMouthTopY = 48;
        targetMouthBottomY = 75; // smiling curve
        targetMouthScaleX = 1.2;
        break;

      case 'LISTENING':
        targetLeftTopEyelidY = -95;
        targetLeftBottomEyelidY = 95;
        targetRightTopEyelidY = -95;
        targetRightBottomEyelidY = 95;
        targetPupilScale = 1.25;
        targetMouthTopY = 47;
        targetMouthBottomY = 53; // tiny round mouth
        targetMouthScaleX = 0.4;
        break;

      case 'THINKING':
        targetLeftTopEyelidY = -35; // drooped top eyelid
        targetLeftBottomEyelidY = 70;
        targetRightTopEyelidY = -35;
        targetRightBottomEyelidY = 70;
        targetPupilX = -15; // looking to the left
        targetPupilY = -5;
        targetPupilScale = 0.9;
        targetMouthTopY = 50;
        targetMouthBottomY = 50;
        targetMouthScaleX = 0.7;
        break;

      case 'SPEAKING':
        targetLeftTopEyelidY = -80;
        targetLeftBottomEyelidY = 80;
        targetRightTopEyelidY = -80;
        targetRightBottomEyelidY = 80;
        targetMouthScaleX = 1.0;
        break;

      case 'SLEEPY':
        targetLeftTopEyelidY = -10; // almost closed eyelids
        targetLeftBottomEyelidY = 10;
        targetRightTopEyelidY = -10;
        targetRightBottomEyelidY = 10;
        targetPupilY = 10; // looking down
        targetPupilScale = 0.8;
        targetMouthTopY = 50;
        targetMouthBottomY = 52;
        break;

      case 'SURPRISED':
        targetLeftTopEyelidY = -110; // extra wide
        targetLeftBottomEyelidY = 110;
        targetRightTopEyelidY = -110;
        targetRightBottomEyelidY = 110;
        targetPupilScale = 0.6; // contracted pupils
        targetMouthTopY = 25;
        targetMouthBottomY = 75; // big circular mouth
        targetMouthScaleX = 0.6;
        break;

      case 'SAD':
        targetLeftTopEyelidY = -35;
        targetLeftBottomEyelidY = 75;
        targetLeftEyelidRot = -15; // drooped outwards
        targetRightTopEyelidY = -35;
        targetRightBottomEyelidY = 75;
        targetRightEyelidRot = 15;
        targetMouthTopY = 35; // downturned curve
        targetMouthBottomY = 50;
        targetMouthScaleX = 0.9;
        break;

      case 'ANGRY':
        targetLeftTopEyelidY = -35;
        targetLeftBottomEyelidY = 80;
        targetLeftEyelidRot = 18; // angled inwards
        targetRightTopEyelidY = -35;
        targetRightBottomEyelidY = 80;
        targetRightEyelidRot = -18;
        targetMouthTopY = 50;
        targetMouthBottomY = 50;
        targetMouthScaleX = 0.8;
        break;

      case 'EXCITED':
        targetLeftTopEyelidY = -100;
        targetLeftBottomEyelidY = 90;
        targetRightTopEyelidY = -100;
        targetRightBottomEyelidY = 90;
        targetPupilScale = 1.1;
        targetMouthTopY = 40;
        targetMouthBottomY = 75; // happy open mouth
        targetMouthScaleX = 1.3;
        break;
    }

    // Apply eye animations
    if (!isBlinking) {
      leftTopEyelidY.value = withSpring(targetLeftTopEyelidY, springConfig);
      leftBottomEyelidY.value = withSpring(targetLeftBottomEyelidY, springConfig);
      leftEyelidRot.value = withSpring(targetLeftEyelidRot, springConfig);

      rightTopEyelidY.value = withSpring(targetRightTopEyelidY, springConfig);
      rightBottomEyelidY.value = withSpring(targetRightBottomEyelidY, springConfig);
      rightEyelidRot.value = withSpring(targetRightEyelidRot, springConfig);
    }

    pupilX.value = withSpring(targetPupilX, springConfig);
    pupilY.value = withSpring(targetPupilY, springConfig);
    pupilScale.value = withSpring(targetPupilScale, springConfig);

    // Apply mouth animation
    if (!isSpeaking) {
      mouthTopY.value = withSpring(targetMouthTopY, springConfig);
      mouthBottomY.value = withSpring(targetMouthBottomY, springConfig);
      mouthScaleX.value = withSpring(targetMouthScaleX, springConfig);
    } else {
      // If speaking, start a repeating animation for talking mouth
      mouthScaleX.value = withSpring(1.1, springConfig);
      mouthTopY.value = withRepeat(
        withTiming(30, { duration: 120 }),
        -1,
        true
      );
      mouthBottomY.value = withRepeat(
        withTiming(70, { duration: 120 }),
        -1,
        true
      );
    }
  }, [currentEmotion, isSpeaking]);

  // Handle Blinking animation triggers
  useEffect(() => {
    if (isBlinking) {
      // Rapid close
      leftTopEyelidY.value = withTiming(0, { duration: 60 });
      leftBottomEyelidY.value = withTiming(0, { duration: 60 });
      rightTopEyelidY.value = withTiming(0, { duration: 60 });
      rightBottomEyelidY.value = withTiming(0, { duration: 60 });
    } else {
      // Re-trigger the current emotion's eyelid values
      const springConfig = { damping: 15, stiffness: 100 };
      let targetLeftTop = -80;
      let targetLeftBottom = 80;
      let targetRightTop = -80;
      let targetRightBottom = 80;

      switch (currentEmotion) {
        case 'IDLE':
          targetLeftTop = -80; targetLeftBottom = 80;
          targetRightTop = -80; targetRightBottom = 80;
          break;
        case 'HAPPY':
          targetLeftTop = -100; targetLeftBottom = 20;
          targetRightTop = -100; targetRightBottom = 20;
          break;
        case 'LISTENING':
          targetLeftTop = -95; targetLeftBottom = 95;
          targetRightTop = -95; targetRightBottom = 95;
          break;
        case 'THINKING':
          targetLeftTop = -35; targetLeftBottom = 70;
          targetRightTop = -35; targetRightBottom = 70;
          break;
        case 'SPEAKING':
          targetLeftTop = -80; targetLeftBottom = 80;
          targetRightTop = -80; targetRightBottom = 80;
          break;
        case 'SLEEPY':
          targetLeftTop = -10; targetLeftBottom = 10;
          targetRightTop = -10; targetRightBottom = 10;
          break;
        case 'SURPRISED':
          targetLeftTop = -110; targetLeftBottom = 110;
          targetRightTop = -110; targetRightBottom = 110;
          break;
        case 'SAD':
          targetLeftTop = -35; targetLeftBottom = 75;
          targetRightTop = -35; targetRightBottom = 75;
          break;
        case 'ANGRY':
          targetLeftTop = -35; targetLeftBottom = 80;
          targetRightTop = -35; targetRightBottom = 80;
          break;
        case 'EXCITED':
          targetLeftTop = -100; targetLeftBottom = 90;
          targetRightTop = -100; targetRightBottom = 90;
          break;
      }

      leftTopEyelidY.value = withSpring(targetLeftTop, springConfig);
      leftBottomEyelidY.value = withSpring(targetLeftBottom, springConfig);
      rightTopEyelidY.value = withSpring(targetRightTop, springConfig);
      rightBottomEyelidY.value = withSpring(targetRightBottom, springConfig);
    }
  }, [isBlinking]);

  // Animated SVG Props
  const animatedLeftTopEyelidProps = useAnimatedProps(() => ({
    y: leftTopEyelidY.value,
  }));
  const animatedLeftBottomEyelidProps = useAnimatedProps(() => ({
    y: leftBottomEyelidY.value,
  }));
  const animatedRightTopEyelidProps = useAnimatedProps(() => ({
    y: rightTopEyelidY.value,
  }));
  const animatedRightBottomEyelidProps = useAnimatedProps(() => ({
    y: rightBottomEyelidY.value,
  }));

  const animatedLeftEyeStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${leftEyelidRot.value}deg` }],
  }));
  const animatedRightEyeStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rightEyelidRot.value}deg` }],
  }));

  const animatedPupilProps = useAnimatedProps(() => ({
    cx: 75 + pupilX.value,
    cy: 75 + pupilY.value,
    r: 25 * pupilScale.value,
  }));

  const animatedMouthProps = useAnimatedProps(() => {
    const topY = mouthTopY.value;
    const bottomY = mouthBottomY.value;
    // Draw bezier shape between x=50 to x=150, centered on y=50
    const d = `M 50 50 Q 100 ${bottomY} 150 50 Q 100 ${topY} 50 50`;
    return { d };
  });

  const animatedMouthStyle = useAnimatedStyle(() => ({
    transform: [
      { scaleX: mouthScaleX.value },
      { translateY: mouthOffsetY.value },
    ],
  }));

  return (
    <View style={styles.container}>
      <View style={styles.faceCanvas}>
        {/* LEFT EYE CONTAINER */}
        <Animated.View style={[styles.eyeWrapper, { left: 180, top: 100 }, animatedLeftEyeStyle]}>
          <Svg width="150" height="150" viewBox="0 0 150 150">
            <Defs>
              <RadialGradient id="leftEyeGradient" cx="50%" cy="50%" rx="50%" ry="50%">
                <Stop offset="0%" stopColor="#00FFFF" stopOpacity={1} />
                <Stop offset="70%" stopColor="#00A2FF" stopOpacity={0.9} />
                <Stop offset="100%" stopColor="#0033AA" stopOpacity={0.8} />
              </RadialGradient>
            </Defs>

            {/* Eye Outline/Glow Container */}
            <Rect
              x={20}
              y={10}
              width={110}
              height={130}
              rx={45}
              ry={45}
              fill="url(#leftEyeGradient)"
            />

            {/* Dark Pupil */}
            <AnimatedCircle fill="#000" {...animatedPupilProps} />

            {/* Eyelids (Black masks) */}
            <AnimatedRect
              x={0}
              y={-100}
              width={150}
              height={100}
              fill="#000"
              animatedProps={animatedLeftTopEyelidProps}
            />
            <AnimatedRect
              x={0}
              y={150}
              width={150}
              height={100}
              fill="#000"
              animatedProps={animatedLeftBottomEyelidProps}
            />
          </Svg>
        </Animated.View>

        {/* RIGHT EYE CONTAINER */}
        <Animated.View style={[styles.eyeWrapper, { left: 470, top: 100 }, animatedRightEyeStyle]}>
          <Svg width="150" height="150" viewBox="0 0 150 150">
            <Defs>
              <RadialGradient id="rightEyeGradient" cx="50%" cy="50%" rx="50%" ry="50%">
                <Stop offset="0%" stopColor="#00FFFF" stopOpacity={1} />
                <Stop offset="70%" stopColor="#00A2FF" stopOpacity={0.9} />
                <Stop offset="100%" stopColor="#0033AA" stopOpacity={0.8} />
              </RadialGradient>
            </Defs>

            {/* Eye Outline/Glow Container */}
            <Rect
              x={20}
              y={10}
              width={110}
              height={130}
              rx={45}
              ry={45}
              fill="url(#rightEyeGradient)"
            />

            {/* Dark Pupil */}
            <AnimatedCircle fill="#000" {...animatedPupilProps} />

            {/* Eyelids (Black masks) */}
            <AnimatedRect
              x={0}
              y={-100}
              width={150}
              height={100}
              fill="#000"
              animatedProps={animatedRightTopEyelidProps}
            />
            <AnimatedRect
              x={0}
              y={150}
              width={150}
              height={100}
              fill="#000"
              animatedProps={animatedRightBottomEyelidProps}
            />
          </Svg>
        </Animated.View>

        {/* MOUTH CONTAINER */}
        <Animated.View style={[styles.mouthWrapper, { left: 300, top: 310 }, animatedMouthStyle]}>
          <Svg width="200" height="100" viewBox="0 0 200 100">
            <AnimatedPath
              fill="#00FFFF"
              stroke="#00FFFF"
              strokeWidth={3}
              strokeLinecap="round"
              strokeLinejoin="round"
              animatedProps={animatedMouthProps}
            />
          </Svg>
        </Animated.View>
      </View>
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
  },
  faceCanvas: {
    width: CANVAS_WIDTH,
    height: CANVAS_HEIGHT,
    position: 'relative',
    backgroundColor: '#000000',
  },
  eyeWrapper: {
    position: 'absolute',
    width: 150,
    height: 150,
    justifyContent: 'center',
    alignItems: 'center',
  },
  mouthWrapper: {
    position: 'absolute',
    width: 200,
    height: 100,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
