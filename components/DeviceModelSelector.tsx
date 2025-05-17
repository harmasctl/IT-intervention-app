import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  TextInput,
  FlatList,
  ActivityIndicator,
  Alert,
} from "react-native";
import { supabase } from "../lib/supabase";
import { Laptop, Plus, X, Search } from "lucide-react-native";

type DeviceModelSelectorProps = {
  selectedModel: string | null;
  onSelectModel: (model: string) => void;
  deviceType?: string;
};

export default function DeviceModelSelector({
  selectedModel,
  onSelectModel,
  deviceType,
}: DeviceModelSelectorProps) {
  const [showModal, setShowModal] = useState(false);
  const [models, setModels] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [filteredModels, setFilteredModels] = useState<string[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newModel, setNewModel] = useState("");

  useEffect(() => {
    if (showModal) {
      fetchModels();
    }
  }, [showModal, deviceType]);

  useEffect(() => {
    filterModels();
  }, [searchQuery, models]);

  const fetchModels = async () => {
    try {
      setLoading(true);
      let query = supabase
        .from("devices")
        .select("model")
        .not("model", "is", null);

      if (deviceType) {
        query = query.eq("type", deviceType);
      }

      const { data, error } = await query;

      if (error) throw error;

      if (data) {
        // Extract unique models
        const uniqueModels = Array.from(
          new Set(data.map((item) => item.model)),
        ).sort();
        setModels(uniqueModels);
      }
    } catch (error) {
      console.error("Error fetching models:", error);
      Alert.alert("Error", "Failed to load device models");
    } finally {
      setLoading(false);
    }
  };

  const filterModels = () => {
    if (!searchQuery) {
      setFilteredModels(models);
      return;
    }

    const query = searchQuery.toLowerCase();
    const filtered = models.filter((model) =>
      model.toLowerCase().includes(query),
    );

    setFilteredModels(filtered);
  };

  const handleAddModel = () => {
    if (!newModel) {
      Alert.alert("Error", "Model name is required");
      return;
    }

    // Add the new model to the list
    const updatedModels = [...models, newModel].sort();
    setModels(updatedModels);

    // Select the newly added model
    onSelectModel(newModel);

    // Close modals
    setShowAddModal(false);
    setShowModal(false);

    // Reset new model input
    setNewModel("");
  };

  const renderModelItem = ({ item }: { item: string }) => (
    <TouchableOpacity
      className={`p-4 border-b border-gray-100 ${selectedModel === item ? "bg-blue-50" : ""}`}
      onPress={() => {
        onSelectModel(item);
        setShowModal(false);
      }}
    >
      <View className="flex-row items-center">
        <View className="bg-blue-100 w-10 h-10 rounded-full items-center justify-center mr-3">
          <Laptop size={20} color="#1e40af" />
        </View>
        <Text className="font-bold text-gray-800">{item}</Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <View>
      <Text className="text-gray-700 mb-1 font-medium">Model *</Text>
      <TouchableOpacity
        className="flex-row justify-between items-center border border-gray-300 rounded-lg px-3 py-2"
        onPress={() => setShowModal(true)}
      >
        <View className="flex-row items-center">
          <Laptop size={20} color="#6b7280" className="mr-2" />
          <Text className={selectedModel ? "text-gray-800" : "text-gray-400"}>
            {selectedModel || "Select a model"}
          </Text>
        </View>
        <Text className="text-gray-500">▼</Text>
      </TouchableOpacity>

      {/* Model Selection Modal */}
      <Modal
        visible={showModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowModal(false)}
      >
        <View className="flex-1 bg-black bg-opacity-50 justify-end">
          <View className="bg-white rounded-t-3xl max-h-[80%]">
            <View className="p-4 border-b border-gray-200 flex-row justify-between items-center">
              <Text className="text-xl font-bold text-center text-blue-800">
                Select Model
              </Text>
              <TouchableOpacity onPress={() => setShowModal(false)}>
                <X size={24} color="#4b5563" />
              </TouchableOpacity>
            </View>

            <View className="p-4">
              <View className="flex-row items-center bg-gray-100 rounded-xl px-4 py-3 mb-4">
                <Search size={20} color="#4b5563" />
                <TextInput
                  className="flex-1 ml-3 py-1"
                  placeholder="Search models..."
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                  placeholderTextColor="#9ca3af"
                />
              </View>

              <TouchableOpacity
                className="flex-row items-center justify-center bg-blue-600 rounded-lg p-3 mb-4"
                onPress={() => setShowAddModal(true)}
              >
                <Plus size={20} color="white" className="mr-2" />
                <Text className="text-white font-medium">Add New Model</Text>
              </TouchableOpacity>
            </View>

            {loading ? (
              <View className="p-8 items-center justify-center">
                <ActivityIndicator size="large" color="#1e40af" />
                <Text className="mt-2 text-gray-500">Loading models...</Text>
              </View>
            ) : filteredModels.length > 0 ? (
              <FlatList
                data={filteredModels}
                renderItem={renderModelItem}
                keyExtractor={(item) => item}
                contentContainerStyle={{ paddingBottom: 20 }}
              />
            ) : (
              <View className="p-8 items-center justify-center">
                <Text className="text-gray-500 text-center">
                  No models found. Add a new model to continue.
                </Text>
              </View>
            )}
          </View>
        </View>
      </Modal>

      {/* Add Model Modal */}
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
                Add New Model
              </Text>
              <TouchableOpacity onPress={() => setShowAddModal(false)}>
                <X size={24} color="#4b5563" />
              </TouchableOpacity>
            </View>

            <View className="space-y-4">
              <View>
                <Text className="text-gray-700 mb-1 font-medium">
                  Model Name *
                </Text>
                <TextInput
                  className="border border-gray-300 rounded-lg px-3 py-2"
                  placeholder="Enter model name"
                  value={newModel}
                  onChangeText={setNewModel}
                />
              </View>

              <TouchableOpacity
                className="bg-blue-600 py-3 rounded-lg items-center mt-4"
                onPress={handleAddModel}
              >
                <Text className="text-white font-bold text-lg">Add Model</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}
