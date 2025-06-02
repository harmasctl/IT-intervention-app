import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { useRouter, useLocalSearchParams } from "expo-router";
import {
  ArrowLeft,
  History,
  ArrowRightLeft,
  Building2,
  User,
  Calendar,
  Package,
} from "lucide-react-native";
import { supabase } from "../../../lib/supabase";
import { formatDistanceToNow, format } from "date-fns";

type TransferRecord = {
  id: string;
  device_id: string;
  from_restaurant_id: string | null;
  to_restaurant_id: string;
  transferred_by: string | null;
  transferred_at: string;
  notes: string | null;
  from_restaurant?: { name: string };
  to_restaurant?: { name: string };
  transferred_by_user?: { name: string; email: string };
};

type Device = {
  id: string;
  name: string;
  serial_number: string;
  type: string;
  model?: string;
};

export default function DeviceTransferHistoryScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [device, setDevice] = useState<Device | null>(null);
  const [transferHistory, setTransferHistory] = useState<TransferRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (id) {
      fetchDeviceAndHistory();
    }
  }, [id]);

  const fetchDeviceAndHistory = async () => {
    try {
      setLoading(true);
      
      // Fetch device details
      const { data: deviceData, error: deviceError } = await supabase
        .from("devices")
        .select("id, name, serial_number, type, model")
        .eq("id", id)
        .single();

      if (deviceError) {
        console.error("Error fetching device:", deviceError);
        return;
      }

      setDevice(deviceData);

      // Fetch transfer history
      const { data: historyData, error: historyError } = await supabase
        .from("device_transfer_history")
        .select(`
          *,
          from_restaurant:restaurants!from_restaurant_id(name),
          to_restaurant:restaurants!to_restaurant_id(name),
          transferred_by_user:users!transferred_by(name, email)
        `)
        .eq("device_id", id)
        .order("transferred_at", { ascending: false });

      if (historyError) {
        console.error("Error fetching transfer history:", historyError);
        return;
      }

      setTransferHistory(historyData || []);
    } catch (error) {
      console.error("Exception fetching data:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchDeviceAndHistory();
  };

  if (loading) {
    return (
      <SafeAreaView className="flex-1 bg-gray-50">
        <StatusBar style="dark" />
        <View className="flex-1 justify-center items-center">
          <ActivityIndicator size="large" color="#1D4ED8" />
          <Text className="mt-4 text-gray-600">Loading transfer history...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!device) {
    return (
      <SafeAreaView className="flex-1 bg-gray-50">
        <StatusBar style="dark" />
        <View className="flex-1 justify-center items-center p-4">
          <Package size={64} color="#9CA3AF" />
          <Text className="text-xl font-semibold text-gray-800 mt-4">Device Not Found</Text>
          <TouchableOpacity
            className="bg-blue-500 px-6 py-3 rounded-lg mt-6"
            onPress={() => router.back()}
          >
            <Text className="text-white font-medium">Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      <StatusBar style="dark" />

      {/* Header */}
      <View className="px-6 py-6 bg-gradient-to-br from-purple-600 via-indigo-600 to-blue-700 shadow-2xl">
        <View className="flex-row justify-between items-center">
          <View className="flex-row items-center flex-1">
            <TouchableOpacity
              onPress={() => router.back()}
              className="bg-white/20 p-3 rounded-2xl mr-4 backdrop-blur-sm"
            >
              <ArrowLeft size={24} color="#ffffff" />
            </TouchableOpacity>
            <View className="flex-1">
              <Text className="text-2xl font-bold text-white">Transfer History</Text>
              <Text className="text-purple-100 text-sm">Device movement records</Text>
            </View>
          </View>
          <View className="bg-white/20 p-3 rounded-2xl backdrop-blur-sm">
            <History size={24} color="#ffffff" />
          </View>
        </View>
      </View>

      <ScrollView 
        className="flex-1 p-6"
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* Device Info */}
        <View className="bg-white rounded-2xl p-6 mb-6 shadow-lg border border-gray-100">
          <View className="flex-row items-center">
            <View className="bg-blue-100 p-3 rounded-xl mr-4">
              <Package size={24} color="#3b82f6" />
            </View>
            <View className="flex-1">
              <Text className="text-xl font-bold text-gray-800">{device.name}</Text>
              <Text className="text-gray-600">{device.model || device.type}</Text>
              <Text className="text-gray-500 text-sm">S/N: {device.serial_number}</Text>
            </View>
          </View>
        </View>

        {/* Transfer History */}
        <View className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100">
          <Text className="text-lg font-bold text-gray-800 mb-4">Transfer History</Text>
          
          {transferHistory.length === 0 ? (
            <View className="py-8 items-center">
              <History size={48} color="#9CA3AF" />
              <Text className="text-gray-500 mt-2">No transfer history</Text>
              <Text className="text-gray-400 text-sm text-center mt-1">
                This device has not been transferred between restaurants
              </Text>
            </View>
          ) : (
            <View className="space-y-4">
              {transferHistory.map((record, index) => (
                <View
                  key={record.id}
                  className="border border-gray-200 rounded-xl p-4 bg-gray-50"
                >
                  <View className="flex-row items-center justify-between mb-3">
                    <View className="flex-row items-center">
                      <View className="bg-purple-100 p-2 rounded-lg mr-3">
                        <ArrowRightLeft size={16} color="#7c3aed" />
                      </View>
                      <Text className="font-medium text-gray-800">
                        Transfer #{transferHistory.length - index}
                      </Text>
                    </View>
                    <View className="flex-row items-center">
                      <Calendar size={14} color="#6b7280" />
                      <Text className="text-gray-500 text-sm ml-1">
                        {format(new Date(record.transferred_at), "MMM dd, yyyy")}
                      </Text>
                    </View>
                  </View>

                  <View className="flex-row items-center mb-3">
                    <View className="flex-1">
                      <Text className="text-gray-600 text-sm mb-1">From</Text>
                      <View className="flex-row items-center">
                        <Building2 size={16} color="#6b7280" />
                        <Text className="text-gray-800 font-medium ml-2">
                          {record.from_restaurant?.name || "Unassigned"}
                        </Text>
                      </View>
                    </View>
                    
                    <View className="mx-4">
                      <ArrowRightLeft size={20} color="#7c3aed" />
                    </View>
                    
                    <View className="flex-1">
                      <Text className="text-gray-600 text-sm mb-1">To</Text>
                      <View className="flex-row items-center">
                        <Building2 size={16} color="#6b7280" />
                        <Text className="text-gray-800 font-medium ml-2">
                          {record.to_restaurant?.name || "Unknown"}
                        </Text>
                      </View>
                    </View>
                  </View>

                  {record.transferred_by_user && (
                    <View className="flex-row items-center mb-2">
                      <User size={14} color="#6b7280" />
                      <Text className="text-gray-600 text-sm ml-2">
                        Transferred by {record.transferred_by_user.name || record.transferred_by_user.email}
                      </Text>
                    </View>
                  )}

                  {record.notes && (
                    <View className="bg-white rounded-lg p-3 mt-2">
                      <Text className="text-gray-700 text-sm">{record.notes}</Text>
                    </View>
                  )}

                  <Text className="text-gray-400 text-xs mt-2">
                    {formatDistanceToNow(new Date(record.transferred_at), { addSuffix: true })}
                  </Text>
                </View>
              ))}
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
