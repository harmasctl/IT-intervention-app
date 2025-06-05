import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  Alert,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useRouter } from 'expo-router';
import {
  ArrowLeft,
  AlertTriangle,
  Package,
  Plus,
  ShoppingCart,
  TrendingDown,
  Warehouse,
} from 'lucide-react-native';
import { supabase } from '../../lib/supabase';
import { formatCurrency } from '../../lib/utils';

type LowStockItem = {
  id: string;
  name: string;
  type: string;
  stock_level: number;
  min_stock_level: number;
  max_stock_level?: number;
  cost?: number;
  supplier?: string;
  warehouse_location?: string;
  is_critical: boolean;
};

export default function LowStockScreen() {
  const router = useRouter();
  const [lowStockItems, setLowStockItems] = useState<LowStockItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchLowStockItems();

    // Set up real-time subscription for equipment changes
    const subscription = supabase
      .channel("low-stock-equipment-changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "equipment_inventory" },
        (payload) => {
          console.log("Equipment change received:", payload);
          fetchLowStockItems();
        },
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const fetchLowStockItems = async () => {
    try {
      setLoading(true);

      const { data, error } = await supabase
        .from('equipment_inventory')
        .select('*')
        .not('min_stock_level', 'is', null)
        .order('stock_level', { ascending: true });

      if (error) throw error;

      // Filter items where stock_level <= min_stock_level on the client side
      const filteredData = data?.filter(item =>
        item.min_stock_level && item.stock_level <= item.min_stock_level
      ) || [];

      setLowStockItems(filteredData);
    } catch (error) {
      console.error('Error fetching low stock items:', error);
      Alert.alert('Error', 'Failed to load low stock items');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchLowStockItems();
  };

  const handleQuickRestock = (item: LowStockItem) => {
    const suggestedQuantity = (item.max_stock_level || item.min_stock_level * 2) - item.stock_level;

    Alert.alert(
      'Quick Restock',
      `Restock ${item.name}?\n\nCurrent: ${item.stock_level}\nSuggested: +${suggestedQuantity} units`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Restock',
          onPress: () => performQuickRestock(item, suggestedQuantity),
        },
      ]
    );
  };

  const performQuickRestock = async (item: LowStockItem, quantity: number) => {
    try {
      const newStockLevel = item.stock_level + quantity;

      // Update stock level
      const { error: updateError } = await supabase
        .from('equipment_inventory')
        .update({ stock_level: newStockLevel })
        .eq('id', item.id);

      if (updateError) throw updateError;

      // Record movement
      const { error: movementError } = await supabase
        .from('equipment_movements')
        .insert({
          equipment_id: item.id,
          movement_type: 'in',
          quantity: quantity,
          reason: 'Quick Restock',
          previous_stock: item.stock_level,
          new_stock: newStockLevel,
          notes: 'Quick restock from low stock alert',
          destination: item.warehouse_location || 'Main Warehouse',
          timestamp: new Date().toISOString(),
        });

      if (movementError) throw movementError;

      Alert.alert('Success', `${item.name} restocked successfully`);
      fetchLowStockItems();
    } catch (error) {
      console.error('Error restocking item:', error);
      Alert.alert('Error', 'Failed to restock item');
    }
  };

  const getStockLevelColor = (item: LowStockItem) => {
    if (item.stock_level === 0) return 'text-red-600';
    if (item.stock_level <= item.min_stock_level * 0.5) return 'text-red-500';
    return 'text-orange-500';
  };

  const getStockLevelBg = (item: LowStockItem) => {
    if (item.stock_level === 0) return 'bg-red-100';
    if (item.stock_level <= item.min_stock_level * 0.5) return 'bg-red-50';
    return 'bg-orange-50';
  };

  const renderLowStockItem = ({ item }: { item: LowStockItem }) => (
    <View className="bg-white rounded-xl p-4 mb-4 shadow-sm border border-gray-100">
      <View className="flex-row items-start justify-between mb-3">
        <View className="flex-1">
          <View className="flex-row items-center mb-2">
            <Text className="font-bold text-lg text-gray-800 flex-1">{item.name}</Text>
            {item.is_critical && (
              <View className="bg-red-100 px-2 py-1 rounded-full">
                <Text className="text-red-600 text-xs font-medium">CRITICAL</Text>
              </View>
            )}
          </View>
          <Text className="text-gray-600 text-sm mb-1">{item.type}</Text>
          {item.supplier && (
            <Text className="text-gray-500 text-xs">Supplier: {item.supplier}</Text>
          )}
        </View>
      </View>

      {/* Stock Level Indicator */}
      <View className={`rounded-lg p-3 mb-3 ${getStockLevelBg(item)}`}>
        <View className="flex-row items-center justify-between">
          <View className="flex-row items-center">
            <AlertTriangle size={20} color={item.stock_level === 0 ? '#DC2626' : '#F59E0B'} />
            <Text className={`ml-2 font-bold text-lg ${getStockLevelColor(item)}`}>
              {item.stock_level} / {item.min_stock_level}
            </Text>
          </View>
          <Text className="text-gray-600 text-sm">
            {item.stock_level === 0 ? 'OUT OF STOCK' : 'LOW STOCK'}
          </Text>
        </View>

        {/* Stock Level Bar */}
        <View className="mt-2 bg-gray-200 rounded-full h-2">
          <View
            className={`h-2 rounded-full ${
              item.stock_level === 0 ? 'bg-red-500' : 'bg-orange-500'
            }`}
            style={{
              width: `${Math.min((item.stock_level / item.min_stock_level) * 100, 100)}%`,
            }}
          />
        </View>
      </View>

      {/* Location and Cost */}
      <View className="flex-row items-center justify-between mb-3">
        <View className="flex-row items-center">
          <Warehouse size={16} color="#6B7280" />
          <Text className="text-gray-600 text-sm ml-2">
            {item.warehouse_location || 'No location'}
          </Text>
        </View>
        {item.cost && (
          <Text className="text-gray-800 font-medium">
            {formatCurrency(item.cost)} each
          </Text>
        )}
      </View>

      {/* Action Buttons */}
      <View className="flex-row space-x-2">
        <TouchableOpacity
          className="flex-1 bg-blue-500 rounded-lg p-3 flex-row items-center justify-center"
          onPress={() => handleQuickRestock(item)}
        >
          <Plus size={16} color="#ffffff" />
          <Text className="text-white font-medium ml-2">Quick Restock</Text>
        </TouchableOpacity>

        <TouchableOpacity
          className="flex-1 bg-green-500 rounded-lg p-3 flex-row items-center justify-center"
          onPress={() => router.push(`/equipment/purchase-order?item_id=${item.id}`)}
        >
          <ShoppingCart size={16} color="#ffffff" />
          <Text className="text-white font-medium ml-2">Order</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      <StatusBar style="dark" />

      {/* Header */}
      <View className="px-6 py-6 bg-gradient-to-br from-orange-600 via-red-600 to-pink-700 shadow-2xl">
        <View className="flex-row justify-between items-center">
          <View className="flex-row items-center flex-1">
            <TouchableOpacity
              onPress={() => router.back()}
              className="bg-white/20 p-3 rounded-2xl mr-4 backdrop-blur-sm"
            >
              <ArrowLeft size={24} color="#ffffff" />
            </TouchableOpacity>
            <View className="flex-1">
              <Text className="text-2xl font-bold text-white">Low Stock Alert</Text>
              <Text className="text-orange-100 text-sm">Items requiring attention</Text>
            </View>
          </View>
          <View className="bg-white/20 p-3 rounded-2xl backdrop-blur-sm">
            <AlertTriangle size={24} color="#ffffff" />
          </View>
        </View>
      </View>

      {/* Summary Stats */}
      <View className="px-6 py-4 bg-white border-b border-gray-200">
        <View className="flex-row justify-between">
          <View className="items-center">
            <Text className="text-2xl font-bold text-red-600">{lowStockItems.filter(i => i.stock_level === 0).length}</Text>
            <Text className="text-gray-600 text-sm">Out of Stock</Text>
          </View>
          <View className="items-center">
            <Text className="text-2xl font-bold text-orange-600">{lowStockItems.length}</Text>
            <Text className="text-gray-600 text-sm">Low Stock</Text>
          </View>
          <View className="items-center">
            <Text className="text-2xl font-bold text-red-600">{lowStockItems.filter(i => i.is_critical).length}</Text>
            <Text className="text-gray-600 text-sm">Critical Items</Text>
          </View>
        </View>
      </View>

      {/* Low Stock List */}
      {loading ? (
        <View className="flex-1 justify-center items-center">
          <ActivityIndicator size="large" color="#F59E0B" />
          <Text className="text-gray-600 mt-4">Loading low stock items...</Text>
        </View>
      ) : lowStockItems.length > 0 ? (
        <FlatList
          data={lowStockItems}
          renderItem={renderLowStockItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ padding: 16 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          showsVerticalScrollIndicator={false}
        />
      ) : (
        <View className="flex-1 justify-center items-center px-8">
          <Package size={64} color="#d1d5db" />
          <Text className="text-gray-500 text-xl font-semibold mt-4">All Stock Levels Good!</Text>
          <Text className="text-gray-400 text-center mt-2">
            No items are currently below their minimum stock levels
          </Text>
          <TouchableOpacity
            className="bg-blue-500 rounded-lg px-6 py-3 mt-6"
            onPress={() => router.push('/equipment')}
          >
            <Text className="text-white font-medium">View All Equipment</Text>
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
  );
}
