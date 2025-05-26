import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Switch,
  ScrollView,
  Alert,
  Image,
  ActivityIndicator,
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
  Languages,
  LogOut,
} from "lucide-react-native";
import { useAuth } from "../../components/AuthProvider";
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../../lib/supabase';

type SettingsState = {
  notifications: boolean;
  darkMode: boolean;
  language: string;
};

export default function SettingsScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [settings, setSettings] = useState<SettingsState>({
    notifications: true,
    darkMode: false,
    language: 'English',
  });
  const [loading, setLoading] = useState(true);
  const [signingOut, setSigningOut] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      setLoading(true);
      const storedSettings = await AsyncStorage.getItem('user_settings');
      
      if (storedSettings) {
        setSettings(JSON.parse(storedSettings));
      }
    } catch (error) {
      console.error('Error loading settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const saveSettings = async (newSettings: SettingsState) => {
    try {
      await AsyncStorage.setItem('user_settings', JSON.stringify(newSettings));
      setSettings(newSettings);
    } catch (error) {
      console.error('Error saving settings:', error);
      Alert.alert('Error', 'Failed to save settings');
    }
  };

  const handleToggle = (setting: keyof SettingsState) => {
    if (typeof settings[setting] === 'boolean') {
      const newSettings = {
        ...settings,
        [setting]: !settings[setting],
      };
      saveSettings(newSettings);
    }
  };

  const handleSignOut = async () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Sign Out',
          style: 'destructive',
          onPress: async () => {
            try {
              setSigningOut(true);
              const { error } = await supabase.auth.signOut();
              
              if (error) {
                throw error;
              }
              
              // Clear local settings
              await AsyncStorage.multiRemove(['user_settings', 'user_session']);
              
              // Navigate to login screen
              router.replace('/');
            } catch (error) {
              console.error('Error signing out:', error);
              Alert.alert('Error', 'Failed to sign out');
            } finally {
              setSigningOut(false);
            }
          },
        },
      ]
    );
  };

  if (loading) {
    return (
      <SafeAreaView className="flex-1 bg-white">
        <StatusBar style="dark" />
        <View className="flex-1 justify-center items-center">
          <ActivityIndicator size="large" color="#3B82F6" />
          <Text className="mt-4 text-gray-600">Loading settings...</Text>
        </View>
      </SafeAreaView>
    );
  }

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
        {/* Preferences Section */}
        <View className="mt-4 mb-2 px-4">
          <Text className="text-sm font-semibold text-gray-500 uppercase">Preferences</Text>
        </View>
        
        <View className="bg-white rounded-lg mx-4 shadow-sm">
          <View className="flex-row justify-between items-center p-4 border-b border-gray-100">
            <View className="flex-row items-center">
              <Bell size={20} color="#6B7280" className="mr-3" />
              <Text className="text-gray-800">Notifications</Text>
            </View>
            <Switch
              value={settings.notifications}
              onValueChange={() => handleToggle('notifications')}
              trackColor={{ false: '#D1D5DB', true: '#BFDBFE' }}
              thumbColor={settings.notifications ? '#3B82F6' : '#9CA3AF'}
            />
          </View>
          
          <View className="flex-row justify-between items-center p-4 border-b border-gray-100">
            <View className="flex-row items-center">
              <Moon size={20} color="#6B7280" className="mr-3" />
              <Text className="text-gray-800">Dark Mode</Text>
            </View>
            <Switch
              value={settings.darkMode}
              onValueChange={() => handleToggle('darkMode')}
              trackColor={{ false: '#D1D5DB', true: '#BFDBFE' }}
              thumbColor={settings.darkMode ? '#3B82F6' : '#9CA3AF'}
            />
          </View>
          
          <TouchableOpacity 
            className="flex-row justify-between items-center p-4"
            onPress={() => Alert.alert('Language', 'Language settings not implemented yet')}
          >
            <View className="flex-row items-center">
              <Languages size={20} color="#6B7280" className="mr-3" />
              <Text className="text-gray-800">Language</Text>
            </View>
            <View className="flex-row items-center">
              <Text className="text-gray-500 mr-2">{settings.language}</Text>
              <ChevronRight size={20} color="#9CA3AF" />
            </View>
          </TouchableOpacity>
        </View>
        
        {/* Security Section */}
        <View className="mt-6 mb-2 px-4">
          <Text className="text-sm font-semibold text-gray-500 uppercase">Security</Text>
        </View>
        
        <View className="bg-white rounded-lg mx-4 shadow-sm">
          <TouchableOpacity 
            className="flex-row justify-between items-center p-4 border-b border-gray-100"
            onPress={() => Alert.alert('Password', 'Change password feature not implemented yet')}
          >
            <View className="flex-row items-center">
              <Lock size={20} color="#6B7280" className="mr-3" />
              <Text className="text-gray-800">Change Password</Text>
            </View>
            <ChevronRight size={20} color="#9CA3AF" />
          </TouchableOpacity>
          
          <TouchableOpacity 
            className="flex-row justify-between items-center p-4"
            onPress={() => Alert.alert('Privacy', 'Privacy settings not implemented yet')}
          >
            <View className="flex-row items-center">
              <Shield size={20} color="#6B7280" className="mr-3" />
              <Text className="text-gray-800">Privacy & Security</Text>
            </View>
            <ChevronRight size={20} color="#9CA3AF" />
          </TouchableOpacity>
        </View>
        
        {/* Support Section */}
        <View className="mt-6 mb-2 px-4">
          <Text className="text-sm font-semibold text-gray-500 uppercase">Support</Text>
        </View>
        
        <View className="bg-white rounded-lg mx-4 shadow-sm">
          <TouchableOpacity 
            className="flex-row justify-between items-center p-4 border-b border-gray-100"
            onPress={() => Alert.alert('Help', 'Help center not implemented yet')}
          >
            <View className="flex-row items-center">
              <HelpCircle size={20} color="#6B7280" className="mr-3" />
              <Text className="text-gray-800">Help Center</Text>
            </View>
            <ChevronRight size={20} color="#9CA3AF" />
          </TouchableOpacity>
          
          <TouchableOpacity 
            className="flex-row justify-between items-center p-4"
            onPress={() => Alert.alert('About', 'App version: 1.0.0\nBuild: 100')}
          >
            <View className="flex-row items-center">
              <Text className="text-gray-800">About</Text>
            </View>
            <View className="flex-row items-center">
              <Text className="text-gray-500 mr-2">v1.0.0</Text>
              <ChevronRight size={20} color="#9CA3AF" />
            </View>
          </TouchableOpacity>
        </View>
        
        {/* Sign Out Button */}
        <View className="mx-4 mt-8 mb-8">
          <TouchableOpacity
            className="bg-red-500 py-3 rounded-lg items-center"
            onPress={handleSignOut}
            disabled={signingOut}
          >
            {signingOut ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <View className="flex-row items-center">
                <LogOut size={20} color="#FFFFFF" />
                <Text className="text-white font-semibold ml-2">Sign Out</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
