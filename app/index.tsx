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
  TrendingUp,
  Activity,
  Search,
  RefreshCw,
  Building2,
  Shield,
  Upload,
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

      {/* Enhanced Create Ticket Button */}
      <View className="px-6 -mt-6 relative z-10">
        <TouchableOpacity
          className="bg-gradient-to-r from-emerald-500 to-teal-600 rounded-2xl p-5 flex-row items-center justify-center shadow-2xl border border-white/20"
          onPress={handleCreateTicket}
        >
          <View className="bg-white/20 p-2 rounded-xl mr-3">
            <Plus size={24} color="#ffffff" />
          </View>
          <View>
            <Text className="text-white font-bold text-lg">Create New Ticket</Text>
            <Text className="text-emerald-100 text-sm">Start a new support request</Text>
          </View>
        </TouchableOpacity>
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

              {/* Performance Metrics */}
              <View className="bg-white rounded-3xl p-6 shadow-lg border border-gray-100">
                <Text className="text-xl font-bold text-gray-800 mb-4 flex-row items-center">
                  ⚡ Performance Metrics
                </Text>
                <View className="flex-row justify-between">
                  <View className="flex-1 mr-3">
                    <View className="bg-gradient-to-r from-purple-100 to-indigo-100 rounded-2xl p-4 mb-3">
                      <View className="flex-row items-center mb-2">
                        <CheckCircle size={18} color="#7c3aed" />
                        <Text className="text-purple-800 font-medium ml-2">SLA Compliance</Text>
                      </View>
                      <Text className="text-2xl font-bold text-purple-700">98.5%</Text>
                    </View>
                    <View className="bg-gradient-to-r from-cyan-100 to-blue-100 rounded-2xl p-4">
                      <View className="flex-row items-center mb-2">
                        <Clock size={18} color="#0891b2" />
                        <Text className="text-cyan-800 font-medium ml-2">Avg Response</Text>
                      </View>
                      <Text className="text-2xl font-bold text-cyan-700">2.3h</Text>
                    </View>
                  </View>
                  <View className="flex-1">
                    <View className="bg-gradient-to-r from-rose-100 to-pink-100 rounded-2xl p-4 mb-3">
                      <View className="flex-row items-center mb-2">
                        <TrendingUp size={18} color="#e11d48" />
                        <Text className="text-rose-800 font-medium ml-2">Resolution Rate</Text>
                      </View>
                      <Text className="text-2xl font-bold text-rose-700">94.2%</Text>
                    </View>
                    <View className="bg-gradient-to-r from-emerald-100 to-teal-100 rounded-2xl p-4">
                      <View className="flex-row items-center mb-2">
                        <Activity size={18} color="#059669" />
                        <Text className="text-emerald-800 font-medium ml-2">Efficiency</Text>
                      </View>
                      <Text className="text-2xl font-bold text-emerald-700">Excellent</Text>
                    </View>
                  </View>
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
              onPress={() => handleNavigation("/admin")}
            >
              <View className="bg-gradient-to-br from-blue-600 to-blue-700 p-4 rounded-full mb-3 shadow-sm">
                <Settings size={24} color="white" />
              </View>
              <Text className="text-gray-800 font-medium">Admin</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Enhanced Advanced Features Section */}
        <View className="px-6 py-8 bg-gradient-to-br from-slate-50 to-gray-100">
          <Text className="text-2xl font-bold text-gray-800 mb-6 flex-row items-center">
            ⚡ Advanced Features
          </Text>
          <View className="flex-row flex-wrap justify-between">
            <TouchableOpacity
              className="bg-white rounded-3xl p-6 w-[48%] mb-4 shadow-xl border border-gray-100 items-center transform transition-transform active:scale-95"
              onPress={() => handleNavigation("/devices/bulk-import")}
            >
              <View className="bg-gradient-to-br from-indigo-500 to-purple-600 p-4 rounded-2xl mb-4 shadow-lg">
                <Upload size={28} color="#ffffff" />
              </View>
              <Text className="text-gray-800 font-bold text-lg">Bulk Import</Text>
              <Text className="text-gray-500 text-sm text-center mt-1">Mass device import</Text>
            </TouchableOpacity>

            <TouchableOpacity
              className="bg-white rounded-2xl p-5 w-[48%] mb-4 shadow-md items-center transform transition-transform active:scale-95"
              onPress={() => handleNavigation("/notifications")}
            >
              <View className="bg-gradient-to-br from-cyan-100 to-cyan-200 p-4 rounded-full mb-3 shadow-sm">
                <Bell size={24} color="#0e7490" />
              </View>
              <Text className="text-gray-800 font-medium">Notifications</Text>
            </TouchableOpacity>

            <TouchableOpacity
              className="bg-white rounded-2xl p-5 w-[48%] mb-4 shadow-md items-center transform transition-transform active:scale-95"
              onPress={() => handleNavigation("/admin/dashboard")}
            >
              <View className="bg-gradient-to-br from-emerald-100 to-emerald-200 p-4 rounded-full mb-3 shadow-sm">
                <Monitor size={24} color="#059669" />
              </View>
              <Text className="text-gray-800 font-medium">Admin Panel</Text>
            </TouchableOpacity>

            <TouchableOpacity
              className="bg-white rounded-2xl p-5 w-[48%] mb-4 shadow-md items-center transform transition-transform active:scale-95"
              onPress={() => handleNavigation("/reports")}
            >
              <View className="bg-gradient-to-br from-rose-100 to-rose-200 p-4 rounded-full mb-3 shadow-sm">
                <TrendingUp size={24} color="#e11d48" />
              </View>
              <Text className="text-gray-800 font-medium">Analytics</Text>
            </TouchableOpacity>
          </View>

          {/* Additional Advanced Features Row */}
          <View className="flex-row flex-wrap justify-between mt-4">
            <TouchableOpacity
              className="bg-white rounded-2xl p-5 w-[48%] mb-4 shadow-md items-center transform transition-transform active:scale-95"
              onPress={() => handleNavigation("/search")}
            >
              <View className="bg-gradient-to-br from-purple-100 to-purple-200 p-4 rounded-full mb-3 shadow-sm">
                <Search size={24} color="#7c3aed" />
              </View>
              <Text className="text-gray-800 font-medium">Advanced Search</Text>
            </TouchableOpacity>

            <TouchableOpacity
              className="bg-white rounded-2xl p-5 w-[48%] mb-4 shadow-md items-center transform transition-transform active:scale-95"
              onPress={() => handleNavigation("/system/health")}
            >
              <View className="bg-gradient-to-br from-green-100 to-green-200 p-4 rounded-full mb-3 shadow-sm">
                <Activity size={24} color="#059669" />
              </View>
              <Text className="text-gray-800 font-medium">System Health</Text>
            </TouchableOpacity>
          </View>

          {/* Developer Testing Section */}
          <View className="flex-row flex-wrap justify-center mt-4">
            <TouchableOpacity
              className="bg-white rounded-2xl p-5 w-[48%] mb-4 shadow-md items-center transform transition-transform active:scale-95 border-2 border-blue-200"
              onPress={() => handleNavigation("/test-features")}
            >
              <View className="bg-gradient-to-br from-blue-100 to-blue-200 p-4 rounded-full mb-3 shadow-sm">
                <Settings size={24} color="#2563eb" />
              </View>
              <Text className="text-gray-800 font-medium">🧪 Test Features</Text>
              <Text className="text-xs text-gray-500 mt-1 text-center">Verify all advanced features</Text>
            </TouchableOpacity>

            <TouchableOpacity
              className="bg-white rounded-2xl p-5 w-[48%] mb-4 shadow-md items-center transform transition-transform active:scale-95 border-2 border-green-200"
              onPress={() => handleNavigation("/tickets/test")}
            >
              <View className="bg-gradient-to-br from-green-100 to-green-200 p-4 rounded-full mb-3 shadow-sm">
                <Ticket size={24} color="#059669" />
              </View>
              <Text className="text-gray-800 font-medium">🎫 Test Tickets</Text>
              <Text className="text-xs text-gray-500 mt-1 text-center">Verify ticket system functionality</Text>
            </TouchableOpacity>
          </View>

          {/* Helpdesk & Field Technician Section */}
          <View className="flex-row flex-wrap justify-center mt-4">
            <TouchableOpacity
              className="bg-white rounded-2xl p-5 w-[48%] mb-4 shadow-md items-center transform transition-transform active:scale-95 border-2 border-purple-200"
              onPress={() => handleNavigation("/tickets/helpdesk-create")}
            >
              <View className="bg-gradient-to-br from-purple-100 to-purple-200 p-4 rounded-full mb-3 shadow-sm">
                <User size={24} color="#7c3aed" />
              </View>
              <Text className="text-gray-800 font-medium">🎧 Helpdesk Ticket</Text>
              <Text className="text-xs text-gray-500 mt-1 text-center">Create detailed field tickets</Text>
            </TouchableOpacity>

            <TouchableOpacity
              className="bg-white rounded-2xl p-5 w-[48%] mb-4 shadow-md items-center transform transition-transform active:scale-95 border-2 border-orange-200"
              onPress={() => handleNavigation("/technician/dashboard")}
            >
              <View className="bg-gradient-to-br from-orange-100 to-orange-200 p-4 rounded-full mb-3 shadow-sm">
                <Wrench size={24} color="#ea580c" />
              </View>
              <Text className="text-gray-800 font-medium">🔧 Field Tech</Text>
              <Text className="text-xs text-gray-500 mt-1 text-center">Technician dashboard</Text>
            </TouchableOpacity>

            <TouchableOpacity
              className="bg-white rounded-2xl p-5 w-[48%] mb-4 shadow-md items-center transform transition-transform active:scale-95 border-2 border-indigo-200"
              onPress={() => handleNavigation("/manager/dashboard")}
            >
              <View className="bg-gradient-to-br from-indigo-100 to-indigo-200 p-4 rounded-full mb-3 shadow-sm">
                <BarChart3 size={24} color="#4f46e5" />
              </View>
              <Text className="text-gray-800 font-medium">👨‍💼 Manager</Text>
              <Text className="text-xs text-gray-500 mt-1 text-center">Oversight & assignment</Text>
            </TouchableOpacity>

            <TouchableOpacity
              className="bg-white rounded-2xl p-5 w-[48%] mb-4 shadow-md items-center transform transition-transform active:scale-95 border-2 border-emerald-200"
              onPress={() => handleNavigation("/workflow/test")}
            >
              <View className="bg-gradient-to-br from-emerald-100 to-emerald-200 p-4 rounded-full mb-3 shadow-sm">
                <RefreshCw size={24} color="#059669" />
              </View>
              <Text className="text-gray-800 font-medium">🔄 Workflow Test</Text>
              <Text className="text-xs text-gray-500 mt-1 text-center">End-to-end testing</Text>
            </TouchableOpacity>
          </View>

          {/* Advanced Features Section */}
          <View className="flex-row flex-wrap justify-center mt-4">
            <TouchableOpacity
              className="bg-white rounded-2xl p-5 w-[48%] mb-4 shadow-md items-center transform transition-transform active:scale-95 border-2 border-cyan-200"
              onPress={() => handleNavigation("/admin/dashboard")}
            >
              <View className="bg-gradient-to-br from-cyan-100 to-cyan-200 p-4 rounded-full mb-3 shadow-sm">
                <Shield size={24} color="#0891b2" />
              </View>
              <Text className="text-gray-800 font-medium">🛡️ Admin</Text>
              <Text className="text-xs text-gray-500 mt-1 text-center">System administration</Text>
            </TouchableOpacity>

            <TouchableOpacity
              className="bg-white rounded-2xl p-5 w-[48%] mb-4 shadow-md items-center transform transition-transform active:scale-95 border-2 border-pink-200"
              onPress={() => handleNavigation("/knowledge")}
            >
              <View className="bg-gradient-to-br from-pink-100 to-pink-200 p-4 rounded-full mb-3 shadow-sm">
                <BookOpen size={24} color="#ec4899" />
              </View>
              <Text className="text-gray-800 font-medium">📚 Knowledge</Text>
              <Text className="text-xs text-gray-500 mt-1 text-center">Knowledge base</Text>
            </TouchableOpacity>

            <TouchableOpacity
              className="bg-white rounded-2xl p-5 w-[48%] mb-4 shadow-md items-center transform transition-transform active:scale-95 border-2 border-teal-200"
              onPress={() => handleNavigation("/system/health")}
            >
              <View className="bg-gradient-to-br from-teal-100 to-teal-200 p-4 rounded-full mb-3 shadow-sm">
                <Activity size={24} color="#0d9488" />
              </View>
              <Text className="text-gray-800 font-medium">🏥 System Health</Text>
              <Text className="text-xs text-gray-500 mt-1 text-center">Monitor performance</Text>
            </TouchableOpacity>

            <TouchableOpacity
              className="bg-white rounded-2xl p-5 w-[48%] mb-4 shadow-md items-center transform transition-transform active:scale-95 border-2 border-amber-200"
              onPress={() => handleNavigation("/devices/bulk-import")}
            >
              <View className="bg-gradient-to-br from-amber-100 to-amber-200 p-4 rounded-full mb-3 shadow-sm">
                <Upload size={24} color="#d97706" />
              </View>
              <Text className="text-gray-800 font-medium">📦 Bulk Import</Text>
              <Text className="text-xs text-gray-500 mt-1 text-center">Import devices</Text>
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

      {/* Analytics Dashboard Button */}
      <TouchableOpacity
        className="mx-5 mb-4 bg-gradient-to-r from-purple-600 to-purple-800 rounded-xl p-4 flex-row items-center justify-center shadow-xl"
        onPress={() => router.push("/reports")}
      >
        <BarChart3 size={20} color="#ffffff" />
        <Text className="text-white font-semibold ml-2">
          View Analytics Dashboard
        </Text>
      </TouchableOpacity>

      {/* Add a direct link to the device map for testing */}
      <TouchableOpacity
        className="bg-blue-500 p-4 rounded-lg mt-4"
        onPress={() => {
          console.log("Navigating to test device map");
          router.push("/test-device-map");
        }}
      >
        <Text className="text-white text-center font-bold">Test Restaurant Device Map</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}
