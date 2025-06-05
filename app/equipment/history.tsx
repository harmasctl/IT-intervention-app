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
  Filter,
  ArrowUp,
  ArrowDown,
  RotateCcw,
  User,
  MapPin,
  FileText,
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

    // Set up real-time subscription for movement changes
    const subscription = supabase
      .channel("equipment-history-changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "equipment_movements" },
        (payload) => {
          console.log("Movement change received:", payload);
          fetchHistory();
        },
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const fetchHistory = async () => {
    try {
      setLoading(true);

      // First fetch movements
      const { data: movementsData, error: movementsError } = await supabase
        .from("equipment_movements")
        .select("*")
        .order("timestamp", { ascending: false });

      if (movementsError) {
        console.error("Error fetching equipment movements:", movementsError);
        Alert.alert("Error", "Failed to load equipment history");
        return;
      }

      if (movementsData && movementsData.length > 0) {
        // Get unique equipment IDs
        const equipmentIds = [...new Set(movementsData.map(m => m.equipment_id).filter(Boolean))];

        // Fetch equipment data separately
        const { data: equipmentData } = await supabase
          .from("equipment_inventory")
          .select("id, name, type, sku")
          .in("id", equipmentIds);

        // Create equipment lookup map
        const equipmentMap = new Map(equipmentData?.map(e => [e.id, e]) || []);

        // Process data with equipment information
        const processedData = movementsData.map((item) => {
          const equipment = equipmentMap.get(item.equipment_id);
          return {
            id: item.id,
            equipment_id: item.equipment_id,
            equipment_name: equipment?.name || "Unknown Equipment",
            equipment_type: equipment?.type || "",
            equipment_sku: equipment?.sku || "",
            action_type: item.movement_type,
            date: item.timestamp,
            notes: item.notes,
            location_from: null,
            location_to: item.destination,
            user_id: null,
            user_name: "System",
            created_at: item.timestamp,
            quantity: item.quantity,
            reason: item.reason,
            previous_stock: item.previous_stock,
            new_stock: item.new_stock,
          };
        });

        setHistory(processedData);
      } else {
        setHistory([]);
      }
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
      className="bg-white rounded-lg shadow-sm mb-3 p-4 border-l-4 border-blue-500"
      onPress={() => router.push(`/equipment/${item.equipment_id}`)}
    >
      {/* Header */}
      <View className="flex-row justify-between items-start mb-3">
        <View className="flex-1">
          <Text className="text-lg font-semibold text-gray-800">
            {item.equipment_name}
          </Text>
          {item.equipment_sku && (
            <Text className="text-gray-500 text-sm">SKU: {item.equipment_sku}</Text>
          )}
          <Text className="text-gray-600 text-sm">
            Type: {item.equipment_type}
          </Text>
        </View>

        <View className="bg-blue-100 p-2 rounded-lg">
          <Text className="text-blue-800 text-xs font-medium">
            {format(new Date(item.date), "MMM d, yyyy")}
          </Text>
        </View>
      </View>

      {/* Action Type Badge */}
      <View className="flex-row items-center mb-3">
        {getActionIcon(item.action_type)}
        <View className={`ml-2 px-3 py-1 rounded-full ${getActionColor(item.action_type)}`}>
          <Text className="text-sm font-medium">
            {getActionTypeDisplay(item.action_type)}
          </Text>
        </View>
      </View>

      {/* Stock Information */}
      {item.quantity && (
        <View className="bg-gray-50 rounded-lg p-3 mb-3">
          <View className="flex-row justify-between items-center">
            <Text className="text-gray-700 font-medium">Quantity: {item.quantity}</Text>
            <View className="flex-row items-center">
              <Text className="text-gray-600 text-sm">
                {item.previous_stock} → {item.new_stock}
              </Text>
              {item.action_type === 'in' ? (
                <ArrowUp size={16} color="#22c55e" className="ml-1" />
              ) : (
                <ArrowDown size={16} color="#ef4444" className="ml-1" />
              )}
            </View>
          </View>
          {item.reason && (
            <Text className="text-gray-600 text-sm mt-1">Reason: {item.reason}</Text>
          )}
        </View>
      )}

      {/* Notes */}
      {item.notes && (
        <View className="bg-yellow-50 rounded-lg p-3 mb-3 border border-yellow-200">
          <View className="flex-row items-start">
            <FileText size={16} color="#d97706" className="mr-2 mt-0.5" />
            <Text className="text-gray-700 flex-1">{item.notes}</Text>
          </View>
        </View>
      )}

      {/* Footer Information */}
      <View className="space-y-1">
        <View className="flex-row items-center">
          <Clock size={14} color="#6B7280" className="mr-2" />
          <Text className="text-gray-500 text-xs">
            {format(new Date(item.created_at), "MMM d, yyyy h:mm a")}
          </Text>
        </View>

        {item.location_to && (
          <View className="flex-row items-center">
            <MapPin size={14} color="#6B7280" className="mr-2" />
            <Text className="text-gray-500 text-xs">
              {item.location_from && item.location_to
                ? `Moved from ${item.location_from} to ${item.location_to}`
                : `Location: ${item.location_to}`}
            </Text>
          </View>
        )}

        <View className="flex-row items-center">
          <User size={14} color="#6B7280" className="mr-2" />
          <Text className="text-gray-500 text-xs">
            By: {item.user_name || "System"}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  const getActionTypeDisplay = (actionType: string) => {
    switch (actionType) {
      case "in":
        return "Stock In";
      case "out":
        return "Stock Out";
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
        return actionType.charAt(0).toUpperCase() + actionType.slice(1);
    }
  };

  const getActionIcon = (actionType: string) => {
    switch (actionType) {
      case "in":
        return <ArrowUp size={16} color="#22c55e" />;
      case "out":
        return <ArrowDown size={16} color="#ef4444" />;
      case "transfer":
        return <RotateCcw size={16} color="#3b82f6" />;
      case "maintenance":
        return <Package size={16} color="#f59e0b" />;
      default:
        return <Package size={16} color="#6b7280" />;
    }
  };

  const getActionColor = (actionType: string) => {
    switch (actionType) {
      case "in":
        return "bg-green-100 text-green-800 border-green-200";
      case "out":
        return "bg-red-100 text-red-800 border-red-200";
      case "transfer":
        return "bg-blue-100 text-blue-800 border-blue-200";
      case "maintenance":
        return "bg-yellow-100 text-yellow-800 border-yellow-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
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
