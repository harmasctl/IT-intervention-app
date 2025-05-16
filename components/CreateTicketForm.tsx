import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from "react-native";
import {
  Camera,
  ChevronRight,
  AlertCircle,
  Upload,
  Check,
} from "lucide-react-native";
import * as Haptics from "expo-haptics";
import { supabase } from "../lib/supabase";
import { Image } from "expo-image";
import { Database } from "../lib/database.types";

interface DeviceOption {
  id: string;
  name: string;
  type: string;
}

interface RestaurantOption {
  id: string;
  name: string;
  location: string;
}

interface CreateTicketFormProps {
  onSubmit?: (ticketData: TicketData) => void;
  onCancel?: () => void;
}

interface TicketData {
  title: string;
  device: DeviceOption | null;
  diagnosticInfo: string;
  restaurant: RestaurantOption | null;
  priority: "low" | "medium" | "high";
  photos: string[];
  jiraTicketId: string;
}

const CreateTicketForm = ({ onSubmit, onCancel }: CreateTicketFormProps) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [ticketData, setTicketData] = useState<TicketData>({
    title: "",
    device: null,
    diagnosticInfo: "",
    restaurant: null,
    priority: "medium",
    photos: [],
    jiraTicketId: "",
  });

  const [deviceSearchQuery, setDeviceSearchQuery] = useState("");
  const [restaurantSearchQuery, setRestaurantSearchQuery] = useState("");
  const [devices, setDevices] = useState<DeviceOption[]>([]);
  const [restaurants, setRestaurants] = useState<RestaurantOption[]>([]);
  const [loading, setLoading] = useState({
    devices: false,
    restaurants: false,
  });

  // Fetch devices and restaurants from Supabase
  useEffect(() => {
    fetchDevices();
    fetchRestaurants();
  }, []);

  const fetchDevices = async () => {
    try {
      setLoading((prev) => ({ ...prev, devices: true }));
      const { data, error } = await supabase
        .from("devices")
        .select("id, name, type, serial_number, status");

      if (error) throw error;

      if (data) {
        const formattedDevices = data.map((device) => ({
          id: device.id,
          name: device.name,
          type: device.type || "Unknown Type",
        }));
        setDevices(formattedDevices);
      }
    } catch (error) {
      console.error("Error fetching devices:", error);
      Alert.alert("Error", "Failed to load devices. Please try again.");
    } finally {
      setLoading((prev) => ({ ...prev, devices: false }));
    }
  };

  const fetchRestaurants = async () => {
    try {
      setLoading((prev) => ({ ...prev, restaurants: true }));
      const { data, error } = await supabase
        .from("restaurants")
        .select("id, name, location");

      if (error) throw error;

      if (data) {
        const formattedRestaurants = data.map((restaurant) => ({
          id: restaurant.id,
          name: restaurant.name,
          location: restaurant.location || "Unknown Location",
        }));
        setRestaurants(formattedRestaurants);
      }
    } catch (error) {
      console.error("Error fetching restaurants:", error);
      Alert.alert("Error", "Failed to load restaurants. Please try again.");
    } finally {
      setLoading((prev) => ({ ...prev, restaurants: false }));
    }
  };

  const handleSubmit = async () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    if (onSubmit) {
      onSubmit(ticketData);
    }
  };

  const updateTicketData = (field: keyof TicketData, value: any) => {
    setTicketData((prev) => ({ ...prev, [field]: value }));
  };

  // Function to handle photo capture (in a real app, this would use the camera)
  const addMockPhoto = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const newPhoto = `https://images.unsplash.com/photo-${Math.floor(Math.random() * 1000)}?w=300&q=80`;
    updateTicketData("photos", [...ticketData.photos, newPhoto]);
  };

  const removeMockPhoto = (index: number) => {
    const updatedPhotos = [...ticketData.photos];
    updatedPhotos.splice(index, 1);
    updateTicketData("photos", updatedPhotos);
  };

  const filteredDevices = devices.filter(
    (device) =>
      device.name.toLowerCase().includes(deviceSearchQuery.toLowerCase()) ||
      device.type.toLowerCase().includes(deviceSearchQuery.toLowerCase()),
  );

  const filteredRestaurants = restaurants.filter(
    (restaurant) =>
      restaurant.name
        .toLowerCase()
        .includes(restaurantSearchQuery.toLowerCase()) ||
      restaurant.location
        .toLowerCase()
        .includes(restaurantSearchQuery.toLowerCase()),
  );

  const renderStepIndicator = () => (
    <View className="flex-row justify-between mb-6 px-4">
      {[0, 1, 2, 3, 4, 5].map((step) => (
        <View
          key={step}
          className={`h-2 flex-1 mx-1 rounded-full ${currentStep >= step ? "bg-blue-500" : "bg-gray-300"} transition-all duration-300 ease-in-out`}
        />
      ))}
    </View>
  );

  const renderStepContent = () => {
    return (
      <View className="px-4 animate-fade-in">
        <Text className="text-lg font-bold mb-2">Create Support Ticket</Text>
        <Text className="text-gray-600 mb-4">
          Fill out all details to create a new support ticket
        </Text>

        {/* Ticket Title */}
        <Text className="font-semibold mb-1">Ticket Title *</Text>
        <TextInput
          className="border border-gray-300 rounded-lg p-3 mb-4 bg-white"
          placeholder="e.g., Ice Cream Machine Not Cooling"
          value={ticketData.title}
          onChangeText={(text) => updateTicketData("title", text)}
        />

        {/* Device Selection */}
        <Text className="font-semibold mb-1">Select Device *</Text>
        <TextInput
          className="border border-gray-300 rounded-lg p-3 mb-2 bg-white"
          placeholder="Search devices..."
          value={deviceSearchQuery}
          onChangeText={setDeviceSearchQuery}
        />

        {loading.devices ? (
          <View className="items-center justify-center py-2 mb-4">
            <ActivityIndicator size="small" color="#3b82f6" />
            <Text className="mt-1 text-gray-500 text-sm">
              Loading devices...
            </Text>
          </View>
        ) : (
          <ScrollView className="max-h-32 mb-4 border border-gray-200 rounded-lg">
            {filteredDevices.map((device) => (
              <TouchableOpacity
                key={device.id}
                className={`p-3 border-b border-gray-200 flex-row justify-between items-center ${ticketData.device?.id === device.id ? "bg-blue-50" : ""}`}
                onPress={() => updateTicketData("device", device)}
              >
                <View>
                  <Text className="font-semibold">{device.name}</Text>
                  <Text className="text-gray-500 text-sm">{device.type}</Text>
                </View>
                {ticketData.device?.id === device.id && (
                  <Check size={20} color="#3b82f6" />
                )}
              </TouchableOpacity>
            ))}
            {filteredDevices.length === 0 && (
              <View className="py-4 items-center">
                <Text className="text-gray-500">No devices found</Text>
              </View>
            )}
          </ScrollView>
        )}

        {/* Diagnostic Information */}
        <Text className="font-semibold mb-1">Diagnostic Information *</Text>
        <TextInput
          className="border border-gray-300 rounded-lg p-3 mb-4 bg-white h-24"
          placeholder="Describe the problem in detail..."
          multiline
          textAlignVertical="top"
          value={ticketData.diagnosticInfo}
          onChangeText={(text) => updateTicketData("diagnosticInfo", text)}
        />

        {/* Restaurant Location */}
        <Text className="font-semibold mb-1">Restaurant Location *</Text>
        <TextInput
          className="border border-gray-300 rounded-lg p-3 mb-2 bg-white"
          placeholder="Search restaurants..."
          value={restaurantSearchQuery}
          onChangeText={setRestaurantSearchQuery}
        />

        {loading.restaurants ? (
          <View className="items-center justify-center py-2 mb-4">
            <ActivityIndicator size="small" color="#3b82f6" />
            <Text className="mt-1 text-gray-500 text-sm">
              Loading restaurants...
            </Text>
          </View>
        ) : (
          <ScrollView className="max-h-32 mb-4 border border-gray-200 rounded-lg">
            {filteredRestaurants.map((restaurant) => (
              <TouchableOpacity
                key={restaurant.id}
                className={`p-3 border-b border-gray-200 flex-row justify-between items-center ${ticketData.restaurant?.id === restaurant.id ? "bg-blue-50" : ""}`}
                onPress={() => updateTicketData("restaurant", restaurant)}
              >
                <View>
                  <Text className="font-semibold">{restaurant.name}</Text>
                  <Text className="text-gray-500 text-sm">
                    {restaurant.location}
                  </Text>
                </View>
                {ticketData.restaurant?.id === restaurant.id && (
                  <Check size={20} color="#3b82f6" />
                )}
              </TouchableOpacity>
            ))}
            {filteredRestaurants.length === 0 && (
              <View className="py-4 items-center">
                <Text className="text-gray-500">No restaurants found</Text>
              </View>
            )}
          </ScrollView>
        )}

        {/* Jira Integration */}
        <Text className="font-semibold mb-1">Jira Ticket ID (Optional)</Text>
        <TextInput
          className="border border-gray-300 rounded-lg p-3 mb-4 bg-white"
          placeholder="e.g., TECH-123"
          value={ticketData.jiraTicketId}
          onChangeText={(text) => updateTicketData("jiraTicketId", text)}
        />

        {/* Priority Level */}
        <Text className="font-semibold mb-1">Priority Level *</Text>
        <View className="flex-row mb-4">
          {(["low", "medium", "high"] as const).map((priority) => (
            <TouchableOpacity
              key={priority}
              className={`flex-1 py-2 mx-1 rounded-lg ${
                ticketData.priority === priority
                  ? priority === "low"
                    ? "bg-green-500"
                    : priority === "medium"
                      ? "bg-yellow-500"
                      : "bg-red-500"
                  : "bg-gray-200"
              }`}
              onPress={() => updateTicketData("priority", priority)}
            >
              <Text
                className={`text-center font-semibold ${ticketData.priority === priority ? "text-white" : "text-gray-700"}`}
              >
                {priority.charAt(0).toUpperCase() + priority.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Photos */}
        <Text className="font-semibold mb-1">Photos (Optional)</Text>
        <View className="flex-row flex-wrap mb-4">
          {ticketData.photos.map((photo, index) => (
            <View key={index} className="w-1/3 p-1 relative">
              <Image
                source={{ uri: photo }}
                className="w-full h-24 rounded-lg"
              />
              <TouchableOpacity
                className="absolute top-2 right-2 bg-red-500 rounded-full w-6 h-6 items-center justify-center"
                onPress={() => removeMockPhoto(index)}
              >
                <Text className="text-white font-bold">×</Text>
              </TouchableOpacity>
            </View>
          ))}
          <TouchableOpacity className="w-1/3 p-1" onPress={addMockPhoto}>
            <View className="w-full h-24 border-2 border-dashed border-gray-300 rounded-lg items-center justify-center bg-gray-50">
              <Camera size={24} color="#9ca3af" />
              <Text className="text-gray-400 mt-1">Add Photo</Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* Submit Button */}
        <TouchableOpacity
          className={`py-3 px-4 rounded-lg ${ticketData.title.trim() && ticketData.device && ticketData.diagnosticInfo.trim() && ticketData.restaurant ? "bg-blue-500" : "bg-gray-300"} ${ticketData.title.trim() && ticketData.device && ticketData.diagnosticInfo.trim() && ticketData.restaurant ? "animate-pulse" : ""}`}
          onPress={handleSubmit}
          disabled={
            !ticketData.title.trim() ||
            !ticketData.device ||
            !ticketData.diagnosticInfo.trim() ||
            !ticketData.restaurant
          }
        >
          <Text className="text-white text-center font-semibold">
            Submit Ticket
          </Text>
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <ScrollView className="flex-1 bg-white">
      <View className="pt-4 pb-8 animate-fade-in">
        {renderStepIndicator()}
        {renderStepContent()}
      </View>
    </ScrollView>
  );
};

export default CreateTicketForm;
