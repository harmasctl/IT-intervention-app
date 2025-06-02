import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  TextInput,
  ScrollView,
  RefreshControl,
  Alert,
  Image,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { useRouter, useFocusEffect } from "expo-router";
import {
  Search,
  Plus,
  Filter,
  QrCode,
  ChevronRight,
  CircleDot,
  CheckCircle2,
  AlertCircle,
  Building2,
  Package,
  ChevronDown,
  X,
  Wrench,
  Calendar,
  FileText,
  BarChart3,
  Download,
  ArrowLeft,
  RefreshCw,
} from "lucide-react-native";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../../components/AuthProvider";
import { formatDistanceToNow } from "date-fns";

// Define types for devices including custom_fields
type DeviceCategory = {
  id: string;
  name: string;
  icon?: string;
  color?: string;
  maintenance_interval?: number;
};

type Device = {
  id: string;
  name: string;
  serial_number: string;
  type: string;
  model?: string;
  status: "operational" | "maintenance" | "offline";
  restaurant_id: string;
  restaurant?: {
    name: string;
  };
  category_id?: string;
  category?: DeviceCategory;
  last_maintenance?: string;
  warranty_expiry?: string;
  purchase_date?: string;
  qr_code?: string;
  custom_fields?: Record<string, any>;
  image?: string;
  created_at: string;
};

