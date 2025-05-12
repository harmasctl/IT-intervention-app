import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
} from "react-native";
import { Camera, X } from "lucide-react-native";
import { Image } from "expo-image";
import { supabase } from "../lib/supabase";

interface AddDeviceFormProps {
  onCancel: () => void;
  onSuccess: () => void;
  restaurants?: string[];
  initialSerialNumber?: string;
}

const AddDeviceForm = ({
  onCancel,
  onSuccess,
  restaurants = [
    "Bella Italia",
    "Sushi Express",
    "Burger Junction",
    "Pizza Palace",
  ],
  initialSerialNumber = "",
}: AddDeviceFormProps) => {
  const [name, setName] = useState("");
  const [serialNumber, setSerialNumber] = useState(initialSerialNumber);
  const [restaurant, setRestaurant] = useState("");
  const [notes, setNotes] = useState("");
  const [image, setImage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleScanSerial = () => {
    // In a real app, this would open the camera to scan a barcode/QR code
    // For now, we'll just set a mock serial number
    const mockSerial = `DEV-${Math.floor(Math.random() * 10000)}-${new Date().getFullYear()}`;
    setSerialNumber(mockSerial);
    Alert.alert("Serial Scanned", `Serial number detected: ${mockSerial}`);
  };

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
    if (!name || !serialNumber || !restaurant) {
      Alert.alert("Error", "Please fill in all required fields");
      return;
    }

    setIsSubmitting(true);

    try {
      // In a real app, this would save to Supabase
      // const { data, error } = await supabase.from('devices').insert({
      //   name,
      //   serial_number: serialNumber,
      //   restaurant,
      //   notes,
      //   image,
      //   status: 'operational',
      //   last_maintenance: new Date().toISOString().split('T')[0],
      // });

      // if (error) throw error;

      // Mock successful submission
      setTimeout(() => {
        Alert.alert("Success", "Device added successfully");
        onSuccess();
      }, 1000);
    } catch (error) {
      console.error("Error adding device:", error);
      Alert.alert("Error", "Failed to add device. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <ScrollView className="flex-1 bg-white">
      <View className="p-4">
        <View className="flex-row justify-between items-center mb-6">
          <Text className="text-2xl font-bold">Add New Device</Text>
          <TouchableOpacity onPress={onCancel}>
            <X size={24} color="#666" />
          </TouchableOpacity>
        </View>

        <View className="mb-4">
          <Text className="text-gray-700 mb-1 font-medium">Device Name *</Text>
          <TextInput
            className="border border-gray-300 rounded-lg px-3 py-2"
            placeholder="Enter device name"
            value={name}
            onChangeText={setName}
          />
        </View>

        <View className="mb-4">
          <Text className="text-gray-700 mb-1 font-medium">
            Serial Number *
          </Text>
          <View className="flex-row">
            <TextInput
              className="border border-gray-300 rounded-lg px-3 py-2 flex-1 mr-2"
              placeholder="Enter or scan serial number"
              value={serialNumber}
              onChangeText={setSerialNumber}
            />
            <TouchableOpacity
              className="bg-blue-500 p-3 rounded-lg"
              onPress={handleScanSerial}
            >
              <Camera size={20} color="white" />
            </TouchableOpacity>
          </View>
        </View>

        <View className="mb-4">
          <Text className="text-gray-700 mb-1 font-medium">Restaurant *</Text>
          <View className="border border-gray-300 rounded-lg overflow-hidden">
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {restaurants.map((item) => (
                <TouchableOpacity
                  key={item}
                  className={`px-4 py-3 ${restaurant === item ? "bg-blue-500" : "bg-white"}`}
                  onPress={() => setRestaurant(item)}
                >
                  <Text
                    className={`${restaurant === item ? "text-white" : "text-gray-700"}`}
                  >
                    {item}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
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
          <Text className="text-gray-700 mb-1 font-medium">Device Image</Text>
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
              <Camera size={32} color="#666" />
              <Text className="text-gray-500 mt-2">Add Device Image</Text>
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
                Add Device
              </Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </ScrollView>
  );
};

export default AddDeviceForm;
