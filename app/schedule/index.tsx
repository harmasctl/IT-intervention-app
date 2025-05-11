import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { useRouter } from "expo-router";
import { Calendar, Clock, Plus, ChevronRight, User } from "lucide-react-native";
import { Image } from "expo-image";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../../components/AuthProvider";

type Schedule = {
  id: string;
  ticket_id: string;
  technician_id: string;
  scheduled_date: string;
  status: "scheduled" | "completed" | "cancelled";
  notes: string | null;
  ticket_title?: string;
  restaurant_name?: string;
  technician_name?: string;
};

export default function ScheduleScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState<
    "scheduled" | "completed" | "cancelled" | "all"
  >("all");

  useEffect(() => {
    fetchSchedules();
  }, [user]);

  const fetchSchedules = async () => {
    try {
      setLoading(true);

      // In a real app, this would fetch from Supabase
      // For now, using mock data
      const mockSchedules: Schedule[] = [
        {
          id: "1",
          ticket_id: "101",
          technician_id: user?.id || "unknown",
          scheduled_date: new Date(Date.now() + 86400000).toISOString(), // tomorrow
          status: "scheduled",
          notes: "Bring replacement parts",
          ticket_title: "Ice machine repair",
          restaurant_name: "Burger Palace",
          technician_name: "John Doe",
        },
        {
          id: "2",
          ticket_id: "102",
          technician_id: user?.id || "unknown",
          scheduled_date: new Date(Date.now() + 172800000).toISOString(), // day after tomorrow
          status: "scheduled",
          notes: "Regular maintenance",
          ticket_title: "POS system update",
          restaurant_name: "Pizza Heaven",
          technician_name: "John Doe",
        },
        {
          id: "3",
          ticket_id: "103",
          technician_id: "other-tech",
          scheduled_date: new Date(Date.now() - 86400000).toISOString(), // yesterday
          status: "completed",
          notes: "Fixed and tested",
          ticket_title: "Dishwasher repair",
          restaurant_name: "Noodle House",
          technician_name: "Jane Smith",
        },
        {
          id: "4",
          ticket_id: "104",
          technician_id: user?.id || "unknown",
          scheduled_date: new Date(Date.now() - 172800000).toISOString(), // 2 days ago
          status: "cancelled",
          notes: "Customer cancelled",
          ticket_title: "Oven maintenance",
          restaurant_name: "Bakery Delight",
          technician_name: "John Doe",
        },
      ];

      setSchedules(mockSchedules);
    } catch (error) {
      console.error("Error fetching schedules:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateSchedule = () => {
    // Navigate to create schedule screen
    console.log("Create new schedule");
  };

  const handleSchedulePress = (scheduleId: string) => {
    // Navigate to schedule detail
    console.log("View schedule:", scheduleId);
  };

  const filteredSchedules =
    activeFilter === "all"
      ? schedules
      : schedules.filter((schedule) => schedule.status === activeFilter);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "scheduled":
        return "bg-blue-100 text-blue-800";
      case "completed":
        return "bg-green-100 text-green-800";
      case "cancelled":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const renderScheduleItem = ({ item }: { item: Schedule }) => (
    <TouchableOpacity
      className="bg-white rounded-lg p-4 mb-3 shadow-sm border border-gray-100"
      onPress={() => handleSchedulePress(item.id)}
    >
      <View className="flex-row justify-between items-start mb-2">
        <Text className="font-bold text-lg text-gray-800">
          {item.ticket_title}
        </Text>
        <View
          className={`px-2 py-1 rounded-full ${getStatusColor(item.status)}`}
        >
          <Text className="text-xs font-medium capitalize">{item.status}</Text>
        </View>
      </View>

      <Text className="text-gray-600 mb-3">{item.restaurant_name}</Text>

      <View className="flex-row items-center mb-2">
        <Calendar size={16} color="#4b5563" />
        <Text className="ml-2 text-gray-700">
          {formatDate(item.scheduled_date)}
        </Text>
      </View>

      <View className="flex-row justify-between items-center">
        <View className="flex-row items-center">
          <User size={16} color="#4b5563" />
          <Text className="ml-2 text-gray-700">{item.technician_name}</Text>
        </View>
        <ChevronRight size={16} color="#9ca3af" />
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView className="flex-1 bg-white">
      <StatusBar style="auto" />

      {/* Header */}
      <View className="flex-row justify-between items-center px-4 py-3 border-b border-gray-200">
        <Text className="text-2xl font-bold text-blue-800">Schedule</Text>
        <TouchableOpacity
          className="bg-blue-600 p-2 rounded-full"
          onPress={handleCreateSchedule}
        >
          <Plus size={24} color="white" />
        </TouchableOpacity>
      </View>

      {/* Filter tabs */}
      <View className="flex-row bg-white px-4 py-2 border-b border-gray-200">
        {["all", "scheduled", "completed", "cancelled"].map((filter) => (
          <TouchableOpacity
            key={filter}
            className={`mr-4 py-2 ${activeFilter === filter ? "border-b-2 border-blue-600" : ""}`}
            onPress={() =>
              setActiveFilter(
                filter as "scheduled" | "completed" | "cancelled" | "all",
              )
            }
          >
            <Text
              className={`${activeFilter === filter ? "text-blue-600 font-medium" : "text-gray-600"}`}
            >
              {filter === "all"
                ? "All"
                : filter.charAt(0).toUpperCase() + filter.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Schedule list */}
      <View className="flex-1 bg-gray-50 p-4">
        {loading ? (
          <View className="flex-1 justify-center items-center">
            <ActivityIndicator size="large" color="#1e40af" />
            <Text className="mt-2 text-gray-600">Loading schedules...</Text>
          </View>
        ) : filteredSchedules.length > 0 ? (
          <FlatList
            data={filteredSchedules}
            renderItem={renderScheduleItem}
            keyExtractor={(item) => item.id}
            showsVerticalScrollIndicator={false}
          />
        ) : (
          <View className="flex-1 justify-center items-center">
            <Calendar size={48} color="#9ca3af" />
            <Text className="mt-4 text-gray-500 text-center">
              No schedules found
            </Text>
            <TouchableOpacity
              className="mt-4 bg-blue-600 px-4 py-2 rounded-lg"
              onPress={handleCreateSchedule}
            >
              <Text className="text-white font-medium">Create Schedule</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}
