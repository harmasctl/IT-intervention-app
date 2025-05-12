import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
} from "react-native";
import { X, Package } from "lucide-react-native";
import { Image } from "expo-image";
import { supabase } from "../lib/supabase";

interface AddEquipmentFormProps {
  onCancel: () => void;
  onSuccess: () => void;
}

const AddEquipmentForm = ({ onCancel, onSuccess }: AddEquipmentFormProps) => {
  const [name, setName] = useState("");
  const [type, setType] = useState("");
  const [stockLevel, setStockLevel] = useState("");
  const [supplier, setSupplier] = useState("");
  const [warehouseLocation, setWarehouseLocation] = useState("");
  const [notes, setNotes] = useState("");
  const [image, setImage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const equipmentTypes = [
    "Spare Parts",
    "Tools",
    "Cleaning Supplies",
    "Electronics",
    "Other",
  ];

  const handleAddImage = () => {
    // In a real app, this would open the camera or image picker
    // For now, we'll just set a mock image URL
    const mockImages = [
      "https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=400&q=80",
      "https://images.unsplash.com/photo-1563203369-26f2e4a5ccf7?w=400&q=80",
      "https://images.unsplash.com/photo-1581092335397-9583eb92d232?w=400&q=80",
    ];
    setImage(mockImages[Math.floor(Math.random() * mockImages.length)]);
  };

  const handleSubmit = async () => {
    if (!name || !type || !stockLevel) {
      Alert.alert("Error", "Please fill in all required fields");
      return;
    }

    if (isNaN(Number(stockLevel))) {
      Alert.alert("Error", "Stock level must be a number");
      return;
    }

    setIsSubmitting(true);

    try {
      // In a real app, this would save to Supabase
      // const { data, error } = await supabase.from('equipment').insert({
      //   name,
      //   type,
      //   stock_level: Number(stockLevel),
      //   supplier,
      //   warehouse_location: warehouseLocation,
      //   notes,
      //   image,
      // });

      // if (error) throw error;

      // Mock successful submission
      setTimeout(() => {
        Alert.alert("Success", "Equipment added successfully");
        onSuccess();
      }, 1000);
    } catch (error) {
      console.error("Error adding equipment:", error);
      Alert.alert("Error", "Failed to add equipment. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <ScrollView className="flex-1 bg-white">
      <View className="p-4">
        <View className="flex-row justify-between items-center mb-6">
          <Text className="text-2xl font-bold">Add New Stock Item</Text>
          <TouchableOpacity onPress={onCancel}>
            <X size={24} color="#666" />
          </TouchableOpacity>
        </View>

        <View className="mb-4">
          <Text className="text-gray-700 mb-1 font-medium">Item Name *</Text>
          <TextInput
            className="border border-gray-300 rounded-lg px-3 py-2"
            placeholder="Enter item name"
            value={name}
            onChangeText={setName}
          />
        </View>

        <View className="mb-4">
          <Text className="text-gray-700 mb-1 font-medium">Type *</Text>
          <View className="border border-gray-300 rounded-lg overflow-hidden">
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {equipmentTypes.map((item) => (
                <TouchableOpacity
                  key={item}
                  className={`px-4 py-3 ${type === item ? "bg-blue-500" : "bg-white"}`}
                  onPress={() => setType(item)}
                >
                  <Text
                    className={`${type === item ? "text-white" : "text-gray-700"}`}
                  >
                    {item}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>

        <View className="mb-4">
          <Text className="text-gray-700 mb-1 font-medium">Stock Level *</Text>
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
          <TextInput
            className="border border-gray-300 rounded-lg px-3 py-2"
            placeholder="Enter supplier name"
            value={supplier}
            onChangeText={setSupplier}
          />
        </View>

        <View className="mb-4">
          <Text className="text-gray-700 mb-1 font-medium">
            Warehouse Location
          </Text>
          <TextInput
            className="border border-gray-300 rounded-lg px-3 py-2"
            placeholder="Enter warehouse location (e.g., A-12-B)"
            value={warehouseLocation}
            onChangeText={setWarehouseLocation}
          />
        </View>

        <View className="mb-4">
          <Text className="text-gray-700 mb-1 font-medium">Notes</Text>
          <TextInput
            className="border border-gray-300 rounded-lg px-3 py-2 h-24"
            placeholder="Enter any additional notes"
            multiline
            textAlignVertical="top"
            value={notes}
            onChangeText={setNotes}
          />
        </View>

        <View className="mb-6">
          <Text className="text-gray-700 mb-1 font-medium">Item Image</Text>
          {image ? (
            <View className="relative">
              <Image
                source={{ uri: image }}
                className="w-full h-48 rounded-lg"
                contentFit="cover"
              />
              <TouchableOpacity
                className="absolute top-2 right-2 bg-black bg-opacity-50 rounded-full p-1"
                onPress={() => setImage(null)}
              >
                <X size={16} color="white" />
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity
              className="border-2 border-dashed border-gray-300 rounded-lg h-48 items-center justify-center"
              onPress={handleAddImage}
            >
              <Package size={32} color="#666" />
              <Text className="text-gray-500 mt-2">Add Item Image</Text>
            </TouchableOpacity>
          )}
        </View>

        <View className="flex-row mb-4">
          <TouchableOpacity
            className="bg-gray-200 rounded-lg py-3 px-4 flex-1 mr-2"
            onPress={onCancel}
            disabled={isSubmitting}
          >
            <Text className="text-gray-700 text-center font-medium">
              Cancel
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            className={`rounded-lg py-3 px-4 flex-1 ml-2 ${isSubmitting ? "bg-blue-300" : "bg-blue-500"}`}
            onPress={handleSubmit}
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <Text className="text-white text-center font-medium">
                Adding...
              </Text>
            ) : (
              <Text className="text-white text-center font-medium">
                Add Stock Item
              </Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </ScrollView>
  );
};

export default AddEquipmentForm;
