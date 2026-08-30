import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  PermissionsAndroid,
  Platform,
  ActivityIndicator,
} from 'react-native';
import Svg, { Circle, Line } from 'react-native-svg';
import { VisionCameraView, Landmark } from '../vision/VisionCameraView';
import { TrackingEngine } from '../vision/TrackingEngine';
import { useTrackingStore } from '../store/useTrackingStore';
import { useRobotStore } from '../store/useRobotStore';
import { useFollowStore } from '../store/useFollowStore';
import { FollowMode } from '../robot/FollowMode';

interface VisionScreenProps {
  navigation: any;
}

export const VisionScreen: React.FC<VisionScreenProps> = ({ navigation }) => {
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });

  const personFound = useTrackingStore((s) => s.personFound);
  const targetLocked = useTrackingStore((s) => s.targetLocked);
  const offset = useTrackingStore((s) => s.offset);
  const distanceZone = useTrackingStore((s) => s.distanceZone);
  const shoulderWidth = useTrackingStore((s) => s.shoulderWidth);
  const landmarks = useTrackingStore((s) => s.landmarks);
  const deadband = useTrackingStore((s) => s.deadband);
  const steerZone = useTrackingStore((s) => s.steerZone);
  const estimatedDistanceM = useTrackingStore((s) => s.estimatedDistanceM);
  const distanceIntent = useTrackingStore((s) => s.distanceIntent);
  const confidence = useTrackingStore((s) => s.confidence);
  const errorMsg = useTrackingStore((s) => s.error);
  const isConnected = useRobotStore((s) => s.isConnected);
  const followEnabled = useFollowStore((s) => s.enabled);
  const followStatus = useFollowStore((s) => s.status);
  const followCmd = useFollowStore((s) => s.lastCommand);

  useEffect(() => {
    requestCameraPermission();
    return () => {
      // Keep tracking alive while Follow is running (pose host may remount)
      if (!FollowMode.isEnabled()) {
        TrackingEngine.reset();
      }
    };
  }, []);

  const toggleFollow = () => {
    if (FollowMode.isEnabled()) {
      FollowMode.stop();
      return;
    }
    if (!isConnected) {
      return;
    }
    FollowMode.start();
  };

  const requestCameraPermission = async () => {
    if (Platform.OS === 'android') {
      try {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.CAMERA,
          {
            title: 'Camera Permission Required',
            message: 'STERO needs camera access for autonomous tracking and follow modes.',
            buttonNeutral: 'Ask Me Later',
            buttonNegative: 'Cancel',
            buttonPositive: 'OK',
          }
        );
        setHasPermission(granted === PermissionsAndroid.RESULTS.GRANTED);
      } catch (err) {
        console.warn(err);
        setHasPermission(false);
      }
    } else {
      setHasPermission(true);
    }
  };

  const handlePoseDetected = (event: any) => {
    TrackingEngine.ingest(event.nativeEvent);
  };

  const handleLayout = (event: any) => {
    const { width, height } = event.nativeEvent.layout;
    setDimensions({ width, height });
  };

  const getXY = (landmark: Landmark) => {
    if (!landmark || dimensions.width === 0) return { x: 0, y: 0 };
    const mirroredX = 1 - landmark.x;
    return {
      x: mirroredX * dimensions.width,
      y: landmark.y * dimensions.height,
    };
  };

  const renderSkeleton = () => {
    if (!targetLocked || landmarks.length === 0) {
      return null;
    }

    const lines: any[] = [];
    const circles: any[] = [];

    const addLine = (i1: number, i2: number, key: string) => {
      if (landmarks[i1] && landmarks[i2]) {
        const p1 = getXY(landmarks[i1]);
        const p2 = getXY(landmarks[i2]);
        lines.push(
          <Line
            key={key}
            x1={p1.x}
            y1={p1.y}
            x2={p2.x}
            y2={p2.y}
            stroke="#00FFFF"
            strokeWidth="3"
            opacity="0.8"
          />
        );
      }
    };

    addLine(11, 12, 'shoulders');
    addLine(11, 13, 'left-upper-arm');
    addLine(13, 15, 'left-forearm');
    addLine(12, 14, 'right-upper-arm');
    addLine(14, 16, 'right-forearm');
    addLine(11, 23, 'left-torso');
    addLine(12, 24, 'right-torso');
    addLine(23, 24, 'hips');
    addLine(23, 25, 'left-thigh');
    addLine(25, 27, 'left-calf');
    addLine(24, 26, 'right-thigh');
    addLine(26, 28, 'right-calf');

    const jointsToDraw = [11, 12, 13, 14, 15, 16, 23, 24, 25, 26, 27, 28];
    jointsToDraw.forEach((idx) => {
      if (landmarks[idx]) {
        const pt = getXY(landmarks[idx]);
        circles.push(
          <Circle
            key={`joint-${idx}`}
            cx={pt.x}
            cy={pt.y}
            r="6"
            fill="#FF007F"
            stroke="#FFFFFF"
            strokeWidth="1.5"
          />
        );
      }
    });

    if (landmarks[0]) {
      const nosePt = getXY(landmarks[0]);
      circles.push(
        <Circle
          key="joint-nose"
          cx={nosePt.x}
          cy={nosePt.y}
          r="8"
          fill="#00FFC8"
          stroke="#FFFFFF"
          strokeWidth="1.5"
        />
      );
    }

    return (
      <Svg style={StyleSheet.absoluteFill}>
        {lines}
        {circles}
      </Svg>
    );
  };

  if (hasPermission === null) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#00FFFF" />
        <Text style={styles.statusText}>Requesting camera access...</Text>
      </View>
    );
  }

  if (hasPermission === false) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.errorText}>Camera permission was denied.</Text>
        <TouchableOpacity style={styles.permissionBtn} onPress={requestCameraPermission}>
          <Text style={styles.permissionBtnText}>Grant Permission</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Text style={styles.backBtnText}>Back to Dashboard</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const gaugePercent = Math.max(0, Math.min(100, (offset + 0.5) * 100));
  const deadbandLeftPct = Math.max(0, Math.min(100, (-deadband + 0.5) * 100));
  const deadbandRightPct = Math.max(0, Math.min(100, (deadband + 0.5) * 100));

  const statusLabel = targetLocked
    ? personFound
      ? 'TARGET LOCKED'
      : 'HOLDING LOCK'
    : 'SEARCHING...';

  const steerLabel =
    steerZone === 'CENTER'
      ? 'Centered'
      : steerZone === 'LEFT'
      ? `Shift Left (${offset.toFixed(2)})`
      : `Shift Right (+${offset.toFixed(2)})`;

  return (
    <View style={styles.container}>
      <View style={styles.sidebar}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Text style={styles.backButtonText}>← Dashboard</Text>
        </TouchableOpacity>

        <Text style={styles.sidebarTitle}>VISION AI</Text>
        <Text style={styles.sidebarDesc}>TrackingEngine · MediaPipe Pose</Text>

        <TouchableOpacity
          style={[
            styles.followBtn,
            followEnabled ? styles.followBtnOn : styles.followBtnOff,
            !isConnected && !followEnabled && styles.followBtnDisabled,
          ]}
          onPress={toggleFollow}
          activeOpacity={0.8}
        >
          <Text style={styles.followBtnText}>
            {followEnabled ? '⏹ STOP FOLLOW' : '▶ START FOLLOW'}
          </Text>
          <Text style={styles.followStatusChip}>
            {followEnabled
              ? `${followStatus}${followCmd !== 'S' ? ` · ${followCmd}` : ''}`
              : isConnected
              ? 'OFF'
              : 'USB REQUIRED'}
          </Text>
        </TouchableOpacity>

        <View style={styles.telemetryContainer}>
          <View style={styles.telemetryCard}>
            <Text style={styles.telemetryLabel}>TRACKING STATUS</Text>
            <View style={styles.statusRow}>
              <View
                style={[
                  styles.statusDot,
                  targetLocked ? styles.statusDotActive : styles.statusDotInactive,
                ]}
              />
              <Text
                style={[
                  styles.statusValue,
                  targetLocked ? styles.textGreen : styles.textRed,
                ]}
              >
                {statusLabel}
              </Text>
            </View>
          </View>

          <View style={styles.telemetryCard}>
            <Text style={styles.telemetryLabel}>DISTANCE ZONE</Text>
            <Text
              style={[
                styles.telemetryValue,
                distanceZone === 'CLOSE'
                  ? styles.textRed
                  : distanceZone === 'MEDIUM'
                  ? styles.textGreen
                  : styles.textYellow,
              ]}
            >
              {distanceZone}
            </Text>
          </View>

          <View style={styles.telemetryCard}>
            <Text style={styles.telemetryLabel}>EST. DISTANCE / INTENT</Text>
            <Text style={[styles.telemetryValue, styles.textCyan]}>
              {estimatedDistanceM.toFixed(2)}m · {distanceIntent}
            </Text>
          </View>

          <View style={styles.telemetryCard}>
            <Text style={styles.telemetryLabel}>SHOULDER · CONF · DEADBAND</Text>
            <Text style={[styles.telemetryValue, styles.textCyan]}>
              {(shoulderWidth * 100).toFixed(1)}% · {(confidence * 100).toFixed(0)}% · ±
              {deadband.toFixed(2)}
            </Text>
          </View>
        </View>

        <View style={styles.gaugeCard}>
          <Text style={styles.telemetryLabel}>HORIZONTAL CENTER OFFSET</Text>
          <View style={styles.gaugeTrack}>
            <View
              style={[
                styles.deadbandBand,
                {
                  left: `${deadbandLeftPct}%`,
                  width: `${Math.max(0, deadbandRightPct - deadbandLeftPct)}%`,
                },
              ]}
            />
            <View style={[styles.gaugeIndicator, { left: `${gaugePercent}%` }]} />
            <View style={styles.gaugeCenterLine} />
            <View style={[styles.deadbandMarker, { left: `${deadbandLeftPct}%` }]} />
            <View style={[styles.deadbandMarker, { left: `${deadbandRightPct}%` }]} />
          </View>
          <View style={styles.gaugeLabels}>
            <Text style={styles.gaugeLabel}>LEFT</Text>
            <Text style={styles.gaugeLabel}>CENTER</Text>
            <Text style={styles.gaugeLabel}>RIGHT</Text>
          </View>
          <Text style={styles.gaugeValueText}>
            {steerZone} · {steerLabel}
          </Text>
        </View>

        {errorMsg && (
          <View style={styles.errorCard}>
            <Text style={styles.errorCardTitle}>⚠ DIAGNOSTIC FAILURE</Text>
            <Text style={styles.errorCardText}>{errorMsg}</Text>
          </View>
        )}
      </View>

      <View style={styles.cameraContainer} onLayout={handleLayout}>
        <VisionCameraView style={StyleSheet.absoluteFill} onPoseDetected={handlePoseDetected} />
        {renderSkeleton()}

        <View style={styles.hudOverlay} pointerEvents="none">
          <View style={styles.hudCornerTopLeft} />
          <View style={styles.hudCornerTopRight} />
          <View style={styles.hudCornerBottomLeft} />
          <View style={styles.hudCornerBottomRight} />
          <View style={styles.hudCrosshairHorizontal} />
          <View style={styles.hudCrosshairVertical} />
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: '#050508',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#050508',
    padding: 24,
  },
  statusText: {
    color: '#8E8E9F',
    marginTop: 16,
    fontSize: 14,
    fontWeight: '500',
  },
  errorText: {
    color: '#FF3C3C',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 24,
    textAlign: 'center',
  },
  permissionBtn: {
    backgroundColor: '#00FFFF',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    marginBottom: 12,
  },
  permissionBtnText: {
    color: '#000000',
    fontSize: 14,
    fontWeight: 'bold',
  },
  backBtn: {
    borderColor: 'rgba(255, 255, 255, 0.15)',
    borderWidth: 1,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  backBtnText: {
    color: '#D0D0D0',
    fontSize: 14,
    fontWeight: '600',
  },
  sidebar: {
    width: '30%',
    backgroundColor: '#0A0A0E',
    borderRightWidth: 1,
    borderColor: 'rgba(0, 255, 255, 0.1)',
    padding: 16,
    justifyContent: 'flex-start',
  },
  backButton: {
    marginBottom: 24,
    paddingVertical: 8,
  },
  backButtonText: {
    color: '#8E8E9F',
    fontSize: 13,
    fontWeight: 'bold',
  },
  sidebarTitle: {
    color: '#00FFFF',
    fontSize: 20,
    fontWeight: '900',
    letterSpacing: 2,
  },
  sidebarDesc: {
    color: '#8E8E9F',
    fontSize: 11,
    marginTop: 4,
    marginBottom: 16,
    fontWeight: '600',
  },
  followBtn: {
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
    marginBottom: 16,
    borderWidth: 1,
  },
  followBtnOff: {
    backgroundColor: 'rgba(0, 255, 200, 0.1)',
    borderColor: 'rgba(0, 255, 200, 0.35)',
  },
  followBtnOn: {
    backgroundColor: 'rgba(255, 60, 60, 0.15)',
    borderColor: 'rgba(255, 60, 60, 0.4)',
  },
  followBtnDisabled: {
    opacity: 0.45,
  },
  followBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  followStatusChip: {
    color: '#8E8E9F',
    fontSize: 10,
    fontWeight: '700',
    marginTop: 4,
    letterSpacing: 1,
  },
  telemetryContainer: {
    gap: 12,
    marginBottom: 20,
  },
  telemetryCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    padding: 12,
  },
  telemetryLabel: {
    color: '#8E8E9F',
    fontSize: 9,
    fontWeight: 'bold',
    letterSpacing: 1,
    marginBottom: 6,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  statusDotActive: {
    backgroundColor: '#00FFC8',
  },
  statusDotInactive: {
    backgroundColor: '#FF3C3C',
  },
  statusValue: {
    fontSize: 14,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  telemetryValue: {
    fontSize: 14,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  textGreen: {
    color: '#00FFC8',
  },
  textRed: {
    color: '#FF3C3C',
  },
  textYellow: {
    color: '#FFCC00',
  },
  textCyan: {
    color: '#00FFFF',
  },
  gaugeCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    padding: 12,
  },
  gaugeTrack: {
    height: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 3,
    marginVertical: 12,
    position: 'relative',
  },
  deadbandBand: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 255, 200, 0.2)',
    borderRadius: 3,
  },
  deadbandMarker: {
    position: 'absolute',
    top: -4,
    width: 2,
    height: 14,
    marginLeft: -1,
    backgroundColor: 'rgba(0, 255, 200, 0.55)',
  },
  gaugeIndicator: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#00FFFF',
    position: 'absolute',
    top: -3,
    marginLeft: -6,
    shadowColor: '#00FFFF',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 4,
    elevation: 5,
    zIndex: 2,
  },
  gaugeCenterLine: {
    width: 2,
    height: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    position: 'absolute',
    left: '50%',
    top: -2,
    marginLeft: -1,
  },
  gaugeLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  gaugeLabel: {
    color: '#8E8E9F',
    fontSize: 8,
    fontWeight: 'bold',
  },
  gaugeValueText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  cameraContainer: {
    flex: 1,
    position: 'relative',
    backgroundColor: '#000000',
  },
  hudOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderWidth: 1,
    borderColor: 'rgba(0, 255, 255, 0.1)',
  },
  hudCornerTopLeft: {
    position: 'absolute',
    top: 16,
    left: 16,
    width: 20,
    height: 20,
    borderTopWidth: 2,
    borderLeftWidth: 2,
    borderColor: '#00FFFF',
  },
  hudCornerTopRight: {
    position: 'absolute',
    top: 16,
    right: 16,
    width: 20,
    height: 20,
    borderTopWidth: 2,
    borderRightWidth: 2,
    borderColor: '#00FFFF',
  },
  hudCornerBottomLeft: {
    position: 'absolute',
    bottom: 16,
    left: 16,
    width: 20,
    height: 20,
    borderBottomWidth: 2,
    borderLeftWidth: 2,
    borderColor: '#00FFFF',
  },
  hudCornerBottomRight: {
    position: 'absolute',
    bottom: 16,
    right: 16,
    width: 20,
    height: 20,
    borderBottomWidth: 2,
    borderRightWidth: 2,
    borderColor: '#00FFFF',
  },
  hudCrosshairHorizontal: {
    position: 'absolute',
    left: '50%',
    top: 16,
    bottom: 16,
    width: 1,
    backgroundColor: 'rgba(0, 255, 255, 0.05)',
  },
  hudCrosshairVertical: {
    position: 'absolute',
    top: '50%',
    left: 16,
    right: 16,
    height: 1,
    backgroundColor: 'rgba(0, 255, 255, 0.05)',
  },
  errorCard: {
    backgroundColor: 'rgba(255, 60, 60, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255, 60, 60, 0.3)',
    borderRadius: 12,
    padding: 12,
    marginTop: 16,
  },
  errorCardTitle: {
    color: '#FF3C3C',
    fontSize: 9,
    fontWeight: 'bold',
    letterSpacing: 1,
    marginBottom: 4,
  },
  errorCardText: {
    color: '#FF8A8A',
    fontSize: 11,
    lineHeight: 15,
  },
});
