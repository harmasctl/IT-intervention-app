import React, { useEffect } from 'react';
import { AppState, AppStateStatus, Platform } from 'react-native';
import { useAuth } from './AuthProvider';

// Only import notifications on native platforms
let Notifications: any = null;
let notificationsLib: any = null;

// Dynamically import notifications only on native platforms
if (Platform.OS !== 'web') {
  // This import will only run on native platforms
  import('expo-notifications').then(module => {
    Notifications = module;
    import('../lib/maintenanceNotifications').then(lib => {
      notificationsLib = lib;
    });
  });
}

/**
 * MaintenanceManager component
 * 
 * This component handles the initialization and lifecycle management
 * of the maintenance notification system. It should be mounted
 * in the app's root component.
 */
export default function MaintenanceManager() {
  const { session } = useAuth();
  
  useEffect(() => {
    // Skip notifications on web platform
    if (Platform.OS === 'web' || !session) return;
    
    // Wait until Notifications and lib are loaded
    if (!Notifications || !notificationsLib) {
      const checkModulesInterval = setInterval(() => {
        if (Notifications && notificationsLib) {
          clearInterval(checkModulesInterval);
          initializeNotifications();
        }
      }, 100);
      
      return () => clearInterval(checkModulesInterval);
    } else {
      initializeNotifications();
    }
    
    // Initialize notification system
    function initializeNotifications() {
      try {
        // Configure notification handling
        notificationsLib.configureNotifications();
        
        // Request push notification permissions
        notificationsLib.registerForPushNotifications();
        
        // Do initial check for maintenance schedules
        notificationsLib.checkAndScheduleMaintenanceNotifications();
      } catch (error) {
        console.error('Error initializing maintenance notifications:', error);
      }
    }
    
    // Set up notification listeners
    let notificationListener: any = null;
    let responseListener: any = null;
    
    if (Notifications) {
      notificationListener = Notifications.addNotificationReceivedListener(
        (notification: any) => {
          console.log('Notification received:', notification);
        }
      );
      
      // Set up notification response handler for when user taps notification
      responseListener = Notifications.addNotificationResponseReceivedListener(
        (response: any) => {
          notificationsLib.handleNotificationResponse(response);
        }
      );
    }
    
    // Listen for app state changes to refresh maintenance checks
    const appStateSubscription = AppState.addEventListener(
      'change',
      (nextAppState: AppStateStatus) => {
        if (nextAppState === 'active' && session && notificationsLib) {
          // Check for maintenance notifications when app comes to foreground
          notificationsLib.checkAndScheduleMaintenanceNotifications();
        }
      }
    );
    
    // Clean up listeners when component unmounts
    return () => {
      if (notificationListener) {
        Notifications.removeNotificationSubscription(notificationListener);
      }
      if (responseListener) {
        Notifications.removeNotificationSubscription(responseListener);
      }
      appStateSubscription.remove();
    };
  }, [session]);
  
  // This component doesn't render anything
  return null;
} 