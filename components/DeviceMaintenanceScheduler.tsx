import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Alert,
} from "react-native";
import { X, Calendar, Clock, User } from "lucide-react-native";
import DateTimePicker from "@react-native-community/datetimepicker";
import { supabase } from "../lib/supabase";

interface Device {
  id: string;
  name: string;
  serialNumber: string;
  restaurant: string;
  status: string;
}

interface DeviceMaintenanceSchedulerProps {
  device: Device;
  onCancel: () => void;
  onSuccess: () => void;
}

const DeviceMaintenanceScheduler = ({
  device,
  onCancel,
  onSuccess,
}: DeviceMaintenanceSchedulerProps) => {
  const [date, setDate] = useState(new Date());
  const [time, setTime] = useState(new Date());
  const [notes, setNotes] = useState("");
  const [technician, setTechnician] = useState("");
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [technicians, setTechnicians] = useState([
    { id: "1", name: "John Doe" },
    { id: "2", name: "Jane Smith" },
    { id: "3", name: "Mike Johnson" },
    { id: "4", name: "Sarah Williams" },
  ]);

  // Fetch technicians from Supabase
  useEffect(() => {
    const fetchTechnicians = async () => {
      try {
        const { data, error } = await supabase
          .from("users")
          .select("id, name")
          .eq("role", "technician");

        if (error) throw error;

        if (data && data.length > 0) {
          setTechnicians(data);
        }
      } catch (error) {
        console.error("Error fetching technicians:", error);
        // Keep using the default technicians if there's an error
      }
    };

    fetchTechnicians();
  }, []);

  const handleDateChange = (event: any, selectedDate?: Date) => {
    setShowDatePicker(false);
    if (selectedDate) {
      setDate(selectedDate);
    }
  };

  const handleTimeChange = (event: any, selectedTime?: Date) => {
    setShowTimePicker(false);
    if (selectedTime) {
      setTime(selectedTime);
    }
  };

  const handleSubmit = async () => {
    if (!technician) {
      Alert.alert("Error", "Please select a technician");
      return;
    }

    setIsSubmitting(true);

    try {
      // Combine date and time
      const scheduledDateTime = new Date(date);
      scheduledDateTime.setHours(time.getHours(), time.getMinutes());

      // Save to Supabase
      const { data, error } = await supabase
        .from("maintenance_schedules")
        .insert({
          device_id: device.id,
          technician_id: technician,
          scheduled_date: scheduledDateTime.toISOString(),
          notes,
          status: "scheduled",
        });

      if (error) throw error;

      // Also create a ticket for this maintenance
      const { error: ticketError } = await supabase.from("tickets").insert({
        title: `Scheduled maintenance for ${device.name}`,
        device_id: device.id,
        restaurant_id: device.restaurant_id,
        priority: "medium",
        status: "scheduled",
        diagnostic_info: `Scheduled maintenance: ${notes}`,
        assigned_to: technician,
        created_at: new Date().toISOString(),
        scheduled_date: scheduledDateTime.toISOString(),
      });

      if (ticketError) {
        console.error("Error creating maintenance ticket:", ticketError);
        // Continue anyway since the main schedule was created successfully
      }

      Alert.alert("Success", "Maintenance scheduled successfully", [
        { text: "OK", onPress: onSuccess },
      ]);
    } catch (error) {
      console.error("Error scheduling maintenance:", error);
      Alert.alert("Error", "Failed to schedule maintenance. Please try again.");
      setIsSubmitting(false);
    }
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString();
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  return (
    <ScrollView className="flex-1 bg-white">
      <View className="p-4">
        <View className="flex-row justify-between items-center mb-6">
          <Text className="text-2xl font-bold">Schedule Maintenance</Text>
          <TouchableOpacity onPress={onCancel}>
            <X size={24} color="#666" />
          </TouchableOpacity>
        </View>

        <View className="bg-blue-50 p-4 rounded-lg mb-6">
          <Text className="font-bold text-lg">{device.name}</Text>
          <Text className="text-gray-600">S/N: {device.serialNumber}</Text>
          <Text className="text-gray-600 mt-1">{device.restaurant}</Text>
          <View className="mt-2 bg-white px-3 py-1 rounded-full self-start">
            <Text className="text-blue-600 font-medium">{device.status}</Text>
          </View>
        </View>

        <View className="mb-4">
          <Text className="text-gray-700 mb-2 font-medium">Date *</Text>
          <TouchableOpacity
            className="flex-row items-center border border-gray-300 rounded-lg px-3 py-3 bg-white"
            onPress={() => setShowDatePicker(true)}
          >
            <Calendar size={20} color="#6b7280" />
            <Text className="ml-2">{formatDate(date)}</Text>
          </TouchableOpacity>
          {showDatePicker && (
            <DateTimePicker
              value={date}
              mode="date"
              display="default"
              onChange={handleDateChange}
              minimumDate={new Date()}
            />
          )}
        </View>

        <View className="mb-4">
          <Text className="text-gray-700 mb-2 font-medium">Time *</Text>
          <TouchableOpacity
            className="flex-row items-center border border-gray-300 rounded-lg px-3 py-3 bg-white"
            onPress={() => setShowTimePicker(true)}
          >
            <Clock size={20} color="#6b7280" />
            <Text className="ml-2">{formatTime(time)}</Text>
          </TouchableOpacity>
          {showTimePicker && (
            <DateTimePicker
              value={time}
              mode="time"
              display="default"
              onChange={handleTimeChange}
            />
          )}
        </View>

        <View className="mb-4">
          <Text className="text-gray-700 mb-2 font-medium">Technician *</Text>
          <View className="border border-gray-300 rounded-lg overflow-hidden bg-white">
            {technicians.map((tech) => (
              <TouchableOpacity
                key={tech.id}
                className={`p-3 border-b border-gray-200 flex-row items-center ${technician === tech.id ? "bg-blue-50" : ""}`}
                onPress={() => setTechnician(tech.id)}
              >
                <User size={18} color="#6b7280" className="mr-2" />
                <Text
                  className={`${technician === tech.id ? "text-blue-600 font-medium" : "text-gray-800"}`}
                >
                  {tech.name}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View className="mb-6">
          <Text className="text-gray-700 mb-2 font-medium">Notes</Text>
          <TextInput
            className="border border-gray-300 rounded-lg px-3 py-2 h-24 bg-white"
            placeholder="Enter any additional notes or instructions"
            multiline
            textAlignVertical="top"
            value={notes}
            onChangeText={setNotes}
          />
        </View>

        <View className="flex-row mb-4">
          <TouchableOpacity
            className="bg-gray-200 rounded-lg py-3 px-4 flex-1 mr-2"
            onPress={onCancel}
            disabled={isSubmitting}
          >
            <Text className="text-gray-700 text-center font-medium">
              Cancel
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            className={`rounded-lg py-3 px-4 flex-1 ml-2 ${isSubmitting ? "bg-blue-300" : "bg-blue-500"}`}
            onPress={handleSubmit}
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <Text className="text-white text-center font-medium">
                Scheduling...
              </Text>
            ) : (
              <Text className="text-white text-center font-medium">
                Schedule Maintenance
              </Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </ScrollView>
  );
};

export default DeviceMaintenanceScheduler;
