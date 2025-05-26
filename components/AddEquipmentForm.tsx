import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Alert,
  ScrollView,
  Modal,
} from "react-native";
import { ArrowLeft, Camera, X } from "lucide-react-native";
import { supabase } from "../lib/supabase";
import BarcodeScanner from "../components/BarcodeScanner";

type AddEquipmentFormProps = {
  onCancel: () => void;
  onSuccess: () => void;
};

export default function AddEquipmentForm({
  onCancel,
  onSuccess,
}: AddEquipmentFormProps) {
  const [name, setName] = useState("");
  const [type, setType] = useState("Spare Parts");
  const [stockLevel, setStockLevel] = useState("0");
  const [supplier, setSupplier] = useState("");
  const [supplierOptions, setSupplierOptions] = useState<
    { id: string; name: string }[]
  >([]);
  const [showSupplierDropdown, setShowSupplierDropdown] = useState(false);
  const [warehouseLocation, setWarehouseLocation] = useState("");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [showBarcodeScanner, setShowBarcodeScanner] = useState(false);
  const [barcodeId, setBarcodeId] = useState("");

  const equipmentTypes = [
    "Spare Parts",
    "Tools",
    "Cleaning Supplies",
    "Electronics",
    "Kitchen Equipment",
    "Office Supplies",
    "Safety Equipment",
    "Other",
  ];

  useEffect(() => {
    // Fetch suppliers for dropdown
    const fetchSuppliers = async () => {
      try {
        const { data, error } = await supabase
          .from("suppliers")
          .select("id, name")
          .order("name");

        if (error) throw error;

        if (data) {
          setSupplierOptions(data);
        }
      } catch (error) {
        console.error("Error fetching suppliers:", error);
      }
    };

    fetchSuppliers();
  }, []);

  const handleSubmit = async () => {
    if (!name) {
      Alert.alert("Error", "Please enter equipment name");
      return;
    }

    if (isNaN(parseInt(stockLevel))) {
      Alert.alert("Error", "Stock level must be a number");
      return;
    }

    try {
      setLoading(true);

      const newEquipment = {
        name,
        type,
        stock_level: parseInt(stockLevel),
        supplier: supplier || null,
        warehouse_location: warehouseLocation || null,
        notes: notes || null,
      };

      const { data, error } = await supabase
        .from("equipment")
        .insert([newEquipment])
        .select();

      if (error) throw error;

      Alert.alert("Success", "Equipment added successfully");
      onSuccess();
    } catch (error) {
      console.error("Error adding equipment:", error);
      Alert.alert("Error", "Failed to add equipment");
    } finally {
      setLoading(false);
    }
  };

  return (
    <View className="flex-1 bg-white">
      {/* Header */}
      <View className="flex-row justify-between items-center px-4 py-3 border-b border-gray-200">
        <TouchableOpacity onPress={onCancel} className="flex-row items-center">
          <ArrowLeft size={20} color="#3b82f6" />
          <Text className="text-blue-500 ml-1">Cancel</Text>
        </TouchableOpacity>
        <Text className="text-xl font-bold text-blue-800">Add Stock Item</Text>
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
        <View className="space-y-4">
          <View className="mb-4">
            <Text className="text-gray-700 mb-1 font-medium">Name *</Text>
            <TextInput
              className="border border-gray-300 rounded-lg px-3 py-2"
              placeholder="Enter equipment name"
              value={name}
              onChangeText={setName}
            />
          </View>

          <View className="mb-4">
            <Text className="text-gray-700 mb-1 font-medium">Type *</Text>
            <View className="border border-gray-300 rounded-lg overflow-hidden">
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View className="flex-row p-1">
                  {equipmentTypes.map((equipType) => (
                    <TouchableOpacity
                      key={equipType}
                      className={`px-3 py-2 rounded-lg mr-2 ${type === equipType ? "bg-blue-500" : "bg-gray-100"}`}
                      onPress={() => setType(equipType)}
                    >
                      <Text
                        className={`${type === equipType ? "text-white" : "text-gray-700"}`}
                      >
                        {equipType}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </ScrollView>
            </View>
          </View>

          <View className="mb-4">
            <Text className="text-gray-700 mb-1 font-medium">
              Initial Stock *
            </Text>
            <TextInput
              className="border border-gray-300 rounded-lg px-3 py-2"
              placeholder="Enter initial stock level"
              value={stockLevel}
              onChangeText={setStockLevel}
              keyboardType="numeric"
            />
          </View>

          <View className="mb-4">
            <Text className="text-gray-700 mb-1 font-medium">Supplier</Text>
            <TouchableOpacity
              onPress={() => setShowSupplierDropdown(!showSupplierDropdown)}
              className="border border-gray-300 rounded-lg px-3 py-2 flex-row justify-between items-center"
            >
              <Text className={supplier ? "text-gray-800" : "text-gray-400"}>
                {supplier || "Select a supplier"}
              </Text>
              <Text className="text-gray-500">
                {showSupplierDropdown ? "▲" : "▼"}
              </Text>
            </TouchableOpacity>

            {showSupplierDropdown && (
              <View className="border border-gray-300 rounded-lg mt-1 max-h-40 bg-white z-10">
                <ScrollView>
                  {supplierOptions.map((item) => (
                    <TouchableOpacity
                      key={item.id}
                      className="px-3 py-2 border-b border-gray-100"
                      onPress={() => {
                        setSupplier(item.name);
                        setShowSupplierDropdown(false);
                      }}
                    >
                      <Text className="text-gray-800">{item.name}</Text>
                    </TouchableOpacity>
                  ))}
                  <TouchableOpacity
                    className="px-3 py-2 bg-blue-50"
                    onPress={() => {
                      // In a real app, this would navigate to add supplier screen
                      Alert.alert(
                        "Add Supplier",
                        "Navigate to add supplier screen",
                      );
                      setShowSupplierDropdown(false);
                    }}
                  >
                    <Text className="text-blue-600 font-medium">
                      + Add New Supplier
                    </Text>
                  </TouchableOpacity>
                </ScrollView>
              </View>
            )}
          </View>

          <View className="mb-4">
            <Text className="text-gray-700 mb-1 font-medium">
              Warehouse Location
            </Text>
            <TextInput
              className="border border-gray-300 rounded-lg px-3 py-2"
              placeholder="Enter warehouse location"
              value={warehouseLocation}
              onChangeText={setWarehouseLocation}
            />
          </View>

          <View className="mb-4">
            <Text className="text-gray-700 mb-1 font-medium">Notes</Text>
            <TextInput
              className="border border-gray-300 rounded-lg px-3 py-2 h-24"
              placeholder="Enter any additional notes"
              value={notes}
              onChangeText={setNotes}
              multiline
              textAlignVertical="top"
            />
          </View>

          <TouchableOpacity
            className="bg-blue-600 py-3 rounded-lg items-center mt-4"
            onPress={handleSubmit}
            disabled={loading}
          >
            <Text className="text-white font-bold text-lg">
              {loading ? "Adding..." : "Add Stock Item"}
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Barcode Scanner Modal */}
      <Modal
        visible={showBarcodeScanner}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setShowBarcodeScanner(false)}
      >
        <View style={{ flex: 1 }}>
          <BarcodeScanner
            onScan={(data, type) => {
              setBarcodeId(data);
              setShowBarcodeScanner(false);
            }}
            onClose={() => setShowBarcodeScanner(false)}
          />
        </View>
      </Modal>
    </View>
  );
}
