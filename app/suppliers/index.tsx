import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  TextInput,
  Alert,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useRouter } from 'expo-router';
import {
  ArrowLeft,
  Plus,
  Search,
  Building2,
  Phone,
  Mail,
  Edit,
  Trash2,
  Globe,
  User,
} from 'lucide-react-native';
import { supabase } from '../../lib/supabase';

type Supplier = {
  id: string;
  name: string;
  contact_person?: string;
  phone?: string;
  email?: string;
  address?: string;
  website?: string;
  notes?: string;
  created_at: string;
};

export default function SuppliersScreen() {
  const router = useRouter();
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchSuppliers();
  }, []);

  const fetchSuppliers = async () => {
    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .from('suppliers')
        .select('*')
        .order('name');

      if (error) throw error;

      setSuppliers(data || []);
    } catch (error) {
      console.error('Error fetching suppliers:', error);
      Alert.alert('Error', 'Failed to load suppliers');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchSuppliers();
  };

  const handleDelete = (supplier: Supplier) => {
    Alert.alert(
      'Delete Supplier',
      `Are you sure you want to delete "${supplier.name}"? This action cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => performDelete(supplier.id),
        },
      ]
    );
  };

  const performDelete = async (supplierId: string) => {
    try {
      const { error } = await supabase
        .from('suppliers')
        .delete()
        .eq('id', supplierId);

      if (error) throw error;

      Alert.alert('Success', 'Supplier deleted successfully');
      fetchSuppliers();
    } catch (error) {
      console.error('Error deleting supplier:', error);
      Alert.alert('Error', 'Failed to delete supplier');
    }
  };

  const filteredSuppliers = suppliers.filter(supplier =>
    supplier.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    supplier.contact_person?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    supplier.email?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const renderSupplierItem = ({ item }: { item: Supplier }) => (
    <View className="bg-white rounded-xl p-4 mb-4 shadow-sm border border-gray-100">
      <View className="flex-row items-start justify-between mb-3">
        <View className="flex-1">
          <View className="flex-row items-center mb-2">
            <Building2 size={20} color="#3B82F6" />
            <Text className="font-bold text-lg text-gray-800 ml-2 flex-1">{item.name}</Text>
          </View>
          
          {item.contact_person && (
            <View className="flex-row items-center mb-1">
              <User size={16} color="#6B7280" />
              <Text className="text-gray-600 text-sm ml-2">{item.contact_person}</Text>
            </View>
          )}
          
          {item.phone && (
            <View className="flex-row items-center mb-1">
              <Phone size={16} color="#6B7280" />
              <Text className="text-gray-600 text-sm ml-2">{item.phone}</Text>
            </View>
          )}
          
          {item.email && (
            <View className="flex-row items-center mb-1">
              <Mail size={16} color="#6B7280" />
              <Text className="text-gray-600 text-sm ml-2">{item.email}</Text>
            </View>
          )}
          
          {item.website && (
            <View className="flex-row items-center mb-1">
              <Globe size={16} color="#6B7280" />
              <Text className="text-gray-600 text-sm ml-2">{item.website}</Text>
            </View>
          )}
        </View>
        
        <View className="flex-row items-center">
          <TouchableOpacity
            className="bg-blue-50 p-2 rounded-lg mr-2"
            onPress={() => router.push(`/suppliers/edit/${item.id}`)}
          >
            <Edit size={16} color="#3B82F6" />
          </TouchableOpacity>
          <TouchableOpacity
            className="bg-red-50 p-2 rounded-lg"
            onPress={() => handleDelete(item)}
          >
            <Trash2 size={16} color="#EF4444" />
          </TouchableOpacity>
        </View>
      </View>
      
      {item.notes && (
        <View className="bg-gray-50 rounded-lg p-3 mt-2">
          <Text className="text-gray-700 text-sm">{item.notes}</Text>
        </View>
      )}
    </View>
  );

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
              <Text className="text-2xl font-bold text-white">Suppliers</Text>
              <Text className="text-blue-100 text-sm">Manage supplier database</Text>
            </View>
          </View>
          <TouchableOpacity
            className="bg-white/20 p-3 rounded-2xl backdrop-blur-sm"
            onPress={() => router.push('/suppliers/create')}
          >
            <Plus size={24} color="#ffffff" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Search */}
      <View className="px-6 py-4 bg-white border-b border-gray-200">
        <View className="flex-row items-center bg-gray-100 rounded-lg px-3 py-2">
          <Search size={20} color="#6B7280" />
          <TextInput
            className="flex-1 ml-2 text-gray-800"
            placeholder="Search suppliers..."
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
      </View>

      {/* Suppliers List */}
      {loading ? (
        <View className="flex-1 justify-center items-center">
          <ActivityIndicator size="large" color="#3B82F6" />
          <Text className="text-gray-600 mt-4">Loading suppliers...</Text>
        </View>
      ) : filteredSuppliers.length > 0 ? (
        <FlatList
          data={filteredSuppliers}
          renderItem={renderSupplierItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ padding: 16 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          showsVerticalScrollIndicator={false}
        />
      ) : (
        <View className="flex-1 justify-center items-center px-8">
          <Building2 size={64} color="#d1d5db" />
          <Text className="text-gray-500 text-xl font-semibold mt-4">
            {searchQuery ? 'No Suppliers Found' : 'No Suppliers Yet'}
          </Text>
          <Text className="text-gray-400 text-center mt-2">
            {searchQuery 
              ? "No suppliers match your search criteria"
              : "Add your first supplier to get started"
            }
          </Text>
          {!searchQuery && (
            <TouchableOpacity
              className="bg-blue-500 rounded-lg px-6 py-3 mt-6"
              onPress={() => router.push('/suppliers/create')}
            >
              <Text className="text-white font-medium">Add First Supplier</Text>
            </TouchableOpacity>
          )}
        </View>
      )}
    </SafeAreaView>
  );
}
