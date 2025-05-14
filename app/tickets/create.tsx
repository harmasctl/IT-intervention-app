import React, { useState } from "react";
import {
  View,
  TouchableOpacity,
  Alert,
  Text,
  ScrollView,
  TextInput,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { useRouter } from "expo-router";
import { ArrowLeft } from "lucide-react-native";
import CreateTicketForm from "../../components/CreateTicketForm";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../../components/AuthProvider";

export default function CreateTicketScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (ticketData: any) => {
    if (isSubmitting) return;

    try {
      setIsSubmitting(true);

      // Get the current user's ID for created_by field
      const userId = user?.id;

      // Save to Supabase with proper fields
      const { data, error } = await supabase
        .from("tickets")
        .insert({
          title: ticketData.title,
          priority: ticketData.priority,
          restaurant_id: ticketData.restaurant?.id,
          device_id: ticketData.device?.id,
          diagnostic_info: ticketData.diagnosticInfo || "",
          photos: ticketData.photos || [],
          jira_ticket_id: ticketData.jiraTicketId || null,
          status: "new",
          created_at: new Date().toISOString(),
          created_by: userId || null,
          updated_at: new Date().toISOString(),
        })
        .select();

      if (error) {
        console.error("Error creating ticket:", error);
        throw new Error(error.message || "Failed to create ticket");
      }

      Alert.alert("Success", "Ticket created successfully", [
        { text: "OK", onPress: () => router.replace("/tickets") },
      ]);
    } catch (error: any) {
      console.error("Error creating ticket:", error);
      Alert.alert("Error", error.message || "Failed to create ticket");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-white">
      <StatusBar style="auto" />

      {/* Header */}
      <View className="flex-row items-center px-4 py-3 border-b border-gray-200">
        <TouchableOpacity onPress={() => router.back()} className="mr-4">
          <ArrowLeft size={24} color="#1e40af" />
        </TouchableOpacity>
        <Text className="text-xl font-bold">Create New Ticket</Text>
      </View>

      {/* Create Ticket Form */}
      <CreateTicketForm
        onSubmit={handleSubmit}
        onCancel={() => router.back()}
        isSubmitting={isSubmitting}
      />
    </SafeAreaView>
  );
}
