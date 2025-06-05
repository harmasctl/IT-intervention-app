import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  FlatList,
  ActivityIndicator,
  Modal,
  Alert,
  ScrollView,
  Switch,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { useRouter } from "expo-router";
import {
  Plus,
  Search,
  Filter,
  Package,
  ChevronRight,
  ArrowDownUp,
  Camera,
  Warehouse,
  Tag,
  ArrowUp,
  DollarSign,
  Barcode,
  AlertCircle,
  Clock,
  Info,
} from "lucide-react-native";
import { supabase } from "../../lib/supabase";
import AddEquipmentForm from "../../components/AddEquipmentForm";
import EquipmentMovementForm from "../../components/EquipmentMovementForm";
import BarcodeScanner from "../../components/BarcodeScanner";
import EquipmentTabs from "../../components/EquipmentTabs";
import { Image } from "expo-image";
import { formatCurrency } from "../../lib/utils";

type EquipmentItem = {
  id: string;
  name: string;
  type: string;
  stock_level: number;
  supplier: string | null;
  warehouse_location: string | null;
  notes?: string | null;
  image_url?: string | null;
  created_at?: string;
  updated_at?: string;
  min_stock_level?: number;
  max_stock_level?: number;
  cost?: number;
  description?: string;
  sku?: string;
  barcode?: string;
  is_critical?: boolean;
  barcode_id?: string | null;
};

