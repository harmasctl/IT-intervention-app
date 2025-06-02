import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Modal,
  Image,
} from 'react-native';
import { useRouter } from 'expo-router';
import {
  X,
  Package,
  Building2,
  MapPin,
  Calendar,
  ArrowRightLeft,
  Eye,
  History,
  CheckCircle,
  AlertCircle,
  Clock,
} from 'lucide-react-native';
import { formatDistanceToNow, format } from 'date-fns';

interface DeviceScanResultProps {
  visible: boolean;
  device: any;
  onClose: () => void;
}

export default function DeviceScanResult({ visible, device, onClose }: DeviceScanResultProps) {
  const router = useRouter();

  if (!device) return null;

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'operational':
        return '#10B981';
      case 'maintenance':
        return '#F59E0B';
      case 'offline':
        return '#EF4444';
      default:
        return '#6B7280';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'operational':
        return <CheckCircle size={16} color="#10B981" />;
      case 'maintenance':
        return <Clock size={16} color="#F59E0B" />;
      case 'offline':
        return <AlertCircle size={16} color="#EF4444" />;
      default:
        return <Package size={16} color="#6B7280" />;
    }
  };

  const handleViewDevice = () => {
    onClose();
    router.push(`/devices/${device.id}`);
  };

  const handleTransferDevice = () => {
    onClose();
    router.push(`/devices/transfer/${device.id}`);
  };

  const handleViewHistory = () => {
    onClose();
    router.push(`/devices/transfer-history/${device.id}`);
  };

  return (
    <Modal visible={visible} animationType="slide" transparent={false}>
      <View className="flex-1 bg-gray-50">
        {/* Header */}
        <View className="px-6 py-6 bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-700 shadow-2xl">
          <View className="flex-row justify-between items-center mt-8">
            <View className="flex-1">
              <Text className="text-2xl font-bold text-white">Device Found</Text>
              <Text className="text-blue-100 text-sm">Scanned device information</Text>
            </View>
            <TouchableOpacity
              onPress={onClose}
              className="bg-white/20 p-3 rounded-2xl backdrop-blur-sm"
            >
              <X size={24} color="#ffffff" />
            </TouchableOpacity>
          </View>
        </View>

        <ScrollView className="flex-1 p-6">
          {/* Device Info Card */}
          <View className="bg-white rounded-2xl p-6 mb-6 shadow-lg border border-gray-100">
            <View className="items-center mb-6">
              {device.image ? (
                <Image
                  source={{ uri: device.image }}
                  className="w-32 h-32 rounded-2xl mb-4"
                  resizeMode="cover"
                />
              ) : (
                <View className="bg-gray-100 w-32 h-32 rounded-2xl items-center justify-center mb-4">
                  <Package size={48} color={device.category?.color || "#6366f1"} />
                </View>
              )}
              
              <Text className="text-2xl font-bold text-gray-800 text-center mb-2">
                {device.name}
              </Text>
              <Text className="text-gray-600 text-lg mb-4">
                {device.model || device.type}
              </Text>

              <View
                className="flex-row items-center px-4 py-2 rounded-xl"
                style={{ backgroundColor: getStatusColor(device.status) }}
              >
                {getStatusIcon(device.status)}
                <Text className="ml-2 text-white font-bold">
                  {device.status.charAt(0).toUpperCase() + device.status.slice(1)}
                </Text>
              </View>
            </View>

            {/* Device Details */}
            <View className="space-y-3">
              <View className="flex-row justify-between py-2 border-b border-gray-100">
                <Text className="text-gray-600">Serial Number</Text>
                <Text className="text-gray-800 font-medium">{device.serial_number}</Text>
              </View>

              <View className="flex-row justify-between py-2 border-b border-gray-100">
                <Text className="text-gray-600">Category</Text>
                <Text className="text-gray-800 font-medium">
                  {device.category?.name || 'Uncategorized'}
                </Text>
              </View>

              <View className="flex-row justify-between py-2">
                <Text className="text-gray-600">Added</Text>
                <Text className="text-gray-800 font-medium">
                  {formatDistanceToNow(new Date(device.created_at), { addSuffix: true })}
                </Text>
              </View>
            </View>
          </View>

          {/* Location Info */}
          <View className="bg-white rounded-2xl p-6 mb-6 shadow-lg border border-gray-100">
            <View className="flex-row items-center mb-4">
              <View className="bg-blue-100 p-3 rounded-xl mr-3">
                <Building2 size={20} color="#3b82f6" />
              </View>
              <Text className="text-lg font-bold text-gray-800">Current Location</Text>
            </View>

            {device.restaurant ? (
              <View>
                <Text className="text-xl font-bold text-gray-800 mb-2">
                  {device.restaurant.name}
                </Text>
                {device.restaurant.address && (
                  <View className="flex-row items-center mb-2">
                    <MapPin size={16} color="#6b7280" />
                    <Text className="text-gray-600 ml-2">{device.restaurant.address}</Text>
                  </View>
                )}
                {device.restaurant.contact_phone && (
                  <Text className="text-gray-600">📞 {device.restaurant.contact_phone}</Text>
                )}
              </View>
            ) : (
              <Text className="text-gray-500 italic">No location assigned</Text>
            )}
          </View>

          {/* Transfer History */}
          {device.transferHistory && device.transferHistory.length > 0 && (
            <View className="bg-white rounded-2xl p-6 mb-6 shadow-lg border border-gray-100">
              <View className="flex-row items-center mb-4">
                <View className="bg-purple-100 p-3 rounded-xl mr-3">
                  <History size={20} color="#7c3aed" />
                </View>
                <Text className="text-lg font-bold text-gray-800">Recent Transfers</Text>
              </View>

              {device.transferHistory.slice(0, 3).map((transfer: any, index: number) => (
                <View key={transfer.id} className="mb-3 last:mb-0">
                  <View className="flex-row items-center justify-between mb-1">
                    <View className="flex-row items-center">
                      <ArrowRightLeft size={14} color="#7c3aed" />
                      <Text className="text-gray-800 font-medium ml-2">
                        {transfer.from_restaurant?.name || 'Unassigned'} → {transfer.to_restaurant?.name}
                      </Text>
                    </View>
                    <Text className="text-gray-500 text-xs">
                      {format(new Date(transfer.transferred_at), 'MMM dd')}
                    </Text>
                  </View>
                  {transfer.transferred_by_user && (
                    <Text className="text-gray-500 text-sm ml-5">
                      By {transfer.transferred_by_user.name || transfer.transferred_by_user.email}
                    </Text>
                  )}
                </View>
              ))}

              {device.transferHistory.length > 3 && (
                <TouchableOpacity
                  className="mt-3 py-2"
                  onPress={handleViewHistory}
                >
                  <Text className="text-blue-600 text-center font-medium">
                    View All History ({device.transferHistory.length} transfers)
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          )}

          {/* Action Buttons */}
          <View className="space-y-3">
            <TouchableOpacity
              className="bg-blue-500 rounded-2xl p-4 flex-row items-center justify-center"
              onPress={handleViewDevice}
            >
              <Eye size={20} color="#ffffff" />
              <Text className="text-white font-bold text-lg ml-2">View Device Details</Text>
            </TouchableOpacity>

            <TouchableOpacity
              className="bg-orange-500 rounded-2xl p-4 flex-row items-center justify-center"
              onPress={handleTransferDevice}
            >
              <ArrowRightLeft size={20} color="#ffffff" />
              <Text className="text-white font-bold text-lg ml-2">Transfer Device</Text>
            </TouchableOpacity>

            <TouchableOpacity
              className="bg-purple-500 rounded-2xl p-4 flex-row items-center justify-center"
              onPress={handleViewHistory}
            >
              <History size={20} color="#ffffff" />
              <Text className="text-white font-bold text-lg ml-2">View Transfer History</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </View>
    </Modal>
  );
}
