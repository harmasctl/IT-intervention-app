import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
  Alert,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useRouter } from 'expo-router';
import {
  ArrowLeft,
  ArrowRightLeft,
  Package,
  Building2,
  User,
  Calendar,
  Search,
  Filter,
  Plus,
} from 'lucide-react-native';
import { supabase } from '../../lib/supabase';
import { formatDistanceToNow, format } from 'date-fns';

type TransferRecord = {
  id: string;
  device_id: string;
  from_restaurant_id: string | null;
  to_restaurant_id: string;
  transferred_by: string | null;
  transferred_at: string;
  notes: string | null;
  device?: { name: string; serial_number: string; type: string };
  from_restaurant?: { name: string };
  to_restaurant?: { name: string };
  transferred_by_user?: { name: string; email: string };
};

export default function DeviceTransfersScreen() {
  const router = useRouter();
  const [transfers, setTransfers] = useState<TransferRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchTransfers();
  }, []);

  const fetchTransfers = async () => {
    try {
      setLoading(true);

      const { data, error } = await supabase
        .from('device_transfer_history')
        .select(`
          *,
          device:devices(name, serial_number, type),
          from_restaurant:restaurants!from_restaurant_id(name),
          to_restaurant:restaurants!to_restaurant_id(name),
          transferred_by_user:users!transferred_by(name, email)
        `)
        .order('transferred_at', { ascending: false })
        .limit(100);

      if (error) {
        console.error('Error fetching transfers:', error);
        Alert.alert('Error', 'Failed to load transfer history');
        return;
      }

      setTransfers(data || []);
    } catch (error) {
      console.error('Exception fetching transfers:', error);
      Alert.alert('Error', 'An unexpected error occurred');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchTransfers();
  };

  const filteredTransfers = transfers.filter(transfer =>
    transfer.device?.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    transfer.from_restaurant?.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    transfer.to_restaurant?.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    transfer.transferred_by_user?.name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const renderTransferItem = (transfer: TransferRecord) => (
    <View key={transfer.id} className="bg-white rounded-xl p-4 mb-4 shadow-sm border border-gray-100">
      <View className="flex-row items-center justify-between mb-3">
        <View className="flex-row items-center">
          <View className="bg-orange-100 p-2 rounded-lg mr-3">
            <ArrowRightLeft size={20} color="#ea580c" />
          </View>
          <View className="flex-1">
            <Text className="font-bold text-gray-800 text-lg">
              {transfer.device?.name || 'Unknown Device'}
            </Text>
            <Text className="text-gray-600 text-sm">
              {transfer.device?.type} • S/N: {transfer.device?.serial_number}
            </Text>
          </View>
        </View>
        <Text className="text-gray-500 text-xs">
          {format(new Date(transfer.transferred_at), 'MMM dd, yyyy')}
        </Text>
      </View>

      <View className="flex-row items-center mb-3">
        <View className="flex-1">
          <Text className="text-gray-600 text-sm mb-1">From</Text>
          <View className="flex-row items-center">
            <Building2 size={16} color="#6b7280" />
            <Text className="text-gray-800 font-medium ml-2">
              {transfer.from_restaurant?.name || 'Unassigned'}
            </Text>
          </View>
        </View>

        <View className="mx-4">
          <ArrowRightLeft size={20} color="#ea580c" />
        </View>

        <View className="flex-1">
          <Text className="text-gray-600 text-sm mb-1">To</Text>
          <View className="flex-row items-center">
            <Building2 size={16} color="#6b7280" />
            <Text className="text-gray-800 font-medium ml-2">
              {transfer.to_restaurant?.name || 'Unknown'}
            </Text>
          </View>
        </View>
      </View>

      {transfer.transferred_by_user && (
        <View className="flex-row items-center mb-2">
          <User size={14} color="#6b7280" />
          <Text className="text-gray-600 text-sm ml-2">
            Transferred by {transfer.transferred_by_user.name || transfer.transferred_by_user.email}
          </Text>
        </View>
      )}

      {transfer.notes && (
        <View className="bg-gray-50 rounded-lg p-3 mt-2">
          <Text className="text-gray-700 text-sm">{transfer.notes}</Text>
        </View>
      )}

      <Text className="text-gray-400 text-xs mt-2">
        {formatDistanceToNow(new Date(transfer.transferred_at), { addSuffix: true })}
      </Text>
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
              <Text className="text-2xl font-bold text-white">Device Transfers</Text>
              <Text className="text-orange-100 text-sm">Movement history & management</Text>
            </View>
          </View>
          <View className="bg-white/20 p-3 rounded-2xl backdrop-blur-sm">
            <ArrowRightLeft size={24} color="#ffffff" />
          </View>
        </View>
      </View>

      {/* Search and Actions */}
      <View className="px-6 py-4 bg-white border-b border-gray-200">
        <View className="flex-row items-center space-x-3">
          <View className="flex-1 flex-row items-center bg-gray-100 rounded-lg px-3 py-2">
            <Search size={20} color="#6B7280" />
            <TextInput
              className="flex-1 ml-2 text-gray-800"
              placeholder="Search transfers..."
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
          </View>

          <TouchableOpacity
            className="bg-orange-500 p-2 rounded-lg"
            onPress={() => router.push('/devices')}
          >
            <Plus size={20} color="#ffffff" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Transfer Statistics */}
      <View className="px-6 py-4 bg-white">
        <Text className="text-lg font-bold text-gray-800 mb-3">Transfer Statistics</Text>
        <View className="flex-row justify-between">
          <View className="bg-orange-50 rounded-xl p-4 flex-1 mr-2">
            <Text className="text-orange-600 font-bold text-2xl">{transfers.length}</Text>
            <Text className="text-orange-700 text-sm">Total Transfers</Text>
          </View>
          <View className="bg-blue-50 rounded-xl p-4 flex-1 ml-2">
            <Text className="text-blue-600 font-bold text-2xl">
              {transfers.filter(t =>
                new Date(t.transferred_at) > new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
              ).length}
            </Text>
            <Text className="text-blue-700 text-sm">Last 30 Days</Text>
          </View>
        </View>
      </View>

      {/* Transfer List */}
      <ScrollView
        className="flex-1 px-6"
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {loading ? (
          <View className="flex-1 justify-center items-center py-20">
            <ActivityIndicator size="large" color="#ea580c" />
            <Text className="text-gray-600 mt-4">Loading transfer history...</Text>
          </View>
        ) : filteredTransfers.length > 0 ? (
          <View className="py-4">
            {filteredTransfers.map(renderTransferItem)}
          </View>
        ) : (
          <View className="flex-1 justify-center items-center py-20">
            <ArrowRightLeft size={64} color="#d1d5db" />
            <Text className="text-gray-500 text-xl font-semibold mt-4">No Transfers Found</Text>
            <Text className="text-gray-400 text-center mt-2 mx-8">
              {searchQuery
                ? "No transfers match your search criteria"
                : "No device transfers have been recorded yet"
              }
            </Text>
            {!searchQuery && (
              <TouchableOpacity
                className="bg-orange-500 rounded-lg px-6 py-3 mt-6"
                onPress={() => router.push('/devices')}
              >
                <Text className="text-white font-medium">View Devices</Text>
              </TouchableOpacity>
            )}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
