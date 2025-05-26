import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  StyleSheet,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { useRouter } from "expo-router";
import { ArrowLeft, Scan, QrCode } from "lucide-react-native";
import { supabase } from "../../lib/supabase";
import { BarCodeScanner } from "expo-barcode-scanner";

export default function ScanScreen() {
  const router = useRouter();
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [scanned, setScanned] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const getBarCodeScannerPermissions = async () => {
      const { status } = await BarCodeScanner.requestPermissionsAsync();
      setHasPermission(status === "granted");
    };

    getBarCodeScannerPermissions();
  }, []);

  const handleBarCodeScanned = async ({ type, data }: { type: string; data: string }) => {
    setScanned(true);
    
    try {
      // Try to parse QR code data - expecting JSON with device ID
      let deviceData;
      try {
        deviceData = JSON.parse(data);
      } catch (e) {
        // If it's not JSON, check if it's just a direct ID
        deviceData = { id: data };
      }

      if (!deviceData.id) {
        throw new Error("Invalid QR code - no device ID found");
      }

      setLoading(true);
      
      // Verify the device exists
      const { data: device, error } = await supabase
        .from("devices")
        .select("id, name")
        .eq("id", deviceData.id)
        .single();

      if (error || !device) {
        throw new Error("Device not found in database");
      }

      // Navigate to device details
      router.push({
        pathname: "/devices/[id]",
        params: { id: device.id }
      });
    } catch (error) {
      console.error("Error processing QR code:", error);
      Alert.alert(
        "Invalid QR Code", 
        "This QR code doesn't match any device in the system.",
        [
          {
            text: "Scan Again",
            onPress: () => setScanned(false),
          },
          {
            text: "Cancel",
            onPress: () => router.back(),
            style: "cancel",
          },
        ]
      );
      setLoading(false);
    }
  };

  if (hasPermission === null) {
    return (
      <SafeAreaView className="flex-1 bg-gray-900 justify-center items-center">
        <StatusBar style="light" />
        <ActivityIndicator size="large" color="#FFFFFF" />
        <Text className="text-white mt-4">Requesting camera permission...</Text>
      </SafeAreaView>
    );
  }

  if (hasPermission === false) {
    return (
      <SafeAreaView className="flex-1 bg-gray-900 justify-center items-center p-4">
        <StatusBar style="light" />
        <QrCode size={80} color="#FFFFFF" />
        <Text className="text-white text-xl font-bold mt-6 text-center">
          Camera Permission Required
        </Text>
        <Text className="text-gray-300 mt-2 text-center mb-6">
          Please grant camera permission to scan device QR codes.
        </Text>
        <TouchableOpacity
          className="bg-blue-500 py-3 px-6 rounded-lg"
          onPress={() => router.back()}
        >
          <Text className="text-white font-medium">Go Back</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  return (
    <View className="flex-1 bg-gray-900">
      <StatusBar style="light" />
      
      <BarCodeScanner
        style={StyleSheet.absoluteFillObject}
        onBarCodeScanned={scanned ? undefined : handleBarCodeScanned}
        barCodeTypes={[BarCodeScanner.Constants.BarCodeType.qr]}
      />
      
      <SafeAreaView className="flex-1">
        <View className="flex-row justify-between items-center p-4">
          <TouchableOpacity
            className="bg-black bg-opacity-50 p-2 rounded-full"
            onPress={() => router.back()}
          >
            <ArrowLeft size={24} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
        
        <View className="flex-1 justify-center items-center">
          {loading ? (
            <View className="bg-black bg-opacity-70 p-6 rounded-xl">
              <ActivityIndicator size="large" color="#FFFFFF" />
              <Text className="text-white mt-4">Finding device...</Text>
            </View>
          ) : (
            <>
              <View className="w-64 h-64 border-2 border-white rounded-lg" />
              <Text className="text-white font-medium mt-6">
                Scan a device QR code
              </Text>
            </>
          )}
        </View>
        
        {scanned && !loading && (
          <View className="items-center pb-8">
            <TouchableOpacity
              className="bg-blue-500 py-3 px-6 rounded-lg flex-row items-center"
              onPress={() => setScanned(false)}
            >
              <Scan size={20} color="#FFFFFF" className="mr-2" />
              <Text className="text-white font-medium">Scan Again</Text>
            </TouchableOpacity>
          </View>
        )}
      </SafeAreaView>
    </View>
  );
}
