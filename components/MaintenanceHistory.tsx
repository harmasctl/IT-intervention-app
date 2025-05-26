import React, { useState, useEffect } from 'react';
import { View, Text, ActivityIndicator, TouchableOpacity, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { Wrench, SquareCheck, Calendar, User, Clock, AlertCircle, ChevronRight } from 'lucide-react-native';
import { format, formatDistanceToNow } from 'date-fns';
import { supabase } from '../lib/supabase';

type MaintenanceRecord = {
  id: string;
  device_id: string;
  date: string;
  technician_id: string;
  description: string;
  resolved: boolean;
  status?: string;
  cost?: number;
  maintenance_duration_minutes?: number;
  parts_replaced?: any[];
  created_at: string;
  technician?: {
    name: string;
  };
};

interface MaintenanceHistoryProps {
  deviceId: string;
  limit?: number;
  showAddButton?: boolean;
  onAddPress?: () => void;
}

export default function MaintenanceHistory({ 
  deviceId, 
  limit,
  showAddButton = true,
  onAddPress 
}: MaintenanceHistoryProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [maintenanceRecords, setMaintenanceRecords] = useState<MaintenanceRecord[]>([]);

  useEffect(() => {
    fetchMaintenanceRecords();
  }, [deviceId]);

  const fetchMaintenanceRecords = async () => {
    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .from("maintenance_records")
        .select(`
          *,
          technician:technician_id(name)
        `)
        .eq("device_id", deviceId)
        .order("date", { ascending: false })
        .limit(limit || 100);

      if (error) {
        console.error("Error fetching maintenance records:", error);
        return;
      }

      setMaintenanceRecords(data || []);
    } catch (error) {
      console.error("Exception fetching maintenance records:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddMaintenance = () => {
    if (onAddPress) {
      onAddPress();
    } else {
      router.push({
        pathname: "/devices/maintenance",
        params: { deviceId }
      });
    }
  };

  const handleViewDetails = (recordId: string) => {
    router.push({
      pathname: "/devices/maintenance/[id]",
      params: { id: recordId }
    });
  };

  if (loading) {
    return (
      <View className="p-4">
        <ActivityIndicator size="small" color="#3B82F6" />
      </View>
    );
  }

  if (maintenanceRecords.length === 0) {
    return (
      <View className="p-4">
        <Text className="text-gray-500 italic text-center mb-4">
          No maintenance records found
        </Text>
        {showAddButton && (
          <TouchableOpacity
            className="bg-blue-500 rounded-lg py-2 items-center"
            onPress={handleAddMaintenance}
          >
            <Text className="text-white font-medium">Schedule Maintenance</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  }

  // Apply limit if provided
  const displayRecords = limit ? maintenanceRecords.slice(0, limit) : maintenanceRecords;

  return (
    <View>
      <View className="flex-row justify-between items-center mb-4">
        <Text className="text-lg font-semibold text-gray-800">
          Maintenance History
        </Text>
        {showAddButton && (
          <TouchableOpacity 
            className="bg-blue-100 px-3 py-1 rounded-full flex-row items-center"
            onPress={handleAddMaintenance}
          >
            <Wrench size={16} color="#1D4ED8" />
            <Text className="text-blue-700 text-xs ml-1">Add</Text>
          </TouchableOpacity>
        )}
      </View>

      {displayRecords.map((record) => {
        // Determine status colors based on status property or resolved if status is not available
        const statusColor = (() => {
          if (record.status) {
            switch(record.status) {
              case 'completed': return "#10B981"; // Green
              case 'in_progress': return "#F59E0B"; // Amber
              case 'pending': return "#3B82F6"; // Blue
              case 'cancelled': return "#EF4444"; // Red
              default: return record.resolved ? "#10B981" : "#F59E0B";
            }
          } else {
            return record.resolved ? "#10B981" : "#F59E0B";
          }
        })();

        // Determine status text
        const statusText = (() => {
          if (record.status) {
            switch(record.status) {
              case 'completed': return "Completed";
              case 'in_progress': return "In Progress";
              case 'pending': return "Pending";
              case 'cancelled': return "Cancelled";
              default: return record.resolved ? "Completed" : "In Progress";
            }
          } else {
            return record.resolved ? "Completed" : "In Progress";
          }
        })();
        
        return (
          <TouchableOpacity
            key={record.id}
            onPress={() => handleViewDetails(record.id)}
            className="bg-white rounded-lg p-4 shadow-sm mb-3 border-l-4"
            style={{
              borderLeftColor: statusColor,
            }}
          >
            <View className="flex-row justify-between items-start mb-2">
              <View className="flex-row items-center">
                {record.resolved ? (
                  <SquareCheck size={16} color={statusColor} />
                ) : (
                  <Wrench size={16} color={statusColor} />
                )}
                <Text className="font-semibold text-gray-800 ml-2">
                  {format(new Date(record.date), "MMM d, yyyy")}
                </Text>
              </View>
              <Text className="text-xs text-gray-500">
                {formatDistanceToNow(new Date(record.date), { addSuffix: true })}
              </Text>
            </View>
            
            <Text className="text-gray-700 mb-2" numberOfLines={2}>
              {record.description}
            </Text>
            
            <View className="flex-row justify-between items-center">
              <View className="flex-row items-center">
                <User size={12} color="#6B7280" className="mr-1" />
                <Text className="text-gray-500 text-xs">
                  {record.technician?.name || "Unknown"}
                </Text>
                {record.cost && (
                  <Text className="text-gray-500 text-xs ml-2">
                    • ${record.cost.toFixed(2)}
                  </Text>
                )}
                {record.maintenance_duration_minutes && (
                  <Text className="text-gray-500 text-xs ml-2">
                    • {record.maintenance_duration_minutes} min
                  </Text>
                )}
              </View>
              
              <View className="flex-row items-center">
                <Text
                  className={`text-xs mr-2`}
                  style={{ color: statusColor }}
                >
                  {statusText}
                </Text>
                <ChevronRight size={16} color="#9CA3AF" />
              </View>
            </View>
          </TouchableOpacity>
        );
      })}

      {limit && maintenanceRecords.length > limit && (
        <TouchableOpacity
          className="mt-2 items-center"
          onPress={() => router.push({
            pathname: "/devices/maintenance/history",
            params: { deviceId }
          })}
        >
          <Text className="text-blue-600">View All Maintenance Records</Text>
        </TouchableOpacity>
      )}
    </View>
  );
} 