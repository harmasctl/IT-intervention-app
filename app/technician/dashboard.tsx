import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { useRouter } from "expo-router";
import {
  ArrowLeft,
  Calendar,
  MapPin,
  Clock,
  User,
  Phone,
  AlertTriangle,
  CheckCircle,
  PlayCircle,
  PauseCircle,
  Package,
  Wrench,
  Navigation,
  Bell,
} from "lucide-react-native";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../../components/AuthProvider";

interface TicketItem {
  id: string;
  title: string;
  priority: string;
  status: string;
  restaurant: {
    name: string;
    location: string;
    contact_phone?: string;
  };
  device: {
    name: string;
    type: string;
  };
  contact_person?: string;
  contact_phone?: string;
  estimated_duration?: string;
  preferred_time_slot?: string;
  access_instructions?: string;
  sla_due_at?: string;
  created_at: string;
  jira_ticket_id?: string;
}

export default function TechnicianDashboard() {
  const router = useRouter();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<"available" | "assigned" | "scheduled" | "completed">("available");
  const [tickets, setTickets] = useState<TicketItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchTickets();
  }, [activeTab]);

  const fetchTickets = async () => {
    try {
      setLoading(true);

      let query = supabase
        .from("tickets")
        .select(`
          id,
          title,
          priority,
          status,
          contact_person,
          contact_phone,
          estimated_duration,
          preferred_time_slot,
          access_instructions,
          created_at,
          jira_ticket_id,
          restaurant:restaurants(name, location, contact_phone),
          device:devices(name, type)
        `);

      // Filter based on active tab
      switch (activeTab) {
        case "available":
          query = query.in("status", ["new", "assigned"]).is("assigned_to", null);
          break;
        case "assigned":
          query = query.eq("assigned_to", user?.id).in("status", ["assigned", "in-progress"]);
          break;
        case "scheduled":
          query = query.eq("assigned_to", user?.id).eq("status", "scheduled");
          break;
        case "completed":
          query = query.eq("assigned_to", user?.id).eq("status", "resolved");
          break;
      }

      const { data, error } = await query.order("created_at", { ascending: false });

      if (error) {
        console.error("Error fetching tickets:", error);
        Alert.alert("Error", "Failed to fetch tickets");
        return;
      }

      setTickets(data || []);
    } catch (error) {
      console.error("Error:", error);
      Alert.alert("Error", "An unexpected error occurred");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    fetchTickets();
  };

  const assignTicketToSelf = async (ticketId: string) => {
    try {
      const { error } = await supabase
        .from("tickets")
        .update({
          assigned_to: user?.id,
          assignee_name: user?.user_metadata?.name || user?.email,
          status: "assigned",
          assigned_at: new Date().toISOString(),
        })
        .eq("id", ticketId);

      if (error) {
        Alert.alert("Error", "Failed to assign ticket");
        return;
      }

      // Add history entry
      await supabase
        .from("ticket_history")
        .insert({
          ticket_id: ticketId,
          status: "assigned",
          timestamp: new Date().toISOString(),
          notes: "Ticket self-assigned by technician",
          user_id: user?.id,
        });

      Alert.alert("Success", "Ticket assigned to you successfully!");
      fetchTickets();
    } catch (error) {
      console.error("Error assigning ticket:", error);
      Alert.alert("Error", "Failed to assign ticket");
    }
  };

  const scheduleTicket = async (ticketId: string) => {
    Alert.alert(
      "Schedule Intervention",
      "When would you like to schedule this intervention?",
      [
        { text: "Today", onPress: () => updateTicketStatus(ticketId, "scheduled", "Scheduled for today") },
        { text: "Tomorrow", onPress: () => updateTicketStatus(ticketId, "scheduled", "Scheduled for tomorrow") },
        { text: "This Week", onPress: () => updateTicketStatus(ticketId, "scheduled", "Scheduled for this week") },
        { text: "Cancel", style: "cancel" },
      ]
    );
  };

  const startIntervention = async (ticketId: string) => {
    Alert.alert(
      "Start Intervention",
      "Are you ready to start working on this ticket?",
      [
        {
          text: "Yes, Start Now",
          onPress: () => updateTicketStatus(ticketId, "in-progress", "Intervention started"),
        },
        { text: "Cancel", style: "cancel" },
      ]
    );
  };

  const updateTicketStatus = async (ticketId: string, status: string, notes: string) => {
    try {
      const { error } = await supabase
        .from("tickets")
        .update({ status })
        .eq("id", ticketId);

      if (error) {
        Alert.alert("Error", "Failed to update ticket status");
        return;
      }

      // Add history entry
      await supabase
        .from("ticket_history")
        .insert({
          ticket_id: ticketId,
          status,
          timestamp: new Date().toISOString(),
          notes,
          user_id: user?.id,
        });

      fetchTickets();
    } catch (error) {
      console.error("Error updating ticket:", error);
      Alert.alert("Error", "Failed to update ticket");
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "critical": return "bg-red-500";
      case "high": return "bg-orange-500";
      case "medium": return "bg-yellow-500";
      case "low": return "bg-green-500";
      default: return "bg-gray-500";
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "new": return "text-blue-600";
      case "assigned": return "text-orange-600";
      case "in-progress": return "text-purple-600";
      case "scheduled": return "text-indigo-600";
      case "resolved": return "text-green-600";
      default: return "text-gray-600";
    }
  };

  const renderTicketCard = (ticket: TicketItem) => (
    <TouchableOpacity
      key={ticket.id}
      className="bg-white rounded-lg p-4 mb-3 shadow-sm border border-gray-200"
      onPress={() => router.push(`/tickets/${ticket.id}`)}
    >
      <View className="flex-row justify-between items-start mb-2">
        <View className="flex-1">
          <Text className="font-bold text-gray-800 text-base" numberOfLines={2}>
            {ticket.title}
          </Text>
          {ticket.jira_ticket_id && (
            <Text className="text-xs text-blue-600 mt-1">JIRA: {ticket.jira_ticket_id}</Text>
          )}
        </View>
        <View className={`px-2 py-1 rounded-full ${getPriorityColor(ticket.priority)}`}>
          <Text className="text-white text-xs font-medium">{ticket.priority.toUpperCase()}</Text>
        </View>
      </View>

      <View className="flex-row items-center mb-2">
        <MapPin size={14} color="#6B7280" />
        <Text className="text-gray-600 text-sm ml-1 flex-1" numberOfLines={1}>
          {ticket.restaurant.name}
        </Text>
        <Text className={`text-sm font-medium ${getStatusColor(ticket.status)}`}>
          {ticket.status.replace("-", " ").toUpperCase()}
        </Text>
      </View>

      <View className="flex-row items-center mb-2">
        <Wrench size={14} color="#6B7280" />
        <Text className="text-gray-600 text-sm ml-1">
          {ticket.device.name} ({ticket.device.type})
        </Text>
      </View>

      {ticket.estimated_duration && (
        <View className="flex-row items-center mb-2">
          <Clock size={14} color="#6B7280" />
          <Text className="text-gray-600 text-sm ml-1">
            Est. {ticket.estimated_duration} hours
          </Text>
        </View>
      )}

      {ticket.contact_person && (
        <View className="flex-row items-center mb-2">
          <User size={14} color="#6B7280" />
          <Text className="text-gray-600 text-sm ml-1">
            {ticket.contact_person}
          </Text>
          {ticket.contact_phone && (
            <TouchableOpacity className="ml-2">
              <Phone size={14} color="#3B82F6" />
            </TouchableOpacity>
          )}
        </View>
      )}



      {/* Action Buttons */}
      <View className="flex-row justify-between pt-3 border-t border-gray-100">
        {activeTab === "available" && (
          <TouchableOpacity
            className="bg-blue-500 px-4 py-2 rounded-lg flex-row items-center"
            onPress={() => assignTicketToSelf(ticket.id)}
          >
            <User size={16} color="#FFFFFF" />
            <Text className="text-white font-medium ml-1">Assign to Me</Text>
          </TouchableOpacity>
        )}

        {activeTab === "assigned" && (
          <>
            <TouchableOpacity
              className="bg-indigo-500 px-4 py-2 rounded-lg flex-row items-center"
              onPress={() => scheduleTicket(ticket.id)}
            >
              <Calendar size={16} color="#FFFFFF" />
              <Text className="text-white font-medium ml-1">Schedule</Text>
            </TouchableOpacity>
            <TouchableOpacity
              className="bg-green-500 px-4 py-2 rounded-lg flex-row items-center"
              onPress={() => startIntervention(ticket.id)}
            >
              <PlayCircle size={16} color="#FFFFFF" />
              <Text className="text-white font-medium ml-1">Start</Text>
            </TouchableOpacity>
          </>
        )}

        {activeTab === "scheduled" && (
          <TouchableOpacity
            className="bg-green-500 px-4 py-2 rounded-lg flex-row items-center"
            onPress={() => startIntervention(ticket.id)}
          >
            <PlayCircle size={16} color="#FFFFFF" />
            <Text className="text-white font-medium ml-1">Start Now</Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity
          className="bg-gray-500 px-4 py-2 rounded-lg flex-row items-center"
          onPress={() => router.push(`/tickets/${ticket.id}`)}
        >
          <Text className="text-white font-medium">View Details</Text>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      <StatusBar style="dark" />

      {/* Header */}
      <View className="flex-row justify-between items-center p-4 border-b border-gray-200 bg-white">
        <View className="flex-row items-center flex-1">
          <TouchableOpacity onPress={() => router.back()} className="mr-3">
            <ArrowLeft size={24} color="#0F172A" />
          </TouchableOpacity>
          <Text className="text-lg md:text-xl font-bold text-gray-800 flex-1" numberOfLines={1}>
            🔧 Field Technician Dashboard
          </Text>
        </View>
        <TouchableOpacity
          className="bg-blue-500 p-2 rounded-full"
          onPress={() => router.push("/notifications")}
        >
          <Bell size={20} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      {/* Tab Navigation */}
      <View className="flex-row bg-white border-b border-gray-200">
        {[
          { key: "available", label: "Available", count: activeTab === "available" ? tickets.length : 0 },
          { key: "assigned", label: "Assigned", count: activeTab === "assigned" ? tickets.length : 0 },
          { key: "scheduled", label: "Scheduled", count: activeTab === "scheduled" ? tickets.length : 0 },
          { key: "completed", label: "Completed", count: activeTab === "completed" ? tickets.length : 0 },
        ].map((tab) => (
          <TouchableOpacity
            key={tab.key}
            className={`flex-1 py-3 px-2 ${
              activeTab === tab.key ? "border-b-2 border-blue-500" : ""
            }`}
            onPress={() => setActiveTab(tab.key as any)}
          >
            <Text
              className={`text-center font-medium text-sm ${
                activeTab === tab.key ? "text-blue-600" : "text-gray-600"
              }`}
            >
              {tab.label}
            </Text>
            {activeTab === tab.key && tab.count > 0 && (
              <Text className="text-center text-xs text-blue-500 mt-1">
                ({tab.count})
              </Text>
            )}
          </TouchableOpacity>
        ))}
      </View>

      {/* Content */}
      <ScrollView
        className="flex-1 p-4"
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
      >
        {loading ? (
          <View className="flex-1 justify-center items-center py-20">
            <ActivityIndicator size="large" color="#3B82F6" />
            <Text className="text-gray-500 mt-2">Loading tickets...</Text>
          </View>
        ) : tickets.length === 0 ? (
          <View className="flex-1 justify-center items-center py-20">
            <Package size={48} color="#9CA3AF" />
            <Text className="text-gray-500 text-lg mt-4">
              {activeTab === "available" && "No tickets available"}
              {activeTab === "assigned" && "No tickets assigned to you"}
              {activeTab === "scheduled" && "No scheduled interventions"}
              {activeTab === "completed" && "No completed tickets"}
            </Text>
            <Text className="text-gray-400 text-center mt-2 px-8">
              {activeTab === "available" && "Check back later for new tickets from the helpdesk"}
              {activeTab === "assigned" && "Assign yourself to available tickets to get started"}
              {activeTab === "scheduled" && "Schedule your assigned tickets for intervention"}
              {activeTab === "completed" && "Completed tickets will appear here"}
            </Text>
          </View>
        ) : (
          tickets.map(renderTicketCard)
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
