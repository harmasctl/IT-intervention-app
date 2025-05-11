import React, { useState } from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { useRouter } from "expo-router";
import { Plus } from "lucide-react-native";
import TicketList from "../../components/TicketList";

export default function TicketsScreen() {
  const router = useRouter();

  const handleTicketPress = (ticketId: string) => {
    router.push(`/tickets/${ticketId}`);
  };

  const handleCreateTicket = () => {
    router.push("/tickets/create");
  };

  return (
    <SafeAreaView className="flex-1 bg-white">
      <StatusBar style="auto" />

      {/* Header */}
      <View className="flex-row justify-between items-center px-4 py-3 border-b border-gray-200">
        <Text className="text-2xl font-bold text-blue-800">Tickets</Text>
        <TouchableOpacity
          className="bg-blue-600 p-2 rounded-full"
          onPress={handleCreateTicket}
        >
          <Plus size={24} color="white" />
        </TouchableOpacity>
      </View>

      {/* Ticket List */}
      <TicketList onTicketPress={handleTicketPress} />
    </SafeAreaView>
  );
}
