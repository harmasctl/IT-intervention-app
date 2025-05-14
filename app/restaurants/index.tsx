import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  TextInput,
  Alert,
  ActivityIndicator,
  Modal,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { useRouter } from "expo-router";
import { Plus, Search, Edit, Trash, Upload } from "lucide-react-native";
import { supabase } from "../../lib/supabase";

type Restaurant = {
  id: string;
  name: string;
  created_at: string;
};

export default function RestaurantsScreen() {
  const router = useRouter();
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [showAddForm, setShowAddForm] = useState(false);
  const [showEditForm, setShowEditForm] = useState(false);
  const [showBulkImport, setShowBulkImport] = useState(false);
  const [bulkImportText, setBulkImportText] = useState("");
  const [selectedRestaurant, setSelectedRestaurant] =
    useState<Restaurant | null>(null);

  useEffect(() => {
    fetchRestaurants();
  }, []);

  const fetchRestaurants = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("restaurants")
        .select("*")
        .order("name");

      if (error) throw error;

      if (data) {
        setRestaurants(data as Restaurant[]);
      }
    } catch (error) {
      console.error("Error fetching restaurants:", error);
      Alert.alert("Error", "Failed to load restaurants");
    } finally {
      setLoading(false);
    }
  };

  const handleAddRestaurant = () => {
    setSelectedRestaurant(null);
    setShowAddForm(true);
  };

  const handleBulkImport = () => {
    setShowBulkImport(true);
  };

  const processBulkImport = async () => {
    if (!bulkImportText.trim()) {
      Alert.alert("Error", "Please enter restaurant names");
      return;
    }

    try {
      const restaurantNames = bulkImportText
        .split("\n")
        .map((name) => name.trim())
        .filter((name) => name.length > 0);

      if (restaurantNames.length === 0) {
        Alert.alert("Error", "No valid restaurant names found");
        return;
      }

      const restaurantsToInsert = restaurantNames.map((name) => ({
        name,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }));

      const { data, error } = await supabase
        .from("restaurants")
        .insert(restaurantsToInsert);

      if (error) throw error;

      Alert.alert(
        "Success",
        `${restaurantNames.length} restaurants imported successfully`,
      );
      setShowBulkImport(false);
      setBulkImportText("");
      fetchRestaurants();
    } catch (error) {
      console.error("Error importing restaurants:", error);
      Alert.alert("Error", "Failed to import restaurants");
    }
  };

  const handleEditRestaurant = (restaurant: Restaurant) => {
    setSelectedRestaurant(restaurant);
    setShowEditForm(true);
  };

  const handleDeleteRestaurant = async (id: string) => {
    Alert.alert(
      "Confirm Delete",
      "Are you sure you want to delete this restaurant? This will also affect all associated devices and tickets.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              const { error } = await supabase
                .from("restaurants")
                .delete()
                .eq("id", id);

              if (error) throw error;

              Alert.alert("Success", "Restaurant deleted successfully");
              fetchRestaurants();
            } catch (error) {
              console.error("Error deleting restaurant:", error);
              Alert.alert(
                "Error",
                "Failed to delete restaurant. It may have associated devices or tickets.",
              );
            }
          },
        },
      ],
    );
  };

  const handleFormSubmit = async (formData: any, isEdit = false) => {
    try {
      if (isEdit && selectedRestaurant) {
        // Update existing restaurant
        const { error } = await supabase
          .from("restaurants")
          .update({
            name: formData.name,
            updated_at: new Date().toISOString(),
          })
          .eq("id", selectedRestaurant.id);

        if (error) throw error;
        Alert.alert("Success", "Restaurant updated successfully");
      } else {
        // Create new restaurant
        const { error } = await supabase.from("restaurants").insert({
          name: formData.name,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });

        if (error) throw error;
        Alert.alert("Success", "Restaurant created successfully");
      }

      setShowAddForm(false);
      setShowEditForm(false);
      fetchRestaurants();
    } catch (error) {
      console.error("Error saving restaurant:", error);
      Alert.alert("Error", "Failed to save restaurant");
    }
  };

  const filteredRestaurants = restaurants.filter((restaurant) =>
    restaurant.name.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  const renderRestaurantItem = ({ item }: { item: Restaurant }) => (
    <View className="bg-white rounded-lg p-4 mb-3 shadow-sm border border-gray-100">
      <View className="flex-row justify-between">
        <View className="flex-1">
          <Text className="font-bold text-lg text-gray-800">{item.name}</Text>
        </View>
        <View className="flex-row">
          <TouchableOpacity
            className="p-2 mr-2"
            onPress={() => handleEditRestaurant(item)}
          >
            <Edit size={20} color="#3b82f6" />
          </TouchableOpacity>
          <TouchableOpacity
            className="p-2"
            onPress={() => handleDeleteRestaurant(item.id)}
          >
            <Trash size={20} color="#ef4444" />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );

  const RestaurantForm = ({
    initialData,
    onCancel,
    onSubmit,
  }: {
    initialData?: { name: string };
    onCancel: () => void;
    onSubmit: (data: any) => void;
  }) => {
    const [name, setName] = useState(initialData?.name || "");

    const handleSubmit = () => {
      if (!name.trim()) {
        Alert.alert("Error", "Restaurant name is required");
        return;
      }
      onSubmit({ name });
    };

    return (
      <View className="p-4">
        <View className="flex-row justify-between items-center mb-6">
          <Text className="text-2xl font-bold">
            {initialData ? "Edit Restaurant" : "Add New Restaurant"}
          </Text>
          <TouchableOpacity onPress={onCancel}>
            <Trash size={24} color="#666" />
          </TouchableOpacity>
        </View>

        <View className="mb-4">
          <Text className="text-gray-700 mb-1 font-medium">
            Restaurant Name *
          </Text>
          <TextInput
            className="border border-gray-300 rounded-lg px-3 py-2"
            placeholder="Enter restaurant name"
            value={name}
            onChangeText={setName}
          />
        </View>

        <View className="flex-row mb-4">
          <TouchableOpacity
            className="bg-gray-200 rounded-lg py-3 px-4 flex-1 mr-2"
            onPress={onCancel}
          >
            <Text className="text-gray-700 text-center font-medium">
              Cancel
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            className="bg-blue-500 rounded-lg py-3 px-4 flex-1 ml-2"
            onPress={handleSubmit}
          >
            <Text className="text-white text-center font-medium">
              {initialData ? "Update Restaurant" : "Add Restaurant"}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView className="flex-1 bg-white">
      <StatusBar style="auto" />

      {showAddForm ? (
        <RestaurantForm
          onCancel={() => setShowAddForm(false)}
          onSubmit={handleFormSubmit}
        />
      ) : showEditForm && selectedRestaurant ? (
        <RestaurantForm
          onCancel={() => setShowEditForm(false)}
          onSubmit={(formData) => handleFormSubmit(formData, true)}
          initialData={{
            name: selectedRestaurant.name,
          }}
        />
      ) : showBulkImport ? (
        <View className="flex-1 p-4">
          <View className="flex-row justify-between items-center mb-6">
            <Text className="text-2xl font-bold">Bulk Import Restaurants</Text>
            <TouchableOpacity onPress={() => setShowBulkImport(false)}>
              <Trash size={24} color="#666" />
            </TouchableOpacity>
          </View>

          <Text className="text-gray-700 mb-2">
            Enter one restaurant name per line:
          </Text>
          <TextInput
            className="border border-gray-300 rounded-lg p-3 mb-4 h-40"
            placeholder="Restaurant 1\nRestaurant 2\nRestaurant 3"
            multiline
            textAlignVertical="top"
            value={bulkImportText}
            onChangeText={setBulkImportText}
          />

          <View className="flex-row mb-4">
            <TouchableOpacity
              className="bg-gray-200 rounded-lg py-3 px-4 flex-1 mr-2"
              onPress={() => setShowBulkImport(false)}
            >
              <Text className="text-gray-700 text-center font-medium">
                Cancel
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              className="bg-blue-500 rounded-lg py-3 px-4 flex-1 ml-2"
              onPress={processBulkImport}
            >
              <Text className="text-white text-center font-medium">Import</Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : (
        <>
          {/* Header */}
          <View className="flex-row justify-between items-center px-4 py-3 border-b border-gray-200">
            <Text className="text-2xl font-bold text-blue-800">
              Restaurants
            </Text>
            <View className="flex-row">
              <TouchableOpacity
                className="bg-green-600 p-2 rounded-full mr-2"
                onPress={handleBulkImport}
              >
                <Upload size={24} color="white" />
              </TouchableOpacity>
              <TouchableOpacity
                className="bg-blue-600 p-2 rounded-full"
                onPress={handleAddRestaurant}
              >
                <Plus size={24} color="white" />
              </TouchableOpacity>
            </View>
          </View>

          {/* Search */}
          <View className="p-4">
            <View className="flex-row items-center bg-gray-100 rounded-lg px-3 py-2 mb-3">
              <Search size={20} color="#6b7280" />
              <TextInput
                className="flex-1 ml-2 py-1"
                placeholder="Search restaurants..."
                value={searchQuery}
                onChangeText={setSearchQuery}
              />
            </View>
          </View>

          {/* Restaurant list */}
          <View className="flex-1 px-4 bg-gray-50">
            {loading ? (
              <View className="flex-1 justify-center items-center">
                <ActivityIndicator size="large" color="#1e40af" />
                <Text className="mt-2 text-gray-600">
                  Loading restaurants...
                </Text>
              </View>
            ) : filteredRestaurants.length > 0 ? (
              <FlatList
                data={filteredRestaurants}
                renderItem={renderRestaurantItem}
                keyExtractor={(item) => item.id}
                showsVerticalScrollIndicator={false}
              />
            ) : (
              <View className="flex-1 justify-center items-center">
                <Text className="text-gray-500 text-center">
                  No restaurants found
                </Text>
                <TouchableOpacity
                  className="mt-4 bg-blue-600 px-4 py-2 rounded-lg"
                  onPress={handleAddRestaurant}
                >
                  <Text className="text-white font-medium">Add Restaurant</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </>
      )}
    </SafeAreaView>
  );
}
