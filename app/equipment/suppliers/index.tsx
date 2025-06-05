import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  Alert,
  ActivityIndicator,
  TextInput,
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
  MapPin,
  Edit,
  Trash2,
  User,
} from 'lucide-react-native';
import { supabase } from '../../../lib/supabase';

type Supplier = {
  id: string;
  name: string;
  contact_person?: string;
  phone?: string;
  email?: string;
  address?: string;
  created_at: string;
};

export default function SuppliersScreen() {
  const router = useRouter();
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [filteredSuppliers, setFilteredSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchSuppliers();

    // Set up real-time subscription for supplier changes
    const supplierSubscription = supabase
      .channel("supplier-changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "suppliers" },
        (payload) => {
          console.log("Supplier change received:", payload);
          fetchSuppliers();
        },
      )
      .subscribe();

    return () => {
      supplierSubscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    filterSuppliers();
  }, [searchQuery, suppliers]);

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

  const filterSuppliers = () => {
    if (!searchQuery.trim()) {
      setFilteredSuppliers(suppliers);
      return;
    }

    const query = searchQuery.toLowerCase();
    const filtered = suppliers.filter(supplier =>
      supplier.name.toLowerCase().includes(query) ||
      supplier.contact_person?.toLowerCase().includes(query) ||
      supplier.email?.toLowerCase().includes(query) ||
      supplier.phone?.includes(query)
    );

    setFilteredSuppliers(filtered);
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchSuppliers();
  };

  const handleDeleteSupplier = (supplier: Supplier) => {
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
      // First check if supplier is referenced in equipment
      const { data: equipmentCheck, error: checkError } = await supabase
        .from('equipment_inventory')
        .select('id, name')
        .eq('supplier', suppliers.find(s => s.id === supplierId)?.name)
        .limit(1);

      if (checkError) {
        console.error('Error checking equipment references:', checkError);
      }

      if (equipmentCheck && equipmentCheck.length > 0) {
        Alert.alert(
          'Cannot Delete Supplier',
          'This supplier is referenced by equipment items. Please update or remove the equipment references first.',
          [{ text: 'OK' }]
        );
        return;
      }

      const { error } = await supabase
        .from('suppliers')
        .delete()
        .eq('id', supplierId);

      if (error) {
        console.error('Delete error details:', error);
        throw error;
      }

      Alert.alert('Success', 'Supplier deleted successfully');
      // Force refresh the list
      setTimeout(() => {
        fetchSuppliers();
      }, 100);
    } catch (error: any) {
      console.error('Error deleting supplier:', error);
      Alert.alert(
        'Error',
        error.message || 'Failed to delete supplier. Please try again.'
      );
    }
  };

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
              <Text className="text-gray-600 ml-2">{item.contact_person}</Text>
            </View>
          )}

          {item.phone && (
            <View className="flex-row items-center mb-1">
              <Phone size={16} color="#6B7280" />
              <Text className="text-gray-600 ml-2">{item.phone}</Text>
            </View>
          )}

          {item.email && (
            <View className="flex-row items-center mb-1">
              <Mail size={16} color="#6B7280" />
              <Text className="text-gray-600 ml-2">{item.email}</Text>
            </View>
          )}

          {item.address && (
            <View className="flex-row items-start mb-1">
              <MapPin size={16} color="#6B7280" className="mt-0.5" />
              <Text className="text-gray-600 ml-2 flex-1">{item.address}</Text>
            </View>
          )}
        </View>
      </View>

      <View className="flex-row space-x-2 mt-3">
        <TouchableOpacity
          className="flex-1 bg-blue-50 rounded-lg p-3 flex-row items-center justify-center"
          onPress={() => router.push(`/equipment/suppliers/edit/${item.id}`)}
        >
          <Edit size={16} color="#3B82F6" />
          <Text className="text-blue-600 font-medium ml-2">Edit</Text>
        </TouchableOpacity>

        <TouchableOpacity
          className="flex-1 bg-red-50 rounded-lg p-3 flex-row items-center justify-center"
          onPress={() => handleDeleteSupplier(item)}
        >
          <Trash2 size={16} color="#EF4444" />
          <Text className="text-red-600 font-medium ml-2">Delete</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      <StatusBar style="dark" />

      {/* Header */}
      <View className="px-6 py-6 bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-700 shadow-2xl">
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
              <Text className="text-blue-100 text-sm">Manage supplier information</Text>
            </View>
          </View>
          <TouchableOpacity
            className="bg-white/20 p-3 rounded-2xl backdrop-blur-sm"
            onPress={() => router.push('/equipment/suppliers/create')}
          >
            <Plus size={24} color="#ffffff" />
          </TouchableOpacity>
        </View>

        {/* Search Bar */}
        <View className="flex-row items-center bg-white/20 rounded-xl mt-4 px-4 py-3 backdrop-blur-sm">
          <Search size={20} color="#ffffff" />
          <TextInput
            className="flex-1 ml-3 text-white placeholder-white/70"
            placeholder="Search suppliers..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholderTextColor="rgba(255,255,255,0.7)"
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
            {searchQuery ? 'No suppliers found' : 'No suppliers yet'}
          </Text>
          <Text className="text-gray-400 text-center mt-2">
            {searchQuery
              ? 'Try adjusting your search terms'
              : 'Add your first supplier to get started'
            }
          </Text>
          <TouchableOpacity
            className="bg-blue-600 rounded-lg px-6 py-3 mt-6"
            onPress={() => router.push('/equipment/suppliers/create')}
          >
            <Text className="text-white font-medium">Add Supplier</Text>
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
  );
}
