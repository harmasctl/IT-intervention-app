import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  TextInput,
  Alert,
  Modal,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { useRouter } from "expo-router";
import {
  ArrowLeft,
  Plus,
  Edit,
  Trash2,
  X,
  Search,
  Warehouse,
  MapPin,
} from "lucide-react-native";
import { supabase } from "../../lib/supabase";
import EquipmentTabs from "../../components/EquipmentTabs";

type Warehouse = {
  id: string;
  name: string;
  location?: string;
  description?: string;
  created_at: string;
};

export default function WarehousesScreen() {
  const router = useRouter();
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [filteredWarehouses, setFilteredWarehouses] = useState<Warehouse[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [currentWarehouse, setCurrentWarehouse] = useState<Warehouse | null>(
    null,
  );
  const [newWarehouse, setNewWarehouse] = useState({
    name: "",
    location: "",
    description: "",
  });

  useEffect(() => {
    fetchWarehouses();

    // Set up real-time subscription for warehouse changes
    const warehouseSubscription = supabase
      .channel("warehouse-changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "warehouses" },
        (payload) => {
          console.log("Warehouse change received:", payload);
          fetchWarehouses();
        },
      )
      .subscribe();

    return () => {
      warehouseSubscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    filterWarehouses();
  }, [searchQuery, warehouses]);

  const fetchWarehouses = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("warehouses")
        .select("*")
        .order("name");

      if (error) throw error;

      if (data) {
        setWarehouses(data);
        setFilteredWarehouses(data);
      }
    } catch (error) {
      console.error("Error fetching warehouses:", error);
      Alert.alert("Error", "Failed to load warehouses");
    } finally {
      setLoading(false);
    }
  };

  const filterWarehouses = () => {
    if (!searchQuery) {
      setFilteredWarehouses(warehouses);
      return;
    }

    const query = searchQuery.toLowerCase();
    const filtered = warehouses.filter(
      (warehouse) =>
        warehouse.name.toLowerCase().includes(query) ||
        warehouse.location?.toLowerCase().includes(query) ||
        warehouse.description?.toLowerCase().includes(query),
    );

    setFilteredWarehouses(filtered);
  };

  const handleAddWarehouse = async () => {
    if (!newWarehouse.name) {
      Alert.alert("Error", "Warehouse name is required");
      return;
    }

    try {
      const { data, error } = await supabase
        .from("warehouses")
        .insert([
          {
            name: newWarehouse.name,
            location: newWarehouse.location || null,
            description: newWarehouse.description || null,
          },
        ])
        .select();

      if (error) throw error;

      Alert.alert("Success", "Warehouse added successfully");
      setShowAddModal(false);
      setNewWarehouse({
        name: "",
        location: "",
        description: "",
      });
      fetchWarehouses();
    } catch (error) {
      console.error("Error adding warehouse:", error);
      Alert.alert("Error", "Failed to add warehouse");
    }
  };

  const handleEditWarehouse = async () => {
    if (!currentWarehouse) return;
    if (!currentWarehouse.name) {
      Alert.alert("Error", "Warehouse name is required");
      return;
    }

    try {
      const { error } = await supabase
        .from("warehouses")
        .update({
          name: currentWarehouse.name,
          location: currentWarehouse.location || null,
          description: currentWarehouse.description || null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", currentWarehouse.id);

      if (error) throw error;

      Alert.alert("Success", "Warehouse updated successfully");
      setShowEditModal(false);
      setCurrentWarehouse(null);
      fetchWarehouses();
    } catch (error) {
      console.error("Error updating warehouse:", error);
      Alert.alert("Error", "Failed to update warehouse");
    }
  };

  const handleDeleteWarehouse = async (warehouseId: string) => {
    Alert.alert(
      "Confirm Delete",
      "Are you sure you want to delete this warehouse? This will affect all inventory in this warehouse.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              const { error } = await supabase
                .from("warehouses")
                .delete()
                .eq("id", warehouseId);

              if (error) throw error;

              Alert.alert("Success", "Warehouse deleted successfully");
              fetchWarehouses();
            } catch (error) {
              console.error("Error deleting warehouse:", error);
              Alert.alert("Error", "Failed to delete warehouse");
            }
          },
        },
      ],
    );
  };

  const renderWarehouseItem = ({ item }: { item: Warehouse }) => (
    <View className="bg-white rounded-xl p-4 mb-4 shadow-sm">
      <View className="flex-row justify-between items-start">
        <View className="flex-row items-center">
          <View className="bg-blue-100 p-2 rounded-full mr-3">
            <Warehouse size={20} color="#1e40af" />
          </View>
          <View className="flex-1">
            <Text className="font-bold text-lg text-gray-800">{item.name}</Text>
            {item.location && (
              <View className="flex-row items-center mt-1">
                <MapPin size={14} color="#4b5563" />
                <Text className="text-gray-500 ml-1">{item.location}</Text>
              </View>
            )}
            {item.description && (
              <Text className="text-gray-500 mt-1">{item.description}</Text>
            )}
          </View>
        </View>
        <View className="flex-row">
          <TouchableOpacity
            className="mr-3"
            onPress={() => {
              setCurrentWarehouse(item);
              setShowEditModal(true);
            }}
          >
            <Edit size={20} color="#1e40af" />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => handleDeleteWarehouse(item.id)}>
            <Trash2 size={20} color="#ef4444" />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      <StatusBar style="auto" />

      {/* Header */}
      <View className="flex-row items-center px-5 py-4 bg-gradient-to-r from-blue-700 to-blue-900 shadow-lg">
        <TouchableOpacity onPress={() => router.back()} className="mr-4">
          <ArrowLeft size={24} color="white" />
        </TouchableOpacity>
        <Text className="text-2xl font-bold text-white flex-1">Warehouses</Text>
        <TouchableOpacity
          className="bg-green-600 p-2 rounded-full"
          onPress={() => setShowAddModal(true)}
        >
          <Plus size={22} color="white" />
        </TouchableOpacity>
      </View>

      {/* Search */}
      <View className="p-4 bg-white shadow-sm">
        <View className="flex-row items-center bg-gray-100 rounded-xl px-4 py-3">
          <Search size={20} color="#4b5563" />
          <TextInput
            className="flex-1 ml-3 py-1 text-base"
            placeholder="Search warehouses..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholderTextColor="#9ca3af"
          />
        </View>
      </View>

      {/* Warehouse List */}
      <View className="flex-1 px-4 pt-4">
        {loading ? (
          <View className="flex-1 justify-center items-center">
            <ActivityIndicator size="large" color="#1e40af" />
            <Text className="mt-2 text-gray-600">Loading warehouses...</Text>
          </View>
        ) : filteredWarehouses.length > 0 ? (
          <FlatList
            data={filteredWarehouses}
            renderItem={renderWarehouseItem}
            keyExtractor={(item) => item.id}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: 20 }}
            refreshing={loading}
            onRefresh={fetchWarehouses}
          />
        ) : (
          <View className="flex-1 justify-center items-center">
            <Warehouse size={48} color="#9ca3af" />
            <Text className="mt-4 text-gray-500 text-center">
              No warehouses found
            </Text>
            <TouchableOpacity
              className="mt-4 bg-blue-600 px-4 py-2 rounded-lg"
              onPress={() => setShowAddModal(true)}
            >
              <Text className="text-white font-medium">Add New Warehouse</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* Add Warehouse Modal */}
      <Modal
        visible={showAddModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowAddModal(false)}
      >
        <View className="flex-1 bg-black bg-opacity-50 justify-end">
          <View className="bg-white rounded-t-3xl p-6">
            <View className="flex-row justify-between items-center mb-6">
              <Text className="text-xl font-bold text-gray-800">
                Add New Warehouse
              </Text>
              <TouchableOpacity onPress={() => setShowAddModal(false)}>
                <X size={24} color="#4b5563" />
              </TouchableOpacity>
            </View>

            <View className="space-y-4">
              <View>
                <Text className="text-gray-700 mb-1 font-medium">Name *</Text>
                <TextInput
                  className="border border-gray-300 rounded-lg px-3 py-2"
                  placeholder="Enter warehouse name"
                  value={newWarehouse.name}
                  onChangeText={(text) =>
                    setNewWarehouse({ ...newWarehouse, name: text })
                  }
                />
              </View>

              <View>
                <Text className="text-gray-700 mb-1 font-medium">Location</Text>
                <TextInput
                  className="border border-gray-300 rounded-lg px-3 py-2"
                  placeholder="Enter warehouse location"
                  value={newWarehouse.location}
                  onChangeText={(text) =>
                    setNewWarehouse({ ...newWarehouse, location: text })
                  }
                />
              </View>

              <View>
                <Text className="text-gray-700 mb-1 font-medium">
                  Description
                </Text>
                <TextInput
                  className="border border-gray-300 rounded-lg px-3 py-2 h-24"
                  placeholder="Enter warehouse description"
                  value={newWarehouse.description}
                  onChangeText={(text) =>
                    setNewWarehouse({ ...newWarehouse, description: text })
                  }
                  multiline
                  textAlignVertical="top"
                />
              </View>

              <TouchableOpacity
                className="bg-blue-600 py-3 rounded-lg items-center mt-4"
                onPress={handleAddWarehouse}
              >
                <Text className="text-white font-bold text-lg">
                  Add Warehouse
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Edit Warehouse Modal */}
      <Modal
        visible={showEditModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowEditModal(false)}
      >
        <View className="flex-1 bg-black bg-opacity-50 justify-end">
          <View className="bg-white rounded-t-3xl p-6">
            <View className="flex-row justify-between items-center mb-6">
              <Text className="text-xl font-bold text-gray-800">
                Edit Warehouse
              </Text>
              <TouchableOpacity onPress={() => setShowEditModal(false)}>
                <X size={24} color="#4b5563" />
              </TouchableOpacity>
            </View>

            {currentWarehouse && (
              <View className="space-y-4">
                <View>
                  <Text className="text-gray-700 mb-1 font-medium">Name *</Text>
                  <TextInput
                    className="border border-gray-300 rounded-lg px-3 py-2"
                    placeholder="Enter warehouse name"
                    value={currentWarehouse.name}
                    onChangeText={(text) =>
                      setCurrentWarehouse({ ...currentWarehouse, name: text })
                    }
                  />
                </View>

                <View>
                  <Text className="text-gray-700 mb-1 font-medium">
                    Location
                  </Text>
                  <TextInput
                    className="border border-gray-300 rounded-lg px-3 py-2"
                    placeholder="Enter warehouse location"
                    value={currentWarehouse.location || ""}
                    onChangeText={(text) =>
                      setCurrentWarehouse({
                        ...currentWarehouse,
                        location: text,
                      })
                    }
                  />
                </View>

                <View>
                  <Text className="text-gray-700 mb-1 font-medium">
                    Description
                  </Text>
                  <TextInput
                    className="border border-gray-300 rounded-lg px-3 py-2 h-24"
                    placeholder="Enter warehouse description"
                    value={currentWarehouse.description || ""}
                    onChangeText={(text) =>
                      setCurrentWarehouse({
                        ...currentWarehouse,
                        description: text,
                      })
                    }
                    multiline
                    textAlignVertical="top"
                  />
                </View>

                <TouchableOpacity
                  className="bg-blue-600 py-3 rounded-lg items-center mt-4"
                  onPress={handleEditWarehouse}
                >
                  <Text className="text-white font-bold text-lg">
                    Update Warehouse
                  </Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>
      </Modal>

      {/* Bottom Tabs */}
      <EquipmentTabs activeTab="warehouses" />
    </SafeAreaView>
  );
}
