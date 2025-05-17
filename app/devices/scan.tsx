import React, { useState } from "react";
import { View, Text, TouchableOpacity, Alert, TextInput } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { useRouter } from "expo-router";
import { ArrowLeft, Barcode, Search } from "lucide-react-native";
import BarcodeScanner from "../../components/BarcodeScanner";
import { supabase } from "../../lib/supabase";

export default function ScanDeviceScreen() {
  const router = useRouter();
  const [showScanner, setShowScanner] = useState(false);
  const [serialNumber, setSerialNumber] = useState("");
  const [scanning, setScanning] = useState(false);

  const handleScan = async (data: string, type: string) => {
    setShowScanner(false);
    setSerialNumber(data);
    searchDevice(data);
  };

  const searchDevice = async (serial: string) => {
    if (!serial) {
      Alert.alert("Error", "Please enter a serial number");
      return;
    }

    try {
      setScanning(true);
      const { data, error } = await supabase
        .from("devices")
        .select("*")
        .eq("serial_number", serial)
        .single();

      if (error) {
        if (error.code === "PGRST116") {
          // No rows returned
          Alert.alert(
            "Device Not Found",
            "No device found with this serial number. Would you like to add it?",
            [
              { text: "Cancel", style: "cancel" },
              {
                text: "Add Device",
                onPress: () =>
                  router.push({
                    pathname: "/devices/create",
                    params: { serial: serial },
                  }),
              },
            ],
          );
        } else {
          throw error;
        }
      } else if (data) {
        // Device found, navigate to device details
        router.push(`/devices/${data.id}`);
      }
    } catch (error) {
      console.error("Error searching device:", error);
      Alert.alert("Error", "Failed to search for device");
    } finally {
      setScanning(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-white">
      <StatusBar style="auto" />

      {showScanner ? (
        <BarcodeScanner
          onScan={handleScan}
          onClose={() => setShowScanner(false)}
        />
      ) : (
        <>
          {/* Header */}
          <View className="flex-row items-center px-5 py-4 bg-gradient-to-r from-blue-700 to-blue-900 shadow-lg">
            <TouchableOpacity onPress={() => router.back()} className="mr-4">
              <ArrowLeft size={24} color="white" />
            </TouchableOpacity>
            <Text className="text-2xl font-bold text-white flex-1">
              Scan Device
            </Text>
          </View>

          <View className="flex-1 p-6">
            <View className="bg-blue-50 p-4 rounded-lg mb-8">
              <Text className="text-blue-800">
                Scan a device's serial number or enter it manually to find it in
                the system.
              </Text>
            </View>

            <View className="mb-8">
              <Text className="text-gray-700 mb-2 font-medium">
                Serial Number
              </Text>
              <View className="flex-row">
                <TextInput
                  className="border border-gray-300 rounded-l-lg px-3 py-2 flex-1"
                  placeholder="Enter serial number"
                  value={serialNumber}
                  onChangeText={setSerialNumber}
                />
                <TouchableOpacity
                  className="bg-blue-500 rounded-r-lg px-4 items-center justify-center"
                  onPress={() => setShowScanner(true)}
                >
                  <Barcode size={24} color="white" />
                </TouchableOpacity>
              </View>
            </View>

            <TouchableOpacity
              className="bg-blue-600 py-3 rounded-lg items-center mb-6 flex-row justify-center"
              onPress={() => searchDevice(serialNumber)}
              disabled={scanning || !serialNumber}
            >
              <Search size={20} color="white" className="mr-2" />
              <Text className="text-white font-bold text-lg">
                {scanning ? "Searching..." : "Search Device"}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              className="bg-green-600 py-3 rounded-lg items-center flex-row justify-center"
              onPress={() => router.push("/devices/create")}
            >
              <Text className="text-white font-bold text-lg">
                Add New Device
              </Text>
            </TouchableOpacity>
          </View>
        </>
      )}
    </SafeAreaView>
  );
}
