import React from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { Bell } from "lucide-react-native";
import { useRouter } from "expo-router";
import { useNotifications } from "../app/_layout";

type NotificationBadgeProps = {
  size?: number;
  color?: string;
};

export default function NotificationBadge({
  size = 24,
  color = "#4b5563",
}: NotificationBadgeProps) {
  const router = useRouter();
  const { unreadCount } = useNotifications();

  return (
    <TouchableOpacity
      onPress={() => router.push("/notifications")}
      className="relative"
    >
      <Bell size={size} color={color} />
      {unreadCount > 0 && (
        <View className="absolute -top-2 -right-2 bg-gradient-to-r from-red-500 to-pink-600 rounded-full min-w-[20px] h-5 items-center justify-center px-1 shadow-lg border-2 border-white">
          <Text className="text-white text-xs font-bold">
            {unreadCount > 99 ? "99+" : unreadCount}
          </Text>
        </View>
      )}
      {unreadCount > 0 && (
        <View className="absolute -top-1 -right-1 w-3 h-3 bg-red-400 rounded-full animate-pulse opacity-75" />
      )}
    </TouchableOpacity>
  );
}
