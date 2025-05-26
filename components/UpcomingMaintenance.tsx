import React, { useState, useEffect } from 'react';
import { View, Text, ActivityIndicator, TouchableOpacity, ScrollView, RefreshControl } from 'react-native';
import { useRouter } from 'expo-router';
import { Calendar, Wrench, Package, User, Clock, ChevronRight, CalendarClock } from 'lucide-react-native';
import { format, formatDistanceToNow, parseISO } from 'date-fns';
import { getUpcomingMaintenance, formatMaintenanceRecord } from '../lib/maintenanceUtils';

interface UpcomingMaintenanceProps {
  limit?: number;
  showDeviceInfo?: boolean;
  showHeader?: boolean;
  title?: string;
}

export default function UpcomingMaintenance({ 
  limit = 5, 
  showDeviceInfo = true,
  showHeader = true,
  title = "Upcoming Maintenance"
}: UpcomingMaintenanceProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [upcomingMaintenance, setUpcomingMaintenance] = useState<any[]>([]);

  useEffect(() => {
    fetchUpcomingMaintenance();
  }, []);

  const fetchUpcomingMaintenance = async () => {
    try {
      setLoading(true);
      const data = await getUpcomingMaintenance(30);
      setUpcomingMaintenance(data.map(formatMaintenanceRecord));
    } catch (error) {
      console.error('Error in UpcomingMaintenance component:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    fetchUpcomingMaintenance();
  };

  const handleViewDetails = (recordId: string) => {
    router.push({
      pathname: "/devices/maintenance/[id]",
      params: { id: recordId }
    });
  };

  const handleViewDevice = (deviceId: string) => {
    router.push({
      pathname: "/devices/[id]",
      params: { id: deviceId }
    });
  };

  const handleViewAll = () => {
    router.push({
      pathname: "/devices/maintenance/history",
      params: {}
    });
  };

  if (loading && !refreshing) {
    return (
      <View className="p-4">
        <ActivityIndicator size="small" color="#3B82F6" />
      </View>
    );
  }

  if (upcomingMaintenance.length === 0) {
    return (
      <View className="bg-white rounded-lg p-4 shadow-sm">
        {showHeader && (
          <Text className="text-lg font-semibold text-gray-800 mb-2">
            {title}
          </Text>
        )}
        <View className="py-6 items-center">
          <CalendarClock size={32} color="#9CA3AF" />
          <Text className="text-gray-500 italic text-center mt-2">
            No upcoming maintenance scheduled
          </Text>
        </View>
      </View>
    );
  }

  // Apply limit if provided
  const displayRecords = limit ? upcomingMaintenance.slice(0, limit) : upcomingMaintenance;

  return (
    <View className="bg-white rounded-lg p-4 shadow-sm">
      {showHeader && (
        <View className="flex-row justify-between items-center mb-4">
          <Text className="text-lg font-semibold text-gray-800">
            {title}
          </Text>
          {upcomingMaintenance.length > limit && (
            <TouchableOpacity onPress={handleViewAll}>
              <Text className="text-blue-600 text-sm">View All</Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      <ScrollView 
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
      >
        {displayRecords.map((record) => (
          <TouchableOpacity
            key={record.id}
            onPress={() => handleViewDetails(record.id)}
            className="bg-white rounded-lg p-3 mb-3 border border-gray-100"
          >
            <View className="flex-row justify-between items-start mb-1">
              <View className="flex-row items-center">
                <Calendar size={16} color={record.statusColor} className="mr-2" />
                <Text className="font-semibold text-gray-800">
                  {record.formattedDate}
                </Text>
              </View>
              <View 
                className="rounded-full px-2 py-0.5"
                style={{ backgroundColor: `${record.statusColor}20` }}
              >
                <Text className="text-xs" style={{ color: record.statusColor }}>
                  {record.statusLabel}
                </Text>
              </View>
            </View>
            
            {showDeviceInfo && (
              <TouchableOpacity 
                className="flex-row items-center py-1"
                onPress={() => handleViewDevice(record.device_id)}
              >
                <Package size={14} color="#6B7280" className="mr-1" />
                <Text className="text-gray-700 text-sm font-medium">
                  {record.deviceName}
                </Text>
              </TouchableOpacity>
            )}
            
            <Text className="text-gray-600 text-sm mb-2" numberOfLines={2}>
              {record.description}
            </Text>
            
            <View className="flex-row justify-between items-center">
              <View className="flex-row items-center">
                <User size={12} color="#6B7280" className="mr-1" />
                <Text className="text-gray-500 text-xs">
                  {record.technicianName}
                </Text>
                
                {record.maintenance_duration_minutes && (
                  <View className="flex-row items-center ml-2">
                    <Clock size={12} color="#6B7280" className="mr-1" />
                    <Text className="text-gray-500 text-xs">
                      {record.formattedDuration}
                    </Text>
                  </View>
                )}
              </View>
              
              <ChevronRight size={16} color="#9CA3AF" />
            </View>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
} 