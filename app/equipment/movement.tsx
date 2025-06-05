import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  Alert,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useRouter, useLocalSearchParams } from 'expo-router';
import {
  ArrowLeft,
  Save,
  Package,
  Plus,
  Minus,
  MapPin,
  FileText,
  BarChart3,
} from 'lucide-react-native';
import { supabase } from '../../lib/supabase';

type EquipmentItem = {
  id: string;
  name: string;
  type: string;
  stock_level: number;
  warehouse_location: string;
  supplier?: string;
  sku?: string;
  min_stock_level?: number;
  max_stock_level?: number;
};

type Warehouse = {
  id: string;
  name: string;
};

export default function StockMovementScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [equipment, setEquipment] = useState<EquipmentItem | null>(null);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [selectedEquipment, setSelectedEquipment] = useState<string>('');
  const [allEquipment, setAllEquipment] = useState<EquipmentItem[]>([]);
  const [showEquipmentDropdown, setShowEquipmentDropdown] = useState(false);

  const [formData, setFormData] = useState({
    movementType: 'in' as 'in' | 'out' | 'transfer',
    quantity: '',
    newLocation: '',
    notes: '',
  });

  useEffect(() => {
    fetchWarehouses();
    fetchAllEquipment();
    if (id) {
      fetchEquipment(id as string);
    }
  }, [id]);

  const fetchEquipment = async (equipmentId: string) => {
    try {
      const { data, error } = await supabase
        .from('equipment_inventory')
        .select('*')
        .eq('id', equipmentId)
        .single();

      if (error) throw error;
      setEquipment(data as EquipmentItem);
      setSelectedEquipment(data.name);
    } catch (error) {
      console.error('Error fetching equipment:', error);
      Alert.alert('Error', 'Failed to load equipment details');
    } finally {
      setLoading(false);
    }
  };

  const fetchAllEquipment = async () => {
    try {
      const { data, error } = await supabase
        .from('equipment_inventory')
        .select('*')
        .order('name');

      if (error) throw error;
      setAllEquipment(data as EquipmentItem[]);
    } catch (error) {
      console.error('Error fetching equipment:', error);
    }
  };

  const fetchWarehouses = async () => {
    try {
      const { data, error } = await supabase
        .from('warehouses')
        .select('id, name')
        .order('name');

      if (error) throw error;
      setWarehouses(data || []);
    } catch (error) {
      console.error('Error fetching warehouses:', error);
    }
  };

  const handleEquipmentSelect = (selectedItem: EquipmentItem) => {
    setEquipment(selectedItem);
    setSelectedEquipment(selectedItem.name);
    setShowEquipmentDropdown(false);
  };

  const handleSave = async () => {
    if (!equipment) {
      Alert.alert('Error', 'Please select equipment');
      return;
    }

    if (!formData.quantity || isNaN(parseInt(formData.quantity))) {
      Alert.alert('Error', 'Please enter a valid quantity');
      return;
    }

    const quantity = parseInt(formData.quantity);
    if (quantity <= 0) {
      Alert.alert('Error', 'Quantity must be greater than 0');
      return;
    }

    if (formData.movementType === 'out' && quantity > equipment.stock_level) {
      Alert.alert('Error', 'Cannot remove more items than available in stock');
      return;
    }

    if (formData.movementType === 'transfer' && !formData.newLocation) {
      Alert.alert('Error', 'Please select a new location for transfer');
      return;
    }

    try {
      setSaving(true);

      const newStockLevel = formData.movementType === 'in'
        ? equipment.stock_level + quantity
        : equipment.stock_level - quantity;

      // Create movement record
      const { error: movementError } = await supabase
        .from('equipment_movements')
        .insert([{
          equipment_id: equipment.id,
          movement_type: formData.movementType,
          quantity: quantity,
          reason: formData.movementType === 'in' ? 'Stock In' : formData.movementType === 'out' ? 'Stock Out' : 'Transfer',
          destination: formData.movementType === 'transfer' ? formData.newLocation : null,
          notes: formData.notes || null,
          previous_stock: equipment.stock_level,
          new_stock: newStockLevel,
          timestamp: new Date().toISOString(),
        }]);

      if (movementError) throw movementError;

      // Update equipment stock level
      const updateData: any = {
        stock_level: newStockLevel,
      };

      // If it's a transfer, update the location
      if (formData.movementType === 'transfer') {
        updateData.warehouse_location = formData.newLocation;
      }

      const { error: updateError } = await supabase
        .from('equipment_inventory')
        .update(updateData)
        .eq('id', equipment.id);

      if (updateError) throw updateError;

      Alert.alert(
        'Success',
        'Stock movement recorded successfully',
        [
          {
            text: 'OK',
            onPress: () => router.back(),
          },
        ]
      );
    } catch (error) {
      console.error('Error recording movement:', error);
      Alert.alert('Error', 'Failed to record stock movement');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView className="flex-1 bg-gray-50">
        <StatusBar style="dark" />
        <View className="flex-1 justify-center items-center">
          <ActivityIndicator size="large" color="#3B82F6" />
          <Text className="text-gray-600 mt-4">Loading equipment...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      <StatusBar style="dark" />

      {/* Header */}
      <View className="px-6 py-6 bg-gradient-to-br from-green-600 via-blue-600 to-indigo-700 shadow-2xl">
        <View className="flex-row justify-between items-center">
          <View className="flex-row items-center flex-1">
            <TouchableOpacity
              onPress={() => router.back()}
              className="bg-white/20 p-3 rounded-2xl mr-4 backdrop-blur-sm"
            >
              <ArrowLeft size={24} color="#ffffff" />
            </TouchableOpacity>
            <View className="flex-1">
              <Text className="text-2xl font-bold text-white">Stock Movement</Text>
              <Text className="text-green-100 text-sm">Record inventory changes</Text>
            </View>
          </View>
          <TouchableOpacity
            className="bg-white/20 p-3 rounded-2xl backdrop-blur-sm"
            onPress={handleSave}
            disabled={saving}
          >
            {saving ? (
              <ActivityIndicator size={24} color="#ffffff" />
            ) : (
              <Save size={24} color="#ffffff" />
            )}
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView className="flex-1 px-6 py-4">
        {/* Equipment Selection */}
        <View className="bg-white rounded-xl p-4 mb-4 shadow-sm">
          <Text className="text-lg font-bold text-gray-800 mb-4">Select Equipment</Text>

          <TouchableOpacity
            onPress={() => setShowEquipmentDropdown(!showEquipmentDropdown)}
            className="border border-gray-200 rounded-lg px-3 py-3 flex-row justify-between items-center"
          >
            <Text className={selectedEquipment ? "text-gray-800" : "text-gray-400"}>
              {selectedEquipment || "Select equipment"}
            </Text>
            <Text className="text-gray-500">
              {showEquipmentDropdown ? "▲" : "▼"}
            </Text>
          </TouchableOpacity>

          {showEquipmentDropdown && (
            <View className="border border-gray-300 rounded-lg mt-1 max-h-40 bg-white">
              <ScrollView>
                {allEquipment.map((item) => (
                  <TouchableOpacity
                    key={item.id}
                    className="px-3 py-2 border-b border-gray-100"
                    onPress={() => handleEquipmentSelect(item)}
                  >
                    <Text className="text-gray-800 font-medium">{item.name}</Text>
                    <Text className="text-gray-500 text-sm">Stock: {item.stock_level} | {item.type}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          )}
        </View>

        {/* Current Equipment Info */}
        {equipment && (
          <View className="bg-white rounded-xl p-4 mb-4 shadow-sm">
            <Text className="text-lg font-bold text-gray-800 mb-3">Current Status</Text>

            <View className="space-y-2">
              <View className="flex-row items-center">
                <Package size={16} color="#6B7280" />
                <Text className="text-gray-700 ml-2">Type: {equipment.type}</Text>
              </View>

              <View className="flex-row items-center">
                <BarChart3 size={16} color="#6B7280" />
                <Text className="text-gray-700 ml-2">Current Stock: {equipment.stock_level}</Text>
              </View>

              {equipment.warehouse_location && (
                <View className="flex-row items-center">
                  <MapPin size={16} color="#6B7280" />
                  <Text className="text-gray-700 ml-2">Location: {equipment.warehouse_location}</Text>
                </View>
              )}
            </View>
          </View>
        )}

        {/* Movement Type */}
        <View className="bg-white rounded-xl p-4 mb-4 shadow-sm">
          <Text className="text-lg font-bold text-gray-800 mb-4">Movement Type</Text>

          <View className="flex-row space-x-3">
            <TouchableOpacity
              className={`flex-1 p-3 rounded-lg border-2 ${
                formData.movementType === 'in'
                  ? 'border-green-500 bg-green-50'
                  : 'border-gray-200 bg-gray-50'
              }`}
              onPress={() => setFormData({ ...formData, movementType: 'in' })}
            >
              <View className="items-center">
                <Plus size={24} color={formData.movementType === 'in' ? '#10B981' : '#6B7280'} />
                <Text className={`font-medium ${
                  formData.movementType === 'in' ? 'text-green-700' : 'text-gray-600'
                }`}>
                  Stock In
                </Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              className={`flex-1 p-3 rounded-lg border-2 ${
                formData.movementType === 'out'
                  ? 'border-red-500 bg-red-50'
                  : 'border-gray-200 bg-gray-50'
              }`}
              onPress={() => setFormData({ ...formData, movementType: 'out' })}
            >
              <View className="items-center">
                <Minus size={24} color={formData.movementType === 'out' ? '#EF4444' : '#6B7280'} />
                <Text className={`font-medium ${
                  formData.movementType === 'out' ? 'text-red-700' : 'text-gray-600'
                }`}>
                  Stock Out
                </Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              className={`flex-1 p-3 rounded-lg border-2 ${
                formData.movementType === 'transfer'
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 bg-gray-50'
              }`}
              onPress={() => setFormData({ ...formData, movementType: 'transfer' })}
            >
              <View className="items-center">
                <MapPin size={24} color={formData.movementType === 'transfer' ? '#3B82F6' : '#6B7280'} />
                <Text className={`font-medium ${
                  formData.movementType === 'transfer' ? 'text-blue-700' : 'text-gray-600'
                }`}>
                  Transfer
                </Text>
              </View>
            </TouchableOpacity>
          </View>
        </View>

        {/* Quantity */}
        <View className="bg-white rounded-xl p-4 mb-4 shadow-sm">
          <Text className="text-lg font-bold text-gray-800 mb-4">Quantity</Text>

          <TextInput
            className="border border-gray-200 rounded-lg px-4 py-3 text-gray-800 text-lg"
            placeholder="Enter quantity"
            value={formData.quantity}
            onChangeText={(text) => setFormData({ ...formData, quantity: text })}
            keyboardType="numeric"
          />
        </View>

        {/* New Location (for transfers) */}
        {formData.movementType === 'transfer' && (
          <View className="bg-white rounded-xl p-4 mb-4 shadow-sm">
            <Text className="text-lg font-bold text-gray-800 mb-4">New Location</Text>

            <View className="border border-gray-200 rounded-lg">
              {warehouses.map((warehouse) => (
                <TouchableOpacity
                  key={warehouse.id}
                  className={`px-4 py-3 border-b border-gray-100 ${
                    formData.newLocation === warehouse.name ? 'bg-blue-50' : ''
                  }`}
                  onPress={() => setFormData({ ...formData, newLocation: warehouse.name })}
                >
                  <Text className={`${
                    formData.newLocation === warehouse.name ? 'text-blue-700 font-medium' : 'text-gray-800'
                  }`}>
                    {warehouse.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {/* Notes */}
        <View className="bg-white rounded-xl p-4 mb-6 shadow-sm">
          <Text className="text-lg font-bold text-gray-800 mb-4">Notes (Optional)</Text>

          <TextInput
            className="border border-gray-200 rounded-lg px-4 py-3 text-gray-800"
            placeholder="Enter movement notes"
            value={formData.notes}
            onChangeText={(text) => setFormData({ ...formData, notes: text })}
            multiline
            numberOfLines={3}
            textAlignVertical="top"
          />
        </View>

        {/* Save Button */}
        <TouchableOpacity
          className={`bg-green-600 rounded-xl p-4 flex-row items-center justify-center mb-6 ${
            saving ? 'opacity-50' : ''
          }`}
          onPress={handleSave}
          disabled={saving}
        >
          {saving ? (
            <ActivityIndicator size="small" color="#ffffff" />
          ) : (
            <>
              <Save size={20} color="#ffffff" />
              <Text className="text-white font-bold text-lg ml-2">Record Movement</Text>
            </>
          )}
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}
