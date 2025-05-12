import React, { useState, useEffect } from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { Camera } from "expo-camera";
import { BarCodeScanner } from "expo-barcode-scanner";
import { X, Check } from "lucide-react-native";

interface BarcodeScannerProps {
  onScan: (data: string) => void;
  onClose: () => void;
}

const BarcodeScanner = ({ onScan, onClose }: BarcodeScannerProps) => {
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [scanned, setScanned] = useState(false);
  const [scannedData, setScannedData] = useState<string>("");

  useEffect(() => {
    const getBarCodeScannerPermissions = async () => {
      const { status } = await BarCodeScanner.requestPermissionsAsync();
      setHasPermission(status === "granted");
    };

    getBarCodeScannerPermissions();
  }, []);

  const handleBarCodeScanned = ({
    type,
    data,
  }: {
    type: string;
    data: string;
  }) => {
    setScanned(true);
    setScannedData(data);
  };

  const handleConfirm = () => {
    onScan(scannedData);
    onClose();
  };

  const handleScanAgain = () => {
    setScanned(false);
    setScannedData("");
  };

  if (hasPermission === null) {
    return (
      <View className="flex-1 justify-center items-center bg-black">
        <Text className="text-white">Requesting camera permission...</Text>
      </View>
    );
  }

  if (hasPermission === false) {
    return (
      <View className="flex-1 justify-center items-center bg-black">
        <Text className="text-white mb-4">No access to camera</Text>
        <TouchableOpacity
          className="bg-blue-500 px-4 py-2 rounded-lg"
          onPress={onClose}
        >
          <Text className="text-white font-medium">Close</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-black">
      <BarCodeScanner
        onBarCodeScanned={scanned ? undefined : handleBarCodeScanned}
        style={StyleSheet.absoluteFillObject}
      />

      <TouchableOpacity
        className="absolute top-12 right-6 bg-gray-800 p-2 rounded-full"
        onPress={onClose}
      >
        <X size={24} color="white" />
      </TouchableOpacity>

      {!scanned && (
        <View className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-70 p-4">
          <Text className="text-white text-center mb-2">
            Position barcode within the frame
          </Text>
        </View>
      )}

      {scanned && (
        <View className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-80 p-6">
          <Text className="text-white text-lg font-bold mb-2">
            Barcode Detected
          </Text>
          <Text className="text-white mb-4 text-sm">{scannedData}</Text>
          <View className="flex-row justify-between">
            <TouchableOpacity
              className="bg-gray-600 px-4 py-3 rounded-lg flex-1 mr-2"
              onPress={handleScanAgain}
            >
              <Text className="text-white text-center">Scan Again</Text>
            </TouchableOpacity>
            <TouchableOpacity
              className="bg-blue-500 px-4 py-3 rounded-lg flex-1 ml-2 flex-row justify-center items-center"
              onPress={handleConfirm}
            >
              <Check size={18} color="white" />
              <Text className="text-white text-center ml-1">Confirm</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </View>
  );
};

export default BarcodeScanner;
