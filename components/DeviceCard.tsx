import React from "react";
import { View, Text, TouchableOpacity } from "react-native";
import {
  Smartphone,
  CheckCircle,
  AlertCircle,
  Clock,
} from "lucide-react-native";

interface DeviceCardProps {
  device: {
    id: string;
    name: string;
    serial_number: string;
    model: string;
    status: string;
    restaurant_name?: string;
    last_maintenance?: string;
  };
  onPress: () => void;
}

const DeviceCard: React.FC<DeviceCardProps> = ({ device, onPress }) => {
  const getStatusColor = (status: string) => {
    switch (status) {
      case "operational":
        return "bg-green-100 text-green-800";
      case "maintenance":
        return "bg-yellow-100 text-yellow-800";
      case "offline":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "operational":
        return <CheckCircle size={16} color="#16a34a" />;
      case "maintenance":
        return <Clock size={16} color="#ca8a04" />;
      case "offline":
        return <AlertCircle size={16} color="#dc2626" />;
      default:
        return null;
    }
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return "Never";
    const date = new Date(dateString);
    return date.toLocaleDateString();
  };

  return (
    <TouchableOpacity
      className="bg-white rounded-xl p-4 mb-4 shadow-sm border border-gray-100"
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View className="flex-row justify-between items-start">
        <View className="flex-1">
          <Text className="font-bold text-lg text-gray-800">{device.name}</Text>
          <Text className="text-gray-600 text-sm">{device.model}</Text>
          <Text className="text-gray-500 text-sm mt-1">
            S/N: {device.serial_number}
          </Text>
          {device.restaurant_name && (
            <Text className="text-gray-500 text-sm mt-1">
              Location: {device.restaurant_name}
            </Text>
          )}
        </View>
        <Smartphone size={24} color="#4b5563" />
      </View>

      <View className="flex-row justify-between items-center mt-3">
        <View className="flex-row items-center">
          {getStatusIcon(device.status)}
          <View
            className={`px-2 py-1 rounded-full ml-2 ${getStatusColor(device.status)}`}
          >
            <Text className="text-xs font-medium capitalize">
              {device.status}
            </Text>
          </View>
        </View>
        <Text className="text-gray-500 text-xs">
          Last Maintenance: {formatDate(device.last_maintenance)}
        </Text>
      </View>
    </TouchableOpacity>
  );
};

export default DeviceCard;
