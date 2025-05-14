import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { useRouter } from "expo-router";
import { Lock, Mail } from "lucide-react-native";
import { useAuth } from "../../components/AuthProvider";

export default function LoginScreen() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const { signIn } = useAuth();

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert("Error", "Please enter both email and password");
      return;
    }

    if (!email.includes("@") || !email.includes(".")) {
      Alert.alert("Error", "Please enter a valid email address");
      return;
    }

    if (password.length < 6) {
      Alert.alert("Error", "Password must be at least 6 characters long");
      return;
    }

    setLoading(true);
    try {
      const { error } = await signIn(email, password);
      if (error) {
        console.log("Login error:", error);
        Alert.alert(
          "Login Failed",
          error.message || "Invalid email or password",
        );
      } else {
        router.replace("/");
      }
    } catch (error: any) {
      console.error("Login exception:", error);
      Alert.alert("Error", error.message || "An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  };

  const navigateToSignUp = () => {
    router.push("/auth/signup");
  };

  return (
    <SafeAreaView className="flex-1 bg-white">
      <StatusBar style="auto" />
      <View className="flex-1 justify-center px-6">
        <View className="items-center mb-10">
          <Text className="text-3xl font-bold text-blue-800 mb-2">
            Tech Support
          </Text>
          <Text className="text-gray-500 text-center">
            Sign in to manage restaurant equipment tickets and inventory
          </Text>
        </View>

        <View className="mb-6">
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

        <View className="mb-8">
          <Text className="text-gray-700 mb-2 font-medium">Password</Text>
          <View className="flex-row items-center bg-gray-100 rounded-lg px-3 py-2">
            <Lock size={20} color="#6b7280" />
            <TextInput
              className="flex-1 ml-2 py-2 text-base"
              placeholder="Enter your password"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
            />
          </View>
          <TouchableOpacity
            className="self-end mt-2"
            onPress={() =>
              Alert.alert(
                "Password Reset",
                "A password reset link has been sent to your email address.",
              )
            }
          >
            <Text className="text-blue-600">Forgot Password?</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          className="bg-blue-600 py-3 rounded-lg items-center"
          onPress={handleLogin}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="white" />
          ) : (
            <Text className="text-white font-semibold text-lg">Sign In</Text>
          )}
        </TouchableOpacity>

        <View className="flex-row justify-center mt-6">
          <Text className="text-gray-600">Don't have an account? </Text>
          <TouchableOpacity onPress={navigateToSignUp}>
            <Text className="text-blue-600 font-medium">Sign Up</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}
