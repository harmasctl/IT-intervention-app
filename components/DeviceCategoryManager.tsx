import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  Alert,
  ActivityIndicator,
  Modal,
} from "react-native";
import { ArrowLeft, Edit, Plus, Trash } from "lucide-react-native";
import { supabase } from "../lib/supabase";

interface DeviceCategory {
  id: string;
  name: string;
  description: string;
}

interface DeviceCategoryManagerProps {
  onClose: () => void;
  onCategorySelected?: (category: DeviceCategory) => void;
  selectionMode?: boolean;
}

const DeviceCategoryManager = ({
  onClose,
  onCategorySelected,
  selectionMode = false,
}: DeviceCategoryManagerProps) => {
  const [categories, setCategories] = useState<DeviceCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingCategory, setEditingCategory] = useState<DeviceCategory | null>(
    null,
  );
  const [categoryName, setCategoryName] = useState("");
  const [categoryDescription, setCategoryDescription] = useState("");

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("device_categories")
        .select("*")
        .order("name");

      if (error) throw error;

      setCategories(data || []);
    } catch (error) {
      console.error("Error fetching categories:", error);
      Alert.alert("Error", "Failed to load device categories");
    } finally {
      setLoading(false);
    }
  };

  const handleAddCategory = () => {
    setEditingCategory(null);
    setCategoryName("");
    setCategoryDescription("");
    setModalVisible(true);
  };

  const handleEditCategory = (category: DeviceCategory) => {
    setEditingCategory(category);
    setCategoryName(category.name);
    setCategoryDescription(category.description || "");
    setModalVisible(true);
  };

  const handleDeleteCategory = async (categoryId: string) => {
    Alert.alert(
      "Confirm Delete",
      "Are you sure you want to delete this category? This may affect devices assigned to this category.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              const { error } = await supabase
                .from("device_categories")
                .delete()
                .eq("id", categoryId);

              if (error) throw error;

              // Refresh the list
              fetchCategories();
              Alert.alert("Success", "Category deleted successfully");
            } catch (error) {
              console.error("Error deleting category:", error);
              Alert.alert(
                "Error",
                "Failed to delete category. It may be in use by devices.",
              );
            }
          },
        },
      ],
    );
  };

  const handleSaveCategory = async () => {
    if (!categoryName.trim()) {
      Alert.alert("Error", "Category name is required");
      return;
    }

    try {
      if (editingCategory) {
        // Update existing category
        const { error } = await supabase
          .from("device_categories")
          .update({
            name: categoryName,
            description: categoryDescription,
            updated_at: new Date().toISOString(),
          })
          .eq("id", editingCategory.id);

        if (error) throw error;
        Alert.alert("Success", "Category updated successfully");
      } else {
        // Create new category
        const { error } = await supabase.from("device_categories").insert({
          name: categoryName,
          description: categoryDescription,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });

        if (error) throw error;
        Alert.alert("Success", "Category created successfully");
      }

      // Close modal and refresh list
      setModalVisible(false);
      fetchCategories();
    } catch (error) {
      console.error("Error saving category:", error);
      Alert.alert("Error", "Failed to save category");
    }
  };

  const renderCategoryItem = ({ item }: { item: DeviceCategory }) => (
    <TouchableOpacity
      className="bg-white p-4 mb-2 rounded-lg border border-gray-200 flex-row justify-between items-center"
      onPress={() => {
        if (selectionMode && onCategorySelected) {
          onCategorySelected(item);
        }
      }}
    >
      <View className="flex-1">
        <Text className="font-bold text-lg">{item.name}</Text>
        {item.description ? (
          <Text className="text-gray-600 mt-1">{item.description}</Text>
        ) : null}
      </View>

      {!selectionMode && (
        <View className="flex-row">
          <TouchableOpacity
            className="p-2 mr-2"
            onPress={() => handleEditCategory(item)}
          >
            <Edit size={20} color="#3b82f6" />
          </TouchableOpacity>
          <TouchableOpacity
            className="p-2"
            onPress={() => handleDeleteCategory(item.id)}
          >
            <Trash size={20} color="#ef4444" />
          </TouchableOpacity>
        </View>
      )}
    </TouchableOpacity>
  );

  return (
    <View className="flex-1 bg-gray-50 p-4">
      {/* Header */}
      <View className="flex-row justify-between items-center mb-4">
        <View className="flex-row items-center">
          <TouchableOpacity onPress={onClose} className="mr-2">
            <ArrowLeft size={24} color="#1e40af" />
          </TouchableOpacity>
          <Text className="text-2xl font-bold">Device Categories</Text>
        </View>
        <TouchableOpacity
          className="bg-blue-500 p-2 rounded-full"
          onPress={handleAddCategory}
        >
          <Plus size={20} color="white" />
        </TouchableOpacity>
      </View>

      {/* Category List */}
      {loading ? (
        <View className="flex-1 justify-center items-center">
          <ActivityIndicator size="large" color="#1e40af" />
          <Text className="mt-2 text-gray-600">Loading categories...</Text>
        </View>
      ) : (
        <FlatList
          data={categories}
          renderItem={renderCategoryItem}
          keyExtractor={(item) => item.id}
          ListEmptyComponent={
            <View className="items-center justify-center py-10">
              <Text className="text-gray-500">
                No device categories found. Add one to get started.
              </Text>
            </View>
          }
        />
      )}

      {/* Add/Edit Category Modal */}
      <Modal
        visible={modalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setModalVisible(false)}
      >
        <View className="flex-1 justify-center items-center bg-black bg-opacity-50">
          <View className="bg-white p-6 rounded-xl w-[90%] max-w-md">
            <Text className="text-xl font-bold mb-4">
              {editingCategory ? "Edit Category" : "Add New Category"}
            </Text>

            <Text className="font-medium mb-1">Category Name</Text>
            <TextInput
              className="border border-gray-300 rounded-lg p-3 mb-4 bg-white"
              placeholder="Enter category name"
              value={categoryName}
              onChangeText={setCategoryName}
            />

            <Text className="font-medium mb-1">Description (Optional)</Text>
            <TextInput
              className="border border-gray-300 rounded-lg p-3 mb-6 bg-white h-24"
              placeholder="Enter description"
              multiline
              textAlignVertical="top"
              value={categoryDescription}
              onChangeText={setCategoryDescription}
            />

            <View className="flex-row justify-between">
              <TouchableOpacity
                className="bg-gray-200 py-3 px-4 rounded-lg flex-1 mr-2"
                onPress={() => setModalVisible(false)}
              >
                <Text className="text-gray-800 text-center font-medium">
                  Cancel
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                className="bg-blue-500 py-3 px-4 rounded-lg flex-1 ml-2"
                onPress={handleSaveCategory}
              >
                <Text className="text-white text-center font-medium">
                  {editingCategory ? "Update" : "Save"}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

export default DeviceCategoryManager;
