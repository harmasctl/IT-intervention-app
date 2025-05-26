import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  TextInput,
  Modal,
  Image,
  RefreshControl,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { useRouter, useLocalSearchParams } from "expo-router";
import {
  ArrowLeft,
  Building2,
  MapPin,
  Phone,
  Mail,
  User,
  Calendar,
  Edit2,
  Trash2,
  Save,
  X,
  CircleCheck,
  AlertCircle,
  Hammer,
  Edit,
  Clock,
  MoreHorizontal,
  Wrench,
  Package,
  ChevronRight,
} from "lucide-react-native";
import { supabase } from "../../lib/supabase";
import * as ImagePicker from "expo-image-picker";
import { decode } from "base64-arraybuffer";
import { format } from "date-fns";

type Restaurant = {
  id: string;
  name: string;
  location?: string;
  address?: string;
  phone?: string;
  email?: string;
  manager_name?: string;
  status?: "active" | "closed" | "renovation";
  created_at: string;
  updated_at?: string;
  image_url?: string;
  operating_hours?: string;
};

type MaintenanceInfo = {
  pending_count: number;
  overdue_count: number;
  next_date: string | null;
};

type DeviceInfo = {
  total_count: number;
  operational_count: number;
  maintenance_count: number;
  offline_count: number;
};

