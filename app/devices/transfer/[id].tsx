import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Alert,
  ScrollView,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { useRouter, useLocalSearchParams } from "expo-router";
import {
  ArrowLeft,
  ArrowRightLeft,
  Building2,
  Package,
  CheckCircle,
  History,
} from "lucide-react-native";
import { supabase } from "../../../lib/supabase";
import { useAuth } from "../../../components/AuthProvider";

type Device = {
  id: string;
  name: string;
  serial_number: string;
  type: string;
  model?: string;
  restaurant_id: string;
  restaurant?: { name: string; address?: string };
};

type Restaurant = {
  id: string;
  name: string;
  address?: string;
  contact_phone?: string;
};

export default function DeviceTransferScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();
  const [device, setDevice] = useState<Device | null>(null);
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [selectedRestaurant, setSelectedRestaurant] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [transferring, setTransferring] = useState(false);

  useEffect(() => {
    if (id) {
      fetchDeviceAndRestaurants();
    }
  }, [id]);

  const fetchDeviceAndRestaurants = async () => {
    try {
      setLoading(true);
      
      // Fetch device details
      const { data: deviceData, error: deviceError } = await supabase
        .from("devices")
        .select(`
          *,
          restaurant:restaurants(name, address)
        `)
        .eq("id", id)
        .single();

      if (deviceError) {
        console.error("Error fetching device:", deviceError);
        Alert.alert("Error", "Failed to load device details");
        return;
      }

      setDevice(deviceData);

      // Fetch all restaurants
      const { data: restaurantsData, error: restaurantsError } = await supabase
        .from("restaurants")
        .select("id, name, address, contact_phone")
        .order("name");

      if (restaurantsError) {
        console.error("Error fetching restaurants:", restaurantsError);
        Alert.alert("Error", "Failed to load restaurants");
        return;
      }

      setRestaurants(restaurantsData || []);
    } catch (error) {
      console.error("Exception fetching data:", error);
      Alert.alert("Error", "An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  };

  const handleTransfer = async () => {
    if (!selectedRestaurant || !device) {
      Alert.alert("Error", "Please select a destination restaurant");
      return;
    }

    if (selectedRestaurant === device.restaurant_id) {
      Alert.alert("Error", "Device is already at this restaurant");
      return;
    }

    const destinationRestaurant = restaurants.find(r => r.id === selectedRestaurant);
    
    Alert.alert(
      "Confirm Transfer",
      `Transfer "${device.name}" to "${destinationRestaurant?.name}"?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Transfer",
          onPress: performTransfer,
        },
      ]
    );
  };

  const performTransfer = async () => {
    if (!selectedRestaurant || !device) return;

    try {
      setTransferring(true);

      const destinationRestaurant = restaurants.find(r => r.id === selectedRestaurant);
      const sourceRestaurant = device.restaurant;

      // Update device restaurant
      const { error: updateError } = await supabase
        .from("devices")
        .update({ 
          restaurant_id: selectedRestaurant,
          updated_at: new Date().toISOString()
        })
        .eq("id", device.id);

      if (updateError) {
        throw updateError;
      }

      // Create transfer history record
      const { error: historyError } = await supabase
        .from("device_transfer_history")
        .insert({
          device_id: device.id,
          from_restaurant_id: device.restaurant_id,
          to_restaurant_id: selectedRestaurant,
          transferred_by: user?.id,
          transferred_at: new Date().toISOString(),
          notes: `Device transferred from ${sourceRestaurant?.name || 'Unknown'} to ${destinationRestaurant?.name || 'Unknown'}`,
        });

      if (historyError) {
        console.error("Error creating transfer history:", historyError);
        // Don't fail the transfer if history creation fails
      }

      Alert.alert(
        "Transfer Complete",
        `"${device.name}" has been successfully transferred to "${destinationRestaurant?.name}"`,
        [
          { text: "OK", onPress: () => router.back() }
        ]
      );

    } catch (error) {
      console.error("Error transferring device:", error);
      Alert.alert("Error", "Failed to transfer device");
    } finally {
      setTransferring(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView className="flex-1 bg-gray-50">
        <StatusBar style="dark" />
        <View className="flex-1 justify-center items-center">
          <ActivityIndicator size="large" color="#1D4ED8" />
          <Text className="mt-4 text-gray-600">Loading...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!device) {
    return (
      <SafeAreaView className="flex-1 bg-gray-50">
        <StatusBar style="dark" />
        <View className="flex-1 justify-center items-center p-4">
          <Package size={64} color="#9CA3AF" />
          <Text className="text-xl font-semibold text-gray-800 mt-4">Device Not Found</Text>
          <TouchableOpacity
            className="bg-blue-500 px-6 py-3 rounded-lg mt-6"
            onPress={() => router.back()}
          >
            <Text className="text-white font-medium">Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      <StatusBar style="dark" />

      {/* Header */}
      <View className="px-6 py-6 bg-gradient-to-br from-orange-600 via-red-600 to-pink-700 shadow-2xl">
        <View className="flex-row justify-between items-center">
          <View className="flex-row items-center flex-1">
            <TouchableOpacity
              onPress={() => router.back()}
              className="bg-white/20 p-3 rounded-2xl mr-4 backdrop-blur-sm"
            >
              <ArrowLeft size={24} color="#ffffff" />
            </TouchableOpacity>
            <View className="flex-1">
              <Text className="text-2xl font-bold text-white">Transfer Device</Text>
              <Text className="text-orange-100 text-sm">Move device between restaurants</Text>
            </View>
          </View>
          <View className="bg-white/20 p-3 rounded-2xl backdrop-blur-sm">
            <ArrowRightLeft size={24} color="#ffffff" />
          </View>
        </View>
      </View>

      <ScrollView className="flex-1 p-6">
        {/* Device Info */}
        <View className="bg-white rounded-2xl p-6 mb-6 shadow-lg border border-gray-100">
          <View className="flex-row items-center mb-4">
            <View className="bg-blue-100 p-3 rounded-xl mr-4">
              <Package size={24} color="#3b82f6" />
            </View>
            <View className="flex-1">
              <Text className="text-xl font-bold text-gray-800">{device.name}</Text>
              <Text className="text-gray-600">{device.model || device.type}</Text>
              <Text className="text-gray-500 text-sm">S/N: {device.serial_number}</Text>
            </View>
          </View>
          
          <View className="bg-gray-50 rounded-xl p-4">
            <Text className="text-gray-600 text-sm mb-1">Current Location</Text>
            <Text className="text-gray-800 font-medium">
              {device.restaurant?.name || "Unassigned"}
            </Text>
            {device.restaurant?.address && (
              <Text className="text-gray-500 text-sm">{device.restaurant.address}</Text>
            )}
          </View>
        </View>

        {/* Restaurant Selection */}
        <View className="bg-white rounded-2xl p-6 mb-6 shadow-lg border border-gray-100">
          <Text className="text-lg font-bold text-gray-800 mb-4">Select Destination</Text>
          
          {restaurants.map((restaurant) => (
            <TouchableOpacity
              key={restaurant.id}
              className={`p-4 rounded-xl mb-3 border-2 ${
                selectedRestaurant === restaurant.id
                  ? "border-orange-500 bg-orange-50"
                  : restaurant.id === device.restaurant_id
                  ? "border-gray-200 bg-gray-100"
                  : "border-gray-200 bg-white"
              }`}
              onPress={() => {
                if (restaurant.id !== device.restaurant_id) {
                  setSelectedRestaurant(restaurant.id);
                }
              }}
              disabled={restaurant.id === device.restaurant_id}
            >
              <View className="flex-row items-center">
                <View className={`p-2 rounded-lg mr-3 ${
                  restaurant.id === device.restaurant_id ? "bg-gray-300" : "bg-blue-100"
                }`}>
                  <Building2 size={20} color={restaurant.id === device.restaurant_id ? "#6b7280" : "#3b82f6"} />
                </View>
                <View className="flex-1">
                  <Text className={`font-medium ${
                    restaurant.id === device.restaurant_id ? "text-gray-500" : "text-gray-800"
                  }`}>
                    {restaurant.name}
                    {restaurant.id === device.restaurant_id && " (Current)"}
                  </Text>
                  {restaurant.address && (
                    <Text className="text-gray-500 text-sm">{restaurant.address}</Text>
                  )}
                </View>
                {selectedRestaurant === restaurant.id && (
                  <CheckCircle size={20} color="#f97316" />
                )}
              </View>
            </TouchableOpacity>
          ))}
        </View>

        {/* Transfer Button */}
        <TouchableOpacity
          className={`rounded-2xl p-4 flex-row items-center justify-center ${
            selectedRestaurant && selectedRestaurant !== device.restaurant_id
              ? "bg-orange-500"
              : "bg-gray-300"
          }`}
          onPress={handleTransfer}
          disabled={!selectedRestaurant || selectedRestaurant === device.restaurant_id || transferring}
        >
          {transferring ? (
            <ActivityIndicator size="small" color="#ffffff" />
          ) : (
            <>
              <ArrowRightLeft size={20} color="#ffffff" />
              <Text className="text-white font-bold text-lg ml-2">Transfer Device</Text>
            </>
          )}
        </TouchableOpacity>

        {/* Transfer History Button */}
        <TouchableOpacity
          className="bg-gray-100 rounded-2xl p-4 flex-row items-center justify-center mt-4"
          onPress={() => router.push(`/devices/transfer-history/${device.id}`)}
        >
          <History size={20} color="#6b7280" />
          <Text className="text-gray-700 font-medium ml-2">View Transfer History</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}