export default function EquipmentInventoryScreen() {
  const router = useRouter();
  const [equipment, setEquipment] = useState<EquipmentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedType, setSelectedType] = useState("All");
  const [showAddEquipmentForm, setShowAddEquipmentForm] = useState(false);
  const [showMovementForm, setShowMovementForm] = useState(false);
  const [showBarcodeScanner, setShowBarcodeScanner] = useState(false);
  const [scanMode, setScanMode] = useState<"equipment" | "stock">("equipment");
  const [selectedEquipment, setSelectedEquipment] =
    useState<EquipmentItem | null>(null);
  const [showLowStockOnly, setShowLowStockOnly] = useState(false);
  const [selectedWarehouse, setSelectedWarehouse] = useState<string | null>(
    null,
  );
  const [warehouseLocations, setWarehouseLocations] = useState<string[]>([]);
  const [sortBy, setSortBy] = useState<"name" | "stock_level" | "cost">("name");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");
  const [filteredEquipment, setFilteredEquipment] = useState<EquipmentItem[]>([]);
  const [showFilters, setShowFilters] = useState(false);
  const [equipmentTypes, setEquipmentTypes] = useState<string[]>(["All"]);
  const [warehouseDistribution, setWarehouseDistribution] = useState<{[key: string]: {[key: string]: number}}>({});

  useEffect(() => {
    fetchEquipment();
    fetchWarehouses();
    fetchEquipmentTypes();

    // Set up real-time subscription for equipment changes
    const equipmentSubscription = supabase
      .channel("equipment-changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "equipment_inventory" },
        (payload) => {
          console.log("Equipment change received:", payload);
          fetchEquipment();
        },
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "equipment_movements" },
        (payload) => {
          console.log("Movement change received:", payload);
          fetchEquipment();
        },
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "suppliers" },
        (payload) => {
          console.log("Supplier change received:", payload);
          // Refresh if needed
        },
      )
      .subscribe();

    return () => {
      equipmentSubscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    filterEquipment();
  }, [equipment, searchQuery, selectedType, showLowStockOnly, selectedWarehouse, sortBy, sortOrder]);

  const fetchWarehouses = async () => {
    try {
      const { data, error } = await supabase
        .from("warehouses")
        .select("name")
        .order("name");

      if (error) throw error;

      if (data) {
        setWarehouseLocations(data.map(w => w.name));
      }
    } catch (error) {
      console.error("Error fetching warehouses:", error);
    }
  };

  const fetchEquipmentTypes = async () => {
    try {
      const { data, error } = await supabase
        .from("equipment_types")
        .select("name")
        .order("name");

      if (error) throw error;

      if (data) {
        setEquipmentTypes(["All", ...data.map(t => t.name)]);
      }
    } catch (error) {
      console.error("Error fetching equipment types:", error);
    }
  };

  const fetchEquipment = useCallback(async () => {
    try {
      setLoading(true);

      const { data, error } = await supabase
        .from("equipment_inventory")
        .select("*")
        .order("name");

      if (error) throw error;

      if (data && data.length > 0) {
        setEquipment(data as EquipmentItem[]);
        calculateWarehouseDistribution(data as EquipmentItem[]);
      } else {
        setEquipment([]);
        setWarehouseDistribution({});
      }
    } catch (error) {
      console.error("Error fetching equipment:", error);
      Alert.alert("Error", "Failed to load equipment inventory");
      setEquipment([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const calculateWarehouseDistribution = (equipmentData: EquipmentItem[]) => {
    const distribution: {[key: string]: {[key: string]: number}} = {};

    equipmentData.forEach(item => {
      if (!distribution[item.name]) {
        distribution[item.name] = {};
      }

      const warehouse = item.warehouse_location || 'Unassigned';
      distribution[item.name][warehouse] = (distribution[item.name][warehouse] || 0) + item.stock_level;
    });

    setWarehouseDistribution(distribution);
  };

  const filterEquipment = () => {
    let filtered = [...equipment];

    // Apply search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        item =>
          item.name.toLowerCase().includes(query) ||
          item.description?.toLowerCase().includes(query) ||
          item.sku?.toLowerCase().includes(query) ||
          item.barcode?.toLowerCase().includes(query)
      );
    }

    // Apply type filter
    if (selectedType !== "All") {
      filtered = filtered.filter(item => item.type === selectedType);
    }

    // Apply low stock filter
    if (showLowStockOnly) {
      filtered = filtered.filter(
        item => item.stock_level <= (item.min_stock_level || 5)
      );
    }

    // Apply warehouse filter
    if (selectedWarehouse) {
      filtered = filtered.filter(
        item => item.warehouse_location === selectedWarehouse
      );
    }

    // Apply sorting
    filtered.sort((a, b) => {
      if (sortBy === "name") {
        return sortOrder === "asc"
          ? a.name.localeCompare(b.name)
          : b.name.localeCompare(a.name);
      } else if (sortBy === "stock_level") {
        return sortOrder === "asc"
          ? a.stock_level - b.stock_level
          : b.stock_level - a.stock_level;
      } else if (sortBy === "cost") {
        const aCost = a.cost || 0;
        const bCost = b.cost || 0;
        return sortOrder === "asc" ? aCost - bCost : bCost - aCost;
      }
      return 0;
    });

    setFilteredEquipment(filtered);
  };

  const handleAddEquipment = () => {
    setShowAddEquipmentForm(true);
  };

  const handleScanBarcode = (mode: "equipment" | "stock") => {
    setScanMode(mode);
    setShowBarcodeScanner(true);
  };

  const handleRefresh = () => {
    setLoading(true);
    fetchEquipment();
  };

  const handleBarcodeScan = async (data: string) => {
    setShowBarcodeScanner(false);

    try {
      // Try to find the item by barcode in Supabase or local state
      const foundItem = equipment.find(
        (item) => item.id === data || item.barcode === data || item.barcode_id === data,
      );

      if (foundItem) {
        setSelectedEquipment(foundItem);

        if (scanMode === "stock") {
          // For quick stock out
          Alert.alert(
            "Stock Action",
            `${foundItem.name} found. What would you like to do?`,
            [
              { text: "Cancel", style: "cancel" },
              {
                text: "Quick Stock Out",
                style: "destructive",
                onPress: () => handleQuickStockOut(foundItem),
              },
              {
                text: "Manage Stock",
                onPress: () => {
                  setSelectedEquipment(foundItem);
                  setShowMovementForm(true);
                },
              },
            ],
          );
        } else {
          setShowMovementForm(true);
        }
        return;
      }

      // If not found locally, try Supabase
      const { data: equipmentData, error } = await supabase
        .from("equipment_inventory")
        .select("*")
        .or(`id.eq.${data},barcode.eq.${data},barcode_id.eq.${data}`)
        .single();

      if (error) {
        // If not found in database, offer to create new
        if (scanMode === "equipment") {
          Alert.alert(
            "Equipment Not Found",
            "No equipment found with this barcode. Would you like to add it?",
            [
              { text: "Cancel", style: "cancel" },
              {
                text: "Add New",
                onPress: () => {
                  handleAddEquipment();
                },
              },
            ],
          );
        } else {
          Alert.alert("Error", "No equipment found with this barcode");
        }
        return;
      }

      setSelectedEquipment(equipmentData as EquipmentItem);

      if (scanMode === "stock") {
        Alert.alert(
          "Stock Action",
          `${equipmentData.name} found. What would you like to do?`,
          [
            { text: "Cancel", style: "cancel" },
            {
              text: "Quick Stock Out",
              style: "destructive",
              onPress: () => handleQuickStockOut(equipmentData as EquipmentItem),
            },
            {
              text: "Manage Stock",
              onPress: () => {
                setSelectedEquipment(equipmentData as EquipmentItem);
                setShowMovementForm(true);
              },
            },
          ],
        );
      } else {
        setShowMovementForm(true);
      }
    } catch (error) {
      console.error("Error scanning barcode:", error);
      Alert.alert("Error", "Failed to process barcode");
    }
  };

  const handleQuickStockOut = async (item: EquipmentItem) => {
    try {
      // Decrease stock by 1
      const newStockLevel = Math.max(0, item.stock_level - 1);

      const { error } = await supabase
        .from("equipment_inventory")
        .update({ stock_level: newStockLevel })
        .eq("id", item.id);

      if (error) throw error;

      // Log the movement
      await supabase.from("equipment_movements").insert([
        {
          equipment_id: item.id,
          quantity: 1,
          movement_type: "out",
          notes: "Quick stock out via scanner",
          previous_level: item.stock_level,
          new_level: newStockLevel,
        },
      ]);

      // Check if we need to alert about low stock
      if (newStockLevel <= (item.min_stock_level || 5)) {
        // Create notification for low stock
        await supabase.from("notifications").insert([
          {
            title: "Low Stock Alert",
            message: `${item.name} is running low (${newStockLevel} remaining)`,
            type: "low_stock",
            related_id: item.id,
            related_type: "equipment",
          },
        ]);

        Alert.alert(
          "Low Stock Warning",
          `${item.name} is now below minimum stock level (${newStockLevel} remaining)`
        );
      } else {
        Alert.alert(
          "Stock Updated",
          `${item.name} stock reduced to ${newStockLevel}`
        );
      }

      // Refresh equipment list
      fetchEquipment();
    } catch (error) {
      console.error("Error updating stock:", error);
      Alert.alert("Error", "Failed to update stock level");
    }
  };

  const toggleSort = (field: "name" | "stock_level" | "cost") => {
    if (sortBy === field) {
      // Toggle order if already sorting by this field
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      // Set new sort field and default to ascending
      setSortBy(field);
      setSortOrder("asc");
    }
  };

  const handleEquipmentPress = (equipmentId: string) => {
    const item = equipment.find((e) => e.id === equipmentId);
    if (item) {
      setSelectedEquipment(item);
      setShowMovementForm(true);
    }
  };

  const getStockLevelColor = (item: EquipmentItem) => {
    if (item.stock_level <= 0) return "#ef4444"; // Red for out of stock
    if (item.stock_level <= (item.min_stock_level || 5)) return "#f59e0b"; // Yellow for low stock
    if (item.max_stock_level && item.stock_level >= item.max_stock_level)
      return "#3b82f6"; // Blue for overstocked
    return "#10b981"; // Green for normal stock
  };

  const getStockLevelBgColor = (item: EquipmentItem) => {
    if (item.stock_level <= 0) return "#fee2e2"; // Light red for out of stock
    if (item.stock_level <= (item.min_stock_level || 5)) return "#fef3c7"; // Light yellow for low stock
    if (item.max_stock_level && item.stock_level >= item.max_stock_level)
      return "#dbeafe"; // Light blue for overstocked
    return "#d1fae5"; // Light green for normal stock
  };

  const getStockLevelText = (item: EquipmentItem) => {
    if (item.stock_level <= 0) return "Out of Stock";
    if (item.stock_level <= (item.min_stock_level || 5)) return "Low Stock";
    if (item.max_stock_level && item.stock_level >= item.max_stock_level)
      return "Overstocked";
    return "In Stock";
  };

  const renderEquipmentItem = ({ item }: { item: EquipmentItem }) => (
    <TouchableOpacity
      className="bg-white rounded-xl p-4 mb-4 shadow-sm"
      onPress={() => router.push(`/equipment/details/${item.id}`)}
    >
      <View className="flex-row">
        {/* Item Image or Icon */}
        <View className="mr-3 rounded-lg overflow-hidden">
          {item.image_url ? (
            <Image
              source={{ uri: item.image_url }}
              className="w-20 h-20 rounded-lg"
              contentFit="cover"
            />
          ) : (
            <View className="w-20 h-20 bg-gray-100 rounded-lg items-center justify-center">
              <Package size={32} color="#9ca3af" />
            </View>
          )}
        </View>

        {/* Item Details */}
        <View className="flex-1">
          <View className="flex-row justify-between items-start">
            <View className="flex-1">
              <Text className="font-bold text-lg text-gray-800">{item.name}</Text>
              <View className="flex-row items-center">
                <Tag size={14} color="#6b7280" />
                <Text className="text-gray-500 text-sm ml-1">{item.type}</Text>
              </View>
              {item.sku && (
                <View className="flex-row items-center mt-1">
                  <Info size={14} color="#6b7280" />
                  <Text className="text-gray-500 text-sm ml-1">SKU: {item.sku}</Text>
                </View>
              )}
            </View>
            <ChevronRight size={20} color="#9ca3af" />
          </View>

          {/* Stock Level and Cost */}
          <View className="flex-row justify-between items-center mt-2">
            <View
              className="px-3 py-1 rounded-full flex-row items-center"
              style={{ backgroundColor: getStockLevelBgColor(item) }}
            >
              <Text
                className="font-medium text-sm"
                style={{ color: getStockLevelColor(item) }}
              >
                {getStockLevelText(item)}: {item.stock_level}
              </Text>
            </View>
            {item.cost && (
              <View className="flex-row items-center">
                <DollarSign size={14} color="#6b7280" />
                <Text className="text-gray-700 font-medium">
                  {formatCurrency(item.cost)}
                </Text>
              </View>
            )}
          </View>

          {/* Location */}
          {item.warehouse_location && (
            <View className="flex-row items-center mt-1">
              <Warehouse size={14} color="#6b7280" />
              <Text className="text-gray-500 text-sm ml-1">
                {item.warehouse_location}
              </Text>
            </View>
          )}

          {/* Warehouse Distribution */}
          {warehouseDistribution[item.name] && Object.keys(warehouseDistribution[item.name]).length > 1 && (
            <View className="mt-2">
              <Text className="text-gray-500 text-xs mb-1">Distribution:</Text>
              <View className="flex-row flex-wrap">
                {Object.entries(warehouseDistribution[item.name])
                  .filter(([warehouse, count]) => count > 0)
                  .map(([warehouse, count]) => (
                  <View key={warehouse} className="bg-blue-50 px-2 py-1 rounded mr-2 mb-1">
                    <Text className="text-blue-700 text-xs">{warehouse}: {count}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      <StatusBar style="auto" />

      {/* Header */}
      <View className="bg-gradient-to-r from-blue-700 to-blue-900 px-5 py-4 shadow-lg">
        <View className="flex-row justify-between items-center">
          <Text className="text-2xl font-bold text-white">Equipment</Text>
          <View className="flex-row">
            <TouchableOpacity
              className="bg-blue-800 p-2 rounded-full mr-2"
              onPress={() => setShowFilters(!showFilters)}
            >
              <Filter size={22} color="white" />
            </TouchableOpacity>
            <TouchableOpacity
              className="bg-green-600 p-2 rounded-full"
              onPress={handleAddEquipment}
            >
              <Plus size={22} color="white" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Search Bar */}
        <View className="flex-row items-center bg-white rounded-xl mt-4 px-4 py-2">
          <Search size={20} color="#4b5563" />
          <TextInput
            className="flex-1 ml-2 text-base"
            placeholder="Search equipment..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholderTextColor="#9ca3af"
          />
        </View>

        {/* Filter Panel */}
        {showFilters && (
          <View className="bg-white rounded-xl mt-4 p-4">
            <Text className="font-medium text-gray-700 mb-2">Filters</Text>

            {/* Type Filter */}
            <Text className="text-sm text-gray-500 mb-2">Equipment Type</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              className="mb-4"
            >
              {equipmentTypes.map((type) => (
                <TouchableOpacity
                  key={type}
                  className={`px-4 py-2 mr-2 rounded-lg ${
                    selectedType === type
                      ? "bg-blue-100 border border-blue-500"
                      : "bg-gray-100"
                  }`}
                  onPress={() => setSelectedType(type)}
                >
                  <Text
                    className={
                      selectedType === type
                        ? "text-blue-700 font-medium"
                        : "text-gray-700"
                    }
                  >
                    {type}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            {/* Warehouse Filter */}
            <Text className="text-sm text-gray-500 mb-2">Warehouse Location</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              className="mb-4"
            >
              <TouchableOpacity
                className={`px-4 py-2 mr-2 rounded-lg ${
                  selectedWarehouse === null
                    ? "bg-blue-100 border border-blue-500"
                    : "bg-gray-100"
                }`}
                onPress={() => setSelectedWarehouse(null)}
              >
                <Text
                  className={
                    selectedWarehouse === null
                      ? "text-blue-700 font-medium"
                      : "text-gray-700"
                  }
                >
                  All
                </Text>
              </TouchableOpacity>
              {warehouseLocations.map((location) => (
                <TouchableOpacity
                  key={location}
                  className={`px-4 py-2 mr-2 rounded-lg ${
                    selectedWarehouse === location
                      ? "bg-blue-100 border border-blue-500"
                      : "bg-gray-100"
                  }`}
                  onPress={() => setSelectedWarehouse(location)}
                >
                  <Text
                    className={
                      selectedWarehouse === location
                        ? "text-blue-700 font-medium"
                        : "text-gray-700"
                    }
                  >
                    {location}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            {/* Low Stock Toggle */}
            <View className="flex-row items-center justify-between mb-4">
              <View className="flex-row items-center">
                <AlertCircle size={18} color={showLowStockOnly ? "#f59e0b" : "#9ca3af"} />
                <Text className="ml-2 text-gray-700">Show Low Stock Only</Text>
              </View>
              <Switch
                value={showLowStockOnly}
                onValueChange={setShowLowStockOnly}
                trackColor={{ false: "#d1d5db", true: "#bfdbfe" }}
                thumbColor={showLowStockOnly ? "#3b82f6" : "#9ca3af"}
              />
            </View>

            {/* Sort Options */}
            <Text className="text-sm text-gray-500 mb-2">Sort By</Text>
            <View className="flex-row mb-2">
              <TouchableOpacity
                className={`flex-row items-center px-4 py-2 mr-2 rounded-lg ${
                  sortBy === "name" ? "bg-blue-100 border border-blue-500" : "bg-gray-100"
                }`}
                onPress={() => toggleSort("name")}
              >
                <Text
                  className={
                    sortBy === "name" ? "text-blue-700 font-medium" : "text-gray-700"
                  }
                >
                  Name
                </Text>
                {sortBy === "name" && (
                  <ArrowDownUp
                    size={16}
                    color="#3b82f6"
                    className="ml-1"
                    style={{ transform: [{ rotate: sortOrder === "desc" ? "180deg" : "0deg" }] }}
                  />
                )}
              </TouchableOpacity>

              <TouchableOpacity
                className={`flex-row items-center px-4 py-2 mr-2 rounded-lg ${
                  sortBy === "stock_level" ? "bg-blue-100 border border-blue-500" : "bg-gray-100"
                }`}
                onPress={() => toggleSort("stock_level")}
              >
                <Text
                  className={
                    sortBy === "stock_level" ? "text-blue-700 font-medium" : "text-gray-700"
                  }
                >
                  Stock Level
                </Text>
                {sortBy === "stock_level" && (
                  <ArrowDownUp
                    size={16}
                    color="#3b82f6"
                    className="ml-1"
                    style={{ transform: [{ rotate: sortOrder === "desc" ? "180deg" : "0deg" }] }}
                  />
                )}
              </TouchableOpacity>

              <TouchableOpacity
                className={`flex-row items-center px-4 py-2 rounded-lg ${
                  sortBy === "cost" ? "bg-blue-100 border border-blue-500" : "bg-gray-100"
                }`}
                onPress={() => toggleSort("cost")}
              >
                <Text
                  className={
                    sortBy === "cost" ? "text-blue-700 font-medium" : "text-gray-700"
                  }
                >
                  Cost
                </Text>
                {sortBy === "cost" && (
                  <ArrowDownUp
                    size={16}
                    color="#3b82f6"
                    className="ml-1"
                    style={{ transform: [{ rotate: sortOrder === "desc" ? "180deg" : "0deg" }] }}
                  />
                )}
              </TouchableOpacity>
            </View>
          </View>
        )}
      </View>

      {/* Equipment Tabs */}
      <EquipmentTabs activeTab="inventory" />

      {/* Enhanced Action Buttons */}
      <View className="px-4 py-3 bg-white">
        <View className="flex-row mb-3">
          <TouchableOpacity
            className="flex-1 flex-row items-center justify-center bg-blue-600 p-3 rounded-xl mr-2"
            onPress={() => router.push("/equipment/scan")}
          >
            <Barcode size={20} color="white" />
            <Text className="text-white font-medium ml-2">Scan Equipment</Text>
          </TouchableOpacity>

        </View>

        <View className="flex-row">
          <TouchableOpacity
            className="flex-1 flex-row items-center justify-center bg-green-600 p-3 rounded-xl mr-2"
            onPress={() => router.push("/equipment/bulk-movement")}
          >
            <Package size={20} color="white" />
            <Text className="text-white font-medium ml-2">Bulk Movement</Text>
          </TouchableOpacity>
          <TouchableOpacity
            className="flex-1 flex-row items-center justify-center bg-purple-600 p-3 rounded-xl ml-2"
            onPress={() => router.push("/equipment/reports")}
          >
            <Info size={20} color="white" />
            <Text className="text-white font-medium ml-2">Reports</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Equipment List */}
      {loading ? (
        <View className="flex-1 justify-center items-center">
          <ActivityIndicator size="large" color="#1e40af" />
        </View>
      ) : filteredEquipment.length > 0 ? (
        <FlatList
          data={filteredEquipment}
          renderItem={renderEquipmentItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ padding: 16 }}
          showsVerticalScrollIndicator={false}
        />
      ) : (
        <View className="flex-1 justify-center items-center p-4">
          <Package size={48} color="#9ca3af" />
          <Text className="mt-4 text-gray-500 text-lg text-center">
            No equipment found
          </Text>
          <TouchableOpacity
            className="mt-4 bg-blue-600 px-6 py-3 rounded-xl"
            onPress={handleAddEquipment}
          >
            <Text className="text-white font-medium">Add New Equipment</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Add Equipment Modal */}
      <Modal
        visible={showAddEquipmentForm}
        animationType="slide"
        transparent={false}
        onRequestClose={() => setShowAddEquipmentForm(false)}
      >
        <AddEquipmentForm
          onCancel={() => setShowAddEquipmentForm(false)}
          onSuccess={() => {
            setShowAddEquipmentForm(false);
            fetchEquipment();
          }}
        />
      </Modal>

      {/* Movement Modal */}
      <Modal
        visible={showMovementForm}
        animationType="slide"
        transparent={false}
        onRequestClose={() => setShowMovementForm(false)}
      >
        {selectedEquipment && (
          <EquipmentMovementForm
            equipment={selectedEquipment}
            onCancel={() => {
              setShowMovementForm(false);
              setSelectedEquipment(null);
            }}
            onSuccess={() => {
              setShowMovementForm(false);
              setSelectedEquipment(null);
              fetchEquipment();
            }}
          />
        )}
      </Modal>

      {/* Barcode Scanner Modal */}
      <Modal
        visible={showBarcodeScanner}
        animationType="slide"
        transparent={false}
        onRequestClose={() => setShowBarcodeScanner(false)}
      >
        <BarcodeScanner
          onClose={() => setShowBarcodeScanner(false)}
          onScan={(data, type) => handleBarcodeScan(data)}
        />
      </Modal>
    </SafeAreaView>
  );
}
