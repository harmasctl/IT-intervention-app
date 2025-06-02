import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from './supabase';

export interface NotificationData {
  title: string;
  body: string;
  data?: any;
  sound?: boolean;
  priority?: 'default' | 'high' | 'max';
  categoryId?: string;
}

export interface ScheduledNotification {
  id: string;
  title: string;
  body: string;
  trigger: Date | number;
  data?: any;
  repeat?: boolean;
}

export interface NotificationSettings {
  enabled: boolean;
  ticketUpdates: boolean;
  maintenanceReminders: boolean;
  systemAlerts: boolean;
  deviceAlerts: boolean;
  scheduleReminders: boolean;
  sound: boolean;
  vibration: boolean;
  quietHours: {
    enabled: boolean;
    start: string; // HH:MM format
    end: string;   // HH:MM format
  };
}

class PushNotificationService {
  private expoPushToken: string | null = null;
  private notificationSettings: NotificationSettings = {
    enabled: true,
    ticketUpdates: true,
    maintenanceReminders: true,
    systemAlerts: true,
    deviceAlerts: true,
    scheduleReminders: true,
    sound: true,
    vibration: true,
    quietHours: {
      enabled: false,
      start: '22:00',
      end: '08:00',
    },
  };

  constructor() {
    // Only initialize on native platforms
    if (Platform.OS !== 'web') {
      this.initializeNotifications();
    }
    this.loadSettings();
  }

  // Initialize notification system
  private async initializeNotifications() {
    // Set notification handler
    Notifications.setNotificationHandler({
      handleNotification: async (notification) => {
        const settings = await this.getSettings();

        // Check if notifications are enabled
        if (!settings.enabled) {
          return {
            shouldShowAlert: false,
            shouldPlaySound: false,
            shouldSetBadge: false,
          };
        }

        // Check quiet hours
        if (this.isQuietHours(settings)) {
          return {
            shouldShowAlert: true,
            shouldPlaySound: false,
            shouldSetBadge: true,
          };
        }

        return {
          shouldShowAlert: true,
          shouldPlaySound: settings.sound,
          shouldSetBadge: true,
        };
      },
    });

    // Register for push notifications
    await this.registerForPushNotifications();

    // Set up notification categories
    await this.setupNotificationCategories();
  }

  // Register for push notifications
  private async registerForPushNotifications(): Promise<string | null> {
    // Check if running on a physical device (simplified check)
    if (Platform.OS === 'web') {
      console.log('Push notifications not supported on web');
      return null;
    }

    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      console.log('Failed to get push token for push notification!');
      return null;
    }

