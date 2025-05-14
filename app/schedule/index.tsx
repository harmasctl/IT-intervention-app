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

      // Fetch real schedules from Supabase with joined data
      const { data, error } = await supabase.from("schedules").select(`
          *,
          tickets:ticket_id(id, title),
          technicians:technician_id(id, name),
          restaurants:tickets!inner(restaurant_id(name))
        `);

      if (error) throw error;

      if (data && data.length > 0) {
        // Transform data to match the expected format
        const formattedSchedules = data.map((schedule) => ({
          id: schedule.id,
          ticket_id: schedule.ticket_id,
          technician_id: schedule.technician_id,
          scheduled_date: schedule.scheduled_date,
          status: schedule.status,
          notes: schedule.notes,
          ticket_title: schedule.tickets?.title || "Unknown Ticket",
          restaurant_name: schedule.restaurants?.name || "Unknown Restaurant",
          technician_name: schedule.technicians?.name || "Unknown Technician",
        }));

        setSchedules(formattedSchedules);
      } else {
        // If no schedules found, set empty array
        setSchedules([]);
      }
    } catch (error) {
      console.error("Error fetching schedules:", error);
      setSchedules([]);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateSchedule = () => {
    // Navigate to create schedule screen
    router.push("/schedule/create");
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
      className="bg-white rounded-xl p-5 mb-4 shadow-md mx-1"
      onPress={() => handleSchedulePress(item.id)}
      style={{ elevation: 2 }}
      activeOpacity={0.7}
    >
      <View className="flex-row justify-between items-start mb-3">
        <Text className="font-bold text-lg text-gray-800">
          {item.ticket_title}
        </Text>
        <View
          className={`px-3 py-1.5 rounded-full ${getStatusColor(item.status)}`}
        >
          <Text className="text-xs font-medium capitalize">{item.status}</Text>
        </View>
      </View>

      <View className="bg-gray-50 px-3 py-2 rounded-lg mb-3">
        <Text className="text-gray-700 font-medium">
          {item.restaurant_name}
        </Text>
      </View>

      <View className="flex-row items-center mb-3 bg-blue-50 px-3 py-2 rounded-lg">
        <Calendar size={16} color="#1e40af" />
        <Text className="ml-2 text-blue-800 font-medium">
          {formatDate(item.scheduled_date)}
        </Text>
      </View>

      <View className="flex-row justify-between items-center">
        <View className="flex-row items-center bg-gray-100 px-3 py-2 rounded-lg">
          <User size={16} color="#4b5563" />
          <Text className="ml-2 text-gray-700 font-medium">
            {item.technician_name}
          </Text>
        </View>
        <TouchableOpacity
          className="bg-blue-100 p-2 rounded-full"
          onPress={() => handleSchedulePress(item.id)}
        >
          <ChevronRight size={16} color="#1e40af" />
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView className="flex-1 bg-white">
      <StatusBar style="auto" />

      {/* Header */}
      <View className="flex-row justify-between items-center px-5 py-4 bg-gradient-to-r from-blue-700 to-indigo-800 shadow-lg">
        <View className="flex-row items-center">
          <Calendar size={24} color="white" className="mr-2" />
          <Text className="text-2xl font-bold text-white">Schedule</Text>
        </View>
        <TouchableOpacity
          className="bg-white p-2.5 rounded-full shadow-md"
          onPress={handleCreateSchedule}
        >
          <Plus size={22} color="#1e40af" />
        </TouchableOpacity>
      </View>

      {/* Filter tabs */}
      <View className="bg-white px-4 py-3 shadow-sm">
        <View className="flex-row bg-gray-100 p-1 rounded-xl">
          {["all", "scheduled", "completed", "cancelled"].map((filter) => (
            <TouchableOpacity
              key={filter}
              className={`flex-1 py-2.5 rounded-lg ${activeFilter === filter ? "bg-white shadow-sm" : ""}`}
              onPress={() =>
                setActiveFilter(
                  filter as "scheduled" | "completed" | "cancelled" | "all",
                )
              }
            >
              <Text
                className={`text-center ${activeFilter === filter ? "text-blue-700 font-medium" : "text-gray-600"}`}
              >
                {filter === "all"
                  ? "All"
                  : filter.charAt(0).toUpperCase() + filter.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
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
