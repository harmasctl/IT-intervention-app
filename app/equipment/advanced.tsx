import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
  FlatList,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useRouter } from 'expo-router';
import {
  ArrowLeft,
  BarChart3,
  TrendingUp,
  AlertTriangle,
  Package,
  MapPin,
  Calendar,
  DollarSign,
  Users,
  Clock,
  FileText,
  Download,
  Upload,
  Settings,
  Zap,
} from 'lucide-react-native';
import { supabase } from '../../lib/supabase';

type AnalyticsData = {
  totalEquipment: number;
  totalValue: number;
  lowStockItems: number;
  recentMovements: number;
  warehouseCount: number;
  supplierCount: number;
  averageStockLevel: number;
  topEquipmentTypes: Array<{ type: string; count: number }>;
  warehouseDistribution: Array<{ warehouse: string; count: number; value: number }>;
  recentActivity: Array<{ id: string; type: string; description: string; timestamp: string }>;
};

export default function AdvancedEquipmentScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchAnalytics();

    // Set up real-time subscription for analytics updates
    const subscription = supabase
      .channel("equipment-analytics-changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "equipment_inventory" },
        () => fetchAnalytics(),
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "equipment_movements" },
        () => fetchAnalytics(),
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);

      // Fetch equipment data
      const { data: equipment, error: equipmentError } = await supabase
        .from('equipment_inventory')
        .select('*');

      if (equipmentError) throw equipmentError;

      // Fetch recent movements
      const { data: movements, error: movementsError } = await supabase
        .from('equipment_movements')
        .select('*')
        .order('timestamp', { ascending: false })
        .limit(10);

      if (movementsError) throw movementsError;

      // Fetch suppliers
      const { data: suppliers, error: suppliersError } = await supabase
        .from('suppliers')
        .select('id');

      if (suppliersError) throw suppliersError;

      // Calculate analytics
      const totalEquipment = equipment?.length || 0;
      const totalValue = equipment?.reduce((sum, item) => sum + (item.cost || 0) * item.stock_level, 0) || 0;
      const lowStockItems = equipment?.filter(item => item.stock_level <= (item.min_stock_level || 5)).length || 0;
      const recentMovements = movements?.length || 0;
      const supplierCount = suppliers?.length || 0;
      const averageStockLevel = totalEquipment > 0 ? 
        (equipment?.reduce((sum, item) => sum + item.stock_level, 0) || 0) / totalEquipment : 0;

      // Get unique warehouses
      const warehouses = [...new Set(equipment?.map(item => item.warehouse_location).filter(Boolean))];
      const warehouseCount = warehouses.length;

      // Calculate top equipment types
      const typeCount: { [key: string]: number } = {};
      equipment?.forEach(item => {
        typeCount[item.type] = (typeCount[item.type] || 0) + 1;
      });
      const topEquipmentTypes = Object.entries(typeCount)
        .map(([type, count]) => ({ type, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);

      // Calculate warehouse distribution
      const warehouseStats: { [key: string]: { count: number; value: number } } = {};
      equipment?.forEach(item => {
        const warehouse = item.warehouse_location || 'Unassigned';
        if (!warehouseStats[warehouse]) {
          warehouseStats[warehouse] = { count: 0, value: 0 };
        }
        warehouseStats[warehouse].count += item.stock_level;
        warehouseStats[warehouse].value += (item.cost || 0) * item.stock_level;
      });
      const warehouseDistribution = Object.entries(warehouseStats)
        .map(([warehouse, stats]) => ({ warehouse, ...stats }))
        .sort((a, b) => b.value - a.value);

      // Format recent activity
      const recentActivity = movements?.map(movement => ({
        id: movement.id,
        type: movement.movement_type,
        description: `${movement.movement_type.toUpperCase()}: ${movement.quantity} units - ${movement.reason}`,
        timestamp: movement.timestamp,
      })) || [];

      setAnalytics({
        totalEquipment,
        totalValue,
        lowStockItems,
        recentMovements,
        warehouseCount,
        supplierCount,
        averageStockLevel,
        topEquipmentTypes,
        warehouseDistribution,
        recentActivity,
      });
    } catch (error) {
      console.error('Error fetching analytics:', error);
      Alert.alert('Error', 'Failed to load analytics data');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchAnalytics();
  };

  const handleExportData = () => {
    Alert.alert(
      'Export Data',
      'Choose export format:',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'CSV', onPress: () => exportToCSV() },
        { text: 'PDF Report', onPress: () => exportToPDF() },
      ]
    );
  };

  const exportToCSV = () => {
    Alert.alert('Export', 'CSV export functionality would be implemented here');
  };

  const exportToPDF = () => {
    Alert.alert('Export', 'PDF export functionality would be implemented here');
  };

  const handleBulkImport = () => {
    Alert.alert(
      'Bulk Import',
      'Import equipment data from CSV file',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Select File', onPress: () => Alert.alert('Import', 'File selection would be implemented here') },
      ]
    );
  };

  const renderStatCard = (title: string, value: string | number, icon: any, color: string) => (
    <View className="bg-white rounded-xl p-4 shadow-sm flex-1 mx-1">
      <View className="flex-row items-center justify-between mb-2">
        <View className={`p-2 rounded-full`} style={{ backgroundColor: `${color}20` }}>
          {React.createElement(icon, { size: 20, color })}
        </View>
        <Text className="text-2xl font-bold text-gray-800">{value}</Text>
      </View>
      <Text className="text-gray-600 text-sm">{title}</Text>
    </View>
  );

  const renderFeatureCard = (title: string, description: string, icon: any, onPress: () => void, color: string) => (
    <TouchableOpacity
      className="bg-white rounded-xl p-4 shadow-sm mb-4"
      onPress={onPress}
    >
      <View className="flex-row items-center">
        <View className={`p-3 rounded-full mr-4`} style={{ backgroundColor: `${color}20` }}>
          {React.createElement(icon, { size: 24, color })}
        </View>
        <View className="flex-1">
          <Text className="text-lg font-bold text-gray-800">{title}</Text>
          <Text className="text-gray-600 text-sm">{description}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <SafeAreaView className="flex-1 bg-gray-50">
        <StatusBar style="dark" />
        <View className="flex-1 justify-center items-center">
          <ActivityIndicator size="large" color="#3B82F6" />
          <Text className="text-gray-600 mt-4">Loading analytics...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      <StatusBar style="dark" />

      {/* Header */}
      <View className="px-6 py-6 bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-700 shadow-2xl">
        <View className="flex-row justify-between items-center">
          <View className="flex-row items-center flex-1">
            <TouchableOpacity
              onPress={() => router.back()}
              className="bg-white/20 p-3 rounded-2xl mr-4 backdrop-blur-sm"
            >
              <ArrowLeft size={24} color="#ffffff" />
            </TouchableOpacity>
            <View className="flex-1">
              <Text className="text-2xl font-bold text-white">Advanced Features</Text>
              <Text className="text-indigo-100 text-sm">Analytics & Management Tools</Text>
            </View>
          </View>
          <TouchableOpacity
            className="bg-white/20 p-3 rounded-2xl backdrop-blur-sm"
            onPress={onRefresh}
          >
            <Zap size={24} color="#ffffff" />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView className="flex-1 px-6 py-4">
        {/* Analytics Overview */}
        <View className="mb-6">
          <Text className="text-xl font-bold text-gray-800 mb-4">Analytics Overview</Text>
          
          <View className="flex-row mb-4">
            {renderStatCard('Total Equipment', analytics?.totalEquipment || 0, Package, '#3B82F6')}
            {renderStatCard('Total Value', `$${(analytics?.totalValue || 0).toLocaleString()}`, DollarSign, '#10B981')}
          </View>
          
          <View className="flex-row mb-4">
            {renderStatCard('Low Stock Items', analytics?.lowStockItems || 0, AlertTriangle, '#EF4444')}
            {renderStatCard('Warehouses', analytics?.warehouseCount || 0, MapPin, '#8B5CF6')}
          </View>
          
          <View className="flex-row">
            {renderStatCard('Suppliers', analytics?.supplierCount || 0, Users, '#F59E0B')}
            {renderStatCard('Avg Stock', Math.round(analytics?.averageStockLevel || 0), TrendingUp, '#06B6D4')}
          </View>
        </View>

        {/* Advanced Features */}
        <View className="mb-6">
          <Text className="text-xl font-bold text-gray-800 mb-4">Advanced Tools</Text>
          
          {renderFeatureCard(
            'Bulk Import/Export',
            'Import equipment data from CSV or export reports',
            Upload,
            handleBulkImport,
            '#3B82F6'
          )}
          
          {renderFeatureCard(
            'Data Export',
            'Export equipment data and analytics reports',
            Download,
            handleExportData,
            '#10B981'
          )}
          
          {renderFeatureCard(
            'Inter-Warehouse Transfer',
            'Transfer equipment between warehouse locations',
            MapPin,
            () => router.push('/equipment/transfer'),
            '#8B5CF6'
          )}
          
          {renderFeatureCard(
            'Equipment Assignment',
            'Assign equipment to restaurants and locations',
            Users,
            () => router.push('/equipment'),
            '#F59E0B'
          )}
          
          {renderFeatureCard(
            'Analytics Dashboard',
            'View detailed analytics and performance metrics',
            BarChart3,
            () => Alert.alert('Analytics', 'Detailed analytics dashboard coming soon'),
            '#06B6D4'
          )}
          
          {renderFeatureCard(
            'Maintenance Scheduling',
            'Schedule and track equipment maintenance',
            Calendar,
            () => Alert.alert('Maintenance', 'Maintenance scheduling coming soon'),
            '#EF4444'
          )}
        </View>

        {/* Top Equipment Types */}
        {analytics?.topEquipmentTypes && analytics.topEquipmentTypes.length > 0 && (
          <View className="bg-white rounded-xl p-4 shadow-sm mb-6">
            <Text className="text-lg font-bold text-gray-800 mb-4">Top Equipment Types</Text>
            {analytics.topEquipmentTypes.map((item, index) => (
              <View key={item.type} className="flex-row justify-between items-center py-2">
                <Text className="text-gray-800 font-medium">{item.type}</Text>
                <Text className="text-blue-600 font-bold">{item.count}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Warehouse Distribution */}
        {analytics?.warehouseDistribution && analytics.warehouseDistribution.length > 0 && (
          <View className="bg-white rounded-xl p-4 shadow-sm mb-6">
            <Text className="text-lg font-bold text-gray-800 mb-4">Warehouse Distribution</Text>
            {analytics.warehouseDistribution.map((item, index) => (
              <View key={item.warehouse} className="flex-row justify-between items-center py-2">
                <View>
                  <Text className="text-gray-800 font-medium">{item.warehouse}</Text>
                  <Text className="text-gray-500 text-sm">{item.count} items</Text>
                </View>
                <Text className="text-green-600 font-bold">${item.value.toLocaleString()}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Recent Activity */}
        {analytics?.recentActivity && analytics.recentActivity.length > 0 && (
          <View className="bg-white rounded-xl p-4 shadow-sm mb-6">
            <Text className="text-lg font-bold text-gray-800 mb-4">Recent Activity</Text>
            {analytics.recentActivity.slice(0, 5).map((activity, index) => (
              <View key={activity.id} className="flex-row items-center py-2 border-b border-gray-100 last:border-b-0">
                <View className="bg-blue-100 p-2 rounded-full mr-3">
                  <Clock size={16} color="#3B82F6" />
                </View>
                <View className="flex-1">
                  <Text className="text-gray-800 font-medium">{activity.description}</Text>
                  <Text className="text-gray-500 text-sm">
                    {new Date(activity.timestamp).toLocaleDateString()}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
