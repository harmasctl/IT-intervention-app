import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Image,
  FlatList,
  RefreshControl,
  TextInput,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { useRouter } from "expo-router";
import {
  ArrowLeft,
  Map,
  MapPin,
  Package,
  Filter,
  CheckCircle,
  AlertCircle,
  Clock,
  Laptop,
  Printer,
  Smartphone,
  Wifi,
  Server,
  Search,
  X,
} from "lucide-react-native";
import { supabase } from "../../lib/supabase";

// Define types for our data
interface Restaurant {
  id: string;
  name: string;
  address: string;
  location: {
    latitude: number;
    longitude: number;
  } | null;
  image_url: string | null;
  devices?: Device[];
}

interface Device {
  id: string;
  name: string;
  type: string;
  model: string;
  status: "operational" | "maintenance" | "offline";
  restaurant_id: string;
  image_url: string | null;
  category_id: string | null;
  category_name?: string;
}

interface Category {
  id: string;
  name: string;
  description?: string;
}

// Device type icons mapping
const deviceIcons: Record<string, React.ReactNode> = {
  pos: <Laptop size={16} color="#4B5563" />,
  printer: <Printer size={16} color="#4B5563" />,
  mobile: <Smartphone size={16} color="#4B5563" />,
  router: <Wifi size={16} color="#4B5563" />,
  server: <Server size={16} color="#4B5563" />,
  other: <Package size={16} color="#4B5563" />,
};

// Status icons mapping
const statusIcons: Record<string, React.ReactNode> = {
  operational: <CheckCircle size={16} color="#10B981" />,
  maintenance: <Clock size={16} color="#F59E0B" />,
  offline: <AlertCircle size={16} color="#EF4444" />,
};

