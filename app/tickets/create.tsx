import React from "react";
import { View, TouchableOpacity } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { useRouter } from "expo-router";
import { ArrowLeft } from "lucide-react-native";
import CreateTicketForm from "../../components/CreateTicketForm";

export default function CreateTicketScreen() {
  const router = useRouter();

  const handleSubmit = (ticketData: any) => {
    console.log("Ticket submitted:", ticketData);
    // In a real app, you would save the ticket data to your backend
    // Then navigate back to the tickets list
    router.push("/tickets");
  };

  const handleCancel = () => {
    router.back();
  };

  return (
    <SafeAreaView className="flex-1 bg-white">
      <StatusBar style="auto" />

      {/* Header */}
      <View className="flex-row items-center px-4 py-3 border-b border-gray-200">
        <TouchableOpacity onPress={handleCancel} className="mr-4">
          <ArrowLeft size={24} color="#1e40af" />
        </TouchableOpacity>
      </View>

      {/* Create Ticket Form */}
      <CreateTicketForm onSubmit={handleSubmit} onCancel={handleCancel} />
    </SafeAreaView>
  );
}
