import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  Alert,
  Image,
  Share,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { useLocalSearchParams, useRouter } from "expo-router";
import {
  ArrowLeft,
  QrCode,
  Download,
  Share2,
  Check,
  PackageOpen,
  Search,
  RefreshCw,
} from "lucide-react-native";
import { supabase } from "../../lib/supabase";
import QRCodeGenerator from "../../components/QRCodeGenerator";
import { captureRef } from "react-native-view-shot";

type Device = {
  id: string;
  name: string;
  serial_number: string;
  qr_code?: string;
  restaurant?: {
    name: string;
  } | null;
};

interface DeviceQRData {
  id: string;
  serial: string;
  name?: string;
  type: string;
}

export default function QRCodesScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const [devices, setDevices] = useState<Device[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDevice, setSelectedDevice] = useState<Device | null>(null);
  const [generatingQR, setGeneratingQR] = useState(false);

  useEffect(() => {
    fetchDevices();
  }, []);

  useEffect(() => {
    // If direct data is passed in params, use it directly
    if (params.data && params.name && params.id) {
      const deviceData = typeof params.data === 'string' ? params.data : '';
      const deviceName = typeof params.name === 'string' ? params.name : '';
      const deviceId = typeof params.id === 'string' ? params.id : '';
      
      if (deviceData && deviceName && deviceId) {
        // Create a device object from the params
        setSelectedDevice({
          id: deviceId,
          name: deviceName,
          serial_number: '',  // We don't need this for display
          qr_code: deviceData
        });
        return;
      }
    }
    
    // If only ID is passed in params, select that device
    if (params.id) {
      const deviceId = typeof params.id === 'string' ? params.id : '';
      if (deviceId) {
        fetchSingleDevice(deviceId);
      }
    }
  }, [params]);

  const fetchDevices = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("devices")
        .select(`
          id,
          name,
          serial_number,
          qr_code,
          restaurant:restaurants(name)
        `)
        .order("name");

      if (error) {
        console.error("Error fetching devices:", error);
        Alert.alert("Error", "Failed to load devices");
        return;
      }

      // Convert data to the proper Device type
      const typedData: Device[] = (data || []).map(item => {
        // Ensure restaurant has the correct shape if present
        let restaurant = null;
        if (item.restaurant) {
          if (Array.isArray(item.restaurant)) {
            // Handle case where restaurant is an array (from the join)
            restaurant = item.restaurant.length > 0 && item.restaurant[0]?.name 
              ? { name: String(item.restaurant[0].name) }
              : null;
          } else if (typeof item.restaurant === 'object' && item.restaurant !== null) {
            // Handle case where restaurant is an object with name property
            const restaurantObj = item.restaurant as any;
            restaurant = restaurantObj.name ? { name: String(restaurantObj.name) } : null;
          }
        }
        
        return {
          id: item.id,
          name: item.name || 'Unnamed Device',
          serial_number: item.serial_number || 'No Serial',
          qr_code: item.qr_code,
          restaurant
        };
      });

      setDevices(typedData);
    } catch (error) {
      console.error("Exception fetching devices:", error);
      Alert.alert("Error", "An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  };

  const fetchSingleDevice = async (deviceId: string) => {
    try {
      const { data, error } = await supabase
        .from("devices")
        .select(`
          id,
          name,
          serial_number,
          qr_code,
          restaurant:restaurants(name)
        `)
        .eq("id", deviceId)
        .maybeSingle();

      if (error) {
        console.error("Error fetching device:", error);
        Alert.alert("Error", "Failed to load device details");
        return;
      }

      if (data) {
        // Convert to proper type with safety checks
        const typedDevice: Device = {
          id: data.id,
          name: data.name || 'Unnamed Device',
          serial_number: data.serial_number || 'No Serial',
          qr_code: data.qr_code,
          restaurant: null
        };
        
        // Safely handle restaurant data which could be null, an object, or an array
        if (data.restaurant) {
          if (Array.isArray(data.restaurant)) {
            if (data.restaurant.length > 0 && data.restaurant[0] && typeof data.restaurant[0] === 'object') {
              const restaurantItem = data.restaurant[0] as any;
              if (restaurantItem.name) {
                typedDevice.restaurant = { name: String(restaurantItem.name) };
              }
            }
          } else if (typeof data.restaurant === 'object' && data.restaurant !== null) {
            const restaurantObj = data.restaurant as any;
            if (restaurantObj.name) {
              typedDevice.restaurant = { name: String(restaurantObj.name) };
            }
          }
        }
        
        setSelectedDevice(typedDevice);
        
        // Generate QR code if missing
        if (!typedDevice.qr_code) {
          generateQRCode(typedDevice);
        }
      } else {
        Alert.alert("Error", "Device not found");
      }
    } catch (error) {
      console.error("Exception fetching device:", error);
      Alert.alert("Error", "An unexpected error occurred");
    }
  };

  const generateQRCode = async (device: Device): Promise<string | null> => {
    if (generatingQR) return null;

    try {
      setGeneratingQR(true);
      
      // Create QR code data
      const qrData: DeviceQRData = {
        id: device.id,
        serial: device.serial_number,
        name: device.name,
        type: "device"
      };
      
      // Convert to JSON string
      const qrDataString = JSON.stringify(qrData);

      // Update device with QR code data - we store the data directly now
      const { error } = await supabase
        .from("devices")
        .update({ qr_code: qrDataString })
        .eq("id", device.id);

      if (error) {
        console.error("Error updating device with QR code:", error);
        Alert.alert("Error", "Failed to save QR code to device record");
        return null;
      }

      // Update local state
      if (selectedDevice && selectedDevice.id === device.id) {
        setSelectedDevice({ ...selectedDevice, qr_code: qrDataString });
      }

      // Update in the list
      setDevices(devices.map(d => 
        d.id === device.id ? { ...d, qr_code: qrDataString } : d
      ));

      return qrDataString;
    } catch (error) {
      console.error("Error generating QR code:", error);
      Alert.alert("Error", "Failed to generate QR code. Please try again later.");
      return null;
    } finally {
      setGeneratingQR(false);
    }
  };

  const regenerateQRCode = async (device: Device) => {
    try {
      // Re-create QR code data
      const regeneratedQR = await generateQRCode(device);
      if (!regeneratedQR) {
        Alert.alert("Error", "Failed to regenerate QR code");
        return;
      }
      
      Alert.alert("Success", "QR code has been regenerated successfully");
    } catch (error) {
      console.error("Error regenerating QR code:", error);
      Alert.alert("Error", "An error occurred while regenerating the QR code");
    }
  };

  const renderDeviceItem = ({ item }: { item: Device }) => (
    <TouchableOpacity
      className="bg-white p-4 rounded-lg shadow-sm mb-3 flex-row justify-between items-center"
      onPress={() => setSelectedDevice(item)}
    >
      <View className="flex-1">
        <Text className="text-lg font-semibold text-gray-800">{item.name}</Text>
        {item.restaurant?.name && (
          <Text className="text-sm text-gray-600">{item.restaurant.name}</Text>
        )}
        <Text className="text-xs text-gray-500 mt-1">SN: {item.serial_number}</Text>
      </View>
      
      <View className="flex-row items-center">
        {item.qr_code ? (
          <View className="bg-green-100 p-2 rounded-full">
            <QrCode size={20} color="#047857" />
          </View>
        ) : (
          <TouchableOpacity
            className="bg-blue-100 p-2 rounded-full"
            onPress={() => generateQRCode(item)}
          >
            <QrCode size={20} color="#2563EB" />
          </TouchableOpacity>
        )}
      </View>
    </TouchableOpacity>
  );

  const renderQRCodeDetail = () => {
    if (!selectedDevice || !selectedDevice.qr_code) {
      return (
        <View className="flex-1 items-center justify-center p-4">
          <Text className="text-lg text-gray-500 text-center mb-4">
            {selectedDevice
              ? "No QR code available for this device. Generate one first."
              : "Select a device to view its QR code"}
          </Text>
          
          {selectedDevice && (
            <TouchableOpacity
              className="bg-blue-500 px-4 py-2 rounded-lg"
              onPress={() => generateQRCode(selectedDevice)}
              disabled={generatingQR}
            >
              {generatingQR ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <Text className="text-white font-medium">Generate QR Code</Text>
              )}
            </TouchableOpacity>
          )}
        </View>
      );
    }

    return (
      <View className="flex-1 p-4">
        <View className="bg-white rounded-lg shadow-sm p-6 items-center">
          <Text className="text-xl font-bold text-gray-800 mb-2">{selectedDevice.name}</Text>
          {selectedDevice.restaurant?.name && (
            <Text className="text-gray-600 mb-4">{selectedDevice.restaurant.name}</Text>
          )}
          
          <View className="mt-2 mb-6">
            <QRCodeGenerator 
              value={selectedDevice.qr_code}
              size={250}
              fileName={`device-${selectedDevice.id}`}
              shareTitle={`QR Code for ${selectedDevice.name}`}
              showActions={true}
              formatJSON={true}
            />
          </View>
          
          <TouchableOpacity
            className="mt-4 bg-blue-500 px-4 py-2 rounded-lg flex-row items-center"
            onPress={() => regenerateQRCode(selectedDevice)}
          >
            <RefreshCw size={16} color="#FFFFFF" className="mr-2" />
            <Text className="text-white font-medium">Regenerate QR Code</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      <StatusBar style="dark" />
      
      <View className="flex-row justify-between items-center p-4 border-b border-gray-200 bg-white">
        <View className="flex-row items-center">
          <TouchableOpacity onPress={() => router.back()} className="mr-4">
            <ArrowLeft size={24} color="#0F172A" />
          </TouchableOpacity>
          <Text className="text-xl font-bold text-gray-800">Device QR Codes</Text>
        </View>
      </View>
      
      {loading && !selectedDevice ? (
        <View className="flex-1 justify-center items-center">
          <ActivityIndicator size="large" color="#4F46E5" />
          <Text className="mt-2 text-gray-600">Loading devices...</Text>
        </View>
      ) : (
        <View className="flex-1">
          {selectedDevice ? (
            <View className="flex-1">
              {renderQRCodeDetail()}
              
              <TouchableOpacity
                className="p-4 bg-gray-100"
                onPress={() => setSelectedDevice(null)}
              >
                <Text className="text-center text-blue-600">Back to Device List</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <FlatList
              data={devices}
              renderItem={renderDeviceItem}
              keyExtractor={(item) => item.id}
              contentContainerStyle={{ padding: 16 }}
              ListEmptyComponent={
                <View className="bg-white rounded-lg p-4 flex items-center justify-center">
                  <PackageOpen size={40} color="#9CA3AF" />
                  <Text className="text-lg text-gray-600 mt-2">No devices found</Text>
                  <Text className="text-sm text-gray-500 mt-1">
                    Add a device to generate a QR code
                  </Text>
                </View>
              }
            />
          )}
        </View>
      )}
    </SafeAreaView>
  );
} 