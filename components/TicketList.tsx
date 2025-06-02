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
  MapPin,
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
  createdBy: string | null;
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

    // Set up real-time subscription for tickets
    const ticketsSubscription = supabase
      .channel('ticket-list-changes')
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'tickets' },
        () => {
          // Refresh tickets when any ticket changes
          fetchTickets();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(ticketsSubscription);
    };
  }, []);

  const fetchTickets = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase.from("tickets").select(`
          *,
          restaurants:restaurant_id(name),
          devices:device_id(name),
          assigned_user:users!assigned_to(name),
          created_by_user:users!created_by(name, email)
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
          assignedTo: ticket.assigned_user?.name || null,
          createdBy: ticket.created_by_user?.name || ticket.created_by_user?.email || null,
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
      className="bg-white rounded-2xl p-6 mb-4 shadow-xl border border-gray-100 transform transition-transform active:scale-98"
      onPress={() => handleTicketPress(item.id)}
    >
      <View className="flex-row justify-between items-start mb-4">
        <View className="flex-1">
          <View className="flex-row items-center mb-3">
            <View
              className={`w-4 h-4 rounded-full mr-3 shadow-sm ${getPriorityColor(item.priority)}`}
            />
            <Text className="font-bold text-xl text-gray-800 flex-1">
              {item.title}
            </Text>
          </View>

          <View className="bg-gray-50 rounded-xl p-3 mb-3">
            <View className="flex-row items-center mb-1">
              <MapPin size={16} color="#6B7280" />
              <Text className="text-gray-700 font-medium ml-2">{item.restaurantName}</Text>
            </View>
            <Text className="text-gray-600 text-sm ml-6">
              {item.deviceAffected}
            </Text>
          </View>

          <View className="flex-row items-center justify-between">
            <View className="bg-blue-50 rounded-xl px-3 py-2 flex-row items-center">
              {getStatusIcon(item.status)}
              <Text className="ml-2 text-sm text-blue-700 font-medium capitalize">
                {item.status}
              </Text>
            </View>

            {/* Creator Information */}
            {item.createdBy && (
              <View className="flex-row items-center">
                <User size={12} color="#6b7280" />
                <Text className="text-gray-500 text-xs ml-1">
                  {item.createdBy}
                </Text>
              </View>
            )}
          </View>
        </View>

        <View className="items-end ml-4">
          {item.assignedTo ? (
            <View className="items-center">
              <Image
                source={{
                  uri: `https://api.dicebear.com/7.x/avataaars/svg?seed=${item.assignedTo}`,
                }}
                style={{ width: 40, height: 40, borderRadius: 20 }}
                className="shadow-md border-2 border-white"
              />
              <Text className="mt-2 text-xs text-gray-600 font-medium text-center">
                {item.assignedTo}
              </Text>
            </View>
          ) : (
            <View className="bg-gray-100 rounded-xl px-4 py-2">
              <Text className="text-sm text-gray-500 font-medium">
                Unassigned
              </Text>
            </View>
          )}
          <View className="mt-3 bg-indigo-100 p-2 rounded-xl">
            <ChevronRight size={20} color="#6366f1" />
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <View className="flex-1 bg-gradient-to-b from-gray-50 to-white p-6">
      {/* Enhanced Search bar */}
      <View className="bg-white rounded-2xl px-6 py-4 mb-6 flex-row items-center shadow-lg border border-gray-100">
        <View className="bg-blue-100 p-2 rounded-xl mr-3">
          <Search size={20} color="#3b82f6" />
        </View>
        <TextInput
          className="flex-1 text-base"
          placeholder="Search tickets, restaurants, devices..."
          placeholderTextColor="#9ca3af"
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      {/* Enhanced Filter tabs */}
      <View className="bg-white rounded-2xl mb-6 p-2 shadow-lg border border-gray-100">
        <View className="flex-row">
          {["all", "new", "in-progress", "resolved"].map((filter) => (
            <TouchableOpacity
              key={filter}
              className={`flex-1 py-3 px-4 rounded-xl mx-1 ${
                activeFilter === filter
                  ? "bg-gradient-to-r from-blue-500 to-indigo-600 shadow-md"
                  : "bg-transparent"
              }`}
              onPress={() => setActiveFilter(filter as Status | "all")}
            >
              <Text
                className={`text-center text-sm font-medium ${
                  activeFilter === filter
                    ? "text-white"
                    : "text-gray-600"
                }`}
              >
                {filter === "all"
                  ? "All"
                  : filter.charAt(0).toUpperCase() + filter.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
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
