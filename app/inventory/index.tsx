import React from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { useRouter } from "expo-router";
import DeviceInventory from "../../components/DeviceInventory";

export default function InventoryScreen() {
  const router = useRouter();

  const handleAddDevice = () => {
    // Implement add device functionality
    console.log("Add device");
  };

  const handleScanSerial = () => {
    // Implement scan serial functionality
    console.log("Scan serial");
  };

  const handleSelectDevice = (device: any) => {
    // In a real app, you would navigate to a device detail screen
    console.log("Selected device:", device);
  };

  return (
    <SafeAreaView className="flex-1 bg-white">
      <StatusBar style="auto" />
      <DeviceInventory
        onAddDevice={handleAddDevice}
        onScanSerial={handleScanSerial}
        onSelectDevice={handleSelectDevice}
      />
    </SafeAreaView>
  );
}
