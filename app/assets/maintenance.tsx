import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  TextInput,
  ScrollView,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { useRouter } from "expo-router";
import {
  Search,
  Filter,
  Calendar,
  Clock,
  CheckCircle,
  AlertCircle,
  Tool,
  ArrowLeft,
  Plus,
} from "lucide-react-native";
import { supabase } from "../../lib/supabase";

type MaintenanceRecord = {
  id: string;
  asset_id: string;
  asset_name?: string;
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

export default function MaintenanceScreen() {
  const router = useRouter();
  const [maintenanceRecords, setMaintenanceRecords] = useState<
    MaintenanceRecord[]
  >([]);
  const [filteredRecords, setFilteredRecords] = useState<MaintenanceRecord[]>(
    [],
  );
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("All");
  const [selectedType, setSelectedType] = useState("All");

  const statusTypes = [
    "All",
    "Scheduled",
    "In-Progress",
    "Completed",
    "Cancelled",
  ];

  const maintenanceTypes = ["All", "Preventive", "Corrective", "Inspection"];

  useEffect(() => {
    fetchMaintenanceRecords();

    // Set up real-time subscription for maintenance changes
    const maintenanceSubscription = supabase
      .channel("maintenance-changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "asset_maintenance" },
        (payload) => {
          console.log("Maintenance change received:", payload);
          fetchMaintenanceRecords();
        },
      )
      .subscribe();

    return () => {
      maintenanceSubscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    filterRecords();
  }, [searchQuery, selectedStatus, selectedType, maintenanceRecords]);

  const fetchMaintenanceRecords = async () => {
    try {
      setLoading(true);

      // Fetch maintenance records with asset and technician information
      const { data, error } = await supabase
        .from("asset_maintenance")
        .select("*, assets(id, name), users(id, name)")
        .order("scheduled_date", { ascending: false });

      if (error) throw error;

      if (data) {
        // Transform data to include asset and technician names
        const transformedRecords = data.map((record) => ({
          ...record,
          asset_name: record.assets?.name || "Unknown Asset",
          technician_name: record.users?.name || "Unassigned",
        }));

        setMaintenanceRecords(transformedRecords);
      }
    } catch (error) {
      console.error("Error fetching maintenance records:", error);
    } finally {
      setLoading(false);
    }
  };

  const filterRecords = () => {
    let filtered = [...maintenanceRecords];

    // Filter by search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (record) =>
          record.asset_name?.toLowerCase().includes(query) ||
          record.description.toLowerCase().includes(query) ||
          record.technician_name?.toLowerCase().includes(query),
      );
    }

    // Filter by status
    if (selectedStatus !== "All") {
      filtered = filtered.filter(
        (record) =>
          record.status.toLowerCase() === selectedStatus.toLowerCase(),
      );
    }

    // Filter by type
    if (selectedType !== "All") {
      filtered = filtered.filter(
        (record) =>
          record.maintenance_type.toLowerCase() === selectedType.toLowerCase(),
      );
    }

    setFilteredRecords(filtered);
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
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

  const getStatusIcon = (status: string) => {
    switch (status.toLowerCase()) {
      case "scheduled":
        return <Calendar size={16} color="#1e40af" />;
      case "in-progress":
        return <Clock size={16} color="#b45309" />;
      case "completed":
        return <CheckCircle size={16} color="#15803d" />;
      case "cancelled":
        return <AlertCircle size={16} color="#6b7280" />;
      default:
        return <Calendar size={16} color="#1e40af" />;
    }
  };

  const getMaintenanceTypeIcon = (type: string) => {
    switch (type.toLowerCase()) {
      case "preventive":
        return <Calendar size={16} color="#1e40af" />;
      case "corrective":
        return <Tool size={16} color="#ef4444" />;
      case "inspection":
        return <CheckCircle size={16} color="#15803d" />;
      default:
        return <Tool size={16} color="#1e40af" />;
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  const handleMaintenancePress = (maintenanceId: string) => {
    router.push(`/assets/maintenance/${maintenanceId}`);
  };

  const renderMaintenanceItem = ({ item }: { item: MaintenanceRecord }) => (
    <TouchableOpacity
      className="bg-white rounded-xl p-4 mb-4 shadow-md"
      onPress={() => handleMaintenancePress(item.id)}
      style={{ elevation: 2 }}
    >
      <View className="flex-row justify-between items-start">
        <View className="flex-1">
          <Text className="font-bold text-lg text-gray-800">
            {item.asset_name}
          </Text>
          <Text className="text-gray-600 mt-1">{item.description}</Text>
        </View>

        <View
          className={`px-3 py-1 rounded-full flex-row items-center ${getStatusColor(
            item.status,
          )}`}
        >
          {getStatusIcon(item.status)}
          <Text className="ml-1 text-sm font-medium capitalize">
            {item.status}
          </Text>
        </View>
      </View>

      <View className="mt-3 border-t border-gray-100 pt-3">
        <View className="flex-row justify-between">
          <View className="flex-row items-center">
            {getMaintenanceTypeIcon(item.maintenance_type)}
            <Text className="text-gray-500 text-sm ml-1 capitalize">
              {item.maintenance_type}
            </Text>
          </View>

          <View className="flex-row items-center">
            <Calendar size={14} color="#4b5563" />
            <Text className="text-gray-500 text-sm ml-1">
              {formatDate(item.scheduled_date)}
            </Text>
          </View>
        </View>

        <Text className="text-gray-500 text-sm mt-2">
          Technician: {item.technician_name}
        </Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      <StatusBar style="auto" />

      {/* Header */}
      <View className="flex-row justify-between items-center px-5 py-4 bg-gradient-to-r from-blue-700 to-blue-900 shadow-lg">
        <View className="flex-row items-center">
          <TouchableOpacity onPress={() => router.back()} className="mr-3">
            <ArrowLeft size={24} color="white" />
          </TouchableOpacity>
          <Text className="text-2xl font-bold text-white">Maintenance</Text>
        </View>
        <TouchableOpacity
          className="bg-green-600 p-2 rounded-full"
          onPress={() => router.push("/assets/maintenance/schedule")}
        >
          <Plus size={22} color="white" />
        </TouchableOpacity>
      </View>

      {/* Search and Filters */}
      <View className="p-4 bg-white shadow-sm">
        <View className="flex-row items-center bg-gray-100 rounded-xl px-4 py-3 mb-4">
          <Search size={20} color="#4b5563" />
          <TextInput
            className="flex-1 ml-3 py-1 text-base"
            placeholder="Search maintenance..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholderTextColor="#9ca3af"
          />
        </View>

        <View className="mb-4">
          <Text className="text-gray-700 mb-2 font-medium">Status</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {statusTypes.map((status) => (
              <TouchableOpacity
                key={status}
                className={`px-4 py-2 mr-2 rounded-lg flex-row items-center ${selectedStatus === status ? "bg-blue-600" : "bg-gray-200"}`}
                onPress={() => setSelectedStatus(status)}
              >
                {status !== "All" && (
                  <>
                    {getStatusIcon(status)}
                    <Text
                      className={
                        selectedStatus === status
                          ? "text-white font-medium ml-1"
                          : "text-gray-700 ml-1"
                      }
                    >
                      {status}
                    </Text>
                  </>
                )}
                {status === "All" && (
                  <Text
                    className={
                      selectedStatus === status
                        ? "text-white font-medium"
                        : "text-gray-700"
                    }
                  >
                    {status}
                  </Text>
                )}
              </TouchableOpacity>
            ))}
          </ScrollView>

          <Text className="text-gray-700 mb-2 mt-4 font-medium">
            Maintenance Type
          </Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {maintenanceTypes.map((type) => (
              <TouchableOpacity
                key={type}
                className={`px-4 py-2 mr-2 rounded-lg flex-row items-center ${selectedType === type ? "bg-blue-600" : "bg-gray-200"}`}
                onPress={() => setSelectedType(type)}
              >
                {type !== "All" && (
                  <>
                    {getMaintenanceTypeIcon(type)}
                    <Text
                      className={
                        selectedType === type
                          ? "text-white font-medium ml-1"
                          : "text-gray-700 ml-1"
                      }
                    >
                      {type}
                    </Text>
                  </>
                )}
                {type === "All" && (
                  <Text
                    className={
                      selectedType === type
                        ? "text-white font-medium"
                        : "text-gray-700"
                    }
                  >
                    {type}
                  </Text>
                )}
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      </View>

      {/* Maintenance List */}
      <View className="flex-1 px-4 pt-4">
        {loading ? (
          <View className="flex-1 justify-center items-center">
            <ActivityIndicator size="large" color="#1e40af" />
            <Text className="mt-2 text-gray-600">
              Loading maintenance records...
            </Text>
          </View>
        ) : filteredRecords.length > 0 ? (
          <FlatList
            data={filteredRecords}
            renderItem={renderMaintenanceItem}
            keyExtractor={(item) => item.id}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: 20 }}
            refreshing={loading}
            onRefresh={fetchMaintenanceRecords}
          />
        ) : (
          <View className="flex-1 justify-center items-center">
            <Tool size={48} color="#9ca3af" />
            <Text className="mt-4 text-gray-500 text-center">
              No maintenance records found
            </Text>
            <TouchableOpacity
              className="mt-4 bg-blue-600 px-4 py-2 rounded-lg"
              onPress={() => router.push("/assets/maintenance/schedule")}
            >
              <Text className="text-white font-medium">
                Schedule Maintenance
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}
