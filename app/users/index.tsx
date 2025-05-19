import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  TextInput,
  Alert,
  Modal,
  ScrollView,
  Switch,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { useRouter } from "expo-router";
import {
  Search,
  Plus,
  Filter,
  User,
  ChevronRight,
  X,
  Mail,
  Phone,
  Shield,
  Briefcase,
  Users as UsersIcon,
} from "lucide-react-native";
import { supabase } from "../../lib/supabase";
import { Image } from "expo-image";
import { useAuth } from "../../components/AuthProvider";

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

export default function UsersScreen() {
  const router = useRouter();
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState<UserData[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<UserData[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [showAddModal, setShowAddModal] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [selectedRole, setSelectedRole] = useState<string | null>(null);
  const [showInactiveUsers, setShowInactiveUsers] = useState(false);
  const [newUser, setNewUser] = useState({
    name: "",
    email: "",
    role: "technician",
    phone: "",
    specialization: "",
    password: "",
    confirmPassword: "",
  });
  const [isAdmin, setIsAdmin] = useState(false);

  const roles = [
    "All",
    "technician",
    "software_tech",
    "admin",
    "manager",
    "restaurant_staff",
    "warehouse",
  ];

  useEffect(() => {
    fetchUsers();
    checkAdminStatus();

    // Set up real-time subscription for user changes
    const userSubscription = supabase
      .channel("user-changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "users" },
        (payload) => {
          console.log("User change received:", payload);
          fetchUsers();
        },
      )
      .subscribe();

    return () => {
      userSubscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    filterUsers();
  }, [searchQuery, selectedRole, showInactiveUsers, users]);

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

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("users")
        .select("*")
        .order("name");

      if (error) throw error;

      if (data) {
        setUsers(data);
      }
    } catch (error) {
      console.error("Error fetching users:", error);
      Alert.alert("Error", "Failed to load users");
    } finally {
      setLoading(false);
    }
  };

  const filterUsers = () => {
    let filtered = [...users];

    // Apply search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (user) =>
          user.name.toLowerCase().includes(query) ||
          user.email.toLowerCase().includes(query) ||
          user.specialization?.toLowerCase().includes(query),
      );
    }

    // Apply role filter
    if (selectedRole && selectedRole !== "All") {
      filtered = filtered.filter((user) => user.role === selectedRole);
    }

    // Apply inactive filter (for future implementation)
    // This would require an 'active' field in the users table
    // if (!showInactiveUsers) {
    //   filtered = filtered.filter((user) => user.active !== false);
    // }

    setFilteredUsers(filtered);
  };

  const handleAddUser = async () => {
    // Validate inputs
    if (!newUser.name || !newUser.email || !newUser.password) {
      Alert.alert("Error", "Name, email and password are required");
      return;
    }

    if (newUser.password !== newUser.confirmPassword) {
      Alert.alert("Error", "Passwords do not match");
      return;
    }

    try {
      // First create the auth user
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: newUser.email,
        password: newUser.password,
        options: {
          data: {
            name: newUser.name,
            role: newUser.role,
          },
        },
      });

      if (authError) throw authError;

      if (authData?.user) {
        // Then create the user profile
        const { error: profileError } = await supabase.from("users").insert([
          {
            id: authData.user.id,
            email: newUser.email,
            name: newUser.name,
            role: newUser.role,
            phone: newUser.phone || null,
            specialization: newUser.specialization || null,
            avatar_url: `https://api.dicebear.com/7.x/avataaars/svg?seed=${authData.user.id}`,
          },
        ]);

        if (profileError) throw profileError;

        Alert.alert("Success", "User added successfully");
        setShowAddModal(false);
        setNewUser({
          name: "",
          email: "",
          role: "technician",
          phone: "",
          specialization: "",
          password: "",
          confirmPassword: "",
        });
        fetchUsers();
      }
    } catch (error: any) {
      console.error("Error adding user:", error);
      Alert.alert("Error", error.message || "Failed to add user");
    }
  };

  const handleUserPress = (userId: string) => {
    router.push(`/users/${userId}` as any);
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

  const getRoleIcon = (role: string) => {
    switch (role) {
      case "admin":
        return <Shield size={16} color="#1e40af" />;
      case "manager":
        return <Briefcase size={16} color="#1e40af" />;
      default:
        return <User size={16} color="#6b7280" />;
    }
  };

  const renderUserItem = ({ item }: { item: UserData }) => (
    <TouchableOpacity
      className="bg-white rounded-xl p-4 mb-4 shadow-sm"
      onPress={() => handleUserPress(item.id)}
    >
      <View className="flex-row">
        {/* User Avatar */}
        <View className="mr-3">
          <Image
            source={{ uri: item.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${item.id}` }}
            className="w-16 h-16 rounded-full bg-gray-200"
          />
        </View>

        {/* User Details */}
        <View className="flex-1">
          <View className="flex-row justify-between items-start">
            <View className="flex-1">
              <Text className="font-bold text-lg text-gray-800">{item.name}</Text>
              <View className="flex-row items-center">
                {getRoleIcon(item.role)}
                <Text className="text-gray-600 text-sm ml-1">
                  {getRoleDisplay(item.role)}
                </Text>
              </View>
            </View>
            <ChevronRight size={20} color="#9ca3af" />
          </View>

          <View className="mt-2">
            <View className="flex-row items-center mt-1">
              <Mail size={14} color="#6b7280" />
              <Text className="text-gray-500 text-sm ml-1">{item.email}</Text>
            </View>

            {item.phone && (
              <View className="flex-row items-center mt-1">
                <Phone size={14} color="#6b7280" />
                <Text className="text-gray-500 text-sm ml-1">{item.phone}</Text>
              </View>
            )}

            {item.specialization && (
              <View className="flex-row items-center mt-1">
                <Briefcase size={14} color="#6b7280" />
                <Text className="text-gray-500 text-sm ml-1">
                  {item.specialization}
                </Text>
              </View>
            )}
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );

  // Only admins and managers can access this page
  if (!isAdmin && !loading) {
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

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      <StatusBar style="auto" />

      {/* Header */}
      <View className="flex-row justify-between items-center px-5 py-4 bg-gradient-to-r from-blue-700 to-blue-900 shadow-lg">
        <View className="flex-row items-center">
          <UsersIcon size={24} color="white" className="mr-2" />
          <Text className="text-2xl font-bold text-white">Users</Text>
        </View>
        <View className="flex-row">
          <TouchableOpacity
            className="bg-blue-800 p-2 rounded-full mr-2"
            onPress={() => setShowFilters(!showFilters)}
          >
            <Filter size={22} color="white" />
          </TouchableOpacity>
          <TouchableOpacity
            className="bg-green-600 p-2 rounded-full"
            onPress={() => setShowAddModal(true)}
          >
            <Plus size={22} color="white" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Search */}
      <View className="p-4 bg-white shadow-sm">
        <View className="flex-row items-center bg-gray-100 rounded-xl px-4 py-3">
          <Search size={20} color="#4b5563" />
          <TextInput
            className="flex-1 ml-3 py-1 text-base"
            placeholder="Search users..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholderTextColor="#9ca3af"
          />
        </View>
      </View>

      {/* Filters */}
      {showFilters && (
        <View className="p-4 bg-white border-t border-gray-200">
          <Text className="font-medium text-gray-700 mb-2">Filter by Role</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            className="mb-3"
          >
            {roles.map((role) => (
              <TouchableOpacity
                key={role}
                className={`px-4 py-2 mr-2 rounded-lg ${
                  selectedRole === role || (role === "All" && selectedRole === null)
                    ? "bg-blue-100 border border-blue-500"
                    : "bg-gray-100"
                }`}
                onPress={() => setSelectedRole(role === "All" ? null : role)}
              >
                <Text
                  className={
                    selectedRole === role || (role === "All" && selectedRole === null)
                      ? "text-blue-700 font-medium"
                      : "text-gray-700"
                  }
                >
                  {role === "All" ? "All Roles" : getRoleDisplay(role)}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          <View className="flex-row items-center justify-between">
            <Text className="font-medium text-gray-700">Show Inactive Users</Text>
            <Switch
              value={showInactiveUsers}
              onValueChange={setShowInactiveUsers}
              trackColor={{ false: "#d1d5db", true: "#bfdbfe" }}
              thumbColor={showInactiveUsers ? "#3b82f6" : "#9ca3af"}
            />
          </View>
        </View>
      )}

      {/* User List */}
      {loading ? (
        <View className="flex-1 justify-center items-center">
          <ActivityIndicator size="large" color="#1e40af" />
        </View>
      ) : filteredUsers.length > 0 ? (
        <FlatList
          data={filteredUsers}
          renderItem={renderUserItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ padding: 16 }}
          showsVerticalScrollIndicator={false}
        />
      ) : (
        <View className="flex-1 justify-center items-center p-4">
          <UsersIcon size={48} color="#9ca3af" />
          <Text className="text-gray-500 text-lg text-center mt-4">
            No users found
          </Text>
        </View>
      )}

      {/* Add User Modal */}
      <Modal
        visible={showAddModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowAddModal(false)}
      >
        <View className="flex-1 justify-end bg-black bg-opacity-50">
          <View className="bg-white rounded-t-3xl p-6 h-5/6">
            <View className="flex-row justify-between items-center mb-6">
              <Text className="text-2xl font-bold text-gray-800">
                Add New User
              </Text>
              <TouchableOpacity
                onPress={() => setShowAddModal(false)}
                className="bg-gray-200 rounded-full p-2"
              >
                <X size={20} color="#4b5563" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              {/* Form Fields */}
              <View className="mb-4">
                <Text className="text-gray-700 mb-2 font-medium">Name *</Text>
                <TextInput
                  className="bg-gray-100 rounded-xl px-4 py-3 text-gray-800"
                  placeholder="Full name"
                  value={newUser.name}
                  onChangeText={(text) =>
                    setNewUser({ ...newUser, name: text })
                  }
                />
              </View>

              <View className="mb-4">
                <Text className="text-gray-700 mb-2 font-medium">Email *</Text>
                <TextInput
                  className="bg-gray-100 rounded-xl px-4 py-3 text-gray-800"
                  placeholder="Email address"
                  value={newUser.email}
                  onChangeText={(text) =>
                    setNewUser({ ...newUser, email: text })
                  }
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
              </View>

              <View className="mb-4">
                <Text className="text-gray-700 mb-2 font-medium">Password *</Text>
                <TextInput
                  className="bg-gray-100 rounded-xl px-4 py-3 text-gray-800"
                  placeholder="Password"
                  value={newUser.password}
                  onChangeText={(text) =>
                    setNewUser({ ...newUser, password: text })
                  }
                  secureTextEntry
                />
              </View>

              <View className="mb-4">
                <Text className="text-gray-700 mb-2 font-medium">Confirm Password *</Text>
                <TextInput
                  className="bg-gray-100 rounded-xl px-4 py-3 text-gray-800"
                  placeholder="Confirm password"
                  value={newUser.confirmPassword}
                  onChangeText={(text) =>
                    setNewUser({ ...newUser, confirmPassword: text })
                  }
                  secureTextEntry
                />
              </View>

              <View className="mb-4">
                <Text className="text-gray-700 mb-2 font-medium">Phone</Text>
                <TextInput
                  className="bg-gray-100 rounded-xl px-4 py-3 text-gray-800"
                  placeholder="Phone number"
                  value={newUser.phone}
                  onChangeText={(text) =>
                    setNewUser({ ...newUser, phone: text })
                  }
                  keyboardType="phone-pad"
                />
              </View>

              <View className="mb-4">
                <Text className="text-gray-700 mb-2 font-medium">Specialization</Text>
                <TextInput
                  className="bg-gray-100 rounded-xl px-4 py-3 text-gray-800"
                  placeholder="Area of expertise"
                  value={newUser.specialization}
                  onChangeText={(text) =>
                    setNewUser({ ...newUser, specialization: text })
                  }
                />
              </View>

              <View className="mb-6">
                <Text className="text-gray-700 mb-2 font-medium">Role</Text>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  className="mb-2"
                >
                  {roles.filter(r => r !== "All").map((role) => (
                    <TouchableOpacity
                      key={role}
                      className={`px-4 py-3 mr-2 rounded-lg ${
                        newUser.role === role
                          ? "bg-blue-100 border border-blue-500"
                          : "bg-gray-100"
                      }`}
                      onPress={() =>
                        setNewUser({ ...newUser, role: role })
                      }
                    >
                      <Text
                        className={
                          newUser.role === role
                            ? "text-blue-700 font-medium"
                            : "text-gray-700"
                        }
                      >
                        {getRoleDisplay(role)}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>

              <TouchableOpacity
                className="bg-blue-600 rounded-xl py-4 items-center mb-6"
                onPress={handleAddUser}
              >
                <Text className="text-white font-bold text-lg">
                  Add User
                </Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
} 