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
import { useRouter } from "expo-router";
import { Mail, ArrowLeft } from "lucide-react-native";
import { supabase } from "../../lib/supabase";

export default function ResetPasswordScreen() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [resetSent, setResetSent] = useState(false);

  const handleResetPassword = async () => {
    if (!email) {
      Alert.alert("Error", "Please enter your email address");
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo:
          "https://hopeful-wright3-w4g8p.view-3.tempo-dev.app/auth/reset-password",
      });

      if (error) {
        Alert.alert("Error", error.message);
      } else {
        setResetSent(true);
      }
    } catch (error) {
      console.error("Reset password error:", error);
      Alert.alert("Error", "An unexpected error occurred");
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
        <ScrollView
          contentContainerStyle={{ flexGrow: 1 }}
          keyboardShouldPersistTaps="handled"
        >
          <View className="flex-1 px-6 py-8">
            {/* Header */}
            <View className="flex-row items-center mb-6">
              <TouchableOpacity onPress={() => router.back()} className="mr-4">
                <ArrowLeft size={24} color="#1e40af" />
              </TouchableOpacity>
              <Text className="text-2xl font-bold text-gray-800">
                Reset Password
              </Text>
            </View>

            {resetSent ? (
              <View className="items-center justify-center flex-1 px-4">
                <View className="bg-blue-100 w-20 h-20 rounded-full items-center justify-center mb-6">
                  <Mail size={32} color="#1e40af" />
                </View>
                <Text className="text-xl font-bold text-center mb-4">
                  Check Your Email
                </Text>
                <Text className="text-gray-600 text-center mb-8">
                  We've sent a password reset link to {email}. Please check your
                  email and follow the instructions to reset your password.
                </Text>
                <TouchableOpacity
                  className="bg-blue-600 py-3 px-6 rounded-lg"
                  onPress={() => router.replace("/auth/login")}
                >
                  <Text className="text-white font-bold">Back to Login</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View className="space-y-4">
                <Text className="text-gray-600 mb-4">
                  Enter your email address and we'll send you a link to reset
                  your password.
                </Text>

                <View>
                  <Text className="text-gray-700 mb-2 font-medium">Email</Text>
                  <View className="flex-row items-center border border-gray-300 rounded-lg px-3 py-2">
                    <Mail size={20} color="#6b7280" />
                    <TextInput
                      className="flex-1 ml-2 text-gray-800"
                      placeholder="Enter your email"
                      value={email}
                      onChangeText={setEmail}
                      autoCapitalize="none"
                      keyboardType="email-address"
                    />
                  </View>
                </View>

                <TouchableOpacity
                  className={`bg-blue-600 py-3 rounded-lg items-center mt-6 ${loading ? "opacity-70" : ""}`}
                  onPress={handleResetPassword}
                  disabled={loading}
                >
                  {loading ? (
                    <ActivityIndicator color="white" />
                  ) : (
                    <Text className="text-white font-bold text-lg">
                      Send Reset Link
                    </Text>
                  )}
                </TouchableOpacity>

                <TouchableOpacity
                  className="items-center mt-6"
                  onPress={() => router.replace("/auth/login")}
                >
                  <Text className="text-blue-600 font-medium">
                    Back to Login
                  </Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
