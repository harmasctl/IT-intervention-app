import React, { useState } from "react";
import { View, Text, SafeAreaView, Alert } from "react-native";
import { StatusBar } from "expo-status-bar";
import { useRouter } from "expo-router";
import BarcodeScanner from "../../components/BarcodeScanner";
import { supabase } from "../../lib/supabase";

export default function ScanDeviceScreen() {
  const router = useRouter();
  const [scanning, setScanning] = useState(true);

  const handleScan = async (data: string) => {
    setScanning(false);
    try {
      // Try to find the device by serial number
      const { data: deviceData, error } = await supabase
        .from("devices")
        .select("*")
        .eq("serial_number", data)
        .single();

      if (error) {
        if (error.code === "PGRST116") {
          // Device not found, ask if they want to add it
          Alert.alert(
            "Device Not Found",
            `No device found with serial number: ${data}. Would you like to add it?`,
            [
              { text: "Cancel", style: "cancel", onPress: () => router.back() },
              {
                text: "Add Device",
                onPress: () => {
                  // Navigate to add device form with pre-filled serial number
                  router.replace({
                    pathname: "/devices",
                    params: { addDevice: true, serialNumber: data },
                  });
                },
              },
            ],
          );
        } else {
          throw error;
        }
      } else if (deviceData) {
        // Device found, navigate to device details
        Alert.alert("Device Found", `Found device: ${deviceData.name}`, [
          { text: "OK", onPress: () => router.back() },
        ]);
      }
    } catch (error) {
      console.error("Error scanning device:", error);
      Alert.alert("Error", "Failed to process barcode scan");
      router.back();
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-black">
      <StatusBar style="light" />
      <BarcodeScanner
        onScan={handleScan}
        onClose={() => router.back()}
        mode="device"
      />
    </SafeAreaView>
  );
}
