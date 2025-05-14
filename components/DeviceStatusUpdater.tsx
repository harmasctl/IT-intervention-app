import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Alert,
} from "react-native";
import { X, CheckCircle, AlertCircle, Clock } from "lucide-react-native";
import { supabase } from "../lib/supabase";

interface Device {
  id: string;
  name: string;
  serialNumber: string;
  restaurant: string;
  status: "operational" | "maintenance" | "offline";
}

interface DeviceStatusUpdaterProps {
  device: Device;
  onCancel: () => void;
  onSuccess: (newStatus: string) => void;
}

const DeviceStatusUpdater = ({
  device,
  onCancel,
  onSuccess,
}: DeviceStatusUpdaterProps) => {
  const [selectedStatus, setSelectedStatus] = useState<string>(device.status);
  const [notes, setNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const statusOptions = [
    {
      value: "operational",
      label: "Operational",
      icon: CheckCircle,
      color: "#16a34a", // green-600
      bgColor: "bg-green-100",
      textColor: "text-green-700",
    },
    {
      value: "maintenance",
      label: "Under Maintenance",
      icon: Clock,
      color: "#ca8a04", // yellow-600
      bgColor: "bg-yellow-100",
      textColor: "text-yellow-700",
    },
    {
      value: "offline",
      label: "Offline",
      icon: AlertCircle,
      color: "#dc2626", // red-600
      bgColor: "bg-red-100",
      textColor: "text-red-700",
    },
  ];

  const handleSubmit = async () => {
    if (selectedStatus === device.status && !notes) {
      Alert.alert("No Changes", "Please change the status or add notes");
      return;
    }

    setIsSubmitting(true);

    try {
      // Update the device status in Supabase
      const { error } = await supabase
        .from("devices")
        .update({
          status: selectedStatus,
          last_status_update: new Date().toISOString(),
        })
        .eq("id", device.id);

      if (error) throw error;

      // Also log the status change in a history table
      const { error: historyError } = await supabase
        .from("device_status_history")
        .insert({
          device_id: device.id,
          previous_status: device.status,
          new_status: selectedStatus,
          notes: notes,
          timestamp: new Date().toISOString(),
        });

      if (historyError) {
        console.error("Error logging status history:", historyError);
        // Continue anyway since the main update was successful
      }

      Alert.alert("Success", "Device status updated successfully", [
        { text: "OK", onPress: () => onSuccess(selectedStatus) },
      ]);
    } catch (error) {
      console.error("Error updating device status:", error);
      Alert.alert("Error", "Failed to update device status. Please try again.");
      setIsSubmitting(false);
    }
  };

  return (
    <ScrollView className="flex-1 bg-white">
      <View className="p-4">
        <View className="flex-row justify-between items-center mb-6">
          <Text className="text-2xl font-bold">Update Device Status</Text>
          <TouchableOpacity onPress={onCancel}>
            <X size={24} color="#666" />
          </TouchableOpacity>
        </View>

        <View className="bg-blue-50 p-4 rounded-lg mb-6">
          <Text className="font-bold text-lg">{device.name}</Text>
          <Text className="text-gray-600">S/N: {device.serialNumber}</Text>
          <Text className="text-gray-600 mt-1">{device.restaurant}</Text>
          <View className="mt-2 bg-white px-3 py-1 rounded-full self-start">
            <Text className="text-blue-600 font-medium">
              Current Status:{" "}
              {device.status.charAt(0).toUpperCase() + device.status.slice(1)}
            </Text>
          </View>
        </View>

        <View className="mb-6">
          <Text className="text-gray-700 mb-3 font-medium">
            Select New Status
          </Text>
          {statusOptions.map((option) => {
            const Icon = option.icon;
            return (
              <TouchableOpacity
                key={option.value}
                className={`flex-row items-center p-4 rounded-lg mb-2 border ${selectedStatus === option.value ? option.bgColor + " border-" + option.color : "border-gray-200"}`}
                onPress={() => setSelectedStatus(option.value)}
              >
                <Icon size={20} color={option.color} />
                <Text
                  className={`ml-2 font-medium ${selectedStatus === option.value ? option.textColor : "text-gray-700"}`}
                >
                  {option.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <View className="mb-6">
          <Text className="text-gray-700 mb-2 font-medium">Notes</Text>
          <TextInput
            className="border border-gray-300 rounded-lg px-3 py-2 h-24 bg-white"
            placeholder="Enter any additional notes about this status change"
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
                Updating...
              </Text>
            ) : (
              <Text className="text-white text-center font-medium">
                Update Status
              </Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </ScrollView>
  );
};

export default DeviceStatusUpdater;
