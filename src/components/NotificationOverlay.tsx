import React, { useEffect, useRef } from 'react';
import { StyleSheet, View, Text, Animated } from 'react-native';
import { useNotificationStore } from '../store/useNotificationStore';
import { useEmotionStore } from '../store/useEmotionStore';

export const NotificationOverlay: React.FC = () => {
  const { activeNotification, setActiveNotification } = useNotificationStore();
  const { setEmotion } = useEmotionStore();
  const slideAnim = useRef(new Animated.Value(-200)).current; // Start hidden off-screen

  useEffect(() => {
    if (activeNotification) {
      // Trigger SURPRISED emotion when notification arrives
      setEmotion('SURPRISED');

      // Slide In
      Animated.spring(slideAnim, {
        toValue: 20,
        useNativeDriver: true,
        tension: 50,
        friction: 8,
      }).start();

      // Auto dismiss after 6 seconds
      const timer = setTimeout(() => {
        // Slide Out
        Animated.timing(slideAnim, {
          toValue: -200,
          duration: 300,
          useNativeDriver: true,
        }).start(() => {
          setActiveNotification(null);
          setEmotion('IDLE'); // Return to IDLE face
        });
      }, 6000);

      return () => clearTimeout(timer);
    }
  }, [activeNotification, slideAnim, setActiveNotification, setEmotion]);

  if (!activeNotification) return null;

  // Determine branding color based on messaging platform source
  let sourceColor = '#00FFFF'; // WhatsApp (Default Cyberpunk cyan)
  if (activeNotification.source === 'Telegram') sourceColor = '#0088CC';
  else if (activeNotification.source === 'WhatsApp') sourceColor = '#25D366';
  else if (activeNotification.source === 'Call') sourceColor = '#FF3B30';
  else if (activeNotification.source === 'SMS') sourceColor = '#FF9500';

  return (
    <Animated.View style={[styles.overlay, { transform: [{ translateY: slideAnim }] }]}>
      <View style={[styles.card, { borderColor: sourceColor }]}>
        <View style={styles.header}>
          <Text style={[styles.sourceText, { color: sourceColor }]}>
            {activeNotification.source.toUpperCase()}
          </Text>
          <Text style={styles.timeText}>
            {new Date(activeNotification.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </Text>
        </View>
        <Text style={styles.senderText} numberOfLines={1}>
          {activeNotification.sender}
        </Text>
        <Text style={styles.messageText} numberOfLines={2}>
          {activeNotification.message}
        </Text>
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0,
    left: '25%',
    right: '25%',
    zIndex: 9999,
  },
  card: {
    backgroundColor: 'rgba(10, 10, 15, 0.95)',
    borderWidth: 2,
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.5,
    shadowRadius: 10,
    elevation: 8,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  sourceText: {
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1,
  },
  timeText: {
    color: 'rgba(255, 255, 255, 0.4)',
    fontSize: 10,
  },
  senderText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  messageText: {
    color: '#E0E0E6',
    fontSize: 13,
    lineHeight: 18,
  },
});
