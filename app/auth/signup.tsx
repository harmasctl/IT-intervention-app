import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  ScrollView,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { useRouter } from "expo-router";
import { Lock, Mail, User, ChevronDown, ChevronUp } from "lucide-react-native";
import { useAuth } from "../../components/AuthProvider";

export default function SignUpScreen() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [role, setRole] = useState("");
  const [showRoleOptions, setShowRoleOptions] = useState(false);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const { signUp } = useAuth();

  const roles = [
    { value: "technician", label: "Technician" },
    { value: "software_tech", label: "Software Tech" },
    { value: "admin", label: "Admin" },
    { value: "manager", label: "Manager" },
    { value: "restaurant_staff", label: "Restaurant Staff" },
    { value: "warehouse", label: "Warehouse Personnel" },
  ];

  const handleSignUp = async () => {
    if (!email || !password || !name || !role) {
      Alert.alert("Error", "Please fill in all fields");
      return;
    }

    // Basic validation
    if (password.length < 6) {
      Alert.alert("Error", "Password must be at least 6 characters long");
      return;
    }

    if (!email.includes("@") || !email.includes(".")) {
      Alert.alert("Error", "Please enter a valid email address");
      return;
    }

    setLoading(true);
    try {
      const { error } = await signUp(email, password, { name, role });
      if (error) {
        Alert.alert("Sign Up Failed", error.message);
      } else {
        Alert.alert(
          "Sign Up Successful",
          "Your account has been created. Please check your email for verification.",
          [{ text: "OK", onPress: () => router.replace("/auth/login") }],
        );
      }
    } catch (error: any) {
      Alert.alert("Error", error.message || "An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  };

  const navigateToLogin = () => {
    router.push("/auth/login");
  };

  const getRoleLabel = (value: string) => {
    const roleObj = roles.find((r) => r.value === value);
    return roleObj ? roleObj.label : "Select Role";
  };

  return (
    <SafeAreaView className="flex-1 bg-white">
      <StatusBar style="auto" />
      <ScrollView className="flex-1 px-6">
        <View className="items-center my-10">
          <Text className="text-3xl font-bold text-blue-800 mb-2">
            Create Account
          </Text>
          <Text className="text-gray-500 text-center">
            Join the restaurant equipment support team
          </Text>
        </View>

        <View className="mb-4">
          <Text className="text-gray-700 mb-2 font-medium">Full Name</Text>
          <View className="flex-row items-center bg-gray-100 rounded-lg px-3 py-2">
            <User size={20} color="#6b7280" />
            <TextInput
              className="flex-1 ml-2 py-2 text-base"
              placeholder="Enter your full name"
              value={name}
              onChangeText={setName}
            />
          </View>
        </View>

        <View className="mb-4">
          <Text className="text-gray-700 mb-2 font-medium">Email</Text>
          <View className="flex-row items-center bg-gray-100 rounded-lg px-3 py-2">
            <Mail size={20} color="#6b7280" />
            <TextInput
              className="flex-1 ml-2 py-2 text-base"
              placeholder="Enter your email"
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
            />
          </View>
        </View>

        <View className="mb-4">
          <Text className="text-gray-700 mb-2 font-medium">Password</Text>
          <View className="flex-row items-center bg-gray-100 rounded-lg px-3 py-2">
            <Lock size={20} color="#6b7280" />
            <TextInput
              className="flex-1 ml-2 py-2 text-base"
              placeholder="Create a password"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
            />
          </View>
        </View>

        <View className="mb-8">
          <Text className="text-gray-700 mb-2 font-medium">Role</Text>
          <TouchableOpacity
            className="flex-row justify-between items-center bg-gray-100 rounded-lg px-3 py-3"
            onPress={() => setShowRoleOptions(!showRoleOptions)}
          >
            <Text className={role ? "text-black" : "text-gray-400"}>
              {role ? getRoleLabel(role) : "Select your role"}
            </Text>
            {showRoleOptions ? (
              <ChevronUp size={20} color="#6b7280" />
            ) : (
              <ChevronDown size={20} color="#6b7280" />
            )}
          </TouchableOpacity>

          {showRoleOptions && (
            <View className="bg-white border border-gray-200 rounded-lg mt-1 shadow-sm">
              {roles.map((roleOption) => (
                <TouchableOpacity
                  key={roleOption.value}
                  className={`p-3 border-b border-gray-100 ${role === roleOption.value ? "bg-blue-50" : ""}`}
                  onPress={() => {
                    setRole(roleOption.value);
                    setShowRoleOptions(false);
                  }}
                >
                  <Text
                    className={
                      role === roleOption.value
                        ? "text-blue-600"
                        : "text-gray-800"
                    }
                  >
                    {roleOption.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>

        <TouchableOpacity
          className="bg-blue-600 py-3 rounded-lg items-center mb-4"
          onPress={handleSignUp}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="white" />
          ) : (
            <Text className="text-white font-semibold text-lg">Sign Up</Text>
          )}
        </TouchableOpacity>

        <View className="flex-row justify-center mb-10">
          <Text className="text-gray-600">Already have an account? </Text>
          <TouchableOpacity onPress={navigateToLogin}>
            <Text className="text-blue-600 font-medium">Sign In</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
