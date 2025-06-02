import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Image,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { useRouter } from "expo-router";
import {
  Plus,
  Bell,
  Filter,
  Clock,
  CheckCircle,
  AlertCircle,
  AlertTriangle,
  Wrench,
  User,
  BarChart3,
  Calendar,
  BookOpen,
  Menu,
  Settings,
  Home,
  Ticket,
  Package,
  Utensils,
  Map,
  Download,
  Monitor,
  Building2,
  Shield,
  Upload,
  Search,
  QrCode,
} from "lucide-react-native";
import TicketList from "../components/TicketList";
import { useAuth } from "../components/AuthProvider";
import { supabase } from "../lib/supabase";
import NotificationBadge from "../components/NotificationBadge";

export default function Dashboard() {
  const router = useRouter();
  const { user } = useAuth();

  const [loading, setLoading] = useState(true);
  const [summaryStats, setSummaryStats] = useState({
    new: 0,
    inProgress: 0,
    resolved: 0,
    highPriority: 0,

  });

  useEffect(() => {
    fetchDashboardStats();

    // Set up real-time subscription for tickets
    const ticketsSubscription = supabase
      .channel('tickets-changes')
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'tickets' },
        () => {
          // Refresh stats when tickets change
          fetchDashboardStats();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(ticketsSubscription);
    };
  }, []);

  const fetchDashboardStats = async () => {
    try {
      setLoading(true);

      // Fetch ticket statistics from Supabase
      const { data: newTickets, error: newError } = await supabase
        .from("tickets")
        .select("id")
        .eq("status", "new");

      const { data: inProgressTickets, error: inProgressError } = await supabase
        .from("tickets")
        .select("id")
        .eq("status", "in-progress");

      const { data: resolvedTickets, error: resolvedError } = await supabase
        .from("tickets")
        .select("id")
        .eq("status", "resolved");

      const { data: highPriorityTickets, error: highPriorityError } =
        await supabase.from("tickets").select("id").eq("priority", "high");

      if (newError || inProgressError || resolvedError || highPriorityError) {
        console.error("Error fetching dashboard stats");
        return;
      }

      setSummaryStats({
        new: newTickets?.length || 0,
        inProgress: inProgressTickets?.length || 0,
        resolved: resolvedTickets?.length || 0,
        highPriority: highPriorityTickets?.length || 0,
      });
    } catch (error) {
      console.error("Error:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTicket = () => {
    router.push("/tickets/helpdesk-create");
  };

  const handleSeeAllTickets = () => {
    router.push("/tickets");
  };

  const handleTicketPress = (ticketId: string) => {
    router.push(`/tickets/${ticketId}`);
  };

  const handleNavigation = (route: string) => {
    router.push(route as any);
  };

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      <StatusBar style="auto" />

      {/* Enhanced Header with Gradient */}
      <View className="px-6 py-6 bg-gradient-to-br from-indigo-600 via-purple-600 to-blue-700 shadow-2xl">
        <View className="flex-row justify-between items-center mb-4">
          <View className="flex-row items-center">
            <View className="bg-white/20 p-3 rounded-2xl mr-3 backdrop-blur-sm">
              <Home size={28} color="#ffffff" />
            </View>
            <View>
              <Text className="text-2xl font-bold text-white">IT Support Hub</Text>
              <Text className="text-indigo-100 text-sm">Professional Management System</Text>
            </View>
          </View>
          <View className="flex-row space-x-3">
            <TouchableOpacity
              className="relative bg-white/20 p-3 rounded-2xl backdrop-blur-sm"
              onPress={() => router.push("/notifications")}
            >
              <NotificationBadge color="white" />
            </TouchableOpacity>
            <TouchableOpacity
              className="bg-white/20 p-3 rounded-2xl backdrop-blur-sm"
              onPress={() => router.push("/search")}
            >
              <Search size={20} color="#ffffff" />
            </TouchableOpacity>
            <TouchableOpacity
              className="bg-white/20 p-3 rounded-2xl backdrop-blur-sm"
              onPress={() => router.push("/profile")}
            >
              <User size={20} color="#ffffff" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Welcome Message */}
        <View className="bg-white/10 rounded-2xl p-4 backdrop-blur-sm">
          <Text className="text-white/90 text-lg font-medium mb-1">
            Welcome back{user ? `, ${user.user_metadata?.name || "Technician"}` : ""}! 👋
          </Text>
          <Text className="text-indigo-100 text-sm">
            Ready to manage your IT operations efficiently
          </Text>
        </View>
      </View>



      <ScrollView className="flex-1 bg-gradient-to-b from-gray-50 to-white">
        {/* Quick Stats Cards */}
        <View className="px-6 py-6">
          <Text className="text-2xl font-bold text-gray-800 mb-6 flex-row items-center">
            📊 System Overview
          </Text>

          {loading ? (
            <View className="h-40 items-center justify-center">
              <ActivityIndicator size="large" color="#6366f1" />
              <Text className="text-gray-500 mt-3 text-lg">Loading dashboard...</Text>
            </View>
          ) : (
            <>
              {/* Modern Stats Grid */}
              <View className="flex-row justify-between mb-6">
                <View className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-3xl p-5 flex-1 mr-3 shadow-lg">
                  <View className="flex-row items-center justify-between mb-3">
                    <View className="bg-white/20 p-2 rounded-xl">
                      <AlertCircle size={20} color="#ffffff" />
                    </View>
                    <Text className="text-blue-100 text-sm font-medium">New Tickets</Text>
                  </View>
                  <Text className="text-4xl font-bold text-white mb-1">
                    {summaryStats.new}
                  </Text>
                  <Text className="text-blue-100 text-sm">Awaiting assignment</Text>
                </View>

                <View className="bg-gradient-to-br from-amber-500 to-orange-500 rounded-3xl p-5 flex-1 shadow-lg">
                  <View className="flex-row items-center justify-between mb-3">
                    <View className="bg-white/20 p-2 rounded-xl">
                      <Clock size={20} color="#ffffff" />
                    </View>
                    <Text className="text-orange-100 text-sm font-medium">In Progress</Text>
                  </View>
                  <Text className="text-4xl font-bold text-white mb-1">
                    {summaryStats.inProgress}
                  </Text>
                  <Text className="text-orange-100 text-sm">Being worked on</Text>
                </View>
              </View>

              <View className="flex-row justify-between mb-6">
                <View className="bg-gradient-to-br from-emerald-500 to-green-600 rounded-3xl p-5 flex-1 mr-3 shadow-lg">
                  <View className="flex-row items-center justify-between mb-3">
                    <View className="bg-white/20 p-2 rounded-xl">
                      <CheckCircle size={20} color="#ffffff" />
                    </View>
                    <Text className="text-green-100 text-sm font-medium">Resolved</Text>
                  </View>
                  <Text className="text-4xl font-bold text-white mb-1">
                    {summaryStats.resolved}
                  </Text>
                  <Text className="text-green-100 text-sm">Successfully completed</Text>
                </View>

                <View className="bg-gradient-to-br from-red-500 to-pink-600 rounded-3xl p-5 flex-1 shadow-lg">
                  <View className="flex-row items-center justify-between mb-3">
                    <View className="bg-white/20 p-2 rounded-xl">
                      <AlertTriangle size={20} color="#ffffff" />
                    </View>
                    <Text className="text-red-100 text-sm font-medium">High Priority</Text>
                  </View>
                  <Text className="text-4xl font-bold text-white mb-1">
                    {summaryStats.highPriority}
                  </Text>
                  <Text className="text-red-100 text-sm">Urgent attention needed</Text>
                </View>
              </View>


            </>
          )}
        </View>

        {/* Enhanced Quick Access Cards */}
        <View className="px-6 py-8">
          <Text className="text-2xl font-bold text-gray-800 mb-6 flex-row items-center">
            🚀 Quick Access
          </Text>
          <View className="flex-row flex-wrap justify-between">
            <TouchableOpacity
              className="bg-white rounded-3xl p-6 w-[48%] mb-4 shadow-xl border border-gray-100 items-center transform transition-transform active:scale-95"
              onPress={() => handleNavigation("/schedule")}
            >
              <View className="bg-gradient-to-br from-blue-500 to-indigo-600 p-4 rounded-2xl mb-4 shadow-lg">
                <Calendar size={28} color="#ffffff" />
              </View>
              <Text className="text-gray-800 font-bold text-lg">Schedule</Text>
              <Text className="text-gray-500 text-sm text-center mt-1">Manage appointments</Text>
            </TouchableOpacity>

            <TouchableOpacity
              className="bg-white rounded-3xl p-6 w-[48%] mb-4 shadow-xl border border-gray-100 items-center transform transition-transform active:scale-95"
              onPress={() => handleNavigation("/equipment")}
            >
              <View className="bg-gradient-to-br from-amber-500 to-orange-600 p-4 rounded-2xl mb-4 shadow-lg">
                <Package size={28} color="#ffffff" />
              </View>
              <Text className="text-gray-800 font-bold text-lg">Equipment</Text>
              <Text className="text-gray-500 text-sm text-center mt-1">Inventory management</Text>
            </TouchableOpacity>

            <TouchableOpacity
              className="bg-white rounded-3xl p-6 w-[48%] mb-4 shadow-xl border border-gray-100 items-center transform transition-transform active:scale-95"
              onPress={() => handleNavigation("/devices")}
            >
              <View className="bg-gradient-to-br from-emerald-500 to-teal-600 p-4 rounded-2xl mb-4 shadow-lg">
                <Wrench size={28} color="#ffffff" />
              </View>
              <Text className="text-gray-800 font-bold text-lg">All Devices</Text>
              <Text className="text-gray-500 text-sm text-center mt-1">Device overview</Text>
            </TouchableOpacity>

            <TouchableOpacity
              className="bg-white rounded-3xl p-6 w-[48%] mb-4 shadow-xl border border-gray-100 items-center transform transition-transform active:scale-95"
              onPress={() => handleNavigation("/devices/by-restaurant")}
            >
              <View className="bg-gradient-to-br from-purple-500 to-violet-600 p-4 rounded-2xl mb-4 shadow-lg">
                <Building2 size={28} color="#ffffff" />
              </View>
              <Text className="text-gray-800 font-bold text-lg">By Restaurant</Text>
              <Text className="text-gray-500 text-sm text-center mt-1">Location-based view</Text>
            </TouchableOpacity>

            <TouchableOpacity
              className="bg-white rounded-2xl p-5 w-[48%] mb-4 shadow-md items-center transform transition-transform active:scale-95"
              onPress={() => handleNavigation("/restaurants")}
            >
              <View className="bg-gradient-to-br from-red-100 to-red-200 p-4 rounded-full mb-3 shadow-sm">
                <Utensils size={24} color="#dc2626" />
              </View>
              <Text className="text-gray-800 font-medium">Restaurants</Text>
            </TouchableOpacity>

            <TouchableOpacity
              className="bg-white rounded-2xl p-5 w-[48%] mb-4 shadow-md items-center transform transition-transform active:scale-95"
              onPress={() => handleNavigation("/restaurants/device-map")}
            >
              <View className="bg-gradient-to-br from-purple-100 to-purple-200 p-4 rounded-full mb-3 shadow-sm">
                <Map size={24} color="#7e22ce" />
              </View>
              <Text className="text-gray-800 font-medium">Device Map</Text>
            </TouchableOpacity>

            <TouchableOpacity
              className="bg-white rounded-2xl p-5 w-[48%] mb-4 shadow-md items-center transform transition-transform active:scale-95"
              onPress={() => handleNavigation("/knowledge")}
            >
              <View className="bg-gradient-to-br from-purple-100 to-purple-200 p-4 rounded-full mb-3 shadow-sm">
                <BookOpen size={24} color="#6b21a8" />
              </View>
              <Text className="text-gray-800 font-medium">Knowledge</Text>
            </TouchableOpacity>

            <TouchableOpacity
              className="bg-white rounded-2xl p-5 w-[48%] mb-4 shadow-md items-center transform transition-transform active:scale-95"
              onPress={() => handleNavigation("/reports")}
            >
              <View className="bg-gradient-to-br from-cyan-100 to-cyan-200 p-4 rounded-full mb-3 shadow-sm">
                <BarChart3 size={24} color="#0e7490" />
              </View>
              <Text className="text-gray-800 font-medium">Reports</Text>
            </TouchableOpacity>

            <TouchableOpacity
              className="bg-white rounded-2xl p-5 w-[48%] mb-4 shadow-md items-center transform transition-transform active:scale-95"
              onPress={() => handleNavigation("/devices/scan")}
            >
              <View className="bg-gradient-to-br from-green-100 to-green-200 p-4 rounded-full mb-3 shadow-sm">
                <QrCode size={24} color="#059669" />
              </View>
              <Text className="text-gray-800 font-medium">Scan Device</Text>
            </TouchableOpacity>

          </View>
        </View>

        {/* Ticket List Section */}
        <View className="px-5 py-6 bg-white rounded-t-3xl mt-4 shadow-lg">
          <View className="flex-row justify-between items-center mb-4">
            <View className="flex-row items-center">
              <Ticket size={20} color="#1e40af" className="mr-2" />
              <Text className="text-lg font-semibold text-gray-800">
                Recent Tickets
              </Text>
            </View>
            <TouchableOpacity
              className="bg-blue-100 px-3 py-1.5 rounded-full"
              onPress={handleSeeAllTickets}
            >
              <Text className="text-blue-700 font-medium text-sm">See All</Text>
            </TouchableOpacity>
          </View>



          {/* Ticket List Component */}
          <TicketList onTicketPress={handleTicketPress} />
        </View>
      </ScrollView>

      {/* Bottom Navigation */}
      <View className="flex-row justify-around items-center py-3 px-2 bg-white border-t border-gray-200 shadow-lg">
        <TouchableOpacity
          className="items-center flex-1"
          onPress={() => handleNavigation("/")}
        >
          <View className="bg-blue-600 p-2 rounded-full mb-1">
            <Home size={20} color="white" />
          </View>
          <Text className="text-xs text-blue-800 font-medium">Home</Text>
        </TouchableOpacity>
        <TouchableOpacity
          className="items-center flex-1"
          onPress={() => handleNavigation("/tickets")}
        >
          <View className="bg-gray-100 p-2 rounded-full mb-1">
            <Ticket size={20} color="#4b5563" />
          </View>
          <Text className="text-xs text-gray-500">Tickets</Text>
        </TouchableOpacity>
        <TouchableOpacity
          className="items-center flex-1"
          onPress={handleCreateTicket}
        >
          <View className="bg-gradient-to-r from-blue-600 to-blue-700 p-3 rounded-full mb-1 -mt-8 border-4 border-white shadow-xl">
            <Plus size={24} color="white" />
          </View>
          <Text className="text-xs text-gray-500 mt-1">New</Text>
        </TouchableOpacity>
        <TouchableOpacity
          className="items-center flex-1"
          onPress={() => handleNavigation("/equipment")}
        >
          <View className="bg-gray-100 p-2 rounded-full mb-1">
            <Package size={20} color="#4b5563" />
          </View>
          <Text className="text-xs text-gray-500">Equipment</Text>
        </TouchableOpacity>
        <TouchableOpacity
          className="items-center flex-1"
          onPress={() => handleNavigation("/profile")}
        >
          <View className="bg-gray-100 p-2 rounded-full mb-1">
            <User size={20} color="#4b5563" />
          </View>
          <Text className="text-xs text-gray-500">Profile</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}
