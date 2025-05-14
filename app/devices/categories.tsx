import React from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { useRouter } from "expo-router";
import DeviceCategoryManager from "../../components/DeviceCategoryManager";

export default function DeviceCategoriesScreen() {
  const router = useRouter();

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      <StatusBar style="auto" />
      <DeviceCategoryManager onClose={() => router.back()} />
    </SafeAreaView>
  );
}
