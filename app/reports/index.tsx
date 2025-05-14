import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { useRouter } from "expo-router";
import {
  BarChart3,
  PieChart,
  FileBarChart,
  Calendar,
  Download,
  Share2,
} from "lucide-react-native";
import { supabase } from "../../lib/supabase";

export default function ReportsScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [reportType, setReportType] = useState<
    "tickets" | "inventory" | "maintenance"
  >("tickets");
  const [timeRange, setTimeRange] = useState<
    "week" | "month" | "quarter" | "year"
  >("month");

  // Mock data for reports
  const ticketStats = {
    total: 64,
    resolved: 42,
    pending: 18,
    overdue: 4,
    avgResolutionTime: "4.2 hours",
    byPriority: {
      high: 12,
      medium: 28,
      low: 24,
    },
  };

  const inventoryStats = {
    totalDevices: 128,
    operational: 98,
    maintenance: 22,
    offline: 8,
    byRestaurant: {
      "Bella Italia": 32,
      "Sushi Express": 28,
      "Burger Junction": 36,
      "Pizza Palace": 32,
    },
  };

  const maintenanceStats = {
    scheduled: 18,
    completed: 24,
    upcoming: 12,
    overdue: 2,
    avgCompletionTime: "2.8 hours",
  };

  useEffect(() => {
    // Simulate loading data
    setLoading(true);

    const fetchReportData = async () => {
      try {
        // In a real app, we would fetch data from Supabase based on reportType and timeRange
        // const { data, error } = await supabase.from(`${reportType}_reports`).select('*').eq('time_range', timeRange);
        // if (error) throw error;
        // Process the data...

        // For now, just simulate a delay
        setTimeout(() => {
          setLoading(false);
        }, 1500);
      } catch (error) {
        console.error("Error fetching report data:", error);
        setLoading(false);
      }
    };

    fetchReportData();
  }, [reportType, timeRange]);

  const renderTimeRangeSelector = () => (
    <View className="flex-row bg-white rounded-lg mb-4 p-1 shadow-sm">
      {["week", "month", "quarter", "year"].map((range) => (
        <TouchableOpacity
          key={range}
          className={`flex-1 py-2 px-3 rounded-md ${timeRange === range ? "bg-blue-100" : ""}`}
          onPress={() => setTimeRange(range as any)}
        >
          <Text
            className={`text-center text-sm ${timeRange === range ? "text-blue-600 font-medium" : "text-gray-600"}`}
          >
            {range.charAt(0).toUpperCase() + range.slice(1)}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );

  const renderTicketsReport = () => (
    <View>
      <View className="bg-white rounded-lg p-4 mb-4 shadow-sm">
        <Text className="font-bold text-lg mb-3">Ticket Summary</Text>
        <View className="flex-row justify-between mb-4">
          <View className="items-center">
            <Text className="text-2xl font-bold text-blue-600">
              {ticketStats.total}
            </Text>
            <Text className="text-gray-500 text-sm">Total</Text>
          </View>
          <View className="items-center">
            <Text className="text-2xl font-bold text-green-600">
              {ticketStats.resolved}
            </Text>
            <Text className="text-gray-500 text-sm">Resolved</Text>
          </View>
          <View className="items-center">
            <Text className="text-2xl font-bold text-yellow-600">
              {ticketStats.pending}
            </Text>
            <Text className="text-gray-500 text-sm">Pending</Text>
          </View>
          <View className="items-center">
            <Text className="text-2xl font-bold text-red-600">
              {ticketStats.overdue}
            </Text>
            <Text className="text-gray-500 text-sm">Overdue</Text>
          </View>
        </View>
        <View className="border-t border-gray-200 pt-3">
          <Text className="text-gray-700">
            Average Resolution Time:{" "}
            <Text className="font-medium">{ticketStats.avgResolutionTime}</Text>
          </Text>
        </View>
      </View>

      <View className="bg-white rounded-lg p-4 mb-4 shadow-sm">
        <Text className="font-bold text-lg mb-3">Tickets by Priority</Text>
        <View className="flex-row h-40 items-end justify-around mb-2">
          <View
            style={{
              height: `${(ticketStats.byPriority.high / ticketStats.total) * 100}%`,
            }}
            className="w-16 bg-red-500 rounded-t-lg"
          />
          <View
            style={{
              height: `${(ticketStats.byPriority.medium / ticketStats.total) * 100}%`,
            }}
            className="w-16 bg-yellow-500 rounded-t-lg"
          />
          <View
            style={{
              height: `${(ticketStats.byPriority.low / ticketStats.total) * 100}%`,
            }}
            className="w-16 bg-green-500 rounded-t-lg"
          />
        </View>
        <View className="flex-row justify-around">
          <Text className="text-center text-red-600 font-medium">
            High ({ticketStats.byPriority.high})
          </Text>
          <Text className="text-center text-yellow-600 font-medium">
            Medium ({ticketStats.byPriority.medium})
          </Text>
          <Text className="text-center text-green-600 font-medium">
            Low ({ticketStats.byPriority.low})
          </Text>
        </View>
      </View>
    </View>
  );

  const renderInventoryReport = () => (
    <View>
      <View className="bg-white rounded-lg p-4 mb-4 shadow-sm">
        <Text className="font-bold text-lg mb-3">Device Status Overview</Text>
        <View className="flex-row justify-between mb-4">
          <View className="items-center">
            <Text className="text-2xl font-bold text-blue-600">
              {inventoryStats.totalDevices}
            </Text>
            <Text className="text-gray-500 text-sm">Total</Text>
          </View>
          <View className="items-center">
            <Text className="text-2xl font-bold text-green-600">
              {inventoryStats.operational}
            </Text>
            <Text className="text-gray-500 text-sm">Operational</Text>
          </View>
          <View className="items-center">
            <Text className="text-2xl font-bold text-yellow-600">
              {inventoryStats.maintenance}
            </Text>
            <Text className="text-gray-500 text-sm">Maintenance</Text>
          </View>
          <View className="items-center">
            <Text className="text-2xl font-bold text-red-600">
              {inventoryStats.offline}
            </Text>
            <Text className="text-gray-500 text-sm">Offline</Text>
          </View>
        </View>
      </View>

      <View className="bg-white rounded-lg p-4 mb-4 shadow-sm">
        <Text className="font-bold text-lg mb-3">Devices by Restaurant</Text>
        {Object.entries(inventoryStats.byRestaurant).map(
          ([restaurant, count]) => (
            <View key={restaurant} className="mb-2">
              <Text className="text-gray-700 mb-1">{restaurant}</Text>
              <View className="flex-row items-center">
                <View
                  className="h-4 bg-blue-500 rounded-full"
                  style={{
                    width: `${((count as number) / inventoryStats.totalDevices) * 100}%`,
                  }}
                />
                <Text className="ml-2">{count}</Text>
              </View>
            </View>
          ),
        )}
      </View>
    </View>
  );

  const renderMaintenanceReport = () => (
    <View>
      <View className="bg-white rounded-lg p-4 mb-4 shadow-sm">
        <Text className="font-bold text-lg mb-3">Maintenance Summary</Text>
        <View className="flex-row justify-between mb-4">
          <View className="items-center">
            <Text className="text-2xl font-bold text-blue-600">
              {maintenanceStats.scheduled}
            </Text>
            <Text className="text-gray-500 text-sm">Scheduled</Text>
          </View>
          <View className="items-center">
            <Text className="text-2xl font-bold text-green-600">
              {maintenanceStats.completed}
            </Text>
            <Text className="text-gray-500 text-sm">Completed</Text>
          </View>
          <View className="items-center">
            <Text className="text-2xl font-bold text-yellow-600">
              {maintenanceStats.upcoming}
            </Text>
            <Text className="text-gray-500 text-sm">Upcoming</Text>
          </View>
          <View className="items-center">
            <Text className="text-2xl font-bold text-red-600">
              {maintenanceStats.overdue}
            </Text>
            <Text className="text-gray-500 text-sm">Overdue</Text>
          </View>
        </View>
        <View className="border-t border-gray-200 pt-3">
          <Text className="text-gray-700">
            Average Completion Time:{" "}
            <Text className="font-medium">
              {maintenanceStats.avgCompletionTime}
            </Text>
          </Text>
        </View>
      </View>

      <View className="bg-white rounded-lg p-4 mb-4 shadow-sm">
        <Text className="font-bold text-lg mb-3">Maintenance Timeline</Text>
        <View className="flex-row items-center mb-3">
          <Calendar size={18} color="#4b5563" />
          <Text className="ml-2 text-gray-700">Last 30 Days Activity</Text>
        </View>

        {/* Simple timeline visualization */}
        <View className="h-20 flex-row items-center">
          <View className="h-2 bg-gray-200 flex-1 rounded-full overflow-hidden">
            <View className="h-full bg-green-500" style={{ width: "60%" }} />
          </View>
        </View>
        <View className="flex-row justify-between">
          <Text className="text-gray-500">30 days ago</Text>
          <Text className="text-gray-500">Today</Text>
        </View>
      </View>
    </View>
  );

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      <StatusBar style="auto" />

      {/* Header */}
      <View className="flex-row justify-between items-center px-4 py-3 bg-white border-b border-gray-200">
        <Text className="text-2xl font-bold text-blue-800">Reports</Text>
        <View className="flex-row">
          <TouchableOpacity className="p-2 mr-2">
            <Download size={20} color="#1e40af" />
          </TouchableOpacity>
          <TouchableOpacity className="p-2">
            <Share2 size={20} color="#1e40af" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Report Type Selector */}
      <View className="bg-white px-4 py-3">
        <View className="flex-row bg-gray-100 rounded-lg p-1">
          <TouchableOpacity
            className={`flex-1 py-2 rounded-md flex-row justify-center items-center ${reportType === "tickets" ? "bg-white shadow" : ""}`}
            onPress={() => setReportType("tickets")}
          >
            <FileBarChart
              size={16}
              color={reportType === "tickets" ? "#2563eb" : "#6b7280"}
            />
            <Text
              className={`ml-1 ${reportType === "tickets" ? "text-blue-600 font-medium" : "text-gray-600"}`}
            >
              Tickets
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            className={`flex-1 py-2 rounded-md flex-row justify-center items-center ${reportType === "inventory" ? "bg-white shadow" : ""}`}
            onPress={() => setReportType("inventory")}
          >
            <PieChart
              size={16}
              color={reportType === "inventory" ? "#2563eb" : "#6b7280"}
            />
            <Text
              className={`ml-1 ${reportType === "inventory" ? "text-blue-600 font-medium" : "text-gray-600"}`}
            >
              Inventory
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            className={`flex-1 py-2 rounded-md flex-row justify-center items-center ${reportType === "maintenance" ? "bg-white shadow" : ""}`}
            onPress={() => setReportType("maintenance")}
          >
            <BarChart3
              size={16}
              color={reportType === "maintenance" ? "#2563eb" : "#6b7280"}
            />
            <Text
              className={`ml-1 ${reportType === "maintenance" ? "text-blue-600 font-medium" : "text-gray-600"}`}
            >
              Maintenance
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Time Range Selector */}
      <View className="px-4 py-3 bg-white border-t border-gray-100">
        {renderTimeRangeSelector()}
      </View>

      {/* Report Content */}
      <ScrollView className="flex-1 p-4">
        {loading ? (
          <View className="flex-1 justify-center items-center py-10">
            <ActivityIndicator size="large" color="#1e40af" />
            <Text className="mt-2 text-gray-600">Loading report data...</Text>
          </View>
        ) : (
          <>
            {reportType === "tickets" && renderTicketsReport()}
            {reportType === "inventory" && renderInventoryReport()}
            {reportType === "maintenance" && renderMaintenanceReport()}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
