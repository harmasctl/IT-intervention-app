import React from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { useRouter } from "expo-router";
import { Package, History, Building2 } from "lucide-react-native";

type Tab = "inventory" | "history" | "suppliers";

interface EquipmentTabsProps {
  activeTab: Tab;
}

const EquipmentTabs = ({ activeTab }: EquipmentTabsProps) => {
  const router = useRouter();

  const tabs = [
    {
      id: "inventory" as Tab,
      label: "Stock",
      icon: Package,
      route: "/equipment",
    },
    {
      id: "history" as Tab,
      label: "Movements",
      icon: History,
      route: "/equipment/history",
    },
    {
      id: "suppliers" as Tab,
      label: "Suppliers",
      icon: Building2,
      route: "/equipment/suppliers",
    },
  ];

  return (
    <View className="flex-row bg-white border-t border-gray-200 shadow-md">
      {tabs.map((tab) => (
        <TouchableOpacity
          key={tab.id}
          className={`flex-1 py-4 items-center ${activeTab === tab.id ? "border-b-3 border-blue-600 bg-blue-50" : ""}`}
          onPress={() => router.push(tab.route)}
        >
          <View
            className={`p-2 rounded-full ${activeTab === tab.id ? "bg-blue-100" : ""}`}
          >
            <tab.icon
              size={20}
              color={activeTab === tab.id ? "#2563eb" : "#6b7280"}
            />
          </View>
          <Text
            className={`text-xs mt-1 ${activeTab === tab.id ? "text-blue-600 font-medium" : "text-gray-500"}`}
          >
            {tab.label}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );
};

export default EquipmentTabs;
