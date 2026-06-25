import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, ScrollView, TextInput, SafeAreaView, NativeModules } from 'react-native';
import { useSettingsStore } from '../store/useSettingsStore';
import { useConversationStore } from '../store/useConversationStore';

const { VoiceModule } = NativeModules;

type SettingsTab = 'AI' | 'VOICE' | 'ROBOT' | 'DISPLAY' | 'LOGS';

export const SettingsScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const { ai, voice, robot, display, updateAISettings, updateVoiceSettings, updateRobotSettings, updateDisplaySettings } = useSettingsStore();
  const { messages, apiErrors, clearConversation, clearErrors } = useConversationStore();
  const [activeTab, setActiveTab] = useState<SettingsTab>('AI');
  const [availableVoices, setAvailableVoices] = useState<any[]>([]);

  useEffect(() => {
    if (activeTab === 'VOICE') {
      VoiceModule.getAvailableVoices()
        .then((voices: any[]) => {
          // Filter English voices
          const filtered = voices.filter((v: any) =>
            v.locale.toLowerCase().startsWith('en') || v.name.toLowerCase().includes('en')
          );
          setAvailableVoices(filtered);
        })
        .catch((err: any) => console.warn('Failed to load system voices', err));
    }
  }, [activeTab]);

  const renderAITab = () => (
    <View style={styles.tabContent}>
      <Text style={styles.sectionTitle}>AI Brain Settings</Text>
      
      <Text style={styles.label}>Base URL</Text>
      <TextInput
        style={styles.input}
        value={ai.baseUrl}
        onChangeText={(val) => updateAISettings({ baseUrl: val })}
        placeholder="https://api.openai.com/v1"
        placeholderTextColor="#555"
      />

      <Text style={styles.label}>API Key</Text>
      <TextInput
        style={styles.input}
        value={ai.apiKey}
        onChangeText={(val) => updateAISettings({ apiKey: val })}
        placeholder="sk-..."
        placeholderTextColor="#555"
        secureTextEntry
      />

      <Text style={styles.label}>Model Name</Text>
      <TextInput
        style={styles.input}
        value={ai.model}
        onChangeText={(val) => updateAISettings({ model: val })}
        placeholder="gpt-4o-mini"
        placeholderTextColor="#555"
      />

      <View style={styles.row}>
        <View style={styles.halfWidth}>
          <Text style={styles.label}>Temperature ({ai.temperature})</Text>
          <View style={styles.stepper}>
            <TouchableOpacity 
              style={styles.stepButton} 
              onPress={() => updateAISettings({ temperature: Math.max(0, parseFloat((ai.temperature - 0.1).toFixed(1))) })}
            >
              <Text style={styles.stepText}>-</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.stepButton} 
              onPress={() => updateAISettings({ temperature: Math.min(2.0, parseFloat((ai.temperature + 0.1).toFixed(1))) })}
            >
              <Text style={styles.stepText}>+</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.halfWidth}>
          <Text style={styles.label}>Max Tokens ({ai.maxTokens})</Text>
          <View style={styles.stepper}>
            <TouchableOpacity 
              style={styles.stepButton} 
              onPress={() => updateAISettings({ maxTokens: Math.max(50, ai.maxTokens - 50) })}
            >
              <Text style={styles.stepText}>-</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.stepButton} 
              onPress={() => updateAISettings({ maxTokens: Math.min(4000, ai.maxTokens + 50) })}
            >
              <Text style={styles.stepText}>+</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      <Text style={styles.label}>System Prompt</Text>
      <TextInput
        style={[styles.input, styles.multilineInput]}
        value={ai.systemPrompt}
        onChangeText={(val) => updateAISettings({ systemPrompt: val })}
        multiline
        numberOfLines={4}
      />
    </View>
  );

  const renderVoiceTab = () => (
    <View style={styles.tabContent}>
      <Text style={styles.sectionTitle}>Voice Assistant Settings</Text>

      <Text style={styles.label}>Wake Word</Text>
      <TextInput
        style={styles.input}
        value={voice.wakeWord}
        onChangeText={(val) => updateVoiceSettings({ wakeWord: val })}
        placeholder="Sonic"
        placeholderTextColor="#555"
      />

      <Text style={styles.label}>Selected Voice Engine Code</Text>
      <TextInput
        style={styles.input}
        value={voice.voice}
        onChangeText={(val) => updateVoiceSettings({ voice: val })}
        placeholder="en-us-x-sfg#female_1-local"
        placeholderTextColor="#555"
      />

      <Text style={styles.label}>Available Natural Voices (Click to Select & Preview)</Text>
      {availableVoices.length > 0 ? (
        <ScrollView style={styles.voiceList} nestedScrollEnabled>
          {availableVoices.map((v) => {
            const isSelected = voice.voice === v.name;
            return (
              <TouchableOpacity
                key={v.name}
                style={[
                  styles.voiceItem,
                  isSelected && styles.activeVoiceItem
                ]}
                onPress={async () => {
                  updateVoiceSettings({ voice: v.name });
                  try {
                    await VoiceModule.setVoiceSettings(voice.speechRate, voice.volume);
                    await VoiceModule.speak("Hello! This is a preview of my voice.", v.name);
                  } catch (e) {
                    console.error('Failed to preview voice', e);
                  }
                }}
              >
                <View style={styles.voiceItemRow}>
                  <Text style={[styles.voiceNameText, isSelected && styles.activeVoiceNameText]}>
                    {v.name.replace('en-us-x-', '').replace('-local', '')}
                  </Text>
                  {v.isNetwork && (
                    <Text style={styles.networkTag}>CLOUD</Text>
                  )}
                  {isSelected && (
                    <Text style={styles.selectedCheck}>✓</Text>
                  )}
                </View>
                <Text style={styles.voiceLocaleText}>Locale: {v.locale}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      ) : (
        <Text style={styles.noVoicesText}>No system voices found or loading...</Text>
      )}

      <View style={styles.row}>
        <View style={styles.halfWidth}>
          <Text style={styles.label}>Speech Rate ({voice.speechRate}x)</Text>
          <View style={styles.stepper}>
            <TouchableOpacity 
              style={styles.stepButton} 
              onPress={() => updateVoiceSettings({ speechRate: Math.max(0.5, parseFloat((voice.speechRate - 0.1).toFixed(1))) })}
            >
              <Text style={styles.stepText}>-</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.stepButton} 
              onPress={() => updateVoiceSettings({ speechRate: Math.min(2.5, parseFloat((voice.speechRate + 0.1).toFixed(1))) })}
            >
              <Text style={styles.stepText}>+</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.halfWidth}>
          <Text style={styles.label}>Volume ({Math.round(voice.volume * 100)}%)</Text>
          <View style={styles.stepper}>
            <TouchableOpacity 
              style={styles.stepButton} 
              onPress={() => updateVoiceSettings({ volume: Math.max(0, parseFloat((voice.volume - 0.1).toFixed(1))) })}
            >
              <Text style={styles.stepText}>-</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.stepButton} 
              onPress={() => updateVoiceSettings({ volume: Math.min(1.0, parseFloat((voice.volume + 0.1).toFixed(1))) })}
            >
              <Text style={styles.stepText}>+</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </View>
  );

  const renderRobotTab = () => (
    <View style={styles.tabContent}>
      <Text style={styles.sectionTitle}>Chassis & Movement Settings</Text>

      <Text style={styles.label}>Default Speed ({robot.motorSpeed})</Text>
      <View style={styles.stepper}>
        <TouchableOpacity 
          style={styles.stepButton} 
          onPress={() => updateRobotSettings({ motorSpeed: Math.max(0, robot.motorSpeed - 10) })}
        >
          <Text style={styles.stepText}>-10</Text>
        </TouchableOpacity>
        <Text style={styles.valueDisplay}>{robot.motorSpeed} / 255</Text>
        <TouchableOpacity 
          style={styles.stepButton} 
          onPress={() => updateRobotSettings({ motorSpeed: Math.min(255, robot.motorSpeed + 10) })}
        >
          <Text style={styles.stepText}>+10</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.label}>Following Distance ({robot.followDistance}m)</Text>
      <View style={styles.stepper}>
        <TouchableOpacity 
          style={styles.stepButton} 
          onPress={() => updateRobotSettings({ followDistance: Math.max(0.5, parseFloat((robot.followDistance - 0.1).toFixed(1))) })}
        >
          <Text style={styles.stepText}>-</Text>
        </TouchableOpacity>
        <Text style={styles.valueDisplay}>{robot.followDistance} meters</Text>
        <TouchableOpacity 
          style={styles.stepButton} 
          onPress={() => updateRobotSettings({ followDistance: Math.min(5.0, parseFloat((robot.followDistance + 0.1).toFixed(1))) })}
        >
          <Text style={styles.stepText}>+</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.label}>Tracking Sensitivity ({Math.round(robot.trackingSensitivity * 100)}%)</Text>
      <View style={styles.stepper}>
        <TouchableOpacity 
          style={styles.stepButton} 
          onPress={() => updateRobotSettings({ trackingSensitivity: Math.max(0.1, parseFloat((robot.trackingSensitivity - 0.05).toFixed(2))) })}
        >
          <Text style={styles.stepText}>-</Text>
        </TouchableOpacity>
        <Text style={styles.valueDisplay}>{Math.round(robot.trackingSensitivity * 100)}%</Text>
        <TouchableOpacity 
          style={styles.stepButton} 
          onPress={() => updateRobotSettings({ trackingSensitivity: Math.min(1.0, parseFloat((robot.trackingSensitivity + 0.05).toFixed(2))) })}
        >
          <Text style={styles.stepText}>+</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderDisplayTab = () => (
    <View style={styles.tabContent}>
      <Text style={styles.sectionTitle}>Screen & Face Settings</Text>

      <Text style={styles.label}>Face Style Theme</Text>
      <View style={styles.row}>
        {['default', 'neon-glow', 'cyberpunk'].map((style) => (
          <TouchableOpacity
            key={style}
            style={[styles.choiceBtn, display.faceStyle === style && styles.activeChoiceBtn]}
            onPress={() => updateDisplaySettings({ faceStyle: style })}
          >
            <Text style={[styles.choiceText, display.faceStyle === style && styles.activeChoiceText]}>
              {style.toUpperCase()}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={styles.label}>Screen Brightness ({Math.round(display.brightness * 100)}%)</Text>
      <View style={styles.stepper}>
        <TouchableOpacity 
          style={styles.stepButton} 
          onPress={() => updateDisplaySettings({ brightness: Math.max(0.1, parseFloat((display.brightness - 0.1).toFixed(1))) })}
        >
          <Text style={styles.stepText}>-</Text>
        </TouchableOpacity>
        <Text style={styles.valueDisplay}>{Math.round(display.brightness * 100)}%</Text>
        <TouchableOpacity 
          style={styles.stepButton} 
          onPress={() => updateDisplaySettings({ brightness: Math.min(1.0, parseFloat((display.brightness + 0.1).toFixed(1))) })}
        >
          <Text style={styles.stepText}>+</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.label}>Idle Sleep Timeout ({display.sleepTimeout} mins)</Text>
      <View style={styles.stepper}>
        <TouchableOpacity 
          style={styles.stepButton} 
          onPress={() => updateDisplaySettings({ sleepTimeout: Math.max(1, display.sleepTimeout - 1) })}
        >
          <Text style={styles.stepText}>-</Text>
        </TouchableOpacity>
        <Text style={styles.valueDisplay}>{display.sleepTimeout} minutes</Text>
        <TouchableOpacity 
          style={styles.stepButton} 
          onPress={() => updateDisplaySettings({ sleepTimeout: Math.min(60, display.sleepTimeout + 1) })}
        >
          <Text style={styles.stepText}>+</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderLogsTab = () => (
    <View style={styles.tabContent}>
      {/* 1. Conversation Logs */}
      <View style={styles.sectionHeaderRow}>
        <Text style={styles.sectionTitle}>Conversation History</Text>
        {messages.length > 0 && (
          <TouchableOpacity style={styles.clearBtn} onPress={clearConversation}>
            <Text style={styles.clearBtnText}>Clear History</Text>
          </TouchableOpacity>
        )}
      </View>

      {messages.length > 0 ? (
        <ScrollView style={styles.logContainer} nestedScrollEnabled>
          {messages.map((msg) => {
            const dateStr = new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
            return (
              <View key={msg.id} style={[styles.msgItem, msg.role === 'user' ? styles.userMsgItem : msg.role === 'system' ? styles.systemMsgItem : styles.assistantMsgItem]}>
                <View style={styles.msgHeader}>
                  <Text style={[styles.msgRoleText, msg.role === 'user' ? styles.userRoleText : msg.role === 'system' ? styles.systemRoleText : styles.assistantRoleText]}>
                    {msg.role.toUpperCase()}
                  </Text>
                  <Text style={styles.msgTimeText}>{dateStr}</Text>
                </View>
                <Text style={styles.msgContentText}>{msg.content}</Text>
              </View>
            );
          })}
        </ScrollView>
      ) : (
        <Text style={styles.noLogsText}>No conversations recorded on device yet.</Text>
      )}

      {/* 2. API Error Logs */}
      <View style={[styles.sectionHeaderRow, { marginTop: 24 }]}>
        <Text style={styles.sectionTitle}>API Error History</Text>
        {apiErrors.length > 0 && (
          <TouchableOpacity style={styles.clearBtn} onPress={clearErrors}>
            <Text style={styles.clearBtnText}>Clear Error Logs</Text>
          </TouchableOpacity>
        )}
      </View>

      {apiErrors.length > 0 ? (
        <ScrollView style={styles.logContainer} nestedScrollEnabled>
          {apiErrors.map((err) => {
            const dateStr = new Date(err.timestamp).toLocaleString();
            return (
              <View key={err.id} style={styles.errorItem}>
                <View style={styles.errorHeader}>
                  <Text style={styles.errorTitleText}>⚠ {err.message}</Text>
                  <Text style={styles.errorTimeText}>{dateStr}</Text>
                </View>
                {err.details && (
                  <Text style={styles.errorDetailsText}>{err.details}</Text>
                )}
              </View>
            );
          })}
        </ScrollView>
      ) : (
        <Text style={styles.noLogsText}>No API errors recorded. Systems normal!</Text>
      )}
    </View>
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Settings Navigation Bar */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>System Settings</Text>
        <View style={styles.placeholder} />
      </View>

      {/* Tabs */}
      <View style={styles.tabsRow}>
        {(['AI', 'VOICE', 'ROBOT', 'DISPLAY', 'LOGS'] as SettingsTab[]).map((tab) => (
          <TouchableOpacity
            key={tab}
            style={[styles.tabButton, activeTab === tab && styles.activeTabButton]}
            onPress={() => setActiveTab(tab)}
          >
            <Text style={[styles.tabButtonText, activeTab === tab && styles.activeTabButtonText]}>
              {tab}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView contentContainerStyle={styles.scrollContainer}>
        {activeTab === 'AI' && renderAITab()}
        {activeTab === 'VOICE' && renderVoiceTab()}
        {activeTab === 'ROBOT' && renderRobotTab()}
        {activeTab === 'DISPLAY' && renderDisplayTab()}
        {activeTab === 'LOGS' && renderLogsTab()}
      </ScrollView>
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
    paddingVertical: 16,
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
  placeholder: {
    width: 60,
  },
  tabsRow: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.05)',
  },
  tabButton: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
  },
  activeTabButton: {
    borderBottomWidth: 2,
    borderBottomColor: '#00FFFF',
  },
  tabButtonText: {
    color: '#8E8E9F',
    fontSize: 13,
    fontWeight: '600',
  },
  activeTabButtonText: {
    color: '#00FFFF',
  },
  scrollContainer: {
    padding: 20,
    paddingBottom: 40,
  },
  tabContent: {
    flex: 1,
  },
  sectionTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 20,
    letterSpacing: 0.5,
  },
  label: {
    color: '#8E8E9F',
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  input: {
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 12,
    color: '#FFFFFF',
    fontSize: 14,
    marginBottom: 20,
  },
  multilineInput: {
    height: 100,
    textAlignVertical: 'top',
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  halfWidth: {
    width: '48%',
  },
  stepper: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    paddingHorizontal: 4,
    paddingVertical: 4,
    justifyContent: 'space-between',
  },
  stepButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    width: 40,
    height: 40,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepText: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: 'bold',
  },
  valueDisplay: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: 'bold',
  },
  choiceBtn: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
    marginRight: 8,
  },
  activeChoiceBtn: {
    backgroundColor: 'rgba(0, 255, 255, 0.1)',
    borderColor: '#00FFFF',
  },
  choiceText: {
    color: '#8E8E9F',
    fontSize: 12,
    fontWeight: 'bold',
  },
  activeChoiceText: {
    color: '#00FFFF',
  },
  voiceList: {
    maxHeight: 180,
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    padding: 8,
    marginBottom: 20,
  },
  voiceItem: {
    padding: 12,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    marginBottom: 8,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  activeVoiceItem: {
    backgroundColor: 'rgba(0, 255, 255, 0.06)',
    borderColor: 'rgba(0, 255, 255, 0.3)',
  },
  voiceItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  voiceNameText: {
    color: '#D0D0D0',
    fontSize: 14,
    fontWeight: '600',
    flex: 1,
  },
  activeVoiceNameText: {
    color: '#00FFFF',
    fontWeight: 'bold',
  },
  networkTag: {
    fontSize: 9,
    color: '#FF007F',
    backgroundColor: 'rgba(255, 0, 127, 0.15)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginRight: 8,
    fontWeight: 'bold',
  },
  selectedCheck: {
    color: '#00FFFF',
    fontSize: 14,
    fontWeight: 'bold',
  },
  voiceLocaleText: {
    color: 'rgba(255, 255, 255, 0.4)',
    fontSize: 11,
    marginTop: 2,
  },
  noVoicesText: {
    color: 'rgba(255, 255, 255, 0.4)',
    fontSize: 13,
    fontStyle: 'italic',
    marginBottom: 20,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  clearBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: 'rgba(255, 0, 85, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255, 0, 85, 0.3)',
  },
  clearBtnText: {
    color: '#FF0055',
    fontSize: 12,
    fontWeight: 'bold',
  },
  logContainer: {
    maxHeight: 250,
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    padding: 8,
  },
  msgItem: {
    padding: 10,
    borderRadius: 8,
    marginBottom: 8,
    borderWidth: 1,
  },
  userMsgItem: {
    backgroundColor: 'rgba(0, 255, 255, 0.03)',
    borderColor: 'rgba(0, 255, 255, 0.1)',
  },
  assistantMsgItem: {
    backgroundColor: 'rgba(255, 0, 255, 0.03)',
    borderColor: 'rgba(255, 0, 255, 0.1)',
  },
  systemMsgItem: {
    backgroundColor: 'rgba(255, 170, 0, 0.03)',
    borderColor: 'rgba(255, 170, 0, 0.1)',
  },
  msgHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  msgRoleText: {
    fontSize: 10,
    fontWeight: 'bold',
  },
  userRoleText: {
    color: '#00FFFF',
  },
  assistantRoleText: {
    color: '#FF00FF',
  },
  systemRoleText: {
    color: '#FFAA00',
  },
  msgTimeText: {
    color: 'rgba(255, 255, 255, 0.3)',
    fontSize: 10,
  },
  msgContentText: {
    color: '#E0E0E0',
    fontSize: 13,
    lineHeight: 18,
  },
  noLogsText: {
    color: 'rgba(255, 255, 255, 0.3)',
    fontSize: 13,
    fontStyle: 'italic',
    paddingVertical: 12,
    paddingHorizontal: 8,
  },
  errorItem: {
    backgroundColor: 'rgba(255, 0, 85, 0.03)',
    borderColor: 'rgba(255, 0, 85, 0.15)',
    borderWidth: 1,
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  errorHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  errorTitleText: {
    color: '#FF0055',
    fontSize: 13,
    fontWeight: 'bold',
    flex: 1,
    marginRight: 8,
  },
  errorTimeText: {
    color: 'rgba(255, 255, 255, 0.3)',
    fontSize: 10,
  },
  errorDetailsText: {
    color: 'rgba(255, 255, 255, 0.5)',
    fontSize: 11,
    fontFamily: 'monospace',
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
    padding: 6,
    borderRadius: 4,
  },
});
