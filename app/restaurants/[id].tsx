import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  TextInput,
  Modal,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { useRouter, useLocalSearchParams } from "expo-router";
import {
  ArrowLeft,
  Building2,
  MapPin,
  Phone,
  Mail,
  User,
  Calendar,
  Edit2,
  Trash2,
  Save,
  X,
  CircleCheck,
  AlertCircle,
  Hammer,
} from "lucide-react-native";
import { supabase } from "../../lib/supabase";
import { Image } from "expo-image";
import * as ImagePicker from "expo-image-picker";
import { decode } from "base64-arraybuffer";
import { format } from "date-fns";

type Restaurant = {
  id: string;
  name: string;
  location?: string;
  address?: string;
  phone?: string;
  email?: string;
  manager_name?: string;
  status?: "active" | "closed" | "renovation";
  created_at: string;
  updated_at?: string;
  image_url?: string;
};

export default function RestaurantDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [loading, setLoading] = useState(true);
  const [editMode, setEditMode] = useState(false);
  const [editedRestaurant, setEditedRestaurant] = useState<Partial<Restaurant>>({});
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deviceCount, setDeviceCount] = useState(0);
  const [ticketCount, setTicketCount] = useState(0);

  useEffect(() => {
    if (id) {
      fetchRestaurant(id.toString());
      fetchDeviceCount(id.toString());
      fetchTicketCount(id.toString());
    }
  }, [id]);

  const fetchRestaurant = async (restaurantId: string) => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("restaurants")
        .select("*")
        .eq("id", restaurantId)
        .single();

      if (error) throw error;

      if (data) {
        setRestaurant(data);
        setEditedRestaurant(data);
        if (data.image_url) {
          setImageUri(data.image_url);
        }
      }
    } catch (error) {
      console.error("Error fetching restaurant:", error);
      Alert.alert("Error", "Failed to load restaurant details");
    } finally {
      setLoading(false);
    }
  };

  const fetchDeviceCount = async (restaurantId: string) => {
    try {
      const { count, error } = await supabase
        .from("devices")
        .select("*", { count: "exact", head: true })
        .eq("restaurant_id", restaurantId);

      if (error) throw error;
      
      setDeviceCount(count || 0);
    } catch (error) {
      console.error("Error fetching device count:", error);
    }
  };

  const fetchTicketCount = async (restaurantId: string) => {
    try {
      const { count, error } = await supabase
        .from("tickets")
        .select("*", { count: "exact", head: true })
        .eq("restaurant_id", restaurantId);

      if (error) throw error;
      
      setTicketCount(count || 0);
    } catch (error) {
      console.error("Error fetching ticket count:", error);
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
        setImageUri(result.assets[0].uri);
      }
    } catch (error) {
      console.error("Error picking image:", error);
      Alert.alert("Error", "Failed to select image");
    }
  };

  const uploadImage = async (restaurantId: string): Promise<string | null> => {
    if (!imageUri) return null;
    
    // If the image URL hasn't changed, return the existing URL
    if (restaurant?.image_url === imageUri) {
      return imageUri;
    }

    try {
      setUploadingImage(true);
      
      // Get the file extension
      const fileExt = imageUri.split(".").pop()?.toLowerCase() || "jpeg";
      const fileName = `${restaurantId}.${fileExt}`;
      const filePath = `${fileName}`;
      
      // Convert image to base64
      const response = await fetch(imageUri);
      const blob = await response.blob();
      const reader = new FileReader();
      
      return new Promise((resolve, reject) => {
        reader.onload = async () => {
          const base64 = reader.result as string;
          const base64Data = base64.split(",")[1];
          
          if (!base64Data) {
            reject(new Error("Failed to process image"));
            return;
          }
          
          const { data, error } = await supabase.storage
            .from("restaurant-photos")
            .upload(filePath, decode(base64Data), {
              contentType: `image/${fileExt}`,
              upsert: true,
            });
            
          if (error) {
            console.error("Error uploading image:", error);
            reject(error);
            return;
          }
          
          const { data: publicUrlData } = supabase.storage
            .from("restaurant-photos")
            .getPublicUrl(filePath);
            
          resolve(publicUrlData.publicUrl);
        };
        
        reader.onerror = () => {
          reject(new Error("Failed to read file"));
        };
        
        reader.readAsDataURL(blob);
      });
    } catch (error) {
      console.error("Error in uploadImage:", error);
      return null;
    } finally {
      setUploadingImage(false);
    }
  };

  const handleSaveChanges = async () => {
    if (!restaurant || !editedRestaurant.name) {
      Alert.alert("Error", "Restaurant name is required");
      return;
    }

    try {
      let imageUrl = restaurant.image_url || undefined;
      
      // Upload new image if changed
      if (imageUri !== restaurant.image_url) {
        const uploadedUrl = await uploadImage(restaurant.id);
        if (uploadedUrl) {
          imageUrl = uploadedUrl;
        }
      }
      
      const { error } = await supabase
        .from("restaurants")
        .update({
          ...editedRestaurant,
          image_url: imageUrl,
          updated_at: new Date().toISOString(),
        })
        .eq("id", restaurant.id);

      if (error) throw error;

      Alert.alert("Success", "Restaurant updated successfully");
      setEditMode(false);
      fetchRestaurant(restaurant.id);
    } catch (error) {
      console.error("Error updating restaurant:", error);
      Alert.alert("Error", "Failed to update restaurant");
    }
  };

  const handleDeleteRestaurant = async () => {
    if (!restaurant) return;

    try {
      // Check if restaurant has devices
      if (deviceCount > 0) {
        Alert.alert(
          "Cannot Delete",
          "This restaurant has associated devices. Please reassign or delete them first."
        );
        return;
      }

      // Check if restaurant has tickets
      if (ticketCount > 0) {
        Alert.alert(
          "Cannot Delete",
          "This restaurant has associated tickets. Please resolve or delete them first."
        );
        return;
      }

      const { error } = await supabase
        .from("restaurants")
        .delete()
        .eq("id", restaurant.id);

      if (error) throw error;

      // Delete restaurant image if exists
      if (restaurant.image_url) {
        const fileName = restaurant.image_url.split("/").pop();
        if (fileName) {
          await supabase.storage.from("restaurant-photos").remove([fileName]);
        }
      }

      Alert.alert("Success", "Restaurant deleted successfully");
      router.back();
    } catch (error) {
      console.error("Error deleting restaurant:", error);
      Alert.alert("Error", "Failed to delete restaurant");
    }
  };

  const getStatusIcon = (status?: string) => {
    switch (status) {
      case 'active':
        return <CircleCheck size={16} color="#16a34a" />;
      case 'closed':
        return <AlertCircle size={16} color="#dc2626" />;
      case 'renovation':
        return <Hammer size={16} color="#f59e0b" />;
      default:
        return <CircleCheck size={16} color="#16a34a" />;
    }
  };

  const getStatusText = (status?: string) => {
    switch (status) {
      case 'active':
        return "Active";
      case 'closed':
        return "Closed";
      case 'renovation':
        return "Under Renovation";
      default:
        return "Active";
    }
  };

  if (loading) {
    return (
      <SafeAreaView className="flex-1 bg-gray-50">
        <StatusBar style="auto" />
        <View className="flex-1 justify-center items-center">
          <ActivityIndicator size="large" color="#1e40af" />
        </View>
      </SafeAreaView>
    );
  }

  if (!restaurant) {
    return (
      <SafeAreaView className="flex-1 bg-gray-50">
        <StatusBar style="auto" />
        <View className="flex-1 justify-center items-center p-4">
          <Text className="text-xl text-gray-700 text-center">
            Restaurant not found
          </Text>
          <TouchableOpacity
            className="mt-4 bg-blue-600 px-6 py-3 rounded-xl"
            onPress={() => router.back()}
          >
            <Text className="text-white font-medium">Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      <StatusBar style="auto" />

      {/* Header */}
      <View className="flex-row justify-between items-center px-5 py-4 bg-gradient-to-r from-blue-700 to-blue-900 shadow-lg">
        <TouchableOpacity
          onPress={() => router.back()}
          className="p-2 rounded-full bg-blue-800"
        >
          <ArrowLeft size={22} color="white" />
        </TouchableOpacity>
        <Text className="text-xl font-bold text-white">Restaurant Details</Text>
        <View className="flex-row">
          {editMode ? (
            <TouchableOpacity
              onPress={handleSaveChanges}
              className="p-2 rounded-full bg-green-600 mr-2"
              disabled={uploadingImage}
            >
              {uploadingImage ? (
                <ActivityIndicator size="small" color="white" />
              ) : (
                <Save size={22} color="white" />
              )}
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              onPress={() => setEditMode(true)}
              className="p-2 rounded-full bg-blue-800 mr-2"
            >
              <Edit2 size={22} color="white" />
            </TouchableOpacity>
          )}
          <TouchableOpacity
            onPress={() => setShowDeleteConfirm(true)}
            className="p-2 rounded-full bg-red-600"
          >
            <Trash2 size={22} color="white" />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView className="flex-1 p-4">
        {/* Restaurant Image */}
        {editMode ? (
          <TouchableOpacity
            onPress={pickImage}
            className="bg-gray-100 rounded-xl h-56 justify-center items-center mb-6 overflow-hidden"
          >
            {imageUri ? (
              <Image
                source={{ uri: imageUri }}
                className="w-full h-full"
                contentFit="cover"
              />
            ) : (
              <View className="items-center">
                <Building2 size={48} color="#9ca3af" />
                <Text className="text-gray-500 mt-2">Add Restaurant Photo</Text>
              </View>
            )}
          </TouchableOpacity>
        ) : (
          restaurant.image_url ? (
            <View className="h-56 rounded-xl overflow-hidden mb-6">
              <Image
                source={{ uri: restaurant.image_url }}
                className="w-full h-full"
                contentFit="cover"
              />
            </View>
          ) : (
            <View className="bg-gray-100 h-56 rounded-xl justify-center items-center mb-6">
              <Building2 size={48} color="#9ca3af" />
              <Text className="text-gray-500 mt-2">No Image Available</Text>
            </View>
          )
        )}

        {/* Restaurant Details */}
        <View className="bg-white rounded-xl p-6 shadow-sm mb-6">
          <View className="flex-row items-center mb-4">
            <Building2 size={24} color="#1e40af" />
            <Text className="text-2xl font-bold text-gray-800 ml-2">
              {editMode ? (
                <TextInput
                  className="border-b border-blue-500 py-1 text-2xl font-bold text-gray-800"
                  value={editedRestaurant.name}
                  onChangeText={(text) =>
                    setEditedRestaurant({ ...editedRestaurant, name: text })
                  }
                  placeholder="Restaurant Name"
                />
              ) : (
                restaurant.name
              )}
            </Text>
          </View>

          {/* Status */}
          <View className="flex-row items-center mb-6">
            {editMode ? (
              <View className="flex-row">
                {["active", "closed", "renovation"].map((status) => (
                  <TouchableOpacity
                    key={status}
                    className={`flex-row items-center mr-4 p-2 rounded-lg ${
                      editedRestaurant.status === status
                        ? "bg-blue-100 border border-blue-500"
                        : "bg-gray-100"
                    }`}
                    onPress={() =>
                      setEditedRestaurant({
                        ...editedRestaurant,
                        status: status as Restaurant["status"],
                      })
                    }
                  >
                    {status === "active" && <CircleCheck size={16} color="#16a34a" />}
                    {status === "closed" && <AlertCircle size={16} color="#dc2626" />}
                    {status === "renovation" && <Hammer size={16} color="#f59e0b" />}
                    <Text
                      className={`ml-1 ${
                        editedRestaurant.status === status
                          ? "text-blue-700 font-medium"
                          : "text-gray-700"
                      }`}
                    >
                      {status === "active" ? "Active" : status === "closed" ? "Closed" : "Renovation"}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            ) : (
              <>
                {getStatusIcon(restaurant.status)}
                <Text className="text-gray-700 ml-2">
                  Status: {getStatusText(restaurant.status)}
                </Text>
              </>
            )}
          </View>

          <View className="space-y-4">
            {/* Location */}
            <View className="flex-row items-start">
              <MapPin size={20} color="#4b5563" className="mt-1" />
              <View className="ml-3 flex-1">
                <Text className="text-gray-500 text-sm">Location</Text>
                {editMode ? (
                  <TextInput
                    className="border-b border-gray-300 py-1 text-gray-800"
                    value={editedRestaurant.location || ""}
                    onChangeText={(text) =>
                      setEditedRestaurant({ ...editedRestaurant, location: text })
                    }
                    placeholder="Enter location"
                  />
                ) : (
                  <Text className="text-gray-800">
                    {restaurant.location || "Not specified"}
                  </Text>
                )}
              </View>
            </View>

            {/* Address */}
            <View className="flex-row items-start">
              <MapPin size={20} color="#4b5563" className="mt-1" />
              <View className="ml-3 flex-1">
                <Text className="text-gray-500 text-sm">Address</Text>
                {editMode ? (
                  <TextInput
                    className="border-b border-gray-300 py-1 text-gray-800"
                    value={editedRestaurant.address || ""}
                    onChangeText={(text) =>
                      setEditedRestaurant({ ...editedRestaurant, address: text })
                    }
                    placeholder="Enter address"
                    multiline
                  />
                ) : (
                  <Text className="text-gray-800">
                    {restaurant.address || "Not specified"}
                  </Text>
                )}
              </View>
            </View>

            {/* Phone */}
            <View className="flex-row items-start">
              <Phone size={20} color="#4b5563" className="mt-1" />
              <View className="ml-3 flex-1">
                <Text className="text-gray-500 text-sm">Phone</Text>
                {editMode ? (
                  <TextInput
                    className="border-b border-gray-300 py-1 text-gray-800"
                    value={editedRestaurant.phone || ""}
                    onChangeText={(text) =>
                      setEditedRestaurant({ ...editedRestaurant, phone: text })
                    }
                    placeholder="Enter phone number"
                    keyboardType="phone-pad"
                  />
                ) : (
                  <Text className="text-gray-800">
                    {restaurant.phone || "Not specified"}
                  </Text>
                )}
              </View>
            </View>

            {/* Email */}
            <View className="flex-row items-start">
              <Mail size={20} color="#4b5563" className="mt-1" />
              <View className="ml-3 flex-1">
                <Text className="text-gray-500 text-sm">Email</Text>
                {editMode ? (
                  <TextInput
                    className="border-b border-gray-300 py-1 text-gray-800"
                    value={editedRestaurant.email || ""}
                    onChangeText={(text) =>
                      setEditedRestaurant({ ...editedRestaurant, email: text })
                    }
                    placeholder="Enter email"
                    keyboardType="email-address"
                    autoCapitalize="none"
                  />
                ) : (
                  <Text className="text-gray-800">
                    {restaurant.email || "Not specified"}
                  </Text>
                )}
              </View>
            </View>

            {/* Manager */}
            <View className="flex-row items-start">
              <User size={20} color="#4b5563" className="mt-1" />
              <View className="ml-3 flex-1">
                <Text className="text-gray-500 text-sm">Manager</Text>
                {editMode ? (
                  <TextInput
                    className="border-b border-gray-300 py-1 text-gray-800"
                    value={editedRestaurant.manager_name || ""}
                    onChangeText={(text) =>
                      setEditedRestaurant({ ...editedRestaurant, manager_name: text })
                    }
                    placeholder="Enter manager name"
                  />
                ) : (
                  <Text className="text-gray-800">
                    {restaurant.manager_name || "Not specified"}
                  </Text>
                )}
              </View>
            </View>

            {/* Created At */}
            <View className="flex-row items-start">
              <Calendar size={20} color="#4b5563" className="mt-1" />
              <View className="ml-3">
                <Text className="text-gray-500 text-sm">Created</Text>
                <Text className="text-gray-800">
                  {restaurant.created_at
                    ? format(new Date(restaurant.created_at), "PPP")
                    : "Unknown"}
                </Text>
              </View>
            </View>

            {/* Updated At */}
            {restaurant.updated_at && (
              <View className="flex-row items-start">
                <Calendar size={20} color="#4b5563" className="mt-1" />
                <View className="ml-3">
                  <Text className="text-gray-500 text-sm">Last Updated</Text>
                  <Text className="text-gray-800">
                    {format(new Date(restaurant.updated_at), "PPP")}
                  </Text>
                </View>
              </View>
            )}
          </View>
        </View>

        {/* Statistics */}
        <View className="flex-row mb-6">
          <View className="flex-1 bg-white rounded-xl p-4 shadow-sm mr-2">
            <Text className="text-gray-500 text-sm mb-1">Devices</Text>
            <Text className="text-2xl font-bold text-blue-600">{deviceCount}</Text>
          </View>
          <View className="flex-1 bg-white rounded-xl p-4 shadow-sm ml-2">
            <Text className="text-gray-500 text-sm mb-1">Tickets</Text>
            <Text className="text-2xl font-bold text-orange-500">{ticketCount}</Text>
          </View>
        </View>

        {/* Action Buttons */}
        <View className="flex-row mb-6">
          <TouchableOpacity
            className="flex-1 bg-blue-600 rounded-xl p-4 items-center mr-2"
            onPress={() => router.push({
              pathname: "/devices",
              params: { restaurantId: restaurant.id }
            })}
          >
            <Text className="text-white font-medium">View Devices</Text>
          </TouchableOpacity>
          <TouchableOpacity
            className="flex-1 bg-orange-500 rounded-xl p-4 items-center ml-2"
            onPress={() => router.push({
              pathname: "/tickets",
              params: { restaurantId: restaurant.id }
            })}
          >
            <Text className="text-white font-medium">View Tickets</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Delete Confirmation Modal */}
      <Modal
        visible={showDeleteConfirm}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowDeleteConfirm(false)}
      >
        <View className="flex-1 justify-center items-center bg-black bg-opacity-50 p-4">
          <View className="bg-white rounded-xl p-6 w-full max-w-sm">
            <Text className="text-xl font-bold text-gray-800 mb-4">
              Delete Restaurant?
            </Text>
            <Text className="text-gray-600 mb-6">
              Are you sure you want to delete {restaurant.name}? This action cannot be undone.
            </Text>
            <View className="flex-row justify-end">
              <TouchableOpacity
                className="bg-gray-200 rounded-lg px-4 py-2 mr-2"
                onPress={() => setShowDeleteConfirm(false)}
              >
                <Text className="text-gray-800 font-medium">Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                className="bg-red-600 rounded-lg px-4 py-2"
                onPress={handleDeleteRestaurant}
              >
                <Text className="text-white font-medium">Delete</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
} 