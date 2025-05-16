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
  Plus,
  Laptop,
  Smartphone,
  Printer,
  Monitor,
  Server,
  Wifi,
  Tag,
  Building2,
  Calendar,
  AlertCircle,
  CheckCircle,
  Clock,
  ArrowDownUp,
} from "lucide-react-native";
import { supabase } from "../../lib/supabase";
import NotificationBadge from "../../components/NotificationBadge";

type Asset = {
  id: string;
  name: string;
  type: string;
  status: "operational" | "maintenance" | "offline" | "retired";
  model: string;
  serial_number?: string;
  purchase_date?: string;
  warranty_expiry?: string;
  location_id?: string;
  location_name?: string;
  assigned_to?: string;
  assigned_name?: string;
  last_maintenance?: string;
  next_maintenance?: string;
  value?: number;
  notes?: string;
  created_at: string;
};

export default function AssetManagementScreen() {
  const router = useRouter();
  const [assets, setAssets] = useState<Asset[]>([]);
  const [filteredAssets, setFilteredAssets] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedType, setSelectedType] = useState("All");
  const [selectedStatus, setSelectedStatus] = useState("All");
  const [selectedLocation, setSelectedLocation] = useState("All");
  const [showFilters, setShowFilters] = useState(false);

  const assetTypes = [
    "All",
    "Computer",
    "Smartphone",
    "Printer",
    "Monitor",
    "Server",
    "Network",
    "POS",
    "Other",
  ];

  const statusTypes = [
    "All",
    "Operational",
    "Maintenance",
    "Offline",
    "Retired",
  ];

  useEffect(() => {
    fetchAssets();

    // Set up real-time subscription for asset changes
    const assetSubscription = supabase
      .channel("asset-changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "assets" },
        (payload) => {
          console.log("Asset change received:", payload);
          fetchAssets();
        },
      )
      .subscribe();

    return () => {
      assetSubscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    filterAssets();
  }, [searchQuery, selectedType, selectedStatus, selectedLocation, assets]);

  const fetchAssets = async () => {
    try {
      setLoading(true);

      // Fetch assets with location information
      const { data: assetData, error: assetError } = await supabase
        .from("assets")
        .select("*, restaurants(id, name)")
        .order("name");

      if (assetError) throw assetError;

      if (assetData) {
        // Transform data to include location name
        const transformedAssets = assetData.map((asset) => ({
          ...asset,
          location_name: asset.restaurants?.name || "Unassigned",
        }));

        setAssets(transformedAssets);
      }
    } catch (error) {
      console.error("Error fetching assets:", error);
    } finally {
      setLoading(false);
    }
  };

  const filterAssets = () => {
    let filtered = [...assets];

    // Filter by search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (asset) =>
          asset.name.toLowerCase().includes(query) ||
          asset.serial_number?.toLowerCase().includes(query) ||
          asset.model.toLowerCase().includes(query) ||
          asset.location_name?.toLowerCase().includes(query),
      );
    }

    // Filter by type
    if (selectedType !== "All") {
      filtered = filtered.filter((asset) => asset.type === selectedType);
    }

    // Filter by status
    if (selectedStatus !== "All") {
      filtered = filtered.filter(
        (asset) => asset.status.toLowerCase() === selectedStatus.toLowerCase(),
      );
    }

    // Filter by location
    if (selectedLocation !== "All") {
      filtered = filtered.filter(
        (asset) => asset.location_id === selectedLocation,
      );
    }

    setFilteredAssets(filtered);
  };

  const getAssetTypeIcon = (type: string) => {
    switch (type.toLowerCase()) {
      case "computer":
        return <Laptop size={20} color="#1e40af" />;
      case "smartphone":
        return <Smartphone size={20} color="#1e40af" />;
      case "printer":
        return <Printer size={20} color="#1e40af" />;
      case "monitor":
        return <Monitor size={20} color="#1e40af" />;
      case "server":
        return <Server size={20} color="#1e40af" />;
      case "network":
        return <Wifi size={20} color="#1e40af" />;
      default:
        return <Laptop size={20} color="#1e40af" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case "operational":
        return "bg-green-100 text-green-800";
      case "maintenance":
        return "bg-amber-100 text-amber-800";
      case "offline":
        return "bg-red-100 text-red-800";
      case "retired":
        return "bg-gray-100 text-gray-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status.toLowerCase()) {
      case "operational":
        return <CheckCircle size={16} color="#15803d" />;
      case "maintenance":
        return <Clock size={16} color="#b45309" />;
      case "offline":
        return <AlertCircle size={16} color="#dc2626" />;
      case "retired":
        return <AlertCircle size={16} color="#6b7280" />;
      default:
        return <CheckCircle size={16} color="#15803d" />;
    }
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return "N/A";
    return new Date(dateString).toLocaleDateString();
  };

  const handleAddAsset = () => {
    router.push("/assets/create");
  };

  const handleAssetPress = (assetId: string) => {
    router.push(`/assets/${assetId}`);
  };

  const renderAssetItem = ({ item }: { item: Asset }) => (
    <TouchableOpacity
      className="bg-white rounded-xl p-4 mb-4 shadow-md"
      onPress={() => handleAssetPress(item.id)}
      style={{ elevation: 2 }}
    >
      <View className="flex-row justify-between items-start">
        <View className="flex-row items-center">
          <View className="bg-blue-100 p-2 rounded-full mr-3">
            {getAssetTypeIcon(item.type)}
          </View>
          <View className="flex-1">
            <Text className="font-bold text-lg text-gray-800">{item.name}</Text>
            <Text className="text-gray-500">{item.model}</Text>
          </View>
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
            <Building2 size={14} color="#4b5563" />
            <Text className="text-gray-500 text-sm ml-1">
              {item.location_name}
            </Text>
          </View>

          <View className="flex-row items-center">
            <Calendar size={14} color="#4b5563" />
            <Text className="text-gray-500 text-sm ml-1">
              {item.next_maintenance
                ? `Maintenance: ${formatDate(item.next_maintenance)}`
                : "No maintenance scheduled"}
            </Text>
          </View>
        </View>

        {item.serial_number && (
          <Text className="text-gray-500 text-xs mt-2">
            S/N: {item.serial_number}
          </Text>
        )}
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      <StatusBar style="auto" />

      {/* Header */}
      <View className="flex-row justify-between items-center px-5 py-4 bg-gradient-to-r from-blue-700 to-blue-900 shadow-lg">
        <Text className="text-2xl font-bold text-white">Asset Management</Text>
        <View className="flex-row">
          <TouchableOpacity
            className="bg-blue-800 p-2 rounded-full mr-3"
            onPress={() => setShowFilters(!showFilters)}
          >
            <Filter size={22} color="white" />
          </TouchableOpacity>
          <TouchableOpacity
            className="bg-blue-800 p-2 rounded-full mr-3"
            onPress={() => router.push("/notifications")}
          >
            <NotificationBadge color="white" />
          </TouchableOpacity>
          <TouchableOpacity
            className="bg-green-600 p-2 rounded-full"
            onPress={handleAddAsset}
          >
            <Plus size={22} color="white" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Search and Filters */}
      <View className="p-4 bg-white shadow-sm">
        <View className="flex-row items-center bg-gray-100 rounded-xl px-4 py-3 mb-4">
          <Search size={20} color="#4b5563" />
          <TextInput
            className="flex-1 ml-3 py-1 text-base"
            placeholder="Search assets..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholderTextColor="#9ca3af"
          />
        </View>

        {showFilters && (
          <View className="mb-4">
            <Text className="text-gray-700 mb-2 font-medium">Asset Type</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {assetTypes.map((type) => (
                <TouchableOpacity
                  key={type}
                  className={`px-4 py-2 mr-2 rounded-lg flex-row items-center ${selectedType === type ? "bg-blue-600" : "bg-gray-200"}`}
                  onPress={() => setSelectedType(type)}
                >
                  <Tag
                    size={14}
                    color={selectedType === type ? "white" : "#4b5563"}
                    className="mr-1"
                  />
                  <Text
                    className={
                      selectedType === type
                        ? "text-white font-medium"
                        : "text-gray-700"
                    }
                  >
                    {type}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <Text className="text-gray-700 mb-2 mt-4 font-medium">Status</Text>
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
          </View>
        )}
      </View>

      {/* Asset List */}
      <View className="flex-1 px-4 pt-4">
        {loading ? (
          <View className="flex-1 justify-center items-center">
            <ActivityIndicator size="large" color="#1e40af" />
            <Text className="mt-2 text-gray-600">Loading assets...</Text>
          </View>
        ) : filteredAssets.length > 0 ? (
          <FlatList
            data={filteredAssets}
            renderItem={renderAssetItem}
            keyExtractor={(item) => item.id}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: 20 }}
            refreshing={loading}
            onRefresh={fetchAssets}
          />
        ) : (
          <View className="flex-1 justify-center items-center">
            <Laptop size={48} color="#9ca3af" />
            <Text className="mt-4 text-gray-500 text-center">
              No assets found
            </Text>
            <TouchableOpacity
              className="mt-4 bg-blue-600 px-4 py-2 rounded-lg"
              onPress={handleAddAsset}
            >
              <Text className="text-white font-medium">Add New Asset</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* Bottom Navigation */}
      <View className="flex-row justify-around items-center py-3 px-2 bg-white border-t border-gray-200 shadow-lg">
        <TouchableOpacity
          className="items-center flex-1"
          onPress={() => router.push("/")}
        >
          <Text className="text-xs text-gray-500">Dashboard</Text>
        </TouchableOpacity>
        <TouchableOpacity
          className="items-center flex-1"
          onPress={() => router.push("/assets")}
        >
          <Text className="text-xs text-blue-600 font-medium">Assets</Text>
        </TouchableOpacity>
        <TouchableOpacity
          className="items-center flex-1"
          onPress={() => router.push("/equipment")}
        >
          <Text className="text-xs text-gray-500">Equipment</Text>
        </TouchableOpacity>
        <TouchableOpacity
          className="items-center flex-1"
          onPress={() => router.push("/reports")}
        >
          <Text className="text-xs text-gray-500">Reports</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}
