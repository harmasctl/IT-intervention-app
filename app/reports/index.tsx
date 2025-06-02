import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
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
  ArrowLeft,
  TrendingUp,
  Package,
  Wrench,
  DollarSign,
  Users,
  Building2,
  AlertTriangle,
  CheckCircle2,
  Clock,
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

  // Real data states
  const [realData, setRealData] = useState({
    devices: {
      total: 0,
      operational: 0,
      maintenance: 0,
      retired: 0,
      byRestaurant: {} as Record<string, number>,
      byCategory: {} as Record<string, number>,
    },
    maintenance: {
      total: 0,
      pending: 0,
      inProgress: 0,
      completed: 0,
      totalCost: 0,
      avgDuration: 0,
    },
    tickets: {
      total: 0,
      open: 0,
      resolved: 0,
      byPriority: { high: 0, medium: 0, low: 0 },
    },
  });

  useEffect(() => {
    fetchReportData();
  }, [reportType, timeRange]);

  const fetchReportData = async () => {
    try {
      setLoading(true);

      // Calculate date range
      const endDate = new Date();
      const startDate = new Date();
      switch (timeRange) {
        case 'week':
          startDate.setDate(endDate.getDate() - 7);
          break;
        case 'month':
          startDate.setDate(endDate.getDate() - 30);
          break;
        case 'quarter':
          startDate.setDate(endDate.getDate() - 90);
          break;
        case 'year':
          startDate.setFullYear(endDate.getFullYear() - 1);
          break;
      }

      // Fetch all data in parallel
      const [devicesRes, maintenanceRes, ticketsRes] = await Promise.all([
        supabase
          .from("devices")
          .select(`
            *,
            restaurant:restaurants(name),
            category:device_categories(name)
          `),
        supabase
          .from("maintenance_records")
          .select("*")
          .gte('created_at', startDate.toISOString()),
        supabase
          .from("tickets")
          .select("*")
          .gte('created_at', startDate.toISOString())
      ]);

      if (devicesRes.error || maintenanceRes.error) {
        throw new Error("Failed to fetch data");
      }

      const devices = devicesRes.data || [];
      const maintenance = maintenanceRes.data || [];
      const tickets = ticketsRes.data || [];

      // Process device data
      const devicesByRestaurant: Record<string, number> = {};
      const devicesByCategory: Record<string, number> = {};

      devices.forEach(device => {
        const restaurant = device.restaurant?.name || 'Unassigned';
        const category = device.category?.name || 'Uncategorized';

        devicesByRestaurant[restaurant] = (devicesByRestaurant[restaurant] || 0) + 1;
        devicesByCategory[category] = (devicesByCategory[category] || 0) + 1;
      });

      // Process maintenance data
      const maintenanceStats = {
        total: maintenance.length,
        pending: maintenance.filter(m => m.status === 'pending').length,
        inProgress: maintenance.filter(m => m.status === 'in_progress').length,
        completed: maintenance.filter(m => m.status === 'completed').length,
        totalCost: maintenance.reduce((sum, m) => sum + (m.cost || 0), 0),
        avgDuration: maintenance.length > 0
          ? maintenance.reduce((sum, m) => sum + (m.maintenance_duration_minutes || 0), 0) / maintenance.length
          : 0,
      };

      // Process ticket data
      const ticketStats = {
        total: tickets.length,
        open: tickets.filter(t => t.status === 'open').length,
        resolved: tickets.filter(t => t.status === 'resolved').length,
        byPriority: {
          high: tickets.filter(t => t.priority === 'high').length,
          medium: tickets.filter(t => t.priority === 'medium').length,
          low: tickets.filter(t => t.priority === 'low').length,
        },
      };

      setRealData({
        devices: {
          total: devices.length,
          operational: devices.filter(d => d.status === 'operational').length,
          maintenance: devices.filter(d => d.status === 'maintenance').length,
          retired: devices.filter(d => d.status === 'retired').length,
          byRestaurant: devicesByRestaurant,
          byCategory: devicesByCategory,
        },
        maintenance: maintenanceStats,
        tickets: ticketStats,
      });

      Alert.alert("📊 Reports Updated", `Data loaded for ${timeRange} period`);
    } catch (error) {
      console.error("Error fetching report data:", error);
      Alert.alert("❌ Error", "Failed to load report data");
    } finally {
      setLoading(false);
    }
  };

  const exportReport = async () => {
    try {
      const reportContent = `
IT INTERVENTION APP - ANALYTICS REPORT
Generated: ${new Date().toLocaleString()}
Period: ${timeRange}

=== DEVICE SUMMARY ===
Total Devices: ${realData.devices.total}
- Operational: ${realData.devices.operational}
- Maintenance: ${realData.devices.maintenance}
- Retired: ${realData.devices.retired}

Devices by Restaurant:
${Object.entries(realData.devices.byRestaurant).map(([name, count]) => `- ${name}: ${count}`).join('\n')}

=== MAINTENANCE SUMMARY ===
Total Maintenance Records: ${realData.maintenance.total}
- Pending: ${realData.maintenance.pending}
- In Progress: ${realData.maintenance.inProgress}
- Completed: ${realData.maintenance.completed}
Total Cost: $${realData.maintenance.totalCost.toFixed(2)}
Average Duration: ${realData.maintenance.avgDuration.toFixed(1)} minutes

=== TICKET SUMMARY ===
Total Tickets: ${realData.tickets.total}
- Open: ${realData.tickets.open}
- Resolved: ${realData.tickets.resolved}
Priority Breakdown:
- High: ${realData.tickets.byPriority.high}
- Medium: ${realData.tickets.byPriority.medium}
- Low: ${realData.tickets.byPriority.low}
      `;

      if (typeof window !== 'undefined') {
        const blob = new Blob([reportContent], { type: 'text/plain' });
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `IT_Report_${timeRange}_${new Date().toISOString().split('T')[0]}.txt`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);

        Alert.alert("📥 Report Exported", "Report has been downloaded");
      } else {
        Alert.alert("📄 Report Generated", reportContent);
      }
    } catch (error) {
      console.error("Error exporting report:", error);
      Alert.alert("❌ Export Error", "Failed to export report");
    }
  };

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
        <Text className="font-bold text-lg mb-3">🎫 Ticket Summary</Text>
        <View className="flex-row justify-between mb-4">
          <View className="items-center">
            <Text className="text-2xl font-bold text-blue-600">
              {realData.tickets.total}
            </Text>
            <Text className="text-gray-500 text-sm">Total</Text>
          </View>
          <View className="items-center">
            <Text className="text-2xl font-bold text-green-600">
              {realData.tickets.resolved}
            </Text>
            <Text className="text-gray-500 text-sm">Resolved</Text>
          </View>
          <View className="items-center">
            <Text className="text-2xl font-bold text-yellow-600">
              {realData.tickets.open}
            </Text>
            <Text className="text-gray-500 text-sm">Open</Text>
          </View>
          <View className="items-center">
            <Text className="text-2xl font-bold text-purple-600">
              {realData.tickets.total > 0 ? Math.round((realData.tickets.resolved / realData.tickets.total) * 100) : 0}%
            </Text>
            <Text className="text-gray-500 text-sm">Resolution Rate</Text>
          </View>
        </View>
      </View>

      <View className="bg-white rounded-lg p-4 mb-4 shadow-sm">
        <Text className="font-bold text-lg mb-3">📊 Tickets by Priority</Text>
        {realData.tickets.total > 0 ? (
          <>
            <View className="flex-row h-40 items-end justify-around mb-2">
              <View
                style={{
                  height: `${Math.max((realData.tickets.byPriority.high / realData.tickets.total) * 100, 5)}%`,
                }}
                className="w-16 bg-red-500 rounded-t-lg"
              />
              <View
                style={{
                  height: `${Math.max((realData.tickets.byPriority.medium / realData.tickets.total) * 100, 5)}%`,
                }}
                className="w-16 bg-yellow-500 rounded-t-lg"
              />
              <View
                style={{
                  height: `${Math.max((realData.tickets.byPriority.low / realData.tickets.total) * 100, 5)}%`,
                }}
                className="w-16 bg-green-500 rounded-t-lg"
              />
            </View>
            <View className="flex-row justify-around">
              <Text className="text-center text-red-600 font-medium">
                High ({realData.tickets.byPriority.high})
              </Text>
              <Text className="text-center text-yellow-600 font-medium">
                Medium ({realData.tickets.byPriority.medium})
              </Text>
              <Text className="text-center text-green-600 font-medium">
                Low ({realData.tickets.byPriority.low})
              </Text>
            </View>
          </>
        ) : (
          <View className="py-8 items-center">
            <Text className="text-gray-500">No tickets found for this period</Text>
            <TouchableOpacity
              className="mt-2 bg-blue-500 px-4 py-2 rounded-lg"
              onPress={() => router.push("/tickets/create")}
            >
              <Text className="text-white font-medium">Create First Ticket</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </View>
  );

  const renderInventoryReport = () => (
    <View>
      <View className="bg-white rounded-lg p-4 mb-4 shadow-sm">
        <Text className="font-bold text-lg mb-3">📱 Device Status Overview</Text>
        <View className="flex-row justify-between mb-4">
          <View className="items-center">
            <Text className="text-2xl font-bold text-blue-600">
              {realData.devices.total}
            </Text>
            <Text className="text-gray-500 text-sm">Total</Text>
          </View>
          <View className="items-center">
            <Text className="text-2xl font-bold text-green-600">
              {realData.devices.operational}
            </Text>
            <Text className="text-gray-500 text-sm">Operational</Text>
          </View>
          <View className="items-center">
            <Text className="text-2xl font-bold text-yellow-600">
              {realData.devices.maintenance}
            </Text>
            <Text className="text-gray-500 text-sm">Maintenance</Text>
          </View>
          <View className="items-center">
            <Text className="text-2xl font-bold text-red-600">
              {realData.devices.retired}
            </Text>
            <Text className="text-gray-500 text-sm">Retired</Text>
          </View>
        </View>
      </View>

      <View className="bg-white rounded-lg p-4 mb-4 shadow-sm">
        <Text className="font-bold text-lg mb-3">🏢 Devices by Restaurant</Text>
        {Object.entries(realData.devices.byRestaurant).length > 0 ? (
          Object.entries(realData.devices.byRestaurant).map(
            ([restaurant, count]) => (
              <View key={restaurant} className="mb-2">
                <Text className="text-gray-700 mb-1">{restaurant}</Text>
                <View className="flex-row items-center">
                  <View
                    className="h-4 bg-blue-500 rounded-full"
                    style={{
                      width: `${((count as number) / realData.devices.total) * 100}%`,
                    }}
                  />
                  <Text className="ml-2">{count}</Text>
                </View>
              </View>
            ),
          )
        ) : (
          <View className="py-8 items-center">
            <Text className="text-gray-500">No devices found for this period</Text>
            <TouchableOpacity
              className="mt-2 bg-blue-500 px-4 py-2 rounded-lg"
              onPress={() => router.push("/devices/create")}
            >
              <Text className="text-white font-medium">Add First Device</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      <View className="bg-white rounded-lg p-4 mb-4 shadow-sm">
        <Text className="font-bold text-lg mb-3">📂 Devices by Category</Text>
        {Object.entries(realData.devices.byCategory).length > 0 ? (
          Object.entries(realData.devices.byCategory).map(
            ([category, count]) => (
              <View key={category} className="mb-2">
                <Text className="text-gray-700 mb-1">{category}</Text>
                <View className="flex-row items-center">
                  <View
                    className="h-4 bg-green-500 rounded-full"
                    style={{
                      width: `${((count as number) / realData.devices.total) * 100}%`,
                    }}
                  />
                  <Text className="ml-2">{count}</Text>
                </View>
              </View>
            ),
          )
        ) : (
          <Text className="text-gray-500 text-center py-4">No categories found</Text>
        )}
      </View>
    </View>
  );

  const renderMaintenanceReport = () => (
    <View>
      <View className="bg-white rounded-lg p-4 mb-4 shadow-sm">
        <Text className="font-bold text-lg mb-3">🔧 Maintenance Summary</Text>
        <View className="flex-row justify-between mb-4">
          <View className="items-center">
            <Text className="text-2xl font-bold text-blue-600">
              {realData.maintenance.total}
            </Text>
            <Text className="text-gray-500 text-sm">Total</Text>
          </View>
          <View className="items-center">
            <Text className="text-2xl font-bold text-green-600">
              {realData.maintenance.completed}
            </Text>
            <Text className="text-gray-500 text-sm">Completed</Text>
          </View>
          <View className="items-center">
            <Text className="text-2xl font-bold text-yellow-600">
              {realData.maintenance.pending}
            </Text>
            <Text className="text-gray-500 text-sm">Pending</Text>
          </View>
          <View className="items-center">
            <Text className="text-2xl font-bold text-orange-600">
              {realData.maintenance.inProgress}
            </Text>
            <Text className="text-gray-500 text-sm">In Progress</Text>
          </View>
        </View>
        <View className="border-t border-gray-200 pt-3">
          <View className="flex-row justify-between items-center mb-2">
            <Text className="text-gray-700">Total Cost:</Text>
            <Text className="font-bold text-green-600">${realData.maintenance.totalCost.toFixed(2)}</Text>
          </View>
          <View className="flex-row justify-between items-center">
            <Text className="text-gray-700">Average Duration:</Text>
            <Text className="font-medium text-blue-600">{realData.maintenance.avgDuration.toFixed(1)} min</Text>
          </View>
        </View>
      </View>

      <View className="bg-white rounded-lg p-4 mb-4 shadow-sm">
        <Text className="font-bold text-lg mb-3">📊 Maintenance Progress</Text>
        <View className="flex-row items-center mb-3">
          <Calendar size={18} color="#4b5563" />
          <Text className="ml-2 text-gray-700">{timeRange.charAt(0).toUpperCase() + timeRange.slice(1)} Period Activity</Text>
        </View>

        {realData.maintenance.total > 0 ? (
          <>
            {/* Progress visualization */}
            <View className="h-20 flex-row items-center mb-4">
              <View className="h-4 bg-gray-200 flex-1 rounded-full overflow-hidden">
                <View
                  className="h-full bg-green-500"
                  style={{
                    width: `${(realData.maintenance.completed / realData.maintenance.total) * 100}%`
                  }}
                />
              </View>
            </View>
            <View className="flex-row justify-between">
              <Text className="text-gray-500">
                {realData.maintenance.completed} completed
              </Text>
              <Text className="text-gray-500">
                {realData.maintenance.pending + realData.maintenance.inProgress} remaining
              </Text>
            </View>
          </>
        ) : (
          <View className="py-8 items-center">
            <Text className="text-gray-500">No maintenance records found for this period</Text>
            <TouchableOpacity
              className="mt-2 bg-orange-500 px-4 py-2 rounded-lg"
              onPress={() => router.push("/devices/maintenance/create")}
            >
              <Text className="text-white font-medium">Schedule Maintenance</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </View>
  );

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      <StatusBar style="auto" />

      {/* Header */}
      <View className="flex-row justify-between items-center px-4 py-3 bg-white border-b border-gray-200">
        <View className="flex-row items-center flex-1">
          <TouchableOpacity onPress={() => router.back()} className="mr-3">
            <ArrowLeft size={24} color="#0F172A" />
          </TouchableOpacity>
          <Text className="text-xl font-bold text-blue-800 flex-1">Analytics & Reports</Text>
        </View>
        <View className="flex-row">
          <TouchableOpacity
            className="p-2 mr-2"
            onPress={exportReport}
          >
            <Download size={20} color="#1e40af" />
          </TouchableOpacity>
          <TouchableOpacity
            className="p-2"
            onPress={() => Alert.alert("📊 Real-Time Data", "Reports are updated with live data from your system")}
          >
            <TrendingUp size={20} color="#1e40af" />
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
