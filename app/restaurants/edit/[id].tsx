import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  Image,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { useRouter, useLocalSearchParams } from "expo-router";
import {
  ArrowLeft,
  Save,
  Building2,
  Camera,
} from "lucide-react-native";
import { supabase } from "../../../lib/supabase";
import * as ImagePicker from "expo-image-picker";
import { decode } from "base64-arraybuffer";

type Restaurant = {
  id: string;
  name: string;
  location?: string;
  address?: string;
  phone?: string;
  email?: string;
  manager_name?: string;
  status?: 'active' | 'closed' | 'renovation';
  image_url?: string;
  operating_hours?: string;
};

export default function EditRestaurantScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [name, setName] = useState("");
  const [location, setLocation] = useState("");
  const [address, setAddress] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [managerName, setManagerName] = useState("");
  const [operatingHours, setOperatingHours] = useState("");
  const [status, setStatus] = useState<"active" | "closed" | "renovation">("active");
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);

  useEffect(() => {
    fetchRestaurant();
  }, [id]);

  const fetchRestaurant = async () => {
    if (!id) return;
    
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("restaurants")
        .select("*")
        .eq("id", id)
        .single();

      if (error) throw error;
      
      setRestaurant(data);
      setName(data.name || "");
      setLocation(data.location || "");
      setAddress(data.address || "");
      setPhone(data.phone || "");
      setEmail(data.email || "");
      setManagerName(data.manager_name || "");
      setOperatingHours(data.operating_hours || "");
      setStatus(data.status || "active");
      if (data.image_url) {
        setImageUri(data.image_url);
      }
    } catch (error) {
      console.error("Error fetching restaurant:", error);
      Alert.alert("Error", "Failed to load restaurant details");
    } finally {
      setLoading(false);
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
    if (!imageUri || imageUri === restaurant?.image_url) return restaurant?.image_url || null;

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

  const handleSave = async () => {
    if (!name) {
      Alert.alert("Error", "Restaurant name is required");
      return;
    }

    if (!restaurant) return;

    setSaving(true);
    try {
      // Upload image if changed
      let imageUrl = restaurant.image_url;
      if (imageUri !== restaurant.image_url) {
        const uploadedUrl = await uploadImage(restaurant.id);
        imageUrl = uploadedUrl || undefined;
      }

      // Update restaurant data
      const { error } = await supabase
        .from("restaurants")
        .update({
          name,
          location,
          address,
          phone,
          email,
          manager_name: managerName,
          operating_hours: operatingHours,
          status,
          image_url: imageUrl,
          updated_at: new Date().toISOString(),
        })
        .eq("id", restaurant.id);

      if (error) throw error;

      Alert.alert("Success", "Restaurant updated successfully", [
        { text: "OK", onPress: () => router.back() },
      ]);
    } catch (error: any) {
      console.error("Error updating restaurant:", error);
      Alert.alert("Error", error.message || "Failed to update restaurant");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView className="flex-1 bg-white">
        <StatusBar style="auto" />
        <View className="flex-1 justify-center items-center">
          <ActivityIndicator size="large" color="#1e40af" />
          <Text className="mt-4 text-gray-600">Loading restaurant details...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-white">
      <StatusBar style="auto" />

      {/* Header */}
      <View className="flex-row justify-between items-center px-4 py-3 border-b border-gray-200">
        <TouchableOpacity
          onPress={() => router.back()}
          className="flex-row items-center"
        >
          <ArrowLeft size={20} color="#3b82f6" />
          <Text className="text-blue-500 ml-1">Back</Text>
        </TouchableOpacity>
        <Text className="text-xl font-bold text-blue-800">Edit Restaurant</Text>
        <TouchableOpacity onPress={handleSave} disabled={saving}>
          <Save size={20} color={saving ? "#9ca3af" : "#3b82f6"} />
        </TouchableOpacity>
      </View>

      <ScrollView className="flex-1 p-4">
        {/* Restaurant Image */}
        <TouchableOpacity
          onPress={pickImage}
          className="bg-gray-100 rounded-xl h-48 justify-center items-center mb-6 overflow-hidden"
        >
          {imageUri ? (
            <Image
              source={{ uri: imageUri }}
              style={{ width: "100%", height: "100%" }}
            />
          ) : (
            <View className="items-center">
              <Building2 size={48} color="#9ca3af" />
              <Text className="text-gray-500 mt-2">Tap to add photo</Text>
            </View>
          )}

          <View className="absolute bottom-2 right-2 bg-blue-600 rounded-full p-2">
            <Camera size={20} color="white" />
          </View>
        </TouchableOpacity>

        <View className="space-y-4">
          <View>
            <Text className="text-gray-700 mb-1 font-medium">Name *</Text>
            <TextInput
              className="border border-gray-300 rounded-lg px-3 py-2"
              placeholder="Restaurant name"
              value={name}
              onChangeText={setName}
            />
          </View>

          <View>
            <Text className="text-gray-700 mb-1 font-medium">Location</Text>
            <TextInput
              className="border border-gray-300 rounded-lg px-3 py-2"
              placeholder="City, State"
              value={location}
              onChangeText={setLocation}
            />
          </View>

          <View>
            <Text className="text-gray-700 mb-1 font-medium">Address</Text>
            <TextInput
              className="border border-gray-300 rounded-lg px-3 py-2"
              placeholder="Full address"
              value={address}
              onChangeText={setAddress}
              multiline
            />
          </View>

          <View>
            <Text className="text-gray-700 mb-1 font-medium">Phone</Text>
            <TextInput
              className="border border-gray-300 rounded-lg px-3 py-2"
              placeholder="Phone number"
              value={phone}
              onChangeText={setPhone}
              keyboardType="phone-pad"
            />
          </View>

          <View>
            <Text className="text-gray-700 mb-1 font-medium">Email</Text>
            <TextInput
              className="border border-gray-300 rounded-lg px-3 py-2"
              placeholder="Email address"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
            />
          </View>

          <View>
            <Text className="text-gray-700 mb-1 font-medium">Manager</Text>
            <TextInput
              className="border border-gray-300 rounded-lg px-3 py-2"
              placeholder="Manager name"
              value={managerName}
              onChangeText={setManagerName}
            />
          </View>

          <View>
            <Text className="text-gray-700 mb-1 font-medium">Operating Hours</Text>
            <TextInput
              className="border border-gray-300 rounded-lg px-3 py-2"
              placeholder="e.g. Mon-Fri: 9AM-10PM"
              value={operatingHours}
              onChangeText={setOperatingHours}
            />
          </View>

          <View>
            <Text className="text-gray-700 mb-1 font-medium">Status</Text>
            <View className="flex-row">
              <TouchableOpacity
                className={`flex-1 p-3 rounded-l-lg ${
                  status === "active" ? "bg-green-100 border border-green-500" : "bg-gray-100"
                }`}
                onPress={() => setStatus("active")}
              >
                <Text
                  className={`text-center ${
                    status === "active" ? "text-green-700 font-medium" : "text-gray-700"
                  }`}
                >
                  Active
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                className={`flex-1 p-3 ${
                  status === "closed" ? "bg-red-100 border border-red-500" : "bg-gray-100"
                }`}
                onPress={() => setStatus("closed")}
              >
                <Text
                  className={`text-center ${
                    status === "closed" ? "text-red-700 font-medium" : "text-gray-700"
                  }`}
                >
                  Closed
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                className={`flex-1 p-3 rounded-r-lg ${
                  status === "renovation" ? "bg-yellow-100 border border-yellow-500" : "bg-gray-100"
                }`}
                onPress={() => setStatus("renovation")}
              >
                <Text
                  className={`text-center ${
                    status === "renovation" ? "text-yellow-700 font-medium" : "text-gray-700"
                  }`}
                >
                  Renovation
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          <TouchableOpacity
            className="bg-blue-600 py-3 rounded-lg mt-6"
            onPress={handleSave}
            disabled={saving || uploadingImage}
          >
            {saving || uploadingImage ? (
              <ActivityIndicator color="white" />
            ) : (
              <Text className="text-white font-bold text-center">
                Save Changes
              </Text>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
} 