import React from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { useRouter } from "expo-router";
import { Package, Smartphone } from "lucide-react-native";

export default function InventoryScreen() {
  const router = useRouter();

  return (
    <SafeAreaView className="flex-1 bg-white">
      <StatusBar style="auto" />

      <View className="p-4">
        <Text className="text-2xl font-bold mb-6">Inventory Management</Text>

        <View className="space-y-4">
          <TouchableOpacity
            className="bg-white p-6 rounded-xl shadow-md border border-gray-100 flex-row items-center"
            onPress={() => router.push("/devices")}
          >
            <View className="bg-blue-100 p-3 rounded-full mr-4">
              <Smartphone size={24} color="#1e40af" />
            </View>
            <View className="flex-1">
              <Text className="text-lg font-bold text-gray-800">
                Restaurant Devices
              </Text>
              <Text className="text-gray-600">
                Manage POS terminals, displays, and other restaurant equipment
              </Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            className="bg-white p-6 rounded-xl shadow-md border border-gray-100 flex-row items-center"
            onPress={() => router.push("/equipment")}
          >
            <View className="bg-blue-100 p-3 rounded-full mr-4">
              <Package size={24} color="#1e40af" />
            </View>
            <View className="flex-1">
              <Text className="text-lg font-bold text-gray-800">
                Warehouse Stock
              </Text>
              <Text className="text-gray-600">
                Manage spare parts, tools, and supplies inventory
              </Text>
            </View>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}
