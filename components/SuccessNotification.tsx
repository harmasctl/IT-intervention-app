import React, { useEffect } from 'react';
import { View, Text, StyleSheet, Animated, TouchableOpacity } from 'react-native';
import { CheckCircle, X } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';

interface SuccessNotificationProps {
  message: string;
  visible: boolean;
  onDismiss: () => void;
  autoHideDuration?: number;
}

const SuccessNotification = ({ 
  message, 
  visible, 
  onDismiss, 
  autoHideDuration = 5000 
}: SuccessNotificationProps) => {
  const translateY = new Animated.Value(-100);

  useEffect(() => {
    if (visible) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      
      // Animate in
      Animated.spring(translateY, {
        toValue: 0,
        useNativeDriver: true,
        tension: 80,
        friction: 10,
      }).start();

      // Auto hide after duration
      const timer = setTimeout(() => {
        handleDismiss();
      }, autoHideDuration);

      return () => clearTimeout(timer);
    }
  }, [visible]);

  const handleDismiss = () => {
    // Animate out
    Animated.timing(translateY, {
      toValue: -100,
      duration: 300,
      useNativeDriver: true,
    }).start(() => {
      onDismiss();
    });
  };

  if (!visible) return null;

  return (
    <Animated.View 
      style={[
        styles.container,
        { transform: [{ translateY }] }
      ]}
    >
      <View style={styles.content}>
        <CheckCircle size={24} color="#16a34a" />
        <Text style={styles.message}>{message}</Text>
        <TouchableOpacity onPress={handleDismiss} style={styles.closeButton}>
          <X size={20} color="#6b7280" />
        </TouchableOpacity>
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    backgroundColor: '#f0fdf4',
    borderBottomWidth: 1,
    borderBottomColor: '#86efac',
    paddingTop: 50,
    paddingBottom: 16,
    paddingHorizontal: 16,
    zIndex: 1000,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 5,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  message: {
    flex: 1,
    marginLeft: 12,
    fontSize: 16,
    color: '#166534',
    fontWeight: '500',
  },
  closeButton: {
    padding: 4,
  },
});

export default SuccessNotification; 