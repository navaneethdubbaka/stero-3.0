import React from 'react';
import { requireNativeComponent, ViewProps, NativeSyntheticEvent } from 'react-native';

export interface Landmark {
  x: number;
  y: number;
  z: number;
  presence: number;
  visibility: number;
}

export interface PoseDetectedEvent {
  personFound: boolean;
  offset: number;
  distanceZone: 'CLOSE' | 'MEDIUM' | 'FAR';
  shoulderWidth: number;
  landmarks: Landmark[];
  error?: string | null;
}

interface VisionCameraViewProps extends ViewProps {
  onPoseDetected?: (event: NativeSyntheticEvent<PoseDetectedEvent>) => void;
}

const NativeVisionCameraView = requireNativeComponent<any>('VisionCameraView');

export const VisionCameraView: React.FC<VisionCameraViewProps> = (props) => {
  return <NativeVisionCameraView {...props} />;
};
