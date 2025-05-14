import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  SafeAreaView,
  Alert,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  TextInput,
} from "react-native";
import { supabase } from "../../lib/supabase";
import DeviceCard from "../../components/DeviceCard";
import AddDeviceForm from "../../components/AddDeviceForm";
import DeviceStatusUpdater from "../../components/DeviceStatusUpdater";
import DeviceMaintenanceScheduler from "../../components/DeviceMaintenanceScheduler";
import { useAuth } from "../../components/AuthProvider";
import { useRouter } from "expo-router";
import {
  Database,
  Tag,
  Upload,
  Plus,
  QrCode,
  Search,
} from "lucide-react-native";
import { StatusBar } from "expo-status-bar";

interface Device {
  id: string;
  name: string;
  serial_number: string;
  model: string;
  status: string;
  restaurant_id: string;
  restaurant_name?: string;
  last_maintenance?: string;
}

export default function DevicesScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const [showAddDevice, setShowAddDevice] = useState(false);
  const [showStatusUpdater, setShowStatusUpdater] = useState(false);
  const [showMaintenanceScheduler, setShowMaintenanceScheduler] =
    useState(false);
  const [selectedDevice, setSelectedDevice] = useState<Device | null>(null);
  const [restaurants, setRestaurants] = useState<
    { id: string; name: string }[]
  >([]);
  const [devices, setDevices] = useState<Device[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  // Check authentication and fetch data
  useEffect(() => {
    if (!user) {
      router.replace("/auth/login");
    } else {
      fetchRestaurants();
      fetchDevices();
    }
  }, [user]);

  const fetchRestaurants = async () => {
    try {
      const { data, error } = await supabase
        .from("restaurants")
        .select("id, name");

      if (error) throw error;

      if (data && data.length > 0) {
        setRestaurants(data);
      }
    } catch (error) {
      console.error("Error fetching restaurants:", error);
      Alert.alert("Error", "Failed to load restaurants");
    }
  };

  const fetchDevices = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("devices")
        .select(
          `
          *,
          restaurants:restaurant_id(id, name)
        `,
        )
        .order("name");

      if (error) throw error;

      if (data) {
        const formattedDevices = data.map((device) => ({
          ...device,
          restaurant_name: device.restaurants?.name || "Unknown Restaurant",
        }));
        setDevices(formattedDevices);
      }
    } catch (error) {
      console.error("Error fetching devices:", error);
      Alert.alert("Error", "Failed to load devices");
    } finally {
      setLoading(false);
    }
  };

  const handleAddDevice = () => {
    setSelectedDevice(null);
    setShowAddDevice(true);
  };

  const handleScanSerial = () => {
    router.push("/devices/scan");
  };

  const handleSelectDevice = (device: Device) => {
    setSelectedDevice(device);
  };

  const handleScheduleMaintenance = (device: Device) => {
    setSelectedDevice(device);
    setShowMaintenanceScheduler(true);
  };

  const handleUpdateStatus = (device: Device) => {
    setSelectedDevice(device);
    setShowStatusUpdater(true);
  };

  const navigateToBulkImport = () => {
    router.push("/devices/bulk-import");
  };

  const navigateToCategories = () => {
    router.push("/devices/categories");
  };

  const handleDeviceFormSuccess = () => {
    setShowAddDevice(false);
    fetchDevices(); // Refresh the device list
  };

  const handleStatusUpdateSuccess = (newStatus: string) => {
    setShowStatusUpdater(false);
    fetchDevices(); // Refresh the device list
  };

  const handleMaintenanceSuccess = () => {
    setShowMaintenanceScheduler(false);
    fetchDevices(); // Refresh the device list
  };

  const filteredDevices = devices.filter((device) => {
    if (!searchQuery) return true;

    return (
      device.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      device.serial_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
      device.restaurant_name?.toLowerCase().includes(searchQuery.toLowerCase())
    );
  });

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      <StatusBar style="auto" />

      {showAddDevice ? (
        <AddDeviceForm
          onCancel={() => setShowAddDevice(false)}
          onSuccess={handleDeviceFormSuccess}
          restaurants={restaurants.map((r) => r.name)}
          initialSerialNumber={selectedDevice?.serial_number}
        />
      ) : showStatusUpdater && selectedDevice ? (
        <DeviceStatusUpdater
          device={{
            id: selectedDevice.id,
            name: selectedDevice.name,
            serialNumber: selectedDevice.serial_number,
            restaurant: selectedDevice.restaurant_name || "",
            status: selectedDevice.status as
              | "operational"
              | "maintenance"
              | "offline",
          }}
          onCancel={() => setShowStatusUpdater(false)}
          onSuccess={handleStatusUpdateSuccess}
        />
      ) : showMaintenanceScheduler && selectedDevice ? (
        <DeviceMaintenanceScheduler
          device={{
            id: selectedDevice.id,
            name: selectedDevice.name,
            serialNumber: selectedDevice.serial_number,
            restaurant: selectedDevice.restaurant_name || "",
            status: selectedDevice.status,
          }}
          onClose={() => setShowMaintenanceScheduler(false)}
          onSuccess={handleMaintenanceSuccess}
        />
      ) : (
        <>
          {/* Header */}
          <View className="flex-row justify-between items-center px-5 py-4 bg-gradient-to-r from-blue-700 to-blue-900 shadow-lg">
            <Text className="text-2xl font-bold text-white">
              Restaurant Devices
            </Text>
            <View className="flex-row">
              <TouchableOpacity
                className="bg-blue-500 p-2.5 rounded-full mr-2 shadow-md"
                onPress={handleScanSerial}
              >
                <QrCode size={22} color="white" />
              </TouchableOpacity>
              <TouchableOpacity
                className="bg-blue-500 p-2.5 rounded-full shadow-md"
                onPress={handleAddDevice}
              >
                <Plus size={22} color="white" />
              </TouchableOpacity>
            </View>
          </View>

          {/* Admin Tools */}
          <View className="bg-white p-4 border-b border-gray-200">
            <Text className="font-bold text-lg mb-2">
              Device Management Tools
            </Text>
            <View className="flex-row">
              <TouchableOpacity
                className="bg-blue-100 p-3 rounded-lg mr-2 flex-row items-center"
                onPress={navigateToBulkImport}
              >
                <Upload size={18} color="#1e40af" />
                <Text className="text-blue-800 ml-1">Bulk Import</Text>
              </TouchableOpacity>
              <TouchableOpacity
                className="bg-purple-100 p-3 rounded-lg flex-row items-center"
                onPress={navigateToCategories}
              >
                <Tag size={18} color="#7e22ce" />
                <Text className="text-purple-800 ml-1">Categories</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Search */}
          <View className="p-4 bg-white shadow-sm">
            <View className="flex-row items-center bg-gray-100 rounded-xl px-4 py-3">
              <Search size={20} color="#4b5563" />
              <TextInput
                className="flex-1 ml-3 py-1 text-base"
                placeholder="Search devices..."
                value={searchQuery}
                onChangeText={setSearchQuery}
                placeholderTextColor="#9ca3af"
              />
            </View>
          </View>

          {/* Device list */}
          <View className="flex-1 p-4">
            {loading ? (
              <View className="flex-1 justify-center items-center">
                <ActivityIndicator size="large" color="#1e40af" />
                <Text className="mt-2 text-gray-600">Loading devices...</Text>
              </View>
            ) : filteredDevices.length > 0 ? (
              <FlatList
                data={filteredDevices}
                renderItem={({ item }) => (
                  <DeviceCard
                    device={item}
                    onPress={() => {
                      setSelectedDevice(item);
                      setShowStatusUpdater(true);
                    }}
                  />
                )}
                keyExtractor={(item) => item.id}
                showsVerticalScrollIndicator={false}
              />
            ) : (
              <View className="flex-1 justify-center items-center">
                <Text className="text-gray-500 text-center">
                  {searchQuery
                    ? "No devices match your search"
                    : "No devices found"}
                </Text>
                <TouchableOpacity
                  className="mt-4 bg-blue-600 px-4 py-2 rounded-lg"
                  onPress={handleAddDevice}
                >
                  <Text className="text-white font-medium">Add Device</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </>
      )}
    </SafeAreaView>
  );
}
