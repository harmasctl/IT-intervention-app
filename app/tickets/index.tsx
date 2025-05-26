import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  TextInput,
  ScrollView,
  RefreshControl,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { useRouter } from "expo-router";
import {
  Search,
  Plus,
  Filter,
  ChevronRight,
  Clock,
  CircleDot,
  CheckCircle2,
  AlertCircle,
  User,
  Building2,
  Package,
  ChevronDown,
  X,
  Check,
} from "lucide-react-native";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../../components/AuthProvider";
import { Database } from "../../lib/database.types";
import { formatDistanceToNow } from "date-fns";

type Ticket = Database["public"]["Tables"]["tickets"]["Row"] & {
  restaurants?: { name: string } | null;
  devices?: { name: string; type: string } | null;
};

export default function TicketsScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [filteredTickets, setFilteredTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [showFilters, setShowFilters] = useState(false);
  const [ticketsAssignedToMe, setTicketsAssignedToMe] = useState(false);

  // Fetch tickets when component mounts
  useEffect(() => {
    fetchTickets();

    // Set up real-time subscription for ticket changes
    const ticketSubscription = supabase
      .channel("ticket-changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "tickets" },
        (payload) => {
          console.log("Ticket change received:", payload);
          fetchTickets(); // Refresh the list when changes occur
        }
      )
      .subscribe();

    return () => {
      ticketSubscription.unsubscribe();
    };
  }, []);

  // Apply filters when tickets, search query, or filters change
  useEffect(() => {
    filterTickets();
  }, [tickets, searchQuery, statusFilter, priorityFilter, ticketsAssignedToMe]);

  const fetchTickets = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("tickets")
        .select(`
          *,
          restaurants:restaurant_id(name),
          devices:device_id(name, type)
        `)
        .order("created_at", { ascending: false });

      if (error) throw error;

      if (data) {
        setTickets(data as Ticket[]);
      }
    } catch (error) {
      console.error("Error fetching tickets:", error);
      Alert.alert("Error", "Failed to load tickets");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const filterTickets = () => {
    let filtered = [...tickets];

    // Apply search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (ticket) =>
          ticket.title.toLowerCase().includes(query) ||
          ticket.restaurants?.name.toLowerCase().includes(query) ||
          ticket.devices?.name.toLowerCase().includes(query)
      );
    }

    // Apply status filter
    if (statusFilter !== "all") {
      filtered = filtered.filter((ticket) => ticket.status === statusFilter);
    }

    // Apply priority filter
    if (priorityFilter !== "all") {
      filtered = filtered.filter((ticket) => ticket.priority === priorityFilter);
    }

    // Filter tickets assigned to current user
    if (ticketsAssignedToMe && user) {
      filtered = filtered.filter((ticket) => ticket.assignee_id === user.id);
    }

    setFilteredTickets(filtered);
  };

  const handleRefresh = () => {
    setRefreshing(true);
    fetchTickets();
  };

  const handleTicketPress = (ticketId: string) => {
    router.push(`/tickets/${ticketId}`);
  };

  const handleCreateTicket = () => {
    router.push("/tickets/create");
  };

  const resetFilters = () => {
    setStatusFilter("all");
    setPriorityFilter("all");
    setTicketsAssignedToMe(false);
    setSearchQuery("");
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "new":
        return { bg: "#fee2e2", text: "#b91c1c", icon: <CircleDot size={12} color="#b91c1c" /> };
      case "assigned":
        return { bg: "#dbeafe", text: "#1e40af", icon: <User size={12} color="#1e40af" /> };
      case "in-progress":
        return { bg: "#fef3c7", text: "#b45309", icon: <Clock size={12} color="#b45309" /> };
      case "resolved":
        return { bg: "#d1fae5", text: "#047857", icon: <CheckCircle2 size={12} color="#047857" /> };
      default:
        return { bg: "#f3f4f6", text: "#4b5563", icon: <CircleDot size={12} color="#4b5563" /> };
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "high":
        return { bg: "#fee2e2", text: "#b91c1c" };
      case "medium":
        return { bg: "#fef3c7", text: "#b45309" };
      case "low":
        return { bg: "#d1fae5", text: "#047857" };
      default:
        return { bg: "#f3f4f6", text: "#4b5563" };
    }
  };

  const renderTicketItem = ({ item }: { item: Ticket }) => {
    const statusStyle = getStatusColor(item.status);
    const priorityStyle = getPriorityColor(item.priority);
    const createdDate = new Date(item.created_at);
    const timeAgo = formatDistanceToNow(createdDate, { addSuffix: true });

    return (
      <TouchableOpacity
        className="bg-white rounded-xl p-4 mb-4 shadow-sm"
        onPress={() => handleTicketPress(item.id)}
      >
        <View className="flex-row justify-between items-start mb-2">
          <View className="flex-1 mr-2">
            <Text className="font-bold text-lg text-gray-800">{item.title}</Text>
            <View className="flex-row items-center mt-1">
              <Building2 size={14} color="#6b7280" />
              <Text className="text-gray-500 text-sm ml-1">
                {item.restaurants?.name || "Unknown Restaurant"}
              </Text>
            </View>
            <View className="flex-row items-center mt-1">
              <Package size={14} color="#6b7280" />
              <Text className="text-gray-500 text-sm ml-1">
                {item.devices?.name || "Unknown Device"}
                {item.devices?.type && ` (${item.devices.type})`}
              </Text>
            </View>
          </View>
          <ChevronRight size={20} color="#9ca3af" />
        </View>

        <View className="flex-row justify-between items-center mt-2">
          <View className="flex-row">
            <View
              className="px-2 py-1 rounded-full flex-row items-center mr-2"
              style={{ backgroundColor: statusStyle.bg }}
            >
              {statusStyle.icon}
              <Text
                className="text-xs ml-1 font-medium"
                style={{ color: statusStyle.text }}
              >
                {item.status.charAt(0).toUpperCase() + item.status.slice(1)}
              </Text>
            </View>

            <View
              className="px-2 py-1 rounded-full"
              style={{ backgroundColor: priorityStyle.bg }}
            >
              <Text
                className="text-xs font-medium"
                style={{ color: priorityStyle.text }}
              >
                {item.priority.charAt(0).toUpperCase() + item.priority.slice(1)}
              </Text>
            </View>
          </View>

          <Text className="text-gray-500 text-xs">{timeAgo}</Text>
        </View>

        {item.assignee_name && (
          <View className="flex-row items-center mt-2">
            <User size={14} color="#6b7280" />
            <Text className="text-gray-500 text-sm ml-1">
              Assigned to: {item.assignee_name}
            </Text>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      <StatusBar style="auto" />

      {/* Header */}
      <View className="bg-gradient-to-r from-blue-700 to-blue-900 px-5 py-4 shadow-lg">
        <View className="flex-row justify-between items-center">
          <Text className="text-2xl font-bold text-white">Tickets</Text>
          <TouchableOpacity
            className="bg-green-600 p-2 rounded-full"
            onPress={handleCreateTicket}
          >
            <Plus size={22} color="white" />
          </TouchableOpacity>
        </View>

        {/* Search */}
        <View className="flex-row items-center bg-white rounded-xl mt-4 px-4 py-2">
          <Search size={20} color="#4b5563" />
          <TextInput
            className="flex-1 ml-2 text-base"
            placeholder="Search tickets..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholderTextColor="#9ca3af"
          />
          <TouchableOpacity onPress={() => setShowFilters(!showFilters)}>
            <Filter
              size={20}
              color={showFilters || statusFilter !== "all" || priorityFilter !== "all" || ticketsAssignedToMe ? "#1e40af" : "#9ca3af"}
            />
          </TouchableOpacity>
        </View>

        {/* Filter options */}
        {showFilters && (
          <View className="bg-white rounded-xl mt-3 p-4">
            <View className="flex-row justify-between items-center mb-3">
              <Text className="text-gray-700 font-medium">Filters</Text>
              <TouchableOpacity onPress={resetFilters}>
                <Text className="text-blue-600">Reset</Text>
              </TouchableOpacity>
            </View>

            <Text className="text-gray-500 mb-2">Status</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-3">
              {["all", "new", "assigned", "in-progress", "resolved"].map((status) => (
                <TouchableOpacity
                  key={status}
                  className={`px-3 py-2 mr-2 rounded-lg ${
                    statusFilter === status
                      ? "bg-blue-100 border border-blue-500"
                      : "bg-gray-100"
                  }`}
                  onPress={() => setStatusFilter(status)}
                >
                  <Text
                    className={
                      statusFilter === status
                        ? "text-blue-700 font-medium"
                        : "text-gray-700"
                    }
                  >
                    {status === "all"
                      ? "All Status"
                      : status
                          .split("-")
                          .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
                          .join(" ")}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <Text className="text-gray-500 mb-2">Priority</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-3">
              {["all", "high", "medium", "low"].map((priority) => (
                <TouchableOpacity
                  key={priority}
                  className={`px-3 py-2 mr-2 rounded-lg ${
                    priorityFilter === priority
                      ? "bg-blue-100 border border-blue-500"
                      : "bg-gray-100"
                  }`}
                  onPress={() => setPriorityFilter(priority)}
                >
                  <Text
                    className={
                      priorityFilter === priority
                        ? "text-blue-700 font-medium"
                        : "text-gray-700"
                    }
                  >
                    {priority === "all"
                      ? "All Priority"
                      : priority.charAt(0).toUpperCase() + priority.slice(1)}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <TouchableOpacity
              className="flex-row items-center mt-2"
              onPress={() => setTicketsAssignedToMe(!ticketsAssignedToMe)}
            >
              <View
                className={`w-5 h-5 rounded ${
                  ticketsAssignedToMe ? "bg-blue-600" : "bg-gray-200"
                } justify-center items-center mr-2`}
              >
                {ticketsAssignedToMe && <Check size={14} color="white" />}
              </View>
              <Text className="text-gray-700">Assigned to me</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {loading && !refreshing ? (
        <View className="flex-1 justify-center items-center">
          <ActivityIndicator size="large" color="#1e40af" />
        </View>
      ) : filteredTickets.length > 0 ? (
        <FlatList
          data={filteredTickets}
          renderItem={renderTicketItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ padding: 16 }}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
          }
        />
      ) : (
        <View className="flex-1 justify-center items-center p-4">
          <AlertCircle size={48} color="#9ca3af" />
          <Text className="mt-4 text-gray-500 text-lg text-center">
            No tickets found
          </Text>
          {(statusFilter !== "all" || priorityFilter !== "all" || ticketsAssignedToMe || searchQuery) && (
            <TouchableOpacity
              className="mt-4 bg-blue-100 px-4 py-2 rounded-lg"
              onPress={resetFilters}
            >
              <Text className="text-blue-700">Clear filters</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity
            className="mt-4 bg-green-600 px-6 py-3 rounded-xl"
            onPress={handleCreateTicket}
          >
            <Text className="text-white font-medium">Create New Ticket</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* FAB for quick create */}
      {filteredTickets.length > 0 && (
        <TouchableOpacity
          className="absolute bottom-6 right-6 bg-green-600 w-14 h-14 rounded-full items-center justify-center shadow-lg"
          onPress={handleCreateTicket}
        >
          <Plus size={24} color="white" />
        </TouchableOpacity>
      )}
    </SafeAreaView>
  );
}
