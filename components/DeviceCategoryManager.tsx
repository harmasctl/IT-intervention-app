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
import { Tag, Plus, X, Search } from "lucide-react-native";
import { useRouter } from "expo-router";

type DeviceCategoryManagerProps = {
  selectedCategory: string | null;
  onSelectCategory: (categoryId: string, categoryName: string) => void;
};

export default function DeviceCategoryManager({
  selectedCategory,
  onSelectCategory,
}: DeviceCategoryManagerProps) {
  const router = useRouter();
  const [showModal, setShowModal] = useState(false);
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [filteredCategories, setFilteredCategories] = useState<any[]>([]);
  const [selectedCategoryName, setSelectedCategoryName] = useState("");
  const [showAddModal, setShowAddModal] = useState(false);
  const [newCategory, setNewCategory] = useState({
    name: "",
    description: "",
  });

  useEffect(() => {
    if (showModal) {
      fetchCategories();
    }
  }, [showModal]);

  useEffect(() => {
    filterCategories();
  }, [searchQuery, categories]);

  const fetchCategories = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("device_categories")
        .select("*")
        .order("name");

      if (error) throw error;

      if (data) {
        setCategories(data);

        // Find the name of the selected category
        if (selectedCategory) {
          const category = data.find((cat) => cat.id === selectedCategory);
          if (category) {
            setSelectedCategoryName(category.name);
          }
        }
      }
    } catch (error) {
      console.error("Error fetching categories:", error);
      Alert.alert("Error", "Failed to load device categories");
    } finally {
      setLoading(false);
    }
  };

  const filterCategories = () => {
    if (!searchQuery) {
      setFilteredCategories(categories);
      return;
    }

    const query = searchQuery.toLowerCase();
    const filtered = categories.filter(
      (category) =>
        category.name.toLowerCase().includes(query) ||
        category.description?.toLowerCase().includes(query),
    );

    setFilteredCategories(filtered);
  };

  const handleAddCategory = async () => {
    if (!newCategory.name) {
      Alert.alert("Error", "Category name is required");
      return;
    }

    try {
      const { data, error } = await supabase
        .from("device_categories")
        .insert([
          {
            name: newCategory.name,
            description: newCategory.description || null,
          },
        ])
        .select();

      if (error) throw error;

      if (data && data[0]) {
        Alert.alert("Success", "Category added successfully");
        setShowAddModal(false);
        setNewCategory({
          name: "",
          description: "",
        });
        fetchCategories();

        // Select the newly created category
        onSelectCategory(data[0].id, data[0].name);
        setSelectedCategoryName(data[0].name);
        setShowModal(false);
      }
    } catch (error) {
      console.error("Error adding category:", error);
      Alert.alert("Error", "Failed to add category");
    }
  };

  const renderCategoryItem = ({ item }: { item: any }) => (
    <TouchableOpacity
      className={`p-4 border-b border-gray-100 ${selectedCategory === item.id ? "bg-blue-50" : ""}`}
      onPress={() => {
        onSelectCategory(item.id, item.name);
        setSelectedCategoryName(item.name);
        setShowModal(false);
      }}
    >
      <View className="flex-row items-center">
        <View className="bg-blue-100 w-10 h-10 rounded-full items-center justify-center mr-3">
          <Tag size={20} color="#1e40af" />
        </View>
        <View>
          <Text className="font-bold text-gray-800">{item.name}</Text>
          {item.description && (
            <Text className="text-gray-500 text-sm">{item.description}</Text>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <View>
      <Text className="text-gray-700 mb-1 font-medium">Category *</Text>
      <TouchableOpacity
        className="flex-row justify-between items-center border border-gray-300 rounded-lg px-3 py-2"
        onPress={() => setShowModal(true)}
      >
        <View className="flex-row items-center">
          <Tag size={20} color="#6b7280" className="mr-2" />
          <Text
            className={selectedCategory ? "text-gray-800" : "text-gray-400"}
          >
            {selectedCategoryName || "Select a category"}
          </Text>
        </View>
        <Text className="text-gray-500">▼</Text>
      </TouchableOpacity>

      {/* Category Selection Modal */}
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
                Select Category
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
                  placeholder="Search categories..."
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
                <Text className="text-white font-medium">Add New Category</Text>
              </TouchableOpacity>
            </View>

            {loading ? (
              <View className="p-8 items-center justify-center">
                <ActivityIndicator size="large" color="#1e40af" />
                <Text className="mt-2 text-gray-500">
                  Loading categories...
                </Text>
              </View>
            ) : filteredCategories.length > 0 ? (
              <FlatList
                data={filteredCategories}
                renderItem={renderCategoryItem}
                keyExtractor={(item) => item.id}
                contentContainerStyle={{ paddingBottom: 20 }}
              />
            ) : (
              <View className="p-8 items-center justify-center">
                <Text className="text-gray-500 text-center">
                  No categories found. Add a new category to continue.
                </Text>
              </View>
            )}

            <TouchableOpacity
              className="p-4 bg-gray-100 items-center"
              onPress={() => router.push("/devices/categories")}
            >
              <Text className="text-blue-600 font-medium">
                Manage All Categories
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Add Category Modal */}
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
                Add New Category
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
                  placeholder="Enter category name"
                  value={newCategory.name}
                  onChangeText={(text) =>
                    setNewCategory({ ...newCategory, name: text })
                  }
                />
              </View>

              <View>
                <Text className="text-gray-700 mb-1 font-medium">
                  Description
                </Text>
                <TextInput
                  className="border border-gray-300 rounded-lg px-3 py-2 h-24"
                  placeholder="Enter category description"
                  value={newCategory.description}
                  onChangeText={(text) =>
                    setNewCategory({ ...newCategory, description: text })
                  }
                  multiline
                  textAlignVertical="top"
                />
              </View>

              <TouchableOpacity
                className="bg-blue-600 py-3 rounded-lg items-center mt-4"
                onPress={handleAddCategory}
              >
                <Text className="text-white font-bold text-lg">
                  Add Category
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}
