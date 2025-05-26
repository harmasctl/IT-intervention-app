import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Alert,
  Modal,
  ScrollView,
} from "react-native";
import { ArrowLeft, Camera, ArrowUp, ArrowDown } from "lucide-react-native";
import { supabase } from "../lib/supabase";
import BarcodeScanner from "./BarcodeScanner";

type EquipmentItem = {
  id: string;
  name: string;
  type: string;
  stock_level: number;
  supplier: string | null;
  warehouse_location: string | null;
  min_stock_level?: number;
  is_critical?: boolean;
  barcode_id?: string | null;
};

type EquipmentMovementFormProps = {
  equipment: EquipmentItem;
  onCancel: () => void;
  onSuccess: () => void;
};

export default function EquipmentMovementForm({
  equipment,
  onCancel,
  onSuccess,
}: EquipmentMovementFormProps) {
  const [movementType, setMovementType] = useState<"in" | "out">("in");
  const [quantity, setQuantity] = useState("1");
  const [reason, setReason] = useState("");
  const [destination, setDestination] = useState("");
  const [destinationOptions, setDestinationOptions] = useState<
    { id: string; name: string }[]
  >([]);
  const [showDestinationDropdown, setShowDestinationDropdown] = useState(false);
  const [warehouseLocation, setWarehouseLocation] = useState(
    equipment.warehouse_location || "",
  );
  const [warehouseOptions, setWarehouseOptions] = useState<string[]>([
    "Main Warehouse",
    "Secondary Storage",
    "Kitchen Storage",
    "Repair Shop",
  ]);
  const [showWarehouseDropdown, setShowWarehouseDropdown] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showScanner, setShowScanner] = useState(false);

  useEffect(() => {
    // Fetch restaurants for destination dropdown
    const fetchRestaurants = async () => {
      try {
        const { data, error } = await supabase
          .from("restaurants")
          .select("id, name")
          .order("name");

        if (error) throw error;

        if (data) {
          setDestinationOptions(data);
        }
      } catch (error) {
        console.error("Error fetching restaurants:", error);
      }
    };

    fetchRestaurants();
  }, []);

  const handleSubmit = async () => {
    if (isNaN(parseInt(quantity)) || parseInt(quantity) <= 0) {
      Alert.alert("Error", "Please enter a valid quantity");
      return;
    }

    if (movementType === "out" && parseInt(quantity) > equipment.stock_level) {
      Alert.alert(
        "Error",
        `Cannot remove more than current stock (${equipment.stock_level})`,
      );
      return;
    }

    if (!reason) {
      Alert.alert("Error", "Please enter a reason for this movement");
      return;
    }

    if (movementType === "out" && !destination) {
      Alert.alert("Error", "Please enter a destination");
      return;
    }

    if (movementType === "in" && !warehouseLocation) {
      Alert.alert("Error", "Please specify a warehouse location");
      return;
    }

    try {
      setLoading(true);

      const quantityNum = parseInt(quantity);
      const previousStock = equipment.stock_level;
      const newStock =
        movementType === "in"
          ? previousStock + quantityNum
          : previousStock - quantityNum;

      // First, update the equipment stock level and warehouse location if changed
      const updateData: any = { stock_level: newStock };

      // If warehouse location has changed, update it
      if (
        movementType === "in" &&
        warehouseLocation !== equipment.warehouse_location
      ) {
        updateData.warehouse_location = warehouseLocation;
      }

      const { error: updateError } = await supabase
        .from("equipment")
        .update(updateData)
        .eq("id", equipment.id);

      if (updateError) throw updateError;

      // Then, record the movement
      const movementRecord = {
        equipment_id: equipment.id,
        movement_type: movementType,
        quantity: quantityNum,
        reason,
        destination: movementType === "out" ? destination : null,
        warehouse_location: movementType === "in" ? warehouseLocation : null,
        previous_stock: previousStock,
        new_stock: newStock,
        timestamp: new Date().toISOString(),
      };

      const { error: movementError } = await supabase
        .from("equipment_movements")
        .insert([movementRecord]);

      if (movementError) throw movementError;

      // Check if stock is below minimum level after movement
      if (
        movementType === "out" &&
        newStock <= (equipment.min_stock_level || 5)
      ) {
        // Create a notification for low stock
        const notificationData = {
          title: "Low Stock Alert",
          message: `${equipment.name} is running low (${newStock} remaining)`,
          type: "low_stock",
          related_id: equipment.id,
          related_type: "equipment",
          is_read: false,
          created_at: new Date().toISOString(),
        };

        await supabase.from("notifications").insert([notificationData]);
      }

      Alert.alert(
        "Success",
        `Stock ${movementType === "in" ? "added" : "removed"} successfully`,
      );
      onSuccess();
    } catch (error) {
      console.error("Error updating stock:", error);
      Alert.alert("Error", "Failed to update stock");
    } finally {
      setLoading(false);
    }
  };

  const handleScan = (data: string) => {
    setShowScanner(false);
    // In a real app, you would validate the scanned data
    // For now, we'll just set it as the reason
    setReason(`Scanned: ${data}`);
  };

  return (
    <View className="flex-1 bg-white">
      {/* Header */}
      <View className="flex-row justify-between items-center px-4 py-3 border-b border-gray-200">
        <TouchableOpacity onPress={onCancel} className="flex-row items-center">
          <ArrowLeft size={20} color="#3b82f6" />
          <Text className="text-blue-500 ml-1">Cancel</Text>
        </TouchableOpacity>
        <Text className="text-xl font-bold text-blue-800">Manage Stock</Text>
        <TouchableOpacity
          onPress={handleSubmit}
          disabled={loading}
          className={`${loading ? "opacity-50" : ""}`}
        >
          <Text className="text-blue-600 font-medium">
            {loading ? "Saving..." : "Save"}
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView className="flex-1 p-4">
        <View className="bg-blue-50 p-4 rounded-lg mb-6">
          <View className="flex-row justify-between items-start">
            <View>
              <Text className="text-lg font-bold text-blue-800">
                {equipment.name}
              </Text>
              <Text className="text-blue-600 mt-1">
                Current Stock: {equipment.stock_level}
              </Text>
              <Text className="text-gray-600 mt-1">
                Location: {equipment.warehouse_location || "Not specified"}
              </Text>
              {equipment.min_stock_level && (
                <Text className="text-gray-600 mt-1">
                  Min Stock Level: {equipment.min_stock_level}
                </Text>
              )}
              {equipment.barcode_id && (
                <Text className="text-gray-600 mt-1">
                  Barcode: {equipment.barcode_id}
                </Text>
              )}
            </View>
            {equipment.is_critical && (
              <View className="bg-red-100 px-3 py-1 rounded-full">
                <Text className="text-red-700 text-xs font-medium">
                  Critical Item
                </Text>
              </View>
            )}
          </View>
        </View>

        <View className="space-y-4">
          <View className="mb-4">
            <Text className="text-gray-700 mb-2 font-medium">
              Movement Type *
            </Text>
            <View className="flex-row">
              <TouchableOpacity
                className={`flex-1 flex-row items-center justify-center py-3 rounded-l-lg ${movementType === "in" ? "bg-green-500" : "bg-gray-200"}`}
                onPress={() => setMovementType("in")}
              >
                <ArrowDown
                  size={18}
                  color={movementType === "in" ? "white" : "#4b5563"}
                />
                <Text
                  className={`ml-2 font-medium ${movementType === "in" ? "text-white" : "text-gray-700"}`}
                >
                  Stock In
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                className={`flex-1 flex-row items-center justify-center py-3 rounded-r-lg ${movementType === "out" ? "bg-red-500" : "bg-gray-200"}`}
                onPress={() => setMovementType("out")}
              >
                <ArrowUp
                  size={18}
                  color={movementType === "out" ? "white" : "#4b5563"}
                />
                <Text
                  className={`ml-2 font-medium ${movementType === "out" ? "text-white" : "text-gray-700"}`}
                >
                  Stock Out
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          <View className="mb-4">
            <Text className="text-gray-700 mb-1 font-medium">Quantity *</Text>
            <TextInput
              className="border border-gray-300 rounded-lg px-3 py-2"
              placeholder="Enter quantity"
              value={quantity}
              onChangeText={setQuantity}
              keyboardType="numeric"
            />
          </View>

          <View className="mb-4">
            <Text className="text-gray-700 mb-1 font-medium">Reason *</Text>
            <View className="flex-row">
              <TextInput
                className="border border-gray-300 rounded-l-lg px-3 py-2 flex-1"
                placeholder="Why is stock changing?"
                value={reason}
                onChangeText={setReason}
              />
              <TouchableOpacity
                className="bg-blue-500 rounded-r-lg px-3 items-center justify-center"
                onPress={() => setShowScanner(true)}
              >
                <Camera size={20} color="white" />
              </TouchableOpacity>
            </View>
          </View>

          {movementType === "in" ? (
            <View className="mb-4">
              <Text className="text-gray-700 mb-1 font-medium">
                Warehouse Location *
              </Text>
              <TouchableOpacity
                onPress={() => setShowWarehouseDropdown(!showWarehouseDropdown)}
                className="border border-gray-300 rounded-lg px-3 py-2 flex-row justify-between items-center"
              >
                <Text
                  className={
                    warehouseLocation ? "text-gray-800" : "text-gray-400"
                  }
                >
                  {warehouseLocation || "Select a warehouse location"}
                </Text>
                <Text className="text-gray-500">
                  {showWarehouseDropdown ? "▲" : "▼"}
                </Text>
              </TouchableOpacity>

              {showWarehouseDropdown && (
                <View className="border border-gray-300 rounded-lg mt-1 max-h-40 bg-white z-10">
                  <ScrollView>
                    {warehouseOptions.map((location) => (
                      <TouchableOpacity
                        key={location}
                        className="px-3 py-2 border-b border-gray-100"
                        onPress={() => {
                          setWarehouseLocation(location);
                          setShowWarehouseDropdown(false);
                        }}
                      >
                        <Text className="text-gray-800">{location}</Text>
                      </TouchableOpacity>
                    ))}
                    <TouchableOpacity
                      className="px-3 py-2 bg-blue-50"
                      onPress={() => {
                        Alert.prompt(
                          "Add Location",
                          "Enter new warehouse location",
                          (text) => {
                            if (text) {
                              setWarehouseLocation(text);
                              setWarehouseOptions([...warehouseOptions, text]);
                              setShowWarehouseDropdown(false);
                            }
                          },
                        );
                      }}
                    >
                      <Text className="text-blue-600 font-medium">
                        + Add New Location
                      </Text>
                    </TouchableOpacity>
                  </ScrollView>
                </View>
              )}
            </View>
          ) : (
            <View className="mb-4">
              <Text className="text-gray-700 mb-1 font-medium">
                Destination/Restaurant *
              </Text>
              <TouchableOpacity
                onPress={() =>
                  setShowDestinationDropdown(!showDestinationDropdown)
                }
                className="border border-gray-300 rounded-lg px-3 py-2 flex-row justify-between items-center"
              >
                <Text
                  className={destination ? "text-gray-800" : "text-gray-400"}
                >
                  {destination || "Select a destination"}
                </Text>
                <Text className="text-gray-500">
                  {showDestinationDropdown ? "▲" : "▼"}
                </Text>
              </TouchableOpacity>

              {showDestinationDropdown && (
                <View className="border border-gray-300 rounded-lg mt-1 max-h-40 bg-white z-10">
                  <ScrollView>
                    {destinationOptions.map((item) => (
                      <TouchableOpacity
                        key={item.id}
                        className="px-3 py-2 border-b border-gray-100"
                        onPress={() => {
                          setDestination(item.name);
                          setShowDestinationDropdown(false);
                        }}
                      >
                        <Text className="text-gray-800">{item.name}</Text>
                      </TouchableOpacity>
                    ))}
                    <TouchableOpacity
                      className="px-3 py-2 bg-blue-50"
                      onPress={() => {
                        // Allow manual entry
                        Alert.prompt(
                          "Custom Destination",
                          "Enter destination name",
                          (text) => {
                            if (text) {
                              setDestination(text);
                              setShowDestinationDropdown(false);
                            }
                          },
                        );
                      }}
                    >
                      <Text className="text-blue-600 font-medium">
                        + Add Custom Destination
                      </Text>
                    </TouchableOpacity>
                  </ScrollView>
                </View>
              )}
            </View>
          )}

          <TouchableOpacity
            className={`py-3 rounded-lg items-center mt-4 ${movementType === "in" ? "bg-green-600" : "bg-red-600"}`}
            onPress={handleSubmit}
            disabled={loading}
          >
            <Text className="text-white font-bold text-lg">
              {loading
                ? "Processing..."
                : movementType === "in"
                  ? "Add Stock"
                  : "Remove Stock"}
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Barcode Scanner Modal */}
      <Modal
        visible={showScanner}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setShowScanner(false)}
      >
        <View style={{ flex: 1 }}>
          <BarcodeScanner
            onScan={(data, type) => handleScan(data)}
            onClose={() => setShowScanner(false)}
          />
        </View>
      </Modal>
    </View>
  );
}
