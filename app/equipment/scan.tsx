import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useRouter } from 'expo-router';
import {
  ArrowLeft,
  Camera,
  Package,
  MapPin,
  Tag,
  BarChart3,
} from 'lucide-react-native';
import { supabase } from '../../lib/supabase';
import BarcodeScanner from '../../components/BarcodeScanner';

type ScannedEquipment = {
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
};

export default function ScanEquipmentScreen() {
  const router = useRouter();
  const [showScanner, setShowScanner] = useState(false);
  const [loading, setLoading] = useState(false);
  const [scannedEquipment, setScannedEquipment] = useState<ScannedEquipment | null>(null);

  const handleScan = async (code: string, type: string) => {
    setShowScanner(false);
    setLoading(true);

    try {
      // Search for equipment by SKU or name
      const { data, error } = await supabase
        .from('equipment_inventory')
        .select('*')
        .or(`sku.eq.${code},name.ilike.%${code}%`)
        .limit(1);

      if (error) throw error;

      if (data && data.length > 0) {
        setScannedEquipment(data[0] as ScannedEquipment);
        Alert.alert(
          'Equipment Found',
          `Found: ${data[0].name}`,
          [
            { text: 'Scan Another', onPress: () => setShowScanner(true) },
            { text: 'View Details', onPress: () => {} },
          ]
        );
      } else {
        Alert.alert(
          'Equipment Not Found',
          `No equipment found with code: ${code}`,
          [
            { text: 'Try Again', onPress: () => setShowScanner(true) },
            { text: 'Add New Equipment', onPress: () => router.push('/equipment/add') },
          ]
        );
      }
    } catch (error) {
      console.error('Error searching equipment:', error);
      Alert.alert('Error', 'Failed to search for equipment');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickAction = (action: string) => {
    if (!scannedEquipment) return;

    switch (action) {
      case 'movement':
        router.push(`/equipment/movement?id=${scannedEquipment.id}`);
        break;
      case 'edit':
        router.push(`/equipment/edit/${scannedEquipment.id}`);
        break;
      case 'history':
        router.push(`/equipment/history?id=${scannedEquipment.id}`);
        break;
      default:
        break;
    }
  };

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
              <Text className="text-2xl font-bold text-white">Scan Equipment</Text>
              <Text className="text-blue-100 text-sm">Scan barcodes to find equipment</Text>
            </View>
          </View>
          <TouchableOpacity
            className="bg-white/20 p-3 rounded-2xl backdrop-blur-sm"
            onPress={() => setShowScanner(true)}
          >
            <Camera size={24} color="#ffffff" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Content */}
      <View className="flex-1 px-6 py-6">
        {loading ? (
          <View className="flex-1 justify-center items-center">
            <ActivityIndicator size="large" color="#3B82F6" />
            <Text className="text-gray-600 mt-4">Searching equipment...</Text>
          </View>
        ) : scannedEquipment ? (
          <View>
            {/* Equipment Details */}
            <View className="bg-white rounded-xl p-6 mb-6 shadow-sm">
              <View className="flex-row items-center mb-4">
                <View className="bg-blue-100 p-3 rounded-full mr-4">
                  <Package size={24} color="#3B82F6" />
                </View>
                <View className="flex-1">
                  <Text className="text-xl font-bold text-gray-800">{scannedEquipment.name}</Text>
                  <Text className="text-gray-600">{scannedEquipment.type}</Text>
                </View>
              </View>

              <View className="space-y-3">
                {scannedEquipment.sku && (
                  <View className="flex-row items-center">
                    <Tag size={16} color="#6B7280" />
                    <Text className="text-gray-700 ml-2">SKU: {scannedEquipment.sku}</Text>
                  </View>
                )}

                <View className="flex-row items-center">
                  <BarChart3 size={16} color="#6B7280" />
                  <Text className="text-gray-700 ml-2">Stock Level: {scannedEquipment.stock_level}</Text>
                </View>

                {scannedEquipment.warehouse_location && (
                  <View className="flex-row items-center">
                    <MapPin size={16} color="#6B7280" />
                    <Text className="text-gray-700 ml-2">Location: {scannedEquipment.warehouse_location}</Text>
                  </View>
                )}

                {scannedEquipment.supplier && (
                  <View className="flex-row items-center">
                    <Package size={16} color="#6B7280" />
                    <Text className="text-gray-700 ml-2">Supplier: {scannedEquipment.supplier}</Text>
                  </View>
                )}

                {scannedEquipment.cost && (
                  <View className="flex-row items-center">
                    <Text className="text-gray-700">Cost: ${scannedEquipment.cost}</Text>
                  </View>
                )}
              </View>

              {/* Stock Level Indicator */}
              <View className="mt-4 p-3 bg-gray-50 rounded-lg">
                <Text className="text-sm font-medium text-gray-700 mb-2">Stock Status</Text>
                <View className="flex-row items-center">
                  <View className="flex-1 bg-gray-200 rounded-full h-2 mr-3">
                    <View
                      className={`h-2 rounded-full ${
                        scannedEquipment.stock_level <= (scannedEquipment.min_stock_level || 5)
                          ? 'bg-red-500'
                          : scannedEquipment.stock_level >= (scannedEquipment.max_stock_level || 100)
                          ? 'bg-yellow-500'
                          : 'bg-green-500'
                      }`}
                      style={{
                        width: `${Math.min(
                          (scannedEquipment.stock_level / (scannedEquipment.max_stock_level || 100)) * 100,
                          100
                        )}%`,
                      }}
                    />
                  </View>
                  <Text className="text-sm text-gray-600">
                    {scannedEquipment.stock_level <= (scannedEquipment.min_stock_level || 5)
                      ? 'Low Stock'
                      : scannedEquipment.stock_level >= (scannedEquipment.max_stock_level || 100)
                      ? 'High Stock'
                      : 'Normal'}
                  </Text>
                </View>
              </View>
            </View>

            {/* Quick Actions */}
            <View className="bg-white rounded-xl p-6 shadow-sm">
              <Text className="text-lg font-bold text-gray-800 mb-4">Quick Actions</Text>
              
              <View className="space-y-3">
                <TouchableOpacity
                  className="bg-blue-50 p-4 rounded-lg flex-row items-center"
                  onPress={() => handleQuickAction('movement')}
                >
                  <BarChart3 size={20} color="#3B82F6" />
                  <Text className="text-blue-700 font-medium ml-3">Record Movement</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  className="bg-green-50 p-4 rounded-lg flex-row items-center"
                  onPress={() => handleQuickAction('edit')}
                >
                  <Package size={20} color="#10B981" />
                  <Text className="text-green-700 font-medium ml-3">Edit Equipment</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  className="bg-purple-50 p-4 rounded-lg flex-row items-center"
                  onPress={() => handleQuickAction('history')}
                >
                  <BarChart3 size={20} color="#8B5CF6" />
                  <Text className="text-purple-700 font-medium ml-3">View History</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Scan Another Button */}
            <TouchableOpacity
              className="bg-blue-600 rounded-xl p-4 flex-row items-center justify-center mt-6"
              onPress={() => setShowScanner(true)}
            >
              <Camera size={20} color="#ffffff" />
              <Text className="text-white font-bold text-lg ml-2">Scan Another</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View className="flex-1 justify-center items-center">
            <View className="bg-blue-100 p-8 rounded-full mb-6">
              <Camera size={64} color="#3B82F6" />
            </View>
            <Text className="text-gray-500 text-xl font-semibold mb-2">Ready to Scan</Text>
            <Text className="text-gray-400 text-center mb-8 mx-8">
              Tap the camera button to scan equipment barcodes or QR codes
            </Text>
            <TouchableOpacity
              className="bg-blue-600 rounded-xl px-8 py-4 flex-row items-center"
              onPress={() => setShowScanner(true)}
            >
              <Camera size={24} color="#ffffff" />
              <Text className="text-white font-bold text-lg ml-2">Start Scanning</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* Barcode Scanner Modal */}
      {showScanner && (
        <BarcodeScanner
          onScan={handleScan}
          onClose={() => setShowScanner(false)}
          mode="equipment"
        />
      )}
    </SafeAreaView>
  );
}
