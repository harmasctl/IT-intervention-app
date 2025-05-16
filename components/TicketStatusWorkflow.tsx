import React from "react";
import { View, Text, TouchableOpacity, Alert } from "react-native";
import { supabase } from "../lib/supabase";
import {
  Clock,
  CheckCircle,
  AlertCircle,
  ArrowRight,
} from "lucide-react-native";

type TicketStatus = "new" | "assigned" | "in-progress" | "resolved" | "closed";

type TicketStatusWorkflowProps = {
  ticketId: string;
  currentStatus: TicketStatus;
  onStatusChange: (newStatus: TicketStatus) => void;
  assigneeId?: string | null;
  isAssignee?: boolean;
};

export default function TicketStatusWorkflow({
  ticketId,
  currentStatus,
  onStatusChange,
  assigneeId,
  isAssignee = false,
}: TicketStatusWorkflowProps) {
  const getNextStatus = (): TicketStatus | null => {
    switch (currentStatus) {
      case "new":
        return "assigned";
      case "assigned":
        return "in-progress";
      case "in-progress":
        return "resolved";
      case "resolved":
        return "closed";
      default:
        return null;
    }
  };

  const getStatusColor = (status: TicketStatus) => {
    switch (status) {
      case "new":
        return "bg-blue-100 text-blue-800";
      case "assigned":
        return "bg-purple-100 text-purple-800";
      case "in-progress":
        return "bg-amber-100 text-amber-800";
      case "resolved":
        return "bg-green-100 text-green-800";
      case "closed":
        return "bg-gray-100 text-gray-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getStatusIcon = (status: TicketStatus) => {
    switch (status) {
      case "new":
        return <AlertCircle size={16} color="#1e40af" />;
      case "assigned":
        return <Clock size={16} color="#7e22ce" />;
      case "in-progress":
        return <Clock size={16} color="#b45309" />;
      case "resolved":
        return <CheckCircle size={16} color="#15803d" />;
      case "closed":
        return <CheckCircle size={16} color="#4b5563" />;
      default:
        return null;
    }
  };

  const handleStatusChange = async () => {
    const nextStatus = getNextStatus();
    if (!nextStatus) return;

    // Check if ticket is assigned before allowing status change to in-progress
    if (
      currentStatus === "assigned" &&
      nextStatus === "in-progress" &&
      !assigneeId
    ) {
      Alert.alert(
        "Ticket Not Assigned",
        "This ticket needs to be assigned to a technician before it can be marked as in-progress.",
      );
      return;
    }

    // Check if user is the assignee for certain status changes
    if (
      (currentStatus === "assigned" || currentStatus === "in-progress") &&
      !isAssignee
    ) {
      Alert.alert(
        "Permission Denied",
        "Only the assigned technician can update this ticket's status.",
      );
      return;
    }

    try {
      const { error } = await supabase
        .from("tickets")
        .update({ status: nextStatus })
        .eq("id", ticketId);

      if (error) throw error;

      // Create a record in ticket_history
      await supabase.from("ticket_history").insert([
        {
          ticket_id: ticketId,
          status: nextStatus,
          timestamp: new Date().toISOString(),
        },
      ]);

      // If status is changing to resolved, record resolution time
      if (nextStatus === "resolved") {
        const now = new Date().toISOString();
        await supabase
          .from("tickets")
          .update({ resolved_at: now })
          .eq("id", ticketId);
      }

      // Create notification for status change
      await supabase.from("notifications").insert([
        {
          title: "Ticket Status Updated",
          message: `Ticket status changed to ${nextStatus}`,
          type: "info",
          related_id: ticketId,
          related_type: "ticket",
          read: false,
          timestamp: new Date().toISOString(),
          user_id: assigneeId || "",
        },
      ]);

      onStatusChange(nextStatus);
    } catch (error) {
      console.error("Error updating ticket status:", error);
      Alert.alert("Error", "Failed to update ticket status");
    }
  };

  return (
    <View className="mb-4">
      <Text className="text-gray-700 font-medium mb-2">Status</Text>
      <View className="flex-row items-center">
        <View
          className={`px-3 py-1.5 rounded-full flex-row items-center ${getStatusColor(
            currentStatus,
          )}`}
        >
          {getStatusIcon(currentStatus)}
          <Text className={`ml-1 font-medium capitalize`}>
            {currentStatus.replace("-", " ")}
          </Text>
        </View>

        {getNextStatus() && (
          <TouchableOpacity
            className="flex-row items-center ml-3 bg-blue-600 px-3 py-1.5 rounded-full"
            onPress={handleStatusChange}
          >
            <Text className="text-white font-medium mr-1">
              Mark as {getNextStatus()?.replace("-", " ")}
            </Text>
            <ArrowRight size={14} color="white" />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}