export default function RestaurantDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [maintenanceInfo, setMaintenanceInfo] = useState<MaintenanceInfo>({
    pending_count: 0,
    overdue_count: 0,
    next_date: null,
  });
  const [deviceInfo, setDeviceInfo] = useState<DeviceInfo>({
    total_count: 0,
    operational_count: 0,
    maintenance_count: 0,
    offline_count: 0,
  });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (id) {
      fetchRestaurantDetails();
    } else {
      setError('Invalid restaurant ID');
      setLoading(false);
    }
  }, [id]);

  const fetchRestaurantDetails = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch restaurant details
      const { data, error } = await supabase
        .from('restaurants')
        .select('*')
        .eq('id', id)
        .single();

      if (error) {
        throw error;
      }

      if (data) {
        setRestaurant(data);
        
        // Fetch device statistics
        await fetchDeviceStatistics(id);
        
        // Fetch maintenance information
        await fetchMaintenanceInfo(id);
      } else {
        setError('Restaurant not found');
      }
    } catch (error) {
      console.error('Error fetching restaurant details:', error);
      setError('Failed to load restaurant details');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const fetchDeviceStatistics = async (restaurantId: string) => {
    try {
      const { data, error } = await supabase
        .from('devices')
        .select('id, status')
        .eq('restaurant_id', restaurantId);

      if (error) {
        throw error;
      }

      if (data) {
        const total = data.length;
        const operational = data.filter(device => device.status === 'operational').length;
        const maintenance = data.filter(device => device.status === 'maintenance').length;
        const offline = data.filter(device => device.status === 'offline').length;

        setDeviceInfo({
          total_count: total,
          operational_count: operational,
          maintenance_count: maintenance,
          offline_count: offline,
        });
      }
    } catch (error) {
      console.error('Error fetching device statistics:', error);
    }
  };

  const fetchMaintenanceInfo = async (restaurantId: string) => {
    try {
      // Get devices for this restaurant
      const { data: devices, error: devicesError } = await supabase
        .from('devices')
        .select('id, next_maintenance_date')
        .eq('restaurant_id', restaurantId);

      if (devicesError) {
        throw devicesError;
      }

      if (devices && devices.length > 0) {
        // Get pending maintenance records
        const { data: pendingMaintenance, error: pendingError } = await supabase
          .from('maintenance_records')
          .select('id')
          .in('device_id', devices.map(d => d.id))
          .eq('status', 'pending');

        if (pendingError) {
          throw pendingError;
        }

        // Get overdue maintenance
        const today = new Date();
        const overdueMaintenance = devices.filter(device => 
          device.next_maintenance_date && new Date(device.next_maintenance_date) < today
        );

        // Get next maintenance date
        let nextDate: Date | null = null;
        devices.forEach(device => {
          if (device.next_maintenance_date) {
            const date = new Date(device.next_maintenance_date);
            if (date > today && (!nextDate || date < nextDate)) {
              nextDate = date;
            }
          }
        });

        setMaintenanceInfo({
          pending_count: pendingMaintenance?.length || 0,
          overdue_count: overdueMaintenance.length,
          next_date: nextDate ? nextDate.toISOString() : null,
        });
      }
    } catch (error) {
      console.error('Error fetching maintenance info:', error);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    fetchRestaurantDetails();
  };

  const handleEditRestaurant = () => {
    if (restaurant) {
      router.push({
        pathname: '/restaurants/edit',
        params: { id: restaurant.id }
      });
    }
  };

  const handleViewDevices = () => {
    if (restaurant) {
      router.push({
        pathname: '/devices',
        params: { restaurant_id: restaurant.id }
      });
    }
  };

  const handleViewMaintenance = () => {
    if (restaurant) {
      router.push({
        pathname: '/maintenance',
        params: { restaurant_id: restaurant.id }
      });
    }
  };

  const handleShowOptions = () => {
        Alert.alert(
      'Restaurant Options',
      'Choose an action',
      [
        {
          text: 'Edit Restaurant',
          onPress: handleEditRestaurant,
        },
        {
          text: 'Delete Restaurant',
          style: 'destructive',
          onPress: () => {
        Alert.alert(
              'Delete Restaurant',
              'Are you sure you want to delete this restaurant?',
              [
                {
                  text: 'Cancel',
                  style: 'cancel',
                },
                {
                  text: 'Delete',
                  style: 'destructive',
                  onPress: async () => {
                    try {
                      setLoading(true);
      const { error } = await supabase
                        .from('restaurants')
        .delete()
                        .eq('id', restaurant?.id);

                      if (error) {
                        throw error;
                      }

                      Alert.alert('Success', 'Restaurant deleted successfully');
                      router.replace('/restaurants');
    } catch (error) {
                      console.error('Error deleting restaurant:', error);
                      Alert.alert('Error', 'Failed to delete restaurant');
                      setLoading(false);
                    }
                  },
                },
              ]
            );
          },
        },
        {
          text: 'Cancel',
          style: 'cancel',
        },
      ]
    );
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Not scheduled';
    return new Date(dateString).toLocaleDateString();
  };

  if (loading) {
    return (
      <SafeAreaView className="flex-1 bg-white">
        <StatusBar style="dark" />
        <View className="flex-1 justify-center items-center">
          <ActivityIndicator size="large" color="#3B82F6" />
          <Text className="mt-4 text-gray-600">Loading restaurant details...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView className="flex-1 bg-white">
        <StatusBar style="dark" />
        <View className="flex-row items-center p-4 border-b border-gray-200">
          <TouchableOpacity onPress={() => router.back()} className="mr-4">
            <ArrowLeft size={24} color="#0F172A" />
          </TouchableOpacity>
          <Text className="text-xl font-bold text-gray-800">Restaurant Details</Text>
        </View>
        <View className="flex-1 justify-center items-center p-4">
          <Text className="text-red-500 text-lg mb-4">{error}</Text>
          <TouchableOpacity
            className="bg-blue-500 px-4 py-2 rounded-lg"
            onPress={() => router.back()}
          >
            <Text className="text-white">Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  if (!restaurant) {
    return (
      <SafeAreaView className="flex-1 bg-white">
        <StatusBar style="dark" />
        <View className="flex-1 justify-center items-center">
          <Text className="text-gray-600">Restaurant not found</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      <StatusBar style="dark" />
      
      <View className="flex-row justify-between items-center p-4 border-b border-gray-200 bg-white">
        <View className="flex-row items-center">
          <TouchableOpacity onPress={() => router.back()} className="mr-4">
            <ArrowLeft size={24} color="#0F172A" />
        </TouchableOpacity>
          <Text className="text-xl font-bold text-gray-800" numberOfLines={1}>
            {restaurant.name}
          </Text>
        </View>
        <View className="flex-row">
            <TouchableOpacity
            className="p-2 mr-2"
            onPress={handleEditRestaurant}
          >
            <Edit size={24} color="#6B7280" />
            </TouchableOpacity>
          <TouchableOpacity
            className="p-2"
            onPress={handleShowOptions}
          >
            <MoreHorizontal size={24} color="#6B7280" />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        className="flex-1"
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
      >
        {/* Header Image */}
        <View className="w-full h-48 bg-blue-100">
          {restaurant.image_url ? (
              <Image
                source={{ uri: restaurant.image_url }}
                className="w-full h-full"
              resizeMode="cover"
              />
          ) : (
            <View className="w-full h-full items-center justify-center">
              <Building2 size={80} color="#60A5FA" />
            </View>
          )}
          </View>

        {/* Restaurant Status Badge */}
        <View className="absolute top-2 right-2 bg-white rounded-full px-3 py-1 shadow-sm">
                    <Text
            className={`font-medium ${
              restaurant.status === 'active'
                ? 'text-green-600'
                : restaurant.status === 'closed'
                ? 'text-amber-600'
                : 'text-red-600'
            }`}
          >
            {restaurant.status.charAt(0).toUpperCase() + restaurant.status.slice(1)}
                </Text>
          </View>

        {/* Basic Info */}
        <View className="bg-white p-4 mb-4">
          <Text className="text-2xl font-bold text-gray-900 mb-2">
            {restaurant.name}
          </Text>
          
          {restaurant.address && (
            <View className="flex-row items-start mt-2">
              <MapPin size={18} color="#6B7280" className="mr-2 mt-1" />
              <Text className="text-gray-700 flex-1">
                {restaurant.address}
                {restaurant.location && `, ${restaurant.location}`}
                  </Text>
            </View>
          )}
          
          {restaurant.phone && (
            <View className="flex-row items-center mt-3">
              <Phone size={18} color="#6B7280" className="mr-2" />
              <Text className="text-gray-700">{restaurant.phone}</Text>
            </View>
          )}
          
          {restaurant.email && (
            <View className="flex-row items-center mt-3">
              <Mail size={18} color="#6B7280" className="mr-2" />
              <Text className="text-gray-700">{restaurant.email}</Text>
            </View>
          )}
          
          {restaurant.manager_name && (
            <View className="flex-row items-center mt-3">
              <User size={18} color="#6B7280" className="mr-2" />
              <Text className="text-gray-700">Manager: {restaurant.manager_name}</Text>
            </View>
          )}
          
          {restaurant.operating_hours && (
            <View className="flex-row items-center mt-3">
              <Clock size={18} color="#6B7280" className="mr-2" />
              <Text className="text-gray-700">{restaurant.operating_hours}</Text>
            </View>
                )}
              </View>
        
        {/* Device Statistics */}
        <View className="bg-white p-4 mb-4">
          <Text className="text-lg font-semibold text-gray-800 mb-3">Equipment Status</Text>
          
          <View className="flex-row justify-between mb-4">
            <View className="items-center">
              <Text className="text-2xl font-bold text-blue-600">{deviceInfo.total_count}</Text>
              <Text className="text-gray-600 text-sm">Total Devices</Text>
            </View>

            <View className="items-center">
              <Text className="text-2xl font-bold text-green-600">{deviceInfo.operational_count}</Text>
              <Text className="text-gray-600 text-sm">Operational</Text>
            </View>

            <View className="items-center">
              <Text className="text-2xl font-bold text-amber-600">{deviceInfo.maintenance_count}</Text>
              <Text className="text-gray-600 text-sm">Maintenance</Text>
        </View>

            <View className="items-center">
              <Text className="text-2xl font-bold text-red-600">{deviceInfo.offline_count}</Text>
              <Text className="text-gray-600 text-sm">Offline</Text>
          </View>
        </View>

          <TouchableOpacity
            className="flex-row justify-between items-center py-2 border-t border-gray-100"
            onPress={handleViewDevices}
          >
            <View className="flex-row items-center">
              <Package size={18} color="#3B82F6" className="mr-2" />
              <Text className="text-blue-600 font-medium">View All Equipment</Text>
            </View>
            <ChevronRight size={18} color="#3B82F6" />
          </TouchableOpacity>
        </View>
        
        {/* Maintenance Info */}
        <View className="bg-white p-4 mb-4">
          <Text className="text-lg font-semibold text-gray-800 mb-3">Maintenance</Text>
          
          <View className="flex-row justify-between mb-4">
            <View className="items-center">
              <Text className="text-2xl font-bold text-amber-600">{maintenanceInfo.pending_count}</Text>
              <Text className="text-gray-600 text-sm">Pending</Text>
            </View>
            
            <View className="items-center">
              <Text className="text-2xl font-bold text-red-600">{maintenanceInfo.overdue_count}</Text>
              <Text className="text-gray-600 text-sm">Overdue</Text>
            </View>
            
            <View className="items-center">
              <View className="flex-row items-center">
                <Calendar size={18} color="#6B7280" className="mr-1" />
                <Text className="text-gray-800">{formatDate(maintenanceInfo.next_date)}</Text>
              </View>
              <Text className="text-gray-600 text-sm">Next Scheduled</Text>
            </View>
          </View>
          
          <TouchableOpacity
            className="flex-row justify-between items-center py-2 border-t border-gray-100"
            onPress={handleViewMaintenance}
          >
            <View className="flex-row items-center">
              <Wrench size={18} color="#3B82F6" className="mr-2" />
              <Text className="text-blue-600 font-medium">View Maintenance History</Text>
            </View>
            <ChevronRight size={18} color="#3B82F6" />
          </TouchableOpacity>
        </View>
        
        <View className="h-10" />
      </ScrollView>
    </SafeAreaView>
  );
} 