import React from "react";
import { View, Text, ActivityIndicator } from "react-native";
import { Loader2 } from "lucide-react-native";

interface ModernLoaderProps {
  message?: string;
  size?: "small" | "large";
  color?: string;
  fullScreen?: boolean;
}

export default function ModernLoader({ 
  message = "Loading...", 
  size = "large",
  color = "#6366f1",
  fullScreen = false 
}: ModernLoaderProps) {
  const containerClass = fullScreen 
    ? "flex-1 justify-center items-center bg-gradient-to-br from-gray-50 to-white"
    : "justify-center items-center py-8";

  return (
    <View className={containerClass}>
      {/* Animated Loading Spinner */}
      <View className="relative">
        <View className="bg-white rounded-3xl p-8 shadow-2xl border border-gray-100">
          <View className="items-center">
            {/* Primary Spinner */}
            <View className="relative mb-6">
              <ActivityIndicator 
                size={size} 
                color={color}
                className="transform scale-150"
              />
              {/* Outer Ring */}
              <View className="absolute inset-0 border-4 border-gray-200 rounded-full animate-pulse" />
              {/* Inner Glow */}
              <View 
                className="absolute inset-2 rounded-full opacity-20"
                style={{ backgroundColor: color }}
              />
            </View>

            {/* Loading Text */}
            <Text className="text-xl font-bold text-gray-800 mb-2">
              {message}
            </Text>
            <Text className="text-gray-500 text-center">
              Please wait while we process your request
            </Text>

            {/* Progress Dots */}
            <View className="flex-row mt-6 space-x-2">
              <View 
                className="w-2 h-2 rounded-full animate-pulse"
                style={{ backgroundColor: color }}
              />
              <View 
                className="w-2 h-2 rounded-full animate-pulse"
                style={{ backgroundColor: color, animationDelay: '0.2s' }}
              />
              <View 
                className="w-2 h-2 rounded-full animate-pulse"
                style={{ backgroundColor: color, animationDelay: '0.4s' }}
              />
            </View>
          </View>
        </View>

        {/* Background Glow Effect */}
        <View 
          className="absolute inset-0 rounded-3xl opacity-10 blur-xl"
          style={{ backgroundColor: color }}
        />
      </View>
    </View>
  );
}

// Compact version for inline loading
export function CompactLoader({ 
  message = "Loading...", 
  color = "#6366f1" 
}: { message?: string; color?: string }) {
  return (
    <View className="flex-row items-center justify-center py-4">
      <ActivityIndicator size="small" color={color} />
      <Text className="text-gray-600 ml-3 font-medium">{message}</Text>
    </View>
  );
}

// Skeleton loader for content
export function SkeletonLoader() {
  return (
    <View className="bg-white rounded-2xl p-6 mb-4 shadow-sm border border-gray-100">
      {/* Header skeleton */}
      <View className="flex-row items-center mb-4">
        <View className="w-12 h-12 bg-gray-200 rounded-full animate-pulse" />
        <View className="ml-3 flex-1">
          <View className="w-3/4 h-4 bg-gray-200 rounded animate-pulse mb-2" />
          <View className="w-1/2 h-3 bg-gray-200 rounded animate-pulse" />
        </View>
      </View>

      {/* Content skeleton */}
      <View className="space-y-2">
        <View className="w-full h-3 bg-gray-200 rounded animate-pulse" />
        <View className="w-5/6 h-3 bg-gray-200 rounded animate-pulse" />
        <View className="w-4/6 h-3 bg-gray-200 rounded animate-pulse" />
      </View>

      {/* Footer skeleton */}
      <View className="flex-row justify-between items-center mt-4">
        <View className="w-20 h-6 bg-gray-200 rounded-full animate-pulse" />
        <View className="w-16 h-6 bg-gray-200 rounded-full animate-pulse" />
      </View>
    </View>
  );
}

// Card skeleton for grid layouts
export function CardSkeleton() {
  return (
    <View className="bg-white rounded-2xl p-5 w-[48%] mb-4 shadow-sm border border-gray-100">
      <View className="items-center">
        <View className="w-16 h-16 bg-gray-200 rounded-2xl animate-pulse mb-4" />
        <View className="w-3/4 h-4 bg-gray-200 rounded animate-pulse mb-2" />
        <View className="w-1/2 h-3 bg-gray-200 rounded animate-pulse" />
      </View>
    </View>
  );
}
