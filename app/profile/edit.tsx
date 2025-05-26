import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Alert,
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { useRouter } from "expo-router";
import {
  ArrowLeft,
  Save,
  User,
  Mail,
  Phone,
  Camera,
  X,
  Building2,
} from "lucide-react-native";
import { supabase } from "../../lib/supabase";
import * as ImagePicker from "expo-image-picker";
import { decode } from "base64-arraybuffer";
import * as FileSystem from "expo-file-system";

type User = {
  id: string;
  name: string;
  email: string;
  phone?: string;
  role?: string;
  restaurant_id?: string;
  avatar_url?: string;
};

type Restaurant = {
  id: string;
  name: string;
};

export default function ProfileEditScreen() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [role, setRole] = useState("");
  const [restaurantId, setRestaurantId] = useState<string | null>(null);
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [newAvatarUri, setNewAvatarUri] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchUserProfile();
    fetchRestaurants();
  }, []);

  const fetchUserProfile = async () => {
    try {
      setLoading(true);
      
      // Get the current authenticated user
      const { data: { user: authUser } } = await supabase.auth.getUser();
      
      if (!authUser) {
        Alert.alert("Error", "You must be logged in to edit your profile");
        router.replace("/");
        return;
      }
      
      // Fetch the user's profile information
      const { data, error } = await supabase
        .from("users")
        .select(`
          id,
          name,
          email,
          phone,
          role,
          restaurant_id,
          avatar_url,
          restaurants(id, name)
        `)
        .eq("id", authUser.id)
        .single();
      
      if (error) {
        console.error("Error fetching user profile:", error);
        Alert.alert("Error", "Failed to load profile information");
        return;
      }
      
      if (data) {
        setUser(data);
        setName(data.name || "");
        setEmail(data.email || "");
        setPhone(data.phone || "");
        setRole(data.role || "");
        setRestaurantId(data.restaurant_id || null);
        setAvatarUrl(data.avatar_url || null);
      }
    } catch (error) {
      console.error("Error in fetchUserProfile:", error);
      Alert.alert("Error", "An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  };

  const fetchRestaurants = async () => {
    try {
      const { data, error } = await supabase
        .from("restaurants")
        .select("id, name")
        .order("name");
      
      if (error) {
        console.error("Error fetching restaurants:", error);
        return;
      }
      
      if (data) {
        setRestaurants(data);
      }
    } catch (error) {
      console.error("Error in fetchRestaurants:", error);
    }
  };

  const pickImage = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      
      if (status !== "granted") {
        Alert.alert("Permission needed", "Please grant permission to access your photos");
        return;
      }
      
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });
      
      if (!result.canceled && result.assets && result.assets[0].uri) {
        setNewAvatarUri(result.assets[0].uri);
      }
    } catch (error) {
      console.error("Error picking image:", error);
      Alert.alert("Error", "Failed to select image");
    }
  };

  const takePhoto = async () => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      
      if (status !== "granted") {
        Alert.alert("Permission needed", "Please grant permission to access your camera");
        return;
      }
      
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });
      
      if (!result.canceled && result.assets && result.assets[0].uri) {
        setNewAvatarUri(result.assets[0].uri);
      }
    } catch (error) {
      console.error("Error taking photo:", error);
      Alert.alert("Error", "Failed to capture image");
    }
  };

  const uploadAvatar = async (userId: string): Promise<string | null> => {
    if (!newAvatarUri) return avatarUrl;
    
    try {
      // First check if the image is accessible
      const imageInfo = await FileSystem.getInfoAsync(newAvatarUri);
      if (!imageInfo.exists) {
        throw new Error("Image file doesn't exist");
      }
      
      // Convert to base64
      const base64 = await FileSystem.readAsStringAsync(newAvatarUri, {
        encoding: FileSystem.EncodingType.Base64,
      });
      
      // Convert to ArrayBuffer
      const arrayBuffer = decode(base64);
      
      // Upload to Supabase Storage
      const fileExt = newAvatarUri.split(".").pop()?.toLowerCase() || "jpg";
      const filePath = `${userId}.${fileExt}`;
      
      const { data, error } = await supabase.storage
        .from("profile-photos")
        .upload(filePath, arrayBuffer, {
          contentType: `image/${fileExt}`,
          upsert: true,
        });
        
      if (error) {
        console.error("Error uploading avatar:", error);
        return avatarUrl;
      }
      
      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from("profile-photos")
        .getPublicUrl(filePath);
        
      return publicUrl;
    } catch (error) {
      console.error("Error in uploadAvatar:", error);
      return avatarUrl;
    }
  };

  const handleSave = async () => {
    if (!user) return;
    
    if (!name.trim()) {
      Alert.alert("Error", "Name is required");
      return;
    }
    
    if (!email.trim()) {
      Alert.alert("Error", "Email is required");
      return;
    }
    
    try {
      setSaving(true);
      
      // Upload avatar if a new one was selected
      const newAvatarUrl = await uploadAvatar(user.id);
      
      // Update user profile
      const { error } = await supabase
        .from("users")
        .update({
          name: name.trim(),
          email: email.trim(),
          phone: phone.trim() || null,
          role: role.trim() || null,
          restaurant_id: restaurantId,
          avatar_url: newAvatarUrl,
          updated_at: new Date().toISOString()
        })
        .eq("id", user.id);
      
      if (error) {
        console.error("Error updating profile:", error);
        Alert.alert("Error", "Failed to update profile");
        return;
      }
      
      Alert.alert(
        "Success",
        "Profile updated successfully",
        [{ text: "OK", onPress: () => router.back() }]
      );
    } catch (error) {
      console.error("Error in handleSave:", error);
      Alert.alert("Error", "An unexpected error occurred");
    } finally {
      setSaving(false);
    }
  };

  const getRestaurantName = (id: string | null) => {
    if (!id) return "None";
    const restaurant = restaurants.find(r => r.id === id);
    return restaurant ? restaurant.name : "Unknown";
  };

  if (loading) {
    return (
      <SafeAreaView className="flex-1 bg-white">
        <StatusBar style="dark" />
        <View className="flex-1 justify-center items-center">
          <ActivityIndicator size="large" color="#3B82F6" />
          <Text className="mt-4 text-gray-600">Loading profile...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      <StatusBar style="dark" />
      
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        className="flex-1"
      >
        <View className="flex-row justify-between items-center p-4 border-b border-gray-200 bg-white">
          <View className="flex-row items-center">
            <TouchableOpacity onPress={() => router.back()} className="mr-4">
              <ArrowLeft size={24} color="#0F172A" />
            </TouchableOpacity>
            <Text className="text-xl font-bold text-gray-800">Edit Profile</Text>
          </View>
          <TouchableOpacity
            className="bg-blue-500 px-4 py-2 rounded-lg flex-row items-center"
            onPress={handleSave}
            disabled={saving}
          >
            {saving ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <>
                <Save size={18} color="#FFFFFF" />
                <Text className="text-white font-medium ml-2">Save</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
        
        <ScrollView className="flex-1 p-4">
          {/* Avatar Section */}
          <View className="bg-white rounded-lg shadow-sm p-4 mb-4 items-center">
            <View className="mb-3">
              {newAvatarUri ? (
                <Image
                  source={{ uri: newAvatarUri }}
                  className="w-24 h-24 rounded-full"
                />
              ) : avatarUrl ? (
                <Image
                  source={{ uri: avatarUrl }}
                  className="w-24 h-24 rounded-full"
                />
              ) : (
                <View className="w-24 h-24 rounded-full bg-gray-200 items-center justify-center">
                  <User size={40} color="#9CA3AF" />
                </View>
              )}
            </View>
            
            <View className="flex-row">
              <TouchableOpacity
                className="bg-blue-500 px-3 py-2 rounded-lg flex-row items-center mr-2"
                onPress={pickImage}
              >
                <Text className="text-white">Gallery</Text>
              </TouchableOpacity>
              <TouchableOpacity
                className="bg-green-500 px-3 py-2 rounded-lg flex-row items-center"
                onPress={takePhoto}
              >
                <Camera size={16} color="#FFFFFF" className="mr-1" />
                <Text className="text-white">Camera</Text>
              </TouchableOpacity>
            </View>
            
            {newAvatarUri && (
              <TouchableOpacity
                className="mt-2 flex-row items-center"
                onPress={() => setNewAvatarUri(null)}
              >
                <X size={16} color="#EF4444" />
                <Text className="text-red-500 ml-1">Clear new photo</Text>
              </TouchableOpacity>
            )}
          </View>
          
          {/* Basic Info Section */}
          <View className="bg-white rounded-lg shadow-sm p-4 mb-4">
            <Text className="text-lg font-semibold text-gray-800 mb-4">Basic Information</Text>
            
            <View className="mb-4">
              <Text className="text-sm font-medium text-gray-700 mb-1">Name *</Text>
              <View className="flex-row items-center bg-white border border-gray-300 rounded-lg px-3 py-2">
                <User size={20} color="#6B7280" />
                <TextInput
                  className="flex-1 ml-2 text-gray-800"
                  value={name}
                  onChangeText={setName}
                  placeholder="Enter your name"
                />
              </View>
            </View>
            
            <View className="mb-4">
              <Text className="text-sm font-medium text-gray-700 mb-1">Email *</Text>
              <View className="flex-row items-center bg-white border border-gray-300 rounded-lg px-3 py-2">
                <Mail size={20} color="#6B7280" />
                <TextInput
                  className="flex-1 ml-2 text-gray-800"
                  value={email}
                  onChangeText={setEmail}
                  placeholder="Enter your email"
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
              </View>
            </View>
            
            <View className="mb-4">
              <Text className="text-sm font-medium text-gray-700 mb-1">Phone</Text>
              <View className="flex-row items-center bg-white border border-gray-300 rounded-lg px-3 py-2">
                <Phone size={20} color="#6B7280" />
                <TextInput
                  className="flex-1 ml-2 text-gray-800"
                  value={phone}
                  onChangeText={setPhone}
                  placeholder="Enter your phone number"
                  keyboardType="phone-pad"
                />
              </View>
            </View>
          </View>
          
          {/* Work Info Section */}
          <View className="bg-white rounded-lg shadow-sm p-4 mb-4">
            <Text className="text-lg font-semibold text-gray-800 mb-4">Work Information</Text>
            
            <View className="mb-4">
              <Text className="text-sm font-medium text-gray-700 mb-1">Role</Text>
              <TextInput
                className="bg-white border border-gray-300 rounded-lg px-4 py-3 text-gray-800"
                value={role}
                onChangeText={setRole}
                placeholder="Enter your job role"
              />
            </View>
            
            <View className="mb-4">
              <Text className="text-sm font-medium text-gray-700 mb-1">Restaurant</Text>
              <TouchableOpacity
                className="flex-row justify-between items-center bg-white border border-gray-300 rounded-lg px-4 py-3"
                onPress={() => {
                  // Show restaurant selection
                  // For simplicity, this example just toggles between first restaurant and null
                  setRestaurantId(
                    restaurantId 
                      ? null 
                      : (restaurants.length > 0 ? restaurants[0].id : null)
                  );
                }}
              >
                <View className="flex-row items-center">
                  <Building2 size={20} color="#6B7280" className="mr-2" />
                  <Text className="text-gray-800">
                    {getRestaurantName(restaurantId)}
                  </Text>
                </View>
                <Text className="text-gray-500">▼</Text>
              </TouchableOpacity>
              <Text className="text-xs text-gray-500 mt-1">
                This determines which restaurant you are assigned to
              </Text>
            </View>
          </View>
          
          <View className="h-20" />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
