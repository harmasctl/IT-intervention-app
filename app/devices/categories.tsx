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
  Switch,
  KeyboardAvoidingView,
  Platform,
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
  Save,
  Package,
  Calendar,
  Circle,
} from "lucide-react-native";
import { supabase } from "../../lib/supabase";
import { Picker } from "@react-native-picker/picker";

type DeviceCategory = {
  id: string;
  name: string;
  description?: string;
  icon?: string;
  color?: string;
  maintenance_interval?: number;
  created_at: string;
};

export default function CategoriesScreen() {
  const router = useRouter();
  const [categories, setCategories] = useState<DeviceCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingCategory, setEditingCategory] = useState<DeviceCategory | null>(null);
  
  // Form state
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [icon, setIcon] = useState("package");
  const [color, setColor] = useState("#3B82F6");
  const [maintenanceInterval, setMaintenanceInterval] = useState("90");
  const [saveLoading, setSaveLoading] = useState(false);

  const iconOptions = [
    "package", "refrigerator", "oven", "coffee", "utensils", 
    "flame", "dishwasher", "archive", "computer", "printer", 
    "music", "tv", "smartphone", "camera", "speaker"
  ];

  const colorOptions = [
    { name: "Blue", value: "#3B82F6" },
    { name: "Purple", value: "#8B5CF6" },
    { name: "Green", value: "#10B981" },
    { name: "Red", value: "#EF4444" },
    { name: "Orange", value: "#F97316" },
    { name: "Yellow", value: "#F59E0B" },
    { name: "Indigo", value: "#6366F1" },
    { name: "Pink", value: "#EC4899" },
    { name: "Gray", value: "#64748B" },
  ];

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

      if (error) {
        console.error("Error fetching categories:", error);
        Alert.alert("Error", "Failed to load categories");
        return;
      }

      setCategories(data || []);
    } catch (error) {
      console.error("Exception fetching categories:", error);
      Alert.alert("Error", "An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  };

  const handleAddCategory = () => {
    // Reset form fields
    setEditingCategory(null);
    setName("");
    setDescription("");
    setIcon("package");
    setColor("#3B82F6");
    setMaintenanceInterval("90");
    setModalVisible(true);
  };

  const handleEditCategory = (category: DeviceCategory) => {
    setEditingCategory(category);
    setName(category.name);
    setDescription(category.description || "");
    setIcon(category.icon || "package");
    setColor(category.color || "#3B82F6");
    setMaintenanceInterval(category.maintenance_interval?.toString() || "90");
    setModalVisible(true);
  };

  const handleDeleteCategory = (category: DeviceCategory) => {
    Alert.alert(
      "Delete Category",
      `Are you sure you want to delete ${category.name}?`,
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              setLoading(true);
              const { error } = await supabase
                .from("device_categories")
                .delete()
                .eq("id", category.id);

              if (error) {
                throw error;
              }

              // Refresh the list
              fetchCategories();
              Alert.alert("Success", "Category deleted successfully");
            } catch (error) {
              console.error("Error deleting category:", error);
              Alert.alert("Error", "Failed to delete category");
              setLoading(false);
            }
          },
        },
      ]
    );
  };

  const handleSaveCategory = async () => {
    if (!name.trim()) {
      Alert.alert("Error", "Category name is required");
      return;
    }

    try {
      setSaveLoading(true);
      
      const interval = parseInt(maintenanceInterval, 10);
      if (isNaN(interval) || interval < 0) {
        Alert.alert("Error", "Maintenance interval must be a positive number");
        setSaveLoading(false);
        return;
      }

      const categoryData = {
        name: name.trim(),
        description: description.trim() || null,
        icon,
        color,
        maintenance_interval: interval,
      };

      let result;
      if (editingCategory) {
        // Update existing category
        result = await supabase
          .from("device_categories")
          .update(categoryData)
          .eq("id", editingCategory.id);
      } else {
        // Create new category
        result = await supabase
          .from("device_categories")
          .insert(categoryData)
          .select();
      }

      if (result.error) {
        throw result.error;
      }

      setModalVisible(false);
      fetchCategories();
      Alert.alert(
        "Success", 
        `Category ${editingCategory ? "updated" : "created"} successfully`
      );
    } catch (error) {
      console.error("Error saving category:", error);
      Alert.alert("Error", `Failed to ${editingCategory ? "update" : "create"} category`);
    } finally {
      setSaveLoading(false);
    }
  };

  const renderCategory = ({ item }: { item: DeviceCategory }) => (
    <View className="bg-white rounded-lg p-4 shadow-sm mb-3 flex-row">
          <View 
        className="w-10 h-10 rounded-full items-center justify-center mr-3"
        style={{ backgroundColor: item.color || "#3B82F6" }}
          >
        <Package size={20} color="#FFFFFF" />
          </View>
      
      <View className="flex-1">
        <Text className="text-lg font-semibold text-gray-800">{item.name}</Text>
            {item.description && (
          <Text className="text-gray-600 text-sm">{item.description}</Text>
            )}
        <Text className="text-gray-500 text-xs mt-1">
          Maintenance interval: {item.maintenance_interval || 90} days
        </Text>
          </View>
      
      <View className="flex-row items-center">
          <TouchableOpacity
          className="p-2" 
          onPress={() => handleEditCategory(item)}
        >
          <Edit size={20} color="#6B7280" />
          </TouchableOpacity>
          <TouchableOpacity
          className="p-2" 
          onPress={() => handleDeleteCategory(item)}
          >
          <Trash2 size={20} color="#EF4444" />
          </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      <StatusBar style="dark" />
      
      <View className="flex-row justify-between items-center p-4 border-b border-gray-200 bg-white">
        <View className="flex-row items-center">
          <TouchableOpacity onPress={() => router.back()} className="mr-4">
            <ArrowLeft size={24} color="#0F172A" />
        </TouchableOpacity>
          <Text className="text-xl font-bold text-gray-800">Device Categories</Text>
        </View>
        <TouchableOpacity
          className="bg-blue-500 p-2 rounded-full"
          onPress={handleAddCategory}
        >
          <Plus size={20} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      <View className="flex-1 p-4">
      {loading ? (
        <View className="flex-1 justify-center items-center">
            <ActivityIndicator size="large" color="#3B82F6" />
            <Text className="text-gray-600 mt-2">Loading categories...</Text>
        </View>
        ) : categories.length > 0 ? (
        <FlatList
            data={categories}
            renderItem={renderCategory}
          keyExtractor={(item) => item.id}
          showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: 20 }}
        />
      ) : (
          <View className="flex-1 justify-center items-center">
            <Package size={64} color="#D1D5DB" />
            <Text className="text-gray-500 mt-4 text-lg">No categories found</Text>
            <Text className="text-gray-400 text-center mt-2 mb-6">
              Add your first device category to get started
          </Text>
            <TouchableOpacity
              className="bg-blue-500 rounded-lg px-4 py-3 flex-row items-center"
              onPress={handleAddCategory}
            >
              <Plus size={20} color="#FFFFFF" />
              <Text className="text-white font-medium ml-2">Add Category</Text>
            </TouchableOpacity>
        </View>
      )}
      </View>

      {/* Category Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          className="flex-1 justify-end"
        >
          <View className="bg-white rounded-t-xl shadow-lg h-5/6">
            <View className="flex-row justify-between items-center p-4 border-b border-gray-200">
              <Text className="text-xl font-bold text-gray-800">
                {editingCategory ? "Edit Category" : "Add New Category"}
              </Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <X size={24} color="#0F172A" />
              </TouchableOpacity>
            </View>

            <View className="p-4 flex-1">
              <View className="mb-4">
                <Text className="text-sm font-medium text-gray-700 mb-1">Name *</Text>
                <TextInput
                  className="bg-white border border-gray-300 rounded-lg px-4 py-3 text-gray-800"
                  value={name}
                  onChangeText={setName}
                  placeholder="Enter category name"
                />
              </View>

              <View className="mb-4">
                <Text className="text-sm font-medium text-gray-700 mb-1">Description</Text>
                <TextInput
                  className="bg-white border border-gray-300 rounded-lg px-4 py-3 text-gray-800"
                  value={description}
                  onChangeText={setDescription}
                  placeholder="Enter category description"
                  multiline
                  numberOfLines={3}
                  textAlignVertical="top"
                />
              </View>

              <View className="mb-4">
                <Text className="text-sm font-medium text-gray-700 mb-1">Icon</Text>
                <View className="bg-white border border-gray-300 rounded-lg px-1 py-1">
                  <Picker
                    selectedValue={icon}
                    onValueChange={(itemValue) => setIcon(itemValue)}
                  >
                    {iconOptions.map((iconName) => (
                      <Picker.Item 
                        key={iconName} 
                        label={iconName.charAt(0).toUpperCase() + iconName.slice(1)} 
                        value={iconName} 
                      />
                    ))}
                  </Picker>
                </View>
              </View>

              <View className="mb-4">
                <Text className="text-sm font-medium text-gray-700 mb-1">Color</Text>
                <View className="bg-white border border-gray-300 rounded-lg px-1 py-1">
                  <Picker
                    selectedValue={color}
                    onValueChange={(itemValue) => setColor(itemValue)}
                  >
                    {colorOptions.map((colorOption) => (
                      <Picker.Item 
                        key={colorOption.value} 
                        label={colorOption.name} 
                        value={colorOption.value} 
                      />
                    ))}
                  </Picker>
                </View>
                
                <View className="flex-row mt-2 items-center">
                  <Text className="text-sm text-gray-600 mr-2">Preview:</Text>
                  <View
                    className="w-6 h-6 rounded-full"
                    style={{ backgroundColor: color }}
                  />
                </View>
              </View>

              <View className="mb-4">
                <Text className="text-sm font-medium text-gray-700 mb-1">
                  Maintenance Interval (days)
                </Text>
                <TextInput
                  className="bg-white border border-gray-300 rounded-lg px-4 py-3 text-gray-800"
                  value={maintenanceInterval}
                  onChangeText={setMaintenanceInterval}
                  keyboardType="numeric"
                  placeholder="90"
                />
                <Text className="text-xs text-gray-500 mt-1">
                  Recommended maintenance frequency in days
                </Text>
          </View>
        </View>
            
            <View className="p-4 border-t border-gray-200">
              <TouchableOpacity
                className="bg-blue-500 py-3 rounded-lg flex-row justify-center items-center"
                onPress={handleSaveCategory}
                disabled={saveLoading}
              >
                {saveLoading ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <>
                    <Save size={20} color="#FFFFFF" />
                    <Text className="text-white font-bold ml-2">
                      {editingCategory ? "Update Category" : "Add Category"}
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}
