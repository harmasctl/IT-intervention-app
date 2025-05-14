import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  Modal,
} from "react-native";
import { X, ArrowDownUp, Camera } from "lucide-react-native";
import { supabase } from "../lib/supabase";
import BarcodeScanner from "./BarcodeScanner";

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

  const [showScanner, setShowScanner] = useState(false);

  const handleScanBarcode = () => {
    setShowScanner(true);
  };

  const handleBarcodeScan = (data: string) => {
    setQuantity(data.match(/\d+/)?.[0] || "1");
    setShowScanner(false);
  };

  const handleCloseScanner = () => {
    setShowScanner(false);
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
      if (!equipment?.id) {
        throw new Error("Equipment ID is missing");
      }

      // Calculate the new stock level
      const currentStock = equipment.stock_level || 0;
      const quantityNum = Number(quantity);
      const newStockLevel =
        movementType === "in"
          ? currentStock + quantityNum
          : currentStock - quantityNum;

      // First, update the equipment stock level
      const { error: updateError } = await supabase
        .from("equipment")
        .update({ stock_level: newStockLevel })
        .eq("id", equipment.id);

      if (updateError) throw updateError;

      // Then, record the movement
      const { error: movementError } = await supabase
        .from("equipment_movements")
        .insert({
          equipment_id: equipment.id,
          movement_type: movementType,
          quantity: quantityNum,
          reason: reason,
          destination: destination || null,
          notes: notes || null,
          previous_stock: currentStock,
          new_stock: newStockLevel,
          timestamp: new Date().toISOString(),
        });

      if (movementError) throw movementError;

      Alert.alert(
        "Success",
        `Equipment ${movementType === "in" ? "received" : "issued"} successfully`,
      );
      onSuccess();
    } catch (error) {
      console.error("Error recording equipment movement:", error);
      Alert.alert("Error", "Failed to record movement. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      {showScanner && (
        <Modal animationType="slide" transparent={false} visible={showScanner}>
          <BarcodeScanner
            onScan={handleBarcodeScan}
            onClose={handleCloseScanner}
            mode="stock"
          />
        </Modal>
      )}
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
    </>
  );
};

export default EquipmentMovementForm;
