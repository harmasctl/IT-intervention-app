import React, { useState, useEffect } from "react";
import {
  View,
  TouchableOpacity,
  Alert,
  Text,
  ScrollView,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { useRouter } from "expo-router";
import { ArrowLeft } from "lucide-react-native";
import * as Haptics from "expo-haptics";
import CreateTicketForm from "../../components/CreateTicketForm";
import { supabase, ensureStorageBuckets } from "../../lib/supabase";
import { useAuth } from "../../components/AuthProvider";
import { Database } from "../../lib/database.types";
import SuccessNotification from "../../components/SuccessNotification";

type TicketInsert = Database['public']['Tables']['tickets']['Insert'];

export default function CreateTicketScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [showSuccess, setShowSuccess] = useState(false);
  const [storageReady, setStorageReady] = useState(false);

  // Ensure storage buckets exist when component mounts
  useEffect(() => {
    const setupEnvironment = async () => {
      try {
        // Set up storage
        await ensureStorageBuckets();
        setStorageReady(true);
      } catch (error) {
        console.error("Error setting up environment:", error);
        Alert.alert(
          "Setup Error",
          "There was an error setting up the app environment. Some features may not work correctly.",
          [{ text: "Continue Anyway", onPress: () => setStorageReady(true) }]
        );
      }
    };

    setupEnvironment();
  }, []);

  const handleSubmit = async (ticketData: any) => {
    if (isSubmitting) return;

    try {
      setIsSubmitting(true);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

      if (!ticketData.device || !ticketData.restaurant) {
        throw new Error("Please select both a device and restaurant");
      }

      // Calculate SLA due date based on priority
      const now = new Date();
      let slaDueDate = new Date();

      // Set SLA due time based on priority
      switch (ticketData.priority) {
        case 'critical':
          slaDueDate.setHours(now.getHours() + 1); // 1 hour for critical priority
          break;
        case 'high':
          slaDueDate.setHours(now.getHours() + 4); // 4 hours for high priority
          break;
        case 'medium':
          slaDueDate.setHours(now.getHours() + 24); // 24 hours for medium priority
          break;
        case 'low':
          slaDueDate.setDate(now.getDate() + 3); // 3 days for low priority
          break;
      }

      // Create ticket insert object
      const ticketInsert: TicketInsert = {
        title: ticketData.title,
        priority: ticketData.priority,
        restaurant_id: ticketData.restaurant.id,
        device_id: ticketData.device.id,
        diagnostic_info: ticketData.diagnosticInfo || "",
        photos: ticketData.photos || [],
        status: "new",
        created_at: new Date().toISOString(),
        created_by: user?.id || null,
        sla_due_at: slaDueDate.toISOString(),
      };

      // Insert ticket into Supabase
      const { data, error } = await supabase
        .from("tickets")
        .insert(ticketInsert)
        .select();

      if (error) {
        console.error("Error creating ticket:", error);
        throw new Error(error.message || "Failed to create ticket");
      }

      // Create notification for admins and managers
      if (data && data[0]) {
        const ticketId = data[0].id;

        try {
          // Create notification for admins and managers
          await createNotifications(ticketId, ticketData.title, ticketData.restaurant.name);
        } catch (notifError) {
          console.error("Error creating notifications:", notifError);
          // Continue even if notifications fail
        }

        try {
          // Update device status to 'maintenance' if it's not already
          await updateDeviceStatus(ticketData.device.id);
        } catch (deviceError) {
          console.error("Error updating device status:", deviceError);
          // Continue even if device status update fails
        }

        // Show success notification
        setSuccessMessage(`Ticket "${ticketData.title}" created successfully!`);
        setShowSuccess(true);

        // Play success haptic feedback
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

        // Navigate back after a delay
        setTimeout(() => {
          router.replace(`/tickets/${ticketId}`);
        }, 2000);
      }
    } catch (error: any) {
      console.error("Error creating ticket:", error);
      Alert.alert("Error", error.message || "Failed to create ticket");
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Function to create notifications for admins and managers
  const createNotifications = async (ticketId: string, ticketTitle: string, restaurantName: string) => {
    try {
      // Get all admin and manager users
      const { data: adminUsers, error: userError } = await supabase
        .from("users")
        .select("id")
        .in("role", ["admin", "manager"]);

      if (userError) {
        console.error("Error fetching users for notifications:", userError);
        return; // Exit gracefully
      }

      if (adminUsers && adminUsers.length > 0) {
        // Create notifications for each admin/manager
        const notifications = adminUsers.map(admin => ({
          user_id: admin.id,
          title: "New Ticket Created",
          message: `A new ticket "${ticketTitle}" has been created for ${restaurantName}`,
          type: "info" as const,
          is_read: false,
          related_id: ticketId,
          related_type: "ticket",
          created_at: new Date().toISOString(),
        }));

        // Insert notifications
        const { error: notifError } = await supabase.from("notifications").insert(notifications);

        if (notifError) {
          console.error("Error inserting notifications:", notifError);
        }
      }
    } catch (error) {
      console.error("Error creating notifications:", error);
      // Don't throw error here as this is a secondary operation
    }
  };

  // Function to update device status to maintenance
  const updateDeviceStatus = async (deviceId: string) => {
    try {
      const { error } = await supabase
        .from("devices")
        .update({ status: "maintenance" })
        .eq("id", deviceId);

      if (error) {
        console.error("Error updating device status:", error);
      }
    } catch (error) {
      console.error("Error updating device status:", error);
      // Don't throw error here as this is a secondary operation
    }
  };

  const handleDismissSuccess = () => {
    setShowSuccess(false);
  };

  const handleCancel = () => {
    // Ask for confirmation before navigating back
    Alert.alert(
      "Discard Changes",
      "Are you sure you want to discard this ticket?",
      [
        {
          text: "No, Continue Editing",
          style: "cancel"
        },
        {
          text: "Yes, Discard",
          onPress: () => {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
            router.back();
          },
          style: "destructive"
        }
      ]
    );
  };

  // Show loading indicator if storage is not ready
  if (!storageReady) {
    return (
      <SafeAreaView className="flex-1 bg-white justify-center items-center">
        <StatusBar style="auto" />
        <ActivityIndicator size="large" color="#1e40af" />
        <Text className="mt-4 text-gray-600">Setting up resources...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-white">
      <StatusBar style="auto" />

      <SuccessNotification
        message={successMessage}
        visible={showSuccess}
        onDismiss={handleDismissSuccess}
      />

      {/* Header */}
      <View className="flex-row items-center justify-between px-4 py-3 border-b border-gray-200">
        <View className="flex-row items-center">
          <TouchableOpacity onPress={handleCancel} className="mr-4">
            <ArrowLeft size={24} color="#1e40af" />
          </TouchableOpacity>
          <Text className="text-xl font-bold">Create New Ticket</Text>
        </View>

        {isSubmitting && (
          <ActivityIndicator size="small" color="#1e40af" />
        )}
      </View>

      {/* Create Ticket Form */}
      <CreateTicketForm
        onSubmit={handleSubmit}
        onCancel={handleCancel}
        isSubmitting={isSubmitting}
      />
    </SafeAreaView>
  );
}
