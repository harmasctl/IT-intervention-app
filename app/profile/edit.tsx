import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Alert,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { useRouter } from "expo-router";
import { ArrowLeft, Save } from "lucide-react-native";
import { Image } from "expo-image";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../../components/AuthProvider";

export default function EditProfileScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (user) {
      fetchUserProfile();
    }
  }, [user]);

  const fetchUserProfile = async () => {
    try {
      setLoading(true);

      const { data, error } = await supabase
        .from("users")
        .select("*")
        .eq("id", user?.id)
        .single();

      if (error) throw error;

      if (data) {
        setName(data.name || "");
        setEmail(user?.email || "");
        setAvatarUrl(
          data.avatar_url ||
            `https://api.dicebear.com/7.x/avataaars/svg?seed=${data.name}`,
        );
      }
    } catch (error: any) {
      console.error("Error fetching profile:", error.message);
      // Fallback to user metadata
      if (user?.user_metadata) {
        setName(user.user_metadata.name || "");
        setEmail(user.email || "");
        setAvatarUrl(
          `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.id}`,
        );
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!name.trim()) {
      Alert.alert("Error", "Name cannot be empty");
      return;
    }

    setSaving(true);

    try {
      // Update user profile in the database
      const { error } = await supabase
        .from("users")
        .update({
          name,
          avatar_url: avatarUrl,
          updated_at: new Date().toISOString(),
        })
        .eq("id", user?.id);

      if (error) throw error;

      // Also update user metadata in auth
      const { error: updateError } = await supabase.auth.updateUser({
        data: { name },
      });

      if (updateError) throw updateError;

      Alert.alert("Success", "Profile updated successfully", [
        { text: "OK", onPress: () => router.back() },
      ]);
    } catch (error: any) {
      console.error("Error updating profile:", error);
      Alert.alert("Error", error.message || "Failed to update profile");
    } finally {
      setSaving(false);
    }
  };

  const generateNewAvatar = () => {
    // Generate a random seed for the avatar
    const randomSeed = Math.random().toString(36).substring(2, 10);
    setAvatarUrl(
      `https://api.dicebear.com/7.x/avataaars/svg?seed=${randomSeed}`,
    );
  };

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
        <Text className="text-xl font-bold text-blue-800">Edit Profile</Text>
        <TouchableOpacity onPress={handleSave} disabled={saving}>
          <Save size={20} color={saving ? "#9ca3af" : "#3b82f6"} />
        </TouchableOpacity>
      </View>

      {loading ? (
        <View className="flex-1 justify-center items-center">
          <ActivityIndicator size="large" color="#1e40af" />
          <Text className="mt-2 text-gray-600">Loading profile...</Text>
        </View>
      ) : (
        <ScrollView className="flex-1 p-4">
          {/* Avatar */}
          <View className="items-center mb-6">
            <Image
              source={{ uri: avatarUrl }}
              className="w-24 h-24 rounded-full bg-white mb-2"
            />
            <TouchableOpacity
              className="bg-blue-100 px-4 py-2 rounded-lg"
              onPress={generateNewAvatar}
            >
              <Text className="text-blue-700">Generate New Avatar</Text>
            </TouchableOpacity>
          </View>

          {/* Form */}
          <View className="mb-4">
            <Text className="text-gray-700 mb-2 font-medium">Name</Text>
            <TextInput
              className="border border-gray-300 rounded-lg p-3 bg-white"
              placeholder="Enter your name"
              value={name}
              onChangeText={setName}
            />
          </View>

          <View className="mb-4">
            <Text className="text-gray-700 mb-2 font-medium">Email</Text>
            <TextInput
              className="border border-gray-300 rounded-lg p-3 bg-gray-100"
              placeholder="Enter your email"
              value={email}
              editable={false} // Email can't be changed directly
            />
            <Text className="text-xs text-gray-500 mt-1">
              Email cannot be changed here. Please contact support for email
              changes.
            </Text>
          </View>

          <TouchableOpacity
            className={`bg-blue-600 py-3 rounded-lg items-center mt-4 ${saving ? "opacity-70" : ""}`}
            onPress={handleSave}
            disabled={saving}
          >
            {saving ? (
              <ActivityIndicator color="white" />
            ) : (
              <Text className="text-white font-semibold text-lg">
                Save Changes
              </Text>
            )}
          </TouchableOpacity>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}
