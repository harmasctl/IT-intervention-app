import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
} from "react-native";
import { X, ArrowDownUp, Camera } from "lucide-react-native";
import { supabase } from "../lib/supabase";

interface EquipmentItem {
  id: string;
  name: string;
  type: string;
  stock_level: number;
}

interface EquipmentMovementFormProps {
  onCancel: () => void;
  onSuccess: () => void;
  equipment?: EquipmentItem;
}

const EquipmentMovementForm = ({
  onCancel,
  onSuccess,
  equipment,
}: EquipmentMovementFormProps) => {
  const [movementType, setMovementType] = useState<"in" | "out">("in");
  const [quantity, setQuantity] = useState("");
  const [reason, setReason] = useState("");
  const [destination, setDestination] = useState("");
  const [notes, setNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleScanBarcode = () => {
    // In a real app, this would open the barcode scanner
    Alert.alert("Barcode Scanner", "Scanning barcode for stock item...");

    // Mock successful scan
    setTimeout(() => {
      const mockBarcode = `STOCK-${Math.floor(Math.random() * 10000)}`;
      Alert.alert("Barcode Scanned", `Stock item ${mockBarcode} detected`);
    }, 1000);
  };

  const handleSubmit = async () => {
    if (!quantity || isNaN(Number(quantity)) || Number(quantity) <= 0) {
      Alert.alert("Error", "Please enter a valid quantity");
      return;
    }

    if (!reason) {
      Alert.alert("Error", "Please enter a reason for the movement");
      return;
    }

    if (
      movementType === "out" &&
      Number(quantity) > (equipment?.stock_level || 0)
    ) {
      Alert.alert("Error", "Cannot remove more than available stock");
      return;
    }

    setIsSubmitting(true);

    try {
      // In a real app, this would save to Supabase
      // First, create the movement record
      // const { data: movementData, error: movementError } = await supabase
      //   .from('equipment_movements')
      //   .insert({
      //     equipment_id: equipment?.id,
      //     movement_type: movementType,
      //     quantity: Number(quantity),
      //     reason,
      //     destination: destination || null,
      //     notes: notes || null,
      //     timestamp: new Date().toISOString(),
      //   });

      // if (movementError) throw movementError;

      // Then, update the equipment stock level
      // const newStockLevel = movementType === 'in'
      //   ? (equipment?.stock_level || 0) + Number(quantity)
      //   : (equipment?.stock_level || 0) - Number(quantity);

      // const { error: updateError } = await supabase
      //   .from('equipment')
      //   .update({ stock_level: newStockLevel })
      //   .eq('id', equipment?.id);

      // if (updateError) throw updateError;

      // Mock successful submission
      setTimeout(() => {
        Alert.alert(
          "Success",
          `Equipment ${movementType === "in" ? "received" : "issued"} successfully`,
        );
        onSuccess();
      }, 1000);
    } catch (error) {
      console.error("Error recording equipment movement:", error);
      Alert.alert("Error", "Failed to record movement. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <ScrollView className="flex-1 bg-white">
      <View className="p-4">
        <View className="flex-row justify-between items-center mb-6">
          <Text className="text-2xl font-bold">Record Stock Movement</Text>
          <TouchableOpacity onPress={onCancel}>
            <X size={24} color="#666" />
          </TouchableOpacity>
        </View>

        {equipment && (
          <View className="bg-gray-100 p-4 rounded-lg mb-4">
            <Text className="font-bold text-lg">{equipment.name}</Text>
            <Text className="text-gray-600">{equipment.type}</Text>
            <Text className="mt-1">
              Current Stock:{" "}
              <Text className="font-bold">{equipment.stock_level}</Text>
            </Text>
          </View>
        )}

        <View className="mb-4">
          <Text className="text-gray-700 mb-1 font-medium">
            Movement Type *
          </Text>
          <View className="flex-row border border-gray-300 rounded-lg overflow-hidden">
            <TouchableOpacity
              className={`flex-1 py-3 ${movementType === "in" ? "bg-blue-500" : "bg-white"}`}
              onPress={() => setMovementType("in")}
            >
              <Text
                className={`text-center ${movementType === "in" ? "text-white" : "text-gray-700"}`}
              >
                Stock In (Receive)
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              className={`flex-1 py-3 ${movementType === "out" ? "bg-blue-500" : "bg-white"}`}
              onPress={() => setMovementType("out")}
            >
              <Text
                className={`text-center ${movementType === "out" ? "text-white" : "text-gray-700"}`}
              >
                Stock Out (Issue)
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        <View className="mb-4">
          <Text className="text-gray-700 mb-1 font-medium">Quantity *</Text>
          <View className="flex-row">
            <TextInput
              className="border border-gray-300 rounded-lg px-3 py-2 flex-1 mr-2"
              placeholder="Enter quantity"
              value={quantity}
              onChangeText={setQuantity}
              keyboardType="numeric"
            />
            <TouchableOpacity
              className="bg-green-500 p-3 rounded-lg"
              onPress={handleScanBarcode}
            >
              <Camera size={20} color="white" />
            </TouchableOpacity>
          </View>
        </View>

        <View className="mb-4">
          <Text className="text-gray-700 mb-1 font-medium">Reason *</Text>
          <TextInput
            className="border border-gray-300 rounded-lg px-3 py-2"
            placeholder={`Reason for ${movementType === "in" ? "receiving" : "issuing"} stock`}
            value={reason}
            onChangeText={setReason}
          />
        </View>

        {movementType === "out" && (
          <View className="mb-4">
            <Text className="text-gray-700 mb-1 font-medium">
              Destination/Restaurant
            </Text>
            <TextInput
              className="border border-gray-300 rounded-lg px-3 py-2"
              placeholder="Where is this stock going?"
              value={destination}
              onChangeText={setDestination}
            />
          </View>
        )}

        <View className="mb-6">
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
                Submitting...
              </Text>
            ) : (
              <Text className="text-white text-center font-medium">
                {movementType === "in" ? "Receive Stock" : "Issue Stock"}
              </Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </ScrollView>
  );
};

export default EquipmentMovementForm;
