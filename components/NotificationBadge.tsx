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
        <View className="absolute -top-1 -right-1 bg-red-500 rounded-full min-w-[16px] h-4 items-center justify-center px-1">
          <Text className="text-white text-xs font-bold">
            {unreadCount > 9 ? "9+" : unreadCount}
          </Text>
        </View>
      )}
    </TouchableOpacity>
  );
}
