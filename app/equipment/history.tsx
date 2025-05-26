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
  Clock,
  Building2,
  Package,
  TrendingUp,
  Calendar,
  Search,
} from "lucide-react-native";
import { supabase } from "../../lib/supabase";
import { format } from "date-fns";

type EquipmentHistory = {
  id: string;
  equipment_id: string;
  equipment_name?: string;
  action_type: string;
  date: string;
  notes?: string;
  location_from?: string;
  location_to?: string;
  user_id: string;
  user_name?: string;
  created_at: string;
};

export default function EquipmentHistoryScreen() {
  const router = useRouter();
  const [history, setHistory] = useState<EquipmentHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchHistory();
  }, []);

  const fetchHistory = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("equipment_movements")
        .select(`
          id,
          equipment_id,
          action_type,
          date,
          notes,
          location_from,
          location_to,
          user_id,
          created_at,
          equipment:equipment_id(name),
          user:user_id(name)
        `)
        .order("date", { ascending: false });

      if (error) {
        console.error("Error fetching equipment history:", error);
        Alert.alert("Error", "Failed to load equipment history");
        return;
      }

      // Process data to extract nested objects
      const processedData = (data || []).map((item) => {
        return {
          id: item.id,
          equipment_id: item.equipment_id,
          equipment_name: item.equipment?.name || "Unknown Equipment",
          action_type: item.action_type,
          date: item.date,
          notes: item.notes,
          location_from: item.location_from,
          location_to: item.location_to,
          user_id: item.user_id,
          user_name: item.user?.name || "Unknown User",
          created_at: item.created_at,
        };
      });

      setHistory(processedData);
    } catch (error) {
      console.error("Exception fetching equipment history:", error);
      Alert.alert("Error", "An unexpected error occurred");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    fetchHistory();
  };

  const renderHistoryItem = ({ item }: { item: EquipmentHistory }) => (
    <TouchableOpacity
      className="bg-white rounded-lg shadow-sm mb-3 p-4"
      onPress={() => router.push(`/equipment/${item.equipment_id}`)}
    >
      <View className="flex-row justify-between items-start">
        <View className="flex-1">
          <Text className="text-lg font-semibold text-gray-800">
            {item.equipment_name}
          </Text>
          <Text className="text-gray-600 text-sm">
            {getActionTypeDisplay(item.action_type)}
          </Text>
        </View>

        <View className="bg-blue-100 p-2 rounded-lg">
          <Text className="text-blue-800 text-xs">
            {format(new Date(item.date), "MMM d, yyyy")}
          </Text>
        </View>
      </View>

      {item.notes && (
        <Text className="text-gray-700 mt-2 mb-2">{item.notes}</Text>
      )}

      <View className="flex-row items-center mt-1">
        <Clock size={14} color="#6B7280" className="mr-1" />
        <Text className="text-gray-500 text-xs">
          {format(new Date(item.created_at), "MMM d, yyyy h:mm a")}
        </Text>
      </View>

      <View className="flex-row items-center mt-1">
        <Building2 size={14} color="#6B7280" className="mr-1" />
        <Text className="text-gray-500 text-xs">
          {item.location_from && item.location_to
            ? `Moved from ${item.location_from} to ${item.location_to}`
            : item.location_to
            ? `Located at ${item.location_to}`
            : "No location data"}
        </Text>
      </View>
    </TouchableOpacity>
  );

  const getActionTypeDisplay = (actionType: string) => {
    switch (actionType) {
      case "transfer":
        return "Transfer";
      case "maintenance":
        return "Maintenance";
      case "installation":
        return "Installation";
      case "removal":
        return "Removal";
      case "repair":
        return "Repair";
      default:
        return actionType;
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      <StatusBar style="dark" />

      <View className="flex-row justify-between items-center p-4 border-b border-gray-200 bg-white">
        <View className="flex-row items-center">
          <TouchableOpacity onPress={() => router.back()} className="mr-4">
            <ArrowLeft size={24} color="#0F172A" />
          </TouchableOpacity>
          <Text className="text-xl font-bold text-gray-800">Equipment History</Text>
        </View>
      </View>

      <View className="flex-1 p-4">
        {loading ? (
          <View className="flex-1 justify-center items-center">
            <ActivityIndicator size="large" color="#3B82F6" />
            <Text className="text-gray-600 mt-2">Loading history...</Text>
          </View>
        ) : history.length > 0 ? (
          <FlatList
            data={history}
            renderItem={renderHistoryItem}
            keyExtractor={(item) => item.id}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: 20 }}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
            }
          />
        ) : (
          <View className="flex-1 justify-center items-center">
            <Package size={64} color="#D1D5DB" />
            <Text className="text-gray-500 mt-4 text-lg">No history found</Text>
            <Text className="text-gray-400 text-center mt-2 mb-6">
              Equipment movement history will appear here
            </Text>
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}
