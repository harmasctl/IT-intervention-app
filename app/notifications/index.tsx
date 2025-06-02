import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  Alert,
  Switch,
  ScrollView,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { useRouter } from "expo-router";
import {
  ArrowLeft,
  Bell,
  CheckCircle,
  AlertTriangle,
  Info,
  Package,
  Clock,
  Settings,
  Wrench,
  BellOff,
  X,
  RefreshCw,
  Calendar,
} from "lucide-react-native";
import { useNotifications } from "../_layout";
import { supabase } from "../../lib/supabase";

export default function NotificationsScreen() {
  const router = useRouter();
  const {
    notifications,
    unreadCount,
    markAsRead,
    markAllAsRead,
    refreshNotifications,
  } = useNotifications();

  const [showSettings, setShowSettings] = useState(false);
  const [maintenanceReminders, setMaintenanceReminders] = useState(true);
  const [deviceAlerts, setDeviceAlerts] = useState(true);
  const [emailNotifications, setEmailNotifications] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    refreshNotifications();
    checkMaintenanceReminders();
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        const settings = localStorage.getItem('notification_settings');
        if (settings) {
          const parsed = JSON.parse(settings);
          setMaintenanceReminders(parsed.maintenanceReminders ?? true);
          setDeviceAlerts(parsed.deviceAlerts ?? true);
          setEmailNotifications(parsed.emailNotifications ?? false);
        }
      }
    } catch (error) {
      console.error("Error loading notification settings:", error);
    }
  };

  const saveSettings = async () => {
    try {
      const settings = {
        maintenanceReminders,
        deviceAlerts,
        emailNotifications,
      };
      if (typeof window !== 'undefined' && window.localStorage) {
        localStorage.setItem('notification_settings', JSON.stringify(settings));
      }
      Alert.alert("💾 Settings Saved", "Notification preferences have been updated");
    } catch (error) {
      console.error("Error saving notification settings:", error);
      Alert.alert("❌ Error", "Failed to save settings");
    }
  };

  const checkMaintenanceReminders = async () => {
    if (!maintenanceReminders) return;

    try {
      setLoading(true);

      // Check for upcoming maintenance (next 7 days)
      const nextWeek = new Date();
      nextWeek.setDate(nextWeek.getDate() + 7);

      const { data: upcomingMaintenance, error } = await supabase
        .from("maintenance_records")
        .select(`
          *,
          device:devices(name, serial_number)
        `)
        .eq("status", "pending")
        .lte("date", nextWeek.toISOString())
        .gte("date", new Date().toISOString());

      if (error) {
        console.error("Error checking maintenance:", error);
        return;
      }

      // Check for overdue maintenance
      const { data: overdueMaintenance } = await supabase
        .from("maintenance_records")
        .select(`
          *,
          device:devices(name, serial_number)
        `)
        .eq("status", "pending")
        .lt("date", new Date().toISOString());

      let reminderCount = 0;

      // Create notifications for upcoming maintenance
      for (const maintenance of upcomingMaintenance || []) {
        reminderCount++;
      }

      // Create notifications for overdue maintenance
      for (const maintenance of overdueMaintenance || []) {
        reminderCount++;
      }

      if (reminderCount > 0) {
        Alert.alert(
          "🔔 Maintenance Reminders",
          `Found ${reminderCount} maintenance task(s) requiring attention`,
          [
            {
              text: "View Maintenance",
              onPress: () => router.push("/devices/maintenance/history")
            },
            {
              text: "OK",
              style: "cancel"
            }
          ]
        );
      } else {
        Alert.alert("✅ All Up to Date", "No pending maintenance reminders");
      }
    } catch (error) {
      console.error("Error checking maintenance reminders:", error);
      Alert.alert("❌ Error", "Failed to check maintenance reminders");
    } finally {
      setLoading(false);
    }
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case "success":
        return <CheckCircle size={20} color="#22c55e" />;
      case "warning":
        return <AlertTriangle size={20} color="#f59e0b" />;
      case "error":
        return <AlertTriangle size={20} color="#ef4444" />;
      case "low_stock":
        return <Package size={20} color="#f59e0b" />;
      case "maintenance_due":
        return <Wrench size={20} color="#f59e0b" />;
      case "maintenance_overdue":
        return <AlertTriangle size={20} color="#ef4444" />;
      case "device_offline":
        return <Package size={20} color="#6b7280" />;
      case "system_alert":
        return <Bell size={20} color="#3b82f6" />;
      default:
        return <Info size={20} color="#3b82f6" />;
    }
  };

  const getNotificationTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.round(diffMs / 60000);
    const diffHours = Math.round(diffMs / 3600000);
    const diffDays = Math.round(diffMs / 86400000);

    if (diffMins < 60) {
      return `${diffMins} min${diffMins !== 1 ? "s" : ""} ago`;
    } else if (diffHours < 24) {
      return `${diffHours} hour${diffHours !== 1 ? "s" : ""} ago`;
    } else if (diffDays < 7) {
      return `${diffDays} day${diffDays !== 1 ? "s" : ""} ago`;
    } else {
      return date.toLocaleDateString();
    }
  };

  const handleNotificationPress = (notification: any) => {
    markAsRead(notification.id);

    // Navigate based on notification type
    if (notification.related_type === "equipment" && notification.related_id) {
      router.push(`/equipment?id=${notification.related_id}`);
    } else if (
      notification.related_type === "ticket" &&
      notification.related_id
    ) {
      router.push(`/tickets/${notification.related_id}`);
    }
  };

  const renderNotificationItem = ({ item }: { item: any }) => (
    <TouchableOpacity
      className={`p-4 border-b border-gray-100 ${!item.is_read ? "bg-blue-50" : ""}`}
      onPress={() => handleNotificationPress(item)}
    >
      <View className="flex-row">
        <View className="mr-3 mt-1">{getNotificationIcon(item.type)}</View>
        <View className="flex-1">
          <Text
            className={`font-bold ${!item.is_read ? "text-blue-800" : "text-gray-800"}`}
          >
            {item.title}
          </Text>
          <Text className="text-gray-600 mt-1">{item.message}</Text>
          <View className="flex-row items-center mt-2">
            <Clock size={12} color="#9ca3af" />
            <Text className="text-gray-400 text-xs ml-1">
              {getNotificationTime(item.created_at)}
            </Text>
          </View>
        </View>
        {!item.is_read && (
          <View className="w-3 h-3 rounded-full bg-blue-500 mt-2" />
        )}
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView className="flex-1 bg-white">
      <StatusBar style="auto" />

      {/* Header */}
      <View className="flex-row justify-between items-center px-4 py-3 border-b border-gray-200">
        <View className="flex-row items-center flex-1">
          <TouchableOpacity onPress={() => router.back()} className="mr-3">
            <ArrowLeft size={24} color="#0F172A" />
          </TouchableOpacity>
          <Text className="text-xl font-bold text-blue-800 flex-1">Notifications</Text>
          {unreadCount > 0 && (
            <View className="bg-red-500 rounded-full px-2 py-1 mr-3">
              <Text className="text-white text-xs font-bold">{unreadCount}</Text>
            </View>
          )}
        </View>
        <View className="flex-row">
          <TouchableOpacity
            className="bg-gray-100 p-2 rounded-lg mr-2"
            onPress={() => setShowSettings(!showSettings)}
          >
            <Settings size={20} color="#4B5563" />
          </TouchableOpacity>
          {unreadCount > 0 && (
            <TouchableOpacity
              className="bg-blue-500 px-3 py-2 rounded-lg"
              onPress={markAllAsRead}
            >
              <Text className="text-white font-medium">Read All</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Action Buttons */}
      <View className="flex-row p-4 space-x-3 bg-white border-b border-gray-200">
        <TouchableOpacity
          className="flex-1 bg-green-500 rounded-lg p-3 flex-row items-center justify-center"
          onPress={checkMaintenanceReminders}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <Wrench size={20} color="#FFFFFF" />
          )}
          <Text className="text-white font-medium ml-2">
            {loading ? "Checking..." : "Check Maintenance"}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          className="flex-1 bg-blue-500 rounded-lg p-3 flex-row items-center justify-center"
          onPress={refreshNotifications}
        >
          <RefreshCw size={20} color="#FFFFFF" />
          <Text className="text-white font-medium ml-2">Refresh</Text>
        </TouchableOpacity>
      </View>

      {/* Settings Panel */}
      {showSettings && (
        <View className="bg-white border-b border-gray-200 p-4">
          <Text className="text-lg font-semibold text-gray-800 mb-4">🔔 Notification Settings</Text>

          <View className="space-y-4">
            <View className="flex-row justify-between items-center py-2">
              <Text className="text-gray-700">Maintenance Reminders</Text>
              <Switch
                value={maintenanceReminders}
                onValueChange={(value) => {
                  setMaintenanceReminders(value);
                  saveSettings();
                }}
              />
            </View>

            <View className="flex-row justify-between items-center py-2">
              <Text className="text-gray-700">Device Alerts</Text>
              <Switch
                value={deviceAlerts}
                onValueChange={(value) => {
                  setDeviceAlerts(value);
                  saveSettings();
                }}
              />
            </View>

            <View className="flex-row justify-between items-center py-2">
              <Text className="text-gray-700">Email Notifications</Text>
              <Switch
                value={emailNotifications}
                onValueChange={(value) => {
                  setEmailNotifications(value);
                  saveSettings();
                }}
              />
            </View>
          </View>
        </View>
      )}

      {/* Notification List */}
      {notifications.length > 0 ? (
        <FlatList
          data={notifications}
          renderItem={renderNotificationItem}
          keyExtractor={(item) => item.id}
          onRefresh={refreshNotifications}
          refreshing={false}
        />
      ) : (
        <View className="flex-1 justify-center items-center p-4">
          <Bell size={48} color="#9ca3af" />
          <Text className="text-gray-500 text-lg mt-4 text-center">
            No notifications yet
          </Text>
          <Text className="text-gray-400 text-center mt-2">
            You'll see updates about your tickets, equipment, and more here
          </Text>
        </View>
      )}
    </SafeAreaView>
  );
}
