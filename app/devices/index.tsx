import React, { useState } from "react";
import { View, Text, TouchableOpacity, Modal } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { useRouter } from "expo-router";
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
      ) : (
        <DeviceInventory
          onAddDevice={handleAddDevice}
          onScanSerial={handleScanSerial}
          onSelectDevice={handleSelectDevice}
          onScheduleMaintenance={handleScheduleMaintenance}
          onUpdateStatus={handleUpdateStatus}
        />
      )}

      {/* Barcode Scanner Modal */}
      <Modal
        visible={showBarcodeScanner}
        animationType="slide"
        onRequestClose={() => setShowBarcodeScanner(false)}
      >
        <BarcodeScanner
          onScan={handleBarcodeScan}
          onClose={() => setShowBarcodeScanner(false)}
        />
      </Modal>
    </SafeAreaView>
  );
}
