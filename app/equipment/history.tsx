import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { useRouter } from "expo-router";
import {
  ArrowLeft,
  Calendar,
  ArrowUp,
  ArrowDown,
  Filter,
  Package,
} from "lucide-react-native";
import { supabase } from "../../lib/supabase";
import EquipmentTabs from "../../components/EquipmentTabs";

type MovementRecord = {
  id: string;
  equipment_id: string;
  equipment_name: string;
  movement_type: "in" | "out";
  quantity: number;
  reason: string;
  timestamp: string;
  previous_stock: number;
  new_stock: number;
};

export default function EquipmentHistoryScreen() {
  const router = useRouter();
  const [movements, setMovements] = useState<MovementRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "in" | "out">("all");
  const [dateFilter, setDateFilter] = useState<
    "all" | "today" | "week" | "month"
  >("all");

  useEffect(() => {
    fetchMovements();

    // Set up real-time subscription for movement changes
    const movementSubscription = supabase
      .channel("movement-changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "equipment_movements" },
        (payload) => {
          console.log("Movement change received:", payload);
          fetchMovements();
        },
      )
      .subscribe();

    return () => {
      movementSubscription.unsubscribe();
    };
  }, []);

  const fetchMovements = useCallback(async () => {
    try {
      setLoading(true);

      // Fetch movement records with equipment names
      const { data, error } = await supabase
        .from("equipment_movements")
        .select(
          `
          id,
          equipment_id,
          movement_type,
          quantity,
          reason,
          timestamp,
          previous_stock,
          new_stock,
          equipment(name)
        `,
        )
        .order("timestamp", { ascending: false });

      if (error) throw error;

      if (data && data.length > 0) {
        // Transform the data to match our MovementRecord type
        const formattedData: MovementRecord[] = data.map((item) => ({
          id: item.id,
          equipment_id: item.equipment_id,
          equipment_name: item.equipment?.name || "Unknown Equipment",
          movement_type: item.movement_type,
          quantity: item.quantity,
          reason: item.reason,
          timestamp: item.timestamp,
          previous_stock: item.previous_stock,
          new_stock: item.new_stock,
        }));

        setMovements(formattedData);
      } else {
        // If no data exists, we'll just show an empty state
        setMovements([]);
      }
    } catch (error) {
      console.error("Error fetching movement history:", error);
      Alert.alert("Error", "Failed to load movement history");
    } finally {
      setLoading(false);
    }
  }, []);

  const isWithinDateRange = (dateString: string) => {
    if (dateFilter === "all") return true;

    const date = new Date(dateString);
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    if (dateFilter === "today") {
      return date >= today;
    } else if (dateFilter === "week") {
      const weekAgo = new Date(now);
      weekAgo.setDate(now.getDate() - 7);
      return date >= weekAgo;
    } else if (dateFilter === "month") {
      const monthAgo = new Date(now);
      monthAgo.setMonth(now.getMonth() - 1);
      return date >= monthAgo;
    }

    return true;
  };

  const filteredMovements = movements.filter((movement) => {
    const typeMatch = filter === "all" || movement.movement_type === filter;
    const dateMatch = isWithinDateRange(movement.timestamp);
    return typeMatch && dateMatch;
  });

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString();
  };

  const renderMovementItem = ({ item }: { item: MovementRecord }) => (
    <View className="bg-white rounded-lg p-4 mb-3 shadow-sm border border-gray-100">
      <View className="flex-row justify-between items-start mb-2">
        <Text className="font-bold text-lg text-gray-800">
          {item.equipment_name}
        </Text>
        <View
          className={`px-3 py-1 rounded-full ${item.movement_type === "in" ? "bg-green-100" : "bg-red-100"}`}
        >
          <View className="flex-row items-center">
            {item.movement_type === "in" ? (
              <ArrowDown size={14} color="#16a34a" />
            ) : (
              <ArrowUp size={14} color="#dc2626" />
            )}
            <Text
              className={`ml-1 text-sm font-medium ${item.movement_type === "in" ? "text-green-700" : "text-red-700"}`}
            >
              {item.movement_type === "in" ? "Stock In" : "Stock Out"}
            </Text>
          </View>
        </View>
      </View>

      <View className="flex-row items-center mb-2">
        <Calendar size={16} color="#6b7280" />
        <Text className="ml-1 text-gray-600">{formatDate(item.timestamp)}</Text>
      </View>

      <View className="flex-row justify-between mb-2">
        <Text className="text-gray-700">
          Quantity: <Text className="font-medium">{item.quantity}</Text>
        </Text>
        <Text className="text-gray-700">
          Stock:{" "}
          <Text className="font-medium">
            {item.previous_stock} → {item.new_stock}
          </Text>
        </Text>
      </View>

      <Text className="text-gray-700">
        Reason: <Text className="font-medium">{item.reason}</Text>
      </Text>
    </View>
  );

  return (
    <SafeAreaView className="flex-1 bg-white">
      <StatusBar style="auto" />

      {/* Header */}
      <View className="flex-row justify-between items-center px-4 py-3 border-b border-gray-200">
        <TouchableOpacity
          onPress={() => router.back()}
          className="flex-row items-center"
        >
          <ArrowLeft size={20} color="#3b82f6" />
          <Text className="text-blue-500 ml-1">Back</Text>
        </TouchableOpacity>
        <Text className="text-xl font-bold text-blue-800">
          Stock Movement History
        </Text>
        <View style={{ width: 50 }} />
      </View>

      {/* Filter */}
      <View className="p-4 border-b border-gray-200">
        <View className="flex-row items-center mb-2">
          <Filter size={16} color="#6b7280" />
          <Text className="ml-1 text-gray-700 font-medium">
            Filter by type:
          </Text>
        </View>
        <View className="flex-row mb-4">
          <TouchableOpacity
            className={`px-4 py-2 mr-2 rounded-full ${filter === "all" ? "bg-blue-500" : "bg-white border border-gray-300"}`}
            onPress={() => setFilter("all")}
          >
            <Text className={filter === "all" ? "text-white" : "text-gray-700"}>
              All
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            className={`px-4 py-2 mr-2 rounded-full ${filter === "in" ? "bg-green-500" : "bg-white border border-gray-300"}`}
            onPress={() => setFilter("in")}
          >
            <Text className={filter === "in" ? "text-white" : "text-gray-700"}>
              Stock In
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            className={`px-4 py-2 mr-2 rounded-full ${filter === "out" ? "bg-red-500" : "bg-white border border-gray-300"}`}
            onPress={() => setFilter("out")}
          >
            <Text className={filter === "out" ? "text-white" : "text-gray-700"}>
              Stock Out
            </Text>
          </TouchableOpacity>
        </View>

        <View className="flex-row items-center mb-2">
          <Calendar size={16} color="#6b7280" />
          <Text className="ml-1 text-gray-700 font-medium">
            Filter by date:
          </Text>
        </View>
        <View className="flex-row">
          <TouchableOpacity
            className={`px-4 py-2 mr-2 rounded-full ${dateFilter === "all" ? "bg-blue-500" : "bg-white border border-gray-300"}`}
            onPress={() => setDateFilter("all")}
          >
            <Text
              className={dateFilter === "all" ? "text-white" : "text-gray-700"}
            >
              All Time
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            className={`px-4 py-2 mr-2 rounded-full ${dateFilter === "today" ? "bg-blue-500" : "bg-white border border-gray-300"}`}
            onPress={() => setDateFilter("today")}
          >
            <Text
              className={
                dateFilter === "today" ? "text-white" : "text-gray-700"
              }
            >
              Today
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            className={`px-4 py-2 mr-2 rounded-full ${dateFilter === "week" ? "bg-blue-500" : "bg-white border border-gray-300"}`}
            onPress={() => setDateFilter("week")}
          >
            <Text
              className={dateFilter === "week" ? "text-white" : "text-gray-700"}
            >
              Last Week
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            className={`px-4 py-2 mr-2 rounded-full ${dateFilter === "month" ? "bg-blue-500" : "bg-white border border-gray-300"}`}
            onPress={() => setDateFilter("month")}
          >
            <Text
              className={
                dateFilter === "month" ? "text-white" : "text-gray-700"
              }
            >
              Last Month
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Movement list */}
      <View className="flex-1 p-4 bg-gray-50">
        {loading ? (
          <View className="flex-1 justify-center items-center">
            <ActivityIndicator size="large" color="#1e40af" />
            <Text className="mt-2 text-gray-600">
              Loading stock movement history...
            </Text>
          </View>
        ) : filteredMovements.length > 0 ? (
          <FlatList
            data={filteredMovements}
            renderItem={renderMovementItem}
            keyExtractor={(item) => item.id}
            showsVerticalScrollIndicator={false}
            refreshing={loading}
            onRefresh={() => {
              setLoading(true);
              fetchMovements();
            }}
            contentContainerStyle={{ paddingBottom: 20 }}
          />
        ) : (
          <View className="flex-1 justify-center items-center">
            <Package size={48} color="#9ca3af" />
            <Text className="mt-4 text-gray-500 text-center">
              No stock movement history found
            </Text>
          </View>
        )}
      </View>

      {/* Bottom Tabs */}
      <EquipmentTabs activeTab="history" />
    </SafeAreaView>
  );
}
