import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { useRouter } from "expo-router";
import { ArrowLeft, Save } from "lucide-react-native";
import { supabase } from "../../lib/supabase";

export default function CreateRestaurantScreen() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [location, setLocation] = useState("");
  const [phone, setPhone] = useState("");
  const [managerName, setManagerName] = useState("");
  const [operatingHours, setOperatingHours] = useState("");
  const [status, setStatus] = useState("active");
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!name || !location || !phone) {
      Alert.alert("Error", "Please fill in all required fields");
      return;
    }

    setSaving(true);
    try {
      const { data, error } = await supabase.from("restaurants").insert([
        {
          name,
          location,
          phone,
          manager_name: managerName,
          operating_hours: operatingHours,
          status,
        },
      ]);

      if (error) throw error;

      Alert.alert("Success", "Restaurant created successfully", [
        { text: "OK", onPress: () => router.back() },
      ]);
    } catch (error: any) {
      console.error("Error creating restaurant:", error);
      Alert.alert("Error", error.message || "Failed to create restaurant");
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-white">
      <StatusBar style="auto" />

      {/* Header */}
      <View className="flex-row justify-between items-center px-4 py-3 border-b border-gray-200">
        <TouchableOpacity
          onPress={() => router.back()}
          className="flex-row items-center"
        >
          <ArrowLeft size={20} color="#3b82f6" />
          <Text className="text-blue-500 ml-1">Back</Text>
        </TouchableOpacity>
        <Text className="text-xl font-bold text-blue-800">Add Restaurant</Text>
        <TouchableOpacity onPress={handleSave} disabled={saving}>
          <Save size={20} color={saving ? "#9ca3af" : "#3b82f6"} />
        </TouchableOpacity>
      </View>

      <ScrollView className="flex-1 p-4">
        <View className="space-y-4">
          <View>
            <Text className="text-gray-700 mb-1 font-medium">Name *</Text>
            <TextInput
              className="border border-gray-300 rounded-lg px-3 py-2"
              placeholder="Restaurant name"
              value={name}
              onChangeText={setName}
            />
          </View>

          <View>
            <Text className="text-gray-700 mb-1 font-medium">Location *</Text>
            <TextInput
              className="border border-gray-300 rounded-lg px-3 py-2"
              placeholder="Address"
              value={location}
              onChangeText={setLocation}
            />
          </View>

          <View>
            <Text className="text-gray-700 mb-1 font-medium">Phone *</Text>
            <TextInput
              className="border border-gray-300 rounded-lg px-3 py-2"
              placeholder="Phone number"
              value={phone}
              onChangeText={setPhone}
              keyboardType="phone-pad"
            />
          </View>

          <View>
            <Text className="text-gray-700 mb-1 font-medium">Manager Name</Text>
            <TextInput
              className="border border-gray-300 rounded-lg px-3 py-2"
              placeholder="Manager name"
              value={managerName}
              onChangeText={setManagerName}
            />
          </View>

          <View>
            <Text className="text-gray-700 mb-1 font-medium">
              Operating Hours
            </Text>
            <TextInput
              className="border border-gray-300 rounded-lg px-3 py-2"
              placeholder="e.g. Mon-Fri: 9AM-10PM"
              value={operatingHours}
              onChangeText={setOperatingHours}
            />
          </View>

          <View>
            <Text className="text-gray-700 mb-1 font-medium">Status</Text>
            <View className="flex-row">
              <TouchableOpacity
                className={`flex-1 p-3 rounded-l-lg ${
                  status === "active" ? "bg-green-100 border border-green-500" : "bg-gray-100"
                }`}
                onPress={() => setStatus("active")}
              >
                <Text
                  className={`text-center ${
                    status === "active" ? "text-green-700 font-medium" : "text-gray-700"
                  }`}
                >
                  Active
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                className={`flex-1 p-3 ${
                  status === "closed" ? "bg-red-100 border border-red-500" : "bg-gray-100"
                }`}
                onPress={() => setStatus("closed")}
              >
                <Text
                  className={`text-center ${
                    status === "closed" ? "text-red-700 font-medium" : "text-gray-700"
                  }`}
                >
                  Closed
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                className={`flex-1 p-3 rounded-r-lg ${
                  status === "renovation" ? "bg-yellow-100 border border-yellow-500" : "bg-gray-100"
                }`}
                onPress={() => setStatus("renovation")}
              >
                <Text
                  className={`text-center ${
                    status === "renovation" ? "text-yellow-700 font-medium" : "text-gray-700"
                  }`}
                >
                  Renovation
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          <TouchableOpacity
            className="bg-blue-600 py-3 rounded-lg mt-6"
            onPress={handleSave}
            disabled={saving}
          >
            {saving ? (
              <ActivityIndicator color="white" />
            ) : (
              <Text className="text-white font-bold text-center">
                Create Restaurant
              </Text>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
} 