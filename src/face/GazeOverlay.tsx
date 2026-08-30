import React, { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Ellipse } from 'react-native-svg';
import { useSleepStore } from '../store/useSleepStore';
import { EyeContactEngine } from './EyeContactEngine';

const PUPIL_TRAVEL_PX = 36;
const TICK_MS = 1000 / 15;

/**
 * Lightweight SVG pupils over the face video.
 * Gaze comes from EyeContactEngine (tracking offset).
 */
export const GazeOverlay: React.FC = () => {
  const isAsleep = useSleepStore((s) => s.isAsleep);
  const [gazeX, setGazeX] = useState(0);

  useEffect(() => {
    if (isAsleep) {
      EyeContactEngine.setEnabled(false);
      EyeContactEngine.reset();
      setGazeX(0);
      return;
    }

    EyeContactEngine.setEnabled(true);
    let last = Date.now();
    const id = setInterval(() => {
      const now = Date.now();
      const dt = now - last;
      last = now;
      const g = EyeContactEngine.tick(dt);
      setGazeX(g.x);
    }, TICK_MS);

    return () => {
      clearInterval(id);
    };
  }, [isAsleep]);

  if (isAsleep) {
    return null;
  }

  const shift = gazeX * PUPIL_TRAVEL_PX;

  return (
    <View style={styles.overlay} pointerEvents="none">
      <Svg width="100%" height="100%" viewBox="0 0 400 240" preserveAspectRatio="xMidYMid meet">
        {/* Left pupil */}
        <Ellipse
          cx={155 + shift}
          cy={105}
          rx={14}
          ry={18}
          fill="#0A0A12"
          opacity={0.85}
        />
        {/* Right pupil */}
        <Ellipse
          cx={245 + shift}
          cy={105}
          rx={14}
          ry={18}
          fill="#0A0A12"
          opacity={0.85}
        />
        {/* Specular highlights */}
        <Ellipse
          cx={150 + shift}
          cy={98}
          rx={4}
          ry={5}
          fill="#FFFFFF"
          opacity={0.35}
        />
        <Ellipse
          cx={240 + shift}
          cy={98}
          rx={4}
          ry={5}
          fill="#FFFFFF"
          opacity={0.35}
        />
      </Svg>
    </View>
  );
};

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFill,
    zIndex: 5,
  },
});
