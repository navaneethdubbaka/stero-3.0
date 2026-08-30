import React, { useEffect } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, ScrollView, SafeAreaView } from 'react-native';
import { useRobotStore } from '../store/useRobotStore';
import { useEmotionStore } from '../store/useEmotionStore';
import { useSettingsStore } from '../store/useSettingsStore';
import { useConversationStore } from '../store/useConversationStore';
import { useCompanionStore } from '../store/useCompanionStore';
import { useDanceStore } from '../store/useDanceStore';
import { UsbSerialService } from '../services/UsbSerialService';
import { RobotController } from '../robot/RobotController';
import { DanceMode } from '../robot/DanceMode';
interface HomeScreenProps {
  navigation: any;
}

export const HomeScreen: React.FC<HomeScreenProps> = ({ navigation }) => {
  const isConnected = useRobotStore((state) => state.isConnected);
  const motorSpeed = useRobotStore((state) => state.motorSpeed);
  const activeClaimant = useRobotStore((state) => state.activeClaimant);
  const emergencyActive = useRobotStore((state) => state.emergencyActive);
  const emergencyStop = useRobotStore((state) => state.emergencyStop);
  const clearEmergency = useRobotStore((state) => state.clearEmergency);
  const currentEmotion = useEmotionStore((state) => state.currentEmotion);
  const companionState = useCompanionStore((state) => state.state);
  const danceEnabled = useDanceStore((state) => state.enabled);
  const danceStatus = useDanceStore((state) => state.status);
  const initializeSettings = useSettingsStore((state) => state.initializeSettings);
  const initializeLogs = useConversationStore((state) => state.initializeLogs);
  const ai = useSettingsStore((state) => state.ai);
  const robot = useSettingsStore((state) => state.robot);

  useEffect(() => {
    // Initialize settings from shared preferences, then sync motor speed to controller
    (async () => {
      await initializeSettings();
      const settings = useSettingsStore.getState().robot;
      RobotController.setSpeed(settings.motorSpeed);
      RobotController.setUseDifferentialDrive(!!settings.useDifferentialDrive);
    })();
    initializeLogs();
    // Auto-probe USB devices on load
    UsbSerialService.autoConnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleRetryUsb = async () => {
    await UsbSerialService.autoConnect();
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.title}>ABIOGENESIS</Text>
            <Text style={styles.subtitle}>Companion Robot Control Center</Text>
          </View>
          <View style={styles.headerRight}>
            {emergencyActive ? (
              <TouchableOpacity style={styles.clearEstopBtn} onPress={clearEmergency} activeOpacity={0.8}>
                <Text style={styles.estopBtnText}>CLEAR E-STOP</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity style={styles.estopBtn} onPress={emergencyStop} activeOpacity={0.8}>
                <Text style={styles.estopBtnText}>E-STOP</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={[styles.statusBadge, isConnected ? styles.connectedBadge : styles.disconnectedBadge]}
              onPress={handleRetryUsb}
              activeOpacity={0.8}
            >
              <View style={[styles.statusDot, isConnected ? styles.connectedDot : styles.disconnectedDot]} />
              <Text style={styles.statusText}>{isConnected ? 'USB Connected' : 'USB Offline'}</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.claimBanner}>
          <Text style={styles.claimText}>
            Motor claim: {activeClaimant ?? 'NONE'}
            {emergencyActive ? ' · EMERGENCY LATCHED' : ''}
            {' · '}Speed {motorSpeed}
            {robot.useDifferentialDrive ? ' · Diff ON' : ''}
            {' · '}Companion: {companionState}
          </Text>
        </View>

        {/* Dashboard Grid */}
        <View style={styles.grid}>
          {/* Card 1: Face Engine */}
          <TouchableOpacity
            style={styles.card}
            onPress={() => navigation.navigate('Face')}
            activeOpacity={0.8}
          >
            <Text style={styles.cardIcon}>🤖</Text>
            <Text style={styles.cardTitle}>Robot Face</Text>
            <Text style={styles.cardDesc}>Enter immersive screen. Active emotion: {currentEmotion}</Text>
          </TouchableOpacity>

          {/* Card 2: Manual Control */}
          <TouchableOpacity
            style={styles.card}
            onPress={() => navigation.navigate('ManualControl')}
            activeOpacity={0.8}
          >
            <Text style={styles.cardIcon}>🎮</Text>
            <Text style={styles.cardTitle}>Manual Drive</Text>
            <Text style={styles.cardDesc}>Drive motors manually. Current speed: {motorSpeed}</Text>
          </TouchableOpacity>

          {/* Card 3: Settings */}
          <TouchableOpacity
            style={styles.card}
            onPress={() => navigation.navigate('Settings')}
            activeOpacity={0.8}
          >
            <Text style={styles.cardIcon}>⚙️</Text>
            <Text style={styles.cardTitle}>Settings</Text>
            <Text style={styles.cardDesc}>Configure AI provider, voice, and system defaults</Text>
          </TouchableOpacity>

          {/* Card 4: Serial Debugger */}
          <TouchableOpacity
            style={styles.card}
            onPress={() => navigation.navigate('SerialTest')}
            activeOpacity={0.8}
          >
            <Text style={styles.cardIcon}>🔌</Text>
            <Text style={styles.cardTitle}>Serial Debugger</Text>
            <Text style={styles.cardDesc}>Test USB serial connection. Send commands and read responses</Text>
          </TouchableOpacity>

          {/* Card 5: Vision Tracking */}
          <TouchableOpacity
            style={styles.card}
            onPress={() => navigation.navigate('Vision')}
            activeOpacity={0.8}
          >
            <Text style={styles.cardIcon}>👁️</Text>
            <Text style={styles.cardTitle}>Vision Tracking</Text>
            <Text style={styles.cardDesc}>Run MediaPipe body landmarks tracking and center-offset diagnostics</Text>
          </TouchableOpacity>

          {/* Card 6: Dance */}
          <TouchableOpacity
            style={styles.card}
            onPress={() => {
              if (DanceMode.isEnabled()) {
                DanceMode.stop('ui');
              } else {
                DanceMode.start('spin_happy');
              }
            }}
            activeOpacity={0.8}
          >
            <Text style={styles.cardIcon}>💃</Text>
            <Text style={styles.cardTitle}>Dance</Text>
            <Text style={styles.cardDesc}>
              {danceEnabled
                ? `Playing spin_happy · ${danceStatus}. Tap to stop.`
                : `Scripted spin_happy routine. Companion: ${companionState}`}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Info panel */}
        <View style={styles.infoPanel}>
          <Text style={styles.infoTitle}>AI Brain Status</Text>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>AI Provider Model:</Text>
            <Text style={styles.infoValue}>{ai.model || 'Not Configured'}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Base URL:</Text>
            <Text style={styles.infoValue} numberOfLines={1}>{ai.baseUrl}</Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#0A0A0E',
  },
  container: {
    padding: 24,
    paddingBottom: 40,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  estopBtn: {
    backgroundColor: '#B00020',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#FF3C3C',
  },
  clearEstopBtn: {
    backgroundColor: 'rgba(255, 180, 0, 0.25)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#FFB400',
  },
  estopBtnText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 0.8,
  },
  claimBanner: {
    marginBottom: 20,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  claimText: {
    color: '#8E8E9F',
    fontSize: 12,
    fontWeight: '600',
  },
  title: {
    color: '#FFFFFF',
    fontSize: 28,
    fontWeight: '900',
    letterSpacing: 1.5,
  },
  subtitle: {
    color: '#8E8E9F',
    fontSize: 13,
    marginTop: 4,
    fontWeight: '500',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
  },
  connectedBadge: {
    backgroundColor: 'rgba(0, 255, 200, 0.1)',
    borderColor: 'rgba(0, 255, 200, 0.25)',
  },
  disconnectedBadge: {
    backgroundColor: 'rgba(255, 60, 60, 0.1)',
    borderColor: 'rgba(255, 60, 60, 0.25)',
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  connectedDot: {
    backgroundColor: '#00FFC8',
  },
  disconnectedDot: {
    backgroundColor: '#FF3C3C',
  },
  statusText: {
    color: '#E0E0E6',
    fontSize: 12,
    fontWeight: 'bold',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  card: {
    width: '48%',
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  cardIcon: {
    fontSize: 32,
    marginBottom: 12,
  },
  cardTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 6,
  },
  cardDesc: {
    color: '#8E8E9F',
    fontSize: 12,
    lineHeight: 16,
  },
  infoPanel: {
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.04)',
    borderRadius: 16,
    padding: 20,
  },
  infoTitle: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: 'bold',
    marginBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.06)',
    paddingBottom: 8,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  infoLabel: {
    color: '#8E8E9F',
    fontSize: 13,
  },
  infoValue: {
    color: '#E0E0E6',
    fontSize: 13,
    fontWeight: '600',
    maxWidth: '60%',
  },
});
