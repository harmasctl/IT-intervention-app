import React, { useState, useEffect } from "react";
import { View, Text, StyleSheet, TouchableOpacity, Alert } from "react-native";
import { Camera } from "expo-camera";
import { BarCodeScanner } from "expo-barcode-scanner";
import { X, ZoomIn, ZoomOut, FlipCamera } from "lucide-react-native";

type BarcodeScannerProps = {
  onScan: (data: string, type: string) => void;
  onClose: () => void;
};

export default function BarcodeScanner({
  onScan,
  onClose,
}: BarcodeScannerProps) {
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [scanned, setScanned] = useState(false);
  const [cameraType, setCameraType] = useState(Camera.Constants.Type.back);
  const [zoom, setZoom] = useState(0);
  const [torch, setTorch] = useState(false);

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
      cameraType === Camera.Constants.Type.back
        ? Camera.Constants.Type.front
        : Camera.Constants.Type.back,
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
        <Text className="text-white">No access to camera</Text>
        <TouchableOpacity
          className="mt-4 bg-blue-600 px-4 py-2 rounded-lg"
          onPress={onClose}
        >
          <Text className="text-white font-medium">Close</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View className="flex-1">
      <Camera
        style={StyleSheet.absoluteFillObject}
        type={cameraType}
        barCodeScannerSettings={{
          barCodeTypes: [
            BarCodeScanner.Constants.BarCodeType.qr,
            BarCodeScanner.Constants.BarCodeType.code128,
          ],
        }}
        onBarCodeScanned={scanned ? undefined : handleBarCodeScanned}
        zoom={zoom}
        flashMode={
          torch
            ? Camera.Constants.FlashMode.torch
            : Camera.Constants.FlashMode.off
        }
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
            <FlipCamera size={24} color="white" />
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
      </Camera>
    </View>
  );
}
