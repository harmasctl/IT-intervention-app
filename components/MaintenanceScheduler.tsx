import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Alert,
  Modal,
  ActivityIndicator,
} from "react-native";
import { supabase } from "../lib/supabase";
import { ArrowLeft, Calendar, Clock, User } from "lucide-react-native";
import DateTimePicker from "@react-native-community/datetimepicker";
import { useAuth } from "./AuthProvider";

type MaintenanceType = "preventive" | "corrective" | "inspection";

type MaintenanceSchedulerProps = {
  deviceId: string;
  deviceName: string;
  onCancel: () => void;
  onSuccess: () => void;
};

export default function MaintenanceScheduler({
  deviceId,
  deviceName,
  onCancel,
  onSuccess,
}: MaintenanceSchedulerProps) {
  const [maintenanceType, setMaintenanceType] =
    useState<MaintenanceType>("preventive");
  const [description, setDescription] = useState("");
  const [scheduledDate, setScheduledDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [showTechnicianModal, setShowTechnicianModal] = useState(false);
  const [technicians, setTechnicians] = useState<any[]>([]);
  const [selectedTechnician, setSelectedTechnician] = useState<any>(null);
  const [loadingTechnicians, setLoadingTechnicians] = useState(false);

  const { user } = useAuth();

  useEffect(() => {
    if (showTechnicianModal) {
      fetchTechnicians();
    }
  }, [showTechnicianModal]);

  const fetchTechnicians = async () => {
    try {
      setLoadingTechnicians(true);
      const { data, error } = await supabase
        .from("profiles")
        .select("id, full_name, email, role")
        .eq("role", "technician");

      if (error) throw error;

      if (data) {
        setTechnicians(data);
      }
    } catch (error) {
      console.error("Error fetching technicians:", error);
      Alert.alert("Error", "Failed to load technicians");
    } finally {
      setLoadingTechnicians(false);
    }
  };

  const handleDateChange = (event: any, selectedDate?: Date) => {
    setShowDatePicker(false);
    if (selectedDate) {
      setScheduledDate(selectedDate);
    }
  };

  const handleSubmit = async () => {
    if (!description) {
      Alert.alert("Error", "Please enter a description");
      return;
    }

    if (!selectedTechnician) {
      Alert.alert("Error", "Please select a technician");
      return;
    }

    try {
      setLoading(true);

      const maintenanceRecord = {
        device_id: deviceId,
        maintenance_type: maintenanceType,
        description,
        technician_id: selectedTechnician.id,
        status: "scheduled",
        scheduled_date: scheduledDate.toISOString(),
        notes: notes || null,
        created_at: new Date().toISOString(),
        created_by: user?.id,
      };

      const { data, error } = await supabase
        .from("device_maintenance")
        .insert([maintenanceRecord])
        .select();

      if (error) throw error;

      // Create notification for the assigned technician
      await supabase.from("notifications").insert([
        {
          title: "Maintenance Assigned",
          message: `You have been assigned ${maintenanceType} maintenance for ${deviceName}`,
          type: "info",
          related_id: deviceId,
          related_type: "maintenance",
          read: false,
          timestamp: new Date().toISOString(),
          user_id: selectedTechnician.id,
        },
      ]);

      Alert.alert("Success", "Maintenance scheduled successfully", [
        { text: "OK", onPress: onSuccess },
      ]);
    } catch (error) {
      console.error("Error scheduling maintenance:", error);
      Alert.alert("Error", "Failed to schedule maintenance");
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString();
  };

  return (
    <View className="flex-1 bg-white">
      <View className="flex-row justify-between items-center p-4 border-b border-gray-200">
        <TouchableOpacity onPress={onCancel} className="flex-row items-center">
          <ArrowLeft size={20} color="#3b82f6" />
          <Text className="text-blue-500 ml-1">Cancel</Text>
        </TouchableOpacity>
        <Text className="text-xl font-bold text-blue-800">
          Schedule Maintenance
        </Text>
        <TouchableOpacity
          onPress={handleSubmit}
          disabled={loading}
          className={loading ? "opacity-50" : ""}
        >
          <Text className="text-blue-500 font-semibold">
            {loading ? "Saving..." : "Save"}
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView className="flex-1 p-4">
        <View className="bg-blue-50 p-4 rounded-lg mb-6">
          <Text className="text-lg font-bold text-blue-800">{deviceName}</Text>
          <Text className="text-blue-600 mt-1">Device ID: {deviceId}</Text>
        </View>

        <View className="mb-4">
          <Text className="text-gray-700 mb-2 font-medium">
            Maintenance Type *
          </Text>
          <View className="flex-row">
            <TouchableOpacity
              className={`flex-1 py-2 px-4 rounded-l-lg ${maintenanceType === "preventive" ? "bg-blue-600" : "bg-gray-200"}`}
              onPress={() => setMaintenanceType("preventive")}
            >
              <Text
                className={`text-center font-medium ${maintenanceType === "preventive" ? "text-white" : "text-gray-700"}`}
              >
                Preventive
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              className={`flex-1 py-2 px-4 ${maintenanceType === "corrective" ? "bg-blue-600" : "bg-gray-200"}`}
              onPress={() => setMaintenanceType("corrective")}
            >
              <Text
                className={`text-center font-medium ${maintenanceType === "corrective" ? "text-white" : "text-gray-700"}`}
              >
                Corrective
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              className={`flex-1 py-2 px-4 rounded-r-lg ${maintenanceType === "inspection" ? "bg-blue-600" : "bg-gray-200"}`}
              onPress={() => setMaintenanceType("inspection")}
            >
              <Text
                className={`text-center font-medium ${maintenanceType === "inspection" ? "text-white" : "text-gray-700"}`}
              >
                Inspection
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        <View className="mb-4">
          <Text className="text-gray-700 mb-1 font-medium">Description *</Text>
          <TextInput
            className="border border-gray-300 rounded-lg px-3 py-2"
            placeholder="Enter maintenance description"
            value={description}
            onChangeText={setDescription}
          />
        </View>

        <View className="mb-4">
          <Text className="text-gray-700 mb-1 font-medium">
            Scheduled Date *
          </Text>
          <TouchableOpacity
            className="flex-row items-center border border-gray-300 rounded-lg px-3 py-2"
            onPress={() => setShowDatePicker(true)}
          >
            <Calendar size={20} color="#4b5563" className="mr-2" />
            <Text className="text-gray-800">{formatDate(scheduledDate)}</Text>
          </TouchableOpacity>
          {showDatePicker && (
            <DateTimePicker
              value={scheduledDate}
              mode="date"
              display="default"
              onChange={handleDateChange}
              minimumDate={new Date()}
            />
          )}
        </View>

        <View className="mb-4">
          <Text className="text-gray-700 mb-1 font-medium">
            Assign Technician *
          </Text>
          <TouchableOpacity
            className="flex-row justify-between items-center border border-gray-300 rounded-lg px-3 py-2"
            onPress={() => setShowTechnicianModal(true)}
          >
            <View className="flex-row items-center">
              <User size={20} color="#4b5563" className="mr-2" />
              <Text
                className={
                  selectedTechnician ? "text-gray-800" : "text-gray-400"
                }
              >
                {selectedTechnician
                  ? selectedTechnician.full_name
                  : "Select a technician"}
              </Text>
            </View>
            <Text className="text-gray-500">▼</Text>
          </TouchableOpacity>
        </View>

        <View className="mb-4">
          <Text className="text-gray-700 mb-1 font-medium">Notes</Text>
          <TextInput
            className="border border-gray-300 rounded-lg px-3 py-2 h-24"
            placeholder="Enter any additional notes"
            value={notes}
            onChangeText={setNotes}
            multiline
            textAlignVertical="top"
          />
        </View>

        <TouchableOpacity
          className="bg-blue-600 py-3 rounded-lg items-center mt-4"
          onPress={handleSubmit}
          disabled={loading}
        >
          <Text className="text-white font-bold text-lg">
            {loading ? "Scheduling..." : "Schedule Maintenance"}
          </Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Technician Selection Modal */}
      <Modal
        visible={showTechnicianModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowTechnicianModal(false)}
      >
        <View className="flex-1 bg-black bg-opacity-50 justify-end">
          <View className="bg-white rounded-t-3xl max-h-[70%]">
            <View className="p-4 border-b border-gray-200">
              <Text className="text-xl font-bold text-center text-blue-800">
                Select Technician
              </Text>
              <TouchableOpacity
                className="absolute right-4 top-4"
                onPress={() => setShowTechnicianModal(false)}
              >
                <Text className="text-blue-600 font-medium">Close</Text>
              </TouchableOpacity>
            </View>

            {loadingTechnicians ? (
              <View className="p-8 items-center justify-center">
                <ActivityIndicator size="large" color="#1e40af" />
                <Text className="mt-2 text-gray-500">
                  Loading technicians...
                </Text>
              </View>
            ) : technicians.length > 0 ? (
              <ScrollView className="p-4">
                {technicians.map((tech) => (
                  <TouchableOpacity
                    key={tech.id}
                    className="p-4 border-b border-gray-100 flex-row items-center"
                    onPress={() => {
                      setSelectedTechnician(tech);
                      setShowTechnicianModal(false);
                    }}
                  >
                    <View className="bg-blue-100 w-10 h-10 rounded-full items-center justify-center mr-3">
                      <User size={20} color="#1e40af" />
                    </View>
                    <View>
                      <Text className="font-bold text-gray-800">
                        {tech.full_name}
                      </Text>
                      <Text className="text-gray-500">{tech.email}</Text>
                    </View>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            ) : (
              <View className="p-8 items-center justify-center">
                <Text className="text-gray-500 text-center">
                  No technicians available. Add technicians to your team first.
                </Text>
              </View>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}
