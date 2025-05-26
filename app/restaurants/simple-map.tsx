import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  TouchableOpacity, 
  ActivityIndicator, 
  ScrollView,
  RefreshControl,
  Dimensions
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { 
  ArrowLeft, 
  Building2, 
  CheckCircle, 
  AlertCircle, 
  Clock, 
  RefreshCw,
  Filter,
  Tag
} from 'lucide-react-native';
import { supabase } from '../../lib/supabase';
import Animated, { 
  useSharedValue, 
  useAnimatedStyle, 
  withTiming 
} from 'react-native-reanimated';

interface Restaurant {
  id: string;
  name: string;
  deviceStats?: {
    operational: number;
    maintenance: number;
    offline: number;
    total: number;
  }
}

interface Category {
  id: string;
  name: string;
  description?: string;
}

export default function SimpleDeviceMap() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string | null>(null);
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [showCategoryFilter, setShowCategoryFilter] = useState(false);
  
  // Animation values
  const refreshIconRotation = useSharedValue(0);
  const refreshAnimatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ rotate: `${refreshIconRotation.value}deg` }],
    };
  });
  
  // Set up auto-refresh interval
  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    
    if (autoRefresh) {
      interval = setInterval(() => {
        refreshIconRotation.value = withTiming(refreshIconRotation.value + 360, { duration: 1000 });
        fetchData();
      }, 30000); // Refresh every 30 seconds
    }
    
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [autoRefresh]);
  
  // Initial data fetch
  useEffect(() => {
    fetchData();
    fetchCategories();
    
    // Set up real-time subscription for device changes
    const deviceSubscription = supabase
      .channel('device-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'devices' },
        () => {
          console.log('Device change detected, refreshing...');
          fetchData();
        }
      )
      .subscribe();
      
    return () => {
      deviceSubscription.unsubscribe();
    };
  }, []);
  
  async function fetchData() {
    try {
      setLoading(true);
      
      // Fetch restaurants
      const { data: restaurantsData, error: restaurantsError } = await supabase
        .from('restaurants')
        .select('*')
        .order('name');
        
      if (restaurantsError) throw restaurantsError;
      
      // Fetch devices to get stats
      const { data: devicesData, error: devicesError } = await supabase
        .from('devices')
        .select('id, restaurant_id, status, category_id');
        
      if (devicesError) throw devicesError;
      
      // Calculate device stats for each restaurant
      const restaurantsWithStats = restaurantsData.map(restaurant => {
        // Get all devices for this restaurant
        const allRestaurantDevices = devicesData.filter(device => 
          device.restaurant_id === restaurant.id
        );
        
        // Apply category filter if needed
        const restaurantDevices = categoryFilter 
          ? allRestaurantDevices.filter(device => device.category_id === categoryFilter)
          : allRestaurantDevices;
        
        const stats = {
          operational: restaurantDevices.filter(d => d.status === 'operational').length,
          maintenance: restaurantDevices.filter(d => d.status === 'maintenance').length,
          offline: restaurantDevices.filter(d => d.status === 'offline').length,
          total: restaurantDevices.length
        };
        
        return {
          ...restaurant,
          deviceStats: stats
        };
      });
      
      // Apply status filter if needed
      let filteredRestaurants = restaurantsWithStats;
      if (statusFilter) {
        filteredRestaurants = restaurantsWithStats.filter(restaurant => {
          if (statusFilter === 'operational' && restaurant.deviceStats?.operational > 0) return true;
          if (statusFilter === 'maintenance' && restaurant.deviceStats?.maintenance > 0) return true;
          if (statusFilter === 'offline' && restaurant.deviceStats?.offline > 0) return true;
          return false;
        });
      }
      
      setRestaurants(filteredRestaurants);
      setLastUpdated(new Date());
    } catch (err) {
      console.error('Error fetching data:', err);
      setError('Failed to load data');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }
  
  const fetchCategories = async () => {
    try {
      const { data, error } = await supabase
        .from("device_categories")
        .select("*")
        .order("name");

      if (error) {
        throw error;
      }

      setCategories(data || []);
    } catch (err) {
      console.error("Error fetching categories:", err);
    }
  };
  
  const handleRefresh = () => {
    setRefreshing(true);
    refreshIconRotation.value = withTiming(refreshIconRotation.value + 360, { duration: 1000 });
    fetchData();
    fetchCategories();
  };
  
  const toggleAutoRefresh = () => {
    setAutoRefresh(!autoRefresh);
  };
  
  // Calculate total stats across all restaurants
  const calculateTotalStats = () => {
    return restaurants.reduce((totals, restaurant) => {
      if (restaurant.deviceStats) {
        totals.operational += restaurant.deviceStats.operational;
        totals.maintenance += restaurant.deviceStats.maintenance;
        totals.offline += restaurant.deviceStats.offline;
        totals.total += restaurant.deviceStats.total;
      }
      return totals;
    }, { operational: 0, maintenance: 0, offline: 0, total: 0 });
  };
  
  const totalStats = calculateTotalStats();
  
  // Format the last updated time
  const formatLastUpdated = () => {
    return lastUpdated.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };
  
  return (
    <SafeAreaView className="flex-1 bg-white">
      <View className="flex-row justify-between items-center p-4 border-b border-gray-200">
        <View className="flex-row items-center">
          <TouchableOpacity onPress={() => router.back()} className="mr-4">
            <ArrowLeft size={24} color="#0F172A" />
          </TouchableOpacity>
          <Text className="text-xl font-bold text-gray-800">Device Status Overview</Text>
        </View>
        <View className="flex-row">
          <TouchableOpacity 
            onPress={() => setShowCategoryFilter(!showCategoryFilter)}
            className="mr-4"
          >
            <Tag size={20} color={categoryFilter ? "#3B82F6" : "#6B7280"} />
          </TouchableOpacity>
          <TouchableOpacity onPress={toggleAutoRefresh}>
            <Animated.View style={[autoRefresh ? refreshAnimatedStyle : {}]}>
              <RefreshCw size={20} color={autoRefresh ? "#3B82F6" : "#6B7280"} />
            </Animated.View>
          </TouchableOpacity>
        </View>
      </View>
      
      {/* Category Filter */}
      {showCategoryFilter && (
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false} 
          className="p-2 bg-gray-50 border-b border-gray-200"
        >
          <TouchableOpacity 
            className={`px-4 py-2 rounded-full mr-2 ${categoryFilter === null ? 'bg-blue-500' : 'bg-gray-200'}`}
            onPress={() => {
              setCategoryFilter(null);
              fetchData();
            }}
          >
            <Text className={`${categoryFilter === null ? 'text-white' : 'text-gray-800'}`}>
              All Categories
            </Text>
          </TouchableOpacity>
          
          {categories.map(category => (
            <TouchableOpacity 
              key={category.id}
              className={`flex-row items-center px-4 py-2 rounded-full mr-2 ${categoryFilter === category.id ? 'bg-blue-500' : 'bg-gray-200'}`}
              onPress={() => {
                setCategoryFilter(category.id);
                fetchData();
              }}
            >
              <Text className={`${categoryFilter === category.id ? 'text-white' : 'text-gray-800'}`}>
                {category.name}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}
      
      {loading && !refreshing ? (
        <View className="flex-1 justify-center items-center">
          <ActivityIndicator size="large" color="#0F172A" />
          <Text className="mt-4 text-gray-500">Loading data...</Text>
        </View>
      ) : error ? (
        <View className="flex-1 justify-center items-center p-4">
          <Text className="text-red-500 text-lg">{error}</Text>
          <TouchableOpacity 
            className="mt-4 bg-blue-500 px-4 py-2 rounded-lg"
            onPress={() => router.back()}
          >
            <Text className="text-white">Go Back</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView 
          className="flex-1"
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
          }
        >
          {/* Status Summary */}
          <View className="p-4 bg-gray-50 border-b border-gray-200">
            <View className="flex-row justify-between items-center mb-3">
              <Text className="text-lg font-bold text-gray-800">Device Status Summary</Text>
              <View className="flex-row items-center">
                <Text className="text-xs text-gray-500 mr-1">Updated: {formatLastUpdated()}</Text>
                {autoRefresh && <Text className="text-xs text-blue-500">(Auto)</Text>}
              </View>
            </View>
            
            <View className="flex-row justify-between mb-2">
              <View className="bg-white rounded-lg p-3 flex-1 mr-2 shadow-sm">
                <Text className="text-sm text-gray-500 mb-1">Total Devices</Text>
                <Text className="text-2xl font-bold text-blue-700">{totalStats.total}</Text>
                {categoryFilter && (
                  <Text className="text-xs text-blue-500 mt-1">
                    {categories.find(c => c.id === categoryFilter)?.name}
                  </Text>
                )}
              </View>
              
              <TouchableOpacity 
                className={`rounded-lg p-3 flex-1 shadow-sm ${statusFilter === 'operational' ? 'bg-green-100' : 'bg-white'}`}
                onPress={() => setStatusFilter(statusFilter === 'operational' ? null : 'operational')}
              >
                <View className="flex-row items-center justify-between">
                  <Text className="text-sm text-gray-500">Operational</Text>
                  <CheckCircle size={16} color="#10B981" />
                </View>
                <Text className="text-2xl font-bold text-green-700">{totalStats.operational}</Text>
              </TouchableOpacity>
            </View>
            
            <View className="flex-row justify-between">
              <TouchableOpacity 
                className={`rounded-lg p-3 flex-1 mr-2 shadow-sm ${statusFilter === 'maintenance' ? 'bg-yellow-100' : 'bg-white'}`}
                onPress={() => setStatusFilter(statusFilter === 'maintenance' ? null : 'maintenance')}
              >
                <View className="flex-row items-center justify-between">
                  <Text className="text-sm text-gray-500">Maintenance</Text>
                  <Clock size={16} color="#F59E0B" />
                </View>
                <Text className="text-2xl font-bold text-yellow-700">{totalStats.maintenance}</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                className={`rounded-lg p-3 flex-1 shadow-sm ${statusFilter === 'offline' ? 'bg-red-100' : 'bg-white'}`}
                onPress={() => setStatusFilter(statusFilter === 'offline' ? null : 'offline')}
              >
                <View className="flex-row items-center justify-between">
                  <Text className="text-sm text-gray-500">Offline</Text>
                  <AlertCircle size={16} color="#EF4444" />
                </View>
                <Text className="text-2xl font-bold text-red-700">{totalStats.offline}</Text>
              </TouchableOpacity>
            </View>
            
            {(statusFilter || categoryFilter) && (
              <TouchableOpacity 
                className="mt-3 py-2 flex-row items-center justify-center"
                onPress={() => {
                  setStatusFilter(null);
                  setCategoryFilter(null);
                  fetchData();
                }}
              >
                <Text className="text-blue-600 font-medium mr-1">Clear All Filters</Text>
                <Filter size={14} color="#2563EB" />
              </TouchableOpacity>
            )}
          </View>
          
          {/* Restaurant List */}
          <View className="p-4">
            <View className="flex-row justify-between items-center mb-4">
              <Text className="text-lg font-bold text-gray-800">
                Restaurant Status
                {statusFilter && ` • ${statusFilter.charAt(0).toUpperCase() + statusFilter.slice(1)}`}
                {categoryFilter && ` • ${categories.find(c => c.id === categoryFilter)?.name || ''}`}
              </Text>
              <Text className="text-gray-500">{restaurants.length} locations</Text>
            </View>
            
            {restaurants.map(restaurant => (
              <View key={restaurant.id} className="bg-gray-50 rounded-lg p-4 mb-4 shadow-sm">
                <View className="flex-row justify-between items-center mb-3">
                  <View className="flex-row items-center">
                    <Building2 size={20} color="#4B5563" />
                    <Text className="font-bold text-lg ml-2">{restaurant.name}</Text>
                  </View>
                  <Text className="text-gray-500">
                    {restaurant.deviceStats?.total || 0} devices
                  </Text>
                </View>
                
                <View className="flex-row justify-between">
                  <View className="flex-1 bg-green-50 rounded-lg p-3 mr-2">
                    <View className="flex-row items-center justify-between mb-1">
                      <Text className="text-green-800 font-medium">Operational</Text>
                      <CheckCircle size={16} color="#10B981" />
                    </View>
                    <Text className="text-2xl font-bold text-green-700">
                      {restaurant.deviceStats?.operational || 0}
                    </Text>
                  </View>
                  
                  <View className="flex-1 bg-yellow-50 rounded-lg p-3 mr-2">
                    <View className="flex-row items-center justify-between mb-1">
                      <Text className="text-yellow-800 font-medium">Maintenance</Text>
                      <Clock size={16} color="#F59E0B" />
                    </View>
                    <Text className="text-2xl font-bold text-yellow-700">
                      {restaurant.deviceStats?.maintenance || 0}
                    </Text>
                  </View>
                  
                  <View className="flex-1 bg-red-50 rounded-lg p-3">
                    <View className="flex-row items-center justify-between mb-1">
                      <Text className="text-red-800 font-medium">Offline</Text>
                      <AlertCircle size={16} color="#EF4444" />
                    </View>
                    <Text className="text-2xl font-bold text-red-700">
                      {restaurant.deviceStats?.offline || 0}
                    </Text>
                  </View>
                </View>
                
                <TouchableOpacity 
                  className="mt-3 bg-blue-500 py-2 rounded-lg"
                  onPress={() => router.push({
                    pathname: '/restaurants/[id]',
                    params: { id: restaurant.id }
                  })}
                >
                  <Text className="text-white text-center font-medium">View Details</Text>
                </TouchableOpacity>
              </View>
            ))}
            
            {restaurants.length === 0 && (
              <View className="bg-white p-4 rounded-lg shadow-sm">
                <Text className="text-gray-500 text-center">
                  {statusFilter 
                    ? `No restaurants with ${statusFilter} devices found` 
                    : categoryFilter
                    ? `No restaurants with devices in this category found`
                    : "No restaurants found"}
                </Text>
              </View>
            )}
            
            <TouchableOpacity
              className="mt-4 bg-blue-600 py-3 rounded-lg"
              onPress={() => router.push('/restaurants/device-map')}
            >
              <Text className="text-white text-center font-bold">View Full Device Map</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      )}
    </SafeAreaView>
  );
} 