    try {
      const token = (await Notifications.getExpoPushTokenAsync()).data;
      this.expoPushToken = token;

      // Store token in database for server-side notifications
      await this.storeTokenInDatabase(token);

      return token;
    } catch (error) {
      console.error('Error getting push token:', error);
      return null;
    }
  }

  // Store push token in database
  private async storeTokenInDatabase(token: string): Promise<void> {
    try {
      const { data: { user } } = await supabase.auth.getUser();

      if (user) {
        await supabase
          .from('user_push_tokens')
          .upsert({
            user_id: user.id,
            push_token: token,
            platform: Platform.OS,
            updated_at: new Date().toISOString(),
          });
      }
    } catch (error) {
      console.error('Error storing push token:', error);
    }
  }

  // Setup notification categories
  private async setupNotificationCategories(): Promise<void> {
    // Only set up categories on native platforms
    if (Platform.OS === 'web') {
      console.log('Notification categories not supported on web');
      return;
    }

    try {
      await Notifications.setNotificationCategoryAsync('ticket', [
        {
          identifier: 'view',
          buttonTitle: 'View Ticket',
          options: { opensAppToForeground: true },
        },
        {
          identifier: 'assign',
          buttonTitle: 'Assign to Me',
          options: { opensAppToForeground: true },
        },
      ]);

      await Notifications.setNotificationCategoryAsync('maintenance', [
        {
          identifier: 'view',
          buttonTitle: 'View Details',
          options: { opensAppToForeground: true },
        },
        {
          identifier: 'complete',
          buttonTitle: 'Mark Complete',
          options: { opensAppToForeground: true },
        },
      ]);

      await Notifications.setNotificationCategoryAsync('alert', [
        {
          identifier: 'view',
          buttonTitle: 'View Alert',
          options: { opensAppToForeground: true },
        },
        {
          identifier: 'dismiss',
          buttonTitle: 'Dismiss',
          options: { opensAppToForeground: false },
        },
      ]);
    } catch (error) {
      console.warn('Failed to setup notification categories:', error);
    }
  }

  // Send local notification
  async sendLocalNotification(notification: NotificationData): Promise<string> {
    const settings = await this.getSettings();

    if (!settings.enabled) {
      throw new Error('Notifications are disabled');
    }

    // Check notification type permissions
    if (!this.isNotificationTypeEnabled(notification.categoryId, settings)) {
      throw new Error('This notification type is disabled');
    }

    // For web, use browser notifications if available
    if (Platform.OS === 'web') {
      return this.sendWebNotification(notification);
    }

    try {
      const notificationId = await Notifications.scheduleNotificationAsync({
        content: {
          title: notification.title,
          body: notification.body,
          data: notification.data || {},
          sound: settings.sound && notification.sound !== false,
          priority: notification.priority || 'default',
          categoryIdentifier: notification.categoryId,
        },
        trigger: null, // Send immediately
      });

      return notificationId;
    } catch (error) {
      console.warn('Failed to send notification:', error);
      return 'notification_failed';
    }
  }

  // Send web notification
  private async sendWebNotification(notification: NotificationData): Promise<string> {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      console.warn('Web notifications not supported');
      return 'web_notification_not_supported';
    }

    // Request permission if needed
    if (Notification.permission === 'default') {
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        throw new Error('Notification permission denied');
      }
    }

    if (Notification.permission === 'granted') {
      const webNotification = new Notification(notification.title, {
        body: notification.body,
        icon: '/icon.png', // You can customize this
        badge: '/badge.png', // You can customize this
      });

      // Auto-close after 5 seconds
      setTimeout(() => {
        webNotification.close();
      }, 5000);

      return 'web_notification_sent';
    }

    throw new Error('Notification permission not granted');
  }

  // Schedule notification
  async scheduleNotification(notification: ScheduledNotification): Promise<string> {
    const settings = await this.getSettings();

    if (!settings.enabled) {
      throw new Error('Notifications are disabled');
    }

    // For web, we can't schedule notifications, so just log it
    if (Platform.OS === 'web') {
      console.log('Scheduled notification (web simulation):', notification);
      return 'web_scheduled_notification';
    }

    try {
      let trigger: any;

      if (notification.trigger instanceof Date) {
        trigger = notification.trigger;
      } else if (typeof notification.trigger === 'number') {
        trigger = { seconds: notification.trigger };
      } else {
        throw new Error('Invalid trigger type');
      }

      if (notification.repeat) {
        trigger = {
          ...trigger,
          repeats: true,
        };
      }

      const notificationId = await Notifications.scheduleNotificationAsync({
        content: {
          title: notification.title,
          body: notification.body,
          data: notification.data || {},
          sound: settings.sound,
        },
        trigger,
      });

      return notificationId;
    } catch (error) {
      console.warn('Failed to schedule notification:', error);
      return 'schedule_notification_failed';
    }
  }

  // Cancel notification
  async cancelNotification(notificationId: string): Promise<void> {
    if (Platform.OS === 'web') {
      console.log('Cancel notification (web simulation):', notificationId);
      return;
    }

    try {
      await Notifications.cancelScheduledNotificationAsync(notificationId);
    } catch (error) {
      console.warn('Failed to cancel notification:', error);
    }
  }

  // Cancel all notifications
  async cancelAllNotifications(): Promise<void> {
    if (Platform.OS === 'web') {
      console.log('Cancel all notifications (web simulation)');
      return;
    }

    try {
      await Notifications.cancelAllScheduledNotificationsAsync();
    } catch (error) {
      console.warn('Failed to cancel all notifications:', error);
    }
  }

  // Get scheduled notifications
  async getScheduledNotifications(): Promise<Notifications.NotificationRequest[]> {
    if (Platform.OS === 'web') {
      console.log('Get scheduled notifications (web simulation)');
      return [];
    }

    try {
      return await Notifications.getAllScheduledNotificationsAsync();
    } catch (error) {
      console.warn('Failed to get scheduled notifications:', error);
      return [];
    }
  }

  // Notification type helpers
  async notifyTicketCreated(ticketId: string, title: string, restaurant: string): Promise<void> {
    await this.sendLocalNotification({
      title: '🎫 New Ticket Created',
      body: `${title} at ${restaurant}`,
      data: { type: 'ticket', ticketId },
      categoryId: 'ticket',
      priority: 'high',
    });
  }

  async notifyTicketAssigned(ticketId: string, title: string): Promise<void> {
    await this.sendLocalNotification({
      title: '📋 Ticket Assigned to You',
      body: title,
      data: { type: 'ticket', ticketId },
      categoryId: 'ticket',
      priority: 'high',
    });
  }

  async notifyTicketCompleted(ticketId: string, title: string): Promise<void> {
    await this.sendLocalNotification({
      title: '✅ Ticket Completed',
      body: title,
      data: { type: 'ticket', ticketId },
      categoryId: 'ticket',
    });
  }

  async notifyMaintenanceDue(deviceId: string, deviceName: string, dueDate: Date): Promise<void> {
    const settings = await this.getSettings();
    if (!settings.maintenanceReminders) return;

    await this.sendLocalNotification({
      title: '🔧 Maintenance Due',
      body: `${deviceName} requires maintenance by ${dueDate.toLocaleDateString()}`,
      data: { type: 'maintenance', deviceId },
      categoryId: 'maintenance',
      priority: 'default',
    });
  }

  async notifyDeviceOffline(deviceId: string, deviceName: string, restaurant: string): Promise<void> {
    const settings = await this.getSettings();
    if (!settings.deviceAlerts) return;

    await this.sendLocalNotification({
      title: '🔴 Device Offline',
      body: `${deviceName} at ${restaurant} is offline`,
      data: { type: 'device', deviceId },
      categoryId: 'alert',
      priority: 'high',
    });
  }

  async notifySystemAlert(message: string, severity: 'info' | 'warning' | 'error' = 'info'): Promise<void> {
    const settings = await this.getSettings();
    if (!settings.systemAlerts) return;

    const icons = { info: 'ℹ️', warning: '⚠️', error: '🚨' };
    const priorities = { info: 'default', warning: 'high', error: 'max' } as const;

    await this.sendLocalNotification({
      title: `${icons[severity]} System Alert`,
      body: message,
      data: { type: 'system', severity },
      categoryId: 'alert',
      priority: priorities[severity],
    });
  }

  async scheduleMaintenanceReminder(deviceId: string, deviceName: string, dueDate: Date): Promise<string> {
    const settings = await this.getSettings();
    if (!settings.maintenanceReminders) {
      throw new Error('Maintenance reminders are disabled');
    }

    // Schedule 24 hours before due date
    const reminderDate = new Date(dueDate.getTime() - 24 * 60 * 60 * 1000);

    return await this.scheduleNotification({
      id: `maintenance_${deviceId}`,
      title: '🔧 Maintenance Reminder',
      body: `${deviceName} maintenance is due tomorrow`,
      trigger: reminderDate,
      data: { type: 'maintenance', deviceId },
    });
  }

  async scheduleInterventionReminder(ticketId: string, title: string, scheduledTime: Date): Promise<string> {
    const settings = await this.getSettings();
    if (!settings.scheduleReminders) {
      throw new Error('Schedule reminders are disabled');
    }

    // Schedule 30 minutes before intervention
    const reminderDate = new Date(scheduledTime.getTime() - 30 * 60 * 1000);

    return await this.scheduleNotification({
      id: `intervention_${ticketId}`,
      title: '📅 Intervention Reminder',
      body: `${title} scheduled in 30 minutes`,
      trigger: reminderDate,
      data: { type: 'intervention', ticketId },
    });
  }

  // Settings management
  async getSettings(): Promise<NotificationSettings> {
    return this.notificationSettings;
  }

  async updateSettings(settings: Partial<NotificationSettings>): Promise<void> {
    this.notificationSettings = { ...this.notificationSettings, ...settings };
    await this.saveSettings();
  }

  private async loadSettings(): Promise<void> {
    try {
      if (Platform.OS === 'web') {
        // Use localStorage for web
        if (typeof window !== 'undefined' && window.localStorage) {
          const stored = localStorage.getItem('notification_settings');
          if (stored) {
            this.notificationSettings = { ...this.notificationSettings, ...JSON.parse(stored) };
          }
        }
      } else {
        // Use AsyncStorage for native
        const stored = await AsyncStorage.getItem('notification_settings');
        if (stored) {
          this.notificationSettings = { ...this.notificationSettings, ...JSON.parse(stored) };
        }
      }
    } catch (error) {
      console.error('Error loading notification settings:', error);
    }
  }

  private async saveSettings(): Promise<void> {
    try {
      if (Platform.OS === 'web') {
        // Use localStorage for web
        if (typeof window !== 'undefined' && window.localStorage) {
          localStorage.setItem('notification_settings', JSON.stringify(this.notificationSettings));
        }
      } else {
        // Use AsyncStorage for native
        await AsyncStorage.setItem('notification_settings', JSON.stringify(this.notificationSettings));
      }
    } catch (error) {
      console.error('Error saving notification settings:', error);
    }
  }

  // Helper methods
  private isQuietHours(settings: NotificationSettings): boolean {
    if (!settings.quietHours.enabled) return false;

    const now = new Date();
    const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;

    const start = settings.quietHours.start;
    const end = settings.quietHours.end;

    // Handle overnight quiet hours (e.g., 22:00 to 08:00)
    if (start > end) {
      return currentTime >= start || currentTime <= end;
    } else {
      return currentTime >= start && currentTime <= end;
    }
  }

  private isNotificationTypeEnabled(categoryId: string | undefined, settings: NotificationSettings): boolean {
    switch (categoryId) {
      case 'ticket':
        return settings.ticketUpdates;
      case 'maintenance':
        return settings.maintenanceReminders;
      case 'alert':
        return settings.systemAlerts || settings.deviceAlerts;
      default:
        return true;
    }
  }

  // Get push token
  getPushToken(): string | null {
    return this.expoPushToken;
  }

  // Badge management
  async setBadgeCount(count: number): Promise<void> {
    if (Platform.OS === 'web') {
      console.log('Set badge count (web simulation):', count);
      return;
    }

    try {
      await Notifications.setBadgeCountAsync(count);
    } catch (error) {
      console.warn('Failed to set badge count:', error);
    }
  }

  async clearBadge(): Promise<void> {
    if (Platform.OS === 'web') {
      console.log('Clear badge (web simulation)');
      return;
    }

    try {
      await Notifications.setBadgeCountAsync(0);
    } catch (error) {
      console.warn('Failed to clear badge:', error);
    }
  }

  // Notification history
  async getDeliveredNotifications(): Promise<Notifications.Notification[]> {
    if (Platform.OS === 'web') {
      console.log('Get delivered notifications (web simulation)');
      return [];
    }

    try {
      return await Notifications.getPresentedNotificationsAsync();
    } catch (error) {
      console.warn('Failed to get delivered notifications:', error);
      return [];
    }
  }

  async clearDeliveredNotifications(): Promise<void> {
    if (Platform.OS === 'web') {
      console.log('Clear delivered notifications (web simulation)');
      return;
    }

    try {
      await Notifications.dismissAllNotificationsAsync();
    } catch (error) {
      console.warn('Failed to clear delivered notifications:', error);
    }
  }
}

