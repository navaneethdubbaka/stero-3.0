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
import { VisionCameraView, Landmark, PoseDetectedEvent } from '../vision/VisionCameraView';

interface VisionScreenProps {
  navigation: any;
}

export const VisionScreen: React.FC<VisionScreenProps> = ({ navigation }) => {
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [trackingData, setTrackingData] = useState<PoseDetectedEvent | null>(null);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });

  useEffect(() => {
    requestCameraPermission();
  }, []);

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
    const data: PoseDetectedEvent = event.nativeEvent;
    setTrackingData(data);
  };

  const handleLayout = (event: any) => {
    const { width, height } = event.nativeEvent.layout;
    setDimensions({ width, height });
  };

  // Helper to scale normalized coordinates to view dimensions
  const getXY = (landmark: Landmark) => {
    if (!landmark || dimensions.width === 0) return { x: 0, y: 0 };
    // MediaPipe uses front camera which is mirrored natively.
    // To align properly on screen, we can mirror the X axis: x = 1 - x
    const mirroredX = 1 - landmark.x;
    return {
      x: mirroredX * dimensions.width,
      y: landmark.y * dimensions.height,
    };
  };

  // Render SVG skeleton connections
  const renderSkeleton = () => {
    if (!trackingData || !trackingData.personFound || trackingData.landmarks.length === 0) {
      return null;
    }

    const { landmarks } = trackingData;
    const lines: any[] = [];
    const circles: any[] = [];

    // Helper to add line between two landmark indexes
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

    // Connect skeleton joints
    // Shoulders
    addLine(11, 12, 'shoulders');
    // Left Arm
    addLine(11, 13, 'left-upper-arm');
    addLine(13, 15, 'left-forearm');
    // Right Arm
    addLine(12, 14, 'right-upper-arm');
    addLine(14, 16, 'right-forearm');
    // Torso / Hips
    addLine(11, 23, 'left-torso');
    addLine(12, 24, 'right-torso');
    addLine(23, 24, 'hips');
    // Left Leg
    addLine(23, 25, 'left-thigh');
    addLine(25, 27, 'left-calf');
    // Right Leg
    addLine(24, 26, 'right-thigh');
    addLine(26, 28, 'right-calf');

    // Render key joints as circles
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

    // Render Face features (Nose 0)
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

  const personFound = trackingData?.personFound ?? false;
  const offset = trackingData?.offset ?? 0.0;
  const distanceZone = trackingData?.distanceZone ?? 'FAR';
  const shoulderWidth = trackingData?.shoulderWidth ?? 0.0;
  const errorMsg = trackingData?.error ?? null;

  // Compute offset gauge percentage positioning (from -0.5 to 0.5 mapped to 0% to 100%)
  const gaugePercent = Math.max(0, Math.min(100, (offset + 0.5) * 100));

  return (
    <View style={styles.container}>
      {/* Sidebar Control Panel */}
      <View style={styles.sidebar}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Text style={styles.backButtonText}>← Dashboard</Text>
        </TouchableOpacity>

        <Text style={styles.sidebarTitle}>VISION AI</Text>
        <Text style={styles.sidebarDesc}>MediaPipe Pose Estimation</Text>

        {/* Telemetry Cards */}
        <View style={styles.telemetryContainer}>
          <View style={styles.telemetryCard}>
            <Text style={styles.telemetryLabel}>TRACKING STATUS</Text>
            <View style={styles.statusRow}>
              <View
                style={[
                  styles.statusDot,
                  personFound ? styles.statusDotActive : styles.statusDotInactive,
                ]}
              />
              <Text style={[styles.statusValue, personFound ? styles.textGreen : styles.textRed]}>
                {personFound ? 'TARGET LOCKED' : 'SEARCHING...'}
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
            <Text style={styles.telemetryLabel}>SHOULDER RATIO</Text>
            <Text style={[styles.telemetryValue, styles.textCyan]}>
              {(shoulderWidth * 100).toFixed(1)}%
            </Text>
          </View>
        </View>

        {/* Centering Gauge */}
        <View style={styles.gaugeCard}>
          <Text style={styles.telemetryLabel}>HORIZONTAL CENTER OFFSET</Text>
          <View style={styles.gaugeTrack}>
            <View style={[styles.gaugeIndicator, { left: `${gaugePercent}%` }]} />
            <View style={styles.gaugeCenterLine} />
          </View>
          <View style={styles.gaugeLabels}>
            <Text style={styles.gaugeLabel}>LEFT</Text>
            <Text style={styles.gaugeLabel}>CENTER</Text>
            <Text style={styles.gaugeLabel}>RIGHT</Text>
          </View>
          <Text style={styles.gaugeValueText}>
            {offset > 0.05
              ? `Shift Right (+${offset.toFixed(2)})`
              : offset < -0.05
              ? `Shift Left (${offset.toFixed(2)})`
              : 'Centered'}
          </Text>
        </View>

        {/* Error Alert Box */}
        {errorMsg && (
          <View style={styles.errorCard}>
            <Text style={styles.errorCardTitle}>⚠ DIAGNOSTIC FAILURE</Text>
            <Text style={styles.errorCardText}>{errorMsg}</Text>
          </View>
        )}
      </View>

      {/* Immersive Camera Feed View */}
      <View style={styles.cameraContainer} onLayout={handleLayout}>
        <VisionCameraView style={StyleSheet.absoluteFill} onPoseDetected={handlePoseDetected} />
        {renderSkeleton()}

        {/* Sci-Fi HUD Crosshair Overlays */}
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
    marginBottom: 24,
    fontWeight: '600',
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
    fontSize: 16,
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
