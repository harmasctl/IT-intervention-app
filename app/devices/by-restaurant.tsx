import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { useRouter } from "expo-router";
import {
  ArrowLeft,
  Building2,
  Package,
  MapPin,
  Phone,
  User,
  Clock,
  RefreshCw,
} from "lucide-react-native";
import { supabase } from "../../lib/supabase";
import RestaurantDeviceList from "../../components/RestaurantDeviceList";

interface Restaurant {
  id: string;
  name: string;
  location?: string;
  contact_phone?: string;
  manager_name?: string;
  device_count: number;
}

export default function DevicesByRestaurantScreen() {
  const router = useRouter();
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [selectedRestaurant, setSelectedRestaurant] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchRestaurants();
  }, []);

  const fetchRestaurants = async () => {
    try {
      setLoading(true);

      // Fetch restaurants with device counts
      const { data: restaurantData, error: restaurantError } = await supabase
        .from("restaurants")
        .select("id, name, location, contact_phone, manager_name")
        .order("name");

      if (restaurantError) {
        console.error("Error fetching restaurants:", restaurantError);
        Alert.alert("Error", "Failed to fetch restaurants");
        return;
      }

      // Get device counts for each restaurant
      const restaurantsWithCounts = await Promise.all(
        (restaurantData || []).map(async (restaurant) => {
          const { count, error } = await supabase
            .from("devices")
            .select("*", { count: "exact", head: true })
            .eq("restaurant_id", restaurant.id);

          return {
            ...restaurant,
            device_count: error ? 0 : count || 0,
          };
        })
      );

      setRestaurants(restaurantsWithCounts);
    } catch (error) {
      console.error("Error fetching restaurants:", error);
      Alert.alert("Error", "An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  };

  const handleRestaurantSelect = (restaurantId: string) => {
    setSelectedRestaurant(restaurantId === selectedRestaurant ? null : restaurantId);
  };

  const handleDeviceSelect = (device: any) => {
    router.push(`/devices/${device.id}`);
  };

  if (loading) {
    return (
      <SafeAreaView className="flex-1 bg-white justify-center items-center">
        <ActivityIndicator size="large" color="#3B82F6" />
        <Text className="text-gray-500 mt-2">Loading restaurants...</Text>
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
            🏢 Devices by Restaurant
          </Text>
        </View>
        <TouchableOpacity
          className="bg-blue-500 p-2 rounded-full"
          onPress={fetchRestaurants}
        >
          <RefreshCw size={20} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        {/* Restaurant List */}
        <View className="p-4">
          <Text className="text-lg font-bold text-gray-800 mb-4">
            Select a Restaurant ({restaurants.length})
          </Text>

          {restaurants.length === 0 ? (
            <View className="bg-white rounded-lg p-8 items-center">
              <Building2 size={48} color="#9CA3AF" />
              <Text className="text-gray-500 text-lg mt-4">No Restaurants Found</Text>
              <Text className="text-gray-400 text-center mt-2">
                Add restaurants to the system to view their devices
              </Text>
            </View>
          ) : (
            restaurants.map((restaurant) => (
              <TouchableOpacity
                key={restaurant.id}
                className={`bg-white rounded-lg p-4 mb-3 shadow-sm border ${
                  selectedRestaurant === restaurant.id
                    ? "border-blue-300 bg-blue-50"
                    : "border-gray-200"
                }`}
                onPress={() => handleRestaurantSelect(restaurant.id)}
              >
                <View className="flex-row items-start justify-between">
                  <View className="flex-1">
                    <View className="flex-row items-center mb-2">
                      <Building2 size={20} color="#3B82F6" />
                      <Text className="font-bold text-gray-800 ml-2 flex-1">
                        {restaurant.name}
                      </Text>
                      <View className="bg-blue-100 px-2 py-1 rounded-full">
                        <Text className="text-blue-800 text-xs font-medium">
                          {restaurant.device_count} device{restaurant.device_count !== 1 ? 's' : ''}
                        </Text>
                      </View>
                    </View>

                    {restaurant.location && (
                      <View className="flex-row items-center mb-1">
                        <MapPin size={14} color="#6B7280" />
                        <Text className="text-gray-600 text-sm ml-1">
                          {restaurant.location}
                        </Text>
                      </View>
                    )}

                    {restaurant.manager_name && (
                      <View className="flex-row items-center mb-1">
                        <User size={14} color="#6B7280" />
                        <Text className="text-gray-600 text-sm ml-1">
                          Manager: {restaurant.manager_name}
                        </Text>
                      </View>
                    )}

                    {restaurant.contact_phone && (
                      <View className="flex-row items-center">
                        <Phone size={14} color="#6B7280" />
                        <Text className="text-gray-600 text-sm ml-1">
                          {restaurant.contact_phone}
                        </Text>
                      </View>
                    )}
                  </View>
                </View>

                {selectedRestaurant === restaurant.id && restaurant.device_count > 0 && (
                  <View className="mt-4 pt-4 border-t border-gray-200">
                    <Text className="font-medium text-gray-700 mb-3">
                      📱 Devices at this location:
                    </Text>
                  </View>
                )}
              </TouchableOpacity>
            ))
          )}
        </View>

        {/* Device List for Selected Restaurant */}
        {selectedRestaurant && (
          <View className="px-4 pb-4">
            <RestaurantDeviceList
              restaurantId={selectedRestaurant}
              onDeviceSelect={handleDeviceSelect}
              showAllRestaurants={false}
            />
          </View>
        )}

        {/* Summary */}
        <View className="p-4">
          <View className="bg-blue-50 rounded-lg p-4 border border-blue-200">
            <Text className="text-blue-800 font-bold mb-2">📊 Summary</Text>
            <Text className="text-blue-700 text-sm">
              • Total Restaurants: {restaurants.length}{"\n"}
              • Total Devices: {restaurants.reduce((sum, r) => sum + r.device_count, 0)}{"\n"}
              • Average Devices per Restaurant: {restaurants.length > 0 ? (restaurants.reduce((sum, r) => sum + r.device_count, 0) / restaurants.length).toFixed(1) : 0}
            </Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
