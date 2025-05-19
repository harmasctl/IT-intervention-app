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
} from "lucide-react-native";
import TicketList from "../components/TicketList";
import { useAuth } from "../components/AuthProvider";
import { supabase } from "../lib/supabase";
import NotificationBadge from "../components/NotificationBadge";

export default function Dashboard() {
  const router = useRouter();
  const { user } = useAuth();
  const [activeFilter, setActiveFilter] = useState("new");
  const [loading, setLoading] = useState(true);
  const [summaryStats, setSummaryStats] = useState({
    new: 0,
    inProgress: 0,
    resolved: 0,
    highPriority: 0,
    slaCompliant: 0,
    avgResponseTime: "N/A",
    avgResolutionTime: "N/A",
  });

  useEffect(() => {
    fetchDashboardStats();
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
        slaCompliant: 0,
        avgResponseTime: "N/A",
        avgResolutionTime: "N/A",
      });
    } catch (error) {
      console.error("Error:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTicket = () => {
    router.push("/tickets/create");
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

      {/* Header */}
      <View className="flex-row justify-between items-center px-5 py-4 bg-gradient-to-r from-blue-700 to-blue-900 shadow-lg">
        <View className="flex-row items-center">
          <Home size={24} color="#ffffff" className="mr-2" />
          <Text className="text-2xl font-bold text-white">Tech Support</Text>
        </View>
        <View className="flex-row space-x-4">
          <TouchableOpacity
            className="relative bg-blue-800 p-2 rounded-full"
            onPress={() => router.push("/notifications")}
          >
            <NotificationBadge color="white" />
          </TouchableOpacity>
          <TouchableOpacity className="bg-blue-800 p-2 rounded-full">
            <Filter size={20} color="#ffffff" />
          </TouchableOpacity>
          <TouchableOpacity
            className="bg-blue-800 p-2 rounded-full"
            onPress={() => router.push("/profile")}
          >
            <User size={20} color="#ffffff" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Create Ticket Button - Added prominently at the top */}
      <TouchableOpacity
        className="mx-5 mt-4 bg-blue-600 rounded-xl p-4 flex-row items-center justify-center shadow-xl"
        onPress={handleCreateTicket}
      >
        <Plus size={24} color="#ffffff" />
        <Text className="text-white font-bold ml-2 text-lg">
          Create New Ticket
        </Text>
      </TouchableOpacity>

      <ScrollView className="flex-1 bg-gray-100">
        {/* Hero Section */}
        <View className="bg-gradient-to-br from-blue-600 to-blue-800 px-5 py-8 rounded-b-3xl shadow-lg">
          <Text className="text-blue-100 text-lg font-medium mb-1">
            Welcome back
            {user ? `, ${user.user_metadata?.name || "Technician"}` : ""}
          </Text>
          <Text className="text-white text-3xl font-bold mb-6">Dashboard</Text>
          <TouchableOpacity
            className="bg-white rounded-xl p-4 flex-row items-center justify-center shadow-xl"
            onPress={handleCreateTicket}
          >
            <Plus size={20} color="#1e40af" />
            <Text className="text-blue-800 font-semibold ml-2">
              Create New Ticket
            </Text>
          </TouchableOpacity>
        </View>

        {/* Summary Statistics */}
        <View className="px-5 py-6 bg-white rounded-2xl mx-4 -mt-6 shadow-xl">
          <Text className="text-lg font-semibold mb-4 text-gray-800 flex-row items-center">
            <BarChart3 size={18} color="#1e40af" className="mr-2" /> Performance
            Overview
          </Text>

          {loading ? (
            <View className="h-32 items-center justify-center">
              <ActivityIndicator size="large" color="#1e40af" />
              <Text className="text-gray-500 mt-2">Loading statistics...</Text>
            </View>
          ) : (
            <>
              <View className="flex-row justify-between mb-4">
                <View className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-2xl p-4 flex-1 mr-3 shadow-sm">
                  <View className="flex-row items-center justify-between">
                    <Text className="text-sm font-medium text-blue-800">
                      New
                    </Text>
                    <View className="bg-blue-200 p-1.5 rounded-full">
                      <AlertCircle size={16} color="#1e40af" />
                    </View>
                  </View>
                  <Text className="text-3xl font-bold text-blue-800 mt-2">
                    {summaryStats.new}
                  </Text>
                </View>
                <View className="bg-gradient-to-br from-amber-50 to-amber-100 rounded-2xl p-4 flex-1 shadow-sm">
                  <View className="flex-row items-center justify-between">
                    <Text className="text-sm font-medium text-amber-800">
                      In Progress
                    </Text>
                    <View className="bg-amber-200 p-1.5 rounded-full">
                      <Clock size={16} color="#b45309" />
                    </View>
                  </View>
                  <Text className="text-3xl font-bold text-amber-700 mt-2">
                    {summaryStats.inProgress}
                  </Text>
                </View>
              </View>

              <View className="flex-row justify-between mb-4">
                <View className="bg-gradient-to-br from-green-50 to-green-100 rounded-2xl p-4 flex-1 mr-3 shadow-sm">
                  <View className="flex-row items-center justify-between">
                    <Text className="text-sm font-medium text-green-800">
                      Resolved
                    </Text>
                    <View className="bg-green-200 p-1.5 rounded-full">
                      <CheckCircle size={16} color="#15803d" />
                    </View>
                  </View>
                  <Text className="text-3xl font-bold text-green-700 mt-2">
                    {summaryStats.resolved}
                  </Text>
                </View>
                <View className="bg-gradient-to-br from-red-50 to-red-100 rounded-2xl p-4 flex-1 shadow-sm">
                  <View className="flex-row items-center justify-between">
                    <Text className="text-sm font-medium text-red-800">
                      High Priority
                    </Text>
                    <View className="bg-red-200 p-1.5 rounded-full">
                      <AlertCircle size={16} color="#b91c1c" />
                    </View>
                  </View>
                  <Text className="text-3xl font-bold text-red-700 mt-2">
                    {summaryStats.highPriority}
                  </Text>
                </View>
              </View>

              {/* SLA Metrics */}
              <Text className="text-lg font-semibold mb-3 text-gray-800">
                SLA Metrics
              </Text>
              <View className="flex-row justify-between mb-4">
                <View className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-2xl p-4 flex-1 mr-3 shadow-sm">
                  <View className="flex-row items-center justify-between">
                    <Text className="text-sm font-medium text-purple-800">
                      SLA Compliant
                    </Text>
                    <View className="bg-purple-200 p-1.5 rounded-full">
                      <CheckCircle size={16} color="#7e22ce" />
                    </View>
                  </View>
                  <Text className="text-3xl font-bold text-purple-700 mt-2">
                    {summaryStats.slaCompliant}
                  </Text>
                </View>
                <View className="bg-gradient-to-br from-cyan-50 to-cyan-100 rounded-2xl p-4 flex-1 shadow-sm">
                  <View className="flex-row items-center justify-between">
                    <Text className="text-sm font-medium text-cyan-800">
                      Avg Response
                    </Text>
                    <View className="bg-cyan-200 p-1.5 rounded-full">
                      <Clock size={16} color="#0e7490" />
                    </View>
                  </View>
                  <Text className="text-3xl font-bold text-cyan-700 mt-2">
                    {summaryStats.avgResponseTime}
                  </Text>
                </View>
              </View>

              <View className="flex-row justify-between">
                <View className="bg-gradient-to-br from-indigo-50 to-indigo-100 rounded-2xl p-4 flex-1 mr-3 shadow-sm">
                  <View className="flex-row items-center justify-between">
                    <Text className="text-sm font-medium text-indigo-800">
                      Avg Resolution
                    </Text>
                    <View className="bg-indigo-200 p-1.5 rounded-full">
                      <Clock size={16} color="#4f46e5" />
                    </View>
                  </View>
                  <Text className="text-3xl font-bold text-indigo-700 mt-2">
                    {summaryStats.avgResolutionTime}
                  </Text>
                </View>
                <View className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-2xl p-4 flex-1 opacity-0"></View>
              </View>
            </>
          )}
        </View>

        {/* Quick Access Cards */}
        <View className="px-5 py-6 mt-6">
          <Text className="text-lg font-semibold mb-4 text-gray-800 flex-row items-center">
            <Menu size={18} color="#1e40af" className="mr-2" /> Quick Access
          </Text>
          <View className="flex-row flex-wrap justify-between">
            <TouchableOpacity
              className="bg-white rounded-2xl p-5 w-[48%] mb-4 shadow-md items-center transform transition-transform active:scale-95"
              onPress={() => handleNavigation("/schedule")}
            >
              <View className="bg-gradient-to-br from-blue-100 to-blue-200 p-4 rounded-full mb-3 shadow-sm">
                <Calendar size={24} color="#1e40af" />
              </View>
              <Text className="text-gray-800 font-medium">Schedule</Text>
            </TouchableOpacity>

            <TouchableOpacity
              className="bg-white rounded-2xl p-5 w-[48%] mb-4 shadow-md items-center transform transition-transform active:scale-95"
              onPress={() => handleNavigation("/equipment")}
            >
              <View className="bg-gradient-to-br from-amber-100 to-amber-200 p-4 rounded-full mb-3 shadow-sm">
                <Package size={24} color="#b45309" />
              </View>
              <Text className="text-gray-800 font-medium">Equipment</Text>
            </TouchableOpacity>

            <TouchableOpacity
              className="bg-white rounded-2xl p-5 w-[48%] mb-4 shadow-md items-center transform transition-transform active:scale-95"
              onPress={() => handleNavigation("/devices")}
            >
              <View className="bg-gradient-to-br from-green-100 to-green-200 p-4 rounded-full mb-3 shadow-sm">
                <Wrench size={24} color="#15803d" />
              </View>
              <Text className="text-gray-800 font-medium">Devices</Text>
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
              onPress={() => handleNavigation("/users")}
            >
              <View className="bg-gradient-to-br from-indigo-100 to-indigo-200 p-4 rounded-full mb-3 shadow-sm">
                <User size={24} color="#4338ca" />
              </View>
              <Text className="text-gray-800 font-medium">Users</Text>
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
              onPress={() => handleNavigation("/admin")}
            >
              <View className="bg-gradient-to-br from-blue-600 to-blue-700 p-4 rounded-full mb-3 shadow-sm">
                <Settings size={24} color="white" />
              </View>
              <Text className="text-gray-800 font-medium">Admin</Text>
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

          {/* Filter Tabs */}
          <View className="flex-row mb-4 bg-gray-100 p-1 rounded-xl">
            <TouchableOpacity
              className={`py-2 flex-1 rounded-lg ${activeFilter === "new" ? "bg-white shadow-sm" : ""}`}
              onPress={() => setActiveFilter("new")}
            >
              <Text
                className={`text-center ${activeFilter === "new" ? "text-blue-700 font-medium" : "text-gray-500"}`}
              >
                New
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              className={`py-2 flex-1 rounded-lg ${activeFilter === "inProgress" ? "bg-white shadow-sm" : ""}`}
              onPress={() => setActiveFilter("inProgress")}
            >
              <Text
                className={`text-center ${activeFilter === "inProgress" ? "text-blue-700 font-medium" : "text-gray-500"}`}
              >
                In Progress
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              className={`py-2 flex-1 rounded-lg ${activeFilter === "resolved" ? "bg-white shadow-sm" : ""}`}
              onPress={() => setActiveFilter("resolved")}
            >
              <Text
                className={`text-center ${activeFilter === "resolved" ? "text-blue-700 font-medium" : "text-gray-500"}`}
              >
                Resolved
              </Text>
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

      {/* Supabase Dashboard Button */}
      <TouchableOpacity
        className="mx-5 mb-4 bg-gradient-to-r from-purple-600 to-purple-800 rounded-xl p-4 flex-row items-center justify-center shadow-xl"
        onPress={() => router.push("/dashboard")}
      >
        <BarChart3 size={20} color="#ffffff" />
        <Text className="text-white font-semibold ml-2">
          View Supabase Dashboard
        </Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}
