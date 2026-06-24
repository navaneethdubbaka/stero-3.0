import React, { useState } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, ScrollView, TextInput, SafeAreaView } from 'react-native';
import { useSettingsStore } from '../store/useSettingsStore';

type SettingsTab = 'AI' | 'VOICE' | 'ROBOT' | 'DISPLAY';

export const SettingsScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const { ai, voice, robot, display, updateAISettings, updateVoiceSettings, updateRobotSettings, updateDisplaySettings } = useSettingsStore();
  const [activeTab, setActiveTab] = useState<SettingsTab>('AI');

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

      <Text style={styles.label}>Voice Engine Code</Text>
      <TextInput
        style={styles.input}
        value={voice.voice}
        onChangeText={(val) => updateVoiceSettings({ voice: val })}
        placeholder="en-us-x-sfg#female_1-local"
        placeholderTextColor="#555"
      />

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
        {(['AI', 'VOICE', 'ROBOT', 'DISPLAY'] as SettingsTab[]).map((tab) => (
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
});
