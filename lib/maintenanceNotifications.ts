import * as Notifications from 'expo-notifications';
import { addDays, format, isBefore, isAfter } from 'date-fns';
import { supabase } from './supabase';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Linking from 'expo-linking';

// Type for device maintenance data
type DeviceMaintenance = {
  id: string;
  name: string;
  type: string;
  serial_number: string;
  last_maintenance: string | null;
  maintenance_interval: number;
  restaurant_name: string;
  category_name: string;
};

// Register for push notifications
export async function registerForPushNotifications() {
  // Check if we already have permission
  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  // If we don't have permission yet, ask for it
  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  // If we still don't have permission, we can't send notifications
  if (finalStatus !== 'granted') {
    return false;
  }

  // Get the token
  const token = (await Notifications.getExpoPushTokenAsync()).data;
  
  // Store the token for later use
  await AsyncStorage.setItem('pushToken', token);
  
  return true;
}

// Configure notification behavior
export function configureNotifications() {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
      shouldShowBanner: true,
      shouldShowList: true,
      priority: Notifications.AndroidNotificationPriority.HIGH,
    }),
  });
}

// Check for upcoming maintenance and schedule notifications
export async function checkAndScheduleMaintenanceNotifications() {
  try {
    // Only proceed if notifications are enabled
    const hasPermission = await registerForPushNotifications();
    if (!hasPermission) return;

    // Fetch devices that need maintenance
    const { data, error } = await supabase
      .from('devices')
      .select(`
        id,
        name,
        type,
        serial_number,
        last_maintenance,
        restaurant_id,
        next_maintenance_reminder_sent,
        restaurants(name),
        device_categories(name, maintenance_interval)
      `)
      .order('name');

    if (error) {
      console.error('Error fetching devices for maintenance check:', error);
      return;
    }

    const today = new Date();
    
    // Process each device
    if (data) {
      for (const device of data) {
        // Skip devices without maintenance interval
        if (!device.device_categories || !device.device_categories.maintenance_interval) continue;

        const lastMaintenance = device.last_maintenance 
          ? new Date(device.last_maintenance) 
          : null;
          
        const interval = device.device_categories.maintenance_interval;
        
        // Calculate next maintenance date
        let nextMaintenance: Date;
        if (lastMaintenance) {
          nextMaintenance = addDays(new Date(lastMaintenance), interval);
        } else {
          // If no previous maintenance, schedule from today
          nextMaintenance = addDays(today, interval / 2);
        }
        
        // Calculate days remaining
        const daysRemaining = Math.ceil(
          (nextMaintenance.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
        );
        
        // Check if we should send a notification:
        // 1. For upcoming maintenance: 7 days before due date
        // 2. For overdue: On the due date and not already reminded
        
        // Get restaurant name safely
        let restaurantName = "Unknown";
        if (device.restaurants && typeof device.restaurants === 'object') {
          restaurantName = device.restaurants.name || "Unknown";
        }
        
        const deviceInfo: DeviceMaintenance = {
          id: device.id,
          name: device.name,
          type: device.type,
          serial_number: device.serial_number,
          last_maintenance: device.last_maintenance,
          maintenance_interval: device.device_categories.maintenance_interval,
          restaurant_name: restaurantName,
          category_name: device.device_categories.name,
        };

        const reminderSent = device.next_maintenance_reminder_sent 
          ? new Date(device.next_maintenance_reminder_sent)
          : null;
        
        // Check if we need to send upcoming reminder (7 days before)
        if (daysRemaining === 7) {
          if (!reminderSent || isAfter(today, addDays(reminderSent, 7))) {
            await scheduleUpcomingMaintenanceNotification(deviceInfo, daysRemaining);
            
            // Update reminder sent timestamp
            await supabase
              .from('devices')
              .update({ next_maintenance_reminder_sent: new Date().toISOString() })
              .eq('id', device.id);
          }
        }
        
        // Check if we need to send overdue reminder (on or after due date)
        if (daysRemaining <= 0) {
          // Only send if we haven't sent a reminder in the last 3 days
          if (!reminderSent || isAfter(today, addDays(reminderSent, 3))) {
            await scheduleOverdueMaintenanceNotification(deviceInfo, Math.abs(daysRemaining));
            
            // Update reminder sent timestamp
            await supabase
              .from('devices')
              .update({ next_maintenance_reminder_sent: new Date().toISOString() })
              .eq('id', device.id);
          }
        }
      }
    }
  } catch (error) {
    console.error('Error checking maintenance schedule:', error);
  }
}

// Schedule notification for upcoming maintenance
async function scheduleUpcomingMaintenanceNotification(
  device: DeviceMaintenance,
  daysRemaining: number
) {
  await Notifications.scheduleNotificationAsync({
    content: {
      title: 'Upcoming Maintenance',
      body: `${device.name} at ${device.restaurant_name} is due for maintenance in ${daysRemaining} days`,
      data: { deviceId: device.id, type: 'upcoming' },
    },
    trigger: null, // Send immediately
  });
}

// Schedule notification for overdue maintenance
async function scheduleOverdueMaintenanceNotification(
  device: DeviceMaintenance,
  daysOverdue: number
) {
  await Notifications.scheduleNotificationAsync({
    content: {
      title: 'Maintenance Overdue',
      body: `${device.name} at ${device.restaurant_name} is overdue for maintenance by ${daysOverdue} days`,
      data: { deviceId: device.id, type: 'overdue' },
    },
    trigger: null, // Send immediately
  });
}

// Handle notification response (when user taps on a notification)
export function handleNotificationResponse(response: Notifications.NotificationResponse) {
  const data = response.notification.request.content.data;
  
  // Navigate to the notification handler with the appropriate params
  if (data?.deviceId) {
    const url = Linking.createURL('/notification-handler', {
      queryParams: {
        deviceId: data.deviceId as string,
        type: data.type as string || 'maintenance'
      }
    });
    
    // Open the URL which will trigger the notification handler
    Linking.openURL(url);
  } else {
    // If no specific device, go to maintenance schedule
    const url = Linking.createURL('/schedule/maintenance');
    Linking.openURL(url);
  }
} 