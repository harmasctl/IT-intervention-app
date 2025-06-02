import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  ScrollView,
  TextInput,
  Alert,
  ActivityIndicator,
} from "react-native";
import {
  User,
  Clock,
  X,
  Check,
  UserPlus,
  History,
} from "lucide-react-native";
import { supabase } from "../lib/supabase";
import { useAuth } from "./AuthProvider";

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
}

interface Assignment {
  id: string;
  assigned_to: string;
  assigned_by: string;
  assigned_at: string;
  notes: string;
  assigned_to_user: User;
  assigned_by_user: User;
}

interface TicketAssignmentProps {
  ticketId: string;
  currentAssignedTo?: string;
  onAssignmentChange?: () => void;
}

export default function TicketAssignment({
  ticketId,
  currentAssignedTo,
  onAssignmentChange,
}: TicketAssignmentProps) {
  const { user } = useAuth();
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [users, setUsers] = useState<User[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [selectedUser, setSelectedUser] = useState<string>("");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [assignedUser, setAssignedUser] = useState<User | null>(null);

  useEffect(() => {
    if (showAssignModal) {
      fetchUsers();
    }
  }, [showAssignModal]);

  useEffect(() => {
    if (showHistoryModal) {
      fetchAssignmentHistory();
    }
  }, [showHistoryModal]);

  useEffect(() => {
    if (currentAssignedTo) {
      fetchAssignedUser();
    } else {
      setAssignedUser(null);
    }
  }, [currentAssignedTo]);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("users")
        .select("id, name, email, role")
        .order("name");

      if (error) throw error;
      setUsers(data || []);
    } catch (error) {
      console.error("Error fetching users:", error);
      Alert.alert("Error", "Failed to load users");
    } finally {
      setLoading(false);
    }
  };

  const fetchAssignedUser = async () => {
    if (!currentAssignedTo) return;

    try {
      const { data, error } = await supabase
        .from("users")
        .select("id, name, email, role")
        .eq("id", currentAssignedTo)
        .single();

      if (error) throw error;
      setAssignedUser(data);
    } catch (error) {
      console.error("Error fetching assigned user:", error);
      setAssignedUser(null);
    }
  };

  const fetchAssignmentHistory = async () => {
    try {
      setLoadingHistory(true);
      const { data, error } = await supabase
        .from("ticket_assignments")
        .select(`
          *,
          assigned_to_user:users!assigned_to(id, name, email, role),
          assigned_by_user:users!assigned_by(id, name, email, role)
        `)
        .eq("ticket_id", ticketId)
        .order("assigned_at", { ascending: false });

      if (error) throw error;
      setAssignments(data || []);
    } catch (error) {
      console.error("Error fetching assignment history:", error);
      Alert.alert("Error", "Failed to load assignment history");
    } finally {
      setLoadingHistory(false);
    }
  };

  const handleAssign = async () => {
    if (!selectedUser) {
      Alert.alert("Error", "Please select a user to assign");
      return;
    }

    try {
      setLoading(true);

      // Create assignment record
      const { error: assignmentError } = await supabase
        .from("ticket_assignments")
        .insert({
          ticket_id: ticketId,
          assigned_to: selectedUser,
          assigned_by: user?.id,
          notes: notes.trim() || null,
        });

      if (assignmentError) throw assignmentError;

      // Update ticket assigned_to field (status remains "open")
      const { error: ticketError } = await supabase
        .from("tickets")
        .update({
          assigned_to: selectedUser
        })
        .eq("id", ticketId);

      if (ticketError) throw ticketError;

      Alert.alert("Success", "Ticket assigned successfully");
      setShowAssignModal(false);
      setSelectedUser("");
      setNotes("");

      if (onAssignmentChange) {
        onAssignmentChange();
      }

      // Refresh assigned user info
      fetchAssignedUser();
    } catch (error) {
      console.error("Error assigning ticket:", error);
      Alert.alert("Error", "Failed to assign ticket");
    } finally {
      setLoading(false);
    }
  };

  const handleUnassign = async () => {
    try {
      setLoading(true);

      // Create unassignment record
      const { error: assignmentError } = await supabase
        .from("ticket_assignments")
        .insert({
          ticket_id: ticketId,
          assigned_to: null,
          assigned_by: user?.id,
          notes: "Ticket unassigned",
        });

      if (assignmentError) throw assignmentError;

      // Update ticket
      const { error: ticketError } = await supabase
        .from("tickets")
        .update({
          assigned_to: null,
          status: "new"
        })
        .eq("id", ticketId);

      if (ticketError) throw ticketError;

      Alert.alert("Success", "Ticket unassigned successfully");

      if (onAssignmentChange) {
        onAssignmentChange();
      }

      // Clear assigned user info
      setAssignedUser(null);
    } catch (error) {
      console.error("Error unassigning ticket:", error);
      Alert.alert("Error", "Failed to unassign ticket");
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  const getCurrentAssignedUser = () => {
    return users.find(u => u.id === currentAssignedTo);
  };

  return (
    <View className="bg-white rounded-lg p-4 mb-4 shadow-sm border border-gray-200">
      <Text className="text-lg font-bold text-gray-800 mb-3">Assignment</Text>

      {currentAssignedTo ? (
        <View className="bg-blue-50 rounded-lg p-3 mb-3">
          <View className="flex-row items-center justify-between">
            <View className="flex-row items-center flex-1">
              <User size={20} color="#3b82f6" />
              <View className="ml-2 flex-1">
                <Text className="font-medium text-blue-900">
                  {assignedUser?.name || "Loading..."}
                </Text>
                <Text className="text-blue-700 text-sm">
                  {assignedUser?.role || ""}
                </Text>
              </View>
            </View>
            <TouchableOpacity
              onPress={handleUnassign}
              className="bg-red-100 p-2 rounded-lg"
              disabled={loading}
            >
              <X size={16} color="#dc2626" />
            </TouchableOpacity>
          </View>
        </View>
      ) : (
        <View className="bg-gray-50 rounded-lg p-3 mb-3">
          <Text className="text-gray-500 text-center">Not assigned</Text>
        </View>
      )}

      <View className="flex-row space-x-2">
        <TouchableOpacity
          onPress={() => setShowAssignModal(true)}
          className="flex-1 bg-blue-500 rounded-lg p-3 flex-row items-center justify-center"
          disabled={loading}
        >
          <UserPlus size={16} color="#ffffff" />
          <Text className="text-white font-medium ml-2">
            {currentAssignedTo ? "Reassign" : "Assign"}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => setShowHistoryModal(true)}
          className="bg-gray-500 rounded-lg p-3 flex-row items-center justify-center"
        >
          <History size={16} color="#ffffff" />
          <Text className="text-white font-medium ml-2">History</Text>
        </TouchableOpacity>
      </View>

      {/* Assignment Modal */}
      <Modal
        visible={showAssignModal}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <View className="flex-1 bg-white">
          <View className="flex-row items-center justify-between p-4 border-b border-gray-200">
            <Text className="text-lg font-bold">Assign Ticket</Text>
            <TouchableOpacity onPress={() => setShowAssignModal(false)}>
              <X size={24} color="#6b7280" />
            </TouchableOpacity>
          </View>

          <ScrollView className="flex-1 p-4">
            <Text className="text-sm font-medium text-gray-700 mb-2">
              Select User *
            </Text>

            {loading ? (
              <ActivityIndicator size="small" color="#3b82f6" />
            ) : (
              <ScrollView className="max-h-64 mb-4">
                {users.map((user) => (
                  <TouchableOpacity
                    key={user.id}
                    onPress={() => setSelectedUser(user.id)}
                    className={`p-3 rounded-lg mb-2 border ${
                      selectedUser === user.id
                        ? "bg-blue-50 border-blue-300"
                        : "bg-gray-50 border-gray-200"
                    }`}
                  >
                    <View className="flex-row items-center justify-between">
                      <View>
                        <Text className="font-medium">{user.name}</Text>
                        <Text className="text-gray-500 text-sm">{user.role}</Text>
                        <Text className="text-gray-400 text-xs">{user.email}</Text>
                      </View>
                      {selectedUser === user.id && (
                        <Check size={20} color="#3b82f6" />
                      )}
                    </View>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            )}

            <Text className="text-sm font-medium text-gray-700 mb-2">
              Notes (Optional)
            </Text>
            <TextInput
              className="bg-gray-100 p-3 rounded-lg text-base mb-4"
              placeholder="Add assignment notes..."
              value={notes}
              onChangeText={setNotes}
              multiline
              numberOfLines={3}
            />

            <TouchableOpacity
              onPress={handleAssign}
              className="bg-blue-500 rounded-lg p-4"
              disabled={loading || !selectedUser}
            >
              {loading ? (
                <ActivityIndicator size="small" color="#ffffff" />
              ) : (
                <Text className="text-white font-medium text-center">
                  Assign Ticket
                </Text>
              )}
            </TouchableOpacity>
          </ScrollView>
        </View>
      </Modal>

      {/* Assignment History Modal */}
      <Modal
        visible={showHistoryModal}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <View className="flex-1 bg-white">
          <View className="flex-row items-center justify-between p-4 border-b border-gray-200">
            <Text className="text-lg font-bold">Assignment History</Text>
            <TouchableOpacity onPress={() => setShowHistoryModal(false)}>
              <X size={24} color="#6b7280" />
            </TouchableOpacity>
          </View>

          <ScrollView className="flex-1 p-4">
            {loadingHistory ? (
              <View className="flex-1 justify-center items-center">
                <ActivityIndicator size="large" color="#3b82f6" />
                <Text className="text-gray-500 mt-2">Loading history...</Text>
              </View>
            ) : assignments.length === 0 ? (
              <View className="flex-1 justify-center items-center">
                <Text className="text-gray-500">No assignment history</Text>
              </View>
            ) : (
              assignments.map((assignment) => (
                <View
                  key={assignment.id}
                  className="bg-gray-50 rounded-lg p-4 mb-3"
                >
                  <View className="flex-row items-center mb-2">
                    <Clock size={16} color="#6b7280" />
                    <Text className="text-gray-600 text-sm ml-2">
                      {formatDate(assignment.assigned_at)}
                    </Text>
                  </View>

                  <View className="flex-row items-center mb-2">
                    <User size={16} color="#3b82f6" />
                    <Text className="text-gray-800 ml-2">
                      {assignment.assigned_to_user
                        ? `Assigned to ${assignment.assigned_to_user.name}`
                        : "Unassigned"}
                    </Text>
                  </View>

                  <Text className="text-gray-600 text-sm">
                    By: {assignment.assigned_by_user?.name || "System"}
                  </Text>

                  {assignment.notes && (
                    <View className="mt-2 p-2 bg-white rounded border-l-4 border-blue-300">
                      <Text className="text-gray-700 text-sm">
                        {assignment.notes}
                      </Text>
                    </View>
                  )}
                </View>
              ))
            )}
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}
