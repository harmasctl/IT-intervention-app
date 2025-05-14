import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  FlatList,
  ActivityIndicator,
  Modal,
  Alert,
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
  ArrowDownUp,
  Camera,
} from "lucide-react-native";
import { supabase } from "../../lib/supabase";
import AddEquipmentForm from "../../components/AddEquipmentForm";
import EquipmentMovementForm from "../../components/EquipmentMovementForm";
import BarcodeScanner from "../../components/BarcodeScanner";
import EquipmentTabs from "../../components/EquipmentTabs";

type EquipmentItem = {
  id: string;
  name: string;
  type: string;
  stock_level: number;
  supplier: string | null;
  warehouse_location: string | null;
  notes?: string | null;
  image_url?: string | null;
  created_at?: string;
  updated_at?: string;
};

export default function EquipmentInventoryScreen() {
  const router = useRouter();
  const [equipment, setEquipment] = useState<EquipmentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedType, setSelectedType] = useState("All");
  const [showAddEquipmentForm, setShowAddEquipmentForm] = useState(false);
  const [showMovementForm, setShowMovementForm] = useState(false);
  const [showBarcodeScanner, setShowBarcodeScanner] = useState(false);
  const [scanMode, setScanMode] = useState<"equipment" | "stock">("equipment");
  const [selectedEquipment, setSelectedEquipment] =
    useState<EquipmentItem | null>(null);

  const equipmentTypes = [
    "All",
    "Spare Parts",
    "Tools",
    "Cleaning Supplies",
    "Electronics",
    "Other",
  ];

  React.useEffect(() => {
    fetchEquipment();
  }, []);

  const fetchEquipment = async () => {
    try {
      setLoading(true);

      const { data, error } = await supabase
        .from("equipment")
        .select("*")
        .order("name");

      if (error) throw error;

      if (data && data.length > 0) {
        setEquipment(data as EquipmentItem[]);
      } else {
        setEquipment([]);
      }
    } catch (error) {
      console.error("Error fetching equipment:", error);
      Alert.alert("Error", "Failed to load equipment inventory");
      setEquipment([]);
    } finally {
      setLoading(false);
    }
  };

  const handleAddEquipment = () => {
    setShowAddEquipmentForm(true);
  };

  const handleScanBarcode = (mode: "equipment" | "stock") => {
    setScanMode(mode);
    setShowBarcodeScanner(true);
  };

  const handleBarcodeScan = async (data: string) => {
    setShowBarcodeScanner(false);

    try {
      // For demo purposes, we'll simulate finding the item by ID or creating a mock item
      // In a real app, this would query Supabase

      // Try to find the item in our local state first (for demo)
      const foundItem = equipment.find((item) => item.id === data);

      if (foundItem) {
        setSelectedEquipment(foundItem);
        setShowMovementForm(true);
        return;
      }

      // If not found locally, try Supabase
      const { data: equipmentData, error } = await supabase
        .from("equipment")
        .select("*")
        .eq("id", data)
        .single();

      if (error) {
        // If not found in database, offer to create new
        if (scanMode === "equipment") {
          Alert.alert(
            "Equipment Not Found",
            "No equipment found with this barcode. Would you like to add it?",
            [
              { text: "Cancel", style: "cancel" },
              { text: "Add New", onPress: handleAddEquipment },
            ],
          );
        } else {
          // For stock scanning mode
          Alert.alert(
            "Stock Item Not Found",
            "No stock item found with this barcode.",
            [{ text: "OK" }],
          );
        }
        return;
      }

      // If found in database
      if (equipmentData) {
        setSelectedEquipment(equipmentData as EquipmentItem);
        setShowMovementForm(true);
      }
    } catch (error) {
      console.error("Error scanning barcode:", error);
      Alert.alert("Error", "Failed to process barcode scan");
    }
  };

  const handleEquipmentPress = (equipmentId: string) => {
    const selected = equipment.find((item) => item.id === equipmentId);
    if (selected) {
      setSelectedEquipment(selected);
      setShowMovementForm(true);
    }
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
      className="bg-white rounded-xl p-5 mb-4 shadow-md mx-1"
      onPress={() => handleEquipmentPress(item.id)}
      style={{ elevation: 2 }}
      activeOpacity={0.7}
    >
      <View className="flex-row justify-between items-start">
        <View className="flex-1">
          <Text className="font-bold text-lg text-gray-800">{item.name}</Text>
          <View className="bg-blue-100 self-start px-3 py-1 rounded-full mt-1 mb-2">
            <Text className="text-blue-800 text-xs font-medium">
              {item.type}
            </Text>
          </View>

          <View className="flex-row items-center mt-2 bg-gray-50 p-2 rounded-lg">
            <Text className="text-gray-500 font-medium">Location: </Text>
            <Text className="text-gray-800 font-medium">
              {item.warehouse_location || "Not specified"}
            </Text>
          </View>

          <Text className="text-gray-500 text-sm mt-3">
            Supplier:{" "}
            <Text className="font-medium text-gray-700">
              {item.supplier || "Not specified"}
            </Text>
          </Text>
        </View>

        <View className="items-end">
          <View
            className={`px-4 py-3 rounded-xl ${item.stock_level <= 3 ? "bg-red-100" : item.stock_level <= 10 ? "bg-amber-100" : "bg-green-100"}`}
          >
            <Text
              className={`font-bold text-base ${getStockLevelColor(item.stock_level)}`}
            >
              {item.stock_level} in stock
            </Text>
          </View>
          <TouchableOpacity
            className="flex-row items-center mt-3 bg-gray-100 px-3 py-2 rounded-lg"
            onPress={() => handleEquipmentPress(item.id)}
          >
            <ArrowDownUp size={14} color="#4b5563" />
            <Text className="text-gray-700 text-xs font-medium ml-1">
              Manage Stock
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView className="flex-1 bg-white">
      <StatusBar style="auto" />

      {showAddEquipmentForm ? (
        <AddEquipmentForm
          onCancel={() => setShowAddEquipmentForm(false)}
          onSuccess={() => {
            setShowAddEquipmentForm(false);
            // In a real app, you would refresh the equipment list here
            fetchEquipment();
          }}
        />
      ) : showMovementForm && selectedEquipment ? (
        <EquipmentMovementForm
          equipment={selectedEquipment}
          onCancel={() => {
            setShowMovementForm(false);
            setSelectedEquipment(null);
          }}
          onSuccess={() => {
            setShowMovementForm(false);
            setSelectedEquipment(null);
            // In a real app, you would refresh the equipment list here
            fetchEquipment();
          }}
        />
      ) : (
        <>
          {/* Header */}
          <View className="flex-row justify-between items-center px-5 py-4 bg-gradient-to-r from-blue-700 to-blue-900 shadow-lg">
            <Text className="text-2xl font-bold text-white">
              Warehouse Stock
            </Text>
            <View className="flex-row">
              <TouchableOpacity
                className="bg-green-500 p-2.5 rounded-full mr-3 shadow-md"
                onPress={() => handleScanBarcode("equipment")}
              >
                <Camera size={22} color="white" />
              </TouchableOpacity>
              <TouchableOpacity
                className="bg-blue-500 p-2.5 rounded-full shadow-md"
                onPress={handleAddEquipment}
              >
                <Plus size={22} color="white" />
              </TouchableOpacity>
            </View>
          </View>

          <View className="flex-1 bg-gray-100">
            {/* Search and Filter */}
            <View className="p-4 bg-white shadow-sm">
              <View className="flex-row items-center bg-gray-100 rounded-xl px-4 py-3 mb-4">
                <Search size={20} color="#4b5563" />
                <TextInput
                  className="flex-1 ml-3 py-1 text-base"
                  placeholder="Search stock items..."
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                  placeholderTextColor="#9ca3af"
                />
              </View>

              <View className="mb-2">
                <Text className="text-gray-700 mb-3 font-medium">
                  Filter by type:
                </Text>
                <FlatList
                  horizontal
                  data={equipmentTypes}
                  renderItem={({ item }) => (
                    <TouchableOpacity
                      className={`px-5 py-2.5 mr-3 rounded-full shadow-sm ${selectedType === item ? "bg-blue-600" : "bg-white"}`}
                      onPress={() => setSelectedType(item)}
                      style={{ elevation: selectedType === item ? 3 : 1 }}
                    >
                      <Text
                        className={
                          selectedType === item
                            ? "text-white font-medium"
                            : "text-gray-700"
                        }
                      >
                        {item}
                      </Text>
                    </TouchableOpacity>
                  )}
                  keyExtractor={(item) => item}
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={{ paddingBottom: 8 }}
                />
              </View>
            </View>

            {/* Equipment list */}
            <View className="flex-1 px-4">
              {loading ? (
                <View className="flex-1 justify-center items-center">
                  <ActivityIndicator size="large" color="#1e40af" />
                  <Text className="mt-2 text-gray-600">
                    Loading stock items...
                  </Text>
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
                    No stock items found
                  </Text>
                  <TouchableOpacity
                    className="mt-4 bg-blue-600 px-4 py-2 rounded-lg"
                    onPress={handleAddEquipment}
                  >
                    <Text className="text-white font-medium">
                      Add Stock Item
                    </Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          </View>

          {/* Bottom Tabs */}
          <EquipmentTabs activeTab="inventory" />
        </>
      )}

      {/* Barcode Scanner Modal */}
      <Modal
        visible={showBarcodeScanner}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setShowBarcodeScanner(false)}
      >
        <View style={{ flex: 1 }}>
          <BarcodeScanner
            onScan={handleBarcodeScan}
            onClose={() => setShowBarcodeScanner(false)}
            mode={scanMode}
          />
        </View>
      </Modal>
    </SafeAreaView>
  );
}
