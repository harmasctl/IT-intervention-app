import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  Animated,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { useRouter } from "expo-router";
import { BlurView } from "expo-blur";
import { ArrowDownUp, X } from "lucide-react-native";
import DeviceInventory from "../../components/DeviceInventory";
import AddDeviceForm from "../../components/AddDeviceForm";
import BarcodeScanner from "../../components/BarcodeScanner";
import DeviceMaintenanceScheduler from "../../components/DeviceMaintenanceScheduler";
import DeviceStatusUpdater from "../../components/DeviceStatusUpdater";

export default function DevicesScreen() {
  const router = useRouter();
  const [showAddDeviceForm, setShowAddDeviceForm] = useState(false);
  const [showBarcodeScanner, setShowBarcodeScanner] = useState(false);
  const [showMaintenanceScheduler, setShowMaintenanceScheduler] =
    useState(false);
  const [showStatusUpdater, setShowStatusUpdater] = useState(false);
  const [scannedSerial, setScannedSerial] = useState("");
  const [selectedDevice, setSelectedDevice] = useState(null);
  const [showMoveDeviceForm, setShowMoveDeviceForm] = useState(false);

  const handleAddDevice = () => {
    setShowAddDeviceForm(true);
  };

  const handleScanSerial = () => {
    setShowBarcodeScanner(true);
  };

  const handleBarcodeScan = (data: string) => {
    setScannedSerial(data);
    setShowBarcodeScanner(false);
    setShowAddDeviceForm(true);
  };

  const handleSelectDevice = (device: any) => {
    // Store the selected device for use in other components
    setSelectedDevice(device);
  };

  const handleScheduleMaintenance = (device: any) => {
    setSelectedDevice(device);
    setShowMaintenanceScheduler(true);
  };

  const handleUpdateStatus = (device: any) => {
    setSelectedDevice(device);
    setShowStatusUpdater(true);
  };

  const handleMoveDevice = (device: any) => {
    setSelectedDevice(device);
    setShowMoveDeviceForm(true);
  };

  return (
    <SafeAreaView className="flex-1 bg-white">
      <StatusBar style="auto" />

      {showAddDeviceForm ? (
        <AddDeviceForm
          onCancel={() => setShowAddDeviceForm(false)}
          onSuccess={() => {
            setShowAddDeviceForm(false);
            // In a real app, you would refresh the device list here
          }}
          initialSerialNumber={scannedSerial}
        />
      ) : showMaintenanceScheduler && selectedDevice ? (
        <DeviceMaintenanceScheduler
          device={selectedDevice}
          onCancel={() => setShowMaintenanceScheduler(false)}
          onSuccess={() => {
            setShowMaintenanceScheduler(false);
            // In a real app, you would refresh the device list here
          }}
        />
      ) : showStatusUpdater && selectedDevice ? (
        <DeviceStatusUpdater
          device={selectedDevice}
          onCancel={() => setShowStatusUpdater(false)}
          onSuccess={() => {
            setShowStatusUpdater(false);
            // In a real app, you would refresh the device list here
          }}
        />
      ) : showMoveDeviceForm && selectedDevice ? (
        <View className="flex-1 bg-white p-4">
          <View className="flex-row justify-between items-center mb-6">
            <Text className="text-2xl font-bold">Move Device</Text>
            <TouchableOpacity onPress={() => setShowMoveDeviceForm(false)}>
              <X size={24} color="#666" />
            </TouchableOpacity>
          </View>

          <View className="bg-gray-100 p-4 rounded-lg mb-4">
            <Text className="font-bold text-lg">{selectedDevice.name}</Text>
            <Text className="text-gray-600">
              S/N: {selectedDevice.serialNumber}
            </Text>
            <Text className="mt-1">
              Current Location:{" "}
              <Text className="font-bold">{selectedDevice.restaurant}</Text>
            </Text>
          </View>

          <Text className="text-gray-700 mb-3 font-medium">
            Select New Restaurant
          </Text>
          <View className="mb-6">
            {restaurants
              .filter(
                (r) =>
                  r !== "All Restaurants" && r !== selectedDevice.restaurant,
              )
              .map((restaurant) => (
                <TouchableOpacity
                  key={restaurant}
                  className="bg-white border border-gray-200 rounded-lg p-4 mb-2 flex-row justify-between items-center"
                  onPress={() => {
                    Alert.alert(
                      "Move Device",
                      `Are you sure you want to move ${selectedDevice.name} to ${restaurant}?`,
                      [
                        { text: "Cancel", style: "cancel" },
                        {
                          text: "Move",
                          onPress: () => {
                            // In a real app, this would update the device's restaurant in the database
                            Alert.alert(
                              "Success",
                              `Device moved to ${restaurant}`,
                            );
                            setShowMoveDeviceForm(false);
                          },
                        },
                      ],
                    );
                  }}
                >
                  <Text className="text-lg">{restaurant}</Text>
                  <View className="bg-blue-100 p-2 rounded-full">
                    <ArrowDownUp size={18} color="#1e40af" />
                  </View>
                </TouchableOpacity>
              ))}
          </View>
        </View>
      ) : (
        <DeviceInventory
          onAddDevice={handleAddDevice}
          onScanSerial={handleScanSerial}
          onSelectDevice={handleSelectDevice}
          onScheduleMaintenance={handleScheduleMaintenance}
          onUpdateStatus={handleUpdateStatus}
          onMoveDevice={handleMoveDevice}
        />
      )}

      {/* Barcode Scanner Modal */}
      <Modal
        visible={showBarcodeScanner}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setShowBarcodeScanner(false)}
      >
        <BlurView intensity={90} tint="dark" style={{ flex: 1 }}>
          <BarcodeScanner
            onScan={handleBarcodeScan}
            onClose={() => setShowBarcodeScanner(false)}
            mode="serial"
          />
        </BlurView>
      </Modal>
    </SafeAreaView>
  );
}
