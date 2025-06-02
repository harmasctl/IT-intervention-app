import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  TextInput,
} from "react-native";
import {
  Smartphone,
  Monitor,
  Printer,
  Wifi,
  HardDrive,
  Camera,
  Speaker,
  Router,
  Server,
  Tablet,
  Laptop,
  Desktop,
  Phone,
  Headphones,
  Keyboard,
  Mouse,
  Microphone,
  Webcam,
  Package,
  Search,
  MapPin,
  Check,
  AlertTriangle,
} from "lucide-react-native";
import { supabase } from "../lib/supabase";

interface Device {
  id: string;
  name: string;
  type: string;
  serial_number?: string;
  status: string;
  location_in_restaurant?: string;
  restaurant: {
    id: string;
    name: string;
    location?: string;
  };
  category?: {
    name: string;
    color: string;
  };
}

interface RestaurantDeviceListProps {
  restaurantId?: string;
  onDeviceSelect?: (device: Device) => void;
  selectedDeviceId?: string;
  showAllRestaurants?: boolean;
}

const RestaurantDeviceList = ({
  restaurantId,
  onDeviceSelect,
  selectedDeviceId,
  showAllRestaurants = false,
}: RestaurantDeviceListProps) => {
  const [devices, setDevices] = useState<Device[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedRestaurant, setSelectedRestaurant] = useState<string | null>(restaurantId || null);
  const [restaurants, setRestaurants] = useState<any[]>([]);

  useEffect(() => {
    if (showAllRestaurants) {
      fetchRestaurants();
    }
    fetchDevices();
  }, [restaurantId, selectedRestaurant]);

  const fetchRestaurants = async () => {
    try {
      const { data, error } = await supabase
        .from("restaurants")
        .select("id, name, location")
        .order("name");

      if (error) {
        console.error("Error fetching restaurants:", error);
        return;
      }

      setRestaurants(data || []);
    } catch (error) {
      console.error("Error fetching restaurants:", error);
    }
  };

  const fetchDevices = async () => {
    try {
      setLoading(true);

      let query = supabase
        .from("devices")
        .select(`
          id,
          name,
          type,
          serial_number,
          status,
          location_in_restaurant,
          restaurant:restaurants(id, name, location),
          category:device_categories(name, color)
        `);

      // Filter by restaurant if specified
      if (selectedRestaurant || restaurantId) {
        query = query.eq("restaurant_id", selectedRestaurant || restaurantId);
      }

      const { data, error } = await query.order("name");

      if (error) {
        console.error("Error fetching devices:", error);
        Alert.alert("Error", "Failed to fetch devices");
        return;
      }

      setDevices(data || []);
    } catch (error) {
      console.error("Error fetching devices:", error);
      Alert.alert("Error", "An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  };

  const getDeviceIcon = (type: string) => {
    const iconType = type.toLowerCase();
    const iconProps = { size: 20, color: "#6B7280" };

    if (iconType.includes("pos") || iconType.includes("terminal")) {
      return <Monitor {...iconProps} />;
    } else if (iconType.includes("tablet")) {
      return <Tablet {...iconProps} />;
    } else if (iconType.includes("phone") || iconType.includes("mobile")) {
      return <Smartphone {...iconProps} />;
    } else if (iconType.includes("printer")) {
      return <Printer {...iconProps} />;
    } else if (iconType.includes("router") || iconType.includes("wifi")) {
      return <Router {...iconProps} />;
    } else if (iconType.includes("camera")) {
      return <Camera {...iconProps} />;
    } else if (iconType.includes("speaker") || iconType.includes("audio")) {
      return <Speaker {...iconProps} />;
    } else if (iconType.includes("laptop")) {
      return <Laptop {...iconProps} />;
    } else if (iconType.includes("desktop")) {
      return <Desktop {...iconProps} />;
    } else if (iconType.includes("server")) {
      return <Server {...iconProps} />;
    } else if (iconType.includes("headphone")) {
      return <Headphones {...iconProps} />;
    } else if (iconType.includes("keyboard")) {
      return <Keyboard {...iconProps} />;
    } else if (iconType.includes("mouse")) {
      return <Mouse {...iconProps} />;
    } else if (iconType.includes("microphone")) {
      return <Microphone {...iconProps} />;
    } else if (iconType.includes("webcam")) {
      return <Webcam {...iconProps} />;
    } else if (iconType.includes("storage") || iconType.includes("drive")) {
      return <HardDrive {...iconProps} />;
    } else {
      return <Package {...iconProps} />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case "operational":
        return "bg-green-100 text-green-800";
      case "maintenance":
        return "bg-yellow-100 text-yellow-800";
      case "offline":
        return "bg-red-100 text-red-800";
      case "retired":
        return "bg-gray-100 text-gray-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const filteredDevices = devices.filter((device) =>
    device.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    device.type.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (device.serial_number && device.serial_number.toLowerCase().includes(searchQuery.toLowerCase())) ||
    (device.location_in_restaurant && device.location_in_restaurant.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  if (loading) {
    return (
      <View className="flex-1 justify-center items-center py-8">
        <ActivityIndicator size="large" color="#3B82F6" />
        <Text className="text-gray-500 mt-2">Loading devices...</Text>
      </View>
    );
  }

  return (
    <View className="flex-1">
      {/* Restaurant Selector */}
      {showAllRestaurants && (
        <View className="mb-4">
          <Text className="text-sm font-medium text-gray-700 mb-2">Select Restaurant</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-4">
            <TouchableOpacity
              className={`px-4 py-2 rounded-lg mr-2 ${
                selectedRestaurant === null ? "bg-blue-500" : "bg-gray-200"
              }`}
              onPress={() => setSelectedRestaurant(null)}
            >
              <Text className={`font-medium ${
                selectedRestaurant === null ? "text-white" : "text-gray-700"
              }`}>
                All Restaurants
              </Text>
            </TouchableOpacity>
            {restaurants.map((restaurant) => (
              <TouchableOpacity
                key={restaurant.id}
                className={`px-4 py-2 rounded-lg mr-2 ${
                  selectedRestaurant === restaurant.id ? "bg-blue-500" : "bg-gray-200"
                }`}
                onPress={() => setSelectedRestaurant(restaurant.id)}
              >
                <Text className={`font-medium ${
                  selectedRestaurant === restaurant.id ? "text-white" : "text-gray-700"
                }`}>
                  {restaurant.name}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}

      {/* Search Bar */}
      <View className="flex-row items-center bg-gray-100 rounded-lg p-3 mb-4">
        <Search size={20} color="#6B7280" />
        <TextInput
          className="flex-1 ml-3 text-base"
          placeholder="Search devices..."
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      {/* Device Count */}
      <View className="flex-row items-center justify-between mb-4">
        <Text className="text-sm text-gray-600">
          {filteredDevices.length} device{filteredDevices.length !== 1 ? 's' : ''} found
          {selectedRestaurant && restaurants.find(r => r.id === selectedRestaurant) && (
            <Text className="font-medium">
              {' '}at {restaurants.find(r => r.id === selectedRestaurant)?.name}
            </Text>
          )}
        </Text>
        <TouchableOpacity
          className="bg-blue-50 px-3 py-1 rounded-lg"
          onPress={fetchDevices}
        >
          <Text className="text-blue-600 text-sm font-medium">Refresh</Text>
        </TouchableOpacity>
      </View>

      {/* Device List */}
      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        {filteredDevices.length === 0 ? (
          <View className="flex-1 justify-center items-center py-12">
            <Package size={48} color="#9CA3AF" />
            <Text className="text-gray-500 text-lg mt-4">No devices found</Text>
            <Text className="text-gray-400 text-center mt-2 px-8">
              {searchQuery 
                ? "Try adjusting your search terms"
                : selectedRestaurant 
                  ? "This restaurant has no devices registered"
                  : "No devices are currently registered in the system"
              }
            </Text>
          </View>
        ) : (
          filteredDevices.map((device) => (
            <TouchableOpacity
              key={device.id}
              className={`bg-white rounded-lg p-4 mb-3 shadow-sm border ${
                selectedDeviceId === device.id
                  ? "border-blue-300 bg-blue-50"
                  : "border-gray-200"
              }`}
              onPress={() => onDeviceSelect && onDeviceSelect(device)}
            >
              <View className="flex-row items-start justify-between">
                <View className="flex-row items-start flex-1">
                  <View className="mr-3 mt-1">
                    {getDeviceIcon(device.type)}
                  </View>
                  <View className="flex-1">
                    <View className="flex-row items-center justify-between mb-1">
                      <Text className="font-bold text-gray-800 flex-1" numberOfLines={1}>
                        {device.name}
                      </Text>
                      {selectedDeviceId === device.id && (
                        <Check size={20} color="#3B82F6" />
                      )}
                    </View>
                    
                    <Text className="text-gray-600 text-sm mb-1">{device.type}</Text>
                    
                    {device.serial_number && (
                      <Text className="text-gray-500 text-xs mb-1">
                        S/N: {device.serial_number}
                      </Text>
                    )}
                    
                    {device.location_in_restaurant && (
                      <View className="flex-row items-center mb-1">
                        <MapPin size={12} color="#6B7280" />
                        <Text className="text-gray-500 text-xs ml-1">
                          {device.location_in_restaurant}
                        </Text>
                      </View>
                    )}
                    
                    {!showAllRestaurants && device.restaurant && (
                      <View className="flex-row items-center mb-2">
                        <MapPin size={12} color="#6B7280" />
                        <Text className="text-gray-500 text-xs ml-1">
                          {device.restaurant.name}
                        </Text>
                      </View>
                    )}
                    
                    <View className="flex-row items-center justify-between">
                      <View className={`px-2 py-1 rounded-full ${getStatusColor(device.status)}`}>
                        <Text className="text-xs font-medium">
                          {device.status?.toUpperCase() || 'UNKNOWN'}
                        </Text>
                      </View>
                      
                      {device.category && (
                        <View 
                          className="px-2 py-1 rounded-full"
                          style={{ backgroundColor: device.category.color + '20' }}
                        >
                          <Text 
                            className="text-xs font-medium"
                            style={{ color: device.category.color }}
                          >
                            {device.category.name}
                          </Text>
                        </View>
                      )}
                    </View>
                  </View>
                </View>
              </View>
            </TouchableOpacity>
          ))
        )}
      </ScrollView>
    </View>
  );
};

export default RestaurantDeviceList;
