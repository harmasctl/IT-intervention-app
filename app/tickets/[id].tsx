import React from "react";
import { View, TouchableOpacity } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { useRouter, useLocalSearchParams } from "expo-router";
import { ArrowLeft } from "lucide-react-native";
import TicketDetail from "../../components/TicketDetail";

export default function TicketDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();

  const handleAssign = () => {
    // Implement assign functionality
    console.log("Assign ticket", id);
  };

  const handleSchedule = () => {
    // Implement schedule functionality
    console.log("Schedule ticket", id);
  };

  const handleUpdateStatus = (status: string) => {
    // Implement status update functionality
    console.log("Update status to", status);
  };

  const handleAddResolution = (resolution: string) => {
    // Implement resolution functionality
    console.log("Add resolution", resolution);
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

      {/* Ticket Detail */}
      <TicketDetail
        ticketId={id}
        onAssign={handleAssign}
        onSchedule={handleSchedule}
        onUpdateStatus={handleUpdateStatus}
        onAddResolution={handleAddResolution}
      />
    </SafeAreaView>
  );
}
