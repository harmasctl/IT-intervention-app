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
  Search,
  Plus,
  Building2,
  MapPin,
  Phone,
  Mail,
  ChevronRight,
  X,
} from "lucide-react-native";
import { supabase } from "../../lib/supabase";

type Restaurant = {
  id: string;
  name: string;
  address?: string;
  city?: string;
  phone?: string;
  email?: string;
  created_at: string;
};

export default function RestaurantsScreen() {
  const router = useRouter();
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [filteredRestaurants, setFilteredRestaurants] = useState<Restaurant[]>(
    [],
  );
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [showAddModal, setShowAddModal] = useState(false);
  const [newRestaurant, setNewRestaurant] = useState({
    id: "",
    name: "",
    address: "",
    city: "",
    phone: "",
    email: "",
  });

  useEffect(() => {
    fetchRestaurants();

    // Set up real-time subscription for restaurant changes
    const restaurantSubscription = supabase
      .channel("restaurant-changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "restaurants" },
        (payload) => {
          console.log("Restaurant change received:", payload);
          fetchRestaurants();
        },
      )
      .subscribe();

    return () => {
      restaurantSubscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    filterRestaurants();
  }, [searchQuery, restaurants]);

  const fetchRestaurants = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("restaurants")
        .select("*")
        .order("name");

      if (error) throw error;

      if (data) {
        setRestaurants(data);
      }
    } catch (error) {
      console.error("Error fetching restaurants:", error);
      Alert.alert("Error", "Failed to load restaurants");
    } finally {
      setLoading(false);
    }
  };

  const filterRestaurants = () => {
    if (!searchQuery) {
      setFilteredRestaurants(restaurants);
      return;
    }

    const query = searchQuery.toLowerCase();
    const filtered = restaurants.filter(
      (restaurant) =>
        restaurant.name.toLowerCase().includes(query) ||
        restaurant.city?.toLowerCase().includes(query) ||
        restaurant.address?.toLowerCase().includes(query),
    );

    setFilteredRestaurants(filtered);
  };

  const handleAddRestaurant = async () => {
    if (!newRestaurant.name) {
      Alert.alert("Error", "Restaurant name is required");
      return;
    }

    if (!newRestaurant.id) {
      Alert.alert("Error", "Restaurant ID is required");
      return;
    }

    try {
      const { data, error } = await supabase.from("restaurants").insert([
        {
          id: newRestaurant.id,
          name: newRestaurant.name,
          address: newRestaurant.address || null,
          city: newRestaurant.city || null,
          phone: newRestaurant.phone || null,
          email: newRestaurant.email || null,
        },
      ]);

      if (error) {
        if (error.code === "23505") {
          // Unique violation
          Alert.alert("Error", "A restaurant with this ID already exists");
        } else {
          throw error;
        }
        return;
      }

      Alert.alert("Success", "Restaurant added successfully");
      setShowAddModal(false);
      setNewRestaurant({
        id: "",
        name: "",
        address: "",
        city: "",
        phone: "",
        email: "",
      });
      fetchRestaurants();
    } catch (error) {
      console.error("Error adding restaurant:", error);
      Alert.alert("Error", "Failed to add restaurant");
    }
  };

  const handleRestaurantPress = (restaurant: Restaurant) => {
    router.push(`/restaurants/${restaurant.id}`);
  };

  const renderRestaurantItem = ({ item }: { item: Restaurant }) => (
    <TouchableOpacity
      className="bg-white rounded-xl p-4 mb-4 shadow-sm"
      onPress={() => handleRestaurantPress(item)}
      style={{ elevation: 2 }}
    >
      <View className="flex-row justify-between items-start">
        <View className="flex-row items-center">
          <View className="bg-blue-100 p-2 rounded-full mr-3">
            <Building2 size={24} color="#1e40af" />
          </View>
          <View className="flex-1">
            <Text className="font-bold text-lg text-gray-800">{item.name}</Text>
            <Text className="text-gray-500 text-sm">{item.id}</Text>
          </View>
        </View>
        <ChevronRight size={20} color="#9ca3af" />
      </View>

      {(item.address || item.city || item.phone) && (
        <View className="mt-3 border-t border-gray-100 pt-3">
          {item.address && (
            <View className="flex-row items-center mt-1">
              <MapPin size={14} color="#4b5563" />
              <Text className="text-gray-500 text-sm ml-1">
                {item.address}
                {item.city ? `, ${item.city}` : ""}
              </Text>
            </View>
          )}

          {item.phone && (
            <View className="flex-row items-center mt-1">
              <Phone size={14} color="#4b5563" />
              <Text className="text-gray-500 text-sm ml-1">{item.phone}</Text>
            </View>
          )}

          {item.email && (
            <View className="flex-row items-center mt-1">
              <Mail size={14} color="#4b5563" />
              <Text className="text-gray-500 text-sm ml-1">{item.email}</Text>
            </View>
          )}
        </View>
      )}
    </TouchableOpacity>
  );

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      <StatusBar style="auto" />

      {/* Header */}
      <View className="flex-row justify-between items-center px-5 py-4 bg-gradient-to-r from-blue-700 to-blue-900 shadow-lg">
        <Text className="text-2xl font-bold text-white">Restaurants</Text>
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
            placeholder="Search restaurants..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholderTextColor="#9ca3af"
          />
        </View>
      </View>

      {/* Restaurant List */}
      <View className="flex-1 px-4 pt-4">
        {loading ? (
          <View className="flex-1 justify-center items-center">
            <ActivityIndicator size="large" color="#1e40af" />
            <Text className="mt-2 text-gray-600">Loading restaurants...</Text>
          </View>
        ) : filteredRestaurants.length > 0 ? (
          <FlatList
            data={filteredRestaurants}
            renderItem={renderRestaurantItem}
            keyExtractor={(item) => item.id}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: 20 }}
            refreshing={loading}
            onRefresh={fetchRestaurants}
          />
        ) : (
          <View className="flex-1 justify-center items-center">
            <Building2 size={48} color="#9ca3af" />
            <Text className="mt-4 text-gray-500 text-center">
              No restaurants found
            </Text>
            <TouchableOpacity
              className="mt-4 bg-blue-600 px-4 py-2 rounded-lg"
              onPress={() => setShowAddModal(true)}
            >
              <Text className="text-white font-medium">Add New Restaurant</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* Add Restaurant Modal */}
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
                Add New Restaurant
              </Text>
              <TouchableOpacity onPress={() => setShowAddModal(false)}>
                <X size={24} color="#4b5563" />
              </TouchableOpacity>
            </View>

            <View className="space-y-4">
              <View>
                <Text className="text-gray-700 mb-1 font-medium">
                  Restaurant ID *
                </Text>
                <TextInput
                  className="border border-gray-300 rounded-lg px-3 py-2"
                  placeholder="Enter restaurant ID"
                  value={newRestaurant.id}
                  onChangeText={(text) =>
                    setNewRestaurant({ ...newRestaurant, id: text })
                  }
                />
              </View>

              <View>
                <Text className="text-gray-700 mb-1 font-medium">Name *</Text>
                <TextInput
                  className="border border-gray-300 rounded-lg px-3 py-2"
                  placeholder="Enter restaurant name"
                  value={newRestaurant.name}
                  onChangeText={(text) =>
                    setNewRestaurant({ ...newRestaurant, name: text })
                  }
                />
              </View>

              <View>
                <Text className="text-gray-700 mb-1 font-medium">Address</Text>
                <TextInput
                  className="border border-gray-300 rounded-lg px-3 py-2"
                  placeholder="Enter address"
                  value={newRestaurant.address}
                  onChangeText={(text) =>
                    setNewRestaurant({ ...newRestaurant, address: text })
                  }
                />
              </View>

              <View>
                <Text className="text-gray-700 mb-1 font-medium">City</Text>
                <TextInput
                  className="border border-gray-300 rounded-lg px-3 py-2"
                  placeholder="Enter city"
                  value={newRestaurant.city}
                  onChangeText={(text) =>
                    setNewRestaurant({ ...newRestaurant, city: text })
                  }
                />
              </View>

              <View>
                <Text className="text-gray-700 mb-1 font-medium">Phone</Text>
                <TextInput
                  className="border border-gray-300 rounded-lg px-3 py-2"
                  placeholder="Enter phone number"
                  value={newRestaurant.phone}
                  onChangeText={(text) =>
                    setNewRestaurant({ ...newRestaurant, phone: text })
                  }
                  keyboardType="phone-pad"
                />
              </View>

              <View>
                <Text className="text-gray-700 mb-1 font-medium">Email</Text>
                <TextInput
                  className="border border-gray-300 rounded-lg px-3 py-2"
                  placeholder="Enter email"
                  value={newRestaurant.email}
                  onChangeText={(text) =>
                    setNewRestaurant({ ...newRestaurant, email: text })
                  }
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
              </View>

              <TouchableOpacity
                className="bg-blue-600 py-3 rounded-lg items-center mt-4"
                onPress={handleAddRestaurant}
              >
                <Text className="text-white font-bold text-lg">
                  Add Restaurant
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
