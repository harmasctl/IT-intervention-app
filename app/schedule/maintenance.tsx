import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  Alert,
  RefreshControl,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { useRouter } from "expo-router";
import {
  ArrowLeft,
  Calendar,
  Package,
  Clock,
  AlertTriangle,
  CheckCircle,
  Plus,
  Filter,
  Wrench,
} from "lucide-react-native";
import { supabase } from "../../lib/supabase";
import { addDays, format, isAfter, isBefore } from "date-fns";

// Generic type for Supabase response
type SupabaseDevice = {
  id: string;
  name: string;
  type: string;
  serial_number: string;
  last_maintenance: string | null;
  restaurant_id: string;
  category_id: string | null;
  restaurants: { name: string } | null;
  device_categories: { 
    name: string;
    maintenance_interval: number;
  } | null;
};

type MaintenanceSchedule = {
  id: string;
  device_id: string;
  device_name: string;
  device_type: string;
  serial_number: string;
  restaurant_name: string;
  last_maintenance: Date | null;
  next_maintenance: Date;
  maintenance_interval: number;
  status: "upcoming" | "overdue" | "completed";
  days_remaining: number;
  category_name?: string;
};

export default function MaintenanceScheduleScreen() {
  const router = useRouter();
  const [schedules, setSchedules] = useState<MaintenanceSchedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeFilter, setActiveFilter] = useState<"all" | "upcoming" | "overdue" | "completed">("all");

  useEffect(() => {
    fetchMaintenanceSchedules();
  }, []);

  const fetchMaintenanceSchedules = async () => {
    try {
      setLoading(true);

      // Fetch devices with their maintenance info and related data
      const { data, error } = await supabase
        .from("devices")
        .select(`
          id,
          name,
          type,
          serial_number,
          last_maintenance,
          restaurant_id,
          category_id,
          restaurants(name),
          device_categories(name, maintenance_interval)
        `)
        .order("name");

      if (error) {
        throw error;
      }

      // Process the data to calculate next maintenance dates
      const today = new Date();
      const schedulesData: MaintenanceSchedule[] = [];

      if (data) {
        data.forEach((device: any) => {
          // Skip devices without category or maintenance interval
          if (!device.device_categories || !device.device_categories.maintenance_interval) return;

          const lastMaintenance = device.last_maintenance 
            ? new Date(device.last_maintenance) 
            : null;
            
          const interval = device.device_categories.maintenance_interval;
          
          // Calculate next maintenance date
          let nextMaintenance: Date;
          if (lastMaintenance) {
            nextMaintenance = addDays(new Date(lastMaintenance), interval);
          } else {
            // If no previous maintenance, schedule from today
            nextMaintenance = addDays(today, interval / 2); // Half the interval as a default
          }
          
          // Calculate days remaining
          const daysRemaining = Math.ceil(
            (nextMaintenance.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
          );
          
          // Determine status
          let status: "upcoming" | "overdue" | "completed";
          if (isBefore(nextMaintenance, today)) {
            status = "overdue";
          } else {
            status = "upcoming";
          }
          
          // Extract restaurant name safely
          let restaurantName = "Unknown";
          if (device.restaurants && typeof device.restaurants === 'object') {
            restaurantName = device.restaurants.name || "Unknown";
          }
          
          schedulesData.push({
            id: device.id,
            device_id: device.id,
            device_name: device.name,
            device_type: device.type,
            serial_number: device.serial_number,
            restaurant_name: restaurantName,
            last_maintenance: lastMaintenance,
            next_maintenance: nextMaintenance,
            maintenance_interval: interval,
            status,
            days_remaining: daysRemaining,
            category_name: device.device_categories.name,
          });
        });
      }
      
      // Sort by next maintenance date (overdue first, then upcoming)
      schedulesData.sort((a, b) => {
        if (a.status === "overdue" && b.status !== "overdue") return -1;
        if (a.status !== "overdue" && b.status === "overdue") return 1;
        return a.next_maintenance.getTime() - b.next_maintenance.getTime();
      });
      
      setSchedules(schedulesData);
    } catch (error) {
      console.error("Error fetching maintenance schedules:", error);
      Alert.alert("Error", "Failed to load maintenance schedules");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleCreateMaintenance = (deviceId: string) => {
    router.push({
      pathname: "/devices/maintenance",
      params: { deviceId }
    });
  };

  const handleDevicePress = (deviceId: string) => {
    router.push({
      pathname: "/devices/[id]",
      params: { id: deviceId }
    });
  };

  const getStatusStyles = (status: string, daysRemaining: number) => {
    switch (status) {
      case "overdue":
        return {
          bg: "bg-red-100",
          text: "text-red-800",
          icon: <AlertTriangle size={16} color="#991B1B" />
        };
      case "upcoming":
        return daysRemaining <= 7
          ? {
              bg: "bg-yellow-100",
              text: "text-yellow-800",
              icon: <Clock size={16} color="#854D0E" />
            }
          : {
              bg: "bg-blue-100",
              text: "text-blue-800",
              icon: <Calendar size={16} color="#1E40AF" />
            };
      case "completed":
        return {
          bg: "bg-green-100",
          text: "text-green-800",
          icon: <CheckCircle size={16} color="#166534" />
        };
      default:
        return {
          bg: "bg-gray-100",
          text: "text-gray-800",
          icon: <Calendar size={16} color="#374151" />
        };
    }
  };

  const filteredSchedules = 
    activeFilter === "all" 
      ? schedules 
      : schedules.filter(schedule => schedule.status === activeFilter);

  const formatDate = (date: Date) => {
    return format(date, "MMM d, yyyy");
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchMaintenanceSchedules();
  };

  const renderScheduleItem = ({ item }: { item: MaintenanceSchedule }) => {
    const statusStyles = getStatusStyles(item.status, item.days_remaining);
    
    return (
      <View className="bg-white rounded-lg shadow-sm mb-4 overflow-hidden">
        <View className="border-l-4 border-blue-500">
          <View className="p-4">
            <View className="flex-row justify-between items-start">
              <TouchableOpacity 
                className="flex-1"
                onPress={() => handleDevicePress(item.device_id)}
              >
                <Text className="font-bold text-lg text-gray-800 mb-1">
                  {item.device_name}
                </Text>
                <Text className="text-gray-600 text-sm mb-3">
                  {item.device_type} • {item.serial_number}
                </Text>
              </TouchableOpacity>
              
              <View className={`${statusStyles.bg} px-3 py-1 rounded-full flex-row items-center`}>
                {statusStyles.icon}
                <Text className={`${statusStyles.text} text-xs font-medium ml-1 capitalize`}>
                  {item.status === "overdue" 
                    ? `Overdue by ${Math.abs(item.days_remaining)} days` 
                    : item.status === "upcoming" && item.days_remaining <= 7
                      ? `Due in ${item.days_remaining} days`
                      : item.status}
                </Text>
              </View>
            </View>
            
            <View className="flex-row items-center mb-2">
              <Text className="text-gray-700">Restaurant: </Text>
              <Text className="text-gray-900 font-medium">{item.restaurant_name}</Text>
            </View>
            
            {item.category_name && (
              <View className="flex-row items-center mb-2">
                <Text className="text-gray-700">Category: </Text>
                <Text className="text-gray-900 font-medium">{item.category_name}</Text>
              </View>
            )}
            
            <View className="flex-row items-center mb-2">
              <Text className="text-gray-700">Last Maintenance: </Text>
              <Text className="text-gray-900 font-medium">
                {item.last_maintenance ? formatDate(item.last_maintenance) : "Never"}
              </Text>
            </View>
            
            <View className="flex-row items-center mb-4">
              <Text className="text-gray-700">Next Maintenance: </Text>
              <Text className="text-gray-900 font-medium">
                {formatDate(item.next_maintenance)}
              </Text>
            </View>
            
            <TouchableOpacity
              className="bg-blue-500 py-2.5 rounded-lg flex-row justify-center items-center"
              onPress={() => handleCreateMaintenance(item.device_id)}
            >
              <Wrench size={16} color="#FFFFFF" />
              <Text className="text-white font-medium ml-2">
                Record Maintenance
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      <StatusBar style="dark" />
      
      <View className="flex-row justify-between items-center p-4 border-b border-gray-200 bg-white">
        <View className="flex-row items-center">
          <TouchableOpacity onPress={() => router.back()} className="mr-4">
            <ArrowLeft size={24} color="#0F172A" />
          </TouchableOpacity>
          <Text className="text-xl font-bold text-gray-800">Maintenance Schedule</Text>
        </View>
      </View>
      
      {/* Filter tabs */}
      <View className="bg-white px-4 py-3 border-b border-gray-200">
        <View className="flex-row bg-gray-100 p-1 rounded-lg">
          {["all", "upcoming", "overdue"].map((filter) => (
            <TouchableOpacity
              key={filter}
              className={`flex-1 py-2 rounded-lg ${
                activeFilter === filter ? "bg-white shadow-sm" : ""
              }`}
              onPress={() =>
                setActiveFilter(filter as "all" | "upcoming" | "overdue" | "completed")
              }
            >
              <Text
                className={`text-center text-sm ${
                  activeFilter === filter
                    ? "text-blue-700 font-medium"
                    : "text-gray-600"
                }`}
              >
                {filter.charAt(0).toUpperCase() + filter.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
      
      {/* Maintenance schedules list */}
      <View className="flex-1 p-4">
        {loading ? (
          <View className="flex-1 justify-center items-center">
            <ActivityIndicator size="large" color="#3B82F6" />
            <Text className="text-gray-600 mt-2">Loading maintenance schedules...</Text>
          </View>
        ) : filteredSchedules.length > 0 ? (
          <FlatList
            data={filteredSchedules}
            renderItem={renderScheduleItem}
            keyExtractor={(item) => item.id}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
            }
          />
        ) : (
          <View className="flex-1 justify-center items-center">
            <Wrench size={64} color="#D1D5DB" />
            <Text className="text-gray-500 mt-4 text-lg">No maintenance schedules found</Text>
            {activeFilter !== "all" ? (
              <Text className="text-gray-400 text-center mt-2">
                Try changing the filter to see other schedules
              </Text>
            ) : (
              <Text className="text-gray-400 text-center mt-2">
                Add devices with maintenance intervals to see schedules
              </Text>
            )}
          </View>
        )}
      </View>
    </SafeAreaView>
  );
} 