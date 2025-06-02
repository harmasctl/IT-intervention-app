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
  Users,
  Clock,
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  Calendar,
  DollarSign,
  BarChart3,
  User,
  Wrench,
  Building2,
  Package,
} from "lucide-react-native";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../../components/AuthProvider";

interface DashboardStats {
  totalTickets: number;
  newTickets: number;
  assignedTickets: number;
  inProgressTickets: number;
  resolvedTickets: number;
  overdueTickets: number;
  avgResolutionTime: number;
  totalCost: number;
  activeTechnicians: number;
  topTechnician: string;
  busyRestaurant: string;
  commonIssue: string;
}

interface TicketItem {
  id: string;
  title: string;
  priority: string;
  status: string;
  restaurant_name: string;
  technician_name?: string;
  created_at: string;
  sla_due_at?: string;
  estimated_duration?: string;
}

export default function ManagerDashboard() {
  const router = useRouter();
  const { user } = useAuth();
  const [stats, setStats] = useState<DashboardStats>({
    totalTickets: 0,
    newTickets: 0,
    assignedTickets: 0,
    inProgressTickets: 0,
    resolvedTickets: 0,
    overdueTickets: 0,
    avgResolutionTime: 0,
    totalCost: 0,
    activeTechnicians: 0,
    topTechnician: "N/A",
    busyRestaurant: "N/A",
    commonIssue: "N/A",
  });
  const [recentTickets, setRecentTickets] = useState<TicketItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);

      // Fetch ticket statistics
      const { data: tickets, error: ticketsError } = await supabase
        .from("tickets")
        .select(`
          id,
          title,
          priority,
          status,
          created_at,
          sla_due_at,
          estimated_duration,
          total_cost,
          assignee_name,
          restaurant:restaurants(name)
        `);

      if (ticketsError) {
        console.error("Error fetching tickets:", ticketsError);
        return;
      }

      // Calculate statistics
      const now = new Date();
      const totalTickets = tickets?.length || 0;
      const newTickets = tickets?.filter(t => t.status === "new").length || 0;
      const assignedTickets = tickets?.filter(t => t.status === "assigned").length || 0;
      const inProgressTickets = tickets?.filter(t => t.status === "in-progress").length || 0;
      const resolvedTickets = tickets?.filter(t => t.status === "resolved").length || 0;
      const overdueTickets = tickets?.filter(t => 
        t.sla_due_at && new Date(t.sla_due_at) < now && t.status !== "resolved"
      ).length || 0;

      const totalCost = tickets?.reduce((sum, t) => sum + (t.total_cost || 0), 0) || 0;

      // Get technician statistics
      const { data: technicians, error: techError } = await supabase
        .from("users")
        .select("id, name")
        .eq("role", "technician");

      const activeTechnicians = technicians?.length || 0;

      // Find busiest restaurant
      const restaurantCounts = tickets?.reduce((acc: any, ticket) => {
        const name = ticket.restaurant?.name || "Unknown";
        acc[name] = (acc[name] || 0) + 1;
        return acc;
      }, {});

      const busyRestaurant = Object.keys(restaurantCounts || {}).reduce((a, b) => 
        (restaurantCounts[a] || 0) > (restaurantCounts[b] || 0) ? a : b, "N/A"
      );

      // Find most common issue type
      const issueCounts = tickets?.reduce((acc: any, ticket) => {
        const type = ticket.title.split(" ")[0] || "Unknown";
        acc[type] = (acc[type] || 0) + 1;
        return acc;
      }, {});

      const commonIssue = Object.keys(issueCounts || {}).reduce((a, b) => 
        (issueCounts[a] || 0) > (issueCounts[b] || 0) ? a : b, "N/A"
      );

      setStats({
        totalTickets,
        newTickets,
        assignedTickets,
        inProgressTickets,
        resolvedTickets,
        overdueTickets,
        avgResolutionTime: 0, // Calculate from interventions table
        totalCost,
        activeTechnicians,
        topTechnician: "N/A", // Calculate from interventions
        busyRestaurant,
        commonIssue,
      });

      // Set recent tickets for quick view
      const recent = tickets
        ?.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        .slice(0, 5)
        .map(ticket => ({
          id: ticket.id,
          title: ticket.title,
          priority: ticket.priority,
          status: ticket.status,
          restaurant_name: ticket.restaurant?.name || "Unknown",
          technician_name: ticket.assignee_name,
          created_at: ticket.created_at,
          sla_due_at: ticket.sla_due_at,
          estimated_duration: ticket.estimated_duration,
        })) || [];

      setRecentTickets(recent);
    } catch (error) {
      console.error("Error fetching dashboard data:", error);
      Alert.alert("Error", "Failed to fetch dashboard data");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    fetchDashboardData();
  };

  const assignTicket = async (ticketId: string) => {
    // Get available technicians
    const { data: technicians } = await supabase
      .from("users")
      .select("id, name")
      .eq("role", "technician");

    if (!technicians || technicians.length === 0) {
      Alert.alert("No Technicians", "No technicians available for assignment");
      return;
    }

    // Show technician selection (simplified for demo)
    Alert.alert(
      "Assign Ticket",
      "Select a technician to assign this ticket to:",
      [
        ...technicians.map(tech => ({
          text: tech.name,
          onPress: () => performAssignment(ticketId, tech.id, tech.name),
        })),
        { text: "Cancel", style: "cancel" },
      ]
    );
  };

  const performAssignment = async (ticketId: string, technicianId: string, technicianName: string) => {
    try {
      const { error } = await supabase
        .from("tickets")
        .update({
          assigned_to: technicianId,
          assignee_name: technicianName,
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
          notes: `Ticket assigned to ${technicianName} by manager`,
          user_id: user?.id,
        });

      Alert.alert("Success", `Ticket assigned to ${technicianName}`);
      fetchDashboardData();
    } catch (error) {
      console.error("Error assigning ticket:", error);
      Alert.alert("Error", "Failed to assign ticket");
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
      case "resolved": return "text-green-600";
      default: return "text-gray-600";
    }
  };

  if (loading) {
    return (
      <SafeAreaView className="flex-1 bg-white justify-center items-center">
        <ActivityIndicator size="large" color="#3B82F6" />
        <Text className="text-gray-500 mt-2">Loading dashboard...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      <StatusBar style="dark" />

      {/* Header */}
      <View className="flex-row justify-between items-center p-4 border-b border-gray-200 bg-white">
        <View className="flex-row items-center flex-1">
          <TouchableOpacity onPress={() => router.back()} className="mr-3">
            <ArrowLeft size={24} color="#0F172A" />
          </TouchableOpacity>
          <Text className="text-lg font-bold text-gray-800 flex-1" numberOfLines={1}>
            👨‍💼 Manager Dashboard
          </Text>
        </View>
      </View>

      <ScrollView
        className="flex-1"
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
      >
        {/* Key Metrics */}
        <View className="p-4">
          <Text className="text-lg font-bold text-gray-800 mb-4">📊 Key Metrics</Text>
          
          <View className="flex-row flex-wrap justify-between">
            <View className="bg-white rounded-lg p-4 w-[48%] mb-3 shadow-sm">
              <View className="flex-row items-center justify-between">
                <View>
                  <Text className="text-2xl font-bold text-blue-600">{stats.totalTickets}</Text>
                  <Text className="text-gray-600 text-sm">Total Tickets</Text>
                </View>
                <Package size={24} color="#3B82F6" />
              </View>
            </View>

            <View className="bg-white rounded-lg p-4 w-[48%] mb-3 shadow-sm">
              <View className="flex-row items-center justify-between">
                <View>
                  <Text className="text-2xl font-bold text-orange-600">{stats.newTickets}</Text>
                  <Text className="text-gray-600 text-sm">New Tickets</Text>
                </View>
                <AlertTriangle size={24} color="#EA580C" />
              </View>
            </View>

            <View className="bg-white rounded-lg p-4 w-[48%] mb-3 shadow-sm">
              <View className="flex-row items-center justify-between">
                <View>
                  <Text className="text-2xl font-bold text-purple-600">{stats.inProgressTickets}</Text>
                  <Text className="text-gray-600 text-sm">In Progress</Text>
                </View>
                <Clock size={24} color="#7C3AED" />
              </View>
            </View>

            <View className="bg-white rounded-lg p-4 w-[48%] mb-3 shadow-sm">
              <View className="flex-row items-center justify-between">
                <View>
                  <Text className="text-2xl font-bold text-green-600">{stats.resolvedTickets}</Text>
                  <Text className="text-gray-600 text-sm">Resolved</Text>
                </View>
                <CheckCircle size={24} color="#059669" />
              </View>
            </View>
          </View>

          {/* Overdue Tickets Alert */}
          {stats.overdueTickets > 0 && (
            <View className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
              <View className="flex-row items-center">
                <AlertTriangle size={20} color="#EF4444" />
                <Text className="text-red-800 font-bold ml-2">
                  {stats.overdueTickets} Overdue Tickets
                </Text>
              </View>
              <Text className="text-red-700 text-sm mt-1">
                These tickets have exceeded their SLA deadline and need immediate attention.
              </Text>
            </View>
          )}

          {/* Cost & Performance */}
          <View className="bg-white rounded-lg p-4 mb-4 shadow-sm">
            <Text className="font-bold text-gray-800 mb-3">💰 Cost & Performance</Text>
            <View className="flex-row justify-between items-center mb-2">
              <Text className="text-gray-700">Total Cost:</Text>
              <Text className="font-bold text-green-600">${stats.totalCost.toFixed(2)}</Text>
            </View>
            <View className="flex-row justify-between items-center mb-2">
              <Text className="text-gray-700">Active Technicians:</Text>
              <Text className="font-bold text-blue-600">{stats.activeTechnicians}</Text>
            </View>
            <View className="flex-row justify-between items-center mb-2">
              <Text className="text-gray-700">Busiest Restaurant:</Text>
              <Text className="font-bold text-purple-600">{stats.busyRestaurant}</Text>
            </View>
            <View className="flex-row justify-between items-center">
              <Text className="text-gray-700">Common Issue:</Text>
              <Text className="font-bold text-orange-600">{stats.commonIssue}</Text>
            </View>
          </View>

          {/* Recent Tickets */}
          <Text className="text-lg font-bold text-gray-800 mb-4">🎫 Recent Tickets</Text>
          {recentTickets.map((ticket) => (
            <TouchableOpacity
              key={ticket.id}
              className="bg-white rounded-lg p-4 mb-3 shadow-sm"
              onPress={() => router.push(`/tickets/${ticket.id}`)}
            >
              <View className="flex-row justify-between items-start mb-2">
                <View className="flex-1">
                  <Text className="font-bold text-gray-800" numberOfLines={1}>
                    {ticket.title}
                  </Text>
                  <Text className="text-gray-600 text-sm">{ticket.restaurant_name}</Text>
                </View>
                <View className={`px-2 py-1 rounded-full ${getPriorityColor(ticket.priority)}`}>
                  <Text className="text-white text-xs font-medium">
                    {ticket.priority.toUpperCase()}
                  </Text>
                </View>
              </View>

              <View className="flex-row justify-between items-center">
                <Text className={`text-sm font-medium ${getStatusColor(ticket.status)}`}>
                  {ticket.status.replace("-", " ").toUpperCase()}
                </Text>
                {ticket.technician_name ? (
                  <Text className="text-gray-600 text-sm">
                    👨‍🔧 {ticket.technician_name}
                  </Text>
                ) : (
                  <TouchableOpacity
                    className="bg-blue-500 px-3 py-1 rounded"
                    onPress={() => assignTicket(ticket.id)}
                  >
                    <Text className="text-white text-xs">Assign</Text>
                  </TouchableOpacity>
                )}
              </View>
            </TouchableOpacity>
          ))}

          {/* Quick Actions */}
          <Text className="text-lg font-bold text-gray-800 mb-4 mt-6">⚡ Quick Actions</Text>
          <View className="flex-row flex-wrap justify-between">
            <TouchableOpacity
              className="bg-blue-500 rounded-lg p-4 w-[48%] mb-3"
              onPress={() => router.push("/tickets")}
            >
              <Text className="text-white font-bold">View All Tickets</Text>
              <Text className="text-blue-100 text-sm">Manage all tickets</Text>
            </TouchableOpacity>

            <TouchableOpacity
              className="bg-green-500 rounded-lg p-4 w-[48%] mb-3"
              onPress={() => router.push("/reports")}
            >
              <Text className="text-white font-bold">View Reports</Text>
              <Text className="text-green-100 text-sm">Analytics & insights</Text>
            </TouchableOpacity>

            <TouchableOpacity
              className="bg-purple-500 rounded-lg p-4 w-[48%] mb-3"
              onPress={() => router.push("/tickets/helpdesk-create")}
            >
              <Text className="text-white font-bold">Create Ticket</Text>
              <Text className="text-purple-100 text-sm">New helpdesk ticket</Text>
            </TouchableOpacity>

            <TouchableOpacity
              className="bg-orange-500 rounded-lg p-4 w-[48%] mb-3"
              onPress={() => router.push("/technician/dashboard")}
            >
              <Text className="text-white font-bold">Technician View</Text>
              <Text className="text-orange-100 text-sm">Field tech dashboard</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
