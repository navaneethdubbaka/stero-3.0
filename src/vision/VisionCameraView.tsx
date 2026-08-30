import React, { useCallback, useEffect, useRef } from 'react';
import {
  requireNativeComponent,
  ViewProps,
  NativeSyntheticEvent,
  findNodeHandle,
  UIManager,
} from 'react-native';
import { registerStillCaptureHost, unregisterStillCaptureHost } from './captureStill';

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

export interface StillCapturedEvent {
  requestId: string;
  base64: string | null;
  width: number;
  height: number;
  error?: string | null;
}

interface VisionCameraViewProps extends ViewProps {
  onPoseDetected?: (event: NativeSyntheticEvent<PoseDetectedEvent>) => void;
  onStillCaptured?: (event: NativeSyntheticEvent<StillCapturedEvent>) => void;
}

const NativeVisionCameraView = requireNativeComponent<any>('VisionCameraView');

type PendingStill = {
  resolve: (value: { jpegBase64: string; width: number; height: number }) => void;
  reject: (reason: Error) => void;
  timer: ReturnType<typeof setTimeout>;
};

/**
 * Camera preview + pose telemetry host. Registers a still-capture API for VisionAiService.
 */
export const VisionCameraView: React.FC<VisionCameraViewProps> = (props) => {
  const nativeRef = useRef(null);
  const pendingRef = useRef<Map<string, PendingStill>>(new Map());

  const resolveStill = useCallback((event: NativeSyntheticEvent<StillCapturedEvent>) => {
    const { requestId, base64, width, height, error } = event.nativeEvent;
    const pending = pendingRef.current.get(requestId);
    if (!pending) return;
    clearTimeout(pending.timer);
    pendingRef.current.delete(requestId);
    if (error || !base64) {
      pending.reject(new Error(error || 'Still capture failed'));
    } else {
      pending.resolve({ jpegBase64: base64, width, height });
    }
    props.onStillCaptured?.(event);
  }, [props]);

  useEffect(() => {
    const api = {
      captureStill: (
        maxEdgePx: number,
        jpegQuality: number,
        saveDebug: boolean
      ): Promise<{ jpegBase64: string; width: number; height: number }> => {
        const tag = findNodeHandle(nativeRef.current);
        if (tag == null) {
          return Promise.reject(new Error('Camera view not mounted'));
        }
        const requestId = `still-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
        return new Promise((resolve, reject) => {
          const timer = setTimeout(() => {
            pendingRef.current.delete(requestId);
            reject(new Error('Still capture timed out'));
          }, 8000);
          pendingRef.current.set(requestId, { resolve, reject, timer });

          const config = UIManager.getViewManagerConfig?.('VisionCameraView');
          const commandId =
            config?.Commands?.captureStill ?? 'captureStill';

          UIManager.dispatchViewManagerCommand(tag, commandId, [
            requestId,
            maxEdgePx,
            jpegQuality,
            saveDebug,
          ]);
        });
      },
    };

    registerStillCaptureHost(api);
    return () => {
      unregisterStillCaptureHost(api);
      pendingRef.current.forEach((p) => {
        clearTimeout(p.timer);
        p.reject(new Error('Camera unmounted'));
      });
      pendingRef.current.clear();
    };
  }, []);

  return (
    <NativeVisionCameraView
      {...props}
      ref={nativeRef}
      onStillCaptured={resolveStill}
    />
  );
};
