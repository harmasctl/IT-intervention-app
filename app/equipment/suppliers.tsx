import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  Alert,
  TextInput,
  Modal,
  RefreshControl
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
  Search,
  Building,
  Mail,
  Phone,
  MapPin
} from "lucide-react-native";
import { supabase } from "../../lib/supabase";

type Supplier = {
  id: string;
  name: string;
  contact_name?: string;
  email?: string;
  phone?: string;
  address?: string;
  created_at: string;
};

export default function SuppliersScreen() {
  const router = useRouter();
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [modalVisible, setModalVisible] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
  
  // Form state
  const [name, setName] = useState("");
  const [contactName, setContactName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [saveLoading, setSaveLoading] = useState(false);

  useEffect(() => {
    fetchSuppliers();
  }, []);

  const fetchSuppliers = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("suppliers")
        .select("*")
        .order("name");

      if (error) {
        console.error("Error fetching suppliers:", error);
        Alert.alert("Error", "Failed to load suppliers");
        return;
      }

      setSuppliers(data || []);
    } catch (error) {
      console.error("Exception fetching suppliers:", error);
      Alert.alert("Error", "An unexpected error occurred");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    fetchSuppliers();
  };

  const handleAddSupplier = () => {
    // Reset form fields
    setEditingSupplier(null);
    setName("");
    setContactName("");
    setEmail("");
    setPhone("");
    setAddress("");
    setModalVisible(true);
  };

  const handleEditSupplier = (supplier: Supplier) => {
    setEditingSupplier(supplier);
    setName(supplier.name);
    setContactName(supplier.contact_name || "");
    setEmail(supplier.email || "");
    setPhone(supplier.phone || "");
    setAddress(supplier.address || "");
    setModalVisible(true);
  };

  const handleDeleteSupplier = (supplier: Supplier) => {
    Alert.alert(
      "Delete Supplier",
      `Are you sure you want to delete ${supplier.name}?`,
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
                .from("suppliers")
                .delete()
                .eq("id", supplier.id);

              if (error) {
                throw error;
              }

              // Refresh the list
              fetchSuppliers();
              Alert.alert("Success", "Supplier deleted successfully");
            } catch (error) {
              console.error("Error deleting supplier:", error);
              Alert.alert("Error", "Failed to delete supplier");
              setLoading(false);
            }
          },
        },
      ]
    );
  };

  const handleSaveSupplier = async () => {
    if (!name.trim()) {
      Alert.alert("Error", "Supplier name is required");
      return;
    }

    try {
      setSaveLoading(true);
      
      const supplierData = {
        name: name.trim(),
        contact_name: contactName.trim() || null,
        email: email.trim() || null,
        phone: phone.trim() || null,
        address: address.trim() || null,
      };

      let result;
      if (editingSupplier) {
        // Update existing supplier
        result = await supabase
          .from("suppliers")
          .update(supplierData)
          .eq("id", editingSupplier.id);
      } else {
        // Create new supplier
        result = await supabase
          .from("suppliers")
          .insert(supplierData)
          .select();
      }

      if (result.error) {
        throw result.error;
      }

      setModalVisible(false);
      fetchSuppliers();
      Alert.alert(
        "Success", 
        `Supplier ${editingSupplier ? "updated" : "created"} successfully`
      );
    } catch (error) {
      console.error("Error saving supplier:", error);
      Alert.alert("Error", `Failed to ${editingSupplier ? "update" : "create"} supplier`);
    } finally {
      setSaveLoading(false);
    }
  };

  const filteredSuppliers = suppliers.filter(supplier =>
    supplier.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (supplier.contact_name && supplier.contact_name.toLowerCase().includes(searchQuery.toLowerCase())) ||
    (supplier.email && supplier.email.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const renderSupplierItem = ({ item }: { item: Supplier }) => (
    <TouchableOpacity 
      className="bg-white rounded-lg p-4 shadow-sm mb-3"
      onPress={() => handleEditSupplier(item)}
    >
      <View className="flex-row justify-between items-start">
        <View className="flex-1">
          <Text className="text-lg font-semibold text-gray-800">{item.name}</Text>
          {item.contact_name && (
            <Text className="text-gray-600 text-sm">{item.contact_name}</Text>
          )}
        </View>
        
        <View className="flex-row items-center">
          <TouchableOpacity 
            className="p-2" 
            onPress={() => handleEditSupplier(item)}
          >
            <Edit size={20} color="#6B7280" />
          </TouchableOpacity>
          <TouchableOpacity 
            className="p-2" 
            onPress={() => handleDeleteSupplier(item)}
          >
            <Trash2 size={20} color="#EF4444" />
          </TouchableOpacity>
        </View>
      </View>
      
      {item.email && (
        <View className="flex-row items-center mt-1">
          <Mail size={14} color="#6B7280" className="mr-1" />
          <Text className="text-gray-500 text-sm">{item.email}</Text>
        </View>
      )}
      
      {item.phone && (
        <View className="flex-row items-center mt-1">
          <Phone size={14} color="#6B7280" className="mr-1" />
          <Text className="text-gray-500 text-sm">{item.phone}</Text>
        </View>
      )}
      
      {item.address && (
        <View className="flex-row items-center mt-1">
          <MapPin size={14} color="#6B7280" className="mr-1" />
          <Text className="text-gray-500 text-sm">{item.address}</Text>
        </View>
      )}
    </TouchableOpacity>
  );

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      <StatusBar style="dark" />
      
      <View className="flex-row justify-between items-center p-4 border-b border-gray-200 bg-white">
        <View className="flex-row items-center">
          <TouchableOpacity onPress={() => router.back()} className="mr-4">
            <ArrowLeft size={24} color="#0F172A" />
          </TouchableOpacity>
          <Text className="text-xl font-bold text-gray-800">Suppliers</Text>
        </View>
        <TouchableOpacity
          className="bg-blue-500 p-2 rounded-full"
          onPress={handleAddSupplier}
        >
          <Plus size={20} color="#FFFFFF" />
        </TouchableOpacity>
      </View>
      
      <View className="p-4 bg-white">
        <View className="flex-row items-center bg-gray-100 rounded-lg px-3 py-2">
          <Search size={20} color="#6B7280" />
          <TextInput
            className="flex-1 ml-2 text-gray-800"
            placeholder="Search suppliers..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholderTextColor="#9CA3AF"
          />
        </View>
      </View>
      
      <View className="flex-1 p-4">
        {loading ? (
          <View className="flex-1 justify-center items-center">
            <ActivityIndicator size="large" color="#3B82F6" />
            <Text className="text-gray-600 mt-2">Loading suppliers...</Text>
          </View>
        ) : filteredSuppliers.length > 0 ? (
          <FlatList
            data={filteredSuppliers}
            renderItem={renderSupplierItem}
            keyExtractor={(item) => item.id}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: 20 }}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
            }
          />
        ) : (
          <View className="flex-1 justify-center items-center">
            <Building size={64} color="#D1D5DB" />
            <Text className="text-gray-500 mt-4 text-lg">No suppliers found</Text>
            <Text className="text-gray-400 text-center mt-2 mb-6">
              {searchQuery
                ? `No suppliers match "${searchQuery}"`
                : "Add your first supplier to get started"}
            </Text>
            {!searchQuery && (
              <TouchableOpacity
                className="bg-blue-500 rounded-lg px-4 py-3 flex-row items-center"
                onPress={handleAddSupplier}
              >
                <Plus size={20} color="#FFFFFF" />
                <Text className="text-white font-medium ml-2">Add Supplier</Text>
              </TouchableOpacity>
            )}
          </View>
        )}
      </View>
      
      {/* Supplier Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View className="flex-1 bg-black bg-opacity-50 justify-end">
          <View className="bg-white rounded-t-xl shadow-lg h-5/6">
            <View className="flex-row justify-between items-center p-4 border-b border-gray-200">
              <Text className="text-xl font-bold text-gray-800">
                {editingSupplier ? "Edit Supplier" : "Add New Supplier"}
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
                  placeholder="Enter supplier name"
                />
              </View>
              
              <View className="mb-4">
                <Text className="text-sm font-medium text-gray-700 mb-1">Contact Person</Text>
                <TextInput
                  className="bg-white border border-gray-300 rounded-lg px-4 py-3 text-gray-800"
                  value={contactName}
                  onChangeText={setContactName}
                  placeholder="Enter contact person name"
                />
              </View>
              
              <View className="mb-4">
                <Text className="text-sm font-medium text-gray-700 mb-1">Email</Text>
                <TextInput
                  className="bg-white border border-gray-300 rounded-lg px-4 py-3 text-gray-800"
                  value={email}
                  onChangeText={setEmail}
                  placeholder="Enter email address"
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
              </View>
              
              <View className="mb-4">
                <Text className="text-sm font-medium text-gray-700 mb-1">Phone</Text>
                <TextInput
                  className="bg-white border border-gray-300 rounded-lg px-4 py-3 text-gray-800"
                  value={phone}
                  onChangeText={setPhone}
                  placeholder="Enter phone number"
                  keyboardType="phone-pad"
                />
              </View>
              
              <View className="mb-4">
                <Text className="text-sm font-medium text-gray-700 mb-1">Address</Text>
                <TextInput
                  className="bg-white border border-gray-300 rounded-lg px-4 py-3 text-gray-800"
                  value={address}
                  onChangeText={setAddress}
                  placeholder="Enter address"
                  multiline
                  numberOfLines={3}
                  textAlignVertical="top"
                />
              </View>
            </View>
            
            <View className="p-4 border-t border-gray-200">
              <TouchableOpacity
                className="bg-blue-500 py-3 rounded-lg flex-row justify-center items-center"
                onPress={handleSaveSupplier}
                disabled={saveLoading}
              >
                {saveLoading ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <>
                    <Save size={20} color="#FFFFFF" />
                    <Text className="text-white font-bold ml-2">
                      {editingSupplier ? "Update Supplier" : "Add Supplier"}
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
