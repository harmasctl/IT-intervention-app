import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  FlatList,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { useRouter } from "expo-router";
import {
  Plus,
  Search,
  Filter,
  Package,
  ChevronRight,
} from "lucide-react-native";
import { supabase } from "../../lib/supabase";

type EquipmentItem = {
  id: string;
  name: string;
  type: string;
  stock_level: number;
  supplier: string | null;
  warehouse_location: string | null;
};

export default function EquipmentInventoryScreen() {
  const router = useRouter();
  const [equipment, setEquipment] = useState<EquipmentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedType, setSelectedType] = useState("All");

  const equipmentTypes = [
    "All",
    "Spare Parts",
    "Tools",
    "Cleaning Supplies",
    "Electronics",
  ];

  useEffect(() => {
    fetchEquipment();
  }, []);

  const fetchEquipment = async () => {
    try {
      setLoading(true);

      // In a real app, this would fetch from Supabase
      // For now, using mock data
      const mockEquipment: EquipmentItem[] = [
        {
          id: "1",
          name: "Ice Machine Compressor",
          type: "Spare Parts",
          stock_level: 5,
          supplier: "CoolTech Supplies",
          warehouse_location: "A-12-B",
        },
        {
          id: "2",
          name: "Digital Thermometer",
          type: "Tools",
          stock_level: 12,
          supplier: "Tech Instruments Inc.",
          warehouse_location: "B-03-C",
        },
        {
          id: "3",
          name: "Refrigerator Coil Cleaner",
          type: "Cleaning Supplies",
          stock_level: 24,
          supplier: "CleanPro Solutions",
          warehouse_location: "C-05-A",
        },
        {
          id: "4",
          name: "POS Terminal Battery",
          type: "Electronics",
          stock_level: 8,
          supplier: "ElectroParts Ltd.",
          warehouse_location: "D-01-B",
        },
        {
          id: "5",
          name: "Fryer Heating Element",
          type: "Spare Parts",
          stock_level: 3,
          supplier: "Kitchen Equipment Co.",
          warehouse_location: "A-08-D",
        },
      ];

      setEquipment(mockEquipment);
    } catch (error) {
      console.error("Error fetching equipment:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddEquipment = () => {
    // Navigate to add equipment screen
    console.log("Add new equipment");
  };

  const handleEquipmentPress = (equipmentId: string) => {
    // Navigate to equipment detail
    console.log("View equipment:", equipmentId);
  };

  const filteredEquipment = equipment.filter((item) => {
    const matchesSearch =
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (item.supplier &&
        item.supplier.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesType = selectedType === "All" || item.type === selectedType;
    return matchesSearch && matchesType;
  });

  const getStockLevelColor = (level: number) => {
    if (level <= 3) return "text-red-600";
    if (level <= 10) return "text-yellow-600";
    return "text-green-600";
  };

  const renderEquipmentItem = ({ item }: { item: EquipmentItem }) => (
    <TouchableOpacity
      className="bg-white rounded-lg p-4 mb-3 shadow-sm border border-gray-100"
      onPress={() => handleEquipmentPress(item.id)}
    >
      <View className="flex-row justify-between items-start">
        <View className="flex-1">
          <Text className="font-bold text-lg text-gray-800">{item.name}</Text>
          <Text className="text-gray-600 mb-1">{item.type}</Text>

          <View className="flex-row items-center mt-2">
            <Text className="text-gray-700">Location: </Text>
            <Text className="font-medium">
              {item.warehouse_location || "Not specified"}
            </Text>
          </View>

          <Text className="text-gray-500 text-sm mt-1">
            Supplier: {item.supplier || "Not specified"}
          </Text>
        </View>

        <View className="items-end">
          <View className="bg-gray-100 px-3 py-2 rounded-lg">
            <Text
              className={`font-bold ${getStockLevelColor(item.stock_level)}`}
            >
              {item.stock_level} in stock
            </Text>
          </View>
          <ChevronRight size={16} color="#9ca3af" className="mt-4" />
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView className="flex-1 bg-white">
      <StatusBar style="auto" />

      {/* Header */}
      <View className="flex-row justify-between items-center px-4 py-3 border-b border-gray-200">
        <Text className="text-2xl font-bold text-blue-800">Equipment</Text>
        <TouchableOpacity
          className="bg-blue-600 p-2 rounded-full"
          onPress={handleAddEquipment}
        >
          <Plus size={24} color="white" />
        </TouchableOpacity>
      </View>

      <View className="flex-1 bg-gray-50">
        {/* Search and Filter */}
        <View className="p-4">
          <View className="flex-row items-center bg-white rounded-lg px-3 py-2 mb-3 border border-gray-200">
            <Search size={20} color="#6b7280" />
            <TextInput
              className="flex-1 ml-2 py-1"
              placeholder="Search equipment by name or supplier"
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
          </View>

          <View className="mb-2">
            <Text className="text-gray-700 mb-2 font-medium">
              Filter by type:
            </Text>
            <FlatList
              horizontal
              data={equipmentTypes}
              renderItem={({ item }) => (
                <TouchableOpacity
                  className={`px-4 py-2 mr-2 rounded-full ${selectedType === item ? "bg-blue-500" : "bg-white border border-gray-300"}`}
                  onPress={() => setSelectedType(item)}
                >
                  <Text
                    className={
                      selectedType === item ? "text-white" : "text-gray-700"
                    }
                  >
                    {item}
                  </Text>
                </TouchableOpacity>
              )}
              keyExtractor={(item) => item}
              showsHorizontalScrollIndicator={false}
            />
          </View>
        </View>

        {/* Equipment list */}
        <View className="flex-1 px-4">
          {loading ? (
            <View className="flex-1 justify-center items-center">
              <ActivityIndicator size="large" color="#1e40af" />
              <Text className="mt-2 text-gray-600">Loading equipment...</Text>
            </View>
          ) : filteredEquipment.length > 0 ? (
            <FlatList
              data={filteredEquipment}
              renderItem={renderEquipmentItem}
              keyExtractor={(item) => item.id}
              showsVerticalScrollIndicator={false}
            />
          ) : (
            <View className="flex-1 justify-center items-center">
              <Package size={48} color="#9ca3af" />
              <Text className="mt-4 text-gray-500 text-center">
                No equipment found
              </Text>
              <TouchableOpacity
                className="mt-4 bg-blue-600 px-4 py-2 rounded-lg"
                onPress={handleAddEquipment}
              >
                <Text className="text-white font-medium">Add Equipment</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>
    </SafeAreaView>
  );
}
