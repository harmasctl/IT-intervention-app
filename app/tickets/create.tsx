import React, { useState, useEffect } from "react";
import {
  View,
  TouchableOpacity,
  Alert,
  Text,
  ScrollView,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { useRouter } from "expo-router";
import { ArrowLeft } from "lucide-react-native";
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

  // Ensure storage buckets exist when component mounts
  useEffect(() => {
    ensureStorageBuckets();
  }, []);

  const handleSubmit = async (ticketData: any) => {
    if (isSubmitting) return;

    try {
      setIsSubmitting(true);

      if (!ticketData.device || !ticketData.restaurant) {
        throw new Error("Please select both a device and restaurant");
      }

      // Calculate SLA due date based on priority
      const now = new Date();
      let slaDueDate = new Date();
      
      // Set SLA due time based on priority
      switch (ticketData.priority) {
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
        
        // Create notification for admins and managers
        await createNotifications(ticketId, ticketData.title, ticketData.restaurant.name);
        
        // Update device status to 'maintenance' if it's not already
        await updateDeviceStatus(ticketData.device.id);
        
        // Show success notification
        setSuccessMessage(`Ticket "${ticketData.title}" created successfully!`);
        setShowSuccess(true);
        
        // Navigate back after a delay
        setTimeout(() => {
          router.replace("/tickets");
        }, 2000);
      }
    } catch (error: any) {
      console.error("Error creating ticket:", error);
      Alert.alert("Error", error.message || "Failed to create ticket");
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

      if (userError) throw userError;

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
        await supabase.from("notifications").insert(notifications);
      }
    } catch (error) {
      console.error("Error creating notifications:", error);
      // Don't throw error here as this is a secondary operation
    }
  };

  // Function to update device status to maintenance
  const updateDeviceStatus = async (deviceId: string) => {
    try {
      await supabase
        .from("devices")
        .update({ status: "maintenance" })
        .eq("id", deviceId);
    } catch (error) {
      console.error("Error updating device status:", error);
      // Don't throw error here as this is a secondary operation
    }
  };

  const handleDismissSuccess = () => {
    setShowSuccess(false);
  };

  return (
    <SafeAreaView className="flex-1 bg-white">
      <StatusBar style="auto" />
      
      <SuccessNotification
        message={successMessage}
        visible={showSuccess}
        onDismiss={handleDismissSuccess}
      />

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
