import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useRouter, useLocalSearchParams } from 'expo-router';
import {
  ArrowLeft,
  ShoppingCart,
  Package,
  DollarSign,
  Calendar,
  Building2,
  Plus,
  Minus,
  FileText,
} from 'lucide-react-native';
import { supabase } from '../../lib/supabase';
import { formatCurrency } from '../../lib/utils';

type EquipmentItem = {
  id: string;
  name: string;
  type: string;
  stock_level: number;
  min_stock_level?: number;
  max_stock_level?: number;
  cost?: number;
  supplier?: string;
  sku?: string;
};

type Supplier = {
  id: string;
  name: string;
  contact_email?: string;
  contact_phone?: string;
};

export default function PurchaseOrderScreen() {
  const router = useRouter();
  const { item_id } = useLocalSearchParams();
  
  const [item, setItem] = useState<EquipmentItem | null>(null);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [selectedSupplier, setSelectedSupplier] = useState<string>('');
  const [quantity, setQuantity] = useState('1');
  const [unitPrice, setUnitPrice] = useState('');
  const [notes, setNotes] = useState('');
  const [urgency, setUrgency] = useState<'low' | 'medium' | 'high' | 'critical'>('medium');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (item_id) {
      fetchItemDetails();
    }
    fetchSuppliers();
  }, [item_id]);

  const fetchItemDetails = async () => {
    try {
      const { data, error } = await supabase
        .from('equipment_inventory')
        .select('*')
        .eq('id', item_id)
        .single();

      if (error) throw error;

      setItem(data);
      setUnitPrice(data.cost?.toString() || '');
      setSelectedSupplier(data.supplier || '');
      
      // Calculate suggested quantity
      if (data.max_stock_level && data.min_stock_level) {
        const suggestedQty = data.max_stock_level - data.stock_level;
        setQuantity(Math.max(1, suggestedQty).toString());
      }
    } catch (error) {
      console.error('Error fetching item details:', error);
      Alert.alert('Error', 'Failed to load item details');
    } finally {
      setLoading(false);
    }
  };

  const fetchSuppliers = async () => {
    try {
      const { data, error } = await supabase
        .from('suppliers')
        .select('*')
        .order('name');

      if (error) throw error;
      setSuppliers(data || []);
    } catch (error) {
      console.error('Error fetching suppliers:', error);
    }
  };

  const adjustQuantity = (delta: number) => {
    const currentQty = parseInt(quantity) || 0;
    const newQty = Math.max(1, currentQty + delta);
    setQuantity(newQty.toString());
  };

  const calculateTotal = () => {
    const qty = parseInt(quantity) || 0;
    const price = parseFloat(unitPrice) || 0;
    return qty * price;
  };

  const getUrgencyColor = (level: string) => {
    switch (level) {
      case 'low': return 'bg-green-100 text-green-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'high': return 'bg-orange-100 text-orange-800';
      case 'critical': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const handleSubmit = async () => {
    if (!item) {
      Alert.alert('Error', 'No item selected');
      return;
    }

    if (!selectedSupplier) {
      Alert.alert('Error', 'Please select a supplier');
      return;
    }

    if (!quantity || parseInt(quantity) <= 0) {
      Alert.alert('Error', 'Please enter a valid quantity');
      return;
    }

    if (!unitPrice || parseFloat(unitPrice) <= 0) {
      Alert.alert('Error', 'Please enter a valid unit price');
      return;
    }

    try {
      setSubmitting(true);

      const purchaseOrder = {
        equipment_id: item.id,
        supplier_id: selectedSupplier,
        quantity: parseInt(quantity),
        unit_price: parseFloat(unitPrice),
        total_amount: calculateTotal(),
        urgency,
        notes: notes || null,
        status: 'pending',
        created_at: new Date().toISOString(),
      };

      const { error } = await supabase
        .from('purchase_orders')
        .insert([purchaseOrder]);

      if (error) throw error;

      Alert.alert(
        'Success',
        'Purchase order created successfully',
        [
          {
            text: 'OK',
            onPress: () => router.back(),
          },
        ]
      );
    } catch (error) {
      console.error('Error creating purchase order:', error);
      Alert.alert('Error', 'Failed to create purchase order');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView className="flex-1 bg-gray-50">
        <StatusBar style="dark" />
        <View className="flex-1 justify-center items-center">
          <ActivityIndicator size="large" color="#3B82F6" />
          <Text className="text-gray-600 mt-4">Loading item details...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      <StatusBar style="dark" />

      {/* Header */}
      <View className="px-6 py-6 bg-gradient-to-br from-green-600 via-blue-600 to-purple-700 shadow-2xl">
        <View className="flex-row justify-between items-center">
          <View className="flex-row items-center flex-1">
            <TouchableOpacity
              onPress={() => router.back()}
              className="bg-white/20 p-3 rounded-2xl mr-4 backdrop-blur-sm"
            >
              <ArrowLeft size={24} color="#ffffff" />
            </TouchableOpacity>
            <View className="flex-1">
              <Text className="text-2xl font-bold text-white">Purchase Order</Text>
              <Text className="text-green-100 text-sm">Create new order</Text>
            </View>
          </View>
          <View className="bg-white/20 p-3 rounded-2xl backdrop-blur-sm">
            <ShoppingCart size={24} color="#ffffff" />
          </View>
        </View>
      </View>

      <ScrollView className="flex-1 px-6 py-4">
        {/* Item Information */}
        {item && (
          <View className="bg-white rounded-xl p-4 mb-4 shadow-sm">
            <Text className="text-lg font-bold text-gray-800 mb-3">Item Details</Text>
            <View className="flex-row items-center mb-2">
              <Package size={20} color="#3B82F6" />
              <Text className="text-gray-800 font-medium ml-2">{item.name}</Text>
            </View>
            <Text className="text-gray-600 text-sm mb-2">{item.type}</Text>
            <View className="flex-row justify-between">
              <Text className="text-gray-600 text-sm">Current Stock: {item.stock_level}</Text>
              <Text className="text-gray-600 text-sm">Min Level: {item.min_stock_level || 'N/A'}</Text>
            </View>
          </View>
        )}

        {/* Supplier Selection */}
        <View className="bg-white rounded-xl p-4 mb-4 shadow-sm">
          <Text className="text-lg font-bold text-gray-800 mb-3">Supplier</Text>
          <View className="space-y-2">
            {suppliers.map((supplier) => (
              <TouchableOpacity
                key={supplier.id}
                className={`p-3 rounded-lg border ${
                  selectedSupplier === supplier.id
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 bg-gray-50'
                }`}
                onPress={() => setSelectedSupplier(supplier.id)}
              >
                <View className="flex-row items-center">
                  <Building2 size={16} color={selectedSupplier === supplier.id ? '#3B82F6' : '#6B7280'} />
                  <Text className={`ml-2 font-medium ${
                    selectedSupplier === supplier.id ? 'text-blue-700' : 'text-gray-800'
                  }`}>
                    {supplier.name}
                  </Text>
                </View>
                {supplier.contact_email && (
                  <Text className="text-gray-500 text-sm mt-1">{supplier.contact_email}</Text>
                )}
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Quantity and Pricing */}
        <View className="bg-white rounded-xl p-4 mb-4 shadow-sm">
          <Text className="text-lg font-bold text-gray-800 mb-3">Order Details</Text>
          
          {/* Quantity */}
          <View className="mb-4">
            <Text className="text-gray-700 font-medium mb-2">Quantity</Text>
            <View className="flex-row items-center">
              <TouchableOpacity
                className="bg-gray-100 p-3 rounded-lg"
                onPress={() => adjustQuantity(-1)}
              >
                <Minus size={20} color="#6B7280" />
              </TouchableOpacity>
              <TextInput
                className="flex-1 mx-3 p-3 border border-gray-200 rounded-lg text-center font-bold text-lg"
                value={quantity}
                onChangeText={setQuantity}
                keyboardType="numeric"
                placeholder="0"
              />
              <TouchableOpacity
                className="bg-gray-100 p-3 rounded-lg"
                onPress={() => adjustQuantity(1)}
              >
                <Plus size={20} color="#6B7280" />
              </TouchableOpacity>
            </View>
          </View>

          {/* Unit Price */}
          <View className="mb-4">
            <Text className="text-gray-700 font-medium mb-2">Unit Price</Text>
            <View className="flex-row items-center">
              <DollarSign size={20} color="#6B7280" />
              <TextInput
                className="flex-1 ml-2 p-3 border border-gray-200 rounded-lg"
                value={unitPrice}
                onChangeText={setUnitPrice}
                keyboardType="decimal-pad"
                placeholder="0.00"
              />
            </View>
          </View>

          {/* Total */}
          <View className="bg-blue-50 p-3 rounded-lg">
            <View className="flex-row justify-between items-center">
              <Text className="text-blue-700 font-medium">Total Amount:</Text>
              <Text className="text-blue-800 font-bold text-xl">
                {formatCurrency(calculateTotal())}
              </Text>
            </View>
          </View>
        </View>

        {/* Urgency */}
        <View className="bg-white rounded-xl p-4 mb-4 shadow-sm">
          <Text className="text-lg font-bold text-gray-800 mb-3">Urgency Level</Text>
          <View className="flex-row flex-wrap">
            {(['low', 'medium', 'high', 'critical'] as const).map((level) => (
              <TouchableOpacity
                key={level}
                className={`px-4 py-2 rounded-full mr-2 mb-2 ${
                  urgency === level ? getUrgencyColor(level) : 'bg-gray-100 text-gray-600'
                }`}
                onPress={() => setUrgency(level)}
              >
                <Text className={`font-medium capitalize ${
                  urgency === level ? '' : 'text-gray-600'
                }`}>
                  {level}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Notes */}
        <View className="bg-white rounded-xl p-4 mb-4 shadow-sm">
          <Text className="text-lg font-bold text-gray-800 mb-3">Notes</Text>
          <TextInput
            className="p-3 border border-gray-200 rounded-lg"
            value={notes}
            onChangeText={setNotes}
            placeholder="Additional notes or special requirements..."
            multiline
            numberOfLines={3}
            textAlignVertical="top"
          />
        </View>

        {/* Submit Button */}
        <TouchableOpacity
          className={`bg-green-600 rounded-xl p-4 flex-row items-center justify-center mb-6 ${
            submitting ? 'opacity-50' : ''
          }`}
          onPress={handleSubmit}
          disabled={submitting}
        >
          {submitting ? (
            <ActivityIndicator size="small" color="#ffffff" />
          ) : (
            <>
              <FileText size={20} color="#ffffff" />
              <Text className="text-white font-bold text-lg ml-2">Create Purchase Order</Text>
            </>
          )}
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}
