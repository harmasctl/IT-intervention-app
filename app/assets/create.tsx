import React from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { useRouter } from "expo-router";
import AssetForm from "../../components/AssetForm";

export default function CreateAssetScreen() {
  const router = useRouter();

  const handleSuccess = () => {
    // Navigate back to assets screen after successful creation
    router.replace("/assets");
  };

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      <StatusBar style="auto" />
      <AssetForm onClose={() => router.back()} onSuccess={handleSuccess} />
    </SafeAreaView>
  );
}
