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
  Tag,
} from "lucide-react-native";
import { supabase } from "../../lib/supabase";
import EquipmentTabs from "../../components/EquipmentTabs";

type EquipmentType = {
  id: string;
  name: string;
  description?: string;
  created_at: string;
};

export default function EquipmentTypesScreen() {
  const router = useRouter();
  const [types, setTypes] = useState<EquipmentType[]>([]);
  const [filteredTypes, setFilteredTypes] = useState<EquipmentType[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [currentType, setCurrentType] = useState<EquipmentType | null>(null);
  const [newType, setNewType] = useState({
    name: "",
    description: "",
  });

  useEffect(() => {
    fetchTypes();

    // Set up real-time subscription for type changes
    const typeSubscription = supabase
      .channel("type-changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "equipment_types" },
        (payload) => {
          console.log("Equipment type change received:", payload);
          fetchTypes();
        },
      )
      .subscribe();

    return () => {
      typeSubscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    filterTypes();
  }, [searchQuery, types]);

  const fetchTypes = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("equipment_types")
        .select("*")
        .order("name");

      if (error) throw error;

      if (data) {
        setTypes(data);
        setFilteredTypes(data);
      }
    } catch (error) {
      console.error("Error fetching equipment types:", error);
      Alert.alert("Error", "Failed to load equipment types");
    } finally {
      setLoading(false);
    }
  };

  const filterTypes = () => {
    if (!searchQuery) {
      setFilteredTypes(types);
      return;
    }

    const query = searchQuery.toLowerCase();
    const filtered = types.filter(
      (type) =>
        type.name.toLowerCase().includes(query) ||
        type.description?.toLowerCase().includes(query),
    );

    setFilteredTypes(filtered);
  };

  const handleAddType = async () => {
    if (!newType.name) {
      Alert.alert("Error", "Type name is required");
      return;
    }

    try {
      const { data, error } = await supabase
        .from("equipment_types")
        .insert([
          {
            name: newType.name,
            description: newType.description || null,
          },
        ])
        .select();

      if (error) throw error;

      Alert.alert("Success", "Equipment type added successfully");
      setShowAddModal(false);
      setNewType({
        name: "",
        description: "",
      });
      fetchTypes();
    } catch (error) {
      console.error("Error adding equipment type:", error);
      Alert.alert("Error", "Failed to add equipment type");
    }
  };

  const handleEditType = async () => {
    if (!currentType) return;
    if (!currentType.name) {
      Alert.alert("Error", "Type name is required");
      return;
    }

    try {
      const { error } = await supabase
        .from("equipment_types")
        .update({
          name: currentType.name,
          description: currentType.description || null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", currentType.id);

      if (error) throw error;

      Alert.alert("Success", "Equipment type updated successfully");
      setShowEditModal(false);
      setCurrentType(null);
      fetchTypes();
    } catch (error) {
      console.error("Error updating equipment type:", error);
      Alert.alert("Error", "Failed to update equipment type");
    }
  };

  const handleDeleteType = async (typeId: string) => {
    Alert.alert(
      "Confirm Delete",
      "Are you sure you want to delete this equipment type? This will affect all equipment of this type.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              const { error } = await supabase
                .from("equipment_types")
                .delete()
                .eq("id", typeId);

              if (error) throw error;

              Alert.alert("Success", "Equipment type deleted successfully");
              fetchTypes();
            } catch (error) {
              console.error("Error deleting equipment type:", error);
              Alert.alert("Error", "Failed to delete equipment type");
            }
          },
        },
      ],
    );
  };

  const renderTypeItem = ({ item }: { item: EquipmentType }) => (
    <View className="bg-white rounded-xl p-4 mb-4 shadow-sm">
      <View className="flex-row justify-between items-start">
        <View className="flex-row items-center">
          <View className="bg-blue-100 p-2 rounded-full mr-3">
            <Tag size={20} color="#1e40af" />
          </View>
          <View className="flex-1">
            <Text className="font-bold text-lg text-gray-800">{item.name}</Text>
            {item.description && (
              <Text className="text-gray-500">{item.description}</Text>
            )}
          </View>
        </View>
        <View className="flex-row">
          <TouchableOpacity
            className="mr-3"
            onPress={() => {
              setCurrentType(item);
              setShowEditModal(true);
            }}
          >
            <Edit size={20} color="#1e40af" />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => handleDeleteType(item.id)}>
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
        <Text className="text-2xl font-bold text-white flex-1">
          Equipment Types
        </Text>
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
            placeholder="Search equipment types..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholderTextColor="#9ca3af"
          />
        </View>
      </View>

      {/* Type List */}
      <View className="flex-1 px-4 pt-4">
        {loading ? (
          <View className="flex-1 justify-center items-center">
            <ActivityIndicator size="large" color="#1e40af" />
            <Text className="mt-2 text-gray-600">
              Loading equipment types...
            </Text>
          </View>
        ) : filteredTypes.length > 0 ? (
          <FlatList
            data={filteredTypes}
            renderItem={renderTypeItem}
            keyExtractor={(item) => item.id}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: 20 }}
            refreshing={loading}
            onRefresh={fetchTypes}
          />
        ) : (
          <View className="flex-1 justify-center items-center">
            <Tag size={48} color="#9ca3af" />
            <Text className="mt-4 text-gray-500 text-center">
              No equipment types found
            </Text>
            <TouchableOpacity
              className="mt-4 bg-blue-600 px-4 py-2 rounded-lg"
              onPress={() => setShowAddModal(true)}
            >
              <Text className="text-white font-medium">
                Add New Equipment Type
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* Add Type Modal */}
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
                Add New Equipment Type
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
                  placeholder="Enter equipment type name"
                  value={newType.name}
                  onChangeText={(text) =>
                    setNewType({ ...newType, name: text })
                  }
                />
              </View>

              <View>
                <Text className="text-gray-700 mb-1 font-medium">
                  Description
                </Text>
                <TextInput
                  className="border border-gray-300 rounded-lg px-3 py-2 h-24"
                  placeholder="Enter equipment type description"
                  value={newType.description}
                  onChangeText={(text) =>
                    setNewType({ ...newType, description: text })
                  }
                  multiline
                  textAlignVertical="top"
                />
              </View>

              <TouchableOpacity
                className="bg-blue-600 py-3 rounded-lg items-center mt-4"
                onPress={handleAddType}
              >
                <Text className="text-white font-bold text-lg">
                  Add Equipment Type
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Edit Type Modal */}
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
                Edit Equipment Type
              </Text>
              <TouchableOpacity onPress={() => setShowEditModal(false)}>
                <X size={24} color="#4b5563" />
              </TouchableOpacity>
            </View>

            {currentType && (
              <View className="space-y-4">
                <View>
                  <Text className="text-gray-700 mb-1 font-medium">Name *</Text>
                  <TextInput
                    className="border border-gray-300 rounded-lg px-3 py-2"
                    placeholder="Enter equipment type name"
                    value={currentType.name}
                    onChangeText={(text) =>
                      setCurrentType({ ...currentType, name: text })
                    }
                  />
                </View>

                <View>
                  <Text className="text-gray-700 mb-1 font-medium">
                    Description
                  </Text>
                  <TextInput
                    className="border border-gray-300 rounded-lg px-3 py-2 h-24"
                    placeholder="Enter equipment type description"
                    value={currentType.description || ""}
                    onChangeText={(text) =>
                      setCurrentType({ ...currentType, description: text })
                    }
                    multiline
                    textAlignVertical="top"
                  />
                </View>

                <TouchableOpacity
                  className="bg-blue-600 py-3 rounded-lg items-center mt-4"
                  onPress={handleEditType}
                >
                  <Text className="text-white font-bold text-lg">
                    Update Equipment Type
                  </Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>
      </Modal>

      {/* Bottom Tabs */}
      <EquipmentTabs activeTab="types" />
    </SafeAreaView>
  );
}
