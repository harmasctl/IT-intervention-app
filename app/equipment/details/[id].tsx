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
import { useRouter, useLocalSearchParams } from 'expo-router';
import {
  ArrowLeft,
  Edit,
  Trash2,
  Package,
  Tag,
  DollarSign,
  MapPin,
  Building2,
  FileText,
  AlertTriangle,
  TrendingUp,
  History,
  BarChart3,
  Calendar,
} from 'lucide-react-native';
import { supabase } from '../../../lib/supabase';

type EquipmentItem = {
  id: string;
  name: string;
  type: string;
  stock_level: number;
  warehouse_location: string;
  supplier?: string;
  sku?: string;
  cost?: number;
  min_stock_level?: number;
  max_stock_level?: number;
  description?: string;
  created_at: string;
};

type MovementRecord = {
  id: string;
  movement_type: string;
  quantity: number;
  reason: string;
  destination?: string;
  notes?: string;
  previous_stock: number;
  new_stock: number;
  timestamp: string;
  created_at?: string;
};

export default function EquipmentDetailsScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const [loading, setLoading] = useState(true);
  const [equipment, setEquipment] = useState<EquipmentItem | null>(null);
  const [movements, setMovements] = useState<MovementRecord[]>([]);
  const [activeTab, setActiveTab] = useState<'details' | 'history'>('details');
  const [warehouseDistribution, setWarehouseDistribution] = useState<{[key: string]: number}>({});
  const [totalStock, setTotalStock] = useState(0);

  useEffect(() => {
    if (id) {
      fetchEquipment();
      fetchMovements();
      fetchWarehouseDistribution();
    }

    // Set up real-time subscription for equipment and movement changes
    const subscription = supabase
      .channel("equipment-details-changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "equipment_inventory" },
        (payload) => {
          console.log("Equipment change received:", payload);
          if (payload.new?.id === id || payload.old?.id === id) {
            fetchEquipment();
          }
        },
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "equipment_movements" },
        (payload) => {
          console.log("Movement change received:", payload);
          if (payload.new?.equipment_id === id || payload.old?.equipment_id === id) {
            fetchMovements();
            fetchEquipment(); // Refresh to get updated stock levels
          }
        },
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [id]);

  const fetchEquipment = async () => {
    try {
      setLoading(true);

      const { data, error } = await supabase
        .from('equipment_inventory')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      setEquipment(data as EquipmentItem);

      // Fetch warehouse distribution after equipment is loaded
      if (data) {
        const distribution: {[key: string]: number} = {};
        let total = 0;

        // Fetch all equipment with the same name to show distribution
        const { data: allEquipment } = await supabase
          .from('equipment_inventory')
          .select('warehouse_location, stock_level')
          .eq('name', data.name);

        allEquipment?.forEach(item => {
          const warehouse = item.warehouse_location || 'Unassigned';
          distribution[warehouse] = (distribution[warehouse] || 0) + item.stock_level;
          total += item.stock_level;
        });

        setWarehouseDistribution(distribution);
        setTotalStock(total);
      }
    } catch (error) {
      console.error('Error fetching equipment:', error);
      Alert.alert('Error', 'Failed to load equipment details');
      router.back();
    } finally {
      setLoading(false);
    }
  };

  const fetchMovements = async () => {
    try {
      const { data, error } = await supabase
        .from('equipment_movements')
        .select('*')
        .eq('equipment_id', id)
        .order('timestamp', { ascending: false })
        .limit(20);

      if (error) throw error;
      setMovements(data || []);
    } catch (error) {
      console.error('Error fetching movements:', error);
    }
  };

  const fetchWarehouseDistribution = async () => {
    try {
      if (!equipment) return;

      // Fetch all equipment with the same name to show distribution
      const { data, error } = await supabase
        .from('equipment_inventory')
        .select('warehouse_location, stock_level')
        .eq('name', equipment.name);

      if (error) throw error;

      const distribution: {[key: string]: number} = {};
      let total = 0;

      data?.forEach(item => {
        const warehouse = item.warehouse_location || 'Unassigned';
        distribution[warehouse] = (distribution[warehouse] || 0) + item.stock_level;
        total += item.stock_level;
      });

      setWarehouseDistribution(distribution);
      setTotalStock(total);
    } catch (error) {
      console.error('Error fetching warehouse distribution:', error);
    }
  };

  const handleDelete = () => {
    Alert.alert(
      'Delete Equipment',
      `Are you sure you want to delete "${equipment?.name}"? This action cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: performDelete,
        },
      ]
    );
  };

  const performDelete = async () => {
    try {
      const { error } = await supabase
        .from('equipment_inventory')
        .delete()
        .eq('id', id);

      if (error) throw error;

      Alert.alert(
        'Success',
        'Equipment deleted successfully',
        [
          {
            text: 'OK',
            onPress: () => router.replace('/equipment'),
          },
        ]
      );
    } catch (error) {
      console.error('Error deleting equipment:', error);
      Alert.alert('Error', 'Failed to delete equipment');
    }
  };

  const getStockStatus = () => {
    if (!equipment) return { status: 'normal', color: '#10B981' };

    const { stock_level, min_stock_level, max_stock_level } = equipment;

    if (min_stock_level && stock_level <= min_stock_level) {
      return { status: 'Low Stock', color: '#EF4444' };
    }

    if (max_stock_level && stock_level >= max_stock_level) {
      return { status: 'High Stock', color: '#F59E0B' };
    }

    return { status: 'Normal', color: '#10B981' };
  };

  const renderMovementItem = ({ item }: { item: MovementRecord }) => (
    <View className="bg-white rounded-lg p-4 mb-3 border border-gray-100">
      <View className="flex-row items-center justify-between mb-2">
        <View className="flex-row items-center">
          <View className={`p-2 rounded-full mr-3 ${
            item.movement_type === 'in' ? 'bg-green-100' : 'bg-red-100'
          }`}>
            <TrendingUp size={16} color={item.movement_type === 'in' ? '#10B981' : '#EF4444'} />
          </View>
          <View>
            <Text className="font-bold text-gray-800 capitalize">
              {item.reason || (item.movement_type === 'in' ? 'Stock In' : 'Stock Out')}
            </Text>
            <Text className="text-gray-500 text-sm">
              {new Date(item.timestamp || item.created_at || '').toLocaleDateString()}
            </Text>
            {item.destination && (
              <Text className="text-blue-600 text-sm">To: {item.destination}</Text>
            )}
          </View>
        </View>
        <View className="items-end">
          <Text className={`font-bold ${
            item.movement_type === 'in' ? 'text-green-600' : 'text-red-600'
          }`}>
            {item.movement_type === 'in' ? '+' : '-'}{item.quantity}
          </Text>
          <Text className="text-gray-500 text-sm">
            {item.previous_stock} → {item.new_stock}
          </Text>
        </View>
      </View>
      {item.notes && (
        <Text className="text-gray-600 text-sm mt-2">{item.notes}</Text>
      )}
    </View>
  );

  if (loading) {
    return (
      <SafeAreaView className="flex-1 bg-gray-50">
        <StatusBar style="dark" />
        <View className="flex-1 justify-center items-center">
          <ActivityIndicator size="large" color="#3B82F6" />
          <Text className="text-gray-600 mt-4">Loading equipment details...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!equipment) {
    return (
      <SafeAreaView className="flex-1 bg-gray-50">
        <StatusBar style="dark" />
        <View className="flex-1 justify-center items-center">
          <Text className="text-gray-600">Equipment not found</Text>
        </View>
      </SafeAreaView>
    );
  }

  const stockStatus = getStockStatus();

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
              <Text className="text-2xl font-bold text-white">{equipment.name}</Text>
              <Text className="text-blue-100 text-sm">{equipment.type}</Text>
            </View>
          </View>
          <View className="flex-row">
            <TouchableOpacity
              className="bg-white/20 p-3 rounded-2xl mr-2 backdrop-blur-sm"
              onPress={() => router.push(`/equipment/edit/${equipment.id}`)}
            >
              <Edit size={24} color="#ffffff" />
            </TouchableOpacity>
            <TouchableOpacity
              className="bg-red-500/20 p-3 rounded-2xl backdrop-blur-sm"
              onPress={handleDelete}
            >
              <Trash2 size={24} color="#ffffff" />
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* Tabs */}
      <View className="flex-row bg-white border-b border-gray-200">
        <TouchableOpacity
          className={`flex-1 py-4 ${activeTab === 'details' ? 'border-b-2 border-blue-500' : ''}`}
          onPress={() => setActiveTab('details')}
        >
          <Text className={`text-center font-medium ${
            activeTab === 'details' ? 'text-blue-600' : 'text-gray-600'
          }`}>
            Details
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          className={`flex-1 py-4 ${activeTab === 'history' ? 'border-b-2 border-blue-500' : ''}`}
          onPress={() => setActiveTab('history')}
        >
          <Text className={`text-center font-medium ${
            activeTab === 'history' ? 'text-blue-600' : 'text-gray-600'
          }`}>
            History
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView className="flex-1 px-6 py-4">
        {activeTab === 'details' ? (
          <>
            {/* Stock Status */}
            <View className="bg-white rounded-xl p-4 mb-4 shadow-sm">
              <Text className="text-lg font-bold text-gray-800 mb-4">Stock Status</Text>

              <View className="flex-row items-center justify-between mb-4">
                <View className="flex-row items-center">
                  <View className="bg-blue-100 p-3 rounded-full mr-4">
                    <BarChart3 size={24} color="#3B82F6" />
                  </View>
                  <View>
                    <Text className="text-2xl font-bold text-gray-800">{equipment.stock_level}</Text>
                    <Text className="text-gray-600">This Location</Text>
                  </View>
                </View>
                <View className="items-end">
                  <Text className="text-xl font-bold text-blue-600">{totalStock}</Text>
                  <Text className="text-gray-600 text-sm">Total Stock</Text>
                </View>
              </View>

              <View className="items-center mb-4">
                <View className={`px-3 py-1 rounded-full`} style={{ backgroundColor: `${stockStatus.color}20` }}>
                  <Text className="font-medium" style={{ color: stockStatus.color }}>
                    {stockStatus.status}
                  </Text>
                </View>
              </View>

              {/* Stock Level Indicator */}
              <View className="mb-4">
                <View className="flex-row justify-between mb-2">
                  <Text className="text-sm text-gray-600">Min: {equipment.min_stock_level || 0}</Text>
                  <Text className="text-sm text-gray-600">Max: {equipment.max_stock_level || 100}</Text>
                </View>
                <View className="bg-gray-200 rounded-full h-2">
                  <View
                    className="h-2 rounded-full"
                    style={{
                      width: `${Math.min(
                        (equipment.stock_level / (equipment.max_stock_level || 100)) * 100,
                        100
                      )}%`,
                      backgroundColor: stockStatus.color,
                    }}
                  />
                </View>
              </View>
            </View>

            {/* Warehouse Distribution */}
            {Object.keys(warehouseDistribution).length > 1 && (
              <View className="bg-white rounded-xl p-4 mb-4 shadow-sm">
                <Text className="text-lg font-bold text-gray-800 mb-4">Warehouse Distribution</Text>

                {Object.entries(warehouseDistribution).map(([warehouse, stock]) => (
                  <View key={warehouse} className="flex-row items-center justify-between py-2 border-b border-gray-100 last:border-b-0">
                    <View className="flex-row items-center flex-1">
                      <View className="bg-green-100 p-2 rounded-full mr-3">
                        <MapPin size={16} color="#10B981" />
                      </View>
                      <Text className="text-gray-800 font-medium flex-1">{warehouse}</Text>
                    </View>
                    <View className="items-end">
                      <Text className="text-gray-800 font-bold">{stock}</Text>
                      <Text className="text-gray-500 text-xs">
                        {totalStock > 0 ? ((stock / totalStock) * 100).toFixed(1) : 0}%
                      </Text>
                    </View>
                  </View>
                ))}
              </View>
            )}

            {/* Equipment Details */}
            <View className="bg-white rounded-xl p-4 mb-4 shadow-sm">
              <Text className="text-lg font-bold text-gray-800 mb-4">Equipment Details</Text>

              <View className="space-y-3">
                {equipment.sku && (
                  <View className="flex-row items-center">
                    <Tag size={16} color="#6B7280" />
                    <Text className="text-gray-700 ml-2">SKU: {equipment.sku}</Text>
                  </View>
                )}

                {equipment.cost && (
                  <View className="flex-row items-center">
                    <DollarSign size={16} color="#6B7280" />
                    <Text className="text-gray-700 ml-2">Cost: ${equipment.cost}</Text>
                  </View>
                )}

                {equipment.warehouse_location && (
                  <View className="flex-row items-center">
                    <MapPin size={16} color="#6B7280" />
                    <Text className="text-gray-700 ml-2">Location: {equipment.warehouse_location}</Text>
                  </View>
                )}

                {equipment.supplier && (
                  <View className="flex-row items-center">
                    <Building2 size={16} color="#6B7280" />
                    <Text className="text-gray-700 ml-2">Supplier: {equipment.supplier}</Text>
                  </View>
                )}

                <View className="flex-row items-center">
                  <Calendar size={16} color="#6B7280" />
                  <Text className="text-gray-700 ml-2">
                    Created: {new Date(equipment.created_at).toLocaleDateString()}
                  </Text>
                </View>
              </View>

              {equipment.description && (
                <View className="mt-4 p-3 bg-gray-50 rounded-lg">
                  <View className="flex-row items-start">
                    <FileText size={16} color="#6B7280" className="mt-1" />
                    <Text className="text-gray-700 ml-2 flex-1">{equipment.description}</Text>
                  </View>
                </View>
              )}
            </View>

            {/* Quick Actions */}
            <View className="bg-white rounded-xl p-4 shadow-sm">
              <Text className="text-lg font-bold text-gray-800 mb-4">Quick Actions</Text>

              <View className="space-y-3">
                <TouchableOpacity
                  className="bg-blue-50 p-4 rounded-lg flex-row items-center"
                  onPress={() => router.push(`/equipment/movement?id=${equipment.id}`)}
                >
                  <TrendingUp size={20} color="#3B82F6" />
                  <Text className="text-blue-700 font-medium ml-3">Record Movement</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  className="bg-green-50 p-4 rounded-lg flex-row items-center"
                  onPress={() => router.push(`/equipment/edit/${equipment.id}`)}
                >
                  <Edit size={20} color="#10B981" />
                  <Text className="text-green-700 font-medium ml-3">Edit Equipment</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  className="bg-purple-50 p-4 rounded-lg flex-row items-center"
                  onPress={() => router.push(`/equipment/assign/${equipment.id}`)}
                >
                  <MapPin size={20} color="#8B5CF6" />
                  <Text className="text-purple-700 font-medium ml-3">
                    {equipment.assigned_restaurant ? 'Manage Assignment' : 'Assign to Restaurant'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </>
        ) : (
          <>
            {/* Movement History */}
            <View className="bg-white rounded-xl p-4 mb-4 shadow-sm">
              <Text className="text-lg font-bold text-gray-800 mb-4">Movement History</Text>

              {movements.length > 0 ? (
                <FlatList
                  data={movements}
                  renderItem={renderMovementItem}
                  keyExtractor={(item) => item.id}
                  scrollEnabled={false}
                />
              ) : (
                <View className="py-8 items-center">
                  <History size={48} color="#d1d5db" />
                  <Text className="text-gray-500 text-lg font-semibold mt-4">No Movement History</Text>
                  <Text className="text-gray-400 text-center mt-2">
                    No stock movements have been recorded for this equipment yet.
                  </Text>
                </View>
              )}
            </View>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
