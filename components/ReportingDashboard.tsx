import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Share,
} from "react-native";
import { supabase } from "../lib/supabase";
import {
  BarChart3,
  Clock,
  Download,
  Calendar,
  Ticket,
  Package,
  Wrench,
  Users,
  ArrowDown,
  ArrowUp,
  CheckCircle,
  AlertCircle,
  Tool,
} from "lucide-react-native";

type ReportingDashboardProps = {
  period?: "day" | "week" | "month" | "year";
};

export default function ReportingDashboard({
  period = "month",
}: ReportingDashboardProps) {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<any>({
    ticketStats: {
      total: 0,
      new: 0,
      inProgress: 0,
      resolved: 0,
      avgResolutionTime: 0,
      slaCompliance: 0,
    },
    equipmentStats: {
      totalItems: 0,
      lowStock: 0,
      outOfStock: 0,
      mostUsed: [],
    },
    deviceStats: {
      total: 0,
      operational: 0,
      maintenance: 0,
      offline: 0,
      mostProblematic: [],
    },
    technicianStats: {
      total: 0,
      mostActive: [],
      avgTicketsPerDay: 0,
    },
  });
  const [selectedPeriod, setSelectedPeriod] = useState<
    "day" | "week" | "month" | "year"
  >(period);
  const [exportLoading, setExportLoading] = useState(false);

  useEffect(() => {
    fetchReportData();
  }, [selectedPeriod]);

  const fetchReportData = async () => {
    try {
      setLoading(true);

      // Get date range based on selected period
      const now = new Date();
      let startDate = new Date();

      switch (selectedPeriod) {
        case "day":
          startDate.setHours(0, 0, 0, 0);
          break;
        case "week":
          startDate.setDate(now.getDate() - 7);
          break;
        case "month":
          startDate.setMonth(now.getMonth() - 1);
          break;
        case "year":
          startDate.setFullYear(now.getFullYear() - 1);
          break;
      }

      const startDateStr = startDate.toISOString();

      // Fetch ticket statistics
      const { data: ticketData, error: ticketError } = await supabase
        .from("tickets")
        .select("id, status, priority, created_at, resolved_at")
        .gte("created_at", startDateStr);

      if (ticketError) throw ticketError;

      // Fetch equipment statistics
      const { data: equipmentData, error: equipmentError } = await supabase
        .from("equipment")
        .select("id, name, stock_level, min_stock_level");

      if (equipmentError) throw equipmentError;

      // Fetch device statistics
      const { data: deviceData, error: deviceError } = await supabase
        .from("devices")
        .select("id, name, status");

      if (deviceError) throw deviceError;

      // Fetch technician statistics
      const { data: technicianData, error: technicianError } = await supabase
        .from("profiles")
        .select("id, full_name, role")
        .eq("role", "technician");

      if (technicianError) throw technicianError;

      // Process ticket data
      const newTickets =
        ticketData?.filter((t) => t.status === "new").length || 0;
      const inProgressTickets =
        ticketData?.filter(
          (t) => t.status === "in-progress" || t.status === "assigned",
        ).length || 0;
      const resolvedTickets =
        ticketData?.filter(
          (t) => t.status === "resolved" || t.status === "closed",
        ).length || 0;

      // Calculate average resolution time
      let totalResolutionTime = 0;
      let resolvedCount = 0;

      ticketData?.forEach((ticket) => {
        if (ticket.resolved_at && ticket.created_at) {
          const created = new Date(ticket.created_at).getTime();
          const resolved = new Date(ticket.resolved_at).getTime();
          const resolutionTime = (resolved - created) / (1000 * 60 * 60); // hours
          totalResolutionTime += resolutionTime;
          resolvedCount++;
        }
      });

      const avgResolutionTime =
        resolvedCount > 0 ? Math.round(totalResolutionTime / resolvedCount) : 0;

      // Calculate SLA compliance (assuming 24 hour SLA for simplicity)
      const slaTarget = 24; // hours
      let slaCompliantCount = 0;

      ticketData?.forEach((ticket) => {
        if (ticket.resolved_at && ticket.created_at) {
          const created = new Date(ticket.created_at).getTime();
          const resolved = new Date(ticket.resolved_at).getTime();
          const resolutionTime = (resolved - created) / (1000 * 60 * 60); // hours
          if (resolutionTime <= slaTarget) {
            slaCompliantCount++;
          }
        }
      });

      const slaCompliance =
        resolvedCount > 0
          ? Math.round((slaCompliantCount / resolvedCount) * 100)
          : 0;

      // Process equipment data
      const lowStockItems =
        equipmentData?.filter((item) => {
          const minLevel = item.min_stock_level || 5;
          return item.stock_level > 0 && item.stock_level <= minLevel;
        }).length || 0;

      const outOfStockItems =
        equipmentData?.filter((item) => item.stock_level === 0).length || 0;

      // Process device data
      const operationalDevices =
        deviceData?.filter((d) => d.status === "operational").length || 0;
      const maintenanceDevices =
        deviceData?.filter((d) => d.status === "maintenance").length || 0;
      const offlineDevices =
        deviceData?.filter((d) => d.status === "offline").length || 0;

      // Compile statistics
      setStats({
        ticketStats: {
          total: ticketData?.length || 0,
          new: newTickets,
          inProgress: inProgressTickets,
          resolved: resolvedTickets,
          avgResolutionTime,
          slaCompliance,
        },
        equipmentStats: {
          totalItems: equipmentData?.length || 0,
          lowStock: lowStockItems,
          outOfStock: outOfStockItems,
          mostUsed: [], // Would require movement data analysis
        },
        deviceStats: {
          total: deviceData?.length || 0,
          operational: operationalDevices,
          maintenance: maintenanceDevices,
          offline: offlineDevices,
          mostProblematic: [], // Would require ticket analysis by device
        },
        technicianStats: {
          total: technicianData?.length || 0,
          mostActive: [], // Would require ticket assignment analysis
          avgTicketsPerDay: 0, // Would require more detailed analysis
        },
      });
    } catch (error) {
      console.error("Error fetching report data:", error);
      Alert.alert("Error", "Failed to load reporting data");
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async () => {
    try {
      setExportLoading(true);

      // Format data for export
      const reportDate = new Date().toLocaleDateString();
      const reportPeriod =
        selectedPeriod.charAt(0).toUpperCase() + selectedPeriod.slice(1);

      const reportData = {
        title: `Technical Support Report - ${reportPeriod}ly Summary`,
        date: reportDate,
        period: selectedPeriod,
        ticketStats: stats.ticketStats,
        equipmentStats: stats.equipmentStats,
        deviceStats: stats.deviceStats,
        technicianStats: stats.technicianStats,
      };

      // In a real app, this would generate a PDF or CSV
      // For this demo, we'll just share the JSON as text
      const reportText = JSON.stringify(reportData, null, 2);

      await Share.share({
        message: reportText,
        title: `Technical Support Report - ${reportDate}`,
      });
    } catch (error) {
      console.error("Error exporting report:", error);
      Alert.alert("Error", "Failed to export report");
    } finally {
      setExportLoading(false);
    }
  };

  const renderStatCard = (
    title: string,
    value: number | string,
    icon: React.ReactNode,
    color: string,
    subtext?: string,
  ) => (
    <View className={`bg-white rounded-xl p-4 shadow-sm border-l-4 ${color}`}>
      <View className="flex-row justify-between items-start">
        <View>
          <Text className="text-gray-500 font-medium">{title}</Text>
          <Text className="text-2xl font-bold text-gray-800 mt-1">{value}</Text>
          {subtext && (
            <Text className="text-xs text-gray-500 mt-1">{subtext}</Text>
          )}
        </View>
        <View
          className={`p-2 rounded-full ${color.replace("border-", "bg-").replace("-600", "-100")}`}
        >
          {icon}
        </View>
      </View>
    </View>
  );

  const renderTrend = (value: number, previousValue: number) => {
    if (previousValue === 0) return null;
    const percentChange = ((value - previousValue) / previousValue) * 100;
    const isPositive = percentChange > 0;

    return (
      <View className="flex-row items-center">
        {isPositive ? (
          <ArrowUp size={12} color="#16a34a" />
        ) : (
          <ArrowDown size={12} color="#dc2626" />
        )}
        <Text
          className={
            isPositive
              ? "text-green-600 text-xs ml-1"
              : "text-red-600 text-xs ml-1"
          }
        >
          {Math.abs(Math.round(percentChange))}%
        </Text>
      </View>
    );
  };

  return (
    <View className="flex-1 bg-gray-50">
      <View className="bg-white p-4 shadow-sm">
        <View className="flex-row justify-between items-center">
          <Text className="text-xl font-bold text-gray-800">
            Performance Dashboard
          </Text>
          <TouchableOpacity
            className="bg-blue-600 px-3 py-1.5 rounded-lg flex-row items-center"
            onPress={handleExport}
            disabled={exportLoading}
          >
            <Download size={16} color="white" />
            <Text className="text-white font-medium ml-1">
              {exportLoading ? "Exporting..." : "Export"}
            </Text>
          </TouchableOpacity>
        </View>

        <View className="flex-row mt-4 bg-gray-100 p-1 rounded-lg">
          {["day", "week", "month", "year"].map((p) => (
            <TouchableOpacity
              key={p}
              className={`flex-1 py-2 rounded-md ${selectedPeriod === p ? "bg-white shadow-sm" : ""}`}
              onPress={() =>
                setSelectedPeriod(p as "day" | "week" | "month" | "year")
              }
            >
              <Text
                className={`text-center font-medium ${selectedPeriod === p ? "text-blue-600" : "text-gray-500"}`}
              >
                {p.charAt(0).toUpperCase() + p.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {loading ? (
        <View className="flex-1 justify-center items-center">
          <ActivityIndicator size="large" color="#1e40af" />
          <Text className="mt-3 text-gray-500">Loading dashboard data...</Text>
        </View>
      ) : (
        <ScrollView className="flex-1 p-4">
          <Text className="text-lg font-bold text-gray-800 mb-3">
            Ticket Performance
          </Text>
          <View className="grid grid-cols-2 gap-4 mb-6">
            {renderStatCard(
              "Total Tickets",
              stats.ticketStats.total,
              <Ticket size={20} color="#1e40af" />,
              "border-blue-600",
            )}
            {renderStatCard(
              "Resolved",
              stats.ticketStats.resolved,
              <CheckCircle size={20} color="#16a34a" />,
              "border-green-600",
              `${stats.ticketStats.slaCompliance}% SLA compliant`,
            )}
            {renderStatCard(
              "In Progress",
              stats.ticketStats.inProgress,
              <Clock size={20} color="#b45309" />,
              "border-amber-600",
            )}
            {renderStatCard(
              "Avg Resolution",
              `${stats.ticketStats.avgResolutionTime} hrs`,
              <Calendar size={20} color="#7e22ce" />,
              "border-purple-600",
            )}
          </View>

          <Text className="text-lg font-bold text-gray-800 mb-3">
            Equipment Status
          </Text>
          <View className="grid grid-cols-2 gap-4 mb-6">
            {renderStatCard(
              "Total Items",
              stats.equipmentStats.totalItems,
              <Package size={20} color="#1e40af" />,
              "border-blue-600",
            )}
            {renderStatCard(
              "Low Stock",
              stats.equipmentStats.lowStock,
              <AlertCircle size={20} color="#f59e0b" />,
              "border-amber-600",
            )}
            {renderStatCard(
              "Out of Stock",
              stats.equipmentStats.outOfStock,
              <AlertCircle size={20} color="#dc2626" />,
              "border-red-600",
            )}
          </View>

          <Text className="text-lg font-bold text-gray-800 mb-3">
            Device Status
          </Text>
          <View className="grid grid-cols-2 gap-4 mb-6">
            {renderStatCard(
              "Total Devices",
              stats.deviceStats.total,
              <Wrench size={20} color="#1e40af" />,
              "border-blue-600",
            )}
            {renderStatCard(
              "Operational",
              stats.deviceStats.operational,
              <CheckCircle size={20} color="#16a34a" />,
              "border-green-600",
              stats.deviceStats.total > 0
                ? `${Math.round((stats.deviceStats.operational / stats.deviceStats.total) * 100)}% of fleet`
                : "0% of fleet",
            )}
            {renderStatCard(
              "In Maintenance",
              stats.deviceStats.maintenance,
              <Tool size={20} color="#b45309" />,
              "border-amber-600",
            )}
            {renderStatCard(
              "Offline",
              stats.deviceStats.offline,
              <AlertCircle size={20} color="#dc2626" />,
              "border-red-600",
            )}
          </View>

          <Text className="text-lg font-bold text-gray-800 mb-3">
            Team Performance
          </Text>
          <View className="grid grid-cols-2 gap-4 mb-6">
            {renderStatCard(
              "Technicians",
              stats.technicianStats.total,
              <Users size={20} color="#1e40af" />,
              "border-blue-600",
            )}
          </View>
        </ScrollView>
      )}
    </View>
  );
}
