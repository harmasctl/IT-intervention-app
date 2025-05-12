import React, { useState, useEffect } from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { Camera } from "expo-camera";
import { BarCodeScanner } from "expo-barcode-scanner";
import { X, Check } from "lucide-react-native";

interface BarcodeScannerProps {
  onScan: (data: string) => void;
  onClose: () => void;
  mode?: "serial" | "equipment" | "stock" | "general";
}

const BarcodeScanner = ({
  onScan,
  onClose,
  mode = "general",
}: BarcodeScannerProps) => {
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

      <View className="absolute top-12 left-0 right-0 flex-row justify-between px-6">
        <View className="bg-black bg-opacity-50 px-4 py-2 rounded-full">
          <Text className="text-white font-bold">
            {mode === "serial"
              ? "Serial Scanner"
              : mode === "equipment"
                ? "Equipment Scanner"
                : mode === "stock"
                  ? "Stock Scanner"
                  : "Barcode Scanner"}
          </Text>
        </View>
        <TouchableOpacity
          className="bg-gray-800 p-2 rounded-full"
          onPress={onClose}
        >
          <X size={24} color="white" />
        </TouchableOpacity>
      </View>

      {!scanned && (
        <View className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-70 p-4">
          <Text className="text-white text-center text-lg font-bold mb-2">
            {mode === "serial"
              ? "Scan Device Serial Number"
              : mode === "equipment"
                ? "Scan Equipment Barcode"
                : mode === "stock"
                  ? "Scan Stock Item"
                  : "Position barcode within the frame"}
          </Text>
          <View className="h-1 w-40 bg-blue-500 self-center rounded-full mb-2" />
          <Text className="text-white text-center text-sm opacity-80">
            {mode === "serial"
              ? "Align the serial barcode within the frame"
              : mode === "equipment"
                ? "Scan equipment barcode to track inventory"
                : mode === "stock"
                  ? "Scan to update stock levels"
                  : "Align the barcode within the scanner frame"}
          </Text>
        </View>
      )}

      {scanned && (
        <View className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-80 p-6 rounded-t-3xl">
          <View className="w-16 h-1 bg-gray-400 rounded-full self-center mb-4" />
          <Text className="text-white text-xl font-bold mb-2">
            {mode === "serial"
              ? "Serial Number Detected"
              : mode === "equipment"
                ? "Equipment Barcode Detected"
                : mode === "stock"
                  ? "Stock Item Detected"
                  : "Barcode Detected"}
          </Text>
          <View className="bg-gray-700 rounded-xl p-4 mb-4">
            <Text className="text-white text-sm font-medium mb-1 opacity-70">
              {mode === "serial"
                ? "Serial Number"
                : mode === "equipment"
                  ? "Equipment ID"
                  : mode === "stock"
                    ? "Stock ID"
                    : "Barcode Data"}
            </Text>
            <Text className="text-white text-base font-mono">
              {scannedData}
            </Text>
          </View>
          <View className="flex-row justify-between">
            <TouchableOpacity
              className="bg-gray-700 px-4 py-4 rounded-xl flex-1 mr-2"
              onPress={handleScanAgain}
            >
              <Text className="text-white text-center font-medium">
                Scan Again
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              className="bg-blue-500 px-4 py-4 rounded-xl flex-1 ml-2 flex-row justify-center items-center"
              onPress={handleConfirm}
            >
              <Check size={18} color="white" />
              <Text className="text-white text-center ml-1 font-medium">
                Confirm
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </View>
  );
};

export default BarcodeScanner;
