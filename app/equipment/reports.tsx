import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useRouter } from 'expo-router';
import {
  ArrowLeft,
  BarChart3,
  TrendingDown,
  TrendingUp,
  Package,
  AlertTriangle,
  DollarSign,
  Calendar,
  Download,
  FileText,
} from 'lucide-react-native';
import { supabase } from '../../lib/supabase';
import { formatCurrency } from '../../lib/utils';

type EquipmentStats = {
  totalItems: number;
  totalValue: number;
  lowStockItems: number;
  criticalItems: number;
  recentMovements: number;
  topCategories: { type: string; count: number; value: number }[];
  monthlyMovements: { month: string; in: number; out: number }[];
};

export default function EquipmentReportsScreen() {
  const router = useRouter();
  const [stats, setStats] = useState<EquipmentStats>({
    totalItems: 0,
    totalValue: 0,
    lowStockItems: 0,
    criticalItems: 0,
    recentMovements: 0,
    topCategories: [],
    monthlyMovements: [],
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchReportData();
  }, []);

  const fetchReportData = async () => {
    try {
      setLoading(true);

      // Fetch equipment data
      const { data: equipment, error: equipmentError } = await supabase
        .from('equipment_inventory')
        .select('*');

      if (equipmentError) throw equipmentError;

      // Fetch recent movements (last 30 days)
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const { data: movements, error: movementsError } = await supabase
        .from('equipment_movements')
        .select('*')
        .gte('created_at', thirtyDaysAgo.toISOString());

      if (movementsError) throw movementsError;

      // Calculate statistics
      const totalItems = equipment?.length || 0;
      const totalValue = equipment?.reduce((sum, item) => sum + ((item.cost || 0) * item.stock_level), 0) || 0;
      const lowStockItems = equipment?.filter(item => 
        item.min_stock_level && item.stock_level <= item.min_stock_level
      ).length || 0;
      const criticalItems = equipment?.filter(item => item.is_critical).length || 0;
      const recentMovements = movements?.length || 0;

      // Calculate top categories
      const categoryStats = equipment?.reduce((acc, item) => {
        const type = item.type || 'Unknown';
        if (!acc[type]) {
          acc[type] = { count: 0, value: 0 };
        }
        acc[type].count += 1;
        acc[type].value += (item.cost || 0) * item.stock_level;
        return acc;
      }, {} as Record<string, { count: number; value: number }>) || {};

      const topCategories = Object.entries(categoryStats)
        .map(([type, data]) => ({ type, ...data }))
        .sort((a, b) => b.value - a.value)
        .slice(0, 5);

      // Calculate monthly movements (last 6 months)
      const monthlyMovements = [];
      for (let i = 5; i >= 0; i--) {
        const date = new Date();
        date.setMonth(date.getMonth() - i);
        const monthStart = new Date(date.getFullYear(), date.getMonth(), 1);
        const monthEnd = new Date(date.getFullYear(), date.getMonth() + 1, 0);
        
        const monthMovements = movements?.filter(m => {
          const movementDate = new Date(m.created_at);
          return movementDate >= monthStart && movementDate <= monthEnd;
        }) || [];

        const inMovements = monthMovements.filter(m => m.action_type === 'stock_in').length;
        const outMovements = monthMovements.filter(m => m.action_type === 'stock_out').length;

        monthlyMovements.push({
          month: date.toLocaleDateString('en-US', { month: 'short' }),
          in: inMovements,
          out: outMovements,
        });
      }

      setStats({
        totalItems,
        totalValue,
        lowStockItems,
        criticalItems,
        recentMovements,
        topCategories,
        monthlyMovements,
      });
    } catch (error) {
      console.error('Error fetching report data:', error);
      Alert.alert('Error', 'Failed to load report data');
    } finally {
      setLoading(false);
    }
  };

  const exportReport = () => {
    Alert.alert(
      'Export Report',
      'Choose export format:',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'PDF', onPress: () => Alert.alert('Info', 'PDF export coming soon') },
        { text: 'Excel', onPress: () => Alert.alert('Info', 'Excel export coming soon') },
      ]
    );
  };

  if (loading) {
    return (
      <SafeAreaView className="flex-1 bg-gray-50">
        <StatusBar style="dark" />
        <View className="flex-1 justify-center items-center">
          <ActivityIndicator size="large" color="#3B82F6" />
          <Text className="text-gray-600 mt-4">Loading reports...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      <StatusBar style="dark" />

      {/* Header */}
      <View className="px-6 py-6 bg-gradient-to-br from-blue-600 via-purple-600 to-indigo-700 shadow-2xl">
        <View className="flex-row justify-between items-center">
          <View className="flex-row items-center flex-1">
            <TouchableOpacity
              onPress={() => router.back()}
              className="bg-white/20 p-3 rounded-2xl mr-4 backdrop-blur-sm"
            >
              <ArrowLeft size={24} color="#ffffff" />
            </TouchableOpacity>
            <View className="flex-1">
              <Text className="text-2xl font-bold text-white">Equipment Reports</Text>
              <Text className="text-blue-100 text-sm">Analytics & insights</Text>
            </View>
          </View>
          <TouchableOpacity
            className="bg-white/20 p-3 rounded-2xl backdrop-blur-sm"
            onPress={exportReport}
          >
            <Download size={24} color="#ffffff" />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView className="flex-1 px-6 py-4">
        {/* Key Metrics */}
        <View className="mb-6">
          <Text className="text-xl font-bold text-gray-800 mb-4">Key Metrics</Text>
          <View className="flex-row flex-wrap justify-between">
            <View className="bg-white rounded-xl p-4 mb-4 w-[48%] shadow-sm">
              <View className="flex-row items-center justify-between mb-2">
                <Package size={24} color="#3B82F6" />
                <Text className="text-2xl font-bold text-gray-800">{stats.totalItems}</Text>
              </View>
              <Text className="text-gray-600 text-sm">Total Items</Text>
            </View>

            <View className="bg-white rounded-xl p-4 mb-4 w-[48%] shadow-sm">
              <View className="flex-row items-center justify-between mb-2">
                <DollarSign size={24} color="#10B981" />
                <Text className="text-2xl font-bold text-gray-800">
                  {formatCurrency(stats.totalValue)}
                </Text>
              </View>
              <Text className="text-gray-600 text-sm">Total Value</Text>
            </View>

            <View className="bg-white rounded-xl p-4 mb-4 w-[48%] shadow-sm">
              <View className="flex-row items-center justify-between mb-2">
                <AlertTriangle size={24} color="#F59E0B" />
                <Text className="text-2xl font-bold text-gray-800">{stats.lowStockItems}</Text>
              </View>
              <Text className="text-gray-600 text-sm">Low Stock</Text>
            </View>

            <View className="bg-white rounded-xl p-4 mb-4 w-[48%] shadow-sm">
              <View className="flex-row items-center justify-between mb-2">
                <TrendingUp size={24} color="#EF4444" />
                <Text className="text-2xl font-bold text-gray-800">{stats.criticalItems}</Text>
              </View>
              <Text className="text-gray-600 text-sm">Critical Items</Text>
            </View>
          </View>
        </View>

        {/* Top Categories */}
        <View className="bg-white rounded-xl p-4 mb-6 shadow-sm">
          <Text className="text-lg font-bold text-gray-800 mb-4">Top Categories by Value</Text>
          {stats.topCategories.map((category, index) => (
            <View key={category.type} className="flex-row items-center justify-between py-2">
              <View className="flex-row items-center flex-1">
                <View className="w-8 h-8 bg-blue-100 rounded-full items-center justify-center mr-3">
                  <Text className="text-blue-600 font-bold text-sm">{index + 1}</Text>
                </View>
                <View className="flex-1">
                  <Text className="font-medium text-gray-800">{category.type}</Text>
                  <Text className="text-gray-500 text-sm">{category.count} items</Text>
                </View>
              </View>
              <Text className="font-bold text-gray-800">
                {formatCurrency(category.value)}
              </Text>
            </View>
          ))}
        </View>

        {/* Recent Activity */}
        <View className="bg-white rounded-xl p-4 mb-6 shadow-sm">
          <View className="flex-row items-center justify-between mb-4">
            <Text className="text-lg font-bold text-gray-800">Recent Activity</Text>
            <TouchableOpacity
              className="bg-blue-50 px-3 py-1 rounded-full"
              onPress={() => router.push('/equipment/history')}
            >
              <Text className="text-blue-600 text-sm font-medium">View All</Text>
            </TouchableOpacity>
          </View>
          <View className="flex-row items-center">
            <Calendar size={20} color="#6B7280" />
            <Text className="text-gray-600 ml-2">
              {stats.recentMovements} movements in the last 30 days
            </Text>
          </View>
        </View>

        {/* Monthly Trends */}
        <View className="bg-white rounded-xl p-4 mb-6 shadow-sm">
          <Text className="text-lg font-bold text-gray-800 mb-4">Monthly Movement Trends</Text>
          {stats.monthlyMovements.map((month) => (
            <View key={month.month} className="flex-row items-center justify-between py-2">
              <Text className="font-medium text-gray-800 w-12">{month.month}</Text>
              <View className="flex-row items-center flex-1 mx-4">
                <View className="flex-row items-center mr-4">
                  <TrendingUp size={16} color="#10B981" />
                  <Text className="text-green-600 ml-1 font-medium">{month.in}</Text>
                </View>
                <View className="flex-row items-center">
                  <TrendingDown size={16} color="#EF4444" />
                  <Text className="text-red-600 ml-1 font-medium">{month.out}</Text>
                </View>
              </View>
            </View>
          ))}
        </View>

        {/* Quick Actions */}
        <View className="bg-white rounded-xl p-4 mb-6 shadow-sm">
          <Text className="text-lg font-bold text-gray-800 mb-4">Quick Actions</Text>
          <View className="space-y-3">
            <TouchableOpacity
              className="flex-row items-center justify-between py-3 px-4 bg-blue-50 rounded-lg"
              onPress={() => router.push('/equipment/low-stock')}
            >
              <View className="flex-row items-center">
                <AlertTriangle size={20} color="#F59E0B" />
                <Text className="text-gray-800 font-medium ml-3">View Low Stock Items</Text>
              </View>
              <Text className="text-blue-600 font-bold">{stats.lowStockItems}</Text>
            </TouchableOpacity>

            <TouchableOpacity
              className="flex-row items-center justify-between py-3 px-4 bg-green-50 rounded-lg"
              onPress={() => router.push('/equipment/bulk-movement')}
            >
              <View className="flex-row items-center">
                <Package size={20} color="#10B981" />
                <Text className="text-gray-800 font-medium ml-3">Bulk Stock Movement</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              className="flex-row items-center justify-between py-3 px-4 bg-purple-50 rounded-lg"
              onPress={() => router.push('/equipment/suppliers')}
            >
              <View className="flex-row items-center">
                <FileText size={20} color="#8B5CF6" />
                <Text className="text-gray-800 font-medium ml-3">Manage Suppliers</Text>
              </View>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
