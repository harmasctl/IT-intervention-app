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
  ScrollView,
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
  Tag,
  Search,
  Clock,
  Palette,
  Check,
  Calendar,
} from "lucide-react-native";
import { supabase } from "../../lib/supabase";
import ColorPicker from 'react-native-wheel-color-picker';

type DeviceCategory = {
  id: string;
  name: string;
  description?: string;
  icon?: string;
  color?: string;
  maintenance_interval?: number;
  is_active?: boolean;
  created_at: string;
  updated_at?: string;
};

// List of available icons
const availableIcons = [
  "computer", "printer", "router", "server", "phone", "tablet", "monitor", 
  "keyboard", "mouse", "scanner", "projector", "camera", "speaker", "microphone", 
  "headset", "tv", "cash-register", "pos", "terminal", "other"
];

export default function DeviceCategoriesScreen() {
  const router = useRouter();
  const [categories, setCategories] = useState<DeviceCategory[]>([]);
  const [filteredCategories, setFilteredCategories] = useState<
    DeviceCategory[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [currentCategory, setCurrentCategory] = useState<DeviceCategory | null>(
    null,
  );
  const [newCategory, setNewCategory] = useState({
    name: "",
    description: "",
    icon: "computer",
    color: "#3b82f6",
    maintenance_interval: 90,
    is_active: true,
  });
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [tempColor, setTempColor] = useState("#3b82f6");
  const [isEditingColor, setIsEditingColor] = useState(false);

  useEffect(() => {
    fetchCategories();

    // Set up real-time subscription for category changes
    const categorySubscription = supabase
      .channel("category-changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "device_categories" },
        (payload) => {
          console.log("Category change received:", payload);
          fetchCategories();
        },
      )
      .subscribe();

    return () => {
      categorySubscription.unsubscribe();
    };
  }, []);

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
      const { data, error } = await supabase.from("device_categories").insert([
        {
          name: newCategory.name,
          description: newCategory.description || null,
          icon: newCategory.icon || null,
          color: newCategory.color || null,
          maintenance_interval: newCategory.maintenance_interval || 90,
          is_active: newCategory.is_active,
        },
      ]);

      if (error) throw error;

      Alert.alert("Success", "Category added successfully");
      setShowAddModal(false);
      setNewCategory({
        name: "",
        description: "",
        icon: "computer",
        color: "#3b82f6",
        maintenance_interval: 90,
        is_active: true,
      });
      fetchCategories();
    } catch (error) {
      console.error("Error adding category:", error);
      Alert.alert("Error", "Failed to add category");
    }
  };

  const handleEditCategory = async () => {
    if (!currentCategory) return;
    if (!currentCategory.name) {
      Alert.alert("Error", "Category name is required");
      return;
    }

    try {
      const { error } = await supabase
        .from("device_categories")
        .update({
          name: currentCategory.name,
          description: currentCategory.description || null,
          icon: currentCategory.icon || null,
          color: currentCategory.color || null,
          maintenance_interval: currentCategory.maintenance_interval || 90,
          is_active: currentCategory.is_active !== false, // Default to true if undefined
          updated_at: new Date().toISOString(),
        })
        .eq("id", currentCategory.id);

      if (error) throw error;

      Alert.alert("Success", "Category updated successfully");
      setShowEditModal(false);
      setCurrentCategory(null);
      fetchCategories();
    } catch (error) {
      console.error("Error updating category:", error);
      Alert.alert("Error", "Failed to update category");
    }
  };

  const handleDeleteCategory = async (categoryId: string) => {
    // First check if there are any devices using this category
    try {
      const { count, error } = await supabase
        .from("devices")
        .select("*", { count: "exact", head: true })
        .eq("category_id", categoryId);

      if (error) throw error;

      if (count && count > 0) {
        Alert.alert(
          "Cannot Delete",
          `This category is used by ${count} device(s). Please reassign these devices first.`
        );
        return;
      }
    } catch (error) {
      console.error("Error checking devices:", error);
    }

    Alert.alert(
      "Confirm Delete",
      "Are you sure you want to delete this category?",
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

              Alert.alert("Success", "Category deleted successfully");
              fetchCategories();
            } catch (error) {
              console.error("Error deleting category:", error);
              Alert.alert("Error", "Failed to delete category");
            }
          },
        },
      ],
    );
  };

  const getIconComponent = (iconName: string, size: number = 20, color: string = "#4b5563") => {
    // You can expand this to use actual icon components based on the name
    // For now, we'll just use the Tag icon for all
    return <Tag size={size} color={color} />;
  };

  const renderCategoryItem = ({ item }: { item: DeviceCategory }) => (
    <View className="bg-white rounded-xl p-4 mb-4 shadow-sm">
      <View className="flex-row justify-between items-center">
        <View className="flex-row items-center">
          <View 
            className="p-2 rounded-full mr-3" 
            style={{ backgroundColor: item.color || "#e5e7eb" }}
          >
            {getIconComponent(item.icon || "tag", 20, "#ffffff")}
          </View>
          <View>
            <Text className="font-bold text-lg text-gray-800">{item.name}</Text>
            {item.description && (
              <Text className="text-gray-500 text-sm">{item.description}</Text>
            )}
          </View>
        </View>
        <View className="flex-row">
          <TouchableOpacity
            onPress={() => {
              setCurrentCategory(item);
              setTempColor(item.color || "#3b82f6");
              setShowEditModal(true);
            }}
            className="p-2 mr-2 bg-blue-100 rounded-full"
          >
            <Edit size={16} color="#1e40af" />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => handleDeleteCategory(item.id)}
            className="p-2 bg-red-100 rounded-full"
          >
            <Trash2 size={16} color="#dc2626" />
          </TouchableOpacity>
        </View>
      </View>

      <View className="mt-3 pt-3 border-t border-gray-100">
        <View className="flex-row items-center justify-between">
          <View className="flex-row items-center">
            <Clock size={14} color="#4b5563" />
            <Text className="text-gray-500 text-sm ml-1">
              Maintenance: {item.maintenance_interval || 90} days
            </Text>
          </View>
          <View className="flex-row items-center">
            <Text className="text-gray-500 text-sm mr-1">
              {item.is_active !== false ? "Active" : "Inactive"}
            </Text>
            {item.is_active !== false ? (
              <Check size={14} color="#16a34a" />
            ) : (
              <X size={14} color="#dc2626" />
            )}
          </View>
        </View>
      </View>
    </View>
  );

  const onColorChange = (color: string) => {
    setTempColor(color);
  };

  const confirmColorSelection = () => {
    if (isEditingColor && currentCategory) {
      setCurrentCategory({
        ...currentCategory,
        color: tempColor,
      });
    } else {
      setNewCategory({
        ...newCategory,
        color: tempColor,
      });
    }
    setShowColorPicker(false);
    setIsEditingColor(false);
  };

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      <StatusBar style="auto" />

      {/* Header */}
      <View className="flex-row justify-between items-center px-5 py-4 bg-gradient-to-r from-blue-700 to-blue-900 shadow-lg">
        <TouchableOpacity
          onPress={() => router.back()}
          className="p-2 rounded-full bg-blue-800"
        >
          <ArrowLeft size={22} color="white" />
        </TouchableOpacity>
        <Text className="text-xl font-bold text-white">Device Categories</Text>
        <TouchableOpacity
          onPress={() => setShowAddModal(true)}
          className="p-2 rounded-full bg-green-600"
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
            placeholder="Search categories..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholderTextColor="#9ca3af"
          />
        </View>
      </View>

      {/* Category List */}
      {loading ? (
        <View className="flex-1 justify-center items-center">
          <ActivityIndicator size="large" color="#1e40af" />
        </View>
      ) : filteredCategories.length > 0 ? (
        <FlatList
          data={filteredCategories}
          renderItem={renderCategoryItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ padding: 16 }}
          showsVerticalScrollIndicator={false}
        />
      ) : (
        <View className="flex-1 justify-center items-center p-4">
          <Text className="text-gray-500 text-lg text-center">
            No categories found
          </Text>
        </View>
      )}

      {/* Add Category Modal */}
      <Modal
        visible={showAddModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowAddModal(false)}
      >
        <View className="flex-1 justify-end bg-black bg-opacity-50">
          <View className="bg-white rounded-t-3xl p-6 h-5/6">
            <View className="flex-row justify-between items-center mb-6">
              <Text className="text-2xl font-bold text-gray-800">
                Add New Category
              </Text>
              <TouchableOpacity
                onPress={() => setShowAddModal(false)}
                className="bg-gray-200 rounded-full p-2"
              >
                <X size={20} color="#4b5563" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              {/* Form Fields */}
              <View className="mb-4">
                <Text className="text-gray-700 mb-2 font-medium">Name *</Text>
                <TextInput
                  className="bg-gray-100 rounded-xl px-4 py-3 text-gray-800"
                  placeholder="Category name"
                  value={newCategory.name}
                  onChangeText={(text) =>
                    setNewCategory({ ...newCategory, name: text })
                  }
                />
              </View>

              <View className="mb-4">
                <Text className="text-gray-700 mb-2 font-medium">Description</Text>
                <TextInput
                  className="bg-gray-100 rounded-xl px-4 py-3 text-gray-800"
                  placeholder="Category description"
                  value={newCategory.description}
                  onChangeText={(text) =>
                    setNewCategory({ ...newCategory, description: text })
                  }
                  multiline
                />
              </View>

              <View className="mb-4">
                <Text className="text-gray-700 mb-2 font-medium">Icon</Text>
                <View className="flex-row flex-wrap">
                  {availableIcons.map((icon) => (
                    <TouchableOpacity
                      key={icon}
                      className={`p-3 m-1 rounded-lg ${
                        newCategory.icon === icon
                          ? "bg-blue-100 border border-blue-500"
                          : "bg-gray-100"
                      }`}
                      onPress={() => setNewCategory({ ...newCategory, icon })}
                    >
                      <Text className="text-gray-800">{icon}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <View className="mb-4">
                <Text className="text-gray-700 mb-2 font-medium">Color</Text>
                <TouchableOpacity
                  className="flex-row items-center bg-gray-100 rounded-xl px-4 py-3"
                  onPress={() => {
                    setTempColor(newCategory.color);
                    setIsEditingColor(false);
                    setShowColorPicker(true);
                  }}
                >
                  <View
                    className="w-6 h-6 rounded-full mr-3"
                    style={{ backgroundColor: newCategory.color }}
                  />
                  <Text className="text-gray-800">{newCategory.color}</Text>
                </TouchableOpacity>
              </View>

              <View className="mb-4">
                <Text className="text-gray-700 mb-2 font-medium">
                  Maintenance Interval (days)
                </Text>
                <TextInput
                  className="bg-gray-100 rounded-xl px-4 py-3 text-gray-800"
                  placeholder="90"
                  value={newCategory.maintenance_interval.toString()}
                  onChangeText={(text) => {
                    const value = parseInt(text) || 0;
                    setNewCategory({ ...newCategory, maintenance_interval: value });
                  }}
                  keyboardType="numeric"
                />
              </View>

              <View className="mb-6">
                <Text className="text-gray-700 mb-2 font-medium">Status</Text>
                <View className="flex-row">
                  <TouchableOpacity
                    className={`flex-1 py-3 mr-2 rounded-xl flex-row justify-center items-center ${
                      newCategory.is_active
                        ? "bg-blue-100 border border-blue-500"
                        : "bg-gray-100"
                    }`}
                    onPress={() =>
                      setNewCategory({ ...newCategory, is_active: true })
                    }
                  >
                    <Check size={16} color={newCategory.is_active ? "#1e40af" : "#4b5563"} />
                    <Text
                      className={`ml-1 ${
                        newCategory.is_active
                          ? "text-blue-700 font-medium"
                          : "text-gray-700"
                      }`}
                    >
                      Active
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    className={`flex-1 py-3 ml-2 rounded-xl flex-row justify-center items-center ${
                      !newCategory.is_active
                        ? "bg-blue-100 border border-blue-500"
                        : "bg-gray-100"
                    }`}
                    onPress={() =>
                      setNewCategory({ ...newCategory, is_active: false })
                    }
                  >
                    <X size={16} color={!newCategory.is_active ? "#1e40af" : "#4b5563"} />
                    <Text
                      className={`ml-1 ${
                        !newCategory.is_active
                          ? "text-blue-700 font-medium"
                          : "text-gray-700"
                      }`}
                    >
                      Inactive
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>

              <TouchableOpacity
                className="bg-blue-600 rounded-xl py-4 items-center mb-6"
                onPress={handleAddCategory}
              >
                <Text className="text-white font-bold text-lg">
                  Add Category
                </Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Edit Category Modal */}
      <Modal
        visible={showEditModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowEditModal(false)}
      >
        <View className="flex-1 justify-end bg-black bg-opacity-50">
          <View className="bg-white rounded-t-3xl p-6 h-5/6">
            <View className="flex-row justify-between items-center mb-6">
              <Text className="text-2xl font-bold text-gray-800">
                Edit Category
              </Text>
              <TouchableOpacity
                onPress={() => setShowEditModal(false)}
                className="bg-gray-200 rounded-full p-2"
              >
                <X size={20} color="#4b5563" />
              </TouchableOpacity>
            </View>

            {currentCategory && (
              <ScrollView showsVerticalScrollIndicator={false}>
                {/* Form Fields */}
                <View className="mb-4">
                  <Text className="text-gray-700 mb-2 font-medium">Name *</Text>
                  <TextInput
                    className="bg-gray-100 rounded-xl px-4 py-3 text-gray-800"
                    placeholder="Category name"
                    value={currentCategory.name}
                    onChangeText={(text) =>
                      setCurrentCategory({ ...currentCategory, name: text })
                    }
                  />
                </View>

                <View className="mb-4">
                  <Text className="text-gray-700 mb-2 font-medium">Description</Text>
                  <TextInput
                    className="bg-gray-100 rounded-xl px-4 py-3 text-gray-800"
                    placeholder="Category description"
                    value={currentCategory.description || ""}
                    onChangeText={(text) =>
                      setCurrentCategory({ ...currentCategory, description: text })
                    }
                    multiline
                  />
                </View>

                <View className="mb-4">
                  <Text className="text-gray-700 mb-2 font-medium">Icon</Text>
                  <View className="flex-row flex-wrap">
                    {availableIcons.map((icon) => (
                      <TouchableOpacity
                        key={icon}
                        className={`p-3 m-1 rounded-lg ${
                          currentCategory.icon === icon
                            ? "bg-blue-100 border border-blue-500"
                            : "bg-gray-100"
                        }`}
                        onPress={() => setCurrentCategory({ ...currentCategory, icon })}
                      >
                        <Text className="text-gray-800">{icon}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>

                <View className="mb-4">
                  <Text className="text-gray-700 mb-2 font-medium">Color</Text>
                  <TouchableOpacity
                    className="flex-row items-center bg-gray-100 rounded-xl px-4 py-3"
                    onPress={() => {
                      setTempColor(currentCategory.color || "#3b82f6");
                      setIsEditingColor(true);
                      setShowColorPicker(true);
                    }}
                  >
                    <View
                      className="w-6 h-6 rounded-full mr-3"
                      style={{ backgroundColor: currentCategory.color || "#3b82f6" }}
                    />
                    <Text className="text-gray-800">{currentCategory.color || "#3b82f6"}</Text>
                  </TouchableOpacity>
                </View>

                <View className="mb-4">
                  <Text className="text-gray-700 mb-2 font-medium">
                    Maintenance Interval (days)
                  </Text>
                  <TextInput
                    className="bg-gray-100 rounded-xl px-4 py-3 text-gray-800"
                    placeholder="90"
                    value={(currentCategory.maintenance_interval || 90).toString()}
                    onChangeText={(text) => {
                      const value = parseInt(text) || 0;
                      setCurrentCategory({ ...currentCategory, maintenance_interval: value });
                    }}
                    keyboardType="numeric"
                  />
                </View>

                <View className="mb-4">
                  <Text className="text-gray-700 mb-2 font-medium">Status</Text>
                  <View className="flex-row">
                    <TouchableOpacity
                      className={`flex-1 py-3 mr-2 rounded-xl flex-row justify-center items-center ${
                        currentCategory.is_active !== false
                          ? "bg-blue-100 border border-blue-500"
                          : "bg-gray-100"
                      }`}
                      onPress={() =>
                        setCurrentCategory({ ...currentCategory, is_active: true })
                      }
                    >
                      <Check size={16} color={currentCategory.is_active !== false ? "#1e40af" : "#4b5563"} />
                      <Text
                        className={`ml-1 ${
                          currentCategory.is_active !== false
                            ? "text-blue-700 font-medium"
                            : "text-gray-700"
                        }`}
                      >
                        Active
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      className={`flex-1 py-3 ml-2 rounded-xl flex-row justify-center items-center ${
                        currentCategory.is_active === false
                          ? "bg-blue-100 border border-blue-500"
                          : "bg-gray-100"
                      }`}
                      onPress={() =>
                        setCurrentCategory({ ...currentCategory, is_active: false })
                      }
                    >
                      <X size={16} color={currentCategory.is_active === false ? "#1e40af" : "#4b5563"} />
                      <Text
                        className={`ml-1 ${
                          currentCategory.is_active === false
                            ? "text-blue-700 font-medium"
                            : "text-gray-700"
                        }`}
                      >
                        Inactive
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>

                {currentCategory.created_at && (
                  <View className="mb-4 flex-row items-center">
                    <Calendar size={16} color="#4b5563" />
                    <Text className="text-gray-500 ml-2">
                      Created: {new Date(currentCategory.created_at).toLocaleDateString()}
                    </Text>
                  </View>
                )}

                <TouchableOpacity
                  className="bg-blue-600 rounded-xl py-4 items-center mb-6"
                  onPress={handleEditCategory}
                >
                  <Text className="text-white font-bold text-lg">
                    Save Changes
                  </Text>
                </TouchableOpacity>
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>

      {/* Color Picker Modal */}
      <Modal
        visible={showColorPicker}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowColorPicker(false)}
      >
        <View className="flex-1 justify-center items-center bg-black bg-opacity-50 p-4">
          <View className="bg-white rounded-xl p-6 w-full">
            <Text className="text-xl font-bold text-gray-800 mb-4">
              Select Color
            </Text>
            <View className="h-64 w-full">
              <ColorPicker
                color={tempColor}
                onColorChange={onColorChange}
                thumbSize={40}
                sliderSize={40}
                noSnap={true}
                row={false}
              />
            </View>
            <View className="flex-row justify-end mt-6">
              <TouchableOpacity
                className="bg-gray-200 rounded-lg px-4 py-2 mr-2"
                onPress={() => setShowColorPicker(false)}
              >
                <Text className="text-gray-800 font-medium">Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                className="bg-blue-600 rounded-lg px-4 py-2"
                onPress={confirmColorSelection}
              >
                <Text className="text-white font-medium">Select</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
