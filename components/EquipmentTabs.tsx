import React from "react";
import { View, Text, TouchableOpacity, ScrollView } from "react-native";
import { useRouter } from "expo-router";
import { Package, History, Building2, BarChart3, AlertTriangle, Warehouse, Tag, ArrowUpDown, Truck, Zap } from "lucide-react-native";

type Tab = "inventory" | "history" | "suppliers" | "reports" | "low-stock" | "warehouses" | "types" | "bulk-movement" | "transfer" | "advanced";

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
      id: "bulk-movement" as Tab,
      label: "Bulk Move",
      icon: ArrowUpDown,
      route: "/equipment/bulk-movement",
    },
    {
      id: "transfer" as Tab,
      label: "Transfer",
      icon: Truck,
      route: "/equipment/transfer",
    },
    {
      id: "advanced" as Tab,
      label: "Advanced",
      icon: Zap,
      route: "/equipment/advanced",
    },
    {
      id: "suppliers" as Tab,
      label: "Suppliers",
      icon: Building2,
      route: "/equipment/suppliers",
    },
    {
      id: "reports" as Tab,
      label: "Reports",
      icon: BarChart3,
      route: "/equipment/reports",
    },
    {
      id: "low-stock" as Tab,
      label: "Low Stock",
      icon: AlertTriangle,
      route: "/equipment/low-stock",
    },
    {
      id: "warehouses" as Tab,
      label: "Warehouses",
      icon: Warehouse,
      route: "/equipment/warehouses",
    },
    {
      id: "types" as Tab,
      label: "Types",
      icon: Tag,
      route: "/equipment/types",
    },
  ];

  return (
    <View className="bg-white border-t border-gray-200 shadow-md">
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 8 }}
      >
        <View className="flex-row">
          {tabs.map((tab) => (
            <TouchableOpacity
              key={tab.id}
              className={`py-4 px-3 items-center min-w-[70px] ${activeTab === tab.id ? "border-b-3 border-blue-600 bg-blue-50" : ""}`}
              onPress={() => router.push(tab.route)}
            >
              <View
                className={`p-2 rounded-full ${activeTab === tab.id ? "bg-blue-100" : ""}`}
              >
                <tab.icon
                  size={18}
                  color={activeTab === tab.id ? "#2563eb" : "#6b7280"}
                />
              </View>
              <Text
                className={`text-xs mt-1 text-center ${activeTab === tab.id ? "text-blue-600 font-medium" : "text-gray-500"}`}
              >
                {tab.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </View>
  );
};

export default EquipmentTabs;
