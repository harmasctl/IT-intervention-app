import React, { useState } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useRouter } from 'expo-router';
import { ArrowLeft, QrCode, Scan } from 'lucide-react-native';
import QRCodeScanner from '../../components/QRCodeScanner';
import DeviceScanResult from '../../components/DeviceScanResult';

export default function DeviceScanScreen() {
  const router = useRouter();
  const [showScanner, setShowScanner] = useState(false);
  const [scannedDevice, setScannedDevice] = useState(null);
  const [showResult, setShowResult] = useState(false);

  const handleStartScan = () => {
    setShowScanner(true);
  };

  const handleCloseScanner = () => {
    setShowScanner(false);
  };

  const handleDeviceFound = (device: any) => {
    setScannedDevice(device);
    setShowScanner(false);
    setShowResult(true);
  };

  const handleCloseResult = () => {
    setShowResult(false);
    setScannedDevice(null);
  };

  if (showScanner) {
    return (
      <QRCodeScanner
        onClose={handleCloseScanner}
        onDeviceFound={handleDeviceFound}
      />
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      <StatusBar style="dark" />

      {/* Header */}
      <View className="px-6 py-6 bg-gradient-to-br from-green-600 via-emerald-600 to-teal-700 shadow-2xl">
        <View className="flex-row justify-between items-center">
          <View className="flex-row items-center flex-1">
            <TouchableOpacity
              onPress={() => router.back()}
              className="bg-white/20 p-3 rounded-2xl mr-4 backdrop-blur-sm"
            >
              <ArrowLeft size={24} color="#ffffff" />
            </TouchableOpacity>
            <View className="flex-1">
              <Text className="text-2xl font-bold text-white">Scan Device</Text>
              <Text className="text-green-100 text-sm">Find device information instantly</Text>
            </View>
          </View>
          <View className="bg-white/20 p-3 rounded-2xl backdrop-blur-sm">
            <QrCode size={24} color="#ffffff" />
          </View>
        </View>
      </View>

      <View className="flex-1 p-6">
        {/* Instructions Card */}
        <View className="bg-white rounded-2xl p-8 mb-6 shadow-lg border border-gray-100">
          <View className="items-center">
            <View className="bg-green-100 p-6 rounded-full mb-6">
              <Scan size={48} color="#059669" />
            </View>

            <Text className="text-2xl font-bold text-gray-800 text-center mb-4">
              Scan Device QR Code
            </Text>

            <Text className="text-gray-600 text-center text-lg leading-relaxed mb-8">
              Point your camera at any device QR code to instantly view:
            </Text>

            <View className="w-full space-y-4 mb-8">
              <View className="flex-row items-center">
                <View className="bg-blue-100 w-8 h-8 rounded-full items-center justify-center mr-4">
                  <Text className="text-blue-600 font-bold">1</Text>
                </View>
                <Text className="text-gray-700 flex-1">Device details and specifications</Text>
              </View>

              <View className="flex-row items-center">
                <View className="bg-blue-100 w-8 h-8 rounded-full items-center justify-center mr-4">
                  <Text className="text-blue-600 font-bold">2</Text>
                </View>
                <Text className="text-gray-700 flex-1">Current restaurant location</Text>
              </View>

              <View className="flex-row items-center">
                <View className="bg-blue-100 w-8 h-8 rounded-full items-center justify-center mr-4">
                  <Text className="text-blue-600 font-bold">3</Text>
                </View>
                <Text className="text-gray-700 flex-1">Transfer history between restaurants</Text>
              </View>

              <View className="flex-row items-center">
                <View className="bg-blue-100 w-8 h-8 rounded-full items-center justify-center mr-4">
                  <Text className="text-blue-600 font-bold">4</Text>
                </View>
                <Text className="text-gray-700 flex-1">Quick access to device actions</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Scan Button */}
        <TouchableOpacity
          className="bg-gradient-to-r from-green-500 to-emerald-600 rounded-2xl p-6 flex-row items-center justify-center shadow-xl"
          onPress={handleStartScan}
        >
          <View className="bg-white/20 p-3 rounded-xl mr-4">
            <QrCode size={28} color="#ffffff" />
          </View>
          <View>
            <Text className="text-white font-bold text-xl">Start Scanning</Text>
            <Text className="text-green-100 text-sm">Tap to open camera</Text>
          </View>
        </TouchableOpacity>

        {/* Tips */}
        <View className="mt-8 bg-blue-50 rounded-2xl p-6 border border-blue-200">
          <Text className="text-blue-800 font-bold text-lg mb-3">💡 Scanning Tips</Text>
          <View className="space-y-2">
            <Text className="text-blue-700">• Ensure good lighting for best results</Text>
            <Text className="text-blue-700">• Hold camera steady and focus on QR code</Text>
            <Text className="text-blue-700">• QR code should fill the scanning frame</Text>
            <Text className="text-blue-700">• Device info appears automatically when scanned</Text>
          </View>
        </View>
      </View>

      {/* Device Scan Result Modal */}
      <DeviceScanResult
        visible={showResult}
        device={scannedDevice}
        onClose={handleCloseResult}
      />
    </SafeAreaView>
  );
}
