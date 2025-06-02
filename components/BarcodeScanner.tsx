import React, { useState, useEffect } from "react";
import { View, Text, StyleSheet, TouchableOpacity, Alert, Platform, TextInput } from "react-native";
import { Camera } from "expo-camera";
import { BarCodeScanner } from "expo-barcode-scanner";
import { X, ZoomIn, ZoomOut, RefreshCcw, Keyboard, Camera as CameraIcon } from "lucide-react-native";

type BarcodeScannerProps = {
  onScan: (data: string, type: string) => void;
  onClose: () => void;
  mode?: string;
};

export default function BarcodeScanner({
  onScan,
  onClose,
  mode,
}: BarcodeScannerProps) {
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [scanned, setScanned] = useState(false);
  const [cameraType, setCameraType] = useState(BarCodeScanner.Constants.Type.back);
  const [zoom, setZoom] = useState(0);
  const [torch, setTorch] = useState(false);
  const [showManualInput, setShowManualInput] = useState(Platform.OS === 'web');
  const [manualCode, setManualCode] = useState('');

  useEffect(() => {
    (async () => {
      const { status } = await Camera.requestCameraPermissionsAsync();
      setHasPermission(status === "granted");
    })();
  }, []);

  const handleBarCodeScanned = ({
    type,
    data,
  }: {
    type: string;
    data: string;
  }) => {
    setScanned(true);
    onScan(data, type);
  };

  const toggleCameraType = () => {
    setCameraType(
      cameraType === BarCodeScanner.Constants.Type.back
        ? BarCodeScanner.Constants.Type.front
        : BarCodeScanner.Constants.Type.back,
    );
  };

  const increaseZoom = () => {
    if (zoom < 0.9) {
      setZoom(zoom + 0.1);
    }
  };

  const decreaseZoom = () => {
    if (zoom > 0) {
      setZoom(zoom - 0.1);
    }
  };

  const toggleTorch = () => {
    setTorch(!torch);
  };

  const handleManualSubmit = () => {
    if (manualCode.trim()) {
      onScan(manualCode.trim(), 'manual');
    } else {
      Alert.alert('Error', 'Please enter a valid code');
    }
  };

  if (hasPermission === null) {
    return (
      <View className="flex-1 justify-center items-center bg-black">
        <Text className="text-white">Requesting camera permission...</Text>
      </View>
    );
  }

  if (hasPermission === false || Platform.OS === 'web') {
    return (
      <View className="flex-1 justify-center items-center bg-gray-900 px-6">
        <View className="bg-white rounded-2xl p-6 w-full max-w-md">
          <View className="flex-row items-center justify-between mb-6">
            <Text className="text-xl font-bold text-gray-800">Enter Code Manually</Text>
            <TouchableOpacity onPress={onClose}>
              <X size={24} color="#6B7280" />
            </TouchableOpacity>
          </View>

          <View className="mb-4">
            <Text className="text-gray-700 mb-2 font-medium">Barcode/QR Code</Text>
            <TextInput
              className="border border-gray-300 rounded-lg px-4 py-3 text-gray-800"
              placeholder="Enter barcode or QR code"
              value={manualCode}
              onChangeText={setManualCode}
              autoFocus
              onSubmitEditing={handleManualSubmit}
            />
          </View>

          <View className="flex-row space-x-3">
            <TouchableOpacity
              className="flex-1 bg-gray-200 py-3 rounded-lg"
              onPress={onClose}
            >
              <Text className="text-gray-800 font-medium text-center">Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              className="flex-1 bg-blue-600 py-3 rounded-lg"
              onPress={handleManualSubmit}
            >
              <Text className="text-white font-medium text-center">Submit</Text>
            </TouchableOpacity>
          </View>

          {Platform.OS !== 'web' && (
            <TouchableOpacity
              className="mt-4 bg-green-600 py-3 rounded-lg flex-row items-center justify-center"
              onPress={() => setShowManualInput(false)}
            >
              <CameraIcon size={20} color="#ffffff" />
              <Text className="text-white font-medium ml-2">Use Camera Instead</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  }

  // Show manual input overlay if requested
  if (showManualInput && Platform.OS !== 'web') {
    return (
      <View className="flex-1 justify-center items-center bg-gray-900 px-6">
        <View className="bg-white rounded-2xl p-6 w-full max-w-md">
          <View className="flex-row items-center justify-between mb-6">
            <Text className="text-xl font-bold text-gray-800">Enter Code Manually</Text>
            <TouchableOpacity onPress={() => setShowManualInput(false)}>
              <X size={24} color="#6B7280" />
            </TouchableOpacity>
          </View>

          <View className="mb-4">
            <Text className="text-gray-700 mb-2 font-medium">Barcode/QR Code</Text>
            <TextInput
              className="border border-gray-300 rounded-lg px-4 py-3 text-gray-800"
              placeholder="Enter barcode or QR code"
              value={manualCode}
              onChangeText={setManualCode}
              autoFocus
              onSubmitEditing={handleManualSubmit}
            />
          </View>

          <View className="flex-row space-x-3">
            <TouchableOpacity
              className="flex-1 bg-gray-200 py-3 rounded-lg"
              onPress={() => setShowManualInput(false)}
            >
              <Text className="text-gray-800 font-medium text-center">Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              className="flex-1 bg-blue-600 py-3 rounded-lg"
              onPress={handleManualSubmit}
            >
              <Text className="text-white font-medium text-center">Submit</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            className="mt-4 bg-green-600 py-3 rounded-lg flex-row items-center justify-center"
            onPress={() => setShowManualInput(false)}
          >
            <CameraIcon size={20} color="#ffffff" />
            <Text className="text-white font-medium ml-2">Use Camera Instead</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View className="flex-1">
      <BarCodeScanner
        style={StyleSheet.absoluteFillObject}
        type={cameraType}
        barCodeTypes={[
          BarCodeScanner.Constants.BarCodeType.qr,
          BarCodeScanner.Constants.BarCodeType.code128,
        ]}
        onBarCodeScanned={scanned ? undefined : handleBarCodeScanned}
        // Zoom is only supported on some devices/platforms
        // flashMode works differently - we may need a different approach
      >
        <View className="flex-1 flex-row">
          <View className="flex-1" />
          <View className="flex-1" />
          <View className="flex-1" />
        </View>

        <View className="flex-1 flex-row">
          <View className="flex-1" />
          <View className="flex-1 border-2 border-white" />
          <View className="flex-1" />
        </View>

        <View className="flex-1 flex-row">
          <View className="flex-1" />
          <View className="flex-1" />
          <View className="flex-1" />
        </View>

        {/* Controls */}
        <View className="absolute top-10 right-5">
          <TouchableOpacity
            className="bg-black bg-opacity-50 p-2 rounded-full mb-4"
            onPress={onClose}
          >
            <X size={24} color="white" />
          </TouchableOpacity>
          <TouchableOpacity
            className="bg-black bg-opacity-50 p-2 rounded-full"
            onPress={() => setShowManualInput(true)}
          >
            <Keyboard size={24} color="white" />
          </TouchableOpacity>
        </View>

        <View className="absolute bottom-10 left-0 right-0 flex-row justify-around">
          <TouchableOpacity
            className="bg-black bg-opacity-50 p-3 rounded-full"
            onPress={decreaseZoom}
          >
            <ZoomOut size={24} color="white" />
          </TouchableOpacity>

          <TouchableOpacity
            className="bg-black bg-opacity-50 p-3 rounded-full"
            onPress={toggleTorch}
          >
            <Text className="text-white font-bold">
              {torch ? "FLASH OFF" : "FLASH ON"}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            className="bg-black bg-opacity-50 p-3 rounded-full"
            onPress={toggleCameraType}
          >
            <RefreshCcw size={24} color="white" />
          </TouchableOpacity>

          <TouchableOpacity
            className="bg-black bg-opacity-50 p-3 rounded-full"
            onPress={increaseZoom}
          >
            <ZoomIn size={24} color="white" />
          </TouchableOpacity>
        </View>

        {scanned && (
          <View className="absolute bottom-32 left-0 right-0 items-center">
            <TouchableOpacity
              className="bg-blue-600 px-6 py-3 rounded-lg"
              onPress={() => setScanned(false)}
            >
              <Text className="text-white font-bold">Scan Again</Text>
            </TouchableOpacity>
          </View>
        )}
      </BarCodeScanner>
    </View>
  );
}
