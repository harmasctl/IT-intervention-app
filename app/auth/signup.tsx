import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { Link, useRouter } from "expo-router";
import { Eye, EyeOff, ArrowLeft } from "lucide-react-native";
import { supabase } from "../../lib/supabase";

export default function SignupScreen() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const handleSignup = async () => {
    if (!email || !password || !confirmPassword || !fullName) {
      Alert.alert("Error", "Please fill in all fields");
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert("Error", "Passwords do not match");
      return;
    }

    if (password.length < 6) {
      Alert.alert("Error", "Password must be at least 6 characters long");
      return;
    }

    setLoading(true);
    try {
      // Register the user
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
      });

      if (authError) throw authError;

      if (authData && authData.user) {
        // Insert user profile
        const { error: profileError } = await supabase
          .from("profiles")
          .insert([
            {
              id: authData.user.id,
              full_name: fullName,
              email: email,
              created_at: new Date().toISOString(),
            },
          ]);

        if (profileError) throw profileError;

        Alert.alert(
          "Success",
          "Your account has been created. Please check your email to verify your account.",
          [{ text: "OK", onPress: () => router.push("/auth/login") }]
        );
      }
    } catch (error: any) {
      console.error("Signup error:", error);
      Alert.alert("Error", error.message || "Failed to create account");
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-white">
      <StatusBar style="dark" />
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        className="flex-1"
      >
        <ScrollView className="flex-1 p-6">
          <TouchableOpacity
            onPress={() => router.back()}
            className="flex-row items-center mb-6"
          >
            <ArrowLeft size={20} color="#3b82f6" />
            <Text className="text-blue-500 ml-1">Back</Text>
          </TouchableOpacity>

          <View className="items-center mb-10">
            <Text className="text-blue-800 text-3xl font-bold mb-2">
              Create Account
            </Text>
            <Text className="text-gray-500 text-center">
              Sign up to start managing IT interventions
            </Text>
          </View>

          <View className="space-y-4 mb-6">
            <View>
              <Text className="text-gray-700 mb-2 font-medium">Full Name</Text>
              <TextInput
                className="bg-gray-100 py-3 px-4 rounded-xl"
                placeholder="Enter your full name"
                value={fullName}
                onChangeText={setFullName}
                autoCapitalize="words"
              />
            </View>

            <View>
              <Text className="text-gray-700 mb-2 font-medium">Email</Text>
              <TextInput
                className="bg-gray-100 py-3 px-4 rounded-xl"
                placeholder="Enter your email"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>

            <View>
              <Text className="text-gray-700 mb-2 font-medium">Password</Text>
              <View className="flex-row items-center bg-gray-100 py-3 px-4 rounded-xl">
                <TextInput
                  className="flex-1"
                  placeholder="Enter your password"
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                />
                <TouchableOpacity
                  onPress={() => setShowPassword(!showPassword)}
                  className="ml-2"
                >
                  {showPassword ? (
                    <EyeOff size={20} color="#6b7280" />
                  ) : (
                    <Eye size={20} color="#6b7280" />
                  )}
                </TouchableOpacity>
              </View>
            </View>

            <View>
              <Text className="text-gray-700 mb-2 font-medium">
                Confirm Password
              </Text>
              <View className="flex-row items-center bg-gray-100 py-3 px-4 rounded-xl">
                <TextInput
                  className="flex-1"
                  placeholder="Confirm your password"
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  secureTextEntry={!showConfirmPassword}
                  autoCapitalize="none"
                />
                <TouchableOpacity
                  onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="ml-2"
                >
                  {showConfirmPassword ? (
                    <EyeOff size={20} color="#6b7280" />
                  ) : (
                    <Eye size={20} color="#6b7280" />
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </View>

          <TouchableOpacity
            className={`py-4 rounded-xl mb-6 ${
              loading ? "bg-blue-400" : "bg-blue-600"
            }`}
            onPress={handleSignup}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="white" />
            ) : (
              <Text className="text-white font-bold text-center text-lg">
                Sign Up
              </Text>
            )}
          </TouchableOpacity>

          <View className="flex-row justify-center">
            <Text className="text-gray-600">Already have an account? </Text>
            <Link href="/auth/login" asChild>
              <TouchableOpacity>
                <Text className="text-blue-600 font-semibold">Log In</Text>
              </TouchableOpacity>
            </Link>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
