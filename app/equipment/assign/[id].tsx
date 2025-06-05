import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
  FlatList,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useRouter, useLocalSearchParams } from 'expo-router';
import {
  ArrowLeft,
  Save,
  MapPin,
  Building,
  Package,
  Calendar,
  User,
  X,
  CheckCircle,
} from 'lucide-react-native';
import { supabase } from '../../../lib/supabase';

type Equipment = {
  id: string;
  name: string;
  type: string;
  sku?: string;
  image_url?: string;
  assigned_restaurant?: string;
  assigned_date?: string;
};

type Restaurant = {
  id: string;
  name: string;
  address?: string;
  phone?: string;
};

type Assignment = {
  id: string;
  equipment_id: string;
  restaurant_id: string;
  assigned_date: string;
  assigned_by: string;
  notes?: string;
  status: 'active' | 'returned';
};

export default function AssignEquipmentScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [equipment, setEquipment] = useState<Equipment | null>(null);
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [selectedRestaurant, setSelectedRestaurant] = useState<Restaurant | null>(null);
  const [showRestaurantModal, setShowRestaurantModal] = useState(false);
  const [assignmentHistory, setAssignmentHistory] = useState<Assignment[]>([]);
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (id) {
      fetchEquipment();
      fetchRestaurants();
      fetchAssignmentHistory();
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
      setEquipment(data as Equipment);
    } catch (error) {
      console.error('Error fetching equipment:', error);
      Alert.alert('Error', 'Failed to load equipment details');
      router.back();
    } finally {
      setLoading(false);
    }
  };

  const fetchRestaurants = async () => {
    try {
      const { data, error } = await supabase
        .from('restaurants')
        .select('*')
        .order('name');

      if (error) throw error;
      setRestaurants(data || []);
    } catch (error) {
      console.error('Error fetching restaurants:', error);
    }
  };

  const fetchAssignmentHistory = async () => {
    try {
      const { data, error } = await supabase
        .from('equipment_assignments')
        .select('*')
        .eq('equipment_id', id)
        .order('assigned_date', { ascending: false });

      if (error) throw error;
      setAssignmentHistory(data || []);
    } catch (error) {
      console.error('Error fetching assignment history:', error);
    }
  };

  const handleAssign = async () => {
    if (!selectedRestaurant) {
      Alert.alert('Error', 'Please select a restaurant');
      return;
    }

    try {
      setSaving(true);

      // Create assignment record
      const { error: assignError } = await supabase
        .from('equipment_assignments')
        .insert([{
          equipment_id: id,
          restaurant_id: selectedRestaurant.id,
          assigned_date: new Date().toISOString(),
          assigned_by: (await supabase.auth.getUser()).data.user?.id,
          notes: notes || null,
          status: 'active',
        }]);

      if (assignError) throw assignError;

      // Update equipment record
      const { error: updateError } = await supabase
        .from('equipment_inventory')
        .update({
          assigned_restaurant: selectedRestaurant.name,
          assigned_date: new Date().toISOString(),
        })
        .eq('id', id);

      if (updateError) throw updateError;

      Alert.alert(
        'Success',
        `Equipment assigned to ${selectedRestaurant.name} successfully`,
        [
          {
            text: 'OK',
            onPress: () => router.back(),
          },
        ]
      );
    } catch (error) {
      console.error('Error assigning equipment:', error);
      Alert.alert('Error', 'Failed to assign equipment');
    } finally {
      setSaving(false);
    }
  };

  const handleReturn = async () => {
    if (!equipment?.assigned_restaurant) {
      Alert.alert('Error', 'Equipment is not currently assigned');
      return;
    }

    Alert.alert(
      'Return Equipment',
      `Are you sure you want to return this equipment from ${equipment.assigned_restaurant}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Return',
          style: 'destructive',
          onPress: performReturn,
        },
      ]
    );
  };

  const performReturn = async () => {
    try {
      setSaving(true);

      // Update current assignment to returned
      const { error: updateAssignmentError } = await supabase
        .from('equipment_assignments')
        .update({ status: 'returned' })
        .eq('equipment_id', id)
        .eq('status', 'active');

      if (updateAssignmentError) throw updateAssignmentError;

      // Update equipment record
      const { error: updateError } = await supabase
        .from('equipment_inventory')
        .update({
          assigned_restaurant: null,
          assigned_date: null,
        })
        .eq('id', id);

      if (updateError) throw updateError;

      Alert.alert(
        'Success',
        'Equipment returned successfully',
        [
          {
            text: 'OK',
            onPress: () => router.back(),
          },
        ]
      );
    } catch (error) {
      console.error('Error returning equipment:', error);
      Alert.alert('Error', 'Failed to return equipment');
    } finally {
      setSaving(false);
    }
  };

  const renderRestaurantItem = ({ item }: { item: Restaurant }) => (
    <TouchableOpacity
      className="p-4 border-b border-gray-200"
      onPress={() => {
        setSelectedRestaurant(item);
        setShowRestaurantModal(false);
      }}
    >
      <View className="flex-row items-center">
        <Building size={20} color="#3B82F6" />
        <View className="ml-3 flex-1">
          <Text className="font-bold text-gray-800">{item.name}</Text>
          {item.address && (
            <Text className="text-gray-500 text-sm">{item.address}</Text>
          )}
        </View>
        <CheckCircle size={20} color="#10B981" />
      </View>
    </TouchableOpacity>
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
              <Text className="text-2xl font-bold text-white">Assign Equipment</Text>
              <Text className="text-green-100 text-sm">Assign to restaurant</Text>
            </View>
          </View>
          <TouchableOpacity
            className="bg-white/20 p-3 rounded-2xl backdrop-blur-sm"
            onPress={equipment?.assigned_restaurant ? handleReturn : handleAssign}
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
        {/* Equipment Info */}
        <View className="bg-white rounded-xl p-4 mb-4 shadow-sm">
          <Text className="text-lg font-bold text-gray-800 mb-4">Equipment Details</Text>

          <View className="flex-row items-center mb-3">
            <Package size={20} color="#6B7280" />
            <Text className="text-gray-800 font-medium ml-2">{equipment?.name}</Text>
          </View>

          <Text className="text-gray-600 mb-2">Type: {equipment?.type}</Text>
          {equipment?.sku && (
            <Text className="text-gray-600 mb-2">SKU: {equipment.sku}</Text>
          )}

          {equipment?.assigned_restaurant && (
            <View className="bg-green-50 p-3 rounded-lg mt-3">
              <Text className="text-green-800 font-medium">
                Currently assigned to: {equipment.assigned_restaurant}
              </Text>
              {equipment.assigned_date && (
                <Text className="text-green-600 text-sm">
                  Since: {new Date(equipment.assigned_date).toLocaleDateString()}
                </Text>
              )}
            </View>
          )}
        </View>

        {/* Assignment Section */}
        {!equipment?.assigned_restaurant && (
          <View className="bg-white rounded-xl p-4 mb-4 shadow-sm">
            <Text className="text-lg font-bold text-gray-800 mb-4">Assign to Restaurant</Text>

            <TouchableOpacity
              className="flex-row justify-between items-center border border-gray-200 rounded-lg p-3 mb-4"
              onPress={() => setShowRestaurantModal(true)}
            >
              <View className="flex-row items-center">
                <Building size={20} color="#6B7280" />
                <Text className={selectedRestaurant ? "text-gray-800 ml-2" : "text-gray-400 ml-2"}>
                  {selectedRestaurant?.name || "Select restaurant"}
                </Text>
              </View>
              <MapPin size={18} color="#6B7280" />
            </TouchableOpacity>

            <TouchableOpacity
              className={`bg-green-600 rounded-xl p-4 flex-row items-center justify-center ${
                saving || !selectedRestaurant ? 'opacity-50' : ''
              }`}
              onPress={handleAssign}
              disabled={saving || !selectedRestaurant}
            >
              {saving ? (
                <ActivityIndicator size="small" color="#ffffff" />
              ) : (
                <>
                  <Save size={20} color="#ffffff" />
                  <Text className="text-white font-bold text-lg ml-2">Assign Equipment</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        )}

        {/* Return Section */}
        {equipment?.assigned_restaurant && (
          <View className="bg-white rounded-xl p-4 mb-4 shadow-sm">
            <Text className="text-lg font-bold text-gray-800 mb-4">Return Equipment</Text>

            <TouchableOpacity
              className={`bg-red-600 rounded-xl p-4 flex-row items-center justify-center ${
                saving ? 'opacity-50' : ''
              }`}
              onPress={handleReturn}
              disabled={saving}
            >
              {saving ? (
                <ActivityIndicator size="small" color="#ffffff" />
              ) : (
                <>
                  <Package size={20} color="#ffffff" />
                  <Text className="text-white font-bold text-lg ml-2">Return Equipment</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>

      {/* Restaurant Selection Modal */}
      <Modal
        visible={showRestaurantModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowRestaurantModal(false)}
      >
        <View className="flex-1 bg-white">
          <View className="flex-row justify-between items-center px-6 py-4 border-b border-gray-200">
            <TouchableOpacity onPress={() => setShowRestaurantModal(false)}>
              <X size={24} color="#6B7280" />
            </TouchableOpacity>
            <Text className="text-xl font-bold text-gray-800">Select Restaurant</Text>
            <View style={{ width: 24 }} />
          </View>

          <FlatList
            data={restaurants}
            renderItem={renderRestaurantItem}
            keyExtractor={(item) => item.id}
            contentContainerStyle={{ padding: 16 }}
          />
        </View>
      </Modal>
    </SafeAreaView>
  );
}
