import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Animated, TouchableOpacity } from 'react-native';
import { Wifi, WifiOff, RefreshCw } from 'lucide-react-native';
import { useOffline } from './OfflineManager';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const NetworkStatusIndicator = () => {
  const { isOnline, pendingActions, syncOfflineActions } = useOffline();
  const [animation] = useState(new Animated.Value(0));
  const insets = useSafeAreaInsets();
  
  // Animation for rotating sync icon
  const [rotation, setRotation] = useState(new Animated.Value(0));
  const [syncing, setSyncing] = useState(false);
  
  // Start the rotation animation when syncing
  useEffect(() => {
    if (syncing) {
      Animated.loop(
        Animated.timing(rotation, {
          toValue: 1,
          duration: 1500,
          useNativeDriver: true,
        })
      ).start();
    } else {
      rotation.setValue(0);
    }
  }, [syncing, rotation]);
  
  // Convert rotation value to degrees
  const spin = rotation.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  // Show indicator when offline or when there are pending actions
  useEffect(() => {
    if (!isOnline || pendingActions > 0) {
      Animated.timing(animation, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }).start();
    } else {
      Animated.timing(animation, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }).start();
    }
  }, [isOnline, pendingActions]);

  const handleSync = async () => {
    if (pendingActions > 0 && isOnline) {
      setSyncing(true);
      await syncOfflineActions();
      setSyncing(false);
    }
  };

  // If online and no pending actions, don't render anything
  if (isOnline && pendingActions === 0) {
    return null;
  }

  const containerStyle = [
    styles.container,
    {
      backgroundColor: !isOnline ? '#f59e0b' : '#3b82f6',
      transform: [
        {
          translateY: animation.interpolate({
            inputRange: [0, 1],
            outputRange: [50, 0],
          }),
        },
      ],
      paddingBottom: insets.bottom > 0 ? insets.bottom : 8,
      paddingTop: 8,
    },
  ];

  return (
    <Animated.View style={containerStyle}>
      <View style={styles.content}>
        {!isOnline ? (
          <>
            <WifiOff size={18} color="#fff" />
            <Text style={styles.text}>You're offline. Changes will be saved locally.</Text>
          </>
        ) : (
          <>
            <Wifi size={18} color="#fff" />
            <Text style={styles.text}>{pendingActions} {pendingActions === 1 ? 'change' : 'changes'} pending synchronization</Text>
            <TouchableOpacity 
              style={styles.syncButton} 
              onPress={handleSync}
              disabled={syncing}
            >
              <Animated.View style={{ transform: [{ rotate: spin }] }}>
                <RefreshCw size={18} color="#fff" />
              </Animated.View>
            </TouchableOpacity>
          </>
        )}
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    zIndex: 9999,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  text: {
    color: '#fff',
    marginLeft: 8,
    fontWeight: '500',
    flex: 1,
  },
  syncButton: {
    padding: 8,
  }
});

export default NetworkStatusIndicator; 