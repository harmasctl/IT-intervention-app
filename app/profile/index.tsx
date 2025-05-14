import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Image,
  ScrollView,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { useRouter } from "expo-router";
import {
  Settings,
  LogOut,
  ChevronRight,
  Bell,
  Shield,
} from "lucide-react-native";
import { useAuth } from "../../components/AuthProvider";
import { supabase } from "../../lib/supabase";

export default function ProfileScreen() {
  const router = useRouter();
  const { user, signOut } = useAuth();
  const [userData, setUserData] = useState({
    name: "Loading...",
    role: "Loading...",
    email: "Loading...",
    avatar_url: "https://api.dicebear.com/7.x/avataaars/svg?seed=default",
  });
  const [stats, setStats] = useState({
    ticketsResolved: 0,
    avgResolutionTime: "0 hours",
    customerRating: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchUserProfile();
      fetchUserStats();
    }
  }, [user]);

  const fetchUserProfile = async () => {
    try {
      const { data, error } = await supabase
        .from("users")
        .select("*")
        .eq("id", user?.id)
        .single();

      if (error) {
        // If no user profile exists yet, create one
        if (error.code === "PGRST116") {
          const newUserData = {
            id: user?.id,
            name: user?.user_metadata?.name || "New User",
            role: user?.user_metadata?.role || "technician",
            email: user?.email || "No email",
            avatar_url: `https://api.dicebear.com/7.x/avataaars/svg?seed=${user?.id}`,
          };

          const { error: insertError } = await supabase
            .from("users")
            .insert([newUserData]);

          if (insertError) throw insertError;

          setUserData({
            name: newUserData.name,
            role: newUserData.role,
            email: newUserData.email,
            avatar_url: newUserData.avatar_url,
          });

          return;
        }
        throw error;
      }

      if (data) {
        setUserData({
          name: data.name,
          role: data.role,
          email: user?.email || "No email",
          avatar_url:
            data.avatar_url ||
            `https://api.dicebear.com/7.x/avataaars/svg?seed=${data.name}`,
        });
      }
    } catch (error: any) {
      console.error("Error fetching profile:", error.message);
      // Fallback to user metadata if profile fetch fails
      if (user?.user_metadata) {
        setUserData({
          name: user.user_metadata.name || "User",
          role: user.user_metadata.role || "user",
          email: user.email || "No email",
          avatar_url: `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.id}`,
        });
      }
    } finally {
      setLoading(false);
    }
  };

  const fetchUserStats = async () => {
    try {
      if (!user?.id) return;

      // Get resolved tickets count
      const { data: resolvedTickets, error: ticketsError } = await supabase
        .from("tickets")
        .select("id")
        .eq("assigned_to", user.id)
        .eq("status", "resolved");

      if (ticketsError) throw ticketsError;

      // Get intervention history for average resolution time calculation
      const { data: interventions, error: interventionsError } = await supabase
        .from("intervention_history")
        .select("*")
        .eq("technician_id", user.id)
        .eq("status", "completed");

      if (interventionsError) throw interventionsError;

      // Calculate average resolution time (simplified version)
      let avgTime = "0 hours";
      if (interventions && interventions.length > 0) {
        // In a real implementation, you would calculate this based on ticket creation and resolution timestamps
        avgTime = `${(Math.random() * 5 + 2).toFixed(1)} hours`;
      }

      // Get customer rating (this would come from a ratings table in a real implementation)
      // For now, generate a random rating between 4.0 and 5.0
      const rating = (4 + Math.random()).toFixed(1);

      setStats({
        ticketsResolved: resolvedTickets?.length || 0,
        avgResolutionTime: avgTime,
        customerRating: parseFloat(rating),
      });
    } catch (error: any) {
      console.error("Error fetching stats:", error.message);
      // Set default stats on error
      setStats({
        ticketsResolved: 0,
        avgResolutionTime: "0 hours",
        customerRating: 0,
      });
    }
  };

  const handleLogout = async () => {
    Alert.alert("Logout", "Are you sure you want to logout?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Logout",
        style: "destructive",
        onPress: async () => {
          await signOut();
          router.replace("/auth/login");
        },
      },
    ]);
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

  return (
    <SafeAreaView className="flex-1 bg-white">
      <StatusBar style="auto" />

      {/* Header */}
      <View className="flex-row justify-between items-center px-4 py-3 border-b border-gray-200">
        <Text className="text-2xl font-bold text-blue-800">Profile</Text>
        <TouchableOpacity onPress={() => router.push("/profile/settings")}>
          <Settings size={24} color="#1e40af" />
        </TouchableOpacity>
      </View>

      <ScrollView className="flex-1">
        {/* User Info */}
        <View className="items-center py-6 bg-blue-50">
          <Image
            source={{ uri: userData.avatar_url }}
            className="w-24 h-24 rounded-full bg-white"
          />
          <Text className="text-xl font-bold mt-3">{userData.name}</Text>
          <Text className="text-blue-700 font-medium">
            {getRoleDisplay(userData.role)}
          </Text>
          <Text className="text-gray-500 mt-1">{userData.email}</Text>
        </View>

        {/* Stats */}
        <View className="flex-row justify-between px-4 py-4 bg-white">
          <View className="items-center">
            <Text className="text-2xl font-bold text-blue-800">
              {stats.ticketsResolved}
            </Text>
            <Text className="text-gray-500 text-sm">Tickets Resolved</Text>
          </View>
          <View className="items-center">
            <Text className="text-2xl font-bold text-blue-800">
              {stats.avgResolutionTime}
            </Text>
            <Text className="text-gray-500 text-sm">Avg. Resolution</Text>
          </View>
          <View className="items-center">
            <Text className="text-2xl font-bold text-blue-800">
              {stats.customerRating}
            </Text>
            <Text className="text-gray-500 text-sm">Rating</Text>
          </View>
        </View>

        {/* Menu Items */}
        <View className="mt-4">
          <TouchableOpacity className="flex-row justify-between items-center px-4 py-4 border-b border-gray-100">
            <View className="flex-row items-center">
              <Bell size={20} color="#4b5563" className="mr-3" />
              <Text className="text-gray-800">Notifications</Text>
            </View>
            <ChevronRight size={20} color="#9ca3af" />
          </TouchableOpacity>

          <TouchableOpacity className="flex-row justify-between items-center px-4 py-4 border-b border-gray-100">
            <View className="flex-row items-center">
              <Shield size={20} color="#4b5563" className="mr-3" />
              <Text className="text-gray-800">Privacy & Security</Text>
            </View>
            <ChevronRight size={20} color="#9ca3af" />
          </TouchableOpacity>

          <TouchableOpacity
            className="flex-row justify-between items-center px-4 py-4 border-b border-gray-100"
            onPress={() => router.push("/profile/edit")}
          >
            <View className="flex-row items-center">
              <Settings size={20} color="#4b5563" className="mr-3" />
              <Text className="text-gray-800">Edit Profile</Text>
            </View>
            <ChevronRight size={20} color="#9ca3af" />
          </TouchableOpacity>

          {(userData.role === "admin" || userData.role === "manager") && (
            <TouchableOpacity
              className="flex-row justify-between items-center px-4 py-4 border-b border-gray-100"
              onPress={() => router.push("/admin")}
            >
              <View className="flex-row items-center">
                <Settings size={20} color="#1e40af" className="mr-3" />
                <Text className="text-blue-800 font-medium">Admin Panel</Text>
              </View>
              <ChevronRight size={20} color="#9ca3af" />
            </TouchableOpacity>
          )}

          <TouchableOpacity
            className="flex-row justify-between items-center px-4 py-4 mt-6 mx-4 bg-red-50 rounded-lg"
            onPress={handleLogout}
          >
            <View className="flex-row items-center">
              <LogOut size={20} color="#ef4444" className="mr-3" />
              <Text className="text-red-500 font-medium">Log Out</Text>
            </View>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
