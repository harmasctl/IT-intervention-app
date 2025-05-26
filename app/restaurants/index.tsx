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
  Image,
  RefreshControl,
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
  User,
  CircleCheck,
  AlertCircle,
  Hammer,
  Clock,
  MoreVertical,
  Filter,
  ArrowRight,
  Map,
} from "lucide-react-native";
import { supabase } from "../../lib/supabase";
import * as ImagePicker from "expo-image-picker";
import { decode } from "base64-arraybuffer";

type Restaurant = {
  id: string;
  name: string;
  location?: string;
  address?: string;
  phone?: string;
  email?: string;
  manager_name?: string;
  status?: 'active' | 'closed' | 'renovation';
  created_at: string;
  image_url?: string;
  operating_hours?: string;
  city?: string;
  state?: string;
  zip?: string;
};

export default function RestaurantsScreen() {
  const router = useRouter();
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [filteredRestaurants, setFilteredRestaurants] = useState<Restaurant[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [showAddModal, setShowAddModal] = useState(false);
  const [newRestaurant, setNewRestaurant] = useState({
    name: "",
    location: "",
    address: "",
    phone: "",
    email: "",
    manager_name: "",
    status: "active" as Restaurant["status"],
    city: "",
    state: "",
    zip: ""
  });
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [filters, setFilters] = useState({
    city: '',
    state: '',
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
    applyFilters();
  }, [searchQuery, filters, restaurants]);

  const fetchRestaurants = async () => {
    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .from('restaurants')
        .select('*')
        .order('name');
      
      if (error) {
        console.error('Error fetching restaurants:', error);
        Alert.alert('Error', 'Failed to load restaurants');
        return;
      }
      
      setRestaurants(data || []);
    } catch (error) {
      console.error('Error in fetchRestaurants:', error);
      Alert.alert('Error', 'An unexpected error occurred');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...restaurants];
    
    // Apply search query filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        restaurant =>
          restaurant.name.toLowerCase().includes(query) ||
          restaurant.location?.toLowerCase().includes(query) ||
          restaurant.address?.toLowerCase().includes(query) ||
          restaurant.manager_name?.toLowerCase().includes(query) ||
          restaurant.city?.toLowerCase().includes(query) ||
          restaurant.email?.toLowerCase().includes(query)
      );
    }
    
    // Apply city filter
    if (filters.city) {
      filtered = filtered.filter(
        restaurant => restaurant.city?.toLowerCase().includes(filters.city.toLowerCase())
      );
    }
    
    // Apply state filter
    if (filters.state) {
      filtered = filtered.filter(
        restaurant => restaurant.state?.toLowerCase().includes(filters.state.toLowerCase())
      );
    }
    
    setFilteredRestaurants(filtered);
  };

  const handleRefresh = () => {
    setRefreshing(true);
    fetchRestaurants();
  };

  const pickImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
        base64: true,
      });

      if (!result.canceled && result.assets && result.assets[0]) {
        setImageUri(result.assets[0].uri);
      }
    } catch (error) {
      console.error("Error picking image:", error);
      Alert.alert("Error", "Failed to select image");
    }
  };

  const uploadImage = async (restaurantId: string): Promise<string | null> => {
    if (!imageUri) return null;

    try {
      setUploadingImage(true);
      
      // Get the file extension
      const fileExt = imageUri.split(".").pop()?.toLowerCase() || "jpeg";
      const fileName = `${restaurantId}.${fileExt}`;
      const filePath = `${fileName}`;
      
      // Convert image to base64
      const response = await fetch(imageUri);
      const blob = await response.blob();
      const reader = new FileReader();
      
      return new Promise((resolve, reject) => {
        reader.onload = async () => {
          const base64 = reader.result as string;
          const base64Data = base64.split(",")[1];
          
          if (!base64Data) {
            reject(new Error("Failed to process image"));
            return;
          }
          
          const { data, error } = await supabase.storage
            .from("restaurant-photos")
            .upload(filePath, decode(base64Data), {
              contentType: `image/${fileExt}`,
              upsert: true,
            });
            
          if (error) {
            console.error("Error uploading image:", error);
            reject(error);
            return;
          }
          
          const { data: publicUrlData } = supabase.storage
            .from("restaurant-photos")
            .getPublicUrl(filePath);
            
          resolve(publicUrlData.publicUrl);
        };
        
        reader.onerror = () => {
          reject(new Error("Failed to read file"));
        };
        
        reader.readAsDataURL(blob);
      });
    } catch (error) {
      console.error("Error in uploadImage:", error);
      return null;
    } finally {
      setUploadingImage(false);
    }
  };

  const handleAddRestaurant = async () => {
    if (!newRestaurant.name) {
      Alert.alert("Error", "Restaurant name is required");
      return;
    }

    try {
      // Insert the restaurant first
      const { data, error } = await supabase
        .from("restaurants")
        .insert([
          {
            name: newRestaurant.name,
            location: newRestaurant.location || null,
            address: newRestaurant.address || null,
            phone: newRestaurant.phone || null,
            email: newRestaurant.email || null,
            manager_name: newRestaurant.manager_name || null,
            status: newRestaurant.status || 'active',
            city: newRestaurant.city || null,
            state: newRestaurant.state || null,
            zip: newRestaurant.zip || null,
          },
        ])
        .select();

      if (error) {
        throw error;
      }

      if (data && data[0] && imageUri) {
        // Upload image if available
        const restaurantId = data[0].id;
        const imageUrl = await uploadImage(restaurantId);
        
        if (imageUrl) {
          // Update restaurant with image URL
          await supabase
            .from("restaurants")
            .update({ image_url: imageUrl })
            .eq("id", restaurantId);
        }
      }

      Alert.alert("Success", "Restaurant added successfully");
      setShowAddModal(false);
      setNewRestaurant({
        name: "",
        location: "",
        address: "",
        phone: "",
        email: "",
        manager_name: "",
        status: "active",
        city: "",
        state: "",
        zip: ""
      });
      setImageUri(null);
      fetchRestaurants();
    } catch (error) {
      console.error("Error adding restaurant:", error);
      Alert.alert("Error", "Failed to add restaurant");
    }
  };

  const handleRestaurantPress = (restaurant: Restaurant) => {
    router.push({
      pathname: '/restaurants/[id]',
      params: { id: restaurant.id }
    });
  };

  const getStatusIcon = (status?: string) => {
    switch (status) {
      case 'active':
        return <CircleCheck size={14} color="#16a34a" />;
      case 'closed':
        return <AlertCircle size={14} color="#dc2626" />;
      case 'renovation':
        return <Hammer size={14} color="#f59e0b" />;
      default:
        return <CircleCheck size={14} color="#16a34a" />;
    }
  };

  const getStatusText = (status?: string) => {
    switch (status) {
      case 'active':
        return "Active";
      case 'closed':
        return "Closed";
      case 'renovation':
        return "Under Renovation";
      default:
        return "Active";
    }
  };

  const showFilterOptions = () => {
    // In a real app, you would show a modal with filter options
    Alert.alert(
      'Filters',
      'Filter options would be shown here',
      [
        { text: 'OK', onPress: () => {} }
      ]
    );
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
            <View className="flex-row items-center">
              {getStatusIcon(item.status)}
              <Text className="text-gray-500 text-sm ml-1">{getStatusText(item.status)}</Text>
            </View>
          </View>
        </View>
        <ChevronRight size={20} color="#9ca3af" />
      </View>

      <View className="mt-3 border-t border-gray-100 pt-3">
        {item.location && (
          <View className="flex-row items-center mt-1">
            <MapPin size={14} color="#4b5563" />
            <Text className="text-gray-500 text-sm ml-1">{item.location}</Text>
          </View>
        )}

        {item.address && (
          <View className="flex-row items-center mt-1">
            <MapPin size={14} color="#4b5563" />
            <Text className="text-gray-500 text-sm ml-1">{item.address}</Text>
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

        {item.manager_name && (
          <View className="flex-row items-center mt-1">
            <User size={14} color="#4b5563" />
            <Text className="text-gray-500 text-sm ml-1">{item.manager_name}</Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      <StatusBar style="dark" />

      {/* Header */}
      <View className="bg-white p-4 border-b border-gray-200">
        <View className="flex-row justify-between items-center">
          <View className="flex-row items-center">
            <Building2 size={24} color="#0F172A" />
            <Text className="text-xl font-bold ml-2 text-gray-800">Restaurants</Text>
          </View>
          
          <View className="flex-row">
            <TouchableOpacity 
              className="mr-3 bg-blue-500 p-2 rounded-full"
              onPress={() => {
                console.log("Navigating to device map");
                router.push("/restaurants/device-map");
              }}
            >
              <Map size={20} color="#FFFFFF" />
            </TouchableOpacity>
            <TouchableOpacity 
              className="mr-3 bg-green-500 p-2 rounded-full"
              onPress={() => {
                console.log("Navigating to simple map");
                router.push("/restaurants/simple-map");
              }}
            >
              <Map size={20} color="#FFFFFF" />
            </TouchableOpacity>
            <TouchableOpacity 
              className="bg-blue-500 p-2 rounded-full"
              onPress={() => setShowAddModal(true)}
            >
              <Plus size={20} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        </View>
        
        {/* Search Bar */}
        <View className="flex-row mt-4">
          <View className="flex-1 flex-row items-center bg-gray-100 rounded-lg px-3 py-2">
            <Search size={20} color="#6B7280" />
            <TextInput
              className="flex-1 ml-2 text-gray-800"
              placeholder="Search restaurants..."
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
          </View>
          
          <TouchableOpacity
            className="ml-2 bg-gray-100 p-2 rounded-lg items-center justify-center"
            onPress={showFilterOptions}
          >
            <Filter size={20} color="#6B7280" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Restaurant List */}
      {loading ? (
        <View className="flex-1 justify-center items-center">
          <ActivityIndicator size="large" color="#1e40af" />
        </View>
      ) : filteredRestaurants.length > 0 ? (
        <FlatList
          data={filteredRestaurants}
          renderItem={renderRestaurantItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ padding: 16 }}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
          }
        />
      ) : (
        <View className="flex-1 justify-center items-center p-4">
          <Text className="text-gray-500 text-lg text-center">
            No restaurants found
          </Text>
        </View>
      )}

      {/* Add Restaurant Modal */}
      <Modal
        visible={showAddModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowAddModal(false)}
      >
        <View className="flex-1 justify-end bg-black bg-opacity-50">
          <View className="bg-white rounded-t-3xl p-6 h-5/6">
            <View className="flex-row justify-between items-center mb-6">
              <Text className="text-2xl font-bold text-gray-800">
                Add New Restaurant
              </Text>
              <TouchableOpacity
                onPress={() => setShowAddModal(false)}
                className="bg-gray-200 rounded-full p-2"
              >
                <X size={20} color="#4b5563" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              {/* Restaurant Image */}
              <TouchableOpacity
                onPress={pickImage}
                className="bg-gray-100 rounded-xl h-40 justify-center items-center mb-6"
              >
                {imageUri ? (
                  <Image
                    source={{ uri: imageUri }}
                    className="w-full h-full rounded-xl"
                    resizeMode="cover"
                  />
                ) : (
                  <View className="items-center">
                    <Building2 size={40} color="#9ca3af" />
                    <Text className="text-gray-500 mt-2">Add Restaurant Photo</Text>
                  </View>
                )}
              </TouchableOpacity>

              {/* Form Fields */}
              <View className="mb-4">
                <Text className="text-gray-700 mb-2 font-medium">Name *</Text>
                <TextInput
                  className="bg-gray-100 rounded-xl px-4 py-3 text-gray-800"
                  placeholder="Restaurant name"
                  value={newRestaurant.name}
                  onChangeText={(text) =>
                    setNewRestaurant({ ...newRestaurant, name: text })
                  }
                />
              </View>

              <View className="mb-4">
                <Text className="text-gray-700 mb-2 font-medium">Location</Text>
                <TextInput
                  className="bg-gray-100 rounded-xl px-4 py-3 text-gray-800"
                  placeholder="City, State"
                  value={newRestaurant.location}
                  onChangeText={(text) =>
                    setNewRestaurant({ ...newRestaurant, location: text })
                  }
                />
              </View>

              <View className="mb-4">
                <Text className="text-gray-700 mb-2 font-medium">Address</Text>
                <TextInput
                  className="bg-gray-100 rounded-xl px-4 py-3 text-gray-800"
                  placeholder="Full address"
                  value={newRestaurant.address}
                  onChangeText={(text) =>
                    setNewRestaurant({ ...newRestaurant, address: text })
                  }
                  multiline
                />
              </View>

              <View className="mb-4">
                <Text className="text-gray-700 mb-2 font-medium">Phone</Text>
                <TextInput
                  className="bg-gray-100 rounded-xl px-4 py-3 text-gray-800"
                  placeholder="Phone number"
                  value={newRestaurant.phone}
                  onChangeText={(text) =>
                    setNewRestaurant({ ...newRestaurant, phone: text })
                  }
                  keyboardType="phone-pad"
                />
              </View>

              <View className="mb-4">
                <Text className="text-gray-700 mb-2 font-medium">Email</Text>
                <TextInput
                  className="bg-gray-100 rounded-xl px-4 py-3 text-gray-800"
                  placeholder="Email address"
                  value={newRestaurant.email}
                  onChangeText={(text) =>
                    setNewRestaurant({ ...newRestaurant, email: text })
                  }
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
              </View>

              <View className="mb-4">
                <Text className="text-gray-700 mb-2 font-medium">Manager</Text>
                <TextInput
                  className="bg-gray-100 rounded-xl px-4 py-3 text-gray-800"
                  placeholder="Manager name"
                  value={newRestaurant.manager_name}
                  onChangeText={(text) =>
                    setNewRestaurant({ ...newRestaurant, manager_name: text })
                  }
                />
              </View>

              <View className="mb-6">
                <Text className="text-gray-700 mb-2 font-medium">Status</Text>
                <View className="flex-row">
                  {["active", "closed", "renovation"].map((status) => (
                    <TouchableOpacity
                      key={status}
                      className={`flex-1 py-3 mr-2 rounded-xl flex-row justify-center items-center ${
                        newRestaurant.status === status
                          ? "bg-blue-100 border border-blue-500"
                          : "bg-gray-100"
                      }`}
                      onPress={() =>
                        setNewRestaurant({
                          ...newRestaurant,
                          status: status as Restaurant["status"],
                        })
                      }
                    >
                      {status === "active" && <CircleCheck size={16} color="#16a34a" />}
                      {status === "closed" && <AlertCircle size={16} color="#dc2626" />}
                      {status === "renovation" && <Hammer size={16} color="#f59e0b" />}
                      <Text
                        className={`ml-1 ${
                          newRestaurant.status === status
                            ? "text-blue-700 font-medium"
                            : "text-gray-700"
                        }`}
                      >
                        {status === "active" ? "Active" : status === "closed" ? "Closed" : "Renovation"}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <TouchableOpacity
                className="bg-blue-600 rounded-xl py-4 items-center mb-6"
                onPress={handleAddRestaurant}
                disabled={uploadingImage}
              >
                {uploadingImage ? (
                  <ActivityIndicator color="white" />
                ) : (
                  <Text className="text-white font-bold text-lg">
                    Add Restaurant
                  </Text>
                )}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
