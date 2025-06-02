import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  RefreshControl,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { useRouter } from "expo-router";
import {
  ArrowLeft,
  Activity,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Database,
  Download,
  Eye,
  Globe,
  HardDrive,
  Monitor,
  RefreshCw,
  Server,
  TrendingUp,
  Users,
  Wifi,
  Zap,
} from "lucide-react-native";
import { supabase } from "../../lib/supabase";
import { performanceMonitor, getSystemHealth, generatePerformanceReport } from "../../lib/performance";

type SystemStats = {
  totalDevices: number;
  activeDevices: number;
  maintenanceRecords: number;
  totalUsers: number;
  ticketsOpen: number;
  ticketsResolved: number;
  storageUsed: number;
  databaseSize: number;
};

type RealtimeMetrics = {
  activeConnections: number;
  requestsPerMinute: number;
  errorRate: number;
  averageResponseTime: number;
  memoryUsage: number;
  cpuUsage: number;
};

export default function AdminDashboard() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [systemStats, setSystemStats] = useState<SystemStats | null>(null);
  const [realtimeMetrics, setRealtimeMetrics] = useState<RealtimeMetrics | null>(null);
  const [systemHealth, setSystemHealth] = useState<any>(null);
  const [performanceData, setPerformanceData] = useState<any>(null);

  useEffect(() => {
    fetchDashboardData();
    startRealtimeMonitoring();
    
    // Refresh data every 30 seconds
    const interval = setInterval(fetchDashboardData, 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchDashboardData = async () => {
    try {
      if (!refreshing) setLoading(true);

      // Fetch system statistics
      const [
        devicesRes,
        maintenanceRes,
        usersRes,
        ticketsRes
      ] = await Promise.all([
        supabase.from("devices").select("id, status"),
        supabase.from("maintenance_records").select("id"),
        supabase.from("users").select("id"),
        supabase.from("tickets").select("id, status")
      ]);

      const devices = devicesRes.data || [];
      const maintenance = maintenanceRes.data || [];
      const users = usersRes.data || [];
      const tickets = ticketsRes.data || [];

      const stats: SystemStats = {
        totalDevices: devices.length,
        activeDevices: devices.filter(d => d.status === 'operational').length,
        maintenanceRecords: maintenance.length,
        totalUsers: users.length,
        ticketsOpen: tickets.filter(t => t.status === 'open').length,
        ticketsResolved: tickets.filter(t => t.status === 'resolved').length,
        storageUsed: Math.random() * 1000, // Mock data
        databaseSize: Math.random() * 500, // Mock data
      };

      setSystemStats(stats);

      // Get performance data
      const health = getSystemHealth();
      setSystemHealth(health);

      const perfData = {
        metrics: performanceMonitor.getMetrics().slice(-20),
        errors: performanceMonitor.getErrors().slice(-10),
        slowOperations: performanceMonitor.getSlowOperations(),
        averageResponseTime: performanceMonitor.getAverageResponseTime(),
      };
      setPerformanceData(perfData);

      Alert.alert("📊 Dashboard Updated", "System data has been refreshed");
    } catch (error) {
      console.error("Error fetching dashboard data:", error);
      Alert.alert("❌ Error", "Failed to load dashboard data");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const startRealtimeMonitoring = () => {
    // Simulate real-time metrics
    const updateMetrics = () => {
      const metrics: RealtimeMetrics = {
        activeConnections: Math.floor(Math.random() * 50) + 10,
        requestsPerMinute: Math.floor(Math.random() * 200) + 50,
        errorRate: Math.random() * 0.05, // 0-5%
        averageResponseTime: Math.random() * 500 + 100,
        memoryUsage: Math.random() * 80 + 20, // 20-100%
        cpuUsage: Math.random() * 60 + 10, // 10-70%
      };
      setRealtimeMetrics(metrics);
    };

    updateMetrics();
    const interval = setInterval(updateMetrics, 5000); // Update every 5 seconds
    return () => clearInterval(interval);
  };

  const exportSystemReport = async () => {
    try {
      const report = generatePerformanceReport();
      const fullReport = `
${report}

=== SYSTEM STATISTICS ===
Total Devices: ${systemStats?.totalDevices || 0}
Active Devices: ${systemStats?.activeDevices || 0}
Maintenance Records: ${systemStats?.maintenanceRecords || 0}
Total Users: ${systemStats?.totalUsers || 0}
Open Tickets: ${systemStats?.ticketsOpen || 0}
Resolved Tickets: ${systemStats?.ticketsResolved || 0}

=== REALTIME METRICS ===
Active Connections: ${realtimeMetrics?.activeConnections || 0}
Requests/Minute: ${realtimeMetrics?.requestsPerMinute || 0}
Error Rate: ${((realtimeMetrics?.errorRate || 0) * 100).toFixed(2)}%
Avg Response Time: ${realtimeMetrics?.averageResponseTime?.toFixed(2) || 0}ms
Memory Usage: ${realtimeMetrics?.memoryUsage?.toFixed(1) || 0}%
CPU Usage: ${realtimeMetrics?.cpuUsage?.toFixed(1) || 0}%
      `;

      if (typeof window !== 'undefined') {
        const blob = new Blob([fullReport], { type: 'text/plain' });
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `System_Report_${new Date().toISOString().split('T')[0]}.txt`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
        
        Alert.alert("📥 Report Exported", "System report has been downloaded");
      } else {
        Alert.alert("📄 System Report", fullReport);
      }
    } catch (error) {
      console.error("Error exporting report:", error);
      Alert.alert("❌ Export Error", "Failed to export system report");
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchDashboardData();
  };

  const MetricCard = ({ 
    title, 
    value, 
    icon, 
    color = "#3B82F6", 
    subtitle,
    trend 
  }: {
    title: string;
    value: string | number;
    icon: React.ReactNode;
    color?: string;
    subtitle?: string;
    trend?: 'up' | 'down' | 'stable';
  }) => (
    <View className="bg-white rounded-lg shadow-sm p-4 flex-1 mx-1 mb-3">
      <View className="flex-row items-center justify-between mb-2">
        <View style={{ backgroundColor: color + '20' }} className="p-2 rounded-lg">
          {icon}
        </View>
        {trend && (
          <View className={`px-2 py-1 rounded-full ${
            trend === 'up' ? 'bg-green-100' : trend === 'down' ? 'bg-red-100' : 'bg-gray-100'
          }`}>
            <Text className={`text-xs font-bold ${
              trend === 'up' ? 'text-green-600' : trend === 'down' ? 'text-red-600' : 'text-gray-600'
            }`}>
              {trend === 'up' ? '↗' : trend === 'down' ? '↘' : '→'}
            </Text>
          </View>
        )}
      </View>
      <Text className="text-2xl font-bold text-gray-800 mb-1">{value}</Text>
      <Text className="text-sm font-medium text-gray-700">{title}</Text>
      {subtitle && <Text className="text-xs text-gray-500 mt-1">{subtitle}</Text>}
    </View>
  );

  const StatusIndicator = ({ status, label }: { status: 'good' | 'warning' | 'error'; label: string }) => (
    <View className="flex-row items-center mb-2">
      <View className={`w-3 h-3 rounded-full mr-2 ${
        status === 'good' ? 'bg-green-500' : 
        status === 'warning' ? 'bg-yellow-500' : 'bg-red-500'
      }`} />
      <Text className="text-gray-700">{label}</Text>
    </View>
  );

  if (loading && !systemStats) {
    return (
      <SafeAreaView className="flex-1 bg-gray-50">
        <StatusBar style="dark" />
        <View className="flex-1 justify-center items-center">
          <ActivityIndicator size="large" color="#1D4ED8" />
          <Text className="mt-4 text-gray-600">Loading admin dashboard...</Text>
        </View>
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
          <Text className="text-lg md:text-xl font-bold text-gray-800 flex-1" numberOfLines={1}>
            Admin Dashboard
          </Text>
          <View className="bg-green-500 rounded-full px-2 py-1 mr-3">
            <Text className="text-white text-xs font-bold">LIVE</Text>
          </View>
        </View>
        <View className="flex-row">
          <TouchableOpacity
            className="bg-gray-100 p-2 rounded-lg mr-2"
            onPress={onRefresh}
          >
            <RefreshCw size={20} color="#4B5563" />
          </TouchableOpacity>
          <TouchableOpacity
            className="bg-blue-500 px-3 py-2 rounded-lg flex-row items-center"
            onPress={exportSystemReport}
          >
            <Download size={18} color="#FFFFFF" />
            <Text className="text-white font-medium ml-2 hidden md:block">Export</Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView 
        className="flex-1" 
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* System Overview */}
        <View className="p-4">
          <Text className="text-lg font-semibold text-gray-800 mb-4">📊 System Overview</Text>
          <View className="flex-row flex-wrap">
            <MetricCard
              title="Total Devices"
              value={systemStats?.totalDevices || 0}
              icon={<Monitor size={20} color="#3B82F6" />}
              color="#3B82F6"
              trend="up"
            />
            <MetricCard
              title="Active Devices"
              value={systemStats?.activeDevices || 0}
              icon={<CheckCircle2 size={20} color="#10B981" />}
              color="#10B981"
              trend="stable"
            />
          </View>
          <View className="flex-row flex-wrap">
            <MetricCard
              title="Total Users"
              value={systemStats?.totalUsers || 0}
              icon={<Users size={20} color="#8B5CF6" />}
              color="#8B5CF6"
              trend="up"
            />
            <MetricCard
              title="Open Tickets"
              value={systemStats?.ticketsOpen || 0}
              icon={<AlertTriangle size={20} color="#F59E0B" />}
              color="#F59E0B"
              trend="down"
            />
          </View>
        </View>

        {/* Real-time Metrics */}
        <View className="p-4">
          <Text className="text-lg font-semibold text-gray-800 mb-4">⚡ Real-time Metrics</Text>
          <View className="flex-row flex-wrap">
            <MetricCard
              title="Active Connections"
              value={realtimeMetrics?.activeConnections || 0}
              icon={<Wifi size={20} color="#06B6D4" />}
              color="#06B6D4"
              subtitle="Current sessions"
            />
            <MetricCard
              title="Requests/Min"
              value={realtimeMetrics?.requestsPerMinute || 0}
              icon={<TrendingUp size={20} color="#10B981" />}
              color="#10B981"
              subtitle="API calls"
            />
          </View>
          <View className="flex-row flex-wrap">
            <MetricCard
              title="Response Time"
              value={`${realtimeMetrics?.averageResponseTime?.toFixed(0) || 0}ms`}
              icon={<Clock size={20} color="#F59E0B" />}
              color="#F59E0B"
              subtitle="Average"
            />
            <MetricCard
              title="Error Rate"
              value={`${((realtimeMetrics?.errorRate || 0) * 100).toFixed(1)}%`}
              icon={<AlertTriangle size={20} color="#EF4444" />}
              color="#EF4444"
              subtitle="Last hour"
            />
          </View>
        </View>

        {/* System Health */}
        <View className="bg-white rounded-lg shadow-sm p-4 mx-4 mb-4">
          <Text className="text-lg font-semibold text-gray-800 mb-4">🏥 System Health</Text>
          <StatusIndicator 
            status={realtimeMetrics?.errorRate && realtimeMetrics.errorRate < 0.01 ? 'good' : 'warning'} 
            label={`Error Rate: ${((realtimeMetrics?.errorRate || 0) * 100).toFixed(2)}%`} 
          />
          <StatusIndicator 
            status={realtimeMetrics?.averageResponseTime && realtimeMetrics.averageResponseTime < 500 ? 'good' : 'warning'} 
            label={`Response Time: ${realtimeMetrics?.averageResponseTime?.toFixed(0) || 0}ms`} 
          />
          <StatusIndicator 
            status={realtimeMetrics?.memoryUsage && realtimeMetrics.memoryUsage < 80 ? 'good' : 'warning'} 
            label={`Memory Usage: ${realtimeMetrics?.memoryUsage?.toFixed(1) || 0}%`} 
          />
          <StatusIndicator 
            status={realtimeMetrics?.cpuUsage && realtimeMetrics.cpuUsage < 70 ? 'good' : 'warning'} 
            label={`CPU Usage: ${realtimeMetrics?.cpuUsage?.toFixed(1) || 0}%`} 
          />
        </View>

        {/* Performance Insights */}
        <View className="bg-white rounded-lg shadow-sm p-4 mx-4 mb-4">
          <Text className="text-lg font-semibold text-gray-800 mb-4">🔍 Performance Insights</Text>
          <View className="space-y-3">
            <View className="flex-row justify-between items-center">
              <Text className="text-gray-700">Total Operations Tracked</Text>
              <Text className="font-semibold text-gray-800">{performanceData?.metrics?.length || 0}</Text>
            </View>
            <View className="flex-row justify-between items-center">
              <Text className="text-gray-700">Slow Operations (>1s)</Text>
              <Text className="font-semibold text-gray-800">{performanceData?.slowOperations?.length || 0}</Text>
            </View>
            <View className="flex-row justify-between items-center">
              <Text className="text-gray-700">Recent Errors</Text>
              <Text className="font-semibold text-gray-800">{performanceData?.errors?.length || 0}</Text>
            </View>
            <View className="flex-row justify-between items-center">
              <Text className="text-gray-700">Avg Response Time</Text>
              <Text className="font-semibold text-gray-800">
                {performanceData?.averageResponseTime?.toFixed(2) || 0}ms
              </Text>
            </View>
          </View>
        </View>

        {/* Quick Actions */}
        <View className="p-4">
          <Text className="text-lg font-semibold text-gray-800 mb-4">⚡ Quick Actions</Text>
          <View className="flex-row flex-wrap space-x-2">
            <TouchableOpacity
              className="flex-1 bg-blue-500 rounded-lg p-3 flex-row items-center justify-center mb-2"
              onPress={() => router.push("/reports")}
            >
              <Activity size={20} color="#FFFFFF" />
              <Text className="text-white font-medium ml-2">View Reports</Text>
            </TouchableOpacity>
            <TouchableOpacity
              className="flex-1 bg-green-500 rounded-lg p-3 flex-row items-center justify-center mb-2"
              onPress={() => router.push("/devices")}
            >
              <Monitor size={20} color="#FFFFFF" />
              <Text className="text-white font-medium ml-2">Manage Devices</Text>
            </TouchableOpacity>
          </View>
          <View className="flex-row flex-wrap space-x-2">
            <TouchableOpacity
              className="flex-1 bg-orange-500 rounded-lg p-3 flex-row items-center justify-center mb-2"
              onPress={() => router.push("/notifications")}
            >
              <AlertTriangle size={20} color="#FFFFFF" />
              <Text className="text-white font-medium ml-2">Notifications</Text>
            </TouchableOpacity>
            <TouchableOpacity
              className="flex-1 bg-purple-500 rounded-lg p-3 flex-row items-center justify-center mb-2"
              onPress={() => router.push("/devices/maintenance/history")}
            >
              <Server size={20} color="#FFFFFF" />
              <Text className="text-white font-medium ml-2">Maintenance</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View className="h-20" />
      </ScrollView>
    </SafeAreaView>
  );
}
