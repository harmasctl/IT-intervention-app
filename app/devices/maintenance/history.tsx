import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  RefreshControl,
  FlatList,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { useRouter, useLocalSearchParams } from "expo-router";
import {
  ArrowLeft,
  Plus,
  Calendar,
  User,
  DollarSign,
  Clock,
  CheckCircle2,
  AlertCircle,
  Wrench,
  Filter,
  Search,
  Package,
  FileText,
} from "lucide-react-native";
import { supabase } from "../../../lib/supabase";
import { formatDistanceToNow, format } from "date-fns";

type MaintenanceRecord = {
  id: string;
  device_id: string;
  technician_id: string;
  date: string;
  description: string;
  resolved: boolean;
  status: "pending" | "in_progress" | "completed" | "cancelled";
  cost?: number;
  maintenance_duration_minutes?: number;
  parts_replaced?: any[];
  created_at: string;
  technician?: {
    name: string;
    email: string;
  };
  device?: {
    name: string;
    serial_number: string;
  };
};

export default function MaintenanceHistoryScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const deviceId = params.device_id as string;

  const [records, setRecords] = useState<MaintenanceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<"all" | "pending" | "completed" | "in_progress">("all");

  useEffect(() => {
    fetchMaintenanceRecords();
  }, [deviceId, filter]);

  const fetchMaintenanceRecords = async () => {
    try {
      setLoading(true);

      let query = supabase
        .from("maintenance_records")
        .select(`
          *,
          technician:users(name, email),
          device:devices(name, serial_number)
        `)
        .order("date", { ascending: false });

      // Filter by device if specified
      if (deviceId) {
        query = query.eq("device_id", deviceId);
      }

      // Filter by status
      if (filter !== "all") {
        query = query.eq("status", filter);
      }

      const { data, error } = await query;

      if (error) {
        console.error("Error fetching maintenance records:", error);
        Alert.alert("❌ Error", "Failed to load maintenance records");
        return;
      }

      setRecords(data || []);
      if (data && data.length > 0) {
        Alert.alert("✅ Records Loaded", `Found ${data.length} maintenance record(s)`);
      }
    } catch (error) {
      console.error("Exception fetching maintenance records:", error);
      Alert.alert("❌ Error", "An unexpected error occurred");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchMaintenanceRecords();
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed":
        return "#10B981";
      case "in_progress":
        return "#F59E0B";
      case "pending":
        return "#6B7280";
      case "cancelled":
        return "#EF4444";
      default:
        return "#6B7280";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "completed":
        return <CheckCircle2 size={16} color="#10B981" />;
      case "in_progress":
        return <Clock size={16} color="#F59E0B" />;
      case "pending":
        return <AlertCircle size={16} color="#6B7280" />;
      case "cancelled":
        return <AlertCircle size={16} color="#EF4444" />;
      default:
        return <AlertCircle size={16} color="#6B7280" />;
    }
  };

  const handleRecordPress = (record: MaintenanceRecord) => {
    Alert.alert(
      "🔧 Maintenance Details",
      `Date: ${format(new Date(record.date), "MMM dd, yyyy")}\nTechnician: ${record.technician?.name || "Unknown"}\nStatus: ${record.status}\nResolved: ${record.resolved ? "Yes" : "No"}\n\nDescription:\n${record.description}`,
      [
        {
          text: "Edit",
          onPress: () => {
            router.push(`/devices/maintenance/edit/${record.id}`);
            Alert.alert("📝 Editing Record", "Opening maintenance record editor...");
          }
        },
        {
          text: "Close",
          style: "cancel"
        }
      ]
    );
  };

  const renderMaintenanceRecord = ({ item }: { item: MaintenanceRecord }) => (
    <TouchableOpacity
      className="bg-white rounded-lg shadow-sm p-4 mb-3 mx-4"
      onPress={() => handleRecordPress(item)}
    >
      <View className="flex-row justify-between items-start mb-2">
        <View className="flex-1">
          <Text className="text-lg font-semibold text-gray-800" numberOfLines={1}>
            {item.device?.name || "Unknown Device"}
          </Text>
          <Text className="text-sm text-gray-500">
            {item.device?.serial_number || "No Serial"}
          </Text>
        </View>
        <View className="flex-row items-center">
          {getStatusIcon(item.status)}
          <Text className="text-sm font-medium ml-1" style={{ color: getStatusColor(item.status) }}>
            {item.status.replace("_", " ").toUpperCase()}
          </Text>
        </View>
      </View>

      <Text className="text-gray-700 mb-2" numberOfLines={2}>
        {item.description}
      </Text>

      <View className="flex-row justify-between items-center">
        <View className="flex-row items-center">
          <User size={14} color="#6B7280" />
          <Text className="text-sm text-gray-600 ml-1">
            {item.technician?.name || "Unknown"}
          </Text>
        </View>
        <View className="flex-row items-center">
          <Calendar size={14} color="#6B7280" />
          <Text className="text-sm text-gray-600 ml-1">
            {format(new Date(item.date), "MMM dd, yyyy")}
          </Text>
        </View>
      </View>

      {(item.cost || item.maintenance_duration_minutes) && (
        <View className="flex-row justify-between items-center mt-2 pt-2 border-t border-gray-100">
          {item.cost && (
            <View className="flex-row items-center">
              <DollarSign size={14} color="#6B7280" />
              <Text className="text-sm text-gray-600 ml-1">
                ${item.cost.toFixed(2)}
              </Text>
            </View>
          )}
          {item.maintenance_duration_minutes && (
            <View className="flex-row items-center">
              <Clock size={14} color="#6B7280" />
              <Text className="text-sm text-gray-600 ml-1">
                {item.maintenance_duration_minutes} min
              </Text>
            </View>
          )}
        </View>
      )}
    </TouchableOpacity>
  );

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      <StatusBar style="dark" />

      {/* Header */}
      <View className="flex-row justify-between items-center p-4 border-b border-gray-200 bg-white">
        <View className="flex-row items-center flex-1">
          <TouchableOpacity onPress={() => router.back()} className="mr-3">
            <ArrowLeft size={24} color="#0F172A" />
          </TouchableOpacity>
          <Text className="text-lg md:text-xl font-bold text-gray-800 flex-1" numberOfLines={1}>
            {deviceId ? "Device Maintenance" : "All Maintenance"}
          </Text>
        </View>
        <TouchableOpacity
          className="bg-blue-500 px-3 py-2 rounded-lg flex-row items-center"
          onPress={() => {
            const route = deviceId
              ? `/devices/maintenance/create?device_id=${deviceId}`
              : "/devices/maintenance/create";
            router.push(route);
            Alert.alert("🔧 New Maintenance", "Opening maintenance scheduler...");
          }}
        >
          <Plus size={18} color="#FFFFFF" />
          <Text className="text-white font-medium ml-2 hidden md:block">New</Text>
        </TouchableOpacity>
      </View>

      {/* Filter Tabs */}
      <View className="bg-white border-b border-gray-200">
        <ScrollView horizontal showsHorizontalScrollIndicator={false} className="px-4 py-3">
          <View className="flex-row space-x-2">
            {[
              { key: "all", label: "All", count: records.length },
              { key: "pending", label: "Pending", count: records.filter(r => r.status === "pending").length },
              { key: "in_progress", label: "In Progress", count: records.filter(r => r.status === "in_progress").length },
              { key: "completed", label: "Completed", count: records.filter(r => r.status === "completed").length },
            ].map((tab) => (
              <TouchableOpacity
                key={tab.key}
                className={`px-4 py-2 rounded-full flex-row items-center ${
                  filter === tab.key ? "bg-blue-500" : "bg-gray-100"
                }`}
                onPress={() => setFilter(tab.key as any)}
              >
                <Text className={`font-medium ${filter === tab.key ? "text-white" : "text-gray-700"}`}>
                  {tab.label}
                </Text>
                <View className={`ml-2 px-2 py-0.5 rounded-full ${
                  filter === tab.key ? "bg-blue-400" : "bg-gray-200"
                }`}>
                  <Text className={`text-xs font-bold ${filter === tab.key ? "text-white" : "text-gray-600"}`}>
                    {tab.count}
                  </Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>
      </View>

      {/* Content */}
      {loading ? (
        <View className="flex-1 justify-center items-center">
          <ActivityIndicator size="large" color="#1D4ED8" />
          <Text className="mt-4 text-gray-600">Loading maintenance records...</Text>
        </View>
      ) : records.length === 0 ? (
        <View className="flex-1 justify-center items-center p-8">
          <Wrench size={64} color="#9CA3AF" />
          <Text className="text-xl font-semibold text-gray-800 mt-4 text-center">
            No Maintenance Records
          </Text>
          <Text className="text-gray-600 text-center mt-2 mb-6">
            {deviceId
              ? "This device has no maintenance history yet."
              : "No maintenance records found for the selected filter."
            }
          </Text>
          <TouchableOpacity
            className="bg-blue-500 px-6 py-3 rounded-lg flex-row items-center"
            onPress={() => {
              const route = deviceId
                ? `/devices/maintenance/create?device_id=${deviceId}`
                : "/devices/maintenance/create";
              router.push(route);
              Alert.alert("🔧 Scheduling Maintenance", "Opening maintenance scheduler...");
            }}
          >
            <Plus size={20} color="#FFFFFF" />
            <Text className="text-white font-medium ml-2">Schedule Maintenance</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={records}
          renderItem={renderMaintenanceRecord}
          keyExtractor={(item) => item.id}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          contentContainerStyle={{ paddingVertical: 16 }}
          showsVerticalScrollIndicator={false}
        />
      )}
    </SafeAreaView>
  );
}