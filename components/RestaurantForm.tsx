import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
} from "react-native";
import { X } from "lucide-react-native";

interface RestaurantFormProps {
  onCancel: () => void;
  onSubmit: (formData: any) => void;
  initialData?: {
    name: string;
  };
}

const RestaurantForm = ({
  onCancel,
  onSubmit,
  initialData,
}: RestaurantFormProps) => {
  const [name, setName] = useState(initialData?.name || "");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = () => {
    if (!name.trim()) {
      Alert.alert("Error", "Restaurant name is required");
      return;
    }

    setIsSubmitting(true);

    try {
      onSubmit({
        name,
      });
    } catch (error) {
      console.error("Error in form submission:", error);
      Alert.alert("Error", "Failed to save restaurant");
      setIsSubmitting(false);
    }
  };

  return (
    <ScrollView className="flex-1 bg-white">
      <View className="p-4">
        <View className="flex-row justify-between items-center mb-6">
          <Text className="text-2xl font-bold">
            {initialData ? "Edit Restaurant" : "Add New Restaurant"}
          </Text>
          <TouchableOpacity onPress={onCancel}>
            <X size={24} color="#666" />
          </TouchableOpacity>
        </View>

        <View className="mb-4">
          <Text className="text-gray-700 mb-1 font-medium">
            Restaurant Name *
          </Text>
          <TextInput
            className="border border-gray-300 rounded-lg px-3 py-2"
            placeholder="Enter restaurant name"
            value={name}
            onChangeText={setName}
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
            <Text className="text-white text-center font-medium">
              {isSubmitting
                ? "Saving..."
                : initialData
                  ? "Update Restaurant"
                  : "Add Restaurant"}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </ScrollView>
  );
};

export default RestaurantForm;
