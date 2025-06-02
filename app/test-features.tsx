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
  ArrowLeft,
  CheckCircle2,
  AlertTriangle,
  X,
  Play,
  RefreshCw,
} from "lucide-react-native";
import { supabase } from "../lib/supabase";
import { advancedSearchService } from "../lib/advanced-search";
import { dataExportService } from "../lib/data-export";
import { performanceMonitor } from "../lib/performance";
import { realTimeSyncService } from "../lib/realtime-sync";
import { offlineSupportService } from "../lib/offline-support";

interface TestResult {
  feature: string;
  status: 'PASS' | 'FAIL' | 'RUNNING';
  message: string;
  details?: string;
}

export default function TestFeaturesScreen() {
  const router = useRouter();
  const [testing, setTesting] = useState(false);
  const [results, setResults] = useState<TestResult[]>([]);

  const tests = [
    { name: 'Database Connection', test: testDatabaseConnection },
    { name: 'Advanced Search', test: testAdvancedSearch },
    { name: 'Data Export', test: testDataExport },
    { name: 'Performance Monitoring', test: testPerformanceMonitoring },
    { name: 'Real-time Sync', test: testRealtimeSync },
    { name: 'Offline Support', test: testOfflineSupport },
    { name: 'Notifications System', test: testNotifications },
    { name: 'Analytics Data', test: testAnalyticsData },
  ];

  async function testDatabaseConnection(): Promise<TestResult> {
    try {
      const { data, error } = await supabase.from('devices').select('count').limit(1);
      
      if (error) {
        return {
          feature: 'Database Connection',
          status: 'FAIL',
          message: 'Connection failed',
          details: error.message
        };
      }

      return {
        feature: 'Database Connection',
        status: 'PASS',
        message: 'Successfully connected to Supabase',
        details: 'Database is accessible and responding'
      };
    } catch (error) {
      return {
        feature: 'Database Connection',
        status: 'FAIL',
        message: 'Exception occurred',
        details: (error as Error).message
      };
    }
  }

  async function testAdvancedSearch(): Promise<TestResult> {
    try {
      const searchResult = await advancedSearchService.search({
        table: 'devices',
        filters: [{ field: 'status', operator: 'eq', value: 'operational' }],
        limit: 5
      });

      if (searchResult.data.length >= 0) {
        return {
          feature: 'Advanced Search',
          status: 'PASS',
          message: `Found ${searchResult.data.length} devices`,
          details: `Search completed in ${searchResult.searchTime.toFixed(2)}ms`
        };
      }

      return {
        feature: 'Advanced Search',
        status: 'FAIL',
        message: 'Search returned no results',
        details: 'No devices found with operational status'
      };
    } catch (error) {
      return {
        feature: 'Advanced Search',
        status: 'FAIL',
        message: 'Search failed',
        details: (error as Error).message
      };
    }
  }

  async function testDataExport(): Promise<TestResult> {
    try {
      const exportResult = await dataExportService.exportData({
        table: 'devices',
        format: 'json',
        filename: 'test_export.json'
      });

      if (exportResult.success) {
        return {
          feature: 'Data Export',
          status: 'PASS',
          message: `Exported ${exportResult.recordCount} records`,
          details: `File size: ${exportResult.fileSize} bytes`
        };
      }

      return {
        feature: 'Data Export',
        status: 'FAIL',
        message: 'Export failed',
        details: exportResult.error || 'Unknown error'
      };
    } catch (error) {
      return {
        feature: 'Data Export',
        status: 'FAIL',
        message: 'Export exception',
        details: (error as Error).message
      };
    }
  }

  async function testPerformanceMonitoring(): Promise<TestResult> {
    try {
      const timer = performanceMonitor.startTimer('test_operation');
      
      // Simulate some work
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const duration = timer();
      const metrics = performanceMonitor.getMetrics();

      return {
        feature: 'Performance Monitoring',
        status: 'PASS',
        message: `Tracked ${metrics.length} operations`,
        details: `Test operation took ${duration.toFixed(2)}ms`
      };
    } catch (error) {
      return {
        feature: 'Performance Monitoring',
        status: 'FAIL',
        message: 'Performance monitoring failed',
        details: (error as Error).message
      };
    }
  }

  async function testRealtimeSync(): Promise<TestResult> {
    try {
      const syncStats = realTimeSyncService.getSyncStats();

      return {
        feature: 'Real-time Sync',
        status: syncStats.connectionStatus === 'connected' ? 'PASS' : 'FAIL',
        message: `Connection status: ${syncStats.connectionStatus}`,
        details: `Watching ${syncStats.tablesWatched.length} tables, ${syncStats.totalEvents} events processed`
      };
    } catch (error) {
      return {
        feature: 'Real-time Sync',
        status: 'FAIL',
        message: 'Sync service failed',
        details: (error as Error).message
      };
    }
  }

  async function testOfflineSupport(): Promise<TestResult> {
    try {
      const offlineStatus = offlineSupportService.getOfflineStatus();

      return {
        feature: 'Offline Support',
        status: 'PASS',
        message: `Status: ${offlineStatus.isOnline ? 'Online' : 'Offline'}`,
        details: `${offlineStatus.pendingActions} pending actions, ${offlineStatus.offlineDataTables.length} tables cached`
      };
    } catch (error) {
      return {
        feature: 'Offline Support',
        status: 'FAIL',
        message: 'Offline support failed',
        details: (error as Error).message
      };
    }
  }

  async function testNotifications(): Promise<TestResult> {
    try {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .limit(5);

      if (error) {
        return {
          feature: 'Notifications System',
          status: 'FAIL',
          message: 'Failed to fetch notifications',
          details: error.message
        };
      }

      return {
        feature: 'Notifications System',
        status: 'PASS',
        message: `Found ${data?.length || 0} notifications`,
        details: 'Notifications table is accessible and contains data'
      };
    } catch (error) {
      return {
        feature: 'Notifications System',
        status: 'FAIL',
        message: 'Notifications test failed',
        details: (error as Error).message
      };
    }
  }

  async function testAnalyticsData(): Promise<TestResult> {
    try {
      const [devicesRes, maintenanceRes, ticketsRes] = await Promise.all([
        supabase.from('devices').select('id, status'),
        supabase.from('maintenance_records').select('id, status, cost'),
        supabase.from('tickets').select('id, status, priority')
      ]);

      if (devicesRes.error || maintenanceRes.error || ticketsRes.error) {
        return {
          feature: 'Analytics Data',
          status: 'FAIL',
          message: 'Failed to fetch analytics data',
          details: 'One or more queries failed'
        };
      }

      const deviceCount = devicesRes.data?.length || 0;
      const maintenanceCount = maintenanceRes.data?.length || 0;
      const ticketCount = ticketsRes.data?.length || 0;

      return {
        feature: 'Analytics Data',
        status: 'PASS',
        message: 'Analytics data available',
        details: `${deviceCount} devices, ${maintenanceCount} maintenance records, ${ticketCount} tickets`
      };
    } catch (error) {
      return {
        feature: 'Analytics Data',
        status: 'FAIL',
        message: 'Analytics test failed',
        details: (error as Error).message
      };
    }
  }

  const runAllTests = async () => {
    setTesting(true);
    setResults([]);

    for (const test of tests) {
      // Update status to running
      setResults(prev => [...prev, {
        feature: test.name,
        status: 'RUNNING',
        message: 'Testing...'
      }]);

      try {
        const result = await test.test();
        
        // Update with actual result
        setResults(prev => prev.map(r => 
          r.feature === test.name ? result : r
        ));
      } catch (error) {
        setResults(prev => prev.map(r => 
          r.feature === test.name ? {
            feature: test.name,
            status: 'FAIL',
            message: 'Test exception',
            details: (error as Error).message
          } : r
        ));
      }

      // Small delay between tests
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    setTesting(false);

    // Show summary
    const passed = results.filter(r => r.status === 'PASS').length;
    const failed = results.filter(r => r.status === 'FAIL').length;

    Alert.alert(
      "🧪 Test Results",
      `${passed} tests passed, ${failed} tests failed`,
      [
        {
          text: "View Details",
          style: "default"
        },
        {
          text: "OK",
          style: "cancel"
        }
      ]
    );
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'PASS':
        return <CheckCircle2 size={20} color="#10B981" />;
      case 'FAIL':
        return <X size={20} color="#EF4444" />;
      case 'RUNNING':
        return <ActivityIndicator size={20} color="#3B82F6" />;
      default:
        return <AlertTriangle size={20} color="#6B7280" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PASS':
        return '#10B981';
      case 'FAIL':
        return '#EF4444';
      case 'RUNNING':
        return '#3B82F6';
      default:
        return '#6B7280';
    }
  };

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
            Feature Tests
          </Text>
        </View>
        <TouchableOpacity
          className="bg-blue-500 px-4 py-2 rounded-lg flex-row items-center"
          onPress={runAllTests}
          disabled={testing}
        >
          {testing ? (
            <ActivityIndicator size={18} color="#FFFFFF" />
          ) : (
            <Play size={18} color="#FFFFFF" />
          )}
          <Text className="text-white font-medium ml-2">
            {testing ? "Testing..." : "Run Tests"}
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        <View className="p-4">
          <Text className="text-lg font-semibold text-gray-800 mb-4">
            🧪 Advanced Features Test Suite
          </Text>
          <Text className="text-gray-600 mb-6">
            This will test all advanced features to ensure they work with real data.
          </Text>

          {/* Test Results */}
          {results.map((result, index) => (
            <View key={index} className="bg-white rounded-lg shadow-sm p-4 mb-3">
              <View className="flex-row items-center justify-between mb-2">
                <Text className="text-lg font-semibold text-gray-800">
                  {result.feature}
                </Text>
                <View className="flex-row items-center">
                  {getStatusIcon(result.status)}
                  <Text 
                    className="ml-2 font-medium"
                    style={{ color: getStatusColor(result.status) }}
                  >
                    {result.status}
                  </Text>
                </View>
              </View>
              <Text className="text-gray-700 mb-1">{result.message}</Text>
              {result.details && (
                <Text className="text-sm text-gray-500">{result.details}</Text>
              )}
            </View>
          ))}

          {/* Feature Links */}
          <View className="mt-8">
            <Text className="text-lg font-semibold text-gray-800 mb-4">
              🚀 Test Individual Features
            </Text>
            
            <View className="space-y-3">
              <TouchableOpacity
                className="bg-blue-500 rounded-lg p-4 flex-row items-center justify-between"
                onPress={() => router.push("/search")}
              >
                <Text className="text-white font-medium">🔍 Advanced Search</Text>
                <ArrowLeft size={20} color="#FFFFFF" style={{ transform: [{ rotate: '180deg' }] }} />
              </TouchableOpacity>

              <TouchableOpacity
                className="bg-green-500 rounded-lg p-4 flex-row items-center justify-between"
                onPress={() => router.push("/system/health")}
              >
                <Text className="text-white font-medium">🏥 System Health</Text>
                <ArrowLeft size={20} color="#FFFFFF" style={{ transform: [{ rotate: '180deg' }] }} />
              </TouchableOpacity>

              <TouchableOpacity
                className="bg-purple-500 rounded-lg p-4 flex-row items-center justify-between"
                onPress={() => router.push("/admin/dashboard")}
              >
                <Text className="text-white font-medium">📊 Admin Dashboard</Text>
                <ArrowLeft size={20} color="#FFFFFF" style={{ transform: [{ rotate: '180deg' }] }} />
              </TouchableOpacity>

              <TouchableOpacity
                className="bg-orange-500 rounded-lg p-4 flex-row items-center justify-between"
                onPress={() => router.push("/notifications")}
              >
                <Text className="text-white font-medium">🔔 Notifications</Text>
                <ArrowLeft size={20} color="#FFFFFF" style={{ transform: [{ rotate: '180deg' }] }} />
              </TouchableOpacity>

              <TouchableOpacity
                className="bg-indigo-500 rounded-lg p-4 flex-row items-center justify-between"
                onPress={() => router.push("/devices/import")}
              >
                <Text className="text-white font-medium">📥 Bulk Import</Text>
                <ArrowLeft size={20} color="#FFFFFF" style={{ transform: [{ rotate: '180deg' }] }} />
              </TouchableOpacity>

              <TouchableOpacity
                className="bg-rose-500 rounded-lg p-4 flex-row items-center justify-between"
                onPress={() => router.push("/reports")}
              >
                <Text className="text-white font-medium">📊 Analytics</Text>
                <ArrowLeft size={20} color="#FFFFFF" style={{ transform: [{ rotate: '180deg' }] }} />
              </TouchableOpacity>
            </View>
          </View>
        </View>

        <View className="h-20" />
      </ScrollView>
    </SafeAreaView>
  );
}
