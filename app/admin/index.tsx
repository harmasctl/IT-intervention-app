import React from "react";
import { View, Text, TouchableOpacity, ScrollView, Image } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { useRouter } from "expo-router";
import {
  Building2,
  Laptop,
  Tags,
  Wrench,
  Users,
  Settings,
  ChevronRight,
  BarChart3,
  FileText,
  BookOpen,
  Calendar,
  ArrowLeft,
} from "lucide-react-native";
import { useAuth } from "../../components/AuthProvider";

export default function AdminPanel() {
  const router = useRouter();
  const { user } = useAuth();

  // Check if user is admin
  const isAdmin =
    user?.user_metadata?.role === "admin" ||
    user?.user_metadata?.role === "manager";

  const adminSections = [
    {
      title: "Restaurants",
      description: "Manage restaurant locations and details",
      icon: <Building2 size={24} color="#1e40af" />,
      route: "/restaurants",
      bgColor: "bg-blue-100",
    },
    {
      title: "Devices",
      description: "Manage device inventory and tracking",
      icon: <Laptop size={24} color="#15803d" />,
      route: "/devices",
      bgColor: "bg-green-100",
    },
    {
      title: "Device Categories",
      description: "Manage device categories and types",
      icon: <Tags size={24} color="#b45309" />,
      route: "/devices/categories",
      bgColor: "bg-amber-100",
    },
    {
      title: "Equipment",
      description: "Manage equipment inventory and stock",
      icon: <Wrench size={24} color="#6b21a8" />,
      route: "/equipment",
      bgColor: "bg-purple-100",
    },
    {
      title: "Users",
      description: "Manage technicians and staff accounts",
      icon: <Users size={24} color="#be123c" />,
      route: "/users",
      bgColor: "bg-pink-100",
    },
    {
      title: "Reports",
      description: "View analytics and generate reports",
      icon: <BarChart3 size={24} color="#0e7490" />,
      route: "/reports",
      bgColor: "bg-cyan-100",
    },
    {
      title: "Tickets",
      description: "Manage all support tickets",
      icon: <FileText size={24} color="#4338ca" />,
      route: "/tickets",
      bgColor: "bg-indigo-100",
    },
    {
      title: "Knowledge Base",
      description: "Manage articles and documentation",
      icon: <BookOpen size={24} color="#0f766e" />,
      route: "/knowledge",
      bgColor: "bg-teal-100",
    },
    {
      title: "Maintenance Schedule",
      description: "Manage preventive maintenance",
      icon: <Calendar size={24} color="#b91c1c" />,
      route: "/schedule",
      bgColor: "bg-red-100",
    },
    {
      title: "System Settings",
      description: "Configure application settings",
      icon: <Settings size={24} color="#525252" />,
      route: "/settings",
      bgColor: "bg-gray-100",
    },
  ];

  if (!isAdmin) {
    return (
      <SafeAreaView className="flex-1 bg-white">
        <StatusBar style="auto" />
        <View className="flex-1 justify-center items-center p-6">
          <Text className="text-xl font-bold text-red-600 mb-4">
            Access Denied
          </Text>
          <Text className="text-gray-600 text-center mb-6">
            You don't have permission to access the admin panel. Please contact
            your administrator.
          </Text>
          <TouchableOpacity
            className="bg-blue-600 py-3 px-6 rounded-lg"
            onPress={() => router.back()}
          >
            <Text className="text-white font-medium">Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      <StatusBar style="auto" />

      {/* Header */}
      <View className="flex-row justify-between items-center px-5 py-4 bg-white border-b border-gray-200">
        <View className="flex-row items-center">
          <TouchableOpacity onPress={() => router.back()} className="mr-3">
            <ArrowLeft size={24} color="#1e40af" />
          </TouchableOpacity>
          <Text className="text-2xl font-bold text-blue-800">Admin Panel</Text>
        </View>
      </View>

      <ScrollView className="flex-1 p-4">
        <Text className="text-lg font-semibold mb-4 text-gray-800">
          System Management
        </Text>

        {adminSections.map((section, index) => (
          <TouchableOpacity
            key={index}
            className="bg-white rounded-lg mb-4 p-4 shadow-sm border border-gray-100"
            onPress={() => router.push(section.route)}
          >
            <View className="flex-row items-center">
              <View className={`p-3 rounded-full mr-4 ${section.bgColor}`}>
                {section.icon}
              </View>
              <View className="flex-1">
                <Text className="text-lg font-medium text-gray-800">
                  {section.title}
                </Text>
                <Text className="text-gray-500">{section.description}</Text>
              </View>
              <ChevronRight size={20} color="#9ca3af" />
            </View>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}