// Create singleton instance
export const pushNotificationService = new PushNotificationService();

// Convenience functions
export const notifyTicketCreated = (ticketId: string, title: string, restaurant: string) =>
  pushNotificationService.notifyTicketCreated(ticketId, title, restaurant);

export const notifyTicketAssigned = (ticketId: string, title: string) =>
  pushNotificationService.notifyTicketAssigned(ticketId, title);

export const notifyTicketCompleted = (ticketId: string, title: string) =>
  pushNotificationService.notifyTicketCompleted(ticketId, title);

export const notifyMaintenanceDue = (deviceId: string, deviceName: string, dueDate: Date) =>
  pushNotificationService.notifyMaintenanceDue(deviceId, deviceName, dueDate);

export const notifyDeviceOffline = (deviceId: string, deviceName: string, restaurant: string) =>
  pushNotificationService.notifyDeviceOffline(deviceId, deviceName, restaurant);

export const notifySystemAlert = (message: string, severity?: 'info' | 'warning' | 'error') =>
  pushNotificationService.notifySystemAlert(message, severity);

export const scheduleMaintenanceReminder = (deviceId: string, deviceName: string, dueDate: Date) =>
  pushNotificationService.scheduleMaintenanceReminder(deviceId, deviceName, dueDate);

export const scheduleInterventionReminder = (ticketId: string, title: string, scheduledTime: Date) =>
  pushNotificationService.scheduleInterventionReminder(ticketId, title, scheduledTime);