export default function RestaurantDeviceMap() {
  const router = useRouter();
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [expandedRestaurant, setExpandedRestaurant] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [filteredRestaurants, setFilteredRestaurants] = useState<Restaurant[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);

  // Fetch restaurants and their devices
  useEffect(() => {
    fetchRestaurantsAndDevices();
    fetchCategories();
  }, []);

  // Apply search and filters
  useEffect(() => {
    if (restaurants.length > 0) {
      let filtered = [...restaurants];

      // Apply search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        filtered = filtered.filter(restaurant =>
          restaurant.name.toLowerCase().includes(query) ||
          restaurant.address?.toLowerCase().includes(query) ||
          restaurant.devices?.some(device =>
            device.name.toLowerCase().includes(query) ||
            device.model.toLowerCase().includes(query) ||
            device.type.toLowerCase().includes(query) ||
            device.category_name?.toLowerCase().includes(query)
          )
        );
      }

      setFilteredRestaurants(filtered);
    } else {
      setFilteredRestaurants([]);
    }
  }, [searchQuery, restaurants]);

  const fetchRestaurantsAndDevices = async () => {
    try {
      setLoading(true);
      console.log("Fetching restaurants...");

      // First fetch restaurants
      const { data: restaurantsData, error: restaurantsError } = await supabase
        .from("restaurants")
        .select("*")
        .order("name");

      if (restaurantsError) {
        throw restaurantsError;
      }

      console.log(`Fetched ${restaurantsData?.length || 0} restaurants`);

      // Then fetch all devices
      const { data: devicesData, error: devicesError } = await supabase
        .from("devices")
        .select("*, device_categories(id, name)")
        .order("name");

      if (devicesError) {
        throw devicesError;
      }

      console.log(`Fetched ${devicesData?.length || 0} devices`);

      // Map devices to their restaurants
      const restaurantsWithDevices = restaurantsData?.map(restaurant => {
        const restaurantDevices = devicesData?.filter(
          device => device.restaurant_id === restaurant.id
        ).map(device => ({
          ...device,
          category_name: device.device_categories?.name
        }));

        return {
          ...restaurant,
          devices: restaurantDevices || []
        };
      });

      setRestaurants(restaurantsWithDevices || []);
      setFilteredRestaurants(restaurantsWithDevices || []);
    } catch (err) {
      console.error("Error fetching data:", err);
      setError("Failed to load restaurants and devices");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

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

  // Handle pull-to-refresh
  const handleRefresh = () => {
    setRefreshing(true);
    fetchRestaurantsAndDevices();
    fetchCategories();
  };

  // Filter devices by category
  const filterDevicesByCategory = (devices: Device[] | undefined) => {
    if (!devices) return [];

    let filtered = [...devices];

    if (selectedCategory) {
      filtered = filtered.filter(device => device.category_id === selectedCategory);
    }

    return filtered;
  };

  // Get device icon based on type
  const getDeviceIcon = (type: string) => {
    return deviceIcons[type] || deviceIcons.other;
  };

  // Get status icon based on status
  const getStatusIcon = (status: string) => {
    return statusIcons[status] || statusIcons.offline;
  };

  // Toggle restaurant expansion
  const toggleRestaurantExpansion = (id: string) => {
    setExpandedRestaurant(expandedRestaurant === id ? null : id);
  };

  // Calculate overall device statistics
  const calculateDeviceStats = () => {
    let totalDevices = 0;
    let operational = 0;
    let maintenance = 0;
    let offline = 0;

    restaurants.forEach(restaurant => {
      if (restaurant.devices) {
        // Apply category filter if selected
        let filteredDevices = restaurant.devices;
        if (selectedCategory) {
          filteredDevices = filteredDevices.filter(d => d.category_id === selectedCategory);
        }

        totalDevices += filteredDevices.length;
        operational += filteredDevices.filter(d => d.status === 'operational').length;
        maintenance += filteredDevices.filter(d => d.status === 'maintenance').length;
        offline += filteredDevices.filter(d => d.status === 'offline').length;
      }
    });

    return { totalDevices, operational, maintenance, offline };
  };

  const stats = calculateDeviceStats();

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      <StatusBar style="dark" />

      <View className="flex-row justify-between items-center p-4 border-b border-gray-200 bg-white">
        <View className="flex-row items-center">
          <TouchableOpacity onPress={() => router.back()} className="mr-4">
            <ArrowLeft size={24} color="#0F172A" />
          </TouchableOpacity>
          <Text className="text-xl font-bold text-gray-800">Restaurant Device Map</Text>
        </View>
        <Map size={24} color="#0F172A" />
      </View>

      {loading && !refreshing ? (
        <View className="flex-1 justify-center items-center">
          <ActivityIndicator size="large" color="#0F172A" />
          <Text className="mt-4 text-gray-600">Loading restaurants and devices...</Text>
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
        <>
          {/* Search Bar */}
          <View className="p-4 bg-white border-b border-gray-200">
            <View className="flex-row items-center bg-gray-100 rounded-lg px-3 py-2">
              <Search size={18} color="#6B7280" />
              <TextInput
                className="flex-1 ml-2 text-gray-800"
                placeholder="Search restaurants or devices..."
                value={searchQuery}
                onChangeText={setSearchQuery}
              />
              {searchQuery ? (
                <TouchableOpacity onPress={() => setSearchQuery("")}>
                  <X size={18} color="#6B7280" />
                </TouchableOpacity>
              ) : null}
            </View>
          </View>

          {/* Summary Dashboard */}
          <View className="p-4 bg-white border-b border-gray-200">
            <Text className="text-lg font-bold mb-3 text-gray-800">Device Overview</Text>

            <View className="flex-row justify-between mb-4">
              <View className="bg-blue-50 rounded-lg p-3 flex-1 mr-2">
                <Text className="text-sm text-gray-500 mb-1">Total Devices</Text>
                <Text className="text-2xl font-bold text-blue-700">{stats.totalDevices}</Text>
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
          </View>

          {/* Category Filters */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} className="p-2 bg-white border-b border-gray-200">
            <TouchableOpacity
              className={`px-4 py-2 rounded-full mr-2 ${selectedCategory === null ? 'bg-blue-500' : 'bg-gray-200'}`}
              onPress={() => setSelectedCategory(null)}
            >
              <Text className={`${selectedCategory === null ? 'text-white' : 'text-gray-800'}`}>All Categories</Text>
            </TouchableOpacity>

            {categories.map(category => (
              <TouchableOpacity
                key={category.id}
                className={`px-4 py-2 rounded-full mr-2 ${selectedCategory === category.id ? 'bg-blue-500' : 'bg-gray-200'}`}
                onPress={() => setSelectedCategory(category.id)}
              >
                <Text className={`${selectedCategory === category.id ? 'text-white' : 'text-gray-800'}`}>
                  {category.name}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          <FlatList
            data={filteredRestaurants}
            keyExtractor={(item) => item.id}
            contentContainerStyle={{ padding: 16 }}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
            }
            ListHeaderComponent={
              <Text className="text-lg font-bold mb-4">
                Restaurants ({filteredRestaurants.length})
                {selectedCategory && ` • Category: ${categories.find(c => c.id === selectedCategory)?.name || ''}`}
                {searchQuery && ` • Search: "${searchQuery}"`}
              </Text>
            }
            ListEmptyComponent={
              <View className="bg-white p-4 rounded-lg shadow-sm">
                <Text className="text-gray-500 text-center">
                  {searchQuery
                    ? "No restaurants or devices match your search"
                    : "No restaurants found"}
                </Text>
              </View>
            }
            renderItem={({ item: restaurant }) => {
              const filteredDevices = filterDevicesByCategory(restaurant.devices);
              const deviceCount = filteredDevices.length;

              // Skip restaurants with no matching devices
              if (deviceCount === 0 && selectedCategory) {
                return null;
              }

              return (
                <View className="bg-white p-4 rounded-lg shadow-sm mb-4">
                  <TouchableOpacity
                    className="flex-row justify-between items-center"
                    onPress={() => toggleRestaurantExpansion(restaurant.id)}
                  >
                    <View>
                      <Text className="font-bold text-lg">{restaurant.name}</Text>
                      <Text className="text-gray-500">
                        {deviceCount} {deviceCount === 1 ? 'device' : 'devices'}
                        {selectedCategory && ` (${categories.find(c => c.id === selectedCategory)?.name || ''})`}
                      </Text>
                    </View>
                    <View className="bg-gray-100 px-3 py-1 rounded-full">
                      <Text className="text-gray-700 font-medium">{deviceCount}</Text>
                    </View>
                  </TouchableOpacity>

                  {restaurant.address && (
                    <View className="flex-row items-center mt-2">
                      <MapPin size={16} color="#6B7280" />
                      <Text className="ml-2 text-gray-600">{restaurant.address}</Text>
                    </View>
                  )}

                  {expandedRestaurant === restaurant.id && deviceCount > 0 && (
                    <View className="mt-4 border-t border-gray-100 pt-4">
                      <Text className="font-medium text-gray-700 mb-2">Devices:</Text>
                      {filteredDevices.map(device => (
                        <TouchableOpacity
                          key={device.id}
                          className="flex-row justify-between items-center p-3 bg-gray-50 rounded-lg mb-2"
                          onPress={() => router.push(`/devices/${device.id}`)}
                        >
                          <View className="flex-row items-center">
                            <View className="bg-gray-200 p-2 rounded-full mr-3">
                              {getDeviceIcon(device.type)}
                            </View>
                            <View>
                              <Text className="font-medium">{device.name}</Text>
                              <View className="flex-row">
                                <Text className="text-gray-500 text-xs">{device.model}</Text>
                                {device.category_name && (
                                  <Text className="text-blue-500 text-xs ml-2">
                                    {device.category_name}
                                  </Text>
                                )}
                              </View>
                            </View>
                          </View>
                          <View className="flex-row items-center">
                            {getStatusIcon(device.status)}
                            <Text className="ml-1 text-xs text-gray-600">
                              {device.status.charAt(0).toUpperCase() + device.status.slice(1)}
                            </Text>
                          </View>
                        </TouchableOpacity>
                      ))}
                    </View>
                  )}

                  {expandedRestaurant === restaurant.id && deviceCount === 0 && (
                    <View className="mt-4 border-t border-gray-100 pt-4">
                      <Text className="text-gray-500 text-center">No devices found</Text>
                    </View>
                  )}
                </View>
              );
            }}
          />
        </>
      )}
    </SafeAreaView>
  );
}