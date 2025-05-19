import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from "react-native";
import {
  Camera,
  ChevronRight,
  AlertCircle,
  Upload,
  Check,
  X,
} from "lucide-react-native";
import * as Haptics from "expo-haptics";
import { supabase } from "../lib/supabase";
import { Image } from "expo-image";
import { Database } from "../lib/database.types";
import * as ImagePicker from "expo-image-picker";
import { decode } from "base64-arraybuffer";
import { useAuth } from "../components/AuthProvider";

interface DeviceOption {
  id: string;
  name: string;
  type: string;
}

interface RestaurantOption {
  id: string;
  name: string;
  location?: string;
}

interface CreateTicketFormProps {
  onSubmit?: (ticketData: TicketData) => void;
  onCancel?: () => void;
  isSubmitting?: boolean;
}

interface TicketData {
  title: string;
  device: DeviceOption | null;
  diagnosticInfo: string;
  restaurant: RestaurantOption | null;
  priority: "low" | "medium" | "high";
  photos: string[];
}

const CreateTicketForm = ({ onSubmit, onCancel, isSubmitting = false }: CreateTicketFormProps) => {
  const { user } = useAuth();
  const [currentStep, setCurrentStep] = useState(0);
  const [ticketData, setTicketData] = useState<TicketData>({
    title: "",
    device: null,
    diagnosticInfo: "",
    restaurant: null,
    priority: "medium",
    photos: [],
  });

  const [deviceSearchQuery, setDeviceSearchQuery] = useState("");
  const [restaurantSearchQuery, setRestaurantSearchQuery] = useState("");
  const [devices, setDevices] = useState<DeviceOption[]>([]);
  const [restaurants, setRestaurants] = useState<RestaurantOption[]>([]);
  const [loading, setLoading] = useState({
    devices: false,
    restaurants: false,
    imageUpload: false,
  });

  // Request camera permissions
  useEffect(() => {
    (async () => {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission required', 'Camera access is needed to take photos');
      }
    })();
  }, []);

  // Fetch devices and restaurants from Supabase
  useEffect(() => {
    fetchDevices();
    fetchRestaurants();
  }, []);

  const fetchDevices = async () => {
    try {
      setLoading((prev) => ({ ...prev, devices: true }));
      const { data, error } = await supabase
        .from("devices")
        .select("id, name, type, serial_number, status");

      if (error) throw error;

      if (data) {
        const formattedDevices = data.map((device) => ({
          id: device.id,
          name: device.name,
          type: device.type || "Unknown Type",
        }));
        setDevices(formattedDevices);
      }
    } catch (error) {
      console.error("Error fetching devices:", error);
      Alert.alert("Error", "Failed to load devices. Please try again.");
    } finally {
      setLoading((prev) => ({ ...prev, devices: false }));
    }
  };

  const fetchRestaurants = async () => {
    try {
      setLoading((prev) => ({ ...prev, restaurants: true }));
      const { data, error } = await supabase
        .from("restaurants")
        .select("id, name");

      if (error) throw error;

      if (data) {
        const formattedRestaurants = data.map((restaurant) => ({
          id: restaurant.id,
          name: restaurant.name,
        }));
        setRestaurants(formattedRestaurants);
      }
    } catch (error) {
      console.error("Error fetching restaurants:", error);
      Alert.alert("Error", "Failed to load restaurants. Please try again.");
    } finally {
      setLoading((prev) => ({ ...prev, restaurants: false }));
    }
  };

  const handleSubmit = async () => {
    if (!isFormValid()) {
      Alert.alert("Incomplete Form", "Please fill in all required fields");
      return;
    }
    
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    if (onSubmit) {
      onSubmit(ticketData);
    }
  };

  const updateTicketData = (field: keyof TicketData, value: any) => {
    setTicketData((prev) => ({ ...prev, [field]: value }));
  };

  // Real image upload functionality
  const takePhoto = async () => {
    try {
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
        base64: true,
      });

      if (!result.canceled && result.assets && result.assets[0]) {
        await uploadImage(result.assets[0]);
      }
    } catch (error) {
      console.error('Error taking photo:', error);
      Alert.alert('Error', 'Failed to take photo. Please try again.');
    }
  };

  const pickImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
        base64: true,
      });

      if (!result.canceled && result.assets && result.assets[0]) {
        await uploadImage(result.assets[0]);
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert('Error', 'Failed to select image. Please try again.');
    }
  };

  const uploadImage = async (imageAsset: ImagePicker.ImagePickerAsset) => {
    if (!imageAsset.base64) {
      Alert.alert('Error', 'Image data is missing');
      return;
    }

    try {
      setLoading(prev => ({ ...prev, imageUpload: true }));
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

      // Create a unique file name
      const fileName = `ticket-photo-${Date.now()}.jpg`;
      const filePath = `tickets/${user?.id || 'anonymous'}/${fileName}`;
      
      // Upload image to Supabase Storage
      const { data, error } = await supabase.storage
        .from('ticket-photos')
        .upload(filePath, decode(imageAsset.base64), {
          contentType: 'image/jpeg',
        });

      if (error) throw error;

      // Get the public URL for the uploaded image
      const { data: publicUrlData } = supabase.storage
        .from('ticket-photos')
        .getPublicUrl(filePath);

      if (publicUrlData && publicUrlData.publicUrl) {
        // Add the new photo URL to the ticket data
        updateTicketData('photos', [...ticketData.photos, publicUrlData.publicUrl]);
      }
    } catch (error) {
      console.error('Error uploading image:', error);
      Alert.alert('Error', 'Failed to upload image. Please try again.');
    } finally {
      setLoading(prev => ({ ...prev, imageUpload: false }));
    }
  };

  const removePhoto = async (index: number) => {
    try {
      const photoUrl = ticketData.photos[index];
      
      // Extract the file path from the URL
      const storageUrl = 'https://mxbebraqpukeanginfxr.supabase.co/storage/v1/object/public/ticket-photos/';
      if (photoUrl.startsWith(storageUrl)) {
        const filePath = photoUrl.replace(storageUrl, '');
        
        // Delete the file from storage
        await supabase.storage
          .from('ticket-photos')
          .remove([filePath]);
      }

      // Remove the photo from the ticket data
      const updatedPhotos = [...ticketData.photos];
      updatedPhotos.splice(index, 1);
      updateTicketData('photos', updatedPhotos);
      
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (error) {
      console.error('Error removing photo:', error);
      Alert.alert('Error', 'Failed to remove photo');
    }
  };

  const renderStepIndicator = () => (
    <View className="flex-row justify-center my-4">
      {[0, 1, 2, 3].map((step) => (
        <View
          key={step}
          className={`h-2 w-2 rounded-full mx-1 ${
            currentStep === step ? "bg-blue-600" : "bg-gray-300"
          }`}
        />
      ))}
    </View>
  );

  const renderStepContent = () => {
    switch (currentStep) {
      case 0:
        return (
          <View className="px-4">
            <Text className="text-lg font-bold mb-2">Ticket Title</Text>
            <Text className="text-gray-600 mb-4">
              Provide a clear title for your issue
            </Text>
            <TextInput
              className="bg-gray-100 p-4 rounded-lg text-base"
              placeholder="Enter ticket title"
              value={ticketData.title}
              onChangeText={(text) => updateTicketData("title", text)}
            />

            <Text className="text-lg font-bold mt-6 mb-2">Priority Level</Text>
            <Text className="text-gray-600 mb-4">
              Select the priority level for this issue
            </Text>
            <View className="flex-row justify-between">
              {["low", "medium", "high"].map((priority) => (
                <TouchableOpacity
                  key={priority}
                  className={`flex-1 py-3 mx-1 rounded-lg ${
                    ticketData.priority === priority
                      ? priority === "high"
                        ? "bg-red-500"
                        : priority === "medium"
                        ? "bg-amber-500"
                        : "bg-green-500"
                      : "bg-gray-200"
                  }`}
                  onPress={() => {
                    updateTicketData("priority", priority);
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  }}
                >
                  <Text
                    className={`text-center font-medium ${
                      ticketData.priority === priority
                        ? "text-white"
                        : "text-gray-700"
                    }`}
                  >
                    {priority.charAt(0).toUpperCase() + priority.slice(1)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        );

      case 1:
        return (
          <View className="px-4">
            <Text className="text-lg font-bold mb-2">Select Device</Text>
            <Text className="text-gray-600 mb-4">
              Choose the device that needs attention
            </Text>

            <TextInput
              className="bg-gray-100 p-4 rounded-lg text-base mb-4"
              placeholder="Search devices..."
              value={deviceSearchQuery}
              onChangeText={setDeviceSearchQuery}
            />

            {loading.devices ? (
              <ActivityIndicator size="small" color="#1e40af" />
            ) : (
              <ScrollView
                className="max-h-80"
                showsVerticalScrollIndicator={true}
              >
                {devices
                  .filter((device) =>
                    device.name
                      .toLowerCase()
                      .includes(deviceSearchQuery.toLowerCase())
                  )
                  .map((device) => (
                    <TouchableOpacity
                      key={device.id}
                      className={`p-4 mb-2 rounded-lg flex-row justify-between items-center ${
                        ticketData.device?.id === device.id
                          ? "bg-blue-100 border border-blue-300"
                          : "bg-gray-100"
                      }`}
                      onPress={() => {
                        updateTicketData("device", device);
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      }}
                    >
                      <View>
                        <Text className="font-medium">{device.name}</Text>
                        <Text className="text-gray-500 text-sm">
                          {device.type}
                        </Text>
                      </View>
                      {ticketData.device?.id === device.id && (
                        <Check size={20} color="#1e40af" />
                      )}
                    </TouchableOpacity>
                  ))}

                {devices.filter((device) =>
                  device.name
                    .toLowerCase()
                    .includes(deviceSearchQuery.toLowerCase())
                ).length === 0 && (
                  <View className="py-4 items-center">
                    <Text className="text-gray-500">No devices found</Text>
                  </View>
                )}
              </ScrollView>
            )}
          </View>
        );

      case 2:
        return (
          <View className="px-4">
            <Text className="text-lg font-bold mb-2">Select Restaurant</Text>
            <Text className="text-gray-600 mb-4">
              Choose the restaurant where the device is located
            </Text>

            <TextInput
              className="bg-gray-100 p-4 rounded-lg text-base mb-4"
              placeholder="Search restaurants..."
              value={restaurantSearchQuery}
              onChangeText={setRestaurantSearchQuery}
            />

            {loading.restaurants ? (
              <ActivityIndicator size="small" color="#1e40af" />
            ) : (
              <ScrollView
                className="max-h-80"
                showsVerticalScrollIndicator={true}
              >
                {restaurants
                  .filter((restaurant) =>
                    restaurant.name
                      .toLowerCase()
                      .includes(restaurantSearchQuery.toLowerCase())
                  )
                  .map((restaurant) => (
                    <TouchableOpacity
                      key={restaurant.id}
                      className={`p-4 mb-2 rounded-lg flex-row justify-between items-center ${
                        ticketData.restaurant?.id === restaurant.id
                          ? "bg-blue-100 border border-blue-300"
                          : "bg-gray-100"
                      }`}
                      onPress={() => {
                        updateTicketData("restaurant", restaurant);
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      }}
                    >
                      <View>
                        <Text className="font-medium">{restaurant.name}</Text>
                        {restaurant.location && (
                          <Text className="text-gray-500 text-sm">
                            {restaurant.location}
                          </Text>
                        )}
                      </View>
                      {ticketData.restaurant?.id === restaurant.id && (
                        <Check size={20} color="#1e40af" />
                      )}
                    </TouchableOpacity>
                  ))}

                {restaurants.filter((restaurant) =>
                  restaurant.name
                    .toLowerCase()
                    .includes(restaurantSearchQuery.toLowerCase())
                ).length === 0 && (
                  <View className="py-4 items-center">
                    <Text className="text-gray-500">No restaurants found</Text>
                  </View>
                )}
              </ScrollView>
            )}
          </View>
        );

      case 3:
        return (
          <View className="px-4">
            <Text className="text-lg font-bold mb-2">Diagnostic Information</Text>
            <Text className="text-gray-600 mb-4">
              Describe the issue in detail
            </Text>
            <TextInput
              className="bg-gray-100 p-4 rounded-lg text-base mb-6"
              placeholder="Describe the issue..."
              multiline
              numberOfLines={4}
              textAlignVertical="top"
              value={ticketData.diagnosticInfo}
              onChangeText={(text) => updateTicketData("diagnosticInfo", text)}
            />

            <Text className="text-lg font-bold mb-2">Add Photos</Text>
            <Text className="text-gray-600 mb-4">
              Add photos of the issue (optional)
            </Text>

            <View className="flex-row mb-4">
              <TouchableOpacity
                className="bg-blue-100 p-3 rounded-lg flex-row items-center mr-2"
                onPress={takePhoto}
                disabled={loading.imageUpload}
              >
                <Camera size={20} color="#1e40af" />
                <Text className="text-blue-800 ml-2">Take Photo</Text>
              </TouchableOpacity>

              <TouchableOpacity
                className="bg-blue-100 p-3 rounded-lg flex-row items-center"
                onPress={pickImage}
                disabled={loading.imageUpload}
              >
                <Upload size={20} color="#1e40af" />
                <Text className="text-blue-800 ml-2">Upload Photo</Text>
              </TouchableOpacity>
            </View>

            {loading.imageUpload && (
              <View className="items-center py-2">
                <ActivityIndicator size="small" color="#1e40af" />
                <Text className="text-gray-500 mt-1">Uploading image...</Text>
              </View>
            )}

            {ticketData.photos.length > 0 && (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                className="mb-4"
              >
                {ticketData.photos.map((photo, index) => (
                  <View key={index} className="mr-3 relative">
                    <Image
                      source={{ uri: photo }}
                      style={{ width: 100, height: 100, borderRadius: 8 }}
                      contentFit="cover"
                    />
                    <TouchableOpacity
                      className="absolute top-1 right-1 bg-red-500 rounded-full p-1"
                      onPress={() => removePhoto(index)}
                    >
                      <X size={16} color="#ffffff" />
                    </TouchableOpacity>
                  </View>
                ))}
              </ScrollView>
            )}
          </View>
        );

      default:
        return null;
    }
  };

  const isFormValid = () => {
    if (currentStep === 3) {
      // Final validation before submission
      return (
        ticketData.title.trim().length > 0 &&
        ticketData.device !== null &&
        ticketData.restaurant !== null &&
        ticketData.diagnosticInfo.trim().length > 0
      );
    }
    
    // Check validation for current step
    switch (currentStep) {
      case 0:
        return ticketData.title.trim().length > 0;
      case 1:
        return ticketData.device !== null;
      case 2:
        return ticketData.restaurant !== null;
      case 3:
        return ticketData.diagnosticInfo.trim().length > 0;
      default:
        return false;
    }
  };

  return (
    <ScrollView className="flex-1">
      {renderStepIndicator()}
      {renderStepContent()}

      <View className="flex-row justify-between p-4 mt-4">
        <TouchableOpacity
          className="px-6 py-3 rounded-lg bg-gray-200"
          onPress={() => {
            if (currentStep === 0) {
              onCancel && onCancel();
            } else {
              setCurrentStep(currentStep - 1);
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            }
          }}
        >
          <Text className="text-gray-800 font-medium">
            {currentStep === 0 ? "Cancel" : "Back"}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          className={`px-6 py-3 rounded-lg ${
            isFormValid()
              ? currentStep === 3
                ? "bg-green-500"
                : "bg-blue-600"
              : "bg-gray-300"
          }`}
          onPress={() => {
            if (!isFormValid()) {
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
              return;
            }

            if (currentStep === 3) {
              handleSubmit();
            } else {
              setCurrentStep(currentStep + 1);
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            }
          }}
          disabled={!isFormValid() || isSubmitting}
        >
          {isSubmitting && currentStep === 3 ? (
            <ActivityIndicator size="small" color="#ffffff" />
          ) : (
            <Text className="text-white font-medium">
              {currentStep === 3 ? "Submit Ticket" : "Next"}
            </Text>
          )}
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
};

export default CreateTicketForm;
