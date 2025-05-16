import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from "react-native";
import { supabase } from "../lib/supabase";
import {
  Clock,
  Tool,
  CheckCircle,
  AlertCircle,
  Calendar,
  ChevronRight,
} from "lucide-react-native";
import { useRouter } from "expo-router";

type MaintenanceRecord = {
  id: string;
  asset_id: string;
  maintenance_type: "preventive" | "corrective" | "inspection";
  description: string;
  technician_id: string;
  technician_name?: string;
  status: "scheduled" | "in-progress" | "completed" | "cancelled";
  scheduled_date: string;
  completed_date?: string;
  notes?: string;
  created_at: string;
};

type AssetMaintenanceHistoryProps = {
  assetId: string;
  onAddMaintenance?: () => void;
};

export default function AssetMaintenanceHistory({
  assetId,
  onAddMaintenance,
}: AssetMaintenanceHistoryProps) {
  const [maintenanceRecords, setMaintenanceRecords] = useState<
    MaintenanceRecord[]
  >([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    fetchMaintenanceHistory();
  }, [assetId]);

  const fetchMaintenanceHistory = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("asset_maintenance")
        .select("*")
        .eq("asset_id", assetId)
        .order("scheduled_date", { ascending: false });

      if (error) throw error;

      if (data) {
        // Fetch technician names
        const technicianIds = [
          ...new Set(data.map((record) => record.technician_id)),
        ];
        const { data: technicianData, error: techError } = await supabase
          .from("users")
          .select("id, name")
          .in("id", technicianIds);

        if (techError) throw techError;

        // Map technician names to maintenance records
        const recordsWithNames = data.map((record) => {
          const technician = technicianData?.find(
            (tech) => tech.id === record.technician_id,
          );
          return {
            ...record,
            technician_name: technician?.name || "Unknown",
          };
        });

        setMaintenanceRecords(recordsWithNames);
      }
    } catch (error) {
      console.error("Error fetching maintenance history:", error);
      Alert.alert("Error", "Failed to load maintenance history");
    } finally {
      setLoading(false);
    }
  };

  const getMaintenanceTypeIcon = (type: string) => {
    switch (type) {
      case "preventive":
        return <Calendar size={16} color="#3b82f6" />;
      case "corrective":
        return <Tool size={16} color="#ef4444" />;
      case "inspection":
        return <CheckCircle size={16} color="#10b981" />;
      default:
        return <AlertCircle size={16} color="#f59e0b" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "scheduled":
        return "bg-blue-100 text-blue-800";
      case "in-progress":
        return "bg-amber-100 text-amber-800";
      case "completed":
        return "bg-green-100 text-green-800";
      case "cancelled":
        return "bg-gray-100 text-gray-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString();
  };

  const handleMaintenancePress = (maintenanceId: string) => {
    router.push(`/assets/maintenance/${maintenanceId}`);
  };

  const renderMaintenanceItem = ({ item }: { item: MaintenanceRecord }) => (
    <TouchableOpacity
      className="bg-white p-4 rounded-lg mb-3 shadow-sm border border-gray-100"
      onPress={() => handleMaintenancePress(item.id)}
    >
      <View className="flex-row justify-between items-start">
        <View className="flex-row items-center">
          {getMaintenanceTypeIcon(item.maintenance_type)}
          <Text className="font-bold text-gray-800 ml-2 capitalize">
            {item.maintenance_type} Maintenance
          </Text>
        </View>
        <View
          className={`px-2 py-1 rounded-full ${getStatusColor(item.status)}`}
        >
          <Text className="text-xs font-medium capitalize">{item.status}</Text>
        </View>
      </View>

      <Text className="text-gray-600 mt-2">{item.description}</Text>

      <View className="flex-row justify-between items-center mt-3">
        <View>
          <Text className="text-gray-500 text-xs">
            Scheduled: {formatDate(item.scheduled_date)}
          </Text>
          {item.completed_date && (
            <Text className="text-gray-500 text-xs">
              Completed: {formatDate(item.completed_date)}
            </Text>
          )}
        </View>
        <View className="flex-row items-center">
          <Text className="text-gray-600 text-sm mr-1">
            {item.technician_name}
          </Text>
          <ChevronRight size={16} color="#9ca3af" />
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <View className="flex-1">
      <View className="flex-row justify-between items-center mb-4">
        <Text className="text-lg font-bold text-gray-800">
          Maintenance History
        </Text>
        {onAddMaintenance && (
          <TouchableOpacity
            className="bg-blue-600 px-3 py-1.5 rounded-full"
            onPress={onAddMaintenance}
          >
            <Text className="text-white font-medium">Schedule</Text>
          </TouchableOpacity>
        )}
      </View>

      {loading ? (
        <View className="items-center justify-center py-8">
          <ActivityIndicator size="large" color="#1e40af" />
          <Text className="text-gray-500 mt-2">
            Loading maintenance records...
          </Text>
        </View>
      ) : maintenanceRecords.length > 0 ? (
        <FlatList
          data={maintenanceRecords}
          renderItem={renderMaintenanceItem}
          keyExtractor={(item) => item.id}
          showsVerticalScrollIndicator={false}
        />
      ) : (
        <View className="bg-gray-50 p-4 rounded-lg items-center justify-center py-8">
          <Tool size={32} color="#9ca3af" />
          <Text className="text-gray-500 mt-3 text-center">
            No maintenance records found for this asset
          </Text>
          {onAddMaintenance && (
            <TouchableOpacity
              className="mt-4 bg-blue-600 px-4 py-2 rounded-lg"
              onPress={onAddMaintenance}
            >
              <Text className="text-white font-medium">
                Schedule Maintenance
              </Text>
            </TouchableOpacity>
          )}
        </View>
      )}
    </View>
  );
}
