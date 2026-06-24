import React, { useEffect, useState, useCallback } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, SafeAreaView, Clipboard, Platform } from 'react-native';
import { useRobotStore, MovementDirection } from '../store/useRobotStore';
import { UsbSerialService } from '../services/UsbSerialService';
import { WebControllerService } from '../services/WebControllerService';

export const ManualControlScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const { isConnected, motorSpeed, currentDirection, setDirection, setMotorSpeed } = useRobotStore();
  const [connecting, setConnecting] = useState(false);
  
  // Web Server State
  const [webServerUrl, setWebServerUrl] = useState<string | null>(WebControllerService.getServerUrl());
  const [isServerRunning, setIsServerRunning] = useState(false);
  const [copied, setCopied] = useState(false);

  // Check web server status on mount
  useEffect(() => {
    const checkServer = async () => {
      const running = await WebControllerService.isRunning();
      setIsServerRunning(running);
      if (running) {
        setWebServerUrl(WebControllerService.getServerUrl());
      }
    };
    checkServer();
  }, []);

  const handleConnect = useCallback(async () => {
    setConnecting(true);
    await UsbSerialService.autoConnect();
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

  const toggleWebServer = async () => {
    if (isServerRunning) {
      await WebControllerService.stopServer();
      setIsServerRunning(false);
      setWebServerUrl(null);
    } else {
      const url = await WebControllerService.startServer(8080);
      if (url) {
        setIsServerRunning(true);
        setWebServerUrl(url);
      }
    }
  };

  const handleCopyLink = () => {
    if (webServerUrl) {
      Clipboard.setString(webServerUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
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

      <View style={styles.mainLayout}>
        {/* Left Column: D-PAD */}
        <View style={styles.leftCol}>
          <Text style={styles.infoLabel}>CURRENT DIRECTION: {currentDirection}</Text>
          
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

        {/* Right Column: Speed + Web Controller */}
        <View style={styles.rightCol}>
          {/* Speed tuning panel */}
          <View style={styles.speedPanel}>
            <Text style={styles.panelTitle}>Chassis Speed Tuning</Text>
            <View style={styles.speedRow}>
              <Text style={styles.speedValue}>{motorSpeed} <Text style={styles.speedUnit}>PWM</Text></Text>
              <View style={styles.speedActions}>
                <TouchableOpacity style={styles.speedBtn} onPress={() => adjustSpeed(-15)}>
                  <Text style={styles.speedBtnText}>-15</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.speedBtn} onPress={() => adjustSpeed(15)}>
                  <Text style={styles.speedBtnText}>+15</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>

          {/* WiFi Remote Web Server Panel */}
          <View style={styles.webPanel}>
            <View style={styles.webHeader}>
              <Text style={styles.panelTitle}>WiFi Pilot Web Server</Text>
              <View style={[styles.serverStatusIndicator, isServerRunning ? styles.serverOnline : styles.serverOffline]} />
            </View>
            
            {isServerRunning && webServerUrl ? (
              <View style={styles.urlContainer}>
                <Text style={styles.urlLabel}>Access Web Controller at:</Text>
                <TouchableOpacity onPress={handleCopyLink} activeOpacity={0.7} style={styles.urlValueBox}>
                  <Text style={styles.urlValueText}>{webServerUrl}</Text>
                  <Text style={styles.copyText}>{copied ? 'Copied! ✅' : 'Copy 📋'}</Text>
                </TouchableOpacity>
                <Text style={styles.wifiNote}>Devices must be connected to the same WiFi network.</Text>
              </View>
            ) : (
              <View style={styles.urlContainer}>
                <Text style={styles.serverOfflineText}>Web server is offline. Click start to host remote dashboard.</Text>
              </View>
            )}

            <TouchableOpacity 
              style={[styles.webServerBtn, isServerRunning ? styles.webServerStopBtn : styles.webServerStartBtn]} 
              onPress={toggleWebServer}
              activeOpacity={0.8}
            >
              <Text style={styles.webServerBtnText}>
                {isServerRunning ? '⏹ STOP WEB SERVER' : '⚡ START WEB SERVER'}
              </Text>
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
    paddingVertical: 10,
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
    fontSize: 13,
    fontWeight: '600',
  },
  title: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  connectButton: {
    paddingHorizontal: 14,
    paddingVertical: 6,
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
    fontSize: 11,
    fontWeight: '700',
  },
  mainLayout: {
    flex: 1,
    flexDirection: 'row',
    padding: 12,
  },
  leftCol: {
    flex: 1.1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRightWidth: 1,
    borderRightColor: 'rgba(255, 255, 255, 0.03)',
    paddingRight: 10,
  },
  rightCol: {
    flex: 1.3,
    justifyContent: 'space-between',
    paddingLeft: 16,
  },
  infoLabel: {
    color: '#8E8E9F',
    fontSize: 11,
    fontWeight: 'bold',
    marginBottom: 10,
    letterSpacing: 1,
  },
  dpad: {
    width: 200,
    height: 200,
    justifyContent: 'center',
    alignItems: 'center',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 2,
  },
  btn: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 5,
  },
  activeBtn: {
    backgroundColor: '#00FFFF',
    borderColor: '#00FFFF',
  },
  btnText: {
    color: '#FFFFFF',
    fontSize: 20,
  },
  stopBtn: {
    backgroundColor: 'rgba(255, 60, 60, 0.1)',
    borderColor: 'rgba(255, 60, 60, 0.25)',
  },
  activeStopBtn: {
    backgroundColor: '#FF3C3C',
    borderColor: '#FF3C3C',
  },
  stopText: {
    color: '#FF3C3C',
    fontWeight: 'bold',
    fontSize: 10,
  },
  speedPanel: {
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.04)',
    borderRadius: 12,
    padding: 10,
    marginBottom: 8,
  },
  panelTitle: {
    color: '#8E8E9F',
    fontSize: 9,
    fontWeight: 'bold',
    textTransform: 'uppercase',
    letterSpacing: 1.2,
    marginBottom: 4,
  },
  speedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  speedValue: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '900',
  },
  speedUnit: {
    fontSize: 11,
    color: '#8E8E9F',
    fontWeight: 'normal',
  },
  speedActions: {
    flexDirection: 'row',
  },
  speedBtn: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
    marginHorizontal: 3,
  },
  speedBtnText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 11,
  },
  webPanel: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.04)',
    borderRadius: 12,
    padding: 10,
    justifyContent: 'space-between',
  },
  webHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  serverStatusIndicator: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  serverOnline: {
    backgroundColor: '#00FFC8',
  },
  serverOffline: {
    backgroundColor: '#FF3C3C',
  },
  urlContainer: {
    marginVertical: 4,
  },
  urlLabel: {
    color: '#8E8E9F',
    fontSize: 9,
    marginBottom: 2,
  },
  urlValueBox: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.3)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 5,
  },
  urlValueText: {
    color: '#00FFFF',
    fontFamily: 'monospace',
    fontSize: 11,
    fontWeight: 'bold',
  },
  copyText: {
    color: '#8E8E9F',
    fontSize: 9,
    fontWeight: 'bold',
  },
  wifiNote: {
    color: '#555566',
    fontSize: 8,
    marginTop: 2,
  },
  serverOfflineText: {
    color: '#666677',
    fontSize: 10,
    textAlign: 'center',
    paddingVertical: 6,
  },
  webServerBtn: {
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: 'center',
  },
  webServerStartBtn: {
    backgroundColor: 'rgba(0, 255, 200, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(0, 255, 200, 0.25)',
  },
  webServerStopBtn: {
    backgroundColor: 'rgba(255, 60, 60, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(255, 60, 60, 0.25)',
  },
  webServerBtnText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 10,
    letterSpacing: 0.5,
  },
});
