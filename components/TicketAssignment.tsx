import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  Alert,
  Modal,
} from "react-native";
import { supabase } from "../lib/supabase";
import { User, CheckCircle, Clock } from "lucide-react-native";
import { useAuth } from "./AuthProvider";

type Technician = {
  id: string;
  name: string;
  email: string;
  role: string;
  avatar_url?: string;
  specialization?: string;
  current_workload?: number;
};

type TicketAssignmentProps = {
  ticketId: string;
  currentAssigneeId?: string | null;
  onAssign: (technicianId: string, technicianName: string) => void;
  onClose: () => void;
};

export default function TicketAssignment({
  ticketId,
  currentAssigneeId,
  onAssign,
  onClose,
}: TicketAssignmentProps) {
  const [technicians, setTechnicians] = useState<Technician[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    fetchTechnicians();
  }, []);

  const fetchTechnicians = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("role", "technician");

      if (error) throw error;

      if (data) {
        // Transform data to match Technician type
        const techData = data.map((tech) => ({
          id: tech.id,
          name: tech.full_name || tech.email.split("@")[0],
          email: tech.email,
          role: tech.role,
          avatar_url: tech.avatar_url,
          specialization: tech.specialization,
          current_workload: tech.current_workload || 0,
        }));
        setTechnicians(techData);
      }
    } catch (error) {
      console.error("Error fetching technicians:", error);
      Alert.alert("Error", "Failed to load technicians");
    } finally {
      setLoading(false);
    }
  };

  const handleSelfAssign = async () => {
    if (!user) return;

    try {
      // Get user profile to get the name
      const { data: profileData, error: profileError } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("id", user.id)
        .single();

      if (profileError) throw profileError;

      const technicianName =
        profileData?.name || user.email?.split("@")[0] || "Current User";

      onAssign(user.id, technicianName);
    } catch (error) {
      console.error("Error self-assigning ticket:", error);
      Alert.alert("Error", "Failed to assign ticket to yourself");
    }
  };

  const handleAssign = (technicianId: string, technicianName: string) => {
    onAssign(technicianId, technicianName);
  };

  const renderTechnicianItem = ({ item }: { item: Technician }) => {
    const isCurrentAssignee = item.id === currentAssigneeId;

    return (
      <TouchableOpacity
        className={`flex-row items-center p-4 border-b border-gray-100 ${isCurrentAssignee ? "bg-blue-50" : ""}`}
        onPress={() => handleAssign(item.id, item.name)}
      >
        <View className="bg-blue-100 w-10 h-10 rounded-full items-center justify-center mr-3">
          <User size={20} color="#1e40af" />
        </View>
        <View className="flex-1">
          <Text className="font-bold text-gray-800">{item.name}</Text>
          <Text className="text-gray-500 text-sm">{item.email}</Text>
          {item.specialization && (
            <Text className="text-gray-500 text-xs mt-1">
              Specialization: {item.specialization}
            </Text>
          )}
        </View>
        <View className="items-end">
          <View className="flex-row items-center">
            <Clock size={14} color="#4b5563" />
            <Text className="text-gray-500 text-sm ml-1">
              {item.current_workload || 0} tickets
            </Text>
          </View>
          {isCurrentAssignee && (
            <View className="flex-row items-center mt-1">
              <CheckCircle size={14} color="#16a34a" />
              <Text className="text-green-600 text-xs ml-1">Current</Text>
            </View>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View className="flex-1 bg-white">
      <View className="p-4 border-b border-gray-200">
        <Text className="text-xl font-bold text-center text-blue-800">
          Assign Ticket
        </Text>
        <TouchableOpacity className="absolute right-4 top-4" onPress={onClose}>
          <Text className="text-blue-600 font-medium">Cancel</Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity
        className="m-4 bg-blue-600 p-3 rounded-lg items-center"
        onPress={handleSelfAssign}
      >
        <Text className="text-white font-bold">Assign to Myself</Text>
      </TouchableOpacity>

      <View className="px-4 py-2 bg-gray-100">
        <Text className="font-medium text-gray-700">Available Technicians</Text>
      </View>

      {loading ? (
        <View className="flex-1 justify-center items-center">
          <ActivityIndicator size="large" color="#1e40af" />
          <Text className="mt-2 text-gray-500">Loading technicians...</Text>
        </View>
      ) : technicians.length > 0 ? (
        <FlatList
          data={technicians}
          renderItem={renderTechnicianItem}
          keyExtractor={(item) => item.id}
        />
      ) : (
        <View className="flex-1 justify-center items-center p-4">
          <Text className="text-gray-500 text-center">
            No technicians available. Add technicians to your team to enable
            assignment.
          </Text>
        </View>
      )}
    </View>
  );
}
