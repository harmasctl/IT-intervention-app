import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { AlertTriangle, Clock, ChevronRight, Wrench, Bell, CheckCircle } from 'lucide-react-native';
import { supabase } from '../lib/supabase';
import { addDays, format, isBefore } from 'date-fns';

type MaintenanceAlert = {
  id: string;
  device_id: string;
  device_name: string;
  type: string;
  serial_number: string;
  restaurant_name: string;
  category_name: string;
  days_remaining: number;
  is_overdue: boolean;
  next_maintenance: Date;
};

interface MaintenanceNotificationsProps {
  limit?: number;
  showHeader?: boolean;
  onViewAllPress?: () => void;
}

export default function MaintenanceNotifications({
  limit = 3,
  showHeader = true,
  onViewAllPress
}: MaintenanceNotificationsProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [alerts, setAlerts] = useState<MaintenanceAlert[]>([]);

  useEffect(() => {
    fetchMaintenanceAlerts();
  }, []);

  const fetchMaintenanceAlerts = async () => {
    try {
      setLoading(true);

      // Fetch devices with their maintenance info and related data
      const { data, error } = await supabase
        .from('devices')
        .select(`
          id,
          name,
          type,
          serial_number,
          last_maintenance,
          restaurant_id,
          category_id,
          restaurants(name),
          device_categories(name, maintenance_interval)
        `)
        .order('name');

      if (error) {
        throw error;
      }

      // Process the data to calculate maintenance alerts
      const today = new Date();
      const alertsData: MaintenanceAlert[] = [];

      if (data) {
        data.forEach((device: any) => {
          // Skip devices without category or maintenance interval
          if (!device.device_categories || !device.device_categories.maintenance_interval) return;

          const lastMaintenance = device.last_maintenance 
            ? new Date(device.last_maintenance) 
            : null;
            
          const interval = device.device_categories.maintenance_interval;
          
          // Calculate next maintenance date
          let nextMaintenance: Date;
          if (lastMaintenance) {
            nextMaintenance = addDays(new Date(lastMaintenance), interval);
          } else {
            // If no previous maintenance, schedule from today
            nextMaintenance = addDays(today, interval / 2); // Half the interval as a default
          }
          
          // Calculate days remaining
          const daysRemaining = Math.ceil(
            (nextMaintenance.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
          );
          
          // Check if maintenance is overdue or coming up soon (within 14 days)
          const isOverdue = isBefore(nextMaintenance, today);
          const isUpcomingSoon = daysRemaining > 0 && daysRemaining <= 14;
          
          // Only add to alerts if overdue or upcoming soon
          if (isOverdue || isUpcomingSoon) {
            // Extract restaurant name safely
            let restaurantName = "Unknown";
            if (device.restaurants && typeof device.restaurants === 'object') {
              restaurantName = device.restaurants.name || "Unknown";
            }
            
            alertsData.push({
              id: device.id,
              device_id: device.id,
              device_name: device.name,
              type: device.type,
              serial_number: device.serial_number,
              restaurant_name: restaurantName,
              category_name: device.device_categories.name,
              days_remaining: daysRemaining,
              is_overdue: isOverdue,
              next_maintenance: nextMaintenance,
            });
          }
        });
      }
      
      // Sort by urgency: overdue first (sorted by most overdue), then upcoming (sorted by soonest)
      alertsData.sort((a, b) => {
        if (a.is_overdue && !b.is_overdue) return -1;
        if (!a.is_overdue && b.is_overdue) return 1;
        return a.days_remaining - b.days_remaining;
      });
      
      setAlerts(alertsData);
    } catch (error) {
      console.error("Error fetching maintenance alerts:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleAlertPress = (deviceId: string) => {
    router.push({
      pathname: '/devices/[id]',
      params: { id: deviceId }
    });
  };

  const handleMaintenancePress = (deviceId: string) => {
    router.push({
      pathname: '/devices/maintenance',
      params: { deviceId }
    });
  };

  const handleViewAll = () => {
    if (onViewAllPress) {
      onViewAllPress();
    } else {
      router.push('/schedule/maintenance');
    }
  };

  const formatDate = (date: Date) => {
    return format(date, 'MMM d, yyyy');
  };

  // Limit the number of alerts shown if specified
  const limitedAlerts = limit ? alerts.slice(0, limit) : alerts;

  if (loading) {
    return (
      <View className="p-4 bg-white rounded-lg shadow-sm">
        <ActivityIndicator size="small" color="#3B82F6" />
        <Text className="text-center text-gray-500 mt-2">Loading maintenance alerts...</Text>
      </View>
    );
  }

  if (alerts.length === 0) {
    return (
      <View className="p-4 bg-white rounded-lg shadow-sm">
        <View className="flex-row items-center justify-center mb-2">
          <CheckCircle size={20} color="#10B981" />
          <Text className="text-green-600 font-medium ml-2">All maintenance is up to date</Text>
        </View>
        <Text className="text-center text-gray-500">No upcoming or overdue maintenance</Text>
      </View>
    );
  }

  return (
    <View className="bg-white rounded-lg shadow-sm">
      {showHeader && (
        <View className="flex-row justify-between items-center p-4 border-b border-gray-100">
          <View className="flex-row items-center">
            <Bell size={18} color="#3B82F6" />
            <Text className="text-lg font-semibold text-gray-800 ml-2">Maintenance Alerts</Text>
          </View>
          {alerts.length > limit && (
            <TouchableOpacity onPress={handleViewAll}>
              <Text className="text-blue-600 font-medium">View All</Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      <ScrollView>
        {limitedAlerts.map((alert) => (
          <TouchableOpacity
            key={alert.id}
            className="p-4 border-b border-gray-100"
            onPress={() => handleAlertPress(alert.device_id)}
            activeOpacity={0.7}
          >
            <View className="flex-row justify-between items-start mb-2">
              <View className="flex-1">
                <Text className="font-bold text-gray-800">{alert.device_name}</Text>
                <Text className="text-gray-600 text-xs">
                  {alert.type} • {alert.serial_number}
                </Text>
              </View>
              
              <View className={`px-2 py-1 rounded-full flex-row items-center ${
                alert.is_overdue ? 'bg-red-100' : 'bg-yellow-100'
              }`}>
                {alert.is_overdue ? (
                  <>
                    <AlertTriangle size={12} color="#991B1B" />
                    <Text className="text-red-800 text-xs font-medium ml-1">
                      Overdue by {Math.abs(alert.days_remaining)} days
                    </Text>
                  </>
                ) : (
                  <>
                    <Clock size={12} color="#854D0E" />
                    <Text className="text-yellow-800 text-xs font-medium ml-1">
                      Due in {alert.days_remaining} days
                    </Text>
                  </>
                )}
              </View>
            </View>
            
            <View className="flex-row justify-between items-center">
              <View>
                <Text className="text-gray-500 text-xs">
                  {alert.restaurant_name} • {alert.category_name}
                </Text>
                <Text className="text-gray-500 text-xs">
                  Next maintenance: {formatDate(alert.next_maintenance)}
                </Text>
              </View>
              
              <TouchableOpacity
                className={`flex-row items-center px-2 py-1 rounded-lg ${
                  alert.is_overdue ? 'bg-red-500' : 'bg-blue-500'
                }`}
                onPress={() => handleMaintenancePress(alert.device_id)}
                activeOpacity={0.8}
              >
                <Wrench size={12} color="#FFFFFF" />
                <Text className="text-white text-xs font-medium ml-1">Maintain</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
} 