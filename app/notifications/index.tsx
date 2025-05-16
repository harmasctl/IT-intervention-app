import React, { useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { useRouter } from "expo-router";
import {
  ArrowLeft,
  Bell,
  CheckCircle,
  AlertTriangle,
  Info,
  Package,
  Clock,
} from "lucide-react-native";
import { useNotifications } from "../_layout";

export default function NotificationsScreen() {
  const router = useRouter();
  const {
    notifications,
    unreadCount,
    markAsRead,
    markAllAsRead,
    refreshNotifications,
  } = useNotifications();

  useEffect(() => {
    refreshNotifications();
  }, []);

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case "success":
        return <CheckCircle size={20} color="#22c55e" />;
      case "warning":
        return <AlertTriangle size={20} color="#f59e0b" />;
      case "error":
        return <AlertTriangle size={20} color="#ef4444" />;
      case "low_stock":
        return <Package size={20} color="#f59e0b" />;
      default:
        return <Info size={20} color="#3b82f6" />;
    }
  };

  const getNotificationTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.round(diffMs / 60000);
    const diffHours = Math.round(diffMs / 3600000);
    const diffDays = Math.round(diffMs / 86400000);

    if (diffMins < 60) {
      return `${diffMins} min${diffMins !== 1 ? "s" : ""} ago`;
    } else if (diffHours < 24) {
      return `${diffHours} hour${diffHours !== 1 ? "s" : ""} ago`;
    } else if (diffDays < 7) {
      return `${diffDays} day${diffDays !== 1 ? "s" : ""} ago`;
    } else {
      return date.toLocaleDateString();
    }
  };

  const handleNotificationPress = (notification: any) => {
    markAsRead(notification.id);

    // Navigate based on notification type
    if (notification.related_type === "equipment" && notification.related_id) {
      router.push(`/equipment?id=${notification.related_id}`);
    } else if (
      notification.related_type === "ticket" &&
      notification.related_id
    ) {
      router.push(`/tickets/${notification.related_id}`);
    }
  };

  const renderNotificationItem = ({ item }: { item: any }) => (
    <TouchableOpacity
      className={`p-4 border-b border-gray-100 ${!item.is_read ? "bg-blue-50" : ""}`}
      onPress={() => handleNotificationPress(item)}
    >
      <View className="flex-row">
        <View className="mr-3 mt-1">{getNotificationIcon(item.type)}</View>
        <View className="flex-1">
          <Text
            className={`font-bold ${!item.is_read ? "text-blue-800" : "text-gray-800"}`}
          >
            {item.title}
          </Text>
          <Text className="text-gray-600 mt-1">{item.message}</Text>
          <View className="flex-row items-center mt-2">
            <Clock size={12} color="#9ca3af" />
            <Text className="text-gray-400 text-xs ml-1">
              {getNotificationTime(item.created_at)}
            </Text>
          </View>
        </View>
        {!item.is_read && (
          <View className="w-3 h-3 rounded-full bg-blue-500 mt-2" />
        )}
      </View>
    </TouchableOpacity>
  );

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
        <Text className="text-xl font-bold text-blue-800">Notifications</Text>
        {unreadCount > 0 && (
          <TouchableOpacity onPress={markAllAsRead}>
            <Text className="text-blue-600 font-medium">Mark all read</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Notification List */}
      {notifications.length > 0 ? (
        <FlatList
          data={notifications}
          renderItem={renderNotificationItem}
          keyExtractor={(item) => item.id}
          onRefresh={refreshNotifications}
          refreshing={false}
        />
      ) : (
        <View className="flex-1 justify-center items-center p-4">
          <Bell size={48} color="#9ca3af" />
          <Text className="text-gray-500 text-lg mt-4 text-center">
            No notifications yet
          </Text>
          <Text className="text-gray-400 text-center mt-2">
            You'll see updates about your tickets, equipment, and more here
          </Text>
        </View>
      )}
    </SafeAreaView>
  );
}