export default function DevicesScreen() {
  const router = useRouter();
  const { session } = useAuth();
  const [devices, setDevices] = useState<Device[]>([]);
  const [filteredDevices, setFilteredDevices] = useState<Device[]>([]);
  const [restaurants, setRestaurants] = useState<{ id: string; name: string }[]>([]);
  const [categories, setCategories] = useState<DeviceCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string | null>(null);
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);
  const [restaurantFilter, setRestaurantFilter] = useState<string | null>(null);
  const [maintenanceFilter, setMaintenanceFilter] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<string>("name");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");

  // Load devices on mount
  useEffect(() => {
    fetchDevices();
    fetchRestaurants();
    fetchCategories();
  }, []);

  // Refresh devices when screen comes into focus (with throttling)
  useFocusEffect(
    useCallback(() => {
      const now = Date.now();
      const lastRefresh = sessionStorage.getItem('lastDevicesRefresh');

      // Only refresh if more than 5 seconds have passed since last refresh
      if (!lastRefresh || now - parseInt(lastRefresh) > 5000) {
        console.log("Devices screen focused - refreshing data...");
        fetchDevices();
        sessionStorage.setItem('lastDevicesRefresh', now.toString());
      } else {
        console.log("Skipping refresh - too recent");
      }
    }, [])
  );

  // Set up real-time subscription for devices (with error handling)
  useEffect(() => {
    let subscription: any = null;
    let isSubscribed = true;

    const setupSubscription = async () => {
      try {
        console.log("🔄 Setting up real-time subscription for devices...");

        subscription = supabase
          .channel('devices-changes-' + Date.now()) // Unique channel name
          .on(
            'postgres_changes',
            {
              event: '*',
              schema: 'public',
              table: 'devices'
            },
            (payload) => {
              if (!isSubscribed) return; // Prevent updates after unmount

              console.log('📡 Real-time device change detected:', payload.eventType);

              // Throttle real-time updates
              setTimeout(() => {
                if (isSubscribed) {
                  fetchDevices();
                }
              }, 1000);
            }
          )
          .subscribe((status) => {
            console.log('Subscription status:', status);
          });
      } catch (error) {
        console.error('Error setting up subscription:', error);
      }
    };

    setupSubscription();

    // Cleanup subscription on unmount
    return () => {
      isSubscribed = false;
      if (subscription) {
        console.log("🔄 Cleaning up real-time subscription...");
        subscription.unsubscribe();
      }
    };
  }, []);

  // Apply filters
  useEffect(() => {
    if (devices.length > 0) {
      let filtered = [...devices];

      // Apply search query
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        filtered = filtered.filter(
          (device) =>
            device.name.toLowerCase().includes(query) ||
            device.serial_number.toLowerCase().includes(query) ||
            device.type.toLowerCase().includes(query) ||
            device.model?.toLowerCase().includes(query) ||
            device.restaurant?.name.toLowerCase().includes(query)
        );
      }

      // Apply status filter
      if (statusFilter) {
        filtered = filtered.filter((device) => device.status === statusFilter);
      }

      // Apply category filter
      if (categoryFilter) {
        filtered = filtered.filter((device) => device.category_id === categoryFilter);
      }

      // Apply restaurant filter
      if (restaurantFilter) {
        filtered = filtered.filter((device) => device.restaurant_id === restaurantFilter);
      }

      // Apply maintenance filter
      if (maintenanceFilter === "due") {
        const now = new Date();
        filtered = filtered.filter((device) => {
          if (!device.last_maintenance || !device.category?.maintenance_interval) return false;
          const lastMaint = new Date(device.last_maintenance);
          const interval = device.category.maintenance_interval || 90; // Default to 90 days
          const nextMaint = new Date(lastMaint);
          nextMaint.setDate(nextMaint.getDate() + interval);
          return nextMaint <= now;
        });
      } else if (maintenanceFilter === "upcoming") {
        const now = new Date();
        const thirtyDaysFromNow = new Date(now);
        thirtyDaysFromNow.setDate(now.getDate() + 30);

        filtered = filtered.filter((device) => {
          if (!device.last_maintenance || !device.category?.maintenance_interval) return false;
          const lastMaint = new Date(device.last_maintenance);
          const interval = device.category.maintenance_interval || 90;
          const nextMaint = new Date(lastMaint);
          nextMaint.setDate(nextMaint.getDate() + interval);
          return nextMaint > now && nextMaint <= thirtyDaysFromNow;
        });
      }

      // Apply sorting
      filtered.sort((a, b) => {
        let comparison = 0;

        switch (sortBy) {
          case "name":
            comparison = a.name.localeCompare(b.name);
            break;
          case "status":
            comparison = a.status.localeCompare(b.status);
            break;
          case "lastMaintenance":
            if (!a.last_maintenance && !b.last_maintenance) comparison = 0;
            else if (!a.last_maintenance) comparison = 1;
            else if (!b.last_maintenance) comparison = -1;
            else comparison = new Date(a.last_maintenance).getTime() - new Date(b.last_maintenance).getTime();
            break;
          case "restaurant":
            comparison = (a.restaurant?.name || "").localeCompare(b.restaurant?.name || "");
            break;
          default:
            comparison = 0;
        }

        return sortOrder === "asc" ? comparison : -comparison;
      });

      setFilteredDevices(filtered);
    }
  }, [devices, searchQuery, statusFilter, categoryFilter, restaurantFilter, maintenanceFilter, sortBy, sortOrder]);

  const fetchDevices = async (showSuccessMessage = false) => {
    try {
      // Prevent multiple simultaneous requests
      if (loading && !refreshing) {
        console.log("Skipping fetch - already loading");
        return;
      }

      if (!refreshing) setLoading(true);

      // Add timeout to prevent hanging requests
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

      const { data, error } = await supabase
        .from("devices")
        .select(`
          *,
          restaurant:restaurants(name),
          category:device_categories(id, name, icon, color, maintenance_interval)
        `)
        .order("created_at", { ascending: false })
        .abortSignal(controller.signal);

      clearTimeout(timeoutId);

      if (error) {
        console.error("Error fetching devices:", error);
        if (error.message.includes('aborted')) {
          Alert.alert("⏱️ Timeout", "Request took too long. Please check your connection.");
        } else {
          Alert.alert("❌ Error", "Failed to load devices. Please try again.");
        }
        return;
      }

      const deviceCount = data?.length || 0;
      setDevices(data || []);

      // Show success message if requested
      if (showSuccessMessage && deviceCount > 0) {
        console.log(`✅ Loaded ${deviceCount} devices successfully`);
      }

      console.log(`📱 Devices refreshed: ${deviceCount} devices loaded`);

    } catch (error: any) {
      console.error("Exception fetching devices:", error);
      if (error.name === 'AbortError') {
        Alert.alert("⏱️ Timeout", "Request was cancelled due to timeout");
      } else {
        Alert.alert("❌ Error", "An unexpected error occurred while loading devices");
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const fetchRestaurants = async () => {
    try {
      const { data, error } = await supabase
        .from("restaurants")
        .select("id, name")
        .order("name");

      if (error) {
        console.error("Error fetching restaurants:", error);
        return;
      }

      setRestaurants(data || []);
    } catch (error) {
      console.error("Exception fetching restaurants:", error);
    }
  };

  const fetchCategories = async () => {
    try {
      const { data, error } = await supabase
        .from("device_categories")
        .select("*")
        .order("name");

      if (error) {
        console.error("Error fetching categories:", error);
        return;
      }

      setCategories(data || []);
    } catch (error) {
      console.error("Exception fetching categories:", error);
    }
  };

  const onRefresh = () => {
    console.log("🔄 Manual refresh triggered by user");
    setRefreshing(true);
    fetchDevices(true); // Show success message for manual refresh
  };

  const resetFilters = () => {
    setStatusFilter(null);
    setCategoryFilter(null);
    setRestaurantFilter(null);
    setMaintenanceFilter(null);
    setSortBy("name");
    setSortOrder("asc");
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "operational":
        return "#10B981"; // Green
      case "maintenance":
        return "#F59E0B"; // Amber
      case "offline":
        return "#EF4444"; // Red
      default:
        return "#6B7280"; // Gray
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "operational":
        return <CheckCircle2 size={16} color="#10B981" />;
      case "maintenance":
        return <Wrench size={16} color="#F59E0B" />;
      case "offline":
        return <AlertCircle size={16} color="#EF4444" />;
      default:
        return <CircleDot size={16} color="#6B7280" />;
    }
  };

  const renderDevice = ({ item }: { item: Device }) => {
    const maintenanceDue = item.last_maintenance && item.category?.maintenance_interval
      ? (() => {
          const lastMaint = new Date(item.last_maintenance);
          const interval = item.category.maintenance_interval || 90;
          const nextMaint = new Date(lastMaint);
          nextMaint.setDate(nextMaint.getDate() + interval);
          return nextMaint <= new Date();
        })()
      : false;

    return (
      <TouchableOpacity
        className="bg-white rounded-lg shadow-sm mb-3 p-4 flex-row items-center"
        onPress={() => router.navigate(`/devices/${item.id}`)}
      >
        <View className="mr-4 bg-gray-100 rounded-lg p-2">
          {item.image ? (
            <Image
              source={{ uri: item.image }}
              className="w-12 h-12 rounded"
              resizeMode="cover"
        />
      ) : (
            <Package
              size={28}
              color={item.category?.color || "#6B7280"}
            />
          )}
        </View>

        <View className="flex-1">
          <View className="flex-row justify-between items-start">
            <Text className="text-lg font-semibold text-gray-800">{item.name}</Text>
            <View className="flex-row items-center">
              {getStatusIcon(item.status)}
              <Text
                className="ml-1 text-sm"
                style={{ color: getStatusColor(item.status) }}
              >
                {item.status.charAt(0).toUpperCase() + item.status.slice(1)}
              </Text>
            </View>
          </View>

          <View className="mt-1">
            <Text className="text-gray-600 text-sm">{item.model || item.type}</Text>
            <Text className="text-gray-500 text-xs mt-1">
              {item.restaurant?.name || "Unassigned"}
            </Text>
          </View>

          {maintenanceDue && (
            <View className="mt-2 bg-amber-50 px-2 py-1 rounded-md flex-row items-center">
              <AlertCircle size={14} color="#F59E0B" />
              <Text className="text-amber-700 text-xs ml-1">Maintenance due</Text>
            </View>
          )}
        </View>
        <ChevronRight size={20} color="#9CA3AF" />
      </TouchableOpacity>
    );
  };

  const renderFilters = () => (
    <View className="bg-gray-50 rounded-lg p-4 mb-4">
      <View className="flex-row justify-between items-center mb-4">
        <Text className="text-base font-semibold text-gray-800">Filters</Text>
        <TouchableOpacity onPress={resetFilters}>
          <Text className="text-blue-600 text-sm">Reset</Text>
        </TouchableOpacity>
      </View>

      <View className="mb-3">
        <Text className="text-sm font-medium text-gray-700 mb-1">Status</Text>
        <View className="flex-row flex-wrap">
          {["operational", "maintenance", "offline"].map((status) => (
              <TouchableOpacity
              key={status}
              className={`mr-2 mb-2 px-3 py-1.5 rounded-full ${
                statusFilter === status ? "bg-blue-100 border border-blue-400" : "bg-gray-100"
              }`}
              onPress={() => setStatusFilter(statusFilter === status ? null : status)}
            >
              <Text
                className={
                  statusFilter === status ? "text-blue-800" : "text-gray-800"
                }
              >
                {status.charAt(0).toUpperCase() + status.slice(1)}
              </Text>
              </TouchableOpacity>
          ))}
        </View>
      </View>

      <View className="mb-3">
        <Text className="text-sm font-medium text-gray-700 mb-1">Maintenance</Text>
        <View className="flex-row flex-wrap">
          {["due", "upcoming"].map((filter) => (
              <TouchableOpacity
              key={filter}
              className={`mr-2 mb-2 px-3 py-1.5 rounded-full ${
                maintenanceFilter === filter ? "bg-blue-100 border border-blue-400" : "bg-gray-100"
              }`}
              onPress={() => setMaintenanceFilter(maintenanceFilter === filter ? null : filter)}
            >
              <Text
                className={
                  maintenanceFilter === filter ? "text-blue-800" : "text-gray-800"
                }
              >
                {filter === "due" ? "Due now" : "Upcoming"}
              </Text>
              </TouchableOpacity>
          ))}
            </View>
          </View>

      <View className="mb-3">
        <Text className="text-sm font-medium text-gray-700 mb-1">Category</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {categories.map((category) => (
            <TouchableOpacity
              key={category.id}
              className={`mr-2 mb-2 px-3 py-1.5 rounded-full ${
                categoryFilter === category.id ? "bg-blue-100 border border-blue-400" : "bg-gray-100"
              }`}
              onPress={() => setCategoryFilter(categoryFilter === category.id ? null : category.id)}
            >
              <Text
                className={
                  categoryFilter === category.id ? "text-blue-800" : "text-gray-800"
                }
              >
                {category.name}
            </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <View className="mb-3">
        <Text className="text-sm font-medium text-gray-700 mb-1">Restaurant</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {restaurants.map((restaurant) => (
              <TouchableOpacity
              key={restaurant.id}
              className={`mr-2 mb-2 px-3 py-1.5 rounded-full ${
                restaurantFilter === restaurant.id ? "bg-blue-100 border border-blue-400" : "bg-gray-100"
              }`}
              onPress={() => setRestaurantFilter(restaurantFilter === restaurant.id ? null : restaurant.id)}
            >
              <Text
                className={
                  restaurantFilter === restaurant.id ? "text-blue-800" : "text-gray-800"
                }
              >
                {restaurant.name}
              </Text>
              </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <View>
        <Text className="text-sm font-medium text-gray-700 mb-1">Sort by</Text>
        <View className="flex-row flex-wrap">
          {[
            { key: "name", label: "Name" },
            { key: "status", label: "Status" },
            { key: "lastMaintenance", label: "Maintenance" },
            { key: "restaurant", label: "Restaurant" },
          ].map((sort) => (
              <TouchableOpacity
              key={sort.key}
              className={`mr-2 mb-2 px-3 py-1.5 rounded-full ${
                sortBy === sort.key ? "bg-blue-100 border border-blue-400" : "bg-gray-100"
              } flex-row items-center`}
              onPress={() => {
                if (sortBy === sort.key) {
                  setSortOrder(sortOrder === "asc" ? "desc" : "asc");
                } else {
                  setSortBy(sort.key);
                  setSortOrder("asc");
                }
              }}
            >
              <Text
                className={
                  sortBy === sort.key ? "text-blue-800" : "text-gray-800"
                }
              >
                {sort.label}
              </Text>
              {sortBy === sort.key && (
                <ChevronDown
                  size={16}
                  className="ml-1"
                  color={sortOrder === "desc" ? "#1D4ED8" : "#1D4ED8"}
                  style={{ transform: [{ rotate: sortOrder === "asc" ? "180deg" : "0deg" }] }}
                />
              )}
            </TouchableOpacity>
          ))}
        </View>
      </View>
    </View>
  );

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      <StatusBar style="dark" />

      <View className="flex-1 px-4 pt-4">
        <View className="flex-row justify-between items-center p-4 border-b border-gray-200 bg-white">
          <View className="flex-row items-center">
            <TouchableOpacity onPress={() => router.back()} className="mr-4">
              <ArrowLeft size={24} color="#0F172A" />
            </TouchableOpacity>
            <Text className="text-xl font-bold text-gray-800">Devices</Text>
          </View>

          <View className="flex-row">
            <TouchableOpacity
              className="bg-gray-100 p-2 rounded-lg mr-2"
              onPress={() => {
                onRefresh();
                Alert.alert("🔄 Refreshing", "Loading latest devices...");
              }}
            >
              <RefreshCw size={20} color="#4B5563" />
            </TouchableOpacity>

            <TouchableOpacity
              className="bg-gray-100 p-2 rounded-lg mr-2"
              onPress={() => {
                router.push("/devices/import");
                Alert.alert("📥 Bulk Import", "Opening bulk device import tool...");
              }}
            >
              <Download size={20} color="#4B5563" />
            </TouchableOpacity>

            <TouchableOpacity
              className="bg-gray-100 p-2 rounded-lg mr-2"
              onPress={() => router.push("/devices/models")}
            >
              <Package size={20} color="#4B5563" />
            </TouchableOpacity>

            <TouchableOpacity
              className="bg-blue-500 px-3 py-2 rounded-lg flex-row items-center"
              onPress={() => router.push("/devices/create")}
            >
              <Plus size={16} color="#FFFFFF" className="mr-1" />
              <Text className="text-white font-medium">Add Device</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View className="flex-row mb-4">
          <View className="flex-1 flex-row items-center bg-white rounded-lg px-3 py-2 mr-2 border border-gray-200">
            <Search size={20} color="#9CA3AF" />
              <TextInput
              className="flex-1 ml-2 text-gray-800"
                placeholder="Search devices..."
                value={searchQuery}
                onChangeText={setSearchQuery}
            />
            {searchQuery ? (
              <TouchableOpacity onPress={() => setSearchQuery("")}>
                <X size={18} color="#9CA3AF" />
              </TouchableOpacity>
            ) : null}
          </View>
          <TouchableOpacity
            className={`p-2 rounded-lg border ${
              showFilters ? "bg-blue-50 border-blue-200" : "bg-white border-gray-200"
            }`}
            onPress={() => setShowFilters(!showFilters)}
          >
            <Filter size={24} color={showFilters ? "#3B82F6" : "#6B7280"} />
          </TouchableOpacity>
        </View>

        <View className="flex-row justify-between items-center mb-4">
          <View className="flex-row space-x-1">
            <TouchableOpacity
              className="bg-white border border-gray-200 rounded-lg px-3 py-2 flex-row items-center"
              onPress={() => router.navigate("/devices/maintenance")}
            >
              <Wrench size={16} color="#6B7280" />
              <Text className="text-gray-700 text-sm ml-2">Maintenance</Text>
            </TouchableOpacity>
            <TouchableOpacity
              className="bg-white border border-gray-200 rounded-lg px-3 py-2 flex-row items-center"
              onPress={() => router.navigate("/devices/qr-codes")}
            >
              <QrCode size={16} color="#6B7280" />
              <Text className="text-gray-700 text-sm ml-2">QR Codes</Text>
            </TouchableOpacity>
            </View>
          <View className="flex-row space-x-1">
            <TouchableOpacity
              className="bg-white border border-gray-200 rounded-lg px-3 py-2 flex-row items-center"
              onPress={() => router.navigate("/devices/categories")}
            >
              <FileText size={16} color="#6B7280" />
              <Text className="text-gray-700 text-sm ml-2">Categories</Text>
            </TouchableOpacity>
            <TouchableOpacity
              className="bg-white border border-gray-200 rounded-lg px-3 py-2 flex-row items-center"
              onPress={() => router.navigate("/devices/bulk-import")}
            >
              <Download size={16} color="#6B7280" />
              <Text className="text-gray-700 text-sm ml-2">Import</Text>
            </TouchableOpacity>
          </View>
        </View>

        {showFilters && renderFilters()}

            {loading ? (
              <View className="flex-1 justify-center items-center">
            <ActivityIndicator size="large" color="#3B82F6" />
            <Text className="text-gray-600 mt-2">Loading devices...</Text>
              </View>
            ) : filteredDevices.length > 0 ? (
              <FlatList
                data={filteredDevices}
            renderItem={renderDevice}
                keyExtractor={(item) => item.id}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
            }
            contentContainerStyle={{ paddingBottom: 20 }}
                showsVerticalScrollIndicator={false}
              />
            ) : (
              <View className="flex-1 justify-center items-center">
            <Package size={64} color="#D1D5DB" />
            <Text className="text-gray-500 mt-4 text-lg">No devices found</Text>
            <Text className="text-gray-400 text-center mt-2 mb-6 mx-8">
              {searchQuery || statusFilter || categoryFilter || restaurantFilter
                ? "Try adjusting your filters or search query"
                : "Add your first device to get started"}
                </Text>
                <TouchableOpacity
              className="bg-blue-500 rounded-lg px-4 py-3 flex-row items-center"
              onPress={() => router.navigate("/devices/create")}
                >
              <Plus size={20} color="#FFFFFF" />
              <Text className="text-white font-medium ml-2">Add Device</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
    </SafeAreaView>
  );
}
