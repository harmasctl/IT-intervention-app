import React, { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
} from "react-native";
import { Image } from "expo-image";
import {
  Calendar,
  Clock,
  CheckCircle,
  X,
  Camera,
  MessageCircle,
  Edit,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
} from "lucide-react-native";

interface InterventionHistory {
  date: string;
  technician: string;
  actions: string;
  status: "completed" | "pending" | "failed";
  notes?: string;
}

interface TicketDetailProps {
  ticketId?: string;
  title?: string;
  device?: string;
  diagnosticInfo?: string;
  restaurant?: string;
  priority?: "low" | "medium" | "high" | "critical";
  status?: "new" | "assigned" | "in-progress" | "resolved";
  assignedTo?: string;
  createdAt?: string;
  photos?: string[];
  interventionHistory?: InterventionHistory[];
  onAssign?: () => void;
  onSchedule?: () => void;
  onUpdateStatus?: (status: string) => void;
  onAddResolution?: (resolution: string) => void;
}

const TicketDetail: React.FC<TicketDetailProps> = ({
  ticketId = "TKT-2023-001",
  title = "Ice machine not cooling properly",
  device = "Hoshizaki Ice Machine KM-660MAJ",
  diagnosticInfo = "Unit is running but not producing ice. Temperature readings are above normal range.",
  restaurant = "Seaside Grill",
  priority = "high",
  status = "assigned",
  assignedTo = "John Doe",
  createdAt = "2023-10-15 09:30 AM",
  photos = [
    "https://images.unsplash.com/photo-1585704032915-c3400ca199e7?w=400&q=80",
    "https://images.unsplash.com/photo-1563203369-26f2e4a5ccf7?w=400&q=80",
  ],
  interventionHistory = [
    {
      date: "2023-10-16 02:30 PM",
      technician: "John Doe",
      actions: "Cleaned condenser coils, replaced water filter",
      status: "completed",
      notes: "Unit was heavily soiled, recommend monthly cleaning schedule",
    },
  ],
  onAssign = () => {},
  onSchedule = () => {},
  onUpdateStatus = () => {},
  onAddResolution = () => {},
}) => {
  const [showHistory, setShowHistory] = useState(true);
  const [resolutionNote, setResolutionNote] = useState("");
  const [showStatusOptions, setShowStatusOptions] = useState(false);

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "low":
        return "bg-blue-100 text-blue-800";
      case "medium":
        return "bg-yellow-100 text-yellow-800";
      case "high":
        return "bg-orange-100 text-orange-800";
      case "critical":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "new":
        return "bg-blue-100 text-blue-800";
      case "assigned":
        return "bg-purple-100 text-purple-800";
      case "in-progress":
        return "bg-yellow-100 text-yellow-800";
      case "resolved":
        return "bg-green-100 text-green-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getInterventionStatusColor = (status: string) => {
    switch (status) {
      case "completed":
        return "text-green-600";
      case "pending":
        return "text-yellow-600";
      case "failed":
        return "text-red-600";
      default:
        return "text-gray-600";
    }
  };

  return (
    <ScrollView className="flex-1 bg-white">
      <View className="p-4">
        {/* Header with ticket ID and status */}
        <View className="flex-row justify-between items-center mb-4">
          <Text className="text-lg font-bold text-gray-700">{ticketId}</Text>
          <View className={`px-3 py-1 rounded-full ${getStatusColor(status)}`}>
            <Text className="font-medium">{status}</Text>
          </View>
        </View>

        {/* Title and priority */}
        <View className="mb-6">
          <Text className="text-2xl font-bold text-gray-900 mb-2">{title}</Text>
          <View className="flex-row items-center">
            <View
              className={`px-3 py-1 rounded-full ${getPriorityColor(priority)} mr-2`}
            >
              <Text className="font-medium">{priority} priority</Text>
            </View>
            <Text className="text-gray-500">{createdAt}</Text>
          </View>
        </View>

        {/* Main ticket details */}
        <View className="bg-gray-50 rounded-xl p-4 mb-6">
          <View className="mb-4">
            <Text className="text-sm text-gray-500 mb-1">Restaurant</Text>
            <Text className="text-base font-medium">{restaurant}</Text>
          </View>

          <View className="mb-4">
            <Text className="text-sm text-gray-500 mb-1">Device</Text>
            <Text className="text-base font-medium">{device}</Text>
          </View>

          <View className="mb-4">
            <Text className="text-sm text-gray-500 mb-1">
              Diagnostic Information
            </Text>
            <Text className="text-base">{diagnosticInfo}</Text>
          </View>

          <View>
            <Text className="text-sm text-gray-500 mb-1">Assigned To</Text>
            <Text className="text-base font-medium">
              {assignedTo || "Unassigned"}
            </Text>
          </View>
        </View>

        {/* Photos */}
        {photos && photos.length > 0 && (
          <View className="mb-6">
            <Text className="text-lg font-bold mb-3">Photos</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {photos.map((photo, index) => (
                <View key={index} className="mr-3">
                  <Image
                    source={{ uri: photo }}
                    style={{ width: 120, height: 120 }}
                    className="rounded-lg"
                  />
                </View>
              ))}
              <TouchableOpacity
                className="w-[120px] h-[120px] bg-gray-100 rounded-lg items-center justify-center"
                onPress={() => {}}
              >
                <Camera size={24} color="#6b7280" />
                <Text className="text-gray-500 mt-2">Add Photo</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        )}

        {/* Action buttons */}
        <View className="flex-row justify-between mb-6">
          <TouchableOpacity
            className="bg-blue-500 px-4 py-3 rounded-lg flex-1 mr-2 items-center"
            onPress={onAssign}
          >
            <Text className="text-white font-medium">Assign</Text>
          </TouchableOpacity>
          <TouchableOpacity
            className="bg-purple-500 px-4 py-3 rounded-lg flex-1 ml-2 items-center"
            onPress={onSchedule}
          >
            <Text className="text-white font-medium">Schedule</Text>
          </TouchableOpacity>
        </View>

        {/* Status update */}
        <View className="mb-6">
          <Text className="text-lg font-bold mb-3">Update Status</Text>
          <TouchableOpacity
            className="bg-gray-100 p-4 rounded-lg flex-row justify-between items-center"
            onPress={() => setShowStatusOptions(!showStatusOptions)}
          >
            <Text className="font-medium">{status}</Text>
            {showStatusOptions ? (
              <ChevronUp size={20} />
            ) : (
              <ChevronDown size={20} />
            )}
          </TouchableOpacity>

          {showStatusOptions && (
            <View className="bg-white border border-gray-200 rounded-lg mt-2">
              {["new", "assigned", "in-progress", "resolved"].map((option) => (
                <TouchableOpacity
                  key={option}
                  className={`p-3 border-b border-gray-100 ${option === status ? "bg-gray-50" : ""}`}
                  onPress={() => {
                    onUpdateStatus(option);
                    setShowStatusOptions(false);
                  }}
                >
                  <Text>{option}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>

        {/* Resolution notes */}
        <View className="mb-6">
          <Text className="text-lg font-bold mb-3">Add Resolution</Text>
          <TextInput
            className="bg-gray-100 p-4 rounded-lg min-h-[100px] text-base"
            placeholder="Enter resolution details..."
            multiline
            value={resolutionNote}
            onChangeText={setResolutionNote}
          />
          <TouchableOpacity
            className="bg-green-500 px-4 py-3 rounded-lg mt-2 items-center"
            onPress={() => {
              onAddResolution(resolutionNote);
              setResolutionNote("");
            }}
          >
            <Text className="text-white font-medium">Submit Resolution</Text>
          </TouchableOpacity>
        </View>

        {/* Intervention history */}
        {interventionHistory && interventionHistory.length > 0 && (
          <View className="mb-6">
            <TouchableOpacity
              className="flex-row justify-between items-center mb-3"
              onPress={() => setShowHistory(!showHistory)}
            >
              <Text className="text-lg font-bold">Intervention History</Text>
              {showHistory ? (
                <ChevronUp size={20} />
              ) : (
                <ChevronDown size={20} />
              )}
            </TouchableOpacity>

            {showHistory && (
              <View>
                {interventionHistory.map((intervention, index) => (
                  <View key={index} className="bg-gray-50 p-4 rounded-lg mb-3">
                    <View className="flex-row justify-between items-center mb-2">
                      <Text className="font-medium">{intervention.date}</Text>
                      <Text
                        className={getInterventionStatusColor(
                          intervention.status,
                        )}
                      >
                        {intervention.status}
                      </Text>
                    </View>
                    <Text className="mb-2">
                      <Text className="font-medium">Technician:</Text>{" "}
                      {intervention.technician}
                    </Text>
                    <Text className="mb-2">
                      <Text className="font-medium">Actions:</Text>{" "}
                      {intervention.actions}
                    </Text>
                    {intervention.notes && (
                      <Text>
                        <Text className="font-medium">Notes:</Text>{" "}
                        {intervention.notes}
                      </Text>
                    )}
                  </View>
                ))}
              </View>
            )}
          </View>
        )}
      </View>
    </ScrollView>
  );
};

export default TicketDetail;
