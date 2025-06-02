import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Switch,
  Alert,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { useRouter } from "expo-router";
import {
  ArrowLeft,
  Bell,
  BellOff,
  Volume2,
  VolumeX,
  Vibrate,
  Clock,
  Ticket,
  Wrench,
  AlertTriangle,
  Server,
  Calendar,
  Moon,
  Save,
  RefreshCw,
  TestTube,
} from "lucide-react-native";
import { pushNotificationService, NotificationSettings } from "../../lib/push-notifications";

export default function NotificationSettingsScreen() {
  const router = useRouter();
  const [settings, setSettings] = useState<NotificationSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      setLoading(true);
      const currentSettings = await pushNotificationService.getSettings();
      setSettings(currentSettings);
    } catch (error) {
      console.error("Error loading notification settings:", error);
      Alert.alert("Error", "Failed to load notification settings");
    } finally {
      setLoading(false);
    }
  };

  const saveSettings = async () => {
    if (!settings) return;

    try {
      setSaving(true);
      await pushNotificationService.updateSettings(settings);
      Alert.alert("Success", "Notification settings saved successfully");
    } catch (error) {
      console.error("Error saving notification settings:", error);
      Alert.alert("Error", "Failed to save notification settings");
    } finally {
      setSaving(false);
    }
  };

  const updateSetting = (key: keyof NotificationSettings, value: any) => {
    if (!settings) return;
    setSettings({ ...settings, [key]: value });
  };

  const updateQuietHours = (key: 'enabled' | 'start' | 'end', value: any) => {
    if (!settings) return;
    setSettings({
      ...settings,
      quietHours: {
        ...settings.quietHours,
        [key]: value,
      },
    });
  };

  const testNotification = async () => {
    try {
      await pushNotificationService.sendLocalNotification({
        title: "🧪 Test Notification",
        body: "This is a test notification to verify your settings are working correctly.",
        data: { type: "test" },
        priority: "default",
      });
      Alert.alert("Test Sent", "Check your notification panel to see the test notification");
    } catch (error) {
      Alert.alert("Test Failed", "Failed to send test notification. Please check your settings.");
    }
  };

  const renderToggleRow = (
    title: string,
    description: string,
    value: boolean,
    onToggle: (value: boolean) => void,
    icon: any,
    iconColor: string = "#3B82F6"
  ) => (
    <View className="bg-white rounded-lg p-4 mb-3 shadow-sm border border-gray-200">
      <View className="flex-row items-center justify-between">
        <View className="flex-row items-center flex-1">
          <View className={`p-2 rounded-full mr-3`} style={{ backgroundColor: iconColor + '20' }}>
            {React.cloneElement(icon, { size: 20, color: iconColor })}
          </View>
          <View className="flex-1">
            <Text className="font-medium text-gray-800">{title}</Text>
            <Text className="text-gray-600 text-sm">{description}</Text>
          </View>
        </View>
        <Switch
          value={value}
          onValueChange={onToggle}
          trackColor={{ false: "#767577", true: "#81b0ff" }}
          thumbColor={value ? "#1e40af" : "#f4f3f4"}
        />
      </View>
    </View>
  );

  const renderTimeSelector = (label: string, value: string, onChange: (value: string) => void) => {
    const hours = Array.from({ length: 24 }, (_, i) => i.toString().padStart(2, '0'));
    const currentHour = value.split(':')[0];
    
    return (
      <View className="mb-3">
        <Text className="text-gray-700 font-medium mb-2">{label}</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} className="bg-gray-100 rounded-lg p-2">
          {hours.map((hour) => (
            <TouchableOpacity
              key={hour}
              className={`px-3 py-2 rounded-lg mr-2 ${
                currentHour === hour ? "bg-blue-500" : "bg-white"
              }`}
              onPress={() => onChange(`${hour}:00`)}
            >
              <Text className={`font-medium ${
                currentHour === hour ? "text-white" : "text-gray-700"
              }`}>
                {hour}:00
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>
    );
  };

  if (loading) {
    return (
      <SafeAreaView className="flex-1 bg-white justify-center items-center">
        <ActivityIndicator size="large" color="#3B82F6" />
        <Text className="text-gray-500 mt-2">Loading notification settings...</Text>
      </SafeAreaView>
    );
  }

  if (!settings) {
    return (
      <SafeAreaView className="flex-1 bg-white justify-center items-center">
        <Bell size={48} color="#9CA3AF" />
        <Text className="text-gray-500 text-lg mt-4">Settings Not Available</Text>
        <TouchableOpacity
          className="bg-blue-500 px-4 py-2 rounded-lg mt-4"
          onPress={loadSettings}
        >
          <Text className="text-white font-medium">Retry</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      <StatusBar style="dark" />

      {/* Header */}
      <View className="flex-row justify-between items-center p-4 border-b border-gray-200 bg-white">
        <View className="flex-row items-center flex-1">
          <TouchableOpacity onPress={() => router.back()} className="mr-3">
            <ArrowLeft size={24} color="#0F172A" />
          </TouchableOpacity>
          <Text className="text-lg font-bold text-gray-800 flex-1" numberOfLines={1}>
            🔔 Notification Settings
          </Text>
        </View>
        <View className="flex-row">
          <TouchableOpacity
            className="bg-green-500 p-2 rounded-full mr-2"
            onPress={testNotification}
          >
            <TestTube size={20} color="#FFFFFF" />
          </TouchableOpacity>
          <TouchableOpacity
            className="bg-blue-500 p-2 rounded-full"
            onPress={saveSettings}
            disabled={saving}
          >
            {saving ? (
              <ActivityIndicator size={20} color="#FFFFFF" />
            ) : (
              <Save size={20} color="#FFFFFF" />
            )}
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        {/* Master Toggle */}
        <View className="p-4">
          <Text className="text-lg font-bold text-gray-800 mb-4">🔔 General Settings</Text>
          
          {renderToggleRow(
            "Enable Notifications",
            "Turn on/off all push notifications",
            settings.enabled,
            (value) => updateSetting('enabled', value),
            <Bell />,
            settings.enabled ? "#10B981" : "#EF4444"
          )}
        </View>

        {/* Notification Types */}
        {settings.enabled && (
          <View className="px-4 pb-4">
            <Text className="text-lg font-bold text-gray-800 mb-4">📱 Notification Types</Text>
            
            {renderToggleRow(
              "Ticket Updates",
              "New tickets, assignments, and status changes",
              settings.ticketUpdates,
              (value) => updateSetting('ticketUpdates', value),
              <Ticket />,
              "#3B82F6"
            )}

            {renderToggleRow(
              "Maintenance Reminders",
              "Scheduled maintenance and due dates",
              settings.maintenanceReminders,
              (value) => updateSetting('maintenanceReminders', value),
              <Wrench />,
              "#F59E0B"
            )}

            {renderToggleRow(
              "System Alerts",
              "System health and performance alerts",
              settings.systemAlerts,
              (value) => updateSetting('systemAlerts', value),
              <Server />,
              "#EF4444"
            )}

            {renderToggleRow(
              "Device Alerts",
              "Device offline and malfunction alerts",
              settings.deviceAlerts,
              (value) => updateSetting('deviceAlerts', value),
              <AlertTriangle />,
              "#DC2626"
            )}

            {renderToggleRow(
              "Schedule Reminders",
              "Upcoming interventions and appointments",
              settings.scheduleReminders,
              (value) => updateSetting('scheduleReminders', value),
              <Calendar />,
              "#7C3AED"
            )}
          </View>
        )}

        {/* Sound & Vibration */}
        {settings.enabled && (
          <View className="px-4 pb-4">
            <Text className="text-lg font-bold text-gray-800 mb-4">🔊 Sound & Vibration</Text>
            
            {renderToggleRow(
              "Sound",
              "Play notification sounds",
              settings.sound,
              (value) => updateSetting('sound', value),
              settings.sound ? <Volume2 /> : <VolumeX />,
              settings.sound ? "#10B981" : "#6B7280"
            )}

            {renderToggleRow(
              "Vibration",
              "Vibrate for notifications",
              settings.vibration,
              (value) => updateSetting('vibration', value),
              <Vibrate />,
              "#8B5CF6"
            )}
          </View>
        )}

        {/* Quiet Hours */}
        {settings.enabled && (
          <View className="px-4 pb-4">
            <Text className="text-lg font-bold text-gray-800 mb-4">🌙 Quiet Hours</Text>
            
            {renderToggleRow(
              "Enable Quiet Hours",
              "Silence notifications during specified hours",
              settings.quietHours.enabled,
              (value) => updateQuietHours('enabled', value),
              <Moon />,
              "#4F46E5"
            )}

            {settings.quietHours.enabled && (
              <View className="bg-white rounded-lg p-4 shadow-sm border border-gray-200">
                <Text className="font-medium text-gray-800 mb-4">Quiet Hours Schedule</Text>
                
                {renderTimeSelector(
                  "Start Time",
                  settings.quietHours.start,
                  (value) => updateQuietHours('start', value)
                )}

                {renderTimeSelector(
                  "End Time",
                  settings.quietHours.end,
                  (value) => updateQuietHours('end', value)
                )}

                <View className="bg-blue-50 rounded-lg p-3 border border-blue-200 mt-3">
                  <Text className="text-blue-800 text-sm">
                    💡 During quiet hours, notifications will still appear but won't play sounds or vibrate.
                  </Text>
                </View>
              </View>
            )}
          </View>
        )}

        {/* Test Section */}
        <View className="px-4 pb-4">
          <Text className="text-lg font-bold text-gray-800 mb-4">🧪 Test Notifications</Text>
          
          <View className="bg-white rounded-lg p-4 shadow-sm border border-gray-200">
            <Text className="font-medium text-gray-800 mb-2">Test Your Settings</Text>
            <Text className="text-gray-600 text-sm mb-4">
              Send a test notification to verify your settings are working correctly.
            </Text>
            
            <TouchableOpacity
              className="bg-blue-500 py-3 rounded-lg flex-row items-center justify-center"
              onPress={testNotification}
            >
              <TestTube size={20} color="#FFFFFF" />
              <Text className="text-white font-bold ml-2">Send Test Notification</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Information */}
        <View className="px-4 pb-6">
          <View className="bg-gray-100 rounded-lg p-4 border border-gray-200">
            <Text className="font-bold text-gray-800 mb-2">📋 About Notifications</Text>
            <Text className="text-gray-700 text-sm">
              • Notifications help you stay updated on important events{"\n"}
              • You can customize which types of notifications you receive{"\n"}
              • Quiet hours prevent sounds during specified times{"\n"}
              • Test notifications to ensure everything works properly{"\n"}
              • Changes are saved automatically when you toggle settings
            </Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
