import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Map, ArrowLeft, Info, AlertTriangle, CheckCircle, Clock, AlertCircle, Tag } from 'lucide-react-native';
import { supabase } from '../lib/supabase';

interface DeviceStats {
  total: number;
  operational: number;
  maintenance: number;
  offline: number;
}

interface CategoryStats {
  id: string;
  name: string;
  count: number;
}

export default function TestDeviceMap() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<DeviceStats>({
    total: 0,
    operational: 0,
    maintenance: 0,
    offline: 0
  });
  const [categoryStats, setCategoryStats] = useState<CategoryStats[]>([]);
  const [showCategoryStats, setShowCategoryStats] = useState(false);

  useEffect(() => {
    fetchDeviceStats();
    fetchCategoryStats();
    
    // Subscribe to device changes
    const deviceSubscription = supabase
      .channel('device-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'devices' },
        () => {
          console.log('Device change detected, refreshing stats...');
          fetchDeviceStats();
          fetchCategoryStats();
        }
      )
      .subscribe();
      
    return () => {
      deviceSubscription.unsubscribe();
    };
  }, []);
  
  const fetchDeviceStats = async () => {
    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .from('devices')
        .select('status');
        
      if (error) throw error;
      
      const newStats = {
        total: data.length,
        operational: data.filter(d => d.status === 'operational').length,
        maintenance: data.filter(d => d.status === 'maintenance').length,
        offline: data.filter(d => d.status === 'offline').length
      };
      
      setStats(newStats);
    } catch (err) {
      console.error('Error fetching device stats:', err);
    } finally {
      setLoading(false);
    }
  };
  
  const fetchCategoryStats = async () => {
    try {
      // First get all categories
      const { data: categories, error: categoriesError } = await supabase
        .from('device_categories')
        .select('id, name')
        .order('name');
        
      if (categoriesError) throw categoriesError;
      
      // Then get device counts by category
      const { data: devices, error: devicesError } = await supabase
        .from('devices')
        .select('category_id');
        
      if (devicesError) throw devicesError;
      
      // Calculate counts for each category
      const stats = categories.map(category => {
        const count = devices.filter(device => device.category_id === category.id).length;
        return {
          id: category.id,
          name: category.name,
          count
        };
      });
      
      // Sort by count (highest first)
      stats.sort((a, b) => b.count - a.count);
      
      setCategoryStats(stats);
    } catch (err) {
      console.error('Error fetching category stats:', err);
    }
  };
  
  const toggleCategoryStats = () => {
    setShowCategoryStats(!showCategoryStats);
  };

  return (
    <SafeAreaView className="flex-1 bg-white">
      <View className="flex-row justify-between items-center p-4 border-b border-gray-200">
        <View className="flex-row items-center">
          <TouchableOpacity onPress={() => router.back()} className="mr-4">
            <ArrowLeft size={24} color="#0F172A" />
          </TouchableOpacity>
          <Text className="text-xl font-bold text-gray-800">Restaurant Device Map</Text>
        </View>
        <TouchableOpacity onPress={toggleCategoryStats}>
          <Tag size={20} color={showCategoryStats ? "#3B82F6" : "#6B7280"} />
        </TouchableOpacity>
      </View>
      
      <ScrollView className="flex-1 p-4">
        <View className="bg-blue-50 p-4 rounded-lg mb-6 border border-blue-200">
          <View className="flex-row items-start mb-2">
            <Info size={20} color="#1E40AF" className="mr-2" />
            <Text className="text-blue-800 font-medium flex-1">
              This is a test page to help diagnose navigation issues with the restaurant device map.
            </Text>
          </View>
          <Text className="text-blue-700">
            Select one of the options below to navigate to different versions of the map.
          </Text>
        </View>
        
        <View className="bg-yellow-50 p-4 rounded-lg mb-6 border border-yellow-200">
          <View className="flex-row items-start mb-2">
            <AlertTriangle size={20} color="#B45309" className="mr-2" />
            <Text className="text-yellow-800 font-medium flex-1">
              If you're seeing navigation errors, try the Simple Map first.
            </Text>
          </View>
        </View>
        
        {/* Device Status Summary */}
        <View className="bg-gray-50 p-4 rounded-lg mb-6 border border-gray-200">
          <Text className="text-lg font-bold mb-3 text-gray-800">Current Device Status</Text>
          
          {loading ? (
            <View className="h-24 justify-center items-center">
              <ActivityIndicator size="small" color="#3B82F6" />
              <Text className="text-gray-500 mt-2">Loading stats...</Text>
            </View>
          ) : (
            <>
              <View className="flex-row justify-between mb-2">
                <View className="bg-white rounded-lg p-3 flex-1 mr-2 shadow-sm">
                  <Text className="text-sm text-gray-500 mb-1">Total Devices</Text>
                  <Text className="text-2xl font-bold text-blue-700">{stats.total}</Text>
                </View>
                
                <View className="bg-green-50 rounded-lg p-3 flex-1">
                  <View className="flex-row items-center justify-between">
                    <Text className="text-sm text-gray-500">Operational</Text>
                    <CheckCircle size={14} color="#10B981" />
                  </View>
                  <Text className="text-xl font-bold text-green-700">{stats.operational}</Text>
                </View>
              </View>
              
              <View className="flex-row justify-between">
                <View className="bg-yellow-50 rounded-lg p-3 flex-1 mr-2">
                  <View className="flex-row items-center justify-between">
                    <Text className="text-sm text-gray-500">Maintenance</Text>
                    <Clock size={14} color="#F59E0B" />
                  </View>
                  <Text className="text-xl font-bold text-yellow-700">{stats.maintenance}</Text>
                </View>
                
                <View className="bg-red-50 rounded-lg p-3 flex-1">
                  <View className="flex-row items-center justify-between">
                    <Text className="text-sm text-gray-500">Offline</Text>
                    <AlertCircle size={14} color="#EF4444" />
                  </View>
                  <Text className="text-xl font-bold text-red-700">{stats.offline}</Text>
                </View>
              </View>
            </>
          )}
        </View>
        
        {/* Category Stats */}
        {showCategoryStats && (
          <View className="bg-gray-50 p-4 rounded-lg mb-6 border border-gray-200">
            <Text className="text-lg font-bold mb-3 text-gray-800">Devices by Category</Text>
            
            {categoryStats.length === 0 ? (
              <View className="h-24 justify-center items-center">
                <ActivityIndicator size="small" color="#3B82F6" />
                <Text className="text-gray-500 mt-2">Loading categories...</Text>
              </View>
            ) : (
              <View>
                {categoryStats.map((category, index) => (
                  <View key={category.id} className="flex-row justify-between items-center py-2 border-b border-gray-100">
                    <View className="flex-row items-center">
                      <View className={`w-3 h-3 rounded-full ${index === 0 ? 'bg-blue-500' : index === 1 ? 'bg-green-500' : index === 2 ? 'bg-yellow-500' : 'bg-gray-400'}`} />
                      <Text className="ml-2 font-medium">{category.name}</Text>
                    </View>
                    <Text className="text-gray-700 font-bold">{category.count}</Text>
                  </View>
                ))}
              </View>
            )}
          </View>
        )}
        
        <Text className="text-lg font-bold mb-4">Map Options</Text>
        
        <TouchableOpacity
          className="bg-blue-600 p-5 rounded-xl mb-4 shadow-md"
          onPress={() => {
            console.log('Navigating to simple map...');
            router.push('/restaurants/simple-map');
          }}
        >
          <Text className="text-white text-lg font-bold mb-2">Simple Device Status Map</Text>
          <Text className="text-blue-100">
            A simplified view showing device status counts by restaurant.
            Good for a quick overview of device health across locations.
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          className="bg-green-600 p-5 rounded-xl mb-4 shadow-md"
          onPress={() => {
            console.log('Navigating to full device map...');
            router.push('/restaurants/device-map');
          }}
        >
          <Text className="text-white text-lg font-bold mb-2">Full Device Map</Text>
          <Text className="text-green-100">
            Complete interactive map showing all devices by restaurant.
            Includes filtering by device type and detailed device information.
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          className="bg-gray-200 p-5 rounded-xl mb-4"
          onPress={() => router.back()}
        >
          <Text className="text-gray-800 text-center font-medium">Go Back</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
} 