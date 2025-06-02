import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Modal,
  FlatList,
} from "react-native";
import {
  Camera,
  ChevronRight,
  AlertCircle,
  Upload,
  Check,
  X,
  Plus,
  ChevronDown,
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
  priority: "low" | "medium" | "high" | "critical";
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

  // Add new state for the device and restaurant creation modals
  const [showAddDeviceModal, setShowAddDeviceModal] = useState(false);
  const [showAddRestaurantModal, setShowAddRestaurantModal] = useState(false);
  const [newDevice, setNewDevice] = useState({
    name: "",
    type: "",
    serial_number: "",
    restaurant_id: "",
  });
  const [newRestaurant, setNewRestaurant] = useState({
    id: "",
    name: "",
    location: "",
  });
  const [creatingDevice, setCreatingDevice] = useState(false);
  const [creatingRestaurant, setCreatingRestaurant] = useState(false);

  // Add state for restaurant dropdown
  const [showRestaurantDropdown, setShowRestaurantDropdown] = useState(false);

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

      if (error) {
        console.error("Error fetching devices:", error);
        // Continue with empty devices array rather than throwing
        setDevices([]);
      } else if (data) {
        const formattedDevices = data.map((device) => ({
          id: device.id,
          name: device.name,
          type: device.type || "Unknown Type",
        }));
        setDevices(formattedDevices);
      }
    } catch (error) {
      console.error("Error fetching devices:", error);
      // Continue with empty devices array
      setDevices([]);
    } finally {
      setLoading((prev) => ({ ...prev, devices: false }));
    }
  };

  const fetchRestaurants = async () => {
    try {
      setLoading((prev) => ({ ...prev, restaurants: true }));
      const { data, error } = await supabase
        .from("restaurants")
        .select("id, name, location");

      if (error) {
        console.error("Error fetching restaurants:", error);
        // Continue with empty restaurants array rather than throwing
        setRestaurants([]);
      } else if (data) {
        const formattedRestaurants = data.map((restaurant) => ({
          id: restaurant.id,
          name: restaurant.name,
          location: restaurant.location,
        }));
        setRestaurants(formattedRestaurants);
      }
    } catch (error) {
      console.error("Error fetching restaurants:", error);
      // Continue with empty restaurants array
      setRestaurants([]);
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

  // Enhanced image upload functionality
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
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    } catch (error) {
      console.error('Error taking photo:', error);
      Alert.alert('Error', 'Failed to take photo. Please try again.');
    }
  };

  const pickImage = async () => {
    try {
      // Allow multiple image selection
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsMultipleSelection: true,
        quality: 0.8,
        base64: true,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        // Upload each image sequentially
        setLoading(prev => ({ ...prev, imageUpload: true }));

        for (const asset of result.assets) {
          await uploadImage(asset);
        }

        setLoading(prev => ({ ...prev, imageUpload: false }));
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

        if (result.assets.length > 1) {
          Alert.alert('Success', `${result.assets.length} images uploaded successfully`);
        }
      }
    } catch (error) {
      console.error('Error picking images:', error);
      Alert.alert('Error', 'Failed to select images. Please try again.');
      setLoading(prev => ({ ...prev, imageUpload: false }));
    }
  };

  const uploadImage = async (imageAsset: ImagePicker.ImagePickerAsset) => {
    if (!imageAsset.base64) {
      Alert.alert('Error', 'Image data is missing');
      return;
    }

    try {
      // Don't set loading state here if we're uploading multiple images
      if (!loading.imageUpload) {
        setLoading(prev => ({ ...prev, imageUpload: true }));
      }

      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

      // Compress image if it's too large (limit to 2MB)
      let base64Data = imageAsset.base64;
      const MAX_SIZE = 2 * 1024 * 1024; // 2MB

      // Create a unique file name with timestamp and random string
      const timestamp = Date.now();
      const randomString = Math.random().toString(36).substring(2, 8);
      const fileName = `ticket-photo-${timestamp}-${randomString}.jpg`;
      const filePath = `tickets/${user?.id || 'anonymous'}/${fileName}`;

      // Upload image to Supabase Storage
      const { data, error } = await supabase.storage
        .from('ticket-photos')
        .upload(filePath, decode(base64Data), {
          contentType: 'image/jpeg',
          cacheControl: '3600',
          upsert: false,
        });

      if (error) {
        if (error.message.includes('duplicate')) {
          // Try with a different filename if duplicate
          const newFileName = `ticket-photo-${timestamp}-${Math.random().toString(36).substring(2, 8)}.jpg`;
          const newFilePath = `tickets/${user?.id || 'anonymous'}/${newFileName}`;

          const { data: retryData, error: retryError } = await supabase.storage
            .from('ticket-photos')
            .upload(newFilePath, decode(base64Data), {
              contentType: 'image/jpeg',
              cacheControl: '3600',
              upsert: false,
            });

          if (retryError) throw retryError;

          if (retryData) {
            const { data: retryPublicUrlData } = supabase.storage
              .from('ticket-photos')
              .getPublicUrl(newFilePath);

            if (retryPublicUrlData && retryPublicUrlData.publicUrl) {
              updateTicketData('photos', [...ticketData.photos, retryPublicUrlData.publicUrl]);
            }
          }
        } else {
          throw error;
        }
      } else if (data) {
        // Get the public URL for the uploaded image
        const { data: publicUrlData } = supabase.storage
          .from('ticket-photos')
          .getPublicUrl(filePath);

        if (publicUrlData && publicUrlData.publicUrl) {
          // Add the new photo URL to the ticket data
          updateTicketData('photos', [...ticketData.photos, publicUrlData.publicUrl]);
        }
      }
    } catch (error: any) {
      console.error('Error uploading image:', error);
      Alert.alert('Error', 'Failed to upload image: ' + (error.message || 'Please try again.'));
    } finally {
      // Only set loading to false if we're not uploading multiple images
      if (!loading.imageUpload) {
        setLoading(prev => ({ ...prev, imageUpload: false }));
      }
    }
  };

  const removePhoto = async (index: number) => {
    try {
      const photoUrl = ticketData.photos[index];

      // Show loading indicator
      setLoading(prev => ({ ...prev, imageUpload: true }));

      // Extract the file path from the URL
      const storageUrl = 'https://mxbebraqpukeanginfxr.supabase.co/storage/v1/object/public/ticket-photos/';
      if (photoUrl.startsWith(storageUrl)) {
        const filePath = photoUrl.replace(storageUrl, '');

        // Delete the file from storage
        const { error } = await supabase.storage
          .from('ticket-photos')
          .remove([filePath]);

        if (error) {
          console.error('Error removing from storage:', error);
          // Continue with UI removal even if storage deletion fails
        }
      }

      // Remove the photo from the ticket data
      const updatedPhotos = [...ticketData.photos];
      updatedPhotos.splice(index, 1);
      updateTicketData('photos', updatedPhotos);

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (error) {
      console.error('Error removing photo:', error);
      Alert.alert('Error', 'Failed to remove photo');
    } finally {
      setLoading(prev => ({ ...prev, imageUpload: false }));
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
              {[
                { key: "low", label: "Low", color: "bg-green-500" },
                { key: "medium", label: "Medium", color: "bg-amber-500" },
                { key: "high", label: "High", color: "bg-orange-500" },
                { key: "critical", label: "Critical", color: "bg-red-500" }
              ].map((priority) => (
                <TouchableOpacity
                  key={priority.key}
                  className={`flex-1 py-3 mx-1 rounded-lg ${
                    ticketData.priority === priority.key
                      ? priority.color
                      : "bg-gray-200"
                  }`}
                  onPress={() => {
                    updateTicketData("priority", priority.key);
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  }}
                >
                  <Text
                    className={`text-center font-medium text-xs ${
                      ticketData.priority === priority.key
                        ? "text-white"
                        : "text-gray-700"
                    }`}
                  >
                    {priority.label}
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

            {/* Show selected restaurant info if available */}
            {ticketData.restaurant && (
              <View className="bg-blue-50 p-3 rounded-lg mb-4">
                <Text className="text-blue-800 font-medium">Selected Restaurant:</Text>
                <Text className="text-blue-900">{ticketData.restaurant.name}</Text>
                {ticketData.restaurant.location && (
                  <Text className="text-blue-700 text-sm">{ticketData.restaurant.location}</Text>
                )}
              </View>
            )}

            <TextInput
              className="bg-gray-100 p-4 rounded-lg text-base mb-4"
              placeholder="Search devices..."
              value={deviceSearchQuery}
              onChangeText={setDeviceSearchQuery}
            />

            {loading.devices ? (
              <ActivityIndicator size="small" color="#1e40af" />
            ) : (
              <>
                <ScrollView
                  className="max-h-72"
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

                <TouchableOpacity
                  className="mt-4 p-4 rounded-lg bg-blue-50 flex-row items-center justify-center"
                  onPress={() => {
                    if (!ticketData.restaurant) {
                      Alert.alert(
                        "Restaurant Required",
                        "Please select a restaurant first before adding a device.",
                        [
                          {
                            text: "Cancel",
                            style: "cancel"
                          },
                          {
                            text: "Go to Restaurant Selection",
                            onPress: () => setCurrentStep(2) // Go to restaurant selection
                          }
                        ]
                      );
                    } else {
                      setShowAddDeviceModal(true);
                    }
                  }}
                >
                  <Plus size={20} color="#1e40af" />
                  <Text className="text-blue-800 ml-2 font-medium">
                    Add New Device
                  </Text>
                </TouchableOpacity>
              </>
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
              <>
                <ScrollView
                  className="max-h-72"
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
                          <View className="flex-row">
                            <Text className="text-gray-500 text-sm mr-2">ID: {restaurant.id.substring(0, 8)}</Text>
                            {restaurant.location && (
                              <Text className="text-gray-500 text-sm">
                                {restaurant.location}
                              </Text>
                            )}
                          </View>
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

                <TouchableOpacity
                  className="mt-4 p-4 rounded-lg bg-blue-50 flex-row items-center justify-center"
                  onPress={() => setShowAddRestaurantModal(true)}
                >
                  <Plus size={20} color="#1e40af" />
                  <Text className="text-blue-800 ml-2 font-medium">
                    Add New Restaurant
                  </Text>
                </TouchableOpacity>
              </>
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
                <Text className="text-blue-800 ml-2">Upload Photo{ticketData.photos.length > 0 ? 's' : ''}</Text>
              </TouchableOpacity>
            </View>

            {loading.imageUpload && (
              <View className="items-center py-2 mb-4 bg-blue-50 rounded-lg p-2">
                <ActivityIndicator size="small" color="#1e40af" />
                <Text className="text-blue-800 mt-1">Processing image{ticketData.photos.length > 0 ? 's' : ''}...</Text>
              </View>
            )}

            {ticketData.photos.length > 0 && (
              <>
                <Text className="text-gray-700 mb-2">
                  {ticketData.photos.length} {ticketData.photos.length === 1 ? 'photo' : 'photos'} attached
                </Text>
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
                        transition={200}
                        cachePolicy="memory-disk"
                      />
                      <TouchableOpacity
                        className="absolute top-1 right-1 bg-red-500 rounded-full p-1"
                        onPress={() => removePhoto(index)}
                        disabled={loading.imageUpload}
                      >
                        <X size={16} color="#ffffff" />
                      </TouchableOpacity>
                    </View>
                  ))}
                </ScrollView>
              </>
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

  // Update function to create a new device
  const handleCreateDevice = async () => {
    if (!newDevice.name || !newDevice.type || !newDevice.serial_number) {
      Alert.alert("Validation Error", "All device fields are required");
      return;
    }

    try {
      setCreatingDevice(true);

      // Get the restaurant ID - either from the modal or from the selected restaurant
      const restaurantId = newDevice.restaurant_id || ticketData.restaurant?.id;

      if (!restaurantId) {
        Alert.alert("Error", "Please select a restaurant");
        setCreatingDevice(false);
        return;
      }

      // Create the new device in Supabase
      const { data, error } = await supabase
        .from("devices")
        .insert({
          name: newDevice.name,
          type: newDevice.type,
          serial_number: newDevice.serial_number,
          restaurant_id: restaurantId,
          status: "operational",
        })
        .select();

      if (error) {
        console.error("Error creating device:", error);
        throw error;
      }

      if (data && data[0]) {
        // Add the new device to the devices list
        const newDeviceOption: DeviceOption = {
          id: data[0].id,
          name: data[0].name,
          type: data[0].type,
        };

        setDevices((prev) => [...prev, newDeviceOption]);

        // Select the new device
        updateTicketData("device", newDeviceOption);

        // Close the modal
        setShowAddDeviceModal(false);

        // Reset the new device form
        setNewDevice({
          name: "",
          type: "",
          serial_number: "",
          restaurant_id: "",
        });

        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        Alert.alert("Success", "New device created successfully");
      }
    } catch (error: any) {
      console.error("Error creating device:", error);
      Alert.alert("Error", error.message || "Failed to create device");
    } finally {
      setCreatingDevice(false);
    }
  };

  // Update function to create a new restaurant
  const handleCreateRestaurant = async () => {
    if (!newRestaurant.name) {
      Alert.alert("Validation Error", "Restaurant name is required");
      return;
    }

    try {
      setCreatingRestaurant(true);

      // Prepare insert data - if ID is provided, use it, otherwise let Supabase generate one
      const insertData: any = {
        name: newRestaurant.name,
      };

      // Add location if provided
      if (newRestaurant.location) {
        insertData.location = newRestaurant.location;
      }

      // Add custom ID if provided
      if (newRestaurant.id) {
        insertData.id = newRestaurant.id;
      }

      // Create the new restaurant in Supabase
      const { data, error } = await supabase
        .from("restaurants")
        .insert(insertData)
        .select();

      if (error) {
        console.error("Error creating restaurant:", error);
        throw error;
      }

      if (data && data[0]) {
        // Add the new restaurant to the restaurants list
        const newRestaurantOption: RestaurantOption = {
          id: data[0].id,
          name: data[0].name,
          location: data[0].location,
        };

        setRestaurants((prev) => [...prev, newRestaurantOption]);

        // Select the new restaurant
        updateTicketData("restaurant", newRestaurantOption);

        // Close the modal
        setShowAddRestaurantModal(false);

        // Reset the new restaurant form
        setNewRestaurant({
          id: "",
          name: "",
          location: "",
        });

        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        Alert.alert("Success", "New restaurant created successfully");
      }
    } catch (error: any) {
      console.error("Error creating restaurant:", error);
      Alert.alert("Error", error.message || "Failed to create restaurant");
    } finally {
      setCreatingRestaurant(false);
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

      {/* Add Device Modal */}
      <Modal
        visible={showAddDeviceModal}
        transparent={true}
        animationType="slide"
      >
        <View className="flex-1 justify-center items-center bg-black/50">
          <View className="bg-white w-11/12 p-6 rounded-xl">
            <Text className="text-xl font-bold mb-4">Add New Device</Text>

            {/* Display selected restaurant info */}
            {ticketData.restaurant && (
              <View className="bg-blue-50 p-3 rounded-lg mb-4">
                <Text className="text-blue-800 font-medium">Selected Restaurant:</Text>
                <Text className="text-blue-900">{ticketData.restaurant.name}</Text>
                {ticketData.restaurant.location && (
                  <Text className="text-blue-700 text-sm">{ticketData.restaurant.location}</Text>
                )}
              </View>
            )}

            {/* Replace Picker with custom dropdown */}
            {ticketData.restaurant && (
              <View className="mb-4">
                <Text className="font-medium mb-1">Or choose a different restaurant:</Text>
                <TouchableOpacity
                  className="bg-gray-100 p-4 rounded-lg flex-row justify-between items-center"
                  onPress={() => setShowRestaurantDropdown(true)}
                >
                  <Text>
                    {newDevice.restaurant_id
                      ? restaurants.find(r => r.id === newDevice.restaurant_id)?.name || "Select a restaurant"
                      : "Use selected restaurant"}
                  </Text>
                  <ChevronDown size={20} color="#333" />
                </TouchableOpacity>
              </View>
            )}

            <Text className="font-medium mb-1">Device Name</Text>
            <TextInput
              className="bg-gray-100 p-3 rounded-lg mb-4"
              placeholder="Enter device name"
              value={newDevice.name}
              onChangeText={(text) => setNewDevice((prev) => ({ ...prev, name: text }))}
            />

            <Text className="font-medium mb-1">Device Type</Text>
            <TextInput
              className="bg-gray-100 p-3 rounded-lg mb-4"
              placeholder="Enter device type"
              value={newDevice.type}
              onChangeText={(text) => setNewDevice((prev) => ({ ...prev, type: text }))}
            />

            <Text className="font-medium mb-1">Serial Number</Text>
            <TextInput
              className="bg-gray-100 p-3 rounded-lg mb-6"
              placeholder="Enter serial number"
              value={newDevice.serial_number}
              onChangeText={(text) => setNewDevice((prev) => ({ ...prev, serial_number: text }))}
            />

            <View className="flex-row justify-end gap-4">
              <TouchableOpacity
                className="bg-gray-200 px-4 py-2 rounded-lg"
                onPress={() => {
                  setShowAddDeviceModal(false);
                  setNewDevice({
                    name: "",
                    type: "",
                    serial_number: "",
                    restaurant_id: "",
                  });
                }}
              >
                <Text className="text-gray-800">Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                className="bg-blue-600 px-4 py-2 rounded-lg"
                onPress={handleCreateDevice}
                disabled={creatingDevice}
              >
                {creatingDevice ? (
                  <ActivityIndicator size="small" color="#ffffff" />
                ) : (
                  <Text className="text-white">Create Device</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Restaurant dropdown modal */}
      <Modal
        visible={showRestaurantDropdown}
        transparent={true}
        animationType="slide"
      >
        <View className="flex-1 justify-center items-center bg-black/50">
          <View className="bg-white w-11/12 p-6 rounded-xl max-h-80">
            <Text className="text-xl font-bold mb-4">Select Restaurant</Text>

            <TouchableOpacity
              className="bg-blue-100 p-3 rounded-lg mb-2 flex-row justify-between items-center"
              onPress={() => {
                setNewDevice(prev => ({ ...prev, restaurant_id: "" }));
                setShowRestaurantDropdown(false);
              }}
            >
              <Text className="text-blue-800">Use selected restaurant</Text>
              {!newDevice.restaurant_id && <Check size={20} color="#1e40af" />}
            </TouchableOpacity>

            <FlatList
              data={restaurants}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <TouchableOpacity
                  className={`p-3 mb-2 rounded-lg flex-row justify-between items-center ${
                    newDevice.restaurant_id === item.id ? "bg-blue-100" : "bg-gray-100"
                  }`}
                  onPress={() => {
                    setNewDevice(prev => ({ ...prev, restaurant_id: item.id }));
                    setShowRestaurantDropdown(false);
                  }}
                >
                  <View>
                    <Text className="font-medium">{item.name}</Text>
                    <View className="flex-row">
                      <Text className="text-gray-500 text-sm mr-2">ID: {item.id.substring(0, 8)}</Text>
                      {item.location && (
                        <Text className="text-gray-500 text-sm">
                          {item.location}
                        </Text>
                      )}
                    </View>
                  </View>
                  {newDevice.restaurant_id === item.id && <Check size={20} color="#1e40af" />}
                </TouchableOpacity>
              )}
            />

            <TouchableOpacity
              className="bg-gray-200 p-3 rounded-lg mt-2 items-center"
              onPress={() => setShowRestaurantDropdown(false)}
            >
              <Text className="font-medium">Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Add Restaurant Modal */}
      <Modal
        visible={showAddRestaurantModal}
        transparent={true}
        animationType="slide"
      >
        <View className="flex-1 justify-center items-center bg-black/50">
          <View className="bg-white w-11/12 p-6 rounded-xl">
            <Text className="text-xl font-bold mb-4">Add New Restaurant</Text>

            <Text className="font-medium mb-1">Restaurant ID (Optional)</Text>
            <TextInput
              className="bg-gray-100 p-3 rounded-lg mb-4"
              placeholder="Enter custom ID (UUID format) or leave blank for auto-generated"
              value={newRestaurant.id}
              onChangeText={(text) => setNewRestaurant((prev) => ({ ...prev, id: text }))}
            />

            <Text className="font-medium mb-1">Restaurant Name</Text>
            <TextInput
              className="bg-gray-100 p-3 rounded-lg mb-4"
              placeholder="Enter restaurant name"
              value={newRestaurant.name}
              onChangeText={(text) => setNewRestaurant((prev) => ({ ...prev, name: text }))}
            />

            <Text className="font-medium mb-1">Location (Optional)</Text>
            <TextInput
              className="bg-gray-100 p-3 rounded-lg mb-6"
              placeholder="Enter restaurant location"
              value={newRestaurant.location}
              onChangeText={(text) => setNewRestaurant((prev) => ({ ...prev, location: text }))}
            />

            <View className="flex-row justify-end gap-4">
              <TouchableOpacity
                className="bg-gray-200 px-4 py-2 rounded-lg"
                onPress={() => {
                  setShowAddRestaurantModal(false);
                  setNewRestaurant({
                    id: "",
                    name: "",
                    location: "",
                  });
                }}
              >
                <Text className="text-gray-800">Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                className="bg-blue-600 px-4 py-2 rounded-lg"
                onPress={handleCreateRestaurant}
                disabled={creatingRestaurant}
              >
                {creatingRestaurant ? (
                  <ActivityIndicator size="small" color="#ffffff" />
                ) : (
                  <Text className="text-white">Create Restaurant</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
};

export default CreateTicketForm;
