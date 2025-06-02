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
  Globe,
  HardDrive,
  Monitor,
  RefreshCw,
  Server,
  TrendingUp,
  Wifi,
  Zap,
  Eye,
  Settings,
} from "lucide-react-native";
import { performanceMonitor, getSystemHealth } from "../../lib/performance";
import { realTimeSyncService, getSyncStats } from "../../lib/realtime-sync";
import { offlineSupportService, getOfflineStatus } from "../../lib/offline-support";
import { supabase } from "../../lib/supabase";

type HealthStatus = 'healthy' | 'warning' | 'critical' | 'unknown';

interface SystemMetrics {
  database: {
    status: HealthStatus;
    latency: number;
    connections: number;
    lastQuery: string;
  };
  realtime: {
    status: HealthStatus;
    eventsPerMinute: number;
    tablesWatched: number;
    lastEvent: string;
  };
  performance: {
    status: HealthStatus;
    averageResponseTime: number;
    errorRate: number;
    slowOperations: number;
  };
  offline: {
    status: HealthStatus;
    isOnline: boolean;
    pendingActions: number;
    offlineDataTables: number;
  };
  storage: {
    status: HealthStatus;
    usedSpace: number;
    totalSpace: number;
    cacheSize: number;
  };
}

export default function SystemHealthScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [metrics, setMetrics] = useState<SystemMetrics | null>(null);
  const [lastUpdate, setLastUpdate] = useState<string>("");

  useEffect(() => {
    fetchSystemMetrics();
    
    // Auto-refresh every 30 seconds
    const interval = setInterval(fetchSystemMetrics, 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchSystemMetrics = async () => {
    try {
      if (!refreshing) setLoading(true);

      // Gather metrics from all services
      const [
        databaseMetrics,
        syncMetrics,
        offlineMetrics,
        performanceMetrics
      ] = await Promise.all([
        checkDatabaseHealth(),
        checkRealtimeHealth(),
        checkOfflineHealth(),
        checkPerformanceHealth()
      ]);

      const storageMetrics = checkStorageHealth();

      const systemMetrics: SystemMetrics = {
        database: databaseMetrics,
        realtime: syncMetrics,
        performance: performanceMetrics,
        offline: offlineMetrics,
        storage: storageMetrics,
      };

      setMetrics(systemMetrics);
      setLastUpdate(new Date().toLocaleString());

      // Check for critical issues
      const criticalIssues = Object.values(systemMetrics).filter(
        metric => metric.status === 'critical'
      ).length;

      if (criticalIssues > 0) {
        Alert.alert(
          "🚨 Critical System Issues", 
          `${criticalIssues} critical issue(s) detected. Please review system health.`
        );
      }

    } catch (error) {
      console.error("Error fetching system metrics:", error);
      Alert.alert("❌ Error", "Failed to fetch system health metrics");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const checkDatabaseHealth = async (): Promise<SystemMetrics['database']> => {
    try {
      const start = performance.now();
      const { data, error } = await supabase.from('devices').select('id').limit(1);
      const latency = performance.now() - start;

      if (error) {
        return {
          status: 'critical',
          latency: -1,
          connections: 0,
          lastQuery: new Date().toISOString(),
        };
      }

      return {
        status: latency < 500 ? 'healthy' : latency < 1000 ? 'warning' : 'critical',
        latency: Math.round(latency),
        connections: 1, // Simplified - would need actual connection pool info
        lastQuery: new Date().toISOString(),
      };
    } catch (error) {
      return {
        status: 'critical',
        latency: -1,
        connections: 0,
        lastQuery: new Date().toISOString(),
      };
    }
  };

  const checkRealtimeHealth = async (): Promise<SystemMetrics['realtime']> => {
    try {
      const syncStats = getSyncStats();
      const realtimeMetrics = realTimeSyncService.getPerformanceMetrics();

      return {
        status: syncStats.connectionStatus === 'connected' ? 'healthy' : 
                syncStats.connectionStatus === 'reconnecting' ? 'warning' : 'critical',
        eventsPerMinute: realtimeMetrics.eventsPerMinute || 0,
        tablesWatched: syncStats.tablesWatched.length,
        lastEvent: syncStats.lastSync,
      };
    } catch (error) {
      return {
        status: 'unknown',
        eventsPerMinute: 0,
        tablesWatched: 0,
        lastEvent: new Date().toISOString(),
      };
    }
  };

  const checkOfflineHealth = async (): Promise<SystemMetrics['offline']> => {
    try {
      const offlineStatus = getOfflineStatus();

      return {
        status: offlineStatus.isOnline ? 'healthy' : 'warning',
        isOnline: offlineStatus.isOnline,
        pendingActions: offlineStatus.pendingActions,
        offlineDataTables: offlineStatus.offlineDataTables.length,
      };
    } catch (error) {
      return {
        status: 'unknown',
        isOnline: false,
        pendingActions: 0,
        offlineDataTables: 0,
      };
    }
  };

  const checkPerformanceHealth = async (): Promise<SystemMetrics['performance']> => {
    try {
      const metrics = performanceMonitor.getMetrics();
      const errors = performanceMonitor.getErrors();
      const slowOps = performanceMonitor.getSlowOperations();
      const avgResponseTime = performanceMonitor.getAverageResponseTime();

      const errorRate = metrics.length > 0 ? errors.length / metrics.length : 0;

      return {
        status: errorRate < 0.01 && avgResponseTime < 1000 ? 'healthy' :
                errorRate < 0.05 && avgResponseTime < 2000 ? 'warning' : 'critical',
        averageResponseTime: Math.round(avgResponseTime),
        errorRate: Math.round(errorRate * 100),
        slowOperations: slowOps.length,
      };
    } catch (error) {
      return {
        status: 'unknown',
        averageResponseTime: 0,
        errorRate: 0,
        slowOperations: 0,
      };
    }
  };

  const checkStorageHealth = (): SystemMetrics['storage'] => {
    try {
      // Simplified storage check - would need actual storage API in production
      const usedSpace = 150; // MB
      const totalSpace = 1000; // MB
      const cacheSize = 25; // MB

      const usagePercent = (usedSpace / totalSpace) * 100;

      return {
        status: usagePercent < 70 ? 'healthy' : usagePercent < 90 ? 'warning' : 'critical',
        usedSpace,
        totalSpace,
        cacheSize,
      };
    } catch (error) {
      return {
        status: 'unknown',
        usedSpace: 0,
        totalSpace: 0,
        cacheSize: 0,
      };
    }
  };

  const getStatusColor = (status: HealthStatus): string => {
    switch (status) {
      case 'healthy':
        return '#10B981';
      case 'warning':
        return '#F59E0B';
      case 'critical':
        return '#EF4444';
      default:
        return '#6B7280';
    }
  };

  const getStatusIcon = (status: HealthStatus) => {
    switch (status) {
      case 'healthy':
        return <CheckCircle2 size={20} color="#10B981" />;
      case 'warning':
        return <AlertTriangle size={20} color="#F59E0B" />;
      case 'critical':
        return <AlertTriangle size={20} color="#EF4444" />;
      default:
        return <Clock size={20} color="#6B7280" />;
    }
  };

  const exportHealthReport = async () => {
    try {
      if (!metrics) {
        Alert.alert("⚠️ No Data", "No health metrics to export");
        return;
      }

      const report = `
SYSTEM HEALTH REPORT
Generated: ${new Date().toLocaleString()}
Last Update: ${lastUpdate}

=== DATABASE HEALTH ===
Status: ${metrics.database.status.toUpperCase()}
Latency: ${metrics.database.latency}ms
Connections: ${metrics.database.connections}
Last Query: ${new Date(metrics.database.lastQuery).toLocaleString()}

=== REAL-TIME SYNC ===
Status: ${metrics.realtime.status.toUpperCase()}
Events/Minute: ${metrics.realtime.eventsPerMinute}
Tables Watched: ${metrics.realtime.tablesWatched}
Last Event: ${new Date(metrics.realtime.lastEvent).toLocaleString()}

=== PERFORMANCE ===
Status: ${metrics.performance.status.toUpperCase()}
Avg Response Time: ${metrics.performance.averageResponseTime}ms
Error Rate: ${metrics.performance.errorRate}%
Slow Operations: ${metrics.performance.slowOperations}

=== OFFLINE SUPPORT ===
Status: ${metrics.offline.status.toUpperCase()}
Online: ${metrics.offline.isOnline ? 'Yes' : 'No'}
Pending Actions: ${metrics.offline.pendingActions}
Offline Tables: ${metrics.offline.offlineDataTables}

=== STORAGE ===
Status: ${metrics.storage.status.toUpperCase()}
Used Space: ${metrics.storage.usedSpace}MB / ${metrics.storage.totalSpace}MB
Cache Size: ${metrics.storage.cacheSize}MB
Usage: ${((metrics.storage.usedSpace / metrics.storage.totalSpace) * 100).toFixed(1)}%
      `;

      if (typeof window !== 'undefined') {
        const blob = new Blob([report], { type: 'text/plain' });
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `system_health_${new Date().toISOString().split('T')[0]}.txt`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
        
        Alert.alert("📥 Report Exported", "Health report has been downloaded");
      } else {
        Alert.alert("📄 Health Report", report);
      }
    } catch (error) {
      console.error("Error exporting health report:", error);
      Alert.alert("❌ Export Error", "Failed to export health report");
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchSystemMetrics();
  };

  const HealthCard = ({ 
    title, 
    status, 
    icon, 
    children 
  }: {
    title: string;
    status: HealthStatus;
    icon: React.ReactNode;
    children: React.ReactNode;
  }) => (
    <View className="bg-white rounded-lg shadow-sm p-4 mb-4 mx-4">
      <View className="flex-row items-center justify-between mb-3">
        <View className="flex-row items-center">
          {icon}
          <Text className="text-lg font-semibold text-gray-800 ml-2">{title}</Text>
        </View>
        <View className="flex-row items-center">
          {getStatusIcon(status)}
          <Text 
            className="ml-2 font-medium capitalize"
            style={{ color: getStatusColor(status) }}
          >
            {status}
          </Text>
        </View>
      </View>
      {children}
    </View>
  );

  if (loading && !metrics) {
    return (
      <SafeAreaView className="flex-1 bg-gray-50">
        <StatusBar style="dark" />
        <View className="flex-1 justify-center items-center">
          <ActivityIndicator size="large" color="#1D4ED8" />
          <Text className="mt-4 text-gray-600">Loading system health...</Text>
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
            System Health
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
            onPress={exportHealthReport}
          >
            <Download size={18} color="#FFFFFF" />
            <Text className="text-white font-medium ml-2 hidden md:block">Export</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Last Update */}
      <View className="bg-blue-50 p-3 mx-4 mt-4 rounded-lg">
        <Text className="text-blue-800 text-center">
          📊 Last updated: {lastUpdate}
        </Text>
      </View>

      <ScrollView 
        className="flex-1" 
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {metrics && (
          <>
            {/* Database Health */}
            <HealthCard title="Database" status={metrics.database.status} icon={<Database size={24} color="#3B82F6" />}>
              <View className="space-y-2">
                <View className="flex-row justify-between">
                  <Text className="text-gray-600">Latency</Text>
                  <Text className="font-semibold">{metrics.database.latency}ms</Text>
                </View>
                <View className="flex-row justify-between">
                  <Text className="text-gray-600">Connections</Text>
                  <Text className="font-semibold">{metrics.database.connections}</Text>
                </View>
                <View className="flex-row justify-between">
                  <Text className="text-gray-600">Last Query</Text>
                  <Text className="font-semibold text-xs">
                    {new Date(metrics.database.lastQuery).toLocaleTimeString()}
                  </Text>
                </View>
              </View>
            </HealthCard>

            {/* Real-time Sync */}
            <HealthCard title="Real-time Sync" status={metrics.realtime.status} icon={<Wifi size={24} color="#10B981" />}>
              <View className="space-y-2">
                <View className="flex-row justify-between">
                  <Text className="text-gray-600">Events/Minute</Text>
                  <Text className="font-semibold">{metrics.realtime.eventsPerMinute}</Text>
                </View>
                <View className="flex-row justify-between">
                  <Text className="text-gray-600">Tables Watched</Text>
                  <Text className="font-semibold">{metrics.realtime.tablesWatched}</Text>
                </View>
                <View className="flex-row justify-between">
                  <Text className="text-gray-600">Last Event</Text>
                  <Text className="font-semibold text-xs">
                    {new Date(metrics.realtime.lastEvent).toLocaleTimeString()}
                  </Text>
                </View>
              </View>
            </HealthCard>

            {/* Performance */}
            <HealthCard title="Performance" status={metrics.performance.status} icon={<TrendingUp size={24} color="#F59E0B" />}>
              <View className="space-y-2">
                <View className="flex-row justify-between">
                  <Text className="text-gray-600">Avg Response Time</Text>
                  <Text className="font-semibold">{metrics.performance.averageResponseTime}ms</Text>
                </View>
                <View className="flex-row justify-between">
                  <Text className="text-gray-600">Error Rate</Text>
                  <Text className="font-semibold">{metrics.performance.errorRate}%</Text>
                </View>
                <View className="flex-row justify-between">
                  <Text className="text-gray-600">Slow Operations</Text>
                  <Text className="font-semibold">{metrics.performance.slowOperations}</Text>
                </View>
              </View>
            </HealthCard>

            {/* Offline Support */}
            <HealthCard title="Offline Support" status={metrics.offline.status} icon={<Globe size={24} color="#8B5CF6" />}>
              <View className="space-y-2">
                <View className="flex-row justify-between">
                  <Text className="text-gray-600">Connection</Text>
                  <Text className="font-semibold">{metrics.offline.isOnline ? 'Online' : 'Offline'}</Text>
                </View>
                <View className="flex-row justify-between">
                  <Text className="text-gray-600">Pending Actions</Text>
                  <Text className="font-semibold">{metrics.offline.pendingActions}</Text>
                </View>
                <View className="flex-row justify-between">
                  <Text className="text-gray-600">Offline Tables</Text>
                  <Text className="font-semibold">{metrics.offline.offlineDataTables}</Text>
                </View>
              </View>
            </HealthCard>

            {/* Storage */}
            <HealthCard title="Storage" status={metrics.storage.status} icon={<HardDrive size={24} color="#EF4444" />}>
              <View className="space-y-2">
                <View className="flex-row justify-between">
                  <Text className="text-gray-600">Used Space</Text>
                  <Text className="font-semibold">{metrics.storage.usedSpace}MB</Text>
                </View>
                <View className="flex-row justify-between">
                  <Text className="text-gray-600">Total Space</Text>
                  <Text className="font-semibold">{metrics.storage.totalSpace}MB</Text>
                </View>
                <View className="flex-row justify-between">
                  <Text className="text-gray-600">Cache Size</Text>
                  <Text className="font-semibold">{metrics.storage.cacheSize}MB</Text>
                </View>
                <View className="mt-2">
                  <View className="flex-row justify-between mb-1">
                    <Text className="text-gray-600">Usage</Text>
                    <Text className="font-semibold">
                      {((metrics.storage.usedSpace / metrics.storage.totalSpace) * 100).toFixed(1)}%
                    </Text>
                  </View>
                  <View className="h-2 bg-gray-200 rounded-full">
                    <View 
                      className="h-2 rounded-full"
                      style={{ 
                        width: `${(metrics.storage.usedSpace / metrics.storage.totalSpace) * 100}%`,
                        backgroundColor: getStatusColor(metrics.storage.status)
                      }}
                    />
                  </View>
                </View>
              </View>
            </HealthCard>
          </>
        )}

        <View className="h-20" />
      </ScrollView>
    </SafeAreaView>
  );
}
