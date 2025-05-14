import React, { useState, useEffect } from "react";
import {
  View,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Text,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { useRouter, useLocalSearchParams } from "expo-router";
import { ArrowLeft } from "lucide-react-native";
import TicketDetail from "../../components/TicketDetail";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../../components/AuthProvider";

export default function TicketDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [ticketData, setTicketData] = useState<any>(null);

  useEffect(() => {
    if (id) {
      fetchTicketDetails();
    }
  }, [id]);

  const fetchTicketDetails = async () => {
    try {
      setLoading(true);

      // Fetch ticket details from Supabase
      const { data, error } = await supabase
        .from("tickets")
        .select(
          `
          *,
          restaurants:restaurant_id(name),
          devices:device_id(name),
          assigned_user:assigned_to(name)
        `,
        )
        .eq("id", id)
        .single();

      if (error) throw error;

      if (data) {
        setTicketData(data);
      }
    } catch (error) {
      console.error("Error fetching ticket details:", error);
      // For demo purposes, we'll use mock data if the fetch fails
      setTicketData({
        id,
        title: "Ice machine not cooling properly",
        priority: "high",
        status: "assigned",
        diagnostic_info:
          "Unit is running but not producing ice. Temperature readings are above normal range.",
        restaurants: { name: "Seaside Grill" },
        devices: { name: "Hoshizaki Ice Machine KM-660MAJ" },
        assigned_user: { name: "John Doe" },
        created_at: new Date().toISOString(),
        created_by: user?.id,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAssign = async (technicianId: string) => {
    try {
      // Update the ticket in Supabase
      const { error } = await supabase
        .from("tickets")
        .update({
          assigned_to: technicianId,
          status: "assigned",
          updated_at: new Date().toISOString(),
        })
        .eq("id", id);

      if (error) throw error;

      Alert.alert("Success", `Ticket assigned to ${technicianId}`);
      // In a real app, we would refresh the ticket data here
    } catch (error: any) {
      console.error("Error assigning ticket:", error);
      Alert.alert("Error", error.message || "Failed to assign ticket");
    }
  };

  const handleSchedule = () => {
    // Navigate to schedule creation screen with pre-filled ticket ID
    router.push({
      pathname: "/schedule/create",
      params: { ticketId: id },
    });
  };

  const handleUpdateStatus = async (status: string) => {
    try {
      // Update the ticket status in Supabase
      const { error } = await supabase
        .from("tickets")
        .update({
          status,
          updated_at: new Date().toISOString(),
        })
        .eq("id", id);

      if (error) throw error;

      Alert.alert("Success", `Ticket status updated to ${status}`);
      // In a real app, we would refresh the ticket data here
    } catch (error: any) {
      console.error("Error updating ticket status:", error);
      Alert.alert("Error", error.message || "Failed to update ticket status");
    }
  };

  const handleAddResolution = async (resolution: string) => {
    if (!resolution.trim()) {
      Alert.alert("Error", "Resolution cannot be empty");
      return;
    }

    try {
      // Add a comment to the ticket
      const { error: commentError } = await supabase
        .from("ticket_comments")
        .insert({
          ticket_id: id,
          user_id: user?.id,
          comment: resolution,
        });

      if (commentError) throw commentError;

      // Update the ticket status to resolved
      const { error: statusError } = await supabase
        .from("tickets")
        .update({
          status: "resolved",
          updated_at: new Date().toISOString(),
        })
        .eq("id", id);

      if (statusError) throw statusError;

      Alert.alert("Success", "Resolution added and ticket marked as resolved");
      // In a real app, we would refresh the ticket data here
    } catch (error: any) {
      console.error("Error adding resolution:", error);
      Alert.alert("Error", error.message || "Failed to add resolution");
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
      </View>

      {loading ? (
        <View className="flex-1 justify-center items-center">
          <ActivityIndicator size="large" color="#1e40af" />
          <Text className="mt-2 text-gray-600">Loading ticket details...</Text>
        </View>
      ) : ticketData ? (
        <TicketDetail
          ticketId={id}
          ticketData={ticketData}
          onAssign={handleAssign}
          onSchedule={handleSchedule}
          onUpdateStatus={handleUpdateStatus}
          onAddResolution={handleAddResolution}
        />
      ) : (
        <View className="flex-1 justify-center items-center p-4">
          <Text className="text-gray-500 text-center">Ticket not found</Text>
          <TouchableOpacity
            className="mt-4 bg-blue-600 px-4 py-2 rounded-lg"
            onPress={() => router.replace("/tickets")}
          >
            <Text className="text-white font-medium">Back to Tickets</Text>
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
  );
}
