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
  User,
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
        (payload) => {
          console.log('Ticket change received:', payload);
          // Refresh tickets when any ticket changes
          fetchTickets();
        }
      )
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'devices' },
        (payload) => {
          console.log('Device change received:', payload);
          // Refresh tickets when devices change (affects device names)
          fetchTickets();
        }
      )
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'restaurants' },
        (payload) => {
          console.log('Restaurant change received:', payload);
          // Refresh tickets when restaurants change (affects restaurant names)
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

      // First fetch tickets without joins
      const { data: ticketsData, error: ticketsError } = await supabase
        .from("tickets")
        .select("*")
        .order("created_at", { ascending: false });

      if (ticketsError) throw ticketsError;

      if (ticketsData && ticketsData.length > 0) {
        // Get unique restaurant and device IDs
        const restaurantIds = [...new Set(ticketsData.map(t => t.restaurant_id).filter(Boolean))];
        const deviceIds = [...new Set(ticketsData.map(t => t.device_id).filter(Boolean))];
        const userIds = [...new Set([
          ...ticketsData.map(t => t.assigned_to).filter(Boolean),
          ...ticketsData.map(t => t.created_by).filter(Boolean)
        ])];

        // Fetch related data separately
        const [restaurantsData, devicesData, usersData] = await Promise.all([
          restaurantIds.length > 0 ?
            supabase.from("restaurants").select("id, name").in("id", restaurantIds) :
            { data: [], error: null },
          deviceIds.length > 0 ?
            supabase.from("devices").select("id, name").in("id", deviceIds) :
            { data: [], error: null },
          userIds.length > 0 ?
            supabase.from("users").select("id, name, email").in("id", userIds) :
            { data: [], error: null }
        ]);

        // Create lookup maps
        const restaurantMap = new Map(restaurantsData.data?.map(r => [r.id, r]) || []);
        const deviceMap = new Map(devicesData.data?.map(d => [d.id, d]) || []);
        const userMap = new Map(usersData.data?.map(u => [u.id, u]) || []);

        // Transform data to match the expected format
        const formattedTickets = ticketsData.map((ticket) => ({
          id: ticket.id,
          title: ticket.title,
          priority: ticket.priority,
          restaurantName: restaurantMap.get(ticket.restaurant_id)?.name || "Unknown Restaurant",
          deviceAffected: deviceMap.get(ticket.device_id)?.name || "Unknown Device",
          assignedTo: userMap.get(ticket.assigned_to)?.name || null,
          createdBy: userMap.get(ticket.created_by)?.name || userMap.get(ticket.created_by)?.email || null,
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
      case "assigned":
        return <User size={16} color="#3b82f6" />;
      case "in-progress":
        return <Clock size={16} color="#eab308" />;
      case "resolved":
        return <CheckCircle size={16} color="#22c55e" />;
      default:
        return <AlertCircle size={16} color="#6b7280" />;
    }
  };

  const getStatusColor = (status: Status) => {
    switch (status) {
      case "new":
        return "bg-red-100 text-red-800 border-red-200";
      case "assigned":
        return "bg-blue-100 text-blue-800 border-blue-200";
      case "in-progress":
        return "bg-yellow-100 text-yellow-800 border-yellow-200";
      case "resolved":
        return "bg-green-100 text-green-800 border-green-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  const getAssignmentStatus = (ticket: Ticket) => {
    if (ticket.assignedTo) {
      return {
        text: `Assigned to ${ticket.assignedTo}`,
        color: "bg-blue-50 text-blue-700 border-blue-200",
        icon: <User size={14} color="#1d4ed8" />
      };
    } else {
      return {
        text: "Unassigned",
        color: "bg-orange-50 text-orange-700 border-orange-200",
        icon: <AlertCircle size={14} color="#c2410c" />
      };
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

          {/* Status and Assignment Display */}
          <View className="space-y-2">
            {/* Status Badge */}
            <View className={`rounded-xl px-3 py-2 flex-row items-center border ${getStatusColor(item.status)}`}>
              {getStatusIcon(item.status)}
              <Text className="ml-2 text-sm font-medium capitalize">
                {item.status.replace('-', ' ')}
              </Text>
            </View>

            {/* Assignment Status */}
            <View className={`rounded-xl px-3 py-2 flex-row items-center border ${getAssignmentStatus(item).color}`}>
              {getAssignmentStatus(item).icon}
              <Text className="ml-2 text-sm font-medium">
                {getAssignmentStatus(item).text}
              </Text>
            </View>

            {/* Creator Information */}
            {item.createdBy && (
              <View className="flex-row items-center bg-gray-50 rounded-lg px-2 py-1">
                <User size={12} color="#6b7280" />
                <Text className="text-gray-600 text-xs ml-1">
                  Created by {item.createdBy}
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
          {["all", "new", "assigned", "in-progress", "resolved"].map((filter) => (
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
