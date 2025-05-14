import React from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { useRouter } from "expo-router";
import BulkDeviceImport from "../../components/BulkDeviceImport";

export default function BulkImportScreen() {
  const router = useRouter();

  const handleSuccess = () => {
    // Navigate back to devices screen after successful import
    router.replace("/devices");
  };

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      <StatusBar style="auto" />
      <BulkDeviceImport
        onClose={() => router.back()}
        onSuccess={handleSuccess}
      />
    </SafeAreaView>
  );
}
