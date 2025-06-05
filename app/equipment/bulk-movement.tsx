import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Alert,
  ActivityIndicator,
  Modal,
  FlatList,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { useRouter } from "expo-router";
import {
  ArrowLeft,
  ArrowRight,
  Search,
  Plus,
  Minus,
  X,
  Warehouse,
  Tag,
  Package,
  Save,
} from "lucide-react-native";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../../components/AuthProvider";
import EquipmentTabs from "../../components/EquipmentTabs";

type EquipmentItem = {
  id: string;
  name: string;
  type: string;
  stock_level: number;
  warehouse_location: string;
  supplier?: string;
  description?: string;
  sku?: string;
  cost?: number;
};

type MovementItem = {
  equipmentId: string;
  name: string;
  type: string;
  quantity: number;
  currentQuantity: number;
  sku?: string;
};

export default function BulkMovementScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [movementType, setMovementType] = useState<"in" | "out">("in");
  const [sourceWarehouse, setSourceWarehouse] = useState<string | null>(null);
  const [sourceWarehouseName, setSourceWarehouseName] = useState("");
  const [destinationWarehouse, setDestinationWarehouse] = useState<
    string | null
  >(null);
  const [destinationWarehouseName, setDestinationWarehouseName] = useState("");
  const [referenceNumber, setReferenceNumber] = useState("");
  const [notes, setNotes] = useState("");
  const [equipment, setEquipment] = useState<EquipmentItem[]>([]);
  const [filteredEquipment, setFilteredEquipment] = useState<EquipmentItem[]>(
    [],
  );
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedItems, setSelectedItems] = useState<MovementItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [showWarehouseModal, setShowWarehouseModal] = useState(false);
  const [warehouseModalType, setWarehouseModalType] = useState<
    "source" | "destination"
  >("source");
  const [warehouses, setWarehouses] = useState<any[]>([]);
  const [loadingWarehouses, setLoadingWarehouses] = useState(false);

  useEffect(() => {
    fetchEquipment();

    // Set up real-time subscription for equipment changes
    const subscription = supabase
      .channel("bulk-movement-equipment-changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "equipment_inventory" },
        (payload) => {
          console.log("Equipment change received:", payload);
          fetchEquipment();
        },
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [sourceWarehouse, sourceWarehouseName, movementType]);

  useEffect(() => {
    filterEquipment();
  }, [searchQuery, equipment]);

  const fetchWarehouses = async () => {
    try {
      setLoadingWarehouses(true);
      const { data, error } = await supabase
        .from("warehouses")
        .select("*")
        .order("name");

      if (error) throw error;

      if (data) {
        setWarehouses(data);
      }
    } catch (error) {
      console.error("Error fetching warehouses:", error);
      Alert.alert("Error", "Failed to load warehouses");
    } finally {
      setLoadingWarehouses(false);
    }
  };

  const fetchEquipment = async () => {
    try {
      setLoading(true);
      let query = supabase.from("equipment_inventory").select("*");

      // If source warehouse is selected for "out" movements, filter by warehouse name
      if (sourceWarehouseName && movementType === "out") {
        query = query.eq("warehouse_location", sourceWarehouseName);
      }

      const { data, error } = await query.order("name");

      if (error) throw error;

      if (data) {
        setEquipment(data as EquipmentItem[]);
        setFilteredEquipment(data as EquipmentItem[]);
      }
    } catch (error) {
      console.error("Error fetching equipment:", error);
      Alert.alert("Error", "Failed to load equipment inventory");
    } finally {
      setLoading(false);
    }
  };

  const filterEquipment = () => {
    if (!searchQuery) {
      setFilteredEquipment(equipment);
      return;
    }

    const query = searchQuery.toLowerCase();
    const filtered = equipment.filter(
      (item) =>
        item.name.toLowerCase().includes(query) ||
        item.type.toLowerCase().includes(query) ||
        item.sku?.toLowerCase().includes(query) ||
        item.description?.toLowerCase().includes(query),
    );

    setFilteredEquipment(filtered);
  };

  const handleSelectWarehouse = (warehouse: any) => {
    if (warehouseModalType === "source") {
      setSourceWarehouse(warehouse.id);
      setSourceWarehouseName(warehouse.name);
    } else {
      setDestinationWarehouse(warehouse.id);
      setDestinationWarehouseName(warehouse.name);
    }
    setShowWarehouseModal(false);
  };

  const openWarehouseModal = (type: "source" | "destination") => {
    setWarehouseModalType(type);
    fetchWarehouses();
    setShowWarehouseModal(true);
  };

  const addToSelected = (item: EquipmentItem) => {
    // Check if already selected
    const existingIndex = selectedItems.findIndex(
      (selected) => selected.equipmentId === item.id,
    );

    if (existingIndex >= 0) {
      Alert.alert(
        "Already Selected",
        "This item is already in your selection.",
      );
      return;
    }

    const newItem: MovementItem = {
      equipmentId: item.id,
      name: item.name,
      type: item.type,
      quantity: 1, // Default quantity
      currentQuantity: item.stock_level,
      sku: item.sku,
    };

    setSelectedItems([...selectedItems, newItem]);
  };

  const updateItemQuantity = (index: number, quantity: number) => {
    const item = selectedItems[index];

    // For outgoing movements, validate against current quantity
    if (movementType === "out" && quantity > item.currentQuantity) {
      Alert.alert(
        "Invalid Quantity",
        `Maximum available quantity is ${item.currentQuantity}`,
      );
      return;
    }

    const updatedItems = [...selectedItems];
    updatedItems[index] = { ...item, quantity };
    setSelectedItems(updatedItems);
  };

  const removeItem = (index: number) => {
    const updatedItems = [...selectedItems];
    updatedItems.splice(index, 1);
    setSelectedItems(updatedItems);
  };

  const handleSubmit = async () => {
    // Validate inputs
    if (movementType === "in" && !destinationWarehouse) {
      Alert.alert("Error", "Please select a destination warehouse");
      return;
    }

    if (movementType === "out" && !sourceWarehouse) {
      Alert.alert("Error", "Please select a source warehouse");
      return;
    }

    if (selectedItems.length === 0) {
      Alert.alert("Error", "Please select at least one item");
      return;
    }

    try {
      setSubmitting(true);

      // Create movement records and update inventory
      for (const item of selectedItems) {
        // Create movement record
        const { error: movementError } = await supabase
          .from("equipment_movements")
          .insert([
            {
              equipment_id: item.equipmentId,
              movement_type: movementType,
              quantity: item.quantity,
              reason: movementType === "in" ? "Bulk Stock In" : "Bulk Stock Out",
              destination: movementType === "in" && destinationWarehouseName ? destinationWarehouseName : null,
              notes: `${movementType === "in" ? "Bulk receive" : "Bulk dispatch"} - ${notes || "No notes"}`,
              previous_stock: item.currentQuantity,
              new_stock: movementType === "in"
                ? item.currentQuantity + item.quantity
                : item.currentQuantity - item.quantity,
              timestamp: new Date().toISOString(),
            },
          ]);

        if (movementError) throw movementError;

        // Update inventory quantity
        const newStockLevel = movementType === "in"
          ? item.currentQuantity + item.quantity
          : item.currentQuantity - item.quantity;

        const updateData: any = {
          stock_level: newStockLevel,
        };

        // If it's an "in" movement and destination warehouse is selected, update warehouse location
        if (movementType === "in" && destinationWarehouse) {
          const warehouse = warehouses.find(w => w.id === destinationWarehouse);
          if (warehouse) {
            updateData.warehouse_location = warehouse.name;
          }
        }

        const { error: updateError } = await supabase
          .from("equipment_inventory")
          .update(updateData)
          .eq("id", item.equipmentId);

        if (updateError) throw updateError;
      }

      Alert.alert(
        "Success",
        `Inventory ${movementType === "in" ? "received" : "dispatched"} successfully`,
        [{ text: "OK", onPress: () => router.replace("/equipment") }],
      );
    } catch (error) {
      console.error("Error processing inventory movement:", error);
      Alert.alert("Error", "Failed to process inventory movement");
    } finally {
      setSubmitting(false);
    }
  };

  const renderEquipmentItem = ({ item }: { item: EquipmentItem }) => (
    <TouchableOpacity
      className="bg-white rounded-lg p-3 mb-2 border border-gray-200"
      onPress={() => addToSelected(item)}
    >
      <View className="flex-row justify-between items-center">
        <View className="flex-1">
          <Text className="font-bold text-gray-800">{item.name}</Text>
          {item.sku && (
            <Text className="text-gray-500 text-sm">SKU: {item.sku}</Text>
          )}
          <Text className="text-gray-500 text-sm">Type: {item.type}</Text>
          <Text className="text-gray-500 text-sm">
            Available: {item.stock_level}
          </Text>
          {item.warehouse_location && (
            <Text className="text-gray-500 text-sm">Location: {item.warehouse_location}</Text>
          )}
        </View>
        <View className="bg-blue-100 p-2 rounded-full">
          <Plus size={18} color="#1e40af" />
        </View>
      </View>
    </TouchableOpacity>
  );

  const renderSelectedItem = ({
    item,
    index,
  }: {
    item: MovementItem;
    index: number;
  }) => (
    <View className="bg-white rounded-lg p-3 mb-2 border border-gray-200">
      <View className="flex-row justify-between items-start">
        <View className="flex-1">
          <Text className="font-bold text-gray-800">{item.name}</Text>
          {item.sku && (
            <Text className="text-gray-500 text-sm">SKU: {item.sku}</Text>
          )}
          <Text className="text-gray-500 text-sm">Type: {item.type}</Text>
          <Text className="text-gray-500 text-sm">
            Available: {item.currentQuantity}
          </Text>
        </View>
        <TouchableOpacity
          className="bg-red-100 p-2 rounded-full"
          onPress={() => removeItem(index)}
        >
          <X size={18} color="#ef4444" />
        </TouchableOpacity>
      </View>

      <View className="flex-row items-center mt-2">
        <Text className="text-gray-700 mr-2">Quantity:</Text>
        <TouchableOpacity
          className="bg-gray-200 p-1 rounded"
          onPress={() => {
            if (item.quantity > 1) {
              updateItemQuantity(index, item.quantity - 1);
            }
          }}
        >
          <Minus size={16} color="#4b5563" />
        </TouchableOpacity>
        <TextInput
          className="border border-gray-300 rounded px-2 mx-2 min-w-[40px] text-center"
          value={item.quantity.toString()}
          onChangeText={(text) => {
            const quantity = parseInt(text) || 0;
            updateItemQuantity(index, quantity);
          }}
          keyboardType="numeric"
        />
        <TouchableOpacity
          className="bg-gray-200 p-1 rounded"
          onPress={() => {
            if (
              movementType === "out" &&
              item.quantity >= item.currentQuantity
            ) {
              Alert.alert(
                "Maximum Reached",
                `Cannot exceed available quantity of ${item.currentQuantity}`,
              );
              return;
            }
            updateItemQuantity(index, item.quantity + 1);
          }}
        >
          <Plus size={16} color="#4b5563" />
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderWarehouseItem = ({ item }: { item: any }) => (
    <TouchableOpacity
      className="p-3 border-b border-gray-200"
      onPress={() => handleSelectWarehouse(item)}
    >
      <View className="flex-row items-center">
        <View className="bg-blue-100 p-2 rounded-full mr-3">
          <Warehouse size={20} color="#1e40af" />
        </View>
        <View>
          <Text className="font-bold text-gray-800">{item.name}</Text>
          {item.location && (
            <Text className="text-gray-500 text-sm">{item.location}</Text>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      <StatusBar style="auto" />

      {/* Header */}
      <View className="flex-row items-center px-5 py-4 bg-gradient-to-r from-blue-700 to-blue-900 shadow-lg">
        <TouchableOpacity onPress={() => router.back()} className="mr-4">
          <ArrowLeft size={24} color="white" />
        </TouchableOpacity>
        <Text className="text-2xl font-bold text-white flex-1">
          {movementType === "in" ? "Receive Inventory" : "Dispatch Inventory"}
        </Text>
      </View>

      {/* Movement Type Selector */}
      <View className="flex-row bg-white p-4 border-b border-gray-200">
        <TouchableOpacity
          className={`flex-1 py-2 rounded-l-lg ${movementType === "in" ? "bg-blue-600" : "bg-gray-200"}`}
          onPress={() => setMovementType("in")}
        >
          <Text
            className={`text-center font-medium ${movementType === "in" ? "text-white" : "text-gray-700"}`}
          >
            Receive (In)
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          className={`flex-1 py-2 rounded-r-lg ${movementType === "out" ? "bg-blue-600" : "bg-gray-200"}`}
          onPress={() => setMovementType("out")}
        >
          <Text
            className={`text-center font-medium ${movementType === "out" ? "text-white" : "text-gray-700"}`}
          >
            Dispatch (Out)
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView className="flex-1 p-4">
        {/* Warehouse Selection */}
        <View className="bg-white rounded-lg p-4 mb-4 shadow-sm">
          <Text className="text-lg font-bold text-gray-800 mb-3">
            Warehouse Information
          </Text>

          {movementType === "in" ? (
            <View>
              <Text className="text-gray-700 mb-1">
                Destination Warehouse *
              </Text>
              <TouchableOpacity
                className="flex-row justify-between items-center border border-gray-300 rounded-lg p-3 mb-4"
                onPress={() => openWarehouseModal("destination")}
              >
                <View className="flex-row items-center">
                  <Warehouse size={20} color="#6b7280" className="mr-2" />
                  <Text
                    className={
                      destinationWarehouse ? "text-gray-800" : "text-gray-400"
                    }
                  >
                    {destinationWarehouseName || "Select destination warehouse"}
                  </Text>
                </View>
                <ArrowRight size={18} color="#6b7280" />
              </TouchableOpacity>
            </View>
          ) : (
            <View>
              <Text className="text-gray-700 mb-1">Source Warehouse *</Text>
              <TouchableOpacity
                className="flex-row justify-between items-center border border-gray-300 rounded-lg p-3 mb-4"
                onPress={() => openWarehouseModal("source")}
              >
                <View className="flex-row items-center">
                  <Warehouse size={20} color="#6b7280" className="mr-2" />
                  <Text
                    className={
                      sourceWarehouse ? "text-gray-800" : "text-gray-400"
                    }
                  >
                    {sourceWarehouseName || "Select source warehouse"}
                  </Text>
                </View>
                <ArrowRight size={18} color="#6b7280" />
              </TouchableOpacity>
            </View>
          )}

          <View>
            <Text className="text-gray-700 mb-1">Reference Number</Text>
            <TextInput
              className="border border-gray-300 rounded-lg px-3 py-2 mb-4"
              placeholder="Enter reference number (optional)"
              value={referenceNumber}
              onChangeText={setReferenceNumber}
            />
          </View>

          <View>
            <Text className="text-gray-700 mb-1">Notes</Text>
            <TextInput
              className="border border-gray-300 rounded-lg px-3 py-2 h-20"
              placeholder="Enter notes (optional)"
              value={notes}
              onChangeText={setNotes}
              multiline
              textAlignVertical="top"
            />
          </View>
        </View>

        {/* Equipment Selection */}
        {(movementType === "in" && destinationWarehouse) ||
        (movementType === "out" && sourceWarehouse) ? (
          <View className="bg-white rounded-lg p-4 mb-4 shadow-sm">
            <Text className="text-lg font-bold text-gray-800 mb-3">
              Select Equipment
            </Text>

            {movementType === "out" && (
              <View className="mb-4">
                <View className="flex-row items-center bg-gray-100 rounded-lg px-3 py-2">
                  <Search size={20} color="#4b5563" />
                  <TextInput
                    className="flex-1 ml-2"
                    placeholder="Search equipment..."
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                  />
                </View>

                {loading ? (
                  <View className="py-4 items-center">
                    <ActivityIndicator size="small" color="#1e40af" />
                    <Text className="text-gray-500 mt-2">
                      Loading equipment...
                    </Text>
                  </View>
                ) : filteredEquipment.length > 0 ? (
                  <View className="mt-3 max-h-60">
                    <FlatList
                      data={filteredEquipment}
                      renderItem={renderEquipmentItem}
                      keyExtractor={(item) => item.id}
                      nestedScrollEnabled
                    />
                  </View>
                ) : (
                  <View className="py-4 items-center">
                    <Package size={24} color="#9ca3af" />
                    <Text className="text-gray-500 mt-2">
                      No equipment found in this warehouse
                    </Text>
                  </View>
                )}
              </View>
            )}

            <Text className="font-bold text-gray-700 mb-2">
              {movementType === "in" ? "Items to Receive" : "Items to Dispatch"}
            </Text>

            {selectedItems.length > 0 ? (
              selectedItems.map((item, index) => (
                <View key={index} className="mb-2">
                  {renderSelectedItem({ item, index })}
                </View>
              ))
            ) : (
              <View className="py-4 items-center border border-dashed border-gray-300 rounded-lg">
                <Package size={24} color="#9ca3af" />
                <Text className="text-gray-500 mt-2">
                  {movementType === "in"
                    ? "Add items to receive"
                    : "Select items to dispatch"}
                </Text>
              </View>
            )}

            {movementType === "in" && (
              <View>
                <Text className="text-gray-700 mb-2">Add Equipment for Receiving:</Text>
                <View className="flex-row items-center bg-gray-100 rounded-lg px-3 py-2 mb-3">
                  <Search size={20} color="#4b5563" />
                  <TextInput
                    className="flex-1 ml-2"
                    placeholder="Search equipment to add..."
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                  />
                </View>

                {loading ? (
                  <View className="py-4 items-center">
                    <ActivityIndicator size="small" color="#1e40af" />
                    <Text className="text-gray-500 mt-2">Loading equipment...</Text>
                  </View>
                ) : filteredEquipment.length > 0 ? (
                  <View className="max-h-40 mb-3">
                    <FlatList
                      data={filteredEquipment}
                      renderItem={renderEquipmentItem}
                      keyExtractor={(item) => item.id}
                      nestedScrollEnabled
                    />
                  </View>
                ) : (
                  <View className="py-4 items-center">
                    <Package size={24} color="#9ca3af" />
                    <Text className="text-gray-500 mt-2">No equipment found</Text>
                  </View>
                )}
              </View>
            )}
          </View>
        ) : null}

        {/* Submit Button */}
        {((movementType === "in" && destinationWarehouse) ||
          (movementType === "out" && sourceWarehouse)) && (
          <TouchableOpacity
            className={`bg-green-600 py-3 rounded-lg items-center mb-6 flex-row justify-center ${submitting ? "opacity-70" : ""}`}
            onPress={handleSubmit}
            disabled={submitting || selectedItems.length === 0}
          >
            {submitting ? (
              <ActivityIndicator color="white" size="small" className="mr-2" />
            ) : (
              <Save size={20} color="white" className="mr-2" />
            )}
            <Text className="text-white font-bold text-lg">
              {submitting
                ? "Processing..."
                : movementType === "in"
                  ? "Complete Receipt"
                  : "Complete Dispatch"}
            </Text>
          </TouchableOpacity>
        )}
      </ScrollView>

      {/* Warehouse Selection Modal */}
      <Modal
        visible={showWarehouseModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowWarehouseModal(false)}
      >
        <View className="flex-1 bg-black bg-opacity-50 justify-end">
          <View className="bg-white rounded-t-3xl max-h-[80%]">
            <View className="p-4 border-b border-gray-200 flex-row justify-between items-center">
              <Text className="text-xl font-bold text-center text-blue-800">
                Select Warehouse
              </Text>
              <TouchableOpacity onPress={() => setShowWarehouseModal(false)}>
                <X size={24} color="#4b5563" />
              </TouchableOpacity>
            </View>

            {loadingWarehouses ? (
              <View className="p-8 items-center justify-center">
                <ActivityIndicator size="large" color="#1e40af" />
                <Text className="mt-2 text-gray-500">
                  Loading warehouses...
                </Text>
              </View>
            ) : warehouses.length > 0 ? (
              <FlatList
                data={warehouses}
                renderItem={renderWarehouseItem}
                keyExtractor={(item) => item.id}
                contentContainerStyle={{ paddingBottom: 20 }}
              />
            ) : (
              <View className="p-8 items-center justify-center">
                <Text className="text-gray-500 text-center">
                  No warehouses found. Please add warehouses first.
                </Text>
              </View>
            )}
          </View>
        </View>
      </Modal>

      {/* Bottom Tabs */}
      <EquipmentTabs activeTab="bulk-movement" />
    </SafeAreaView>
  );
}
