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
  TextInput,
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
  History,
  Send,
  UserCheck,
  UserX,
} from "lucide-react-native";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../../components/AuthProvider";
import TicketStatusWorkflow from "../../components/TicketStatusWorkflow";
import TicketAssignment from "../../components/TicketAssignment";
import { useOffline } from "../../components/OfflineManager";
import { Image } from "expo-image";
import { formatDistanceToNow } from "date-fns";
import ImageGallery from "../../components/ImageGallery";
import * as Haptics from "expo-haptics";

export default function TicketDetailScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const { user } = useAuth();
  const { isOnline, saveOfflineAction } = useOffline();
  const [ticket, setTicket] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isAssignee, setIsAssignee] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [ticketHistory, setTicketHistory] = useState<any[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [ticketComments, setTicketComments] = useState<any[]>([]);
  const [loadingComments, setLoadingComments] = useState(false);
  const [newComment, setNewComment] = useState("");
  const [sendingComment, setSendingComment] = useState(false);
  const [selectedImageIndex, setSelectedImageIndex] = useState<number>(0);
  const [showGallery, setShowGallery] = useState<boolean>(false);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState(false);

  useEffect(() => {
    if (id) {
      fetchTicketDetails();
      fetchTicketHistory();
      fetchTicketComments();
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

      // First fetch the ticket
      const { data: ticketData, error: ticketError } = await supabase
        .from("tickets")
        .select("*")
        .eq("id", id)
        .single();

      if (ticketError) throw ticketError;

      if (ticketData) {
        // Fetch related data separately
        const [deviceData, restaurantData, createdByData, assignedToData] = await Promise.all([
          ticketData.device_id ?
            supabase.from("devices").select("*").eq("id", ticketData.device_id).single() :
            { data: null, error: null },
          ticketData.restaurant_id ?
            supabase.from("restaurants").select("*").eq("id", ticketData.restaurant_id).single() :
            { data: null, error: null },
          ticketData.created_by ?
            supabase.from("users").select("id, name, email").eq("id", ticketData.created_by).single() :
            { data: null, error: null },
          ticketData.assigned_to ?
            supabase.from("users").select("id, name, email").eq("id", ticketData.assigned_to).single() :
            { data: null, error: null }
        ]);

        // Combine the data
        const combinedTicket = {
          ...ticketData,
          devices: deviceData.data,
          restaurants: restaurantData.data,
          created_by_user: createdByData.data,
          assigned_to_user: assignedToData.data,
        };

        setTicket(combinedTicket);
      }
    } catch (error) {
      console.error("Error fetching ticket details:", error);
      Alert.alert("Error", "Failed to load ticket details");
    } finally {
      setLoading(false);
    }
  };

  const fetchTicketHistory = async () => {
    try {
      setLoadingHistory(true);

      // First fetch ticket history
      const { data: historyData, error: historyError } = await supabase
        .from("ticket_history")
        .select("*")
        .eq("ticket_id", id)
        .order("timestamp", { ascending: false });

      if (historyError) throw historyError;

      if (historyData && historyData.length > 0) {
        // Get unique user IDs
        const userIds = [...new Set(historyData.map(h => h.user_id).filter(Boolean))];

        // Fetch user data separately
        const { data: usersData } = await supabase
          .from("users")
          .select("id, name, email")
          .in("id", userIds);

        // Create user lookup map
        const userMap = new Map(usersData?.map(u => [u.id, u]) || []);

        // Combine the data
        const combinedHistory = historyData.map(history => ({
          ...history,
          user: userMap.get(history.user_id) || null,
        }));

        setTicketHistory(combinedHistory);
      } else {
        setTicketHistory([]);
      }
    } catch (error) {
      console.error("Error fetching ticket history:", error);
      // Don't show alert for history loading failure
    } finally {
      setLoadingHistory(false);
    }
  };

  const fetchTicketComments = async () => {
    try {
      setLoadingComments(true);
      const { data, error } = await supabase
        .from("ticket_comments")
        .select("*, users:user_id(name, email)")
        .eq("ticket_id", id)
        .order("created_at", { ascending: true });

      if (error) throw error;

      if (data) {
        setTicketComments(data);
      }
    } catch (error) {
      console.error("Error fetching ticket comments:", error);
      // Don't show alert for comments loading failure
    } finally {
      setLoadingComments(false);
    }
  };



  const handleStatusChange = async (newStatus: string) => {
    try {
      setUpdatingStatus(true);

      // Update local state immediately for better UX
      setTicket({
        ...ticket,
        status: newStatus,
        updated_at: new Date().toISOString(),
      });

      const { error } = await supabase
        .from("tickets")
        .update({
          status: newStatus,
          updated_at: new Date().toISOString()
        })
        .eq("id", id);

      if (error) throw error;

      // Add to ticket history
      await supabase.from("ticket_history").insert([
        {
          ticket_id: id,
          action: "status_changed",
          details: `Status changed to ${newStatus}`,
          user_id: user?.id,
          timestamp: new Date().toISOString(),
        },
      ]);

      Alert.alert("Success", `Ticket status updated to ${newStatus}`);
    } catch (error) {
      console.error("Error updating status:", error);
      Alert.alert("Error", "Failed to update ticket status");
      // Revert the optimistic update
      fetchTicketDetails();
    } finally {
      setUpdatingStatus(false);
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "critical":
        return "bg-red-100 text-red-800";
      case "high":
        return "bg-orange-100 text-orange-800";
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

  const renderTicketHistory = () => {
    if (loadingHistory) {
      return (
        <View className="py-4 items-center">
          <ActivityIndicator size="small" color="#1e40af" />
          <Text className="text-gray-500 mt-2">Loading history...</Text>
        </View>
      );
    }

    if (ticketHistory.length === 0) {
      return (
        <View className="py-4 items-center">
          <Text className="text-gray-500">No history available</Text>
        </View>
      );
    }

    return ticketHistory.map((item, index) => (
      <View
        key={item.id}
        className={`p-3 ${index < ticketHistory.length - 1 ? 'border-b border-gray-100' : ''}`}
      >
        <View className="flex-row justify-between items-start">
          <View className="flex-row items-center">
            <View className={`w-2 h-2 rounded-full ${getStatusColor(item.status)} mr-2`} />
            <Text className="font-medium">{getStatusLabel(item.status)}</Text>
          </View>
          <Text className="text-xs text-gray-500">{formatDate(item.timestamp)}</Text>
        </View>
        {item.notes && (
          <Text className="text-gray-700 mt-1">{item.notes}</Text>
        )}
        {item.user && (
          <Text className="text-xs text-gray-500 mt-1">
            By {item.user.name || item.user.email || 'Unknown user'}
          </Text>
        )}
      </View>
    ));
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "new":
        return "bg-blue-500";
      case "assigned":
        return "bg-purple-500";
      case "in-progress":
        return "bg-yellow-500";
      case "resolved":
        return "bg-green-500";
      default:
        return "bg-gray-500";
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "new":
        return "Created";
      case "assigned":
        return "Assigned";
      case "in-progress":
        return "In Progress";
      case "resolved":
        return "Resolved";
      default:
        return status.charAt(0).toUpperCase() + status.slice(1);
    }
  };

  const handleAddComment = async () => {
    if (!newComment.trim() || !user) return;

    try {
      setSendingComment(true);
      const now = new Date().toISOString();

      const { data, error } = await supabase
        .from("ticket_comments")
        .insert({
          ticket_id: id,
          user_id: user.id,
          comment: newComment.trim(),
          created_at: now,
        })
        .select();

      if (error) throw error;

      if (data) {
        // Add the new comment to the list
        const newCommentWithUser = {
          ...data[0],
          users: {
            name: user.email,
            email: user.email
          }
        };

        setTicketComments([...ticketComments, newCommentWithUser]);
        setNewComment("");

        // Create notification for assignee if the comment is not from them
        if (ticket.assignee_id && ticket.assignee_id !== user.id) {
          await supabase.from("notifications").insert([
            {
              user_id: ticket.assignee_id,
              title: "New Comment on Ticket",
              message: `New comment on ticket #${id.slice(0, 8)}: "${newComment.slice(0, 50)}${newComment.length > 50 ? '...' : ''}"`,
              type: "info",
              related_id: id,
              related_type: "ticket",
              is_read: false,
              created_at: now,
            },
          ]);
        }
      }
    } catch (error) {
      console.error("Error adding comment:", error);
      Alert.alert("Error", "Failed to add comment");
    } finally {
      setSendingComment(false);
    }
  };

  const renderTicketComments = () => {
    if (loadingComments) {
      return (
        <View className="py-4 items-center">
          <ActivityIndicator size="small" color="#1e40af" />
          <Text className="text-gray-500 mt-2">Loading comments...</Text>
        </View>
      );
    }

    if (ticketComments.length === 0) {
      return (
        <View className="py-4 items-center">
          <Text className="text-gray-500">No comments yet</Text>
        </View>
      );
    }

    return (
      <View>
        {ticketComments.map((comment) => (
          <View
            key={comment.id}
            className={`p-4 mb-3 rounded-lg ${
              comment.user_id === user?.id
                ? "bg-blue-50 ml-10"
                : "bg-gray-50 mr-10"
            }`}
          >
            <View className="flex-row justify-between items-start">
              <Text className="font-medium">
                {comment.users?.name || comment.users?.email || "Unknown user"}
              </Text>
              <Text className="text-xs text-gray-500">
                {formatDate(comment.created_at)}
              </Text>
            </View>
            <Text className="mt-2">{comment.comment}</Text>
          </View>
        ))}
      </View>
    );
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
        {/* Ticket Information */}
        <View className="bg-white rounded-xl p-4 mb-4 shadow-sm border border-gray-100">
          <Text className="text-lg font-bold text-gray-800 mb-4">Ticket Information</Text>

          {/* Creator Information */}
          {ticket.created_by_user && (
            <View className="flex-row items-center mb-3 pb-3 border-b border-gray-100">
              <View className="bg-blue-100 p-2 rounded-full mr-3">
                <User size={16} color="#3B82F6" />
              </View>
              <View className="flex-1">
                <Text className="text-gray-600 text-sm">Created by</Text>
                <Text className="text-gray-800 font-medium">
                  {ticket.created_by_user.name || ticket.created_by_user.email}
                </Text>
              </View>
              <Text className="text-gray-500 text-xs">
                {formatDistanceToNow(new Date(ticket.created_at), { addSuffix: true })}
              </Text>
            </View>
          )}

          {/* Assignee Information */}
          {ticket.assigned_to_user ? (
            <View className="flex-row items-center mb-3">
              <View className="bg-green-100 p-2 rounded-full mr-3">
                <UserCheck size={16} color="#10B981" />
              </View>
              <View className="flex-1">
                <Text className="text-gray-600 text-sm">Assigned to</Text>
                <Text className="text-gray-800 font-medium">
                  {ticket.assigned_to_user.name || ticket.assigned_to_user.email}
                </Text>
              </View>
            </View>
          ) : (
            <View className="flex-row items-center mb-3">
              <View className="bg-gray-100 p-2 rounded-full mr-3">
                <UserX size={16} color="#6B7280" />
              </View>
              <View className="flex-1">
                <Text className="text-gray-600 text-sm">Assignment status</Text>
                <Text className="text-gray-500 font-medium">Unassigned</Text>
              </View>
            </View>
          )}
        </View>

        {/* Diagnostic Information */}
        <View className="bg-white rounded-xl p-4 mb-4 shadow-sm border border-gray-100">
          <View className="flex-row items-center mb-3">
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
                  {ticket.devices.type} • {ticket.devices.model || "Unknown model"}
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
                  onPress={() => {
                    setSelectedImageIndex(index);
                    setShowGallery(true);
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  }}
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



        {/* Comments Section */}
        <View className="mt-4 bg-white rounded-lg">
          <View className="flex-row items-center p-3 bg-gray-50 rounded-t-lg">
            <MessageSquare size={18} color="#1e40af" />
            <Text className="ml-2 text-gray-800 font-bold">Comments</Text>
          </View>

          <View className="p-3 bg-white rounded-b-lg">
            {renderTicketComments()}

            <View className="flex-row items-center mt-4 border border-gray-200 rounded-lg">
              <TextInput
                className="flex-1 p-3"
                placeholder="Add a comment..."
                value={newComment}
                onChangeText={setNewComment}
                multiline
                style={{ maxHeight: 100 }}
              />
              <TouchableOpacity
                className={`p-3 ${newComment.trim() ? "opacity-100" : "opacity-50"}`}
                onPress={handleAddComment}
                disabled={!newComment.trim() || sendingComment}
              >
                {sendingComment ? (
                  <ActivityIndicator size="small" color="#1e40af" />
                ) : (
                  <Send size={20} color="#1e40af" />
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Ticket History Section */}
        <View className="mt-4 bg-white rounded-lg">
          <TouchableOpacity
            className="flex-row justify-between items-center p-3 bg-gray-50 rounded-lg"
            onPress={() => setShowHistory(!showHistory)}
          >
            <View className="flex-row items-center">
              <History size={18} color="#1e40af" />
              <Text className="ml-2 text-gray-800 font-bold">Ticket History</Text>
            </View>
            <Text className="text-blue-600">{showHistory ? 'Hide' : 'Show'}</Text>
          </TouchableOpacity>

          {showHistory && (
            <View className="bg-white rounded-lg mt-2 border border-gray-100">
              {renderTicketHistory()}
            </View>
          )}
        </View>
      </ScrollView>

      {/* Replace old image preview modal with ImageGallery */}
      {ticket.photos && ticket.photos.length > 0 && (
        <ImageGallery
          images={ticket.photos}
          visible={showGallery}
          initialIndex={selectedImageIndex}
          onClose={() => setShowGallery(false)}
        />
      )}


    </SafeAreaView>
  );
}
