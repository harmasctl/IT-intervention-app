import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  Image as RNImage,
  Modal,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { useLocalSearchParams, useRouter } from "expo-router";
import {
  ArrowLeft,
  Clock,
  CheckCircle,
  AlertCircle,
  MessageSquare,
  Smartphone,
  Building2,
  User,
  Calendar,
  Image as ImageIcon,
  FileText,
  X,
} from "lucide-react-native";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../../components/AuthProvider";
import TicketStatusWorkflow from "../../components/TicketStatusWorkflow";
import TicketAssignment from "../../components/TicketAssignment";
import { useOffline } from "../../components/OfflineManager";
import { Image } from "expo-image";

export default function TicketDetailScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const { user } = useAuth();
  const { isOnline, saveOfflineAction } = useOffline();
  const [ticket, setTicket] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [isAssignee, setIsAssignee] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  useEffect(() => {
    if (id) {
      fetchTicketDetails();
    }
  }, [id]);

  useEffect(() => {
    if (ticket && user) {
      setIsAssignee(ticket.assignee_id === user.id);
    }
  }, [ticket, user]);

  const fetchTicketDetails = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("tickets")
        .select("*, devices(*), restaurants(*)")
        .eq("id", id)
        .single();

      if (error) throw error;

      if (data) {
        setTicket(data);
      }
    } catch (error) {
      console.error("Error fetching ticket details:", error);
      Alert.alert("Error", "Failed to load ticket details");
    } finally {
      setLoading(false);
    }
  };

  const handleAssign = async (technicianId: string, technicianName: string) => {
    try {
      const now = new Date().toISOString();
      const updates = {
        assignee_id: technicianId,
        assignee_name: technicianName,
        assigned_at: now,
        status: "assigned",
        updated_at: now,
      };

      if (isOnline) {
        const { error } = await supabase
          .from("tickets")
          .update(updates)
          .eq("id", id);

        if (error) throw error;

        // Record in ticket history
        await supabase.from("ticket_history").insert([
          {
            ticket_id: id,
            status: "assigned",
            timestamp: now,
            notes: `Assigned to ${technicianName}`,
            user_id: user?.id,
          },
        ]);

        // Create notification
        await supabase.from("notifications").insert([
          {
            title: "Ticket Assigned",
            message: `Ticket #${id} has been assigned to ${technicianName}`,
            type: "info",
            related_id: id,
            related_type: "ticket",
            is_read: false,
            created_at: now,
          },
        ]);
      } else {
        // Save for offline sync
        await saveOfflineAction("tickets", "update", { id, ...updates });
        await saveOfflineAction("ticket_history", "insert", {
          ticket_id: id,
          status: "assigned",
          timestamp: now,
          notes: `Assigned to ${technicianName}`,
          user_id: user?.id,
        });
      }

      // Update local state
      setTicket({
        ...ticket,
        ...updates,
      });

      setShowAssignModal(false);
    } catch (error) {
      console.error("Error assigning ticket:", error);
      Alert.alert("Error", "Failed to assign ticket");
    }
  };

  const handleStatusChange = (newStatus: string) => {
    // Update local state immediately for better UX
    setTicket({
      ...ticket,
      status: newStatus,
      updated_at: new Date().toISOString(),
    });
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "high":
        return "bg-red-100 text-red-800";
      case "medium":
        return "bg-amber-100 text-amber-800";
      case "low":
        return "bg-green-100 text-green-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return "Not set";
    const date = new Date(dateString);
    return date.toLocaleString();
  };

  if (loading) {
    return (
      <SafeAreaView className="flex-1 bg-white">
        <StatusBar style="auto" />
        <View className="flex-1 justify-center items-center">
          <ActivityIndicator size="large" color="#1e40af" />
          <Text className="mt-4 text-gray-500">Loading ticket details...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!ticket) {
    return (
      <SafeAreaView className="flex-1 bg-white">
        <StatusBar style="auto" />
        <View className="flex-1 justify-center items-center p-4">
          <AlertCircle size={48} color="#ef4444" />
          <Text className="mt-4 text-gray-800 text-lg font-bold">
            Ticket Not Found
          </Text>
          <Text className="mt-2 text-gray-500 text-center">
            The ticket you're looking for doesn't exist or has been deleted.
          </Text>
          <TouchableOpacity
            className="mt-6 bg-blue-600 px-4 py-2 rounded-lg"
            onPress={() => router.back()}
          >
            <Text className="text-white font-medium">Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-white">
      <StatusBar style="auto" />
      <View className="flex-row items-center p-4 border-b border-gray-200">
        <TouchableOpacity onPress={() => router.back()} className="mr-4">
          <ArrowLeft size={24} color="#1e40af" />
        </TouchableOpacity>
        <View className="flex-1">
          <Text className="text-xl font-bold text-gray-800" numberOfLines={1}>
            {ticket.title}
          </Text>
          <Text className="text-gray-500">Ticket #{ticket.id.slice(0, 8)}</Text>
        </View>
      </View>

      <ScrollView className="flex-1 p-4">
        {/* Diagnostic Information */}
        <View className="mt-4 p-4 bg-gray-50 rounded-lg">
          <View className="flex-row items-center mb-2">
            <FileText size={18} color="#1e40af" />
            <Text className="ml-2 text-gray-800 font-bold">Diagnostic Information</Text>
          </View>
          <Text className="text-gray-700">{ticket.diagnostic_info || "No diagnostic information provided"}</Text>
        </View>

        <TicketStatusWorkflow
          ticketId={ticket.id}
          currentStatus={ticket.status}
          onStatusChange={handleStatusChange}
          assigneeId={ticket.assignee_id}
          isAssignee={isAssignee}
        />

        <View className="mb-4">
          <Text className="text-gray-700 font-medium mb-2">Priority</Text>
          <View
            className={`px-3 py-1.5 self-start rounded-full ${getPriorityColor(
              ticket.priority,
            )}`}
          >
            <Text className="font-medium capitalize">{ticket.priority}</Text>
          </View>
        </View>

        <View className="mb-4">
          <Text className="text-gray-700 font-medium mb-2">Assigned To</Text>
          {ticket.assignee_name ? (
            <View className="flex-row items-center">
              <View className="bg-blue-100 w-8 h-8 rounded-full items-center justify-center mr-2">
                <User size={16} color="#1e40af" />
              </View>
              <View>
                <Text className="font-medium text-gray-800">
                  {ticket.assignee_name}
                </Text>
                <Text className="text-gray-500 text-xs">
                  Assigned {formatDate(ticket.assigned_at)}
                </Text>
              </View>
            </View>
          ) : (
            <View className="flex-row items-center">
              <TouchableOpacity
                className="bg-blue-600 px-3 py-1.5 rounded-lg flex-row items-center"
                onPress={() => setShowAssignModal(true)}
              >
                <User size={16} color="white" />
                <Text className="text-white font-medium ml-1">
                  Assign Ticket
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        <View className="mb-4">
          <Text className="text-gray-700 font-medium mb-2">Device</Text>
          {ticket.devices ? (
            <View className="flex-row items-center bg-gray-50 p-3 rounded-lg">
              <View className="bg-blue-100 w-10 h-10 rounded-full items-center justify-center mr-3">
                <Smartphone size={20} color="#1e40af" />
              </View>
              <View className="flex-1">
                <Text className="font-medium text-gray-800">
                  {ticket.devices.name}
                </Text>
                <Text className="text-gray-500 text-sm">
                  {ticket.devices.type} •{" "}
                  {ticket.devices.model || "Unknown model"}
                </Text>
                {ticket.devices.serial_number && (
                  <Text className="text-gray-500 text-xs">
                    S/N: {ticket.devices.serial_number}
                  </Text>
                )}
              </View>
              <TouchableOpacity
                onPress={() => router.back()}
              >
                <Text className="text-blue-600">View</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <Text className="text-gray-500">No device associated</Text>
          )}
        </View>

        <View className="mb-4">
          <Text className="text-gray-700 font-medium mb-2">Location</Text>
          {ticket.restaurants ? (
            <View className="flex-row items-center bg-gray-50 p-3 rounded-lg">
              <View className="bg-blue-100 w-10 h-10 rounded-full items-center justify-center mr-3">
                <Building2 size={20} color="#1e40af" />
              </View>
              <View className="flex-1">
                <Text className="font-medium text-gray-800">
                  {ticket.restaurants.name}
                </Text>
                <Text className="text-gray-500 text-sm">
                  {ticket.restaurants.address || "No address provided"}
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => router.back()}
              >
                <Text className="text-blue-600">View</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <Text className="text-gray-500">No location associated</Text>
          )}
        </View>

        <View className="mb-4">
          <Text className="text-gray-700 font-medium mb-2">Timeline</Text>
          <View className="bg-gray-50 p-3 rounded-lg">
            <View className="flex-row items-center mb-3">
              <View className="bg-blue-100 w-8 h-8 rounded-full items-center justify-center mr-2">
                <FileText size={16} color="#1e40af" />
              </View>
              <View className="flex-1">
                <Text className="font-medium text-gray-800">
                  Ticket Created
                </Text>
                <Text className="text-gray-500 text-xs">
                  {formatDate(ticket.created_at)}
                </Text>
              </View>
            </View>

            {ticket.assigned_at && (
              <View className="flex-row items-center mb-3">
                <View className="bg-purple-100 w-8 h-8 rounded-full items-center justify-center mr-2">
                  <User size={16} color="#7e22ce" />
                </View>
                <View className="flex-1">
                  <Text className="font-medium text-gray-800">
                    Assigned to {ticket.assignee_name}
                  </Text>
                  <Text className="text-gray-500 text-xs">
                    {formatDate(ticket.assigned_at)}
                  </Text>
                </View>
              </View>
            )}

            {ticket.first_response_at && (
              <View className="flex-row items-center mb-3">
                <View className="bg-amber-100 w-8 h-8 rounded-full items-center justify-center mr-2">
                  <MessageSquare size={16} color="#b45309" />
                </View>
                <View className="flex-1">
                  <Text className="font-medium text-gray-800">
                    First Response
                  </Text>
                  <Text className="text-gray-500 text-xs">
                    {formatDate(ticket.first_response_at)}
                  </Text>
                </View>
              </View>
            )}

            {ticket.resolved_at && (
              <View className="flex-row items-center">
                <View className="bg-green-100 w-8 h-8 rounded-full items-center justify-center mr-2">
                  <CheckCircle size={16} color="#15803d" />
                </View>
                <View className="flex-1">
                  <Text className="font-medium text-gray-800">
                    Ticket Resolved
                  </Text>
                  <Text className="text-gray-500 text-xs">
                    {formatDate(ticket.resolved_at)}
                  </Text>
                </View>
              </View>
            )}
          </View>
        </View>

        {/* Photos */}
        {ticket.photos && ticket.photos.length > 0 && (
          <View className="mt-4 p-4 bg-gray-50 rounded-lg">
            <View className="flex-row items-center mb-2">
              <ImageIcon size={18} color="#1e40af" />
              <Text className="ml-2 text-gray-800 font-bold">Photos</Text>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {ticket.photos.map((photo: string, index: number) => (
                <TouchableOpacity
                  key={index}
                  className="mr-3"
                  onPress={() => setSelectedImage(photo)}
                >
                  <Image
                    source={{ uri: photo }}
                    style={{ width: 100, height: 100, borderRadius: 8 }}
                    contentFit="cover"
                  />
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}

        {ticket.resolution && (
          <View className="mb-4">
            <Text className="text-gray-700 font-medium mb-2">Resolution</Text>
            <View className="bg-gray-50 p-3 rounded-lg">
              <Text className="text-gray-800">{ticket.resolution}</Text>
            </View>
          </View>
        )}

        {ticket.sla_due_at && (
          <View className="mb-4">
            <Text className="text-gray-700 font-medium mb-2">SLA Due</Text>
            <View className="bg-gray-50 p-3 rounded-lg flex-row items-center">
              <Clock size={16} color="#1e40af" className="mr-2" />
              <Text className="text-gray-800">{formatDate(ticket.sla_due_at)}</Text>
            </View>
          </View>
        )}
      </ScrollView>

      {/* Assignment Modal */}
      <Modal
        visible={showAssignModal}
        animationType="slide"
        onRequestClose={() => setShowAssignModal(false)}
      >
        <TicketAssignment
          ticketId={ticket.id}
          currentAssigneeId={ticket.assignee_id}
          onAssign={handleAssign}
          onClose={() => setShowAssignModal(false)}
        />
      </Modal>

      {/* Image Preview Modal */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={!!selectedImage}
        onRequestClose={() => setSelectedImage(null)}
      >
        <View className="flex-1 bg-black/80 justify-center items-center">
          <TouchableOpacity
            className="absolute top-10 right-6 z-10 bg-black/50 rounded-full p-2"
            onPress={() => setSelectedImage(null)}
          >
            <X size={24} color="#ffffff" />
          </TouchableOpacity>
          {selectedImage && (
            <Image
              source={{ uri: selectedImage }}
              style={{ width: '90%', height: '70%' }}
              contentFit="contain"
            />
          )}
        </View>
      </Modal>
    </SafeAreaView>
  );
}
