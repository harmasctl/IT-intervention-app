import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useRouter, useLocalSearchParams } from 'expo-router';
import {
  ArrowLeft,
  Save,
  Package,
  Tag,
  DollarSign,
  MapPin,
  Building2,
  FileText,
  AlertTriangle,
  TrendingUp,
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
};

export default function EditEquipmentScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [equipment, setEquipment] = useState<EquipmentItem | null>(null);
  
  const [formData, setFormData] = useState({
    name: '',
    type: '',
    stock_level: '',
    warehouse_location: '',
    supplier: '',
    sku: '',
    cost: '',
    min_stock_level: '',
    max_stock_level: '',
    description: '',
  });

  const [typeOptions, setTypeOptions] = useState<{ id: string; name: string }[]>([]);
  const [supplierOptions, setSupplierOptions] = useState<{ id: string; name: string }[]>([]);
  const [warehouseOptions, setWarehouseOptions] = useState<{ id: string; name: string }[]>([]);

  useEffect(() => {
    if (id) {
      fetchEquipment();
      fetchOptions();
    }
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

      if (data) {
        setEquipment(data as EquipmentItem);
        setFormData({
          name: data.name || '',
          type: data.type || '',
          stock_level: data.stock_level?.toString() || '',
          warehouse_location: data.warehouse_location || '',
          supplier: data.supplier || '',
          sku: data.sku || '',
          cost: data.cost?.toString() || '',
          min_stock_level: data.min_stock_level?.toString() || '',
          max_stock_level: data.max_stock_level?.toString() || '',
          description: data.description || '',
        });
      }
    } catch (error) {
      console.error('Error fetching equipment:', error);
      Alert.alert('Error', 'Failed to load equipment details');
      router.back();
    } finally {
      setLoading(false);
    }
  };

  const fetchOptions = async () => {
    try {
      // Fetch equipment types
      const { data: types } = await supabase
        .from('equipment_types')
        .select('id, name')
        .order('name');

      // Fetch suppliers
      const { data: suppliers } = await supabase
        .from('suppliers')
        .select('id, name')
        .order('name');

      // Fetch warehouses
      const { data: warehouses } = await supabase
        .from('warehouses')
        .select('id, name')
        .order('name');

      setTypeOptions(types || []);
      setSupplierOptions(suppliers || []);
      setWarehouseOptions(warehouses || []);
    } catch (error) {
      console.error('Error fetching options:', error);
    }
  };

  const handleSave = async () => {
    if (!formData.name.trim()) {
      Alert.alert('Error', 'Please enter equipment name');
      return;
    }

    if (!formData.type) {
      Alert.alert('Error', 'Please select equipment type');
      return;
    }

    if (!formData.stock_level || isNaN(parseInt(formData.stock_level))) {
      Alert.alert('Error', 'Please enter a valid stock level');
      return;
    }

    try {
      setSaving(true);

      const updateData = {
        name: formData.name.trim(),
        type: formData.type,
        stock_level: parseInt(formData.stock_level),
        warehouse_location: formData.warehouse_location || null,
        supplier: formData.supplier || null,
        sku: formData.sku || null,
        cost: formData.cost ? parseFloat(formData.cost) : null,
        min_stock_level: formData.min_stock_level ? parseInt(formData.min_stock_level) : null,
        max_stock_level: formData.max_stock_level ? parseInt(formData.max_stock_level) : null,
        description: formData.description || null,
      };

      const { error } = await supabase
        .from('equipment_inventory')
        .update(updateData)
        .eq('id', id);

      if (error) throw error;

      Alert.alert(
        'Success',
        'Equipment updated successfully',
        [
          {
            text: 'OK',
            onPress: () => router.back(),
          },
        ]
      );
    } catch (error) {
      console.error('Error updating equipment:', error);
      Alert.alert('Error', 'Failed to update equipment');
    } finally {
      setSaving(false);
    }
  };

  const updateFormData = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

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
              <Text className="text-2xl font-bold text-white">Edit Equipment</Text>
              <Text className="text-blue-100 text-sm">Update equipment information</Text>
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
        {/* Basic Information */}
        <View className="bg-white rounded-xl p-4 mb-4 shadow-sm">
          <Text className="text-lg font-bold text-gray-800 mb-4">Basic Information</Text>
          
          <View className="mb-4">
            <Text className="text-gray-700 font-medium mb-2">Equipment Name *</Text>
            <View className="flex-row items-center border border-gray-200 rounded-lg px-3 py-3">
              <Package size={20} color="#6B7280" />
              <TextInput
                className="flex-1 ml-3 text-gray-800"
                placeholder="Enter equipment name"
                value={formData.name}
                onChangeText={(text) => updateFormData('name', text)}
              />
            </View>
          </View>

          <View className="mb-4">
            <Text className="text-gray-700 font-medium mb-2">Type *</Text>
            <View className="flex-row items-center border border-gray-200 rounded-lg px-3 py-3">
              <Tag size={20} color="#6B7280" />
              <TextInput
                className="flex-1 ml-3 text-gray-800"
                placeholder="Enter equipment type"
                value={formData.type}
                onChangeText={(text) => updateFormData('type', text)}
              />
            </View>
          </View>

          <View className="mb-4">
            <Text className="text-gray-700 font-medium mb-2">SKU</Text>
            <TextInput
              className="border border-gray-200 rounded-lg px-4 py-3 text-gray-800"
              placeholder="Enter SKU"
              value={formData.sku}
              onChangeText={(text) => updateFormData('sku', text)}
            />
          </View>
        </View>

        {/* Stock Information */}
        <View className="bg-white rounded-xl p-4 mb-4 shadow-sm">
          <Text className="text-lg font-bold text-gray-800 mb-4">Stock Information</Text>
          
          <View className="mb-4">
            <Text className="text-gray-700 font-medium mb-2">Current Stock Level *</Text>
            <View className="flex-row items-center border border-gray-200 rounded-lg px-3 py-3">
              <TrendingUp size={20} color="#6B7280" />
              <TextInput
                className="flex-1 ml-3 text-gray-800"
                placeholder="Enter stock level"
                value={formData.stock_level}
                onChangeText={(text) => updateFormData('stock_level', text)}
                keyboardType="numeric"
              />
            </View>
          </View>

          <View className="mb-4">
            <Text className="text-gray-700 font-medium mb-2">Minimum Stock Level</Text>
            <View className="flex-row items-center border border-gray-200 rounded-lg px-3 py-3">
              <AlertTriangle size={20} color="#6B7280" />
              <TextInput
                className="flex-1 ml-3 text-gray-800"
                placeholder="Enter minimum stock level"
                value={formData.min_stock_level}
                onChangeText={(text) => updateFormData('min_stock_level', text)}
                keyboardType="numeric"
              />
            </View>
          </View>

          <View className="mb-4">
            <Text className="text-gray-700 font-medium mb-2">Maximum Stock Level</Text>
            <TextInput
              className="border border-gray-200 rounded-lg px-4 py-3 text-gray-800"
              placeholder="Enter maximum stock level"
              value={formData.max_stock_level}
              onChangeText={(text) => updateFormData('max_stock_level', text)}
              keyboardType="numeric"
            />
          </View>

          <View className="mb-4">
            <Text className="text-gray-700 font-medium mb-2">Cost per Unit</Text>
            <View className="flex-row items-center border border-gray-200 rounded-lg px-3 py-3">
              <DollarSign size={20} color="#6B7280" />
              <TextInput
                className="flex-1 ml-3 text-gray-800"
                placeholder="Enter cost per unit"
                value={formData.cost}
                onChangeText={(text) => updateFormData('cost', text)}
                keyboardType="decimal-pad"
              />
            </View>
          </View>
        </View>

        {/* Location & Supplier */}
        <View className="bg-white rounded-xl p-4 mb-4 shadow-sm">
          <Text className="text-lg font-bold text-gray-800 mb-4">Location & Supplier</Text>
          
          <View className="mb-4">
            <Text className="text-gray-700 font-medium mb-2">Warehouse Location</Text>
            <View className="flex-row items-center border border-gray-200 rounded-lg px-3 py-3">
              <MapPin size={20} color="#6B7280" />
              <TextInput
                className="flex-1 ml-3 text-gray-800"
                placeholder="Enter warehouse location"
                value={formData.warehouse_location}
                onChangeText={(text) => updateFormData('warehouse_location', text)}
              />
            </View>
          </View>

          <View className="mb-4">
            <Text className="text-gray-700 font-medium mb-2">Supplier</Text>
            <View className="flex-row items-center border border-gray-200 rounded-lg px-3 py-3">
              <Building2 size={20} color="#6B7280" />
              <TextInput
                className="flex-1 ml-3 text-gray-800"
                placeholder="Enter supplier name"
                value={formData.supplier}
                onChangeText={(text) => updateFormData('supplier', text)}
              />
            </View>
          </View>
        </View>

        {/* Description */}
        <View className="bg-white rounded-xl p-4 mb-6 shadow-sm">
          <Text className="text-lg font-bold text-gray-800 mb-4">Description</Text>
          
          <View className="mb-4">
            <Text className="text-gray-700 font-medium mb-2">Notes</Text>
            <View className="flex-row items-start border border-gray-200 rounded-lg px-3 py-3">
              <FileText size={20} color="#6B7280" className="mt-1" />
              <TextInput
                className="flex-1 ml-3 text-gray-800"
                placeholder="Enter description or notes"
                value={formData.description}
                onChangeText={(text) => updateFormData('description', text)}
                multiline
                numberOfLines={4}
                textAlignVertical="top"
              />
            </View>
          </View>
        </View>

        {/* Save Button */}
        <TouchableOpacity
          className={`bg-blue-600 rounded-xl p-4 flex-row items-center justify-center mb-6 ${
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
              <Text className="text-white font-bold text-lg ml-2">Update Equipment</Text>
            </>
          )}
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}
