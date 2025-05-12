import React, { useState } from "react";
import { View, Text, TouchableOpacity, ScrollView, Image } from "react-native";
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
} from "lucide-react-native";
import TicketList from "../components/TicketList";

export default function Dashboard() {
  const router = useRouter();
  const [activeFilter, setActiveFilter] = useState("new");

  // Mock data for summary statistics
  const summaryStats = {
    new: 12,
    inProgress: 8,
    resolved: 24,
    highPriority: 5,
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
    router.push(route);
  };

  return (
    <SafeAreaView className="flex-1 bg-white">
      <StatusBar style="auto" />

      {/* Header */}
      <View className="flex-row justify-between items-center px-4 py-3 border-b border-gray-200">
        <Text className="text-2xl font-bold text-blue-800">Tech Support</Text>
        <View className="flex-row">
          <TouchableOpacity className="mr-4">
            <Bell size={24} color="#1e40af" />
            <View className="absolute -top-1 -right-1 bg-red-500 rounded-full w-5 h-5 flex items-center justify-center">
              <Text className="text-xs text-white font-bold">3</Text>
            </View>
          </TouchableOpacity>
          <TouchableOpacity>
            <Filter size={24} color="#1e40af" />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView className="flex-1">
        {/* Summary Statistics */}
        <View className="px-4 py-4">
          <Text className="text-lg font-semibold mb-3 text-gray-700">
            Overview
          </Text>
          <View className="flex-row justify-between">
            <View className="bg-blue-50 rounded-lg p-3 flex-1 mr-2">
              <View className="flex-row items-center">
                <AlertCircle size={18} color="#1e40af" />
                <Text className="ml-1 text-sm text-gray-600">New</Text>
              </View>
              <Text className="text-xl font-bold text-blue-800 mt-1">
                {summaryStats.new}
              </Text>
            </View>
            <View className="bg-amber-50 rounded-lg p-3 flex-1 mx-2">
              <View className="flex-row items-center">
                <Clock size={18} color="#b45309" />
                <Text className="ml-1 text-sm text-gray-600">In Progress</Text>
              </View>
              <Text className="text-xl font-bold text-amber-700 mt-1">
                {summaryStats.inProgress}
              </Text>
            </View>
            <View className="bg-green-50 rounded-lg p-3 flex-1 ml-2">
              <View className="flex-row items-center">
                <CheckCircle size={18} color="#15803d" />
                <Text className="ml-1 text-sm text-gray-600">Resolved</Text>
              </View>
              <Text className="text-xl font-bold text-green-700 mt-1">
                {summaryStats.resolved}
              </Text>
            </View>
          </View>

          <View className="mt-3 bg-red-50 rounded-lg p-3">
            <View className="flex-row justify-between items-center">
              <View className="flex-row items-center">
                <AlertCircle size={18} color="#b91c1c" />
                <Text className="ml-1 text-sm text-gray-600">
                  High Priority
                </Text>
              </View>
              <Text className="text-xl font-bold text-red-700">
                {summaryStats.highPriority}
              </Text>
            </View>
          </View>
        </View>

        {/* Quick Actions */}
        <View className="px-4 py-2 mb-2">
          <Text className="text-lg font-semibold mb-3 text-gray-700">
            Quick Actions
          </Text>
          <TouchableOpacity
            className="bg-blue-600 rounded-lg p-4 flex-row items-center justify-center"
            onPress={handleCreateTicket}
          >
            <Plus size={20} color="white" />
            <Text className="text-white font-semibold ml-2">
              Create New Ticket
            </Text>
          </TouchableOpacity>
        </View>

        {/* Ticket List Section */}
        <View className="px-4 py-2 flex-1">
          <View className="flex-row justify-between items-center mb-3">
            <Text className="text-lg font-semibold text-gray-700">Tickets</Text>
            <TouchableOpacity onPress={handleSeeAllTickets}>
              <Text className="text-blue-600 font-medium">See All</Text>
            </TouchableOpacity>
          </View>

          {/* Filter Tabs */}
          <View className="flex-row mb-3 border-b border-gray-200">
            <TouchableOpacity
              className={`py-2 px-4 ${activeFilter === "new" ? "border-b-2 border-blue-600" : ""}`}
              onPress={() => setActiveFilter("new")}
            >
              <Text
                className={`${activeFilter === "new" ? "text-blue-600 font-medium" : "text-gray-500"}`}
              >
                New
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              className={`py-2 px-4 ${activeFilter === "inProgress" ? "border-b-2 border-blue-600" : ""}`}
              onPress={() => setActiveFilter("inProgress")}
            >
              <Text
                className={`${activeFilter === "inProgress" ? "text-blue-600 font-medium" : "text-gray-500"}`}
              >
                In Progress
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              className={`py-2 px-4 ${activeFilter === "resolved" ? "border-b-2 border-blue-600" : ""}`}
              onPress={() => setActiveFilter("resolved")}
            >
              <Text
                className={`${activeFilter === "resolved" ? "text-blue-600 font-medium" : "text-gray-500"}`}
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
      <View className="flex-row justify-around items-center py-3 bg-white border-t border-gray-200">
        <TouchableOpacity
          className="items-center"
          onPress={() => handleNavigation("/tickets")}
        >
          <View className="bg-blue-100 p-2 rounded-full">
            <AlertCircle size={20} color="#1e40af" />
          </View>
          <Text className="text-xs mt-1 text-blue-800 font-medium">
            Tickets
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          className="items-center"
          onPress={() => handleNavigation("/schedule")}
        >
          <View className="bg-gray-100 p-2 rounded-full">
            <Clock size={20} color="#4b5563" />
          </View>
          <Text className="text-xs mt-1 text-gray-500">Schedule</Text>
        </TouchableOpacity>
        <TouchableOpacity className="items-center" onPress={handleCreateTicket}>
          <View className="bg-gray-100 p-2 rounded-full">
            <Plus size={20} color="#4b5563" />
          </View>
          <Text className="text-xs mt-1 text-gray-500">New</Text>
        </TouchableOpacity>
        <TouchableOpacity
          className="items-center"
          onPress={() => handleNavigation("/inventory")}
        >
          <View className="bg-gray-100 p-2 rounded-full">
            <Wrench size={20} color="#4b5563" />
          </View>
          <Text className="text-xs mt-1 text-gray-500">Inventory</Text>
        </TouchableOpacity>
        <TouchableOpacity
          className="items-center"
          onPress={() => handleNavigation("/reports")}
        >
          <View className="bg-gray-100 p-2 rounded-full">
            <BarChart3 size={20} color="#4b5563" />
          </View>
          <Text className="text-xs mt-1 text-gray-500">Reports</Text>
        </TouchableOpacity>
        <TouchableOpacity
          className="items-center"
          onPress={() => handleNavigation("/profile")}
        >
          <View className="bg-gray-100 p-2 rounded-full">
            <User size={20} color="#4b5563" />
          </View>
          <Text className="text-xs mt-1 text-gray-500">Profile</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}
