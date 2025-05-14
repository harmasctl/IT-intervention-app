import React, { useState, useEffect } from "react";
import { View, Text, TouchableOpacity, ActivityIndicator } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { useRouter } from "expo-router";
import { Plus, RefreshCw } from "lucide-react-native";
import TicketList from "../../components/TicketList";
import { supabase } from "../../lib/supabase";

export default function TicketsScreen() {
  const router = useRouter();
  const [refreshing, setRefreshing] = useState(false);
  const [ticketCount, setTicketCount] = useState<number | null>(null);

  useEffect(() => {
    fetchTicketCount();
  }, []);

  const fetchTicketCount = async () => {
    try {
      const { count, error } = await supabase
        .from("tickets")
        .select("*", { count: "exact", head: true });

      if (error) throw error;
      setTicketCount(count);
    } catch (error) {
      console.error("Error fetching ticket count:", error);
    }
  };

  const handleTicketPress = (ticketId: string) => {
    router.push(`/tickets/${ticketId}`);
  };

  const handleCreateTicket = () => {
    router.push("/tickets/create");
  };

  const handleRefresh = () => {
    setRefreshing(true);
    fetchTicketCount();
    // The TicketList component will refresh itself when it's remounted
    setTimeout(() => setRefreshing(false), 1000);
  };

  return (
    <SafeAreaView className="flex-1 bg-white">
      <StatusBar style="auto" />

      {/* Header */}
      <View className="flex-row justify-between items-center px-4 py-3 border-b border-gray-200">
        <View className="flex-row items-center">
          <Text className="text-2xl font-bold text-blue-800 mr-2">Tickets</Text>
          {ticketCount !== null && (
            <View className="bg-gray-200 px-2 py-1 rounded-full">
              <Text className="text-sm font-medium text-gray-800">
                {ticketCount}
              </Text>
            </View>
          )}
        </View>
        <View className="flex-row">
          <TouchableOpacity
            className="bg-gray-200 p-2 rounded-full mr-2"
            onPress={handleRefresh}
            disabled={refreshing}
          >
            {refreshing ? (
              <ActivityIndicator size="small" color="#1e40af" />
            ) : (
              <RefreshCw size={24} color="#1e40af" />
            )}
          </TouchableOpacity>
          <TouchableOpacity
            className="bg-blue-600 p-2 rounded-full"
            onPress={handleCreateTicket}
          >
            <Plus size={24} color="white" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Ticket List */}
      <TicketList onTicketPress={handleTicketPress} />
    </SafeAreaView>
  );
}
