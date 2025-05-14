import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Switch,
  ScrollView,
  Alert,
  Image,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { useRouter } from "expo-router";
import {
  ArrowLeft,
  Moon,
  Bell,
  Globe,
  Lock,
  ChevronRight,
  Shield,
  HelpCircle,
} from "lucide-react-native";
import { useAuth } from "../../components/AuthProvider";

export default function SettingsScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [darkMode, setDarkMode] = useState(false);
  const [notifications, setNotifications] = useState(true);
  const [language, setLanguage] = useState("English");
  const [biometricLogin, setBiometricLogin] = useState(false);
  const [autoBackup, setAutoBackup] = useState(true);

  const toggleDarkMode = () => {
    setDarkMode(!darkMode);
    // Here you would implement actual dark mode toggle functionality
  };

  const toggleNotifications = () => {
    setNotifications(!notifications);
    // Here you would implement actual notifications toggle functionality
  };

  const changeLanguage = () => {
    Alert.alert(
      "Select Language",
      "Choose your preferred language",
      [
        { text: "English", onPress: () => setLanguage("English") },
        { text: "Spanish", onPress: () => setLanguage("Spanish") },
        { text: "French", onPress: () => setLanguage("French") },
        { text: "Cancel", style: "cancel" },
      ],
      { cancelable: true },
    );
  };

  const resetPassword = () => {
    Alert.alert(
      "Reset Password",
      "Are you sure you want to reset your password?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Reset",
          onPress: () => {
            // Here you would implement password reset functionality
            Alert.alert(
              "Password Reset",
              "Password reset email has been sent to your email address.",
            );
          },
        },
      ],
      { cancelable: true },
    );
  };

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      <StatusBar style="auto" />

      {/* Header */}
      <View className="flex-row justify-between items-center px-5 py-4 bg-white shadow-sm">
        <TouchableOpacity
          onPress={() => router.back()}
          className="flex-row items-center"
        >
          <ArrowLeft size={20} color="#3b82f6" />
          <Text className="text-blue-500 ml-1 font-medium">Back</Text>
        </TouchableOpacity>
        <Text className="text-xl font-bold text-blue-800">Settings</Text>
        <View style={{ width: 24 }} /> {/* Empty view for spacing */}
      </View>

      {/* User Profile Summary */}
      <View className="bg-white mt-2 p-4 flex-row items-center">
        <Image
          source={{
            uri:
              user?.user_metadata?.avatar_url ||
              `https://api.dicebear.com/7.x/avataaars/svg?seed=${user?.id}`,
          }}
          className="w-16 h-16 rounded-full bg-gray-200"
        />
        <View className="ml-4">
          <Text className="text-lg font-bold">
            {user?.user_metadata?.name || "User"}
          </Text>
          <Text className="text-gray-500">{user?.email}</Text>
        </View>
      </View>

      <ScrollView className="flex-1">
        {/* Appearance Section */}
        <View className="mt-2 mb-2">
          <Text className="text-sm font-medium text-gray-500 px-4 py-2 uppercase">
            Appearance
          </Text>
          <View className="bg-white rounded-lg">
            <View className="flex-row justify-between items-center p-4 border-b border-gray-100">
              <View className="flex-row items-center">
                <View className="bg-indigo-100 p-2 rounded-full">
                  <Moon size={20} color="#4338ca" />
                </View>
                <Text className="text-gray-800 ml-3 font-medium">
                  Dark Mode
                </Text>
              </View>
              <Switch
                trackColor={{ false: "#d1d5db", true: "#93c5fd" }}
                thumbColor={darkMode ? "#3b82f6" : "#f4f4f5"}
                onValueChange={toggleDarkMode}
                value={darkMode}
              />
            </View>

            <TouchableOpacity className="flex-row justify-between items-center p-4">
              <View className="flex-row items-center">
                <View className="bg-blue-100 p-2 rounded-full">
                  <Globe size={20} color="#1e40af" />
                </View>
                <Text className="text-gray-800 ml-3 font-medium">Language</Text>
              </View>
              <View className="flex-row items-center">
                <Text className="text-gray-500 mr-2">{language}</Text>
                <ChevronRight size={18} color="#9ca3af" />
              </View>
            </TouchableOpacity>
          </View>
        </View>

        {/* Notifications Section */}
        <View className="mb-2">
          <Text className="text-sm font-medium text-gray-500 px-4 py-2 uppercase">
            Notifications
          </Text>
          <View className="bg-white rounded-lg">
            <View className="flex-row justify-between items-center p-4 border-b border-gray-100">
              <View className="flex-row items-center">
                <View className="bg-red-100 p-2 rounded-full">
                  <Bell size={20} color="#b91c1c" />
                </View>
                <Text className="text-gray-800 ml-3 font-medium">
                  Push Notifications
                </Text>
              </View>
              <Switch
                trackColor={{ false: "#d1d5db", true: "#93c5fd" }}
                thumbColor={notifications ? "#3b82f6" : "#f4f4f5"}
                onValueChange={toggleNotifications}
                value={notifications}
              />
            </View>

            <View className="flex-row justify-between items-center p-4">
              <View className="flex-row items-center">
                <View className="bg-amber-100 p-2 rounded-full">
                  <Bell size={20} color="#b45309" />
                </View>
                <Text className="text-gray-800 ml-3 font-medium">
                  Email Notifications
                </Text>
              </View>
              <Switch
                trackColor={{ false: "#d1d5db", true: "#93c5fd" }}
                thumbColor={notifications ? "#3b82f6" : "#f4f4f5"}
                onValueChange={toggleNotifications}
                value={notifications}
              />
            </View>
          </View>
        </View>

        {/* Security Section */}
        <View className="mb-2">
          <Text className="text-sm font-medium text-gray-500 px-4 py-2 uppercase">
            Security
          </Text>
          <View className="bg-white rounded-lg">
            <TouchableOpacity
              className="flex-row justify-between items-center p-4 border-b border-gray-100"
              onPress={resetPassword}
            >
              <View className="flex-row items-center">
                <View className="bg-green-100 p-2 rounded-full">
                  <Lock size={20} color="#15803d" />
                </View>
                <Text className="text-gray-800 ml-3 font-medium">
                  Reset Password
                </Text>
              </View>
              <ChevronRight size={18} color="#9ca3af" />
            </TouchableOpacity>

            <View className="flex-row justify-between items-center p-4 border-b border-gray-100">
              <View className="flex-row items-center">
                <View className="bg-purple-100 p-2 rounded-full">
                  <Shield size={20} color="#7e22ce" />
                </View>
                <Text className="text-gray-800 ml-3 font-medium">
                  Biometric Login
                </Text>
              </View>
              <Switch
                trackColor={{ false: "#d1d5db", true: "#93c5fd" }}
                thumbColor={biometricLogin ? "#3b82f6" : "#f4f4f5"}
                onValueChange={(value) => setBiometricLogin(value)}
                value={biometricLogin}
              />
            </View>

            <TouchableOpacity className="flex-row justify-between items-center p-4">
              <View className="flex-row items-center">
                <View className="bg-blue-100 p-2 rounded-full">
                  <Shield size={20} color="#1e40af" />
                </View>
                <Text className="text-gray-800 ml-3 font-medium">
                  Privacy Settings
                </Text>
              </View>
              <ChevronRight size={18} color="#9ca3af" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Data Section */}
        <View className="mb-2">
          <Text className="text-sm font-medium text-gray-500 px-4 py-2 uppercase">
            Data
          </Text>
          <View className="bg-white rounded-lg">
            <View className="flex-row justify-between items-center p-4 border-b border-gray-100">
              <View className="flex-row items-center">
                <View className="bg-cyan-100 p-2 rounded-full">
                  <HelpCircle size={20} color="#0e7490" />
                </View>
                <Text className="text-gray-800 ml-3 font-medium">
                  Auto Backup
                </Text>
              </View>
              <Switch
                trackColor={{ false: "#d1d5db", true: "#93c5fd" }}
                thumbColor={autoBackup ? "#3b82f6" : "#f4f4f5"}
                onValueChange={(value) => setAutoBackup(value)}
                value={autoBackup}
              />
            </View>

            <TouchableOpacity className="flex-row justify-between items-center p-4">
              <View className="flex-row items-center">
                <View className="bg-red-100 p-2 rounded-full">
                  <HelpCircle size={20} color="#b91c1c" />
                </View>
                <Text className="text-gray-800 ml-3 font-medium">
                  Clear Cache
                </Text>
              </View>
              <ChevronRight size={18} color="#9ca3af" />
            </TouchableOpacity>
          </View>
        </View>

        {/* App Info */}
        <View className="mt-6 items-center mb-8">
          <Text className="text-gray-500 font-medium">
            Restaurant Tech Support
          </Text>
          <Text className="text-gray-400 text-sm">Version 1.0.0</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
