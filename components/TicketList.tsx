import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  Image,
  ActivityIndicator,
  TextInput,
} from "react-native";
import { useRouter } from "expo-router";
import { supabase } from "../lib/supabase";
import {
  AlertCircle,
  Clock,
  CheckCircle,
  ChevronRight,
  Search,
} from "lucide-react-native";

type Priority = "low" | "medium" | "high";
type Status = "new" | "assigned" | "in-progress" | "resolved";

interface Ticket {
  id: string;
  title: string;
  priority: Priority;
  restaurantName: string;
  deviceAffected: string;
  assignedTo: string | null;
  status: Status;
  createdAt: string;
}

interface TicketListProps {
  tickets?: Ticket[];
  onTicketPress?: (ticketId: string) => void;
}

const TicketList = ({ onTicketPress = () => {} }: TicketListProps) => {
  const [activeFilter, setActiveFilter] = useState<Status | "all">("all");
  const router = useRouter();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    fetchTickets();
  }, []);

  const fetchTickets = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase.from("tickets").select(`
          *,
          restaurants:restaurant_id(name),
          devices:device_id(name),
          users:assigned_to(name)
        `);

      if (error) throw error;

      if (data && data.length > 0) {
        // Transform data to match the expected format
        const formattedTickets = data.map((ticket) => ({
          id: ticket.id,
          title: ticket.title,
          priority: ticket.priority,
          restaurantName: ticket.restaurants?.name || "Unknown Restaurant",
          deviceAffected: ticket.devices?.name || "Unknown Device",
          assignedTo: ticket.users?.name || null,
          status: ticket.status,
          createdAt: ticket.created_at,
        }));

        setTickets(formattedTickets);
        console.log("Fetched tickets from database:", formattedTickets.length);
      } else {
        // If no tickets found, set empty array
        setTickets([]);
      }
    } catch (error) {
      console.error("Error fetching tickets:", error);
      setTickets([]);
    } finally {
      setLoading(false);
    }
  };

  const filteredTickets = tickets.filter((ticket) => {
    const matchesSearch = searchQuery
      ? ticket.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        ticket.restaurantName.toLowerCase().includes(searchQuery.toLowerCase())
      : true;

    const matchesFilter =
      activeFilter === "all" ? true : ticket.status === activeFilter;

    return matchesSearch && matchesFilter;
  });

  const handleTicketPress = (ticketId: string) => {
    onTicketPress(ticketId);
  };

  const getPriorityColor = (priority: Priority) => {
    switch (priority) {
      case "high":
        return "bg-red-500";
      case "medium":
        return "bg-yellow-500";
      case "low":
        return "bg-green-500";
      default:
        return "bg-gray-500";
    }
  };

  const getStatusIcon = (status: Status) => {
    switch (status) {
      case "new":
        return <AlertCircle size={16} color="#ef4444" />;
      case "in-progress":
        return <Clock size={16} color="#eab308" />;
      case "resolved":
        return <CheckCircle size={16} color="#22c55e" />;
      default:
        return null;
    }
  };

  const renderTicketItem = ({ item }: { item: Ticket }) => (
    <TouchableOpacity
      className="bg-white rounded-lg p-4 mb-3 shadow-sm border border-gray-100"
      onPress={() => handleTicketPress(item.id)}
    >
      <View className="flex-row justify-between items-start">
        <View className="flex-1">
          <View className="flex-row items-center mb-1">
            <View
              className={`w-3 h-3 rounded-full mr-2 ${getPriorityColor(item.priority)}`}
            />
            <Text className="font-bold text-lg text-gray-800">
              {item.title}
            </Text>
          </View>
          <Text className="text-gray-600 mb-1">{item.restaurantName}</Text>
          <Text className="text-gray-500 text-sm mb-2">
            {item.deviceAffected}
          </Text>

          <View className="flex-row items-center">
            {getStatusIcon(item.status)}
            <Text className="ml-1 text-xs text-gray-500 capitalize">
              {item.status}
            </Text>
          </View>
        </View>

        <View className="flex-row items-center">
          {item.assignedTo ? (
            <View className="flex-row items-center mr-2">
              <Image
                source={{
                  uri: `https://api.dicebear.com/7.x/avataaars/svg?seed=${item.assignedTo}`,
                }}
                style={{ width: 24, height: 24, borderRadius: 12 }}
              />
              <Text className="ml-1 text-xs text-gray-500">
                {item.assignedTo}
              </Text>
            </View>
          ) : (
            <Text className="text-xs text-gray-400 italic mr-2">
              Unassigned
            </Text>
          )}
          <ChevronRight size={16} color="#9ca3af" />
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <View className="flex-1 bg-gray-50 p-4">
      {/* Search bar */}
      <View className="bg-white rounded-lg px-4 py-2 mb-4 flex-row items-center shadow-sm">
        <Search size={20} color="#6b7280" />
        <TextInput
          className="flex-1 ml-2 py-1"
          placeholder="Search tickets..."
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      {/* Filter tabs */}
      <View className="flex-row bg-white rounded-lg mb-4 p-1 shadow-sm">
        {["all", "new", "in-progress", "resolved"].map((filter) => (
          <TouchableOpacity
            key={filter}
            className={`flex-1 py-2 px-3 rounded-md ${activeFilter === filter ? "bg-blue-100" : ""}`}
            onPress={() => setActiveFilter(filter as Status | "all")}
          >
            <Text
              className={`text-center text-sm ${activeFilter === filter ? "text-blue-600 font-medium" : "text-gray-600"}`}
            >
              {filter === "all"
                ? "All"
                : filter.charAt(0).toUpperCase() + filter.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Ticket list */}
      {loading ? (
        <View className="flex-1 justify-center items-center">
          <ActivityIndicator size="large" color="#1e40af" />
          <Text className="mt-2 text-gray-600">Loading tickets...</Text>
        </View>
      ) : filteredTickets.length > 0 ? (
        <FlatList
          data={filteredTickets}
          renderItem={renderTicketItem}
          keyExtractor={(item) => item.id}
          showsVerticalScrollIndicator={false}
          className="flex-1"
          refreshing={loading}
          onRefresh={fetchTickets}
        />
      ) : (
        <View className="flex-1 justify-center items-center">
          <Text className="text-gray-500 text-center">
            {searchQuery || activeFilter !== "all"
              ? "No tickets match your search criteria"
              : "No tickets found"}
          </Text>
          <TouchableOpacity
            className="mt-4 bg-blue-600 px-4 py-2 rounded-lg"
            onPress={() => router.push("/tickets/create")}
          >
            <Text className="text-white font-medium">Create Ticket</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
};

export default TicketList;
