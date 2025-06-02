import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  Image,
  RefreshControl,
  Share,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { useRouter, useLocalSearchParams } from "expo-router";
import {
  ArrowLeft,
  Edit,
  QrCode,
  Package,
  Building2,
  Calendar,
  Wrench,
  AlertCircle,
  CheckCircle2,
  Share2,
  FileText,
  Camera,
  Settings,
  Trash2,
  CircleDot,
} from "lucide-react-native";
import { supabase } from "../../../lib/supabase";
import { formatDistanceToNow, format } from "date-fns";
import QRCodeGenerator from "../../../components/QRCodeGenerator";

type Device = {
  id: string;
  name: string;
  serial_number: string;
  type: string;
  model?: string;
  status: "operational" | "maintenance" | "offline";
  restaurant_id: string;
  restaurant?: { name: string; address?: string };
  category_id?: string;
  category?: { name: string; color?: string; maintenance_interval?: number };
  last_maintenance?: string;
  next_maintenance_date?: string;
  warranty_expiry?: string;
  purchase_date?: string;
  qr_code?: string;
  qr_code_data?: any;
  custom_fields?: Record<string, any>;
  image?: string;
  notes?: string;
  created_at: string;
  updated_at?: string;
};

export default function DeviceDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [device, setDevice] = useState<Device | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showQRCode, setShowQRCode] = useState(false);

  useEffect(() => {
    if (id) {
      fetchDevice();
    }
  }, [id]);

  const fetchDevice = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("devices")
        .select(`
          *,
          restaurant:restaurants(name, address),
          category:device_categories(name, color, maintenance_interval)
        `)
        .eq("id", id)
        .single();

      if (error) {
        console.error("Error fetching device:", error);
        Alert.alert("Error", "Failed to load device details");
        return;
      }

      setDevice(data);
    } catch (error) {
      console.error("Exception fetching device:", error);
      Alert.alert("Error", "An unexpected error occurred");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchDevice();
  };

  const handleDelete = () => {
    Alert.alert(
      "Delete Device",
      `Are you sure you want to delete "${device?.name}"? This action cannot be undone.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              const { error } = await supabase
                .from("devices")
                .delete()
                .eq("id", id);

              if (error) {
                Alert.alert("Error", "Failed to delete device");
                return;
              }

              Alert.alert("Success", "Device deleted successfully", [
                { text: "OK", onPress: () => router.back() }
              ]);
            } catch (error) {
              Alert.alert("Error", "Failed to delete device");
            }
          },
        },
      ]
    );
  };

  const handleShare = async () => {
    if (!device) return;

    const shareContent = `Device: ${device.name}
Serial: ${device.serial_number}
Model: ${device.model || device.type}
Status: ${device.status}
Location: ${device.restaurant?.name || "Unassigned"}`;

    try {
      await Share.share({
        message: shareContent,
        title: `Device: ${device.name}`,
      });
    } catch (error) {
      console.error("Error sharing:", error);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "operational":
        return "#10B981";
      case "maintenance":
        return "#F59E0B";
      case "offline":
        return "#EF4444";
      default:
        return "#6B7280";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "operational":
        return <CheckCircle2 size={20} color="#10B981" />;
      case "maintenance":
        return <Wrench size={20} color="#F59E0B" />;
      case "offline":
        return <AlertCircle size={20} color="#EF4444" />;
      default:
        return <CircleDot size={20} color="#6B7280" />;
    }
  };

  const isMaintenanceDue = () => {
    if (!device?.last_maintenance || !device?.category?.maintenance_interval) return false;

    const lastMaint = new Date(device.last_maintenance);
    const interval = device.category.maintenance_interval;
    const nextMaint = new Date(lastMaint);
    nextMaint.setDate(nextMaint.getDate() + interval);

    return nextMaint <= new Date();
  };

  const getNextMaintenanceDate = () => {
    if (!device?.last_maintenance || !device?.category?.maintenance_interval) return null;

    const lastMaint = new Date(device.last_maintenance);
    const interval = device.category.maintenance_interval;
    const nextMaint = new Date(lastMaint);
    nextMaint.setDate(nextMaint.getDate() + interval);

    return nextMaint;
  };

  if (loading) {
    return (
      <SafeAreaView className="flex-1 bg-gray-50">
        <StatusBar style="dark" />
        <View className="flex-1 justify-center items-center">
          <ActivityIndicator size="large" color="#1D4ED8" />
          <Text className="mt-4 text-gray-600">Loading device details...</Text>
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
          <Text className="text-gray-600 text-center mt-2">
            The device you're looking for doesn't exist or has been removed.
          </Text>
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

  const nextMaintenanceDate = getNextMaintenanceDate();
  const maintenanceDue = isMaintenanceDue();

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      <StatusBar style="dark" />

      {/* Enhanced Header */}
      <View className="px-6 py-6 bg-gradient-to-br from-indigo-600 via-purple-600 to-blue-700 shadow-2xl">
        <View className="flex-row justify-between items-center">
          <View className="flex-row items-center flex-1">
            <TouchableOpacity
              onPress={() => router.back()}
              className="bg-white/20 p-3 rounded-2xl mr-4 backdrop-blur-sm"
            >
              <ArrowLeft size={24} color="#ffffff" />
            </TouchableOpacity>
            <View className="flex-1">
              <Text className="text-2xl font-bold text-white">Device Details</Text>
              <Text className="text-indigo-100 text-sm">Complete device information</Text>
            </View>
          </View>
          <View className="flex-row space-x-3">
            <TouchableOpacity
              onPress={handleShare}
              className="bg-white/20 p-3 rounded-2xl backdrop-blur-sm"
            >
              <Share2 size={24} color="#ffffff" />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => router.push(`/devices/edit/${device.id}`)}
              className="bg-white/20 p-3 rounded-2xl backdrop-blur-sm"
            >
              <Edit size={24} color="#ffffff" />
            </TouchableOpacity>
          </View>
        </View>
      </View>

      <ScrollView
        className="flex-1"
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* Enhanced Device Hero Section */}
        <View className="bg-white rounded-3xl mx-6 -mt-8 p-8 shadow-2xl border border-gray-100 relative z-10">
          <View className="items-center mb-8">
            <View className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-3xl p-6 mb-6 shadow-lg">
              {device.image ? (
                <Image
                  source={{ uri: device.image }}
                  className="w-40 h-40 rounded-2xl"
                  resizeMode="cover"
                />
              ) : (
                <Package size={100} color={device.category?.color || "#6366f1"} />
              )}
            </View>

            <Text className="text-3xl font-bold text-gray-800 text-center mb-2">{device.name}</Text>
            <Text className="text-gray-600 text-lg mb-4">{device.model || device.type}</Text>

            <View
              className="flex-row items-center px-6 py-3 rounded-2xl shadow-lg"
              style={{ backgroundColor: getStatusColor(device.status) }}
            >
              {getStatusIcon(device.status)}
              <Text className="ml-3 text-white text-lg font-bold">
                {device.status.charAt(0).toUpperCase() + device.status.slice(1)}
              </Text>
            </View>
          </View>

          {/* Maintenance Alert */}
          {maintenanceDue && (
            <View className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-4">
              <View className="flex-row items-center">
                <AlertCircle size={20} color="#F59E0B" />
                <Text className="text-amber-800 font-medium ml-2">Maintenance Due</Text>
              </View>
              <Text className="text-amber-700 mt-1">
                This device requires maintenance. Please schedule service as soon as possible.
              </Text>
            </View>
          )}
        </View>

        {/* Device Information */}
        <View className="bg-white rounded-lg shadow-sm p-4 mb-4 mx-4">
          <Text className="text-lg font-semibold text-gray-800 mb-4">Device Information</Text>

          <View className="space-y-3">
            <View className="flex-row justify-between py-2 border-b border-gray-100">
              <Text className="text-gray-600">Serial Number</Text>
              <Text className="text-gray-800 font-medium">{device.serial_number}</Text>
            </View>

            <View className="flex-row justify-between py-2 border-b border-gray-100">
              <Text className="text-gray-600">Model</Text>
              <Text className="text-gray-800 font-medium">{device.model || device.type}</Text>
            </View>

            <View className="flex-row justify-between py-2 border-b border-gray-100">
              <Text className="text-gray-600">Category</Text>
              <Text className="text-gray-800 font-medium">{device.category?.name || "Uncategorized"}</Text>
            </View>

            <View className="flex-row justify-between py-2 border-b border-gray-100">
              <Text className="text-gray-600">Location</Text>
              <Text className="text-gray-800 font-medium">{device.restaurant?.name || "Unassigned"}</Text>
            </View>

            {device.purchase_date && (
              <View className="flex-row justify-between py-2 border-b border-gray-100">
                <Text className="text-gray-600">Purchase Date</Text>
                <Text className="text-gray-800 font-medium">
                  {format(new Date(device.purchase_date), "MMM dd, yyyy")}
                </Text>
              </View>
            )}

            {device.warranty_expiry && (
              <View className="flex-row justify-between py-2 border-b border-gray-100">
                <Text className="text-gray-600">Warranty Expiry</Text>
                <Text className="text-gray-800 font-medium">
                  {format(new Date(device.warranty_expiry), "MMM dd, yyyy")}
                </Text>
              </View>
            )}

            <View className="flex-row justify-between py-2">
              <Text className="text-gray-600">Added</Text>
              <Text className="text-gray-800 font-medium">
                {formatDistanceToNow(new Date(device.created_at), { addSuffix: true })}
              </Text>
            </View>
          </View>
        </View>

        {/* Maintenance Information */}
        <View className="bg-white rounded-lg shadow-sm p-4 mb-4 mx-4">
          <Text className="text-lg font-semibold text-gray-800 mb-4">Maintenance</Text>

          <View className="space-y-3">
            {device.last_maintenance ? (
              <View className="flex-row justify-between py-2 border-b border-gray-100">
                <Text className="text-gray-600">Last Maintenance</Text>
                <Text className="text-gray-800 font-medium">
                  {format(new Date(device.last_maintenance), "MMM dd, yyyy")}
                </Text>
              </View>
            ) : (
              <View className="flex-row justify-between py-2 border-b border-gray-100">
                <Text className="text-gray-600">Last Maintenance</Text>
                <Text className="text-gray-500 italic">Never</Text>
              </View>
            )}

            {nextMaintenanceDate && (
              <View className="flex-row justify-between py-2 border-b border-gray-100">
                <Text className="text-gray-600">Next Maintenance</Text>
                <Text
                  className={`font-medium ${maintenanceDue ? "text-amber-600" : "text-gray-800"}`}
                >
                  {format(nextMaintenanceDate, "MMM dd, yyyy")}
                  {maintenanceDue && " (Overdue)"}
                </Text>
              </View>
            )}

            {device.category?.maintenance_interval && (
              <View className="flex-row justify-between py-2">
                <Text className="text-gray-600">Maintenance Interval</Text>
                <Text className="text-gray-800 font-medium">
                  Every {device.category.maintenance_interval} days
                </Text>
              </View>
            )}
          </View>

          <TouchableOpacity
            className="bg-blue-500 rounded-lg p-3 mt-4 flex-row items-center justify-center"
            onPress={() => router.push(`/maintenance/create?device_id=${device.id}`)}
          >
            <Wrench size={18} color="#FFFFFF" />
            <Text className="text-white font-medium ml-2">Schedule Maintenance</Text>
          </TouchableOpacity>
        </View>

        {/* Custom Fields */}
        {device.custom_fields && Object.keys(device.custom_fields).length > 0 && (
          <View className="bg-white rounded-lg shadow-sm p-4 mb-4 mx-4">
            <Text className="text-lg font-semibold text-gray-800 mb-4">Custom Fields</Text>

            <View className="space-y-3">
              {Object.entries(device.custom_fields).map(([key, value]) => (
                <View key={key} className="flex-row justify-between py-2 border-b border-gray-100">
                  <Text className="text-gray-600 capitalize">{key.replace(/_/g, ' ')}</Text>
                  <Text className="text-gray-800 font-medium flex-1 text-right">
                    {typeof value === 'boolean' ? (value ? 'Yes' : 'No') : String(value)}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* QR Code Section */}
        <View className="bg-white rounded-lg shadow-sm p-4 mb-4 mx-4">
          <Text className="text-lg font-semibold text-gray-800 mb-4">QR Code</Text>

          {device.qr_code ? (
            <View className="items-center">
              <TouchableOpacity
                className="bg-gray-100 rounded-lg p-4 mb-4"
                onPress={() => setShowQRCode(!showQRCode)}
              >
                {showQRCode ? (
                  <QRCodeGenerator
                    value={device.qr_code}
                    size={200}
                  />
                ) : (
                  <View className="w-48 h-48 justify-center items-center">
                    <QrCode size={64} color="#6B7280" />
                    <Text className="text-gray-600 mt-2">Tap to show QR code</Text>
                  </View>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                className="bg-blue-500 rounded-lg p-3 flex-row items-center"
                onPress={() => {
                  // Share QR code data
                  Share.share({
                    message: device.qr_code || '',
                    title: `QR Code for ${device.name}`,
                  });
                }}
              >
                <Share2 size={18} color="#FFFFFF" />
                <Text className="text-white font-medium ml-2">Share QR Code</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View className="items-center py-8">
              <QrCode size={48} color="#9CA3AF" />
              <Text className="text-gray-500 mt-2">No QR code generated</Text>
              <TouchableOpacity
                className="bg-blue-500 rounded-lg px-4 py-2 mt-3"
                onPress={() => router.push(`/devices/edit/${device.id}`)}
              >
                <Text className="text-white font-medium">Generate QR Code</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Action Buttons */}
        <View className="bg-white rounded-lg shadow-sm p-4 mb-4 mx-4">
          <Text className="text-lg font-semibold text-gray-800 mb-4">Quick Actions</Text>

          <View className="space-y-3">
            <TouchableOpacity
              className="bg-blue-500 rounded-lg p-4 flex-row items-center justify-center md:justify-start"
              onPress={() => {
                router.push(`/devices/edit/${device.id}`);
                Alert.alert("📝 Editing Device", `Opening edit form for "${device.name}"`);
              }}
            >
              <Edit size={20} color="#FFFFFF" />
              <Text className="text-white font-medium ml-3">Edit Device</Text>
            </TouchableOpacity>

            <TouchableOpacity
              className="bg-green-500 rounded-lg p-4 flex-row items-center justify-center md:justify-start"
              onPress={() => {
                router.push(`/tickets/create?device_id=${device.id}`);
                Alert.alert("🎫 Creating Ticket", `Creating support ticket for "${device.name}"`);
              }}
            >
              <FileText size={20} color="#FFFFFF" />
              <Text className="text-white font-medium ml-3">Create Ticket</Text>
            </TouchableOpacity>

            <TouchableOpacity
              className="bg-amber-500 rounded-lg p-4 flex-row items-center justify-center md:justify-start"
              onPress={() => {
                router.push(`/devices/maintenance/create?device_id=${device.id}`);
                Alert.alert("🔧 Scheduling Maintenance", `Opening maintenance scheduler for "${device.name}"`);
              }}
            >
              <Wrench size={20} color="#FFFFFF" />
              <Text className="text-white font-medium ml-3">Schedule Maintenance</Text>
            </TouchableOpacity>

            <TouchableOpacity
              className="bg-purple-500 rounded-lg p-4 flex-row items-center justify-center md:justify-start"
              onPress={() => {
                router.push(`/devices/maintenance/history?device_id=${device.id}`);
                Alert.alert("📋 Maintenance History", `Viewing maintenance records for "${device.name}"`);
              }}
            >
              <Settings size={20} color="#FFFFFF" />
              <Text className="text-white font-medium ml-3">Maintenance History</Text>
            </TouchableOpacity>

            <TouchableOpacity
              className="bg-red-500 rounded-lg p-4 flex-row items-center justify-center md:justify-start"
              onPress={handleDelete}
            >
              <Trash2 size={20} color="#FFFFFF" />
              <Text className="text-white font-medium ml-3">Delete Device</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View className="h-20" />
      </ScrollView>
    </SafeAreaView>
  );
}