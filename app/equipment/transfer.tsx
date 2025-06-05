import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
  TextInput,
  FlatList,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useRouter } from 'expo-router';
import {
  ArrowLeft,
  ArrowRight,
  Package,
  MapPin,
  Building,
  Search,
  Plus,
  Minus,
  Save,
  X,
  Truck,
} from 'lucide-react-native';
import { supabase } from '../../lib/supabase';

type Equipment = {
  id: string;
  name: string;
  type: string;
  stock_level: number;
  warehouse_location: string;
  sku?: string;
};

type Warehouse = {
  id: string;
  name: string;
  location?: string;
};

type TransferItem = {
  equipment: Equipment;
  quantity: number;
};

export default function InterWarehouseTransferScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [equipment, setEquipment] = useState<Equipment[]>([]);
  const [filteredEquipment, setFilteredEquipment] = useState<Equipment[]>([]);
  const [sourceWarehouse, setSourceWarehouse] = useState<Warehouse | null>(null);
  const [destinationWarehouse, setDestinationWarehouse] = useState<Warehouse | null>(null);
  const [transferItems, setTransferItems] = useState<TransferItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [showWarehouseModal, setShowWarehouseModal] = useState(false);
  const [warehouseModalType, setWarehouseModalType] = useState<'source' | 'destination'>('source');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    fetchWarehouses();
  }, []);

  useEffect(() => {
    if (sourceWarehouse) {
      fetchEquipmentByWarehouse(sourceWarehouse.name);
    }
  }, [sourceWarehouse]);

  useEffect(() => {
    filterEquipment();
  }, [searchQuery, equipment]);

  const fetchWarehouses = async () => {
    try {
      const { data, error } = await supabase
        .from('warehouses')
        .select('*')
        .order('name');

      if (error) throw error;
      setWarehouses(data || []);
    } catch (error) {
      console.error('Error fetching warehouses:', error);
      Alert.alert('Error', 'Failed to load warehouses');
    } finally {
      setLoading(false);
    }
  };

  const fetchEquipmentByWarehouse = async (warehouseName: string) => {
    try {
      const { data, error } = await supabase
        .from('equipment_inventory')
        .select('*')
        .eq('warehouse_location', warehouseName)
        .gt('stock_level', 0)
        .order('name');

      if (error) throw error;
      setEquipment(data || []);
    } catch (error) {
      console.error('Error fetching equipment:', error);
      Alert.alert('Error', 'Failed to load equipment');
    }
  };

  const filterEquipment = () => {
    if (!searchQuery.trim()) {
      setFilteredEquipment(equipment);
      return;
    }

    const query = searchQuery.toLowerCase();
    const filtered = equipment.filter(item =>
      item.name.toLowerCase().includes(query) ||
      item.type.toLowerCase().includes(query) ||
      item.sku?.toLowerCase().includes(query)
    );

    setFilteredEquipment(filtered);
  };

  const openWarehouseModal = (type: 'source' | 'destination') => {
    setWarehouseModalType(type);
    setShowWarehouseModal(true);
  };

  const selectWarehouse = (warehouse: Warehouse) => {
    if (warehouseModalType === 'source') {
      setSourceWarehouse(warehouse);
      setTransferItems([]); // Clear transfer items when source changes
    } else {
      if (warehouse.id === sourceWarehouse?.id) {
        Alert.alert('Error', 'Destination warehouse must be different from source warehouse');
        return;
      }
      setDestinationWarehouse(warehouse);
    }
    setShowWarehouseModal(false);
  };

  const addTransferItem = (equipment: Equipment) => {
    const existingItem = transferItems.find(item => item.equipment.id === equipment.id);
    if (existingItem) {
      Alert.alert('Info', 'This item is already added to the transfer list');
      return;
    }

    setTransferItems([...transferItems, { equipment, quantity: 1 }]);
  };

  const updateItemQuantity = (index: number, quantity: number) => {
    const newItems = [...transferItems];
    const maxQuantity = newItems[index].equipment.stock_level;

    if (quantity > maxQuantity) {
      Alert.alert('Error', `Maximum available quantity is ${maxQuantity}`);
      return;
    }

    if (quantity <= 0) {
      removeTransferItem(index);
      return;
    }

    newItems[index].quantity = quantity;
    setTransferItems(newItems);
  };

  const removeTransferItem = (index: number) => {
    const newItems = transferItems.filter((_, i) => i !== index);
    setTransferItems(newItems);
  };

  const handleTransfer = async () => {
    if (!sourceWarehouse || !destinationWarehouse) {
      Alert.alert('Error', 'Please select both source and destination warehouses');
      return;
    }

    if (transferItems.length === 0) {
      Alert.alert('Error', 'Please add items to transfer');
      return;
    }

    try {
      setSaving(true);

      // Process each transfer item
      for (const item of transferItems) {
        const { equipment, quantity } = item;

        // Create movement record for source (out)
        await supabase.from('equipment_movements').insert([{
          equipment_id: equipment.id,
          movement_type: 'out',
          quantity: quantity,
          reason: 'Inter-warehouse transfer',
          destination: destinationWarehouse.name,
          notes: notes || `Transfer to ${destinationWarehouse.name}`,
          previous_stock: equipment.stock_level,
          new_stock: equipment.stock_level - quantity,
          timestamp: new Date().toISOString(),
        }]);

        // Update source equipment stock
        await supabase
          .from('equipment_inventory')
          .update({ stock_level: equipment.stock_level - quantity })
          .eq('id', equipment.id);

        // Check if equipment exists in destination warehouse
        const { data: destEquipmentArray } = await supabase
          .from('equipment_inventory')
          .select('*')
          .eq('name', equipment.name)
          .eq('warehouse_location', destinationWarehouse.name);

        const destEquipment = destEquipmentArray && destEquipmentArray.length > 0 ? destEquipmentArray[0] : null;

        if (destEquipment) {
          // Update existing equipment in destination
          const newStock = destEquipment.stock_level + quantity;

          await supabase
            .from('equipment_inventory')
            .update({ stock_level: newStock })
            .eq('id', destEquipment.id);

          // Create movement record for destination (in)
          await supabase.from('equipment_movements').insert([{
            equipment_id: destEquipment.id,
            movement_type: 'in',
            quantity: quantity,
            reason: 'Inter-warehouse transfer',
            destination: destinationWarehouse.name,
            notes: notes || `Transfer from ${sourceWarehouse.name}`,
            previous_stock: destEquipment.stock_level,
            new_stock: newStock,
            timestamp: new Date().toISOString(),
          }]);
        } else {
          // Create new equipment record in destination warehouse
          const { data: newEquipment } = await supabase
            .from('equipment_inventory')
            .insert([{
              name: equipment.name,
              type: equipment.type,
              stock_level: quantity,
              warehouse_location: destinationWarehouse.name,
              supplier: equipment.supplier,
              sku: equipment.sku,
              cost: equipment.cost,
              min_stock_level: equipment.min_stock_level,
              max_stock_level: equipment.max_stock_level,
              description: equipment.description,
            }])
            .select()
            .single();

          if (newEquipment) {
            // Create movement record for new equipment (in)
            await supabase.from('equipment_movements').insert([{
              equipment_id: newEquipment.id,
              movement_type: 'in',
              quantity: quantity,
              reason: 'Inter-warehouse transfer',
              destination: destinationWarehouse.name,
              notes: notes || `Transfer from ${sourceWarehouse.name}`,
              previous_stock: 0,
              new_stock: quantity,
              timestamp: new Date().toISOString(),
            }]);
          }
        }
      }

      Alert.alert(
        'Success',
        `Successfully transferred ${transferItems.length} item(s) from ${sourceWarehouse.name} to ${destinationWarehouse.name}`,
        [
          {
            text: 'OK',
            onPress: () => router.back(),
          },
        ]
      );
    } catch (error) {
      console.error('Error processing transfer:', error);
      Alert.alert('Error', 'Failed to process transfer');
    } finally {
      setSaving(false);
    }
  };

  const renderEquipmentItem = ({ item }: { item: Equipment }) => (
    <TouchableOpacity
      className="bg-white rounded-lg p-3 mb-2 border border-gray-200"
      onPress={() => addTransferItem(item)}
    >
      <View className="flex-row justify-between items-center">
        <View className="flex-1">
          <Text className="font-bold text-gray-800">{item.name}</Text>
          <Text className="text-gray-500 text-sm">Type: {item.type}</Text>
          <Text className="text-gray-500 text-sm">Available: {item.stock_level}</Text>
          {item.sku && (
            <Text className="text-gray-500 text-sm">SKU: {item.sku}</Text>
          )}
        </View>
        <View className="bg-blue-100 p-2 rounded-full">
          <Plus size={18} color="#1e40af" />
        </View>
      </View>
    </TouchableOpacity>
  );

  const renderTransferItem = ({ item, index }: { item: TransferItem; index: number }) => (
    <View className="bg-white rounded-lg p-3 mb-2 border border-gray-200">
      <View className="flex-row justify-between items-start">
        <View className="flex-1">
          <Text className="font-bold text-gray-800">{item.equipment.name}</Text>
          <Text className="text-gray-500 text-sm">Available: {item.equipment.stock_level}</Text>
        </View>
        <TouchableOpacity
          className="bg-red-100 p-2 rounded-full"
          onPress={() => removeTransferItem(index)}
        >
          <X size={18} color="#ef4444" />
        </TouchableOpacity>
      </View>

      <View className="flex-row items-center mt-2">
        <Text className="text-gray-700 mr-2">Quantity:</Text>
        <TouchableOpacity
          className="bg-gray-200 p-1 rounded"
          onPress={() => updateItemQuantity(index, item.quantity - 1)}
        >
          <Minus size={16} color="#4b5563" />
        </TouchableOpacity>
        <TextInput
          className="border border-gray-300 rounded px-2 mx-2 min-w-[40px] text-center"
          value={item.quantity.toString()}
          onChangeText={(text) => {
            const quantity = parseInt(text) || 0;
            updateItemQuantity(index, quantity);
          }}
          keyboardType="numeric"
        />
        <TouchableOpacity
          className="bg-gray-200 p-1 rounded"
          onPress={() => updateItemQuantity(index, item.quantity + 1)}
        >
          <Plus size={16} color="#4b5563" />
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderWarehouseItem = ({ item }: { item: Warehouse }) => (
    <TouchableOpacity
      className="p-4 border-b border-gray-200"
      onPress={() => selectWarehouse(item)}
    >
      <View className="flex-row items-center">
        <Building size={20} color="#3B82F6" />
        <View className="ml-3 flex-1">
          <Text className="font-bold text-gray-800">{item.name}</Text>
          {item.location && (
            <Text className="text-gray-500 text-sm">{item.location}</Text>
          )}
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
          <Text className="text-gray-600 mt-4">Loading warehouses...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      <StatusBar style="dark" />

      {/* Header */}
      <View className="px-6 py-6 bg-gradient-to-br from-purple-600 via-blue-600 to-indigo-700 shadow-2xl">
        <View className="flex-row justify-between items-center">
          <View className="flex-row items-center flex-1">
            <TouchableOpacity
              onPress={() => router.back()}
              className="bg-white/20 p-3 rounded-2xl mr-4 backdrop-blur-sm"
            >
              <ArrowLeft size={24} color="#ffffff" />
            </TouchableOpacity>
            <View className="flex-1">
              <Text className="text-2xl font-bold text-white">Warehouse Transfer</Text>
              <Text className="text-purple-100 text-sm">Transfer equipment between warehouses</Text>
            </View>
          </View>
          <TouchableOpacity
            className="bg-white/20 p-3 rounded-2xl backdrop-blur-sm"
            onPress={handleTransfer}
            disabled={saving || transferItems.length === 0}
          >
            {saving ? (
              <ActivityIndicator size={24} color="#ffffff" />
            ) : (
              <Truck size={24} color="#ffffff" />
            )}
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView className="flex-1 px-6 py-4">
        {/* Warehouse Selection */}
        <View className="bg-white rounded-xl p-4 mb-4 shadow-sm">
          <Text className="text-lg font-bold text-gray-800 mb-4">Select Warehouses</Text>

          <View className="flex-row items-center mb-4">
            <TouchableOpacity
              className="flex-1 border border-gray-200 rounded-lg p-3 mr-2"
              onPress={() => openWarehouseModal('source')}
            >
              <Text className="text-gray-500 text-sm mb-1">From</Text>
              <Text className={sourceWarehouse ? "text-gray-800 font-medium" : "text-gray-400"}>
                {sourceWarehouse?.name || "Select source warehouse"}
              </Text>
            </TouchableOpacity>

            <ArrowRight size={24} color="#6B7280" />

            <TouchableOpacity
              className="flex-1 border border-gray-200 rounded-lg p-3 ml-2"
              onPress={() => openWarehouseModal('destination')}
            >
              <Text className="text-gray-500 text-sm mb-1">To</Text>
              <Text className={destinationWarehouse ? "text-gray-800 font-medium" : "text-gray-400"}>
                {destinationWarehouse?.name || "Select destination warehouse"}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Equipment Selection */}
        {sourceWarehouse && (
          <View className="bg-white rounded-xl p-4 mb-4 shadow-sm">
            <Text className="text-lg font-bold text-gray-800 mb-4">Available Equipment</Text>

            <View className="flex-row items-center bg-gray-100 rounded-lg px-3 py-2 mb-3">
              <Search size={20} color="#4b5563" />
              <TextInput
                className="flex-1 ml-2"
                placeholder="Search equipment..."
                value={searchQuery}
                onChangeText={setSearchQuery}
              />
            </View>

            {filteredEquipment.length > 0 ? (
              <View className="max-h-60">
                <FlatList
                  data={filteredEquipment}
                  renderItem={renderEquipmentItem}
                  keyExtractor={(item) => item.id}
                  nestedScrollEnabled
                />
              </View>
            ) : (
              <View className="py-4 items-center">
                <Package size={24} color="#9ca3af" />
                <Text className="text-gray-500 mt-2">No equipment found</Text>
              </View>
            )}
          </View>
        )}

        {/* Transfer Items */}
        {transferItems.length > 0 && (
          <View className="bg-white rounded-xl p-4 mb-4 shadow-sm">
            <Text className="text-lg font-bold text-gray-800 mb-4">Items to Transfer</Text>

            <FlatList
              data={transferItems}
              renderItem={renderTransferItem}
              keyExtractor={(item, index) => `${item.equipment.id}-${index}`}
              scrollEnabled={false}
            />
          </View>
        )}

        {/* Notes */}
        <View className="bg-white rounded-xl p-4 mb-4 shadow-sm">
          <Text className="text-lg font-bold text-gray-800 mb-4">Transfer Notes</Text>

          <TextInput
            className="border border-gray-200 rounded-lg px-3 py-3"
            placeholder="Enter transfer notes (optional)"
            value={notes}
            onChangeText={setNotes}
            multiline
            numberOfLines={3}
            textAlignVertical="top"
          />
        </View>

        {/* Transfer Button */}
        {sourceWarehouse && destinationWarehouse && transferItems.length > 0 && (
          <TouchableOpacity
            className={`bg-purple-600 rounded-xl p-4 flex-row items-center justify-center mb-6 ${
              saving ? 'opacity-50' : ''
            }`}
            onPress={handleTransfer}
            disabled={saving}
          >
            {saving ? (
              <ActivityIndicator size="small" color="#ffffff" />
            ) : (
              <>
                <Truck size={20} color="#ffffff" />
                <Text className="text-white font-bold text-lg ml-2">
                  Transfer {transferItems.length} Item(s)
                </Text>
              </>
            )}
          </TouchableOpacity>
        )}
      </ScrollView>

      {/* Warehouse Selection Modal */}
      <Modal
        visible={showWarehouseModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowWarehouseModal(false)}
      >
        <View className="flex-1 bg-white">
          <View className="flex-row justify-between items-center px-6 py-4 border-b border-gray-200">
            <TouchableOpacity onPress={() => setShowWarehouseModal(false)}>
              <X size={24} color="#6B7280" />
            </TouchableOpacity>
            <Text className="text-xl font-bold text-gray-800">
              Select {warehouseModalType === 'source' ? 'Source' : 'Destination'} Warehouse
            </Text>
            <View style={{ width: 24 }} />
          </View>

          <FlatList
            data={warehouses}
            renderItem={renderWarehouseItem}
            keyExtractor={(item) => item.id}
            contentContainerStyle={{ padding: 16 }}
          />
        </View>
      </Modal>
    </SafeAreaView>
  );
}
