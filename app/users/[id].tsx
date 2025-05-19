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
  Switch,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { useRouter, useLocalSearchParams } from "expo-router";
import {
  ArrowLeft,
  User,
  Mail,
  Phone,
  Calendar,
  Edit2,
  Save,
  X,
  Shield,
  Briefcase,
  Check,
  Key,
} from "lucide-react-native";
import { supabase } from "../../lib/supabase";
import { Image } from "expo-image";
import { format } from "date-fns";
import { useAuth } from "../../components/AuthProvider";
import * as ImagePicker from "expo-image-picker";
import { decode } from "base64-arraybuffer";

type UserData = {
  id: string;
  name: string;
  email: string;
  role: string;
  phone?: string;
  specialization?: string;
  avatar_url?: string;
  created_at: string;
  updated_at?: string;
};

export default function UserDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const { user: currentUser } = useAuth();
  const [userData, setUserData] = useState<UserData | null>(null);
  const [editedUser, setEditedUser] = useState<Partial<UserData>>({});
  const [loading, setLoading] = useState(true);
  const [editMode, setEditMode] = useState(false);
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [showResetPasswordModal, setShowResetPasswordModal] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isAdmin, setIsAdmin] = useState(false);
  const [ticketsResolved, setTicketsResolved] = useState(0);
  const [ticketsInProgress, setTicketsInProgress] = useState(0);
  const [showDeactivateConfirm, setShowDeactivateConfirm] = useState(false);

  const roles = [
    "technician",
    "software_tech",
    "admin",
    "manager",
    "restaurant_staff",
    "warehouse",
  ];

  useEffect(() => {
    if (id) {
      fetchUserData(id.toString());
      fetchUserStats(id.toString());
    }
    checkAdminStatus();
  }, [id]);

  const checkAdminStatus = async () => {
    if (!currentUser) return;

    try {
      const { data, error } = await supabase
        .from("users")
        .select("role")
        .eq("id", currentUser.id)
        .single();

      if (error) throw error;

      setIsAdmin(data?.role === "admin" || data?.role === "manager");
    } catch (error) {
      console.error("Error checking admin status:", error);
      setIsAdmin(false);
    }
  };

  const fetchUserData = async (userId: string) => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("users")
        .select("*")
        .eq("id", userId)
        .single();

      if (error) throw error;

      if (data) {
        setUserData(data);
        setEditedUser(data);
        if (data.avatar_url) {
          setImageUri(data.avatar_url);
        }
      }
    } catch (error) {
      console.error("Error fetching user data:", error);
      Alert.alert("Error", "Failed to load user details");
    } finally {
      setLoading(false);
    }
  };

  const fetchUserStats = async (userId: string) => {
    try {
      // Get resolved tickets count
      const { data: resolvedTickets, error: resolvedError } = await supabase
        .from("tickets")
        .select("id")
        .eq("assigned_to", userId)
        .eq("status", "resolved");

      if (resolvedError) throw resolvedError;

      // Get in-progress tickets count
      const { data: inProgressTickets, error: inProgressError } = await supabase
        .from("tickets")
        .select("id")
        .eq("assigned_to", userId)
        .in("status", ["open", "in_progress"]);

      if (inProgressError) throw inProgressError;

      setTicketsResolved(resolvedTickets?.length || 0);
      setTicketsInProgress(inProgressTickets?.length || 0);
    } catch (error) {
      console.error("Error fetching user stats:", error);
    }
  };

  const pickImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
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

  const uploadImage = async (userId: string): Promise<string | null> => {
    if (!imageUri) return null;
    
    // If the image URL hasn't changed, return the existing URL
    if (userData?.avatar_url === imageUri) {
      return imageUri;
    }

    try {
      setUploadingImage(true);
      
      // Get the file extension
      const fileExt = imageUri.split(".").pop()?.toLowerCase() || "jpeg";
      const fileName = `${userId}.${fileExt}`;
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
            .from("avatars")
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
            .from("avatars")
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
    if (!userData || !editedUser.name) {
      Alert.alert("Error", "User name is required");
      return;
    }

    try {
      let avatarUrl = userData.avatar_url || undefined;
      
      // Upload new image if changed
      if (imageUri !== userData.avatar_url) {
        const uploadedUrl = await uploadImage(userData.id);
        if (uploadedUrl) {
          avatarUrl = uploadedUrl;
        }
      }
      
      const { error } = await supabase
        .from("users")
        .update({
          ...editedUser,
          avatar_url: avatarUrl,
          updated_at: new Date().toISOString(),
        })
        .eq("id", userData.id);

      if (error) throw error;

      Alert.alert("Success", "User updated successfully");
      setEditMode(false);
      fetchUserData(userData.id);
    } catch (error) {
      console.error("Error updating user:", error);
      Alert.alert("Error", "Failed to update user");
    }
  };

  const handleResetPassword = async () => {
    if (newPassword !== confirmPassword) {
      Alert.alert("Error", "Passwords do not match");
      return;
    }

    if (newPassword.length < 6) {
      Alert.alert("Error", "Password must be at least 6 characters");
      return;
    }

    try {
      if (!userData) return;

      // Admin reset password functionality
      // In a real app, you'd use an admin API to reset a user's password
      // For now, we'll just show a success message
      Alert.alert(
        "Password Reset",
        "Password reset functionality would be implemented here with proper admin API access"
      );
      
      setShowResetPasswordModal(false);
      setNewPassword("");
      setConfirmPassword("");
    } catch (error) {
      console.error("Error resetting password:", error);
      Alert.alert("Error", "Failed to reset password");
    }
  };

  const handleDeactivateUser = async () => {
    // In a real app, this would deactivate the user rather than delete them
    // For now, we'll just show a success message
    Alert.alert(
      "User Deactivated",
      "User deactivation functionality would be implemented here"
    );
    setShowDeactivateConfirm(false);
  };

  const getRoleDisplay = (role: string) => {
    const roleMap: { [key: string]: string } = {
      technician: "Technician",
      software_tech: "Software Tech",
      admin: "Admin",
      manager: "Manager",
      restaurant_staff: "Restaurant Staff",
      warehouse: "Warehouse Personnel",
    };
    return roleMap[role] || role;
  };

  // Only admins and managers can access this page
  if (!isAdmin && !loading && userData?.id !== currentUser?.id) {
    return (
      <SafeAreaView className="flex-1 bg-gray-50">
        <StatusBar style="auto" />
        <View className="flex-1 justify-center items-center p-4">
          <Shield size={48} color="#ef4444" />
          <Text className="text-xl font-bold text-gray-800 mt-4">
            Access Restricted
          </Text>
          <Text className="text-gray-500 text-center mt-2">
            You don't have permission to access this page.
          </Text>
          <TouchableOpacity
            className="mt-6 bg-blue-600 px-6 py-3 rounded-xl"
            onPress={() => router.back()}
          >
            <Text className="text-white font-medium">Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

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

  if (!userData) {
    return (
      <SafeAreaView className="flex-1 bg-gray-50">
        <StatusBar style="auto" />
        <View className="flex-1 justify-center items-center p-4">
          <Text className="text-xl text-gray-700 text-center">
            User not found
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
        <Text className="text-xl font-bold text-white">User Details</Text>
        {isAdmin && (
          <View className="flex-row">
            {editMode ? (
              <TouchableOpacity
                onPress={handleSaveChanges}
                className="p-2 rounded-full bg-green-600"
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
                className="p-2 rounded-full bg-blue-800"
              >
                <Edit2 size={22} color="white" />
              </TouchableOpacity>
            )}
          </View>
        )}
      </View>

      <ScrollView className="flex-1">
        {/* User Avatar */}
        {editMode ? (
          <TouchableOpacity
            onPress={pickImage}
            className="items-center mt-6"
          >
            {imageUri ? (
              <Image
                source={{ uri: imageUri }}
                className="w-32 h-32 rounded-full"
                contentFit="cover"
              />
            ) : (
              <View className="w-32 h-32 rounded-full bg-gray-200 items-center justify-center">
                <User size={48} color="#9ca3af" />
              </View>
            )}
            <Text className="text-blue-600 mt-2">Change Photo</Text>
          </TouchableOpacity>
        ) : (
          <View className="items-center mt-6">
            <Image
              source={{ uri: userData.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${userData.id}` }}
              className="w-32 h-32 rounded-full bg-gray-200"
              contentFit="cover"
            />
          </View>
        )}

        {/* User Details */}
        <View className="bg-white rounded-xl p-6 shadow-sm mx-4 mt-6">
          <View className="space-y-4">
            {/* Name */}
            <View>
              <Text className="text-gray-500 text-sm">Name</Text>
              {editMode ? (
                <TextInput
                  className="border-b border-gray-300 py-1 text-gray-800 text-lg"
                  value={editedUser.name}
                  onChangeText={(text) =>
                    setEditedUser({ ...editedUser, name: text })
                  }
                  placeholder="Enter name"
                />
              ) : (
                <Text className="text-gray-800 text-lg font-medium">
                  {userData.name}
                </Text>
              )}
            </View>

            {/* Email */}
            <View>
              <Text className="text-gray-500 text-sm">Email</Text>
              <View className="flex-row items-center">
                <Mail size={16} color="#4b5563" className="mr-2" />
                <Text className="text-gray-800">
                  {userData.email}
                </Text>
              </View>
            </View>

            {/* Role */}
            <View>
              <Text className="text-gray-500 text-sm">Role</Text>
              {editMode && isAdmin ? (
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  className="mt-1"
                >
                  {roles.map((role) => (
                    <TouchableOpacity
                      key={role}
                      className={`px-4 py-2 mr-2 rounded-lg ${
                        editedUser.role === role
                          ? "bg-blue-100 border border-blue-500"
                          : "bg-gray-100"
                      }`}
                      onPress={() =>
                        setEditedUser({ ...editedUser, role: role })
                      }
                    >
                      <Text
                        className={
                          editedUser.role === role
                            ? "text-blue-700 font-medium"
                            : "text-gray-700"
                        }
                      >
                        {getRoleDisplay(role)}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              ) : (
                <View className="flex-row items-center">
                  {userData.role === "admin" || userData.role === "manager" ? (
                    <Shield size={16} color="#1e40af" className="mr-2" />
                  ) : (
                    <User size={16} color="#4b5563" className="mr-2" />
                  )}
                  <Text className="text-gray-800">
                    {getRoleDisplay(userData.role)}
                  </Text>
                </View>
              )}
            </View>

            {/* Phone */}
            <View>
              <Text className="text-gray-500 text-sm">Phone</Text>
              {editMode ? (
                <TextInput
                  className="border-b border-gray-300 py-1 text-gray-800"
                  value={editedUser.phone || ""}
                  onChangeText={(text) =>
                    setEditedUser({ ...editedUser, phone: text })
                  }
                  placeholder="Enter phone number"
                  keyboardType="phone-pad"
                />
              ) : (
                <View className="flex-row items-center">
                  <Phone size={16} color="#4b5563" className="mr-2" />
                  <Text className="text-gray-800">
                    {userData.phone || "Not specified"}
                  </Text>
                </View>
              )}
            </View>

            {/* Specialization */}
            <View>
              <Text className="text-gray-500 text-sm">Specialization</Text>
              {editMode ? (
                <TextInput
                  className="border-b border-gray-300 py-1 text-gray-800"
                  value={editedUser.specialization || ""}
                  onChangeText={(text) =>
                    setEditedUser({ ...editedUser, specialization: text })
                  }
                  placeholder="Enter specialization"
                />
              ) : (
                <View className="flex-row items-center">
                  <Briefcase size={16} color="#4b5563" className="mr-2" />
                  <Text className="text-gray-800">
                    {userData.specialization || "Not specified"}
                  </Text>
                </View>
              )}
            </View>

            {/* Created At */}
            <View>
              <Text className="text-gray-500 text-sm">Account Created</Text>
              <View className="flex-row items-center">
                <Calendar size={16} color="#4b5563" className="mr-2" />
                <Text className="text-gray-800">
                  {userData.created_at
                    ? format(new Date(userData.created_at), "PPP")
                    : "Unknown"}
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* Statistics */}
        <View className="flex-row mx-4 mt-6">
          <View className="flex-1 bg-white rounded-xl p-4 shadow-sm mr-2">
            <Text className="text-gray-500 text-sm mb-1">Tickets Resolved</Text>
            <Text className="text-2xl font-bold text-blue-600">{ticketsResolved}</Text>
          </View>
          <View className="flex-1 bg-white rounded-xl p-4 shadow-sm ml-2">
            <Text className="text-gray-500 text-sm mb-1">In Progress</Text>
            <Text className="text-2xl font-bold text-orange-500">{ticketsInProgress}</Text>
          </View>
        </View>

        {/* Admin Actions */}
        {isAdmin && userData.id !== currentUser?.id && (
          <View className="mx-4 mt-6 mb-6">
            <Text className="text-gray-700 font-medium mb-2">Admin Actions</Text>
            <View className="bg-white rounded-xl shadow-sm overflow-hidden">
              <TouchableOpacity
                className="flex-row items-center px-4 py-4 border-b border-gray-100"
                onPress={() => setShowResetPasswordModal(true)}
              >
                <Key size={20} color="#4b5563" className="mr-3" />
                <Text className="text-gray-800">Reset Password</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                className="flex-row items-center px-4 py-4"
                onPress={() => setShowDeactivateConfirm(true)}
              >
                <X size={20} color="#ef4444" className="mr-3" />
                <Text className="text-red-500">Deactivate User</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </ScrollView>

      {/* Reset Password Modal */}
      <Modal
        visible={showResetPasswordModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowResetPasswordModal(false)}
      >
        <View className="flex-1 justify-center items-center bg-black bg-opacity-50 p-4">
          <View className="bg-white rounded-xl p-6 w-full max-w-sm">
            <Text className="text-xl font-bold text-gray-800 mb-4">
              Reset Password
            </Text>
            
            <View className="mb-4">
              <Text className="text-gray-700 mb-2">New Password</Text>
              <TextInput
                className="bg-gray-100 rounded-lg px-4 py-3 text-gray-800"
                placeholder="Enter new password"
                value={newPassword}
                onChangeText={setNewPassword}
                secureTextEntry
              />
            </View>
            
            <View className="mb-6">
              <Text className="text-gray-700 mb-2">Confirm Password</Text>
              <TextInput
                className="bg-gray-100 rounded-lg px-4 py-3 text-gray-800"
                placeholder="Confirm new password"
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                secureTextEntry
              />
            </View>
            
            <View className="flex-row justify-end">
              <TouchableOpacity
                className="bg-gray-200 rounded-lg px-4 py-2 mr-2"
                onPress={() => setShowResetPasswordModal(false)}
              >
                <Text className="text-gray-800 font-medium">Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                className="bg-blue-600 rounded-lg px-4 py-2"
                onPress={handleResetPassword}
              >
                <Text className="text-white font-medium">Reset</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Deactivate User Confirmation Modal */}
      <Modal
        visible={showDeactivateConfirm}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowDeactivateConfirm(false)}
      >
        <View className="flex-1 justify-center items-center bg-black bg-opacity-50 p-4">
          <View className="bg-white rounded-xl p-6 w-full max-w-sm">
            <Text className="text-xl font-bold text-gray-800 mb-4">
              Deactivate User?
            </Text>
            <Text className="text-gray-600 mb-6">
              Are you sure you want to deactivate this user? They will no longer be able to log in.
            </Text>
            <View className="flex-row justify-end">
              <TouchableOpacity
                className="bg-gray-200 rounded-lg px-4 py-2 mr-2"
                onPress={() => setShowDeactivateConfirm(false)}
              >
                <Text className="text-gray-800 font-medium">Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                className="bg-red-600 rounded-lg px-4 py-2"
                onPress={handleDeactivateUser}
              >
                <Text className="text-white font-medium">Deactivate</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
} 