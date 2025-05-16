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
} from "lucide-react-native";
import { supabase } from "../../lib/supabase";
import AddEquipmentForm from "../../components/AddEquipmentForm";
import EquipmentMovementForm from "../../components/EquipmentMovementForm";
import BarcodeScanner from "../../components/BarcodeScanner";
import EquipmentTabs from "../../components/EquipmentTabs";

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
  const [warehouseLocations, setWarehouseLocations] = useState<string[]>([
    "Main Warehouse",
    "Secondary Storage",
    "Kitchen Storage",
    "Repair Shop",
  ]);

  const equipmentTypes = [
    "All",
    "Spare Parts",
    "Tools",
    "Cleaning Supplies",
    "Electronics",
    "Other",
  ];

  useEffect(() => {
    fetchEquipment();

    // Set up real-time subscription for equipment changes
    const equipmentSubscription = supabase
      .channel("equipment-changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "equipment" },
        (payload) => {
          console.log("Equipment change received:", payload);
          fetchEquipment();
        },
      )
      .subscribe();

    return () => {
      equipmentSubscription.unsubscribe();
    };
  }, []);

  const fetchEquipment = useCallback(async () => {
    try {
      setLoading(true);

      const { data, error } = await supabase
        .from("equipment")
        .select("*")
        .order("name");

      if (error) throw error;

      if (data && data.length > 0) {
        setEquipment(data as EquipmentItem[]);
      } else {
        setEquipment([]);
      }
    } catch (error) {
      console.error("Error fetching equipment:", error);
      Alert.alert("Error", "Failed to load equipment inventory");
      setEquipment([]);
    } finally {
      setLoading(false);
    }
  }, []);

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
        (item) => item.id === data || item.barcode_id === data,
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
        .from("equipment")
        .select("*")
        .or(`id.eq.${data},barcode_id.eq.${data}`)
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
          // For stock scanning mode
          Alert.alert(
            "Stock Item Not Found",
            "No stock item found with this barcode.",
            [{ text: "OK" }],
          );
        }
        return;
      }

      // If found in database
      if (equipmentData) {
        setSelectedEquipment(equipmentData as EquipmentItem);

        if (scanMode === "stock") {
          // For quick stock out
          Alert.alert(
            "Stock Action",
            `${equipmentData.name} found. What would you like to do?`,
            [
              { text: "Cancel", style: "cancel" },
              {
                text: "Quick Stock Out",
                style: "destructive",
                onPress: () =>
                  handleQuickStockOut(equipmentData as EquipmentItem),
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
      }
    } catch (error) {
      console.error("Error scanning barcode:", error);
      Alert.alert("Error", "Failed to process barcode scan");
    }
  };

  const handleQuickStockOut = async (item: EquipmentItem) => {
    try {
      if (item.stock_level <= 0) {
        Alert.alert("Error", "Item is already out of stock");
        return;
      }

      // Update the stock level
      const newStockLevel = item.stock_level - 1;

      const { error: updateError } = await supabase
        .from("equipment")
        .update({ stock_level: newStockLevel })
        .eq("id", item.id);

      if (updateError) throw updateError;

      // Record the movement
      const movementRecord = {
        equipment_id: item.id,
        movement_type: "out",
        quantity: 1,
        reason: "Quick stock out via scanner",
        destination: "Quick scan checkout",
        previous_stock: item.stock_level,
        new_stock: newStockLevel,
        timestamp: new Date().toISOString(),
      };

      const { error: movementError } = await supabase
        .from("equipment_movements")
        .insert([movementRecord]);

      if (movementError) throw movementError;

      // Check if stock is now low
      const minStockLevel = item.min_stock_level || 5;
      if (newStockLevel <= minStockLevel) {
        // Create notification for low stock
        const notificationData = {
          title: "Low Stock Alert",
          message: `${item.name} is running low (${newStockLevel} remaining)`,
          type: "low_stock",
          related_id: item.id,
          related_type: "equipment",
          is_read: false,
          created_at: new Date().toISOString(),
        };

        await supabase.from("notifications").insert([notificationData]);
      }

      Alert.alert("Success", `1 unit of ${item.name} removed from stock`);
      fetchEquipment();
    } catch (error) {
      console.error("Error with quick stock out:", error);
      Alert.alert("Error", "Failed to update stock");
    }
  };

  const handleEquipmentPress = (equipmentId: string) => {
    const selected = equipment.find((item) => item.id === equipmentId);
    if (selected) {
      setSelectedEquipment(selected);
      setShowMovementForm(true);
    }
  };

  const filteredEquipment = equipment.filter((item) => {
    const matchesSearch =
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (item.supplier &&
        item.supplier.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (item.warehouse_location &&
        item.warehouse_location
          .toLowerCase()
          .includes(searchQuery.toLowerCase()));
    const matchesType = selectedType === "All" || item.type === selectedType;
    const matchesLowStock = showLowStockOnly
      ? item.stock_level <= (item.min_stock_level || 5)
      : true;
    const matchesWarehouse = selectedWarehouse
      ? item.warehouse_location === selectedWarehouse
      : true;
    return matchesSearch && matchesType && matchesLowStock && matchesWarehouse;
  });

  const getStockLevelColor = (item: EquipmentItem) => {
    const minLevel = item.min_stock_level || 5;
    if (item.stock_level <= 0) return "text-red-600";
    if (item.stock_level <= minLevel) return "text-yellow-600";
    return "text-green-600";
  };

  const getStockLevelBgColor = (item: EquipmentItem) => {
    const minLevel = item.min_stock_level || 5;
    if (item.stock_level <= 0) return "bg-red-100";
    if (item.stock_level <= minLevel) return "bg-amber-100";
    return "bg-green-100";
  };

  const renderEquipmentItem = ({ item }: { item: EquipmentItem }) => (
    <TouchableOpacity
      className="bg-white rounded-xl p-5 mb-4 shadow-md mx-1"
      onPress={() => handleEquipmentPress(item.id)}
      style={{ elevation: 2 }}
      activeOpacity={0.7}
    >
      <View className="flex-row justify-between items-start">
        <View className="flex-1">
          <View className="flex-row items-center">
            <Text className="font-bold text-lg text-gray-800">{item.name}</Text>
            {item.is_critical && (
              <View className="ml-2 bg-red-100 px-2 py-0.5 rounded-full">
                <Text className="text-red-700 text-xs font-medium">
                  Critical
                </Text>
              </View>
            )}
          </View>

          <View className="bg-blue-100 self-start px-3 py-1 rounded-full mt-1 mb-2">
            <Text className="text-blue-800 text-xs font-medium">
              {item.type}
            </Text>
          </View>

          <View className="flex-row items-center mt-2 bg-gray-50 p-2 rounded-lg">
            <Warehouse size={14} color="#4b5563" className="mr-1" />
            <Text className="text-gray-500 font-medium">Location: </Text>
            <Text className="text-gray-800 font-medium">
              {item.warehouse_location || "Not specified"}
            </Text>
          </View>

          <Text className="text-gray-500 text-sm mt-3">
            Supplier:{" "}
            <Text className="font-medium text-gray-700">
              {item.supplier || "Not specified"}
            </Text>
          </Text>

          {item.min_stock_level && (
            <Text className="text-gray-500 text-xs mt-1">
              Min stock level:{" "}
              <Text className="font-medium">{item.min_stock_level}</Text>
            </Text>
          )}
        </View>

        <View className="items-end">
          <View
            className={`px-4 py-3 rounded-xl ${getStockLevelBgColor(item)}`}
          >
            <Text className={`font-bold text-base ${getStockLevelColor(item)}`}>
              {item.stock_level} in stock
            </Text>
          </View>

          <View className="flex-row mt-3">
            <TouchableOpacity
              className="flex-row items-center bg-blue-100 px-3 py-2 rounded-lg mr-2"
              onPress={() => handleEquipmentPress(item.id)}
            >
              <ArrowDownUp size={14} color="#1e40af" />
              <Text className="text-blue-700 text-xs font-medium ml-1">
                Manage
              </Text>
            </TouchableOpacity>

            {item.stock_level > 0 && (
              <TouchableOpacity
                className="flex-row items-center bg-red-100 px-3 py-2 rounded-lg"
                onPress={() => handleQuickStockOut(item)}
              >
                <ArrowUp size={14} color="#b91c1c" />
                <Text className="text-red-700 text-xs font-medium ml-1">
                  Quick Out
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView className="flex-1 bg-white">
      <StatusBar style="auto" />

      {showAddEquipmentForm ? (
        <AddEquipmentForm
          onCancel={() => setShowAddEquipmentForm(false)}
          onSuccess={() => {
            setShowAddEquipmentForm(false);
            // In a real app, you would refresh the equipment list here
            fetchEquipment();
          }}
        />
      ) : showMovementForm && selectedEquipment ? (
        <EquipmentMovementForm
          equipment={selectedEquipment}
          onCancel={() => {
            setShowMovementForm(false);
            setSelectedEquipment(null);
          }}
          onSuccess={() => {
            setShowMovementForm(false);
            setSelectedEquipment(null);
            // In a real app, you would refresh the equipment list here
            fetchEquipment();
          }}
        />
      ) : (
        <>
          {/* Header */}
          <View className="flex-row justify-between items-center px-5 py-4 bg-gradient-to-r from-blue-700 to-blue-900 shadow-lg">
            <Text className="text-2xl font-bold text-white">
              Warehouse Stock
            </Text>
            <View className="flex-row">
              <TouchableOpacity
                className="bg-green-500 p-2.5 rounded-full mr-3 shadow-md"
                onPress={() => handleScanBarcode("equipment")}
              >
                <Camera size={22} color="white" />
              </TouchableOpacity>
              <TouchableOpacity
                className="bg-blue-500 p-2.5 rounded-full mr-3 shadow-md"
                onPress={handleAddEquipment}
              >
                <Plus size={22} color="white" />
              </TouchableOpacity>
              <TouchableOpacity
                className="bg-purple-500 p-2.5 rounded-full shadow-md"
                onPress={handleRefresh}
              >
                <ArrowDownUp size={22} color="white" />
              </TouchableOpacity>
            </View>
          </View>

          <View className="flex-1 bg-gray-100">
            {/* Search and Filter */}
            <View className="p-4 bg-white shadow-sm">
              <View className="flex-row items-center bg-gray-100 rounded-xl px-4 py-3 mb-4">
                <Search size={20} color="#4b5563" />
                <TextInput
                  className="flex-1 ml-3 py-1 text-base"
                  placeholder="Search stock items..."
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                  placeholderTextColor="#9ca3af"
                />
              </View>

              {/* Advanced Filters */}
              <View className="mb-4">
                <View className="flex-row justify-between items-center mb-2">
                  <Text className="text-gray-700 font-medium">
                    Show low stock only
                  </Text>
                  <Switch
                    trackColor={{ false: "#d1d5db", true: "#93c5fd" }}
                    thumbColor={showLowStockOnly ? "#3b82f6" : "#f4f4f5"}
                    onValueChange={() => setShowLowStockOnly(!showLowStockOnly)}
                    value={showLowStockOnly}
                  />
                </View>

                {warehouseLocations.length > 0 && (
                  <View className="mt-3">
                    <Text className="text-gray-700 mb-2 font-medium">
                      Filter by warehouse:
                    </Text>
                    <ScrollView
                      horizontal
                      showsHorizontalScrollIndicator={false}
                    >
                      <TouchableOpacity
                        className={`px-4 py-2 mr-2 rounded-lg ${selectedWarehouse === null ? "bg-blue-600" : "bg-gray-200"}`}
                        onPress={() => {
                          setSelectedWarehouse(null);
                        }}
                      >
                        <Text
                          className={
                            selectedWarehouse === null
                              ? "text-white"
                              : "text-gray-700"
                          }
                        >
                          All Locations
                        </Text>
                      </TouchableOpacity>
                      {warehouseLocations.map((location) => (
                        <TouchableOpacity
                          key={location}
                          className={`px-4 py-2 mr-2 rounded-lg flex-row items-center ${selectedWarehouse === location ? "bg-blue-600" : "bg-gray-200"}`}
                          onPress={() => {
                            setSelectedWarehouse(location);
                          }}
                        >
                          <Warehouse
                            size={14}
                            color={
                              selectedWarehouse === location
                                ? "white"
                                : "#4b5563"
                            }
                            className="mr-1"
                          />
                          <Text
                            className={
                              selectedWarehouse === location
                                ? "text-white"
                                : "text-gray-700"
                            }
                          >
                            {location}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  </View>
                )}
              </View>

              <View className="mb-2">
                <Text className="text-gray-700 mb-3 font-medium">
                  Filter by type:
                </Text>
                <FlatList
                  horizontal
                  data={equipmentTypes}
                  renderItem={({ item }) => (
                    <TouchableOpacity
                      className={`px-5 py-2.5 mr-3 rounded-full shadow-sm flex-row items-center ${selectedType === item ? "bg-blue-600" : "bg-white"}`}
                      onPress={() => setSelectedType(item)}
                      style={{ elevation: selectedType === item ? 3 : 1 }}
                    >
                      <Tag
                        size={14}
                        color={selectedType === item ? "white" : "#4b5563"}
                        className="mr-1"
                      />
                      <Text
                        className={
                          selectedType === item
                            ? "text-white font-medium"
                            : "text-gray-700"
                        }
                      >
                        {item}
                      </Text>
                    </TouchableOpacity>
                  )}
                  keyExtractor={(item) => item}
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={{ paddingBottom: 8 }}
                />
              </View>
            </View>

            {/* Equipment list */}
            <View className="flex-1 px-4">
              {loading ? (
                <View className="flex-1 justify-center items-center">
                  <ActivityIndicator size="large" color="#1e40af" />
                  <Text className="mt-2 text-gray-600">
                    Loading stock items...
                  </Text>
                </View>
              ) : filteredEquipment.length > 0 ? (
                <FlatList
                  data={filteredEquipment}
                  renderItem={renderEquipmentItem}
                  keyExtractor={(item) => item.id}
                  showsVerticalScrollIndicator={false}
                  refreshing={loading}
                  onRefresh={handleRefresh}
                  contentContainerStyle={{ paddingBottom: 20 }}
                />
              ) : (
                <View className="flex-1 justify-center items-center">
                  <Package size={48} color="#9ca3af" />
                  <Text className="mt-4 text-gray-500 text-center">
                    No stock items found
                  </Text>
                  <TouchableOpacity
                    className="mt-4 bg-blue-600 px-4 py-2 rounded-lg"
                    onPress={handleAddEquipment}
                  >
                    <Text className="text-white font-medium">
                      Add Stock Item
                    </Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          </View>

          {/* Bottom Tabs */}
          <EquipmentTabs activeTab="inventory" />
        </>
      )}

      {/* Barcode Scanner Modal */}
      <Modal
        visible={showBarcodeScanner}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setShowBarcodeScanner(false)}
      >
        <View style={{ flex: 1 }}>
          <BarcodeScanner
            onScan={handleBarcodeScan}
            onClose={() => setShowBarcodeScanner(false)}
            mode={scanMode}
          />
        </View>
      </Modal>
    </SafeAreaView>
  );
}
