import React, { useState, useCallback } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, ScrollView, SafeAreaView } from 'react-native';
import { UsbSerialService, UsbSerialStatus } from '../services/UsbSerialService';

interface LogEntry {
  id: number;
  timestamp: string;
  type: 'info' | 'success' | 'error' | 'data';
  message: string;
}

export const SerialTestScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [status, setStatus] = useState<UsbSerialStatus>(UsbSerialService.getStatus());
  const [connecting, setConnecting] = useState(false);

  let logCounter = 0;

  const addLog = useCallback((type: LogEntry['type'], message: string) => {
    const now = new Date();
    const timestamp = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}.${now.getMilliseconds().toString().padStart(3, '0')}`;
    setLogs(prev => [
      { id: Date.now() + Math.random(), timestamp, type, message },
      ...prev.slice(0, 99), // Keep last 100 entries
    ]);
  }, []);

  const refreshStatus = () => {
    setStatus(UsbSerialService.getStatus());
  };

  const handleListDevices = async () => {
    addLog('info', '📡 Scanning for USB serial devices...');
    const devices = await UsbSerialService.listDevices();
    refreshStatus();

    if (devices.length === 0) {
      addLog('error', '❌ No USB serial devices found');
    } else {
      devices.forEach((d: any) => {
        addLog('success', `✅ Found: VID=${d.vendorId} (0x${d.vendorId.toString(16).toUpperCase()}) PID=${d.productId} (0x${d.productId.toString(16).toUpperCase()}) — ${d.productName || d.deviceName}`);
      });
      addLog('info', `Total: ${devices.length} device(s)`);
    }
  };

  const handleConnect = async () => {
    setConnecting(true);
    addLog('info', '🔌 Auto-connecting to Arduino...');
    const result = await UsbSerialService.autoConnect();
    refreshStatus();
    setConnecting(false);

    if (result) {
      addLog('success', '✅ Connected! Port open, Arduino should be ready.');
    } else {
      const s = UsbSerialService.getStatus();
      addLog('error', `❌ Connection failed: ${s.lastError || s.lastAction}`);
    }
  };

  const handleDisconnect = async () => {
    addLog('info', '🔌 Disconnecting...');
    await UsbSerialService.disconnect();
    refreshStatus();
    addLog('info', '⬜ Disconnected');
  };

  const handleSendString = async (data: string, label: string) => {
    const hexRepr = Array.from(data).map(c => '0x' + c.charCodeAt(0).toString(16).toUpperCase().padStart(2, '0')).join(' ');
    addLog('info', `📤 Sending string "${label}" → bytes: [${hexRepr}]`);
    const ok = await UsbSerialService.write(data);
    refreshStatus();
    if (ok) {
      addLog('success', `✅ write("${label}") succeeded`);
    } else {
      addLog('error', `❌ write("${label}") failed`);
    }
  };

  const handleSendBytes = async (bytes: number[], label: string) => {
    const hexRepr = bytes.map(b => '0x' + b.toString(16).toUpperCase().padStart(2, '0')).join(' ');
    addLog('info', `📤 Sending raw bytes "${label}" → [${hexRepr}]`);
    const ok = await UsbSerialService.writeBytes(bytes);
    refreshStatus();
    if (ok) {
      addLog('success', `✅ writeBytes([${hexRepr}]) succeeded`);
    } else {
      addLog('error', `❌ writeBytes([${hexRepr}]) failed`);
    }
  };

  const handleRead = async () => {
    addLog('info', '📥 Reading from serial port...');
    const response = await UsbSerialService.read();
    refreshStatus();
    if (response && response.length > 0) {
      addLog('data', `📥 Received: "${response.trim()}"`);
    } else {
      addLog('info', '📥 No data available (empty response)');
    }
  };

  const handleSendAndRead = async (data: string, label: string) => {
    await handleSendString(data, label);
    // Small delay for Arduino to process and respond
    await new Promise<void>(r => setTimeout(r, 200));
    await handleRead();
  };

  const handleClearLogs = () => {
    setLogs([]);
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Serial Debugger</Text>
        <TouchableOpacity style={styles.clearBtn} onPress={handleClearLogs}>
          <Text style={styles.clearBtnText}>Clear</Text>
        </TouchableOpacity>
      </View>

      {/* Status Bar */}
      <View style={styles.statusBar}>
        <View style={[styles.statusIndicator, status.isConnected ? styles.statusGreen : styles.statusRed]} />
        <Text style={styles.statusLabel}>
          {status.isConnected ? 'CONNECTED' : 'DISCONNECTED'}
        </Text>
        <Text style={styles.statusDetail} numberOfLines={1}>
          {status.nativeModuleAvailable ? '• Module OK' : '• ❌ NO MODULE'}
          {' • '}{status.lastAction}
        </Text>
      </View>

      <View style={styles.body}>
        {/* Button Grid */}
        <View style={styles.buttonGrid}>
          {/* Row 1: Connection */}
          <View style={styles.buttonRow}>
            <TouchableOpacity style={[styles.actionBtn, styles.btnBlue]} onPress={handleListDevices}>
              <Text style={styles.actionBtnText}>📡 List{'\n'}Devices</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionBtn, status.isConnected ? styles.btnGreen : styles.btnOrange]}
              onPress={status.isConnected ? handleDisconnect : handleConnect}
              disabled={connecting}
            >
              <Text style={styles.actionBtnText}>
                {connecting ? '⏳\nConnecting' : status.isConnected ? '🟢\nDisconnect' : '🔌\nConnect'}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.actionBtn, styles.btnPurple]} onPress={handleRead}>
              <Text style={styles.actionBtnText}>📥 Read{'\n'}Response</Text>
            </TouchableOpacity>
          </View>

          {/* Row 2: String writes */}
          <View style={styles.buttonRow}>
            <TouchableOpacity style={[styles.actionBtn, styles.btnTeal]} onPress={() => handleSendString('F\n', 'F\\n')}>
              <Text style={styles.actionBtnText}>📤 Send{'\n'}"F\n"</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.actionBtn, styles.btnTeal]} onPress={() => handleSendString('S\n', 'S\\n')}>
              <Text style={styles.actionBtnText}>📤 Send{'\n'}"S\n"</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.actionBtn, styles.btnCyan]} onPress={() => handleSendAndRead('F\n', 'F\\n + Read')}>
              <Text style={styles.actionBtnText}>📤📥{'\n'}F + Read</Text>
            </TouchableOpacity>
          </View>

          {/* Row 3: Byte-level writes */}
          <View style={styles.buttonRow}>
            <TouchableOpacity style={[styles.actionBtn, styles.btnAmber]} onPress={() => handleSendBytes([0x46, 0x0A], 'F\\n bytes')}>
              <Text style={styles.actionBtnText}>🔢 Bytes{'\n'}[46,0A]</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.actionBtn, styles.btnAmber]} onPress={() => handleSendBytes([0x53, 0x0A], 'S\\n bytes')}>
              <Text style={styles.actionBtnText}>🔢 Bytes{'\n'}[53,0A]</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.actionBtn, styles.btnRed]} onPress={() => handleSendBytes([0x61], "'a' LED ON")}>
              <Text style={styles.actionBtnText}>💡 Send{'\n'}0x61 'a'</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Log Panel */}
        <View style={styles.logPanel}>
          <Text style={styles.logTitle}>SERIAL LOG</Text>
          <ScrollView 
            style={styles.logScroll} 
            contentContainerStyle={styles.logScrollContent}
            nestedScrollEnabled={true}
            showsVerticalScrollIndicator={true}
          >
            {logs.length === 0 ? (
              <Text style={styles.logEmpty}>Tap a button above to start testing...</Text>
            ) : (
              logs.map(log => (
                <View key={log.id} style={styles.logEntry}>
                  <Text style={styles.logTimestamp}>{log.timestamp}</Text>
                  <Text style={[
                    styles.logMessage,
                    log.type === 'success' && styles.logSuccess,
                    log.type === 'error' && styles.logError,
                    log.type === 'data' && styles.logData,
                  ]}>
                    {log.message}
                  </Text>
                </View>
              ))
            )}
          </ScrollView>
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
    paddingHorizontal: 16,
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
    fontSize: 17,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  clearBtn: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 60, 60, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255, 60, 60, 0.2)',
  },
  clearBtnText: {
    color: '#FF5555',
    fontSize: 12,
    fontWeight: '700',
  },
  statusBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.04)',
  },
  statusIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  statusGreen: {
    backgroundColor: '#00FFC8',
  },
  statusRed: {
    backgroundColor: '#FF3C3C',
  },
  statusLabel: {
    color: '#E0E0E6',
    fontSize: 11,
    fontWeight: 'bold',
    letterSpacing: 1,
    marginRight: 12,
  },
  statusDetail: {
    flex: 1,
    color: '#6E6E7F',
    fontSize: 10,
    fontFamily: 'monospace',
  },
  body: {
    flex: 1,
    padding: 12,
  },
  buttonGrid: {
    marginBottom: 12,
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  actionBtn: {
    flex: 1,
    marginHorizontal: 3,
    paddingVertical: 12,
    paddingHorizontal: 6,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    minHeight: 56,
  },
  actionBtnText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: 'bold',
    textAlign: 'center',
    lineHeight: 14,
  },
  btnBlue: {
    backgroundColor: 'rgba(60, 120, 255, 0.15)',
    borderColor: 'rgba(60, 120, 255, 0.3)',
  },
  btnGreen: {
    backgroundColor: 'rgba(0, 255, 200, 0.1)',
    borderColor: 'rgba(0, 255, 200, 0.3)',
  },
  btnOrange: {
    backgroundColor: 'rgba(255, 165, 0, 0.15)',
    borderColor: 'rgba(255, 165, 0, 0.3)',
  },
  btnPurple: {
    backgroundColor: 'rgba(180, 80, 255, 0.15)',
    borderColor: 'rgba(180, 80, 255, 0.3)',
  },
  btnTeal: {
    backgroundColor: 'rgba(0, 200, 180, 0.12)',
    borderColor: 'rgba(0, 200, 180, 0.3)',
  },
  btnCyan: {
    backgroundColor: 'rgba(0, 255, 255, 0.1)',
    borderColor: 'rgba(0, 255, 255, 0.3)',
  },
  btnAmber: {
    backgroundColor: 'rgba(255, 200, 0, 0.12)',
    borderColor: 'rgba(255, 200, 0, 0.3)',
  },
  btnRed: {
    backgroundColor: 'rgba(255, 60, 60, 0.12)',
    borderColor: 'rgba(255, 60, 60, 0.3)',
  },
  logPanel: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
    overflow: 'hidden',
  },
  logTitle: {
    color: '#8E8E9F',
    fontSize: 10,
    fontWeight: 'bold',
    letterSpacing: 1.5,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.04)',
  },
  logScroll: {
    flex: 1,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  logScrollContent: {
    flexGrow: 1,
  },
  logEmpty: {
    color: '#555',
    fontSize: 12,
    fontStyle: 'italic',
    textAlign: 'center',
    marginTop: 20,
  },
  logEntry: {
    flexDirection: 'row',
    marginBottom: 3,
    alignItems: 'flex-start',
  },
  logTimestamp: {
    color: '#555',
    fontSize: 9,
    fontFamily: 'monospace',
    marginRight: 6,
    minWidth: 75,
    marginTop: 1,
  },
  logMessage: {
    color: '#B0B0B8',
    fontSize: 11,
    fontFamily: 'monospace',
    flex: 1,
    lineHeight: 15,
  },
  logSuccess: {
    color: '#00FFC8',
  },
  logError: {
    color: '#FF5555',
  },
  logData: {
    color: '#FFD700',
    fontWeight: 'bold',
  },
});
