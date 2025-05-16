import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from "react-native";
import { supabase } from "../lib/supabase";
import { useRouter } from "expo-router";
import { Ticket, AlertCircle, Clock, CheckCircle } from "lucide-react-native";

type DeviceTicket = {
  id: string;
  title: string;
  status: string;
  priority: string;
  created_at: string;
  restaurant_name?: string;
};

type DeviceTicketsListProps = {
  deviceId: string;
  onCreateTicket?: () => void;
};

export default function DeviceTicketsList({
  deviceId,
  onCreateTicket,
}: DeviceTicketsListProps) {
  const [tickets, setTickets] = useState<DeviceTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    fetchDeviceTickets();
  }, [deviceId]);

  const fetchDeviceTickets = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("tickets")
        .select("id, title, status, priority, created_at, restaurant_id")
        .eq("device_id", deviceId)
        .order("created_at", { ascending: false });

      if (error) throw error;

      if (data) {
        // Fetch restaurant names
        const restaurantIds = [
          ...new Set(
            data.map((ticket) => ticket.restaurant_id).filter(Boolean),
          ),
        ];

        if (restaurantIds.length > 0) {
          const { data: restaurantData, error: restError } = await supabase
            .from("restaurants")
            .select("id, name")
            .in("id", restaurantIds);

          if (restError) throw restError;

          // Map restaurant names to tickets
          const ticketsWithRestaurants = data.map((ticket) => {
            const restaurant = restaurantData?.find(
              (r) => r.id === ticket.restaurant_id,
            );
            return {
              ...ticket,
              restaurant_name: restaurant?.name || "Unknown",
            };
          });

          setTickets(ticketsWithRestaurants);
        } else {
          setTickets(data);
        }
      }
    } catch (error) {
      console.error("Error fetching device tickets:", error);
      Alert.alert("Error", "Failed to load tickets for this device");
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "new":
        return <AlertCircle size={16} color="#3b82f6" />;
      case "assigned":
      case "in-progress":
        return <Clock size={16} color="#f59e0b" />;
      case "resolved":
      case "closed":
        return <CheckCircle size={16} color="#10b981" />;
      default:
        return <Ticket size={16} color="#6b7280" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "new":
        return "bg-blue-100 text-blue-800";
      case "assigned":
        return "bg-purple-100 text-purple-800";
      case "in-progress":
        return "bg-amber-100 text-amber-800";
      case "resolved":
        return "bg-green-100 text-green-800";
      case "closed":
        return "bg-gray-100 text-gray-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "high":
        return "bg-red-100 text-red-800";
      case "medium":
        return "bg-amber-100 text-amber-800";
      case "low":
        return "bg-green-100 text-green-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString();
  };

  const handleTicketPress = (ticketId: string) => {
    router.push(`/tickets/${ticketId}`);
  };

  const renderTicketItem = ({ item }: { item: DeviceTicket }) => (
    <TouchableOpacity
      className="bg-white p-4 rounded-lg mb-3 shadow-sm border border-gray-100"
      onPress={() => handleTicketPress(item.id)}
    >
      <Text className="font-bold text-gray-800">{item.title}</Text>

      <View className="flex-row justify-between items-center mt-3">
        <View className="flex-row">
          <View
            className={`px-2 py-1 rounded-full flex-row items-center mr-2 ${getStatusColor(
              item.status,
            )}`}
          >
            {getStatusIcon(item.status)}
            <Text className="text-xs font-medium ml-1 capitalize">
              {item.status.replace("-", " ")}
            </Text>
          </View>

          <View
            className={`px-2 py-1 rounded-full ${getPriorityColor(
              item.priority,
            )}`}
          >
            <Text className="text-xs font-medium capitalize">
              {item.priority}
            </Text>
          </View>
        </View>

        <Text className="text-gray-500 text-xs">
          {formatDate(item.created_at)}
        </Text>
      </View>

      {item.restaurant_name && (
        <Text className="text-gray-500 text-sm mt-2">
          Location: {item.restaurant_name}
        </Text>
      )}
    </TouchableOpacity>
  );

  return (
    <View className="flex-1">
      <View className="flex-row justify-between items-center mb-4">
        <Text className="text-lg font-bold text-gray-800">Related Tickets</Text>
        {onCreateTicket && (
          <TouchableOpacity
            className="bg-blue-600 px-3 py-1.5 rounded-full"
            onPress={onCreateTicket}
          >
            <Text className="text-white font-medium">New Ticket</Text>
          </TouchableOpacity>
        )}
      </View>

      {loading ? (
        <View className="items-center justify-center py-8">
          <ActivityIndicator size="large" color="#1e40af" />
          <Text className="text-gray-500 mt-2">Loading tickets...</Text>
        </View>
      ) : tickets.length > 0 ? (
        <FlatList
          data={tickets}
          renderItem={renderTicketItem}
          keyExtractor={(item) => item.id}
          showsVerticalScrollIndicator={false}
        />
      ) : (
        <View className="bg-gray-50 p-4 rounded-lg items-center justify-center py-8">
          <Ticket size={32} color="#9ca3af" />
          <Text className="text-gray-500 mt-3 text-center">
            No tickets found for this device
          </Text>
          {onCreateTicket && (
            <TouchableOpacity
              className="mt-4 bg-blue-600 px-4 py-2 rounded-lg"
              onPress={onCreateTicket}
            >
              <Text className="text-white font-medium">Create Ticket</Text>
            </TouchableOpacity>
          )}
        </View>
      )}
    </View>
  );
}
