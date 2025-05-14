import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { useRouter } from "expo-router";
import {
  ArrowLeft,
  Calendar,
  Clock,
  User,
  FileText,
} from "lucide-react-native";
import DateTimePicker from "@react-native-community/datetimepicker";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../../components/AuthProvider";

type Ticket = {
  id: string;
  title: string;
  restaurant_name: string;
};

type Technician = {
  id: string;
  name: string;
};

export default function CreateScheduleScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [date, setDate] = useState(new Date());
  const [time, setTime] = useState(new Date());
  const [notes, setNotes] = useState("");
  const [selectedTicket, setSelectedTicket] = useState<string>("");
  const [selectedTechnician, setSelectedTechnician] = useState<string>("");
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [technicians, setTechnicians] = useState<Technician[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);

      // Fetch open tickets from Supabase
      const { data: ticketData, error: ticketError } = await supabase
        .from("tickets")
        .select(
          `
          id,
          title,
          restaurants:restaurant_id(id, name)
        `,
        )
        .in("status", ["new", "assigned", "in-progress"]);

      if (ticketError) throw ticketError;

      // Fetch technicians from Supabase
      const { data: techData, error: techError } = await supabase
        .from("users")
        .select("id, name")
        .in("role", ["technician", "software_tech"]);

      if (techError) throw techError;

      if (ticketData) {
        const formattedTickets = ticketData.map((ticket) => ({
          id: ticket.id,
          title: ticket.title,
          restaurant_name: ticket.restaurants?.name || "Unknown Restaurant",
        }));
        setTickets(formattedTickets);
      } else {
        setTickets([]);
      }

      if (techData) {
        setTechnicians(techData as Technician[]);

        // Set current user as default technician if they are a technician
        if (user) {
          const currentUserTech = techData.find((tech) => tech.id === user.id);
          if (currentUserTech) {
            setSelectedTechnician(currentUserTech.id);
          }
        }
      } else {
        setTechnicians([]);
      }
    } catch (error) {
      console.error("Error fetching data:", error);
      setTickets([]);
      setTechnicians([]);
    } finally {
      setLoading(false);
    }
  };

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
    if (!selectedTicket) {
      Alert.alert("Error", "Please select a ticket");
      return;
    }

    if (!selectedTechnician) {
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
          ticket_id: selectedTicket,
          technician_id: selectedTechnician,
          scheduled_date: scheduledDateTime.toISOString(),
          notes,
          status: "scheduled",
        });

      if (error) throw error;

      Alert.alert("Success", "Maintenance scheduled successfully", [
        { text: "OK", onPress: () => router.replace("/schedule") },
      ]);
    } catch (error: any) {
      console.error("Error scheduling maintenance:", error);
      Alert.alert("Error", error.message || "Failed to schedule maintenance");
    } finally {
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
    <SafeAreaView className="flex-1 bg-white">
      <StatusBar style="auto" />

      {/* Header */}
      <View className="flex-row items-center px-4 py-3 border-b border-gray-200">
        <TouchableOpacity onPress={() => router.back()} className="mr-4">
          <ArrowLeft size={24} color="#1e40af" />
        </TouchableOpacity>
        <Text className="text-xl font-bold">Schedule Maintenance</Text>
      </View>

      <ScrollView className="flex-1 p-4">
        {loading ? (
          <View className="items-center justify-center py-8">
            <Text className="text-gray-500">Loading...</Text>
          </View>
        ) : (
          <>
            <View className="mb-6">
              <Text className="text-gray-700 mb-2 font-medium">
                Select Ticket *
              </Text>
              <View className="border border-gray-300 rounded-lg overflow-hidden bg-white">
                {tickets.map((ticket) => (
                  <TouchableOpacity
                    key={ticket.id}
                    className={`p-3 border-b border-gray-200 ${selectedTicket === ticket.id ? "bg-blue-50" : ""}`}
                    onPress={() => setSelectedTicket(ticket.id)}
                  >
                    <Text
                      className={`font-medium ${selectedTicket === ticket.id ? "text-blue-600" : "text-gray-800"}`}
                    >
                      {ticket.title}
                    </Text>
                    <Text className="text-gray-500 text-sm">
                      {ticket.restaurant_name}
                    </Text>
                  </TouchableOpacity>
                ))}
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
              <Text className="text-gray-700 mb-2 font-medium">
                Technician *
              </Text>
              <View className="border border-gray-300 rounded-lg overflow-hidden bg-white">
                {technicians.map((tech) => (
                  <TouchableOpacity
                    key={tech.id}
                    className={`p-3 border-b border-gray-200 flex-row items-center ${selectedTechnician === tech.id ? "bg-blue-50" : ""}`}
                    onPress={() => setSelectedTechnician(tech.id)}
                  >
                    <User size={18} color="#6b7280" className="mr-2" />
                    <Text
                      className={`${selectedTechnician === tech.id ? "text-blue-600 font-medium" : "text-gray-800"}`}
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
                onPress={() => router.back()}
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
                <Text className="text-white text-center font-medium">
                  {isSubmitting ? "Scheduling..." : "Schedule Maintenance"}
                </Text>
              </TouchableOpacity>
            </View>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
