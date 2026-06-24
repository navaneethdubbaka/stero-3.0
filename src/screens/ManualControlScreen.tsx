import React, { useEffect, useState, useCallback } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, SafeAreaView } from 'react-native';
import { useRobotStore, MovementDirection } from '../store/useRobotStore';
import { UsbSerialService, UsbSerialStatus } from '../services/UsbSerialService';

export const ManualControlScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const { isConnected, motorSpeed, currentDirection, setDirection, setMotorSpeed } = useRobotStore();
  const [status, setStatus] = useState<UsbSerialStatus>(UsbSerialService.getStatus());
  const [connecting, setConnecting] = useState(false);

  // Refresh diagnostic status periodically
  useEffect(() => {
    const interval = setInterval(() => {
      setStatus(UsbSerialService.getStatus());
    }, 500);
    return () => clearInterval(interval);
  }, []);

  // Auto-connect on screen mount if not already connected
  useEffect(() => {
    if (!isConnected) {
      handleConnect();
    }
  }, []);

  const handleConnect = useCallback(async () => {
    setConnecting(true);
    await UsbSerialService.autoConnect();
    setStatus(UsbSerialService.getStatus());
    setConnecting(false);
  }, []);

  const handlePressIn = (direction: MovementDirection) => {
    setDirection(direction);
  };

  const handlePressOut = () => {
    setDirection('S');
  };

  const adjustSpeed = (amount: number) => {
    setMotorSpeed(motorSpeed + amount);
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Manual Drive</Text>
        <TouchableOpacity
          style={[styles.connectButton, isConnected ? styles.connectedBtn : styles.disconnectedBtn]}
          onPress={handleConnect}
          disabled={connecting}
          activeOpacity={0.7}
        >
          <Text style={styles.connectBtnText}>
            {connecting ? '⏳ Connecting...' : isConnected ? '🟢 Connected' : '🔴 Connect'}
          </Text>
        </TouchableOpacity>
      </View>

      <View style={styles.content}>
        {/* Diagnostic Panel */}
        <View style={styles.diagPanel}>
          <Text style={styles.diagTitle}>USB DIAGNOSTICS</Text>
          <Text style={[styles.diagText, status.nativeModuleAvailable ? styles.diagGood : styles.diagBad]}>
            Native Module: {status.nativeModuleAvailable ? '✅ Available' : '❌ NOT FOUND'}
          </Text>
          <Text style={[styles.diagText, status.isConnected ? styles.diagGood : styles.diagBad]}>
            Port Status: {status.isConnected ? '✅ Open' : '❌ Closed'}
          </Text>
          <Text style={styles.diagText}>
            Last Action: {status.lastAction}
          </Text>
          {status.lastError && (
            <Text style={[styles.diagText, styles.diagBad]}>
              Error: {status.lastError}
            </Text>
          )}
        </View>

        <View style={styles.controllerContainer}>
          <Text style={styles.infoLabel}>CURRENT DIRECTION: {currentDirection}</Text>

          {/* D-PAD Grid */}
          <View style={styles.dpad}>
            {/* Row 1: Forward */}
            <View style={styles.row}>
              <TouchableOpacity
                style={[styles.btn, currentDirection === 'F' && styles.activeBtn]}
                onPressIn={() => handlePressIn('F')}
                onPressOut={handlePressOut}
                activeOpacity={0.6}
              >
                <Text style={styles.btnText}>▲</Text>
              </TouchableOpacity>
            </View>

            {/* Row 2: Left, Stop, Right */}
            <View style={styles.row}>
              <TouchableOpacity
                style={[styles.btn, currentDirection === 'L' && styles.activeBtn]}
                onPressIn={() => handlePressIn('L')}
                onPressOut={handlePressOut}
                activeOpacity={0.6}
              >
                <Text style={styles.btnText}>◀</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.btn, styles.stopBtn, currentDirection === 'S' && styles.activeStopBtn]}
                onPress={() => setDirection('S')}
                activeOpacity={0.6}
              >
                <Text style={styles.stopText}>STOP</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.btn, currentDirection === 'R' && styles.activeBtn]}
                onPressIn={() => handlePressIn('R')}
                onPressOut={handlePressOut}
                activeOpacity={0.6}
              >
                <Text style={styles.btnText}>▶</Text>
              </TouchableOpacity>
            </View>

            {/* Row 3: Backward */}
            <View style={styles.row}>
              <TouchableOpacity
                style={[styles.btn, currentDirection === 'B' && styles.activeBtn]}
                onPressIn={() => handlePressIn('B')}
                onPressOut={handlePressOut}
                activeOpacity={0.6}
              >
                <Text style={styles.btnText}>▼</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Speed Controller Panel */}
        <View style={styles.speedPanel}>
          <Text style={styles.panelTitle}>Chassis Speed Tuning</Text>
          <Text style={styles.speedValue}>{motorSpeed} <Text style={styles.speedUnit}>PWM</Text></Text>

          <View style={styles.speedActions}>
            <TouchableOpacity style={styles.speedBtn} onPress={() => adjustSpeed(-20)}>
              <Text style={styles.speedBtnText}>-20</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.speedBtn} onPress={() => adjustSpeed(-5)}>
              <Text style={styles.speedBtnText}>-5</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.speedBtn} onPress={() => adjustSpeed(5)}>
              <Text style={styles.speedBtnText}>+5</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.speedBtn} onPress={() => adjustSpeed(20)}>
              <Text style={styles.speedBtnText}>+20</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#0A0A0E',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.05)',
  },
  backButton: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  backText: {
    color: '#E0E0E6',
    fontSize: 14,
    fontWeight: '600',
  },
  title: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
  connectButton: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  connectedBtn: {
    backgroundColor: 'rgba(0, 255, 200, 0.1)',
    borderColor: 'rgba(0, 255, 200, 0.3)',
  },
  disconnectedBtn: {
    backgroundColor: 'rgba(255, 60, 60, 0.1)',
    borderColor: 'rgba(255, 60, 60, 0.3)',
  },
  connectBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  content: {
    flex: 1,
    padding: 16,
    justifyContent: 'space-between',
  },
  diagPanel: {
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
  },
  diagTitle: {
    color: '#8E8E9F',
    fontSize: 10,
    fontWeight: 'bold',
    letterSpacing: 1.5,
    marginBottom: 6,
  },
  diagText: {
    color: '#B0B0B8',
    fontSize: 11,
    fontFamily: 'monospace',
    marginBottom: 2,
  },
  diagGood: {
    color: '#00FFC8',
  },
  diagBad: {
    color: '#FF5555',
  },
  controllerContainer: {
    alignItems: 'center',
  },
  infoLabel: {
    color: '#8E8E9F',
    fontSize: 12,
    fontWeight: 'bold',
    marginBottom: 12,
    letterSpacing: 1,
  },
  dpad: {
    width: 240,
    height: 240,
    justifyContent: 'center',
    alignItems: 'center',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 4,
  },
  btn: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 8,
  },
  activeBtn: {
    backgroundColor: '#00FFFF',
    borderColor: '#00FFFF',
  },
  btnText: {
    color: '#FFFFFF',
    fontSize: 26,
  },
  stopBtn: {
    backgroundColor: 'rgba(255, 60, 60, 0.1)',
    borderColor: 'rgba(255, 60, 60, 0.3)',
  },
  activeStopBtn: {
    backgroundColor: '#FF3C3C',
    borderColor: '#FF3C3C',
  },
  stopText: {
    color: '#FF3C3C',
    fontWeight: 'bold',
    fontSize: 13,
  },
  speedPanel: {
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
  },
  panelTitle: {
    color: '#8E8E9F',
    fontSize: 11,
    fontWeight: 'bold',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  speedValue: {
    color: '#FFFFFF',
    fontSize: 28,
    fontWeight: '900',
    marginBottom: 12,
  },
  speedUnit: {
    fontSize: 13,
    color: '#8E8E9F',
    fontWeight: 'normal',
  },
  speedActions: {
    flexDirection: 'row',
  },
  speedBtn: {
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 10,
    marginHorizontal: 5,
  },
  speedBtnText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 12,
  },
});
