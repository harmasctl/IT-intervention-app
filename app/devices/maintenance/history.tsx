import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ArrowLeft, History, Wrench, Package } from 'lucide-react-native';
import MaintenanceHistory from '../../../components/MaintenanceHistory';
import { supabase } from '../../../lib/supabase';

export default function MaintenanceHistoryScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const deviceId = typeof params.deviceId === 'string' ? params.deviceId : '';
  const [deviceName, setDeviceName] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (deviceId) {
      fetchDeviceDetails();
    } else {
      setLoading(false);
    }
  }, [deviceId]);

  const fetchDeviceDetails = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('devices')
        .select('name')
        .eq('id', deviceId)
        .single();

      if (error) {
        console.error('Error fetching device details:', error);
        Alert.alert('Error', 'Failed to load device details');
      } else if (data) {
        setDeviceName(data.name);
      }
    } catch (error) {
      console.error('Exception fetching device details:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddMaintenance = () => {
    router.push({
      pathname: '/devices/maintenance',
      params: { deviceId }
    });
  };

  const handleBack = () => {
    if (deviceId) {
      router.push({
        pathname: '/devices/[id]',
        params: { id: deviceId }
      });
    } else {
      router.back();
    }
  };

  if (loading) {
    return (
      <SafeAreaView className="flex-1 bg-gray-50">
        <StatusBar style="dark" />
        <View className="flex-1 justify-center items-center">
          <ActivityIndicator size="large" color="#3B82F6" />
          <Text className="text-gray-600 mt-2">Loading maintenance history...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      <StatusBar style="dark" />
      
      <View className="flex-row justify-between items-center p-4 border-b border-gray-200 bg-white">
        <View className="flex-row items-center">
          <TouchableOpacity onPress={handleBack} className="mr-4">
            <ArrowLeft size={24} color="#0F172A" />
          </TouchableOpacity>
          <View className="flex-row items-center">
            <History size={20} color="#3B82F6" className="mr-2" />
            <Text className="text-xl font-bold text-gray-800">Maintenance History</Text>
          </View>
        </View>
        {deviceId && (
          <TouchableOpacity
            className="bg-blue-500 px-3 py-2 rounded-lg flex-row items-center"
            onPress={handleAddMaintenance}
          >
            <Wrench size={16} color="#FFFFFF" />
            <Text className="text-white font-medium ml-1">Add</Text>
          </TouchableOpacity>
        )}
      </View>
      
      {deviceName && (
        <View className="bg-white mx-4 mt-4 p-3 rounded-lg shadow-sm flex-row items-center">
          <Package size={18} color="#6B7280" className="mr-2" />
          <Text className="text-gray-700 font-medium">{deviceName}</Text>
        </View>
      )}
      
      <View className="flex-1 p-4">
        {deviceId ? (
          <MaintenanceHistory 
            deviceId={deviceId} 
            showAddButton={false}
            onAddPress={handleAddMaintenance}
          />
        ) : (
          <View className="bg-white rounded-lg p-4 shadow-sm">
            <Text className="text-gray-500 text-center mb-4">No device specified</Text>
            <TouchableOpacity
              className="bg-blue-500 rounded-lg py-2 items-center"
              onPress={() => router.push('/devices')}
            >
              <Text className="text-white font-medium">View All Devices</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </SafeAreaView>
  );
} 