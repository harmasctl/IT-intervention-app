import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  FlatList,
  ActivityIndicator,
  Modal,
  Alert,
  ScrollView,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { useRouter } from "expo-router";
import {
  ArrowLeft,
  Plus,
  Search,
  Building2,
  Phone,
  Mail,
  MapPin,
  Edit,
  Trash2,
} from "lucide-react-native";
import { supabase } from "../../lib/supabase";
import EquipmentTabs from "../../components/EquipmentTabs";

type Supplier = {
  id: string;
  name: string;
  contact_person?: string;
  email?: string;
  phone?: string;
  address?: string;
};

export default function SuppliersScreen() {
  const router = useRouter();
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(
    null,
  );

  // Form states
  const [name, setName] = useState("");
  const [contactPerson, setContactPerson] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");

  useEffect(() => {
    fetchSuppliers();

    // Set up real-time subscription for supplier changes
    const supplierSubscription = supabase
      .channel("supplier-changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "suppliers" },
        (payload) => {
          console.log("Supplier change received:", payload);
          fetchSuppliers();
        },
      )
      .subscribe();

    return () => {
      supplierSubscription.unsubscribe();
    };
  }, []);

  const fetchSuppliers = useCallback(async () => {
    try {
      setLoading(true);

      const { data, error } = await supabase
        .from("suppliers")
        .select("*")
        .order("name");

      if (error) throw error;

      if (data) {
        setSuppliers(data as Supplier[]);
      }
    } catch (error) {
      console.error("Error fetching suppliers:", error);
      Alert.alert("Error", "Failed to load suppliers");
    } finally {
      setLoading(false);
    }
  }, []);

  const handleAddSupplier = () => {
    // Reset form fields
    setName("");
    setContactPerson("");
    setEmail("");
    setPhone("");
    setAddress("");
    setShowAddModal(true);
  };

  const handleEditSupplier = (supplier: Supplier) => {
    setSelectedSupplier(supplier);
    setName(supplier.name);
    setContactPerson(supplier.contact_person || "");
    setEmail(supplier.email || "");
    setPhone(supplier.phone || "");
    setAddress(supplier.address || "");
    setShowEditModal(true);
  };

  const handleDeleteSupplier = (id: string) => {
    Alert.alert(
      "Delete Supplier",
      "Are you sure you want to delete this supplier?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              const { error } = await supabase
                .from("suppliers")
                .delete()
                .eq("id", id);

              if (error) throw error;

              // Update local state
              setSuppliers(suppliers.filter((supplier) => supplier.id !== id));
              Alert.alert("Success", "Supplier deleted successfully");
            } catch (error) {
              console.error("Error deleting supplier:", error);
              Alert.alert("Error", "Failed to delete supplier");
            }
          },
        },
      ],
    );
  };

  const handleSubmitAdd = async () => {
    if (!name) {
      Alert.alert("Error", "Please enter supplier name");
      return;
    }

    try {
      const newSupplier = {
        name,
        contact_person: contactPerson || null,
        email: email || null,
        phone: phone || null,
        address: address || null,
      };

      const { data, error } = await supabase
        .from("suppliers")
        .insert([newSupplier])
        .select();

      if (error) throw error;

      // Update local state with the returned data
      if (data && data.length > 0) {
        setSuppliers([...suppliers, data[0] as Supplier]);
      }

      setShowAddModal(false);
      Alert.alert("Success", "Supplier added successfully");
    } catch (error) {
      console.error("Error adding supplier:", error);
      Alert.alert("Error", "Failed to add supplier");
    }
  };

  const handleSubmitEdit = async () => {
    if (!selectedSupplier || !name) {
      Alert.alert("Error", "Please enter supplier name");
      return;
    }

    try {
      const updatedSupplier = {
        name,
        contact_person: contactPerson || null,
        email: email || null,
        phone: phone || null,
        address: address || null,
      };

      const { data, error } = await supabase
        .from("suppliers")
        .update(updatedSupplier)
        .eq("id", selectedSupplier.id)
        .select();

      if (error) throw error;

      // Update local state with the returned data
      if (data && data.length > 0) {
        setSuppliers(
          suppliers.map((supplier) =>
            supplier.id === selectedSupplier.id
              ? (data[0] as Supplier)
              : supplier,
          ),
        );
      }

      setShowEditModal(false);
      Alert.alert("Success", "Supplier updated successfully");
    } catch (error) {
      console.error("Error updating supplier:", error);
      Alert.alert("Error", "Failed to update supplier");
    }
  };

  const filteredSuppliers = suppliers.filter((supplier) => {
    return (
      supplier.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (supplier.contact_person &&
        supplier.contact_person
          .toLowerCase()
          .includes(searchQuery.toLowerCase())) ||
      (supplier.email &&
        supplier.email.toLowerCase().includes(searchQuery.toLowerCase()))
    );
  });

  const renderSupplierItem = ({ item }: { item: Supplier }) => (
    <View className="bg-white rounded-lg p-4 mb-3 shadow-sm border border-gray-100">
      <View className="flex-row justify-between items-start">
        <Text className="font-bold text-lg text-gray-800">{item.name}</Text>
        <View className="flex-row">
          <TouchableOpacity
            className="p-2 mr-2"
            onPress={() => handleEditSupplier(item)}
          >
            <Edit size={18} color="#f59e0b" />
          </TouchableOpacity>
          <TouchableOpacity
            className="p-2"
            onPress={() => handleDeleteSupplier(item.id)}
          >
            <Trash2 size={18} color="#dc2626" />
          </TouchableOpacity>
        </View>
      </View>

      {item.contact_person && (
        <Text className="text-gray-700 mt-2">
          Contact: {item.contact_person}
        </Text>
      )}

      {item.email && (
        <View className="flex-row items-center mt-2">
          <Mail size={16} color="#6b7280" />
          <Text className="text-gray-700 ml-2">{item.email}</Text>
        </View>
      )}

      {item.phone && (
        <View className="flex-row items-center mt-2">
          <Phone size={16} color="#6b7280" />
          <Text className="text-gray-700 ml-2">{item.phone}</Text>
        </View>
      )}

      {item.address && (
        <View className="flex-row items-center mt-2">
          <MapPin size={16} color="#6b7280" />
          <Text className="text-gray-700 ml-2">{item.address}</Text>
        </View>
      )}
    </View>
  );

  return (
    <SafeAreaView className="flex-1 bg-white">
      <StatusBar style="auto" />

      {/* Header */}
      <View className="flex-row justify-between items-center px-4 py-3 border-b border-gray-200">
        <TouchableOpacity
          onPress={() => router.back()}
          className="flex-row items-center"
        >
          <ArrowLeft size={20} color="#3b82f6" />
          <Text className="text-blue-500 ml-1">Back</Text>
        </TouchableOpacity>
        <Text className="text-xl font-bold text-blue-800">Stock Suppliers</Text>
        <TouchableOpacity
          className="bg-blue-600 p-2 rounded-full"
          onPress={handleAddSupplier}
        >
          <Plus size={20} color="white" />
        </TouchableOpacity>
      </View>

      {/* Search */}
      <View className="p-4 border-b border-gray-200">
        <View className="flex-row items-center bg-gray-100 rounded-lg px-3 py-2">
          <Search size={20} color="#6b7280" />
          <TextInput
            className="flex-1 ml-2 py-1"
            placeholder="Search suppliers"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
      </View>

      {/* Suppliers list */}
      <View className="flex-1 p-4 bg-gray-50">
        {loading ? (
          <View className="flex-1 justify-center items-center">
            <ActivityIndicator size="large" color="#1e40af" />
            <Text className="mt-2 text-gray-600">Loading suppliers...</Text>
          </View>
        ) : filteredSuppliers.length > 0 ? (
          <FlatList
            data={filteredSuppliers}
            renderItem={renderSupplierItem}
            keyExtractor={(item) => item.id}
            showsVerticalScrollIndicator={false}
            refreshing={loading}
            onRefresh={() => {
              setLoading(true);
              fetchSuppliers();
            }}
            contentContainerStyle={{ paddingBottom: 20 }}
          />
        ) : (
          <View className="flex-1 justify-center items-center">
            <Building2 size={48} color="#9ca3af" />
            <Text className="mt-4 text-gray-500 text-center">
              No suppliers found
            </Text>
            <TouchableOpacity
              className="mt-4 bg-blue-600 px-4 py-2 rounded-lg"
              onPress={handleAddSupplier}
            >
              <Text className="text-white font-medium">Add Supplier</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* Add Supplier Modal */}
      <Modal
        visible={showAddModal}
        animationType="slide"
        transparent={false}
        onRequestClose={() => setShowAddModal(false)}
      >
        <SafeAreaView className="flex-1 bg-white">
          <View className="flex-row justify-between items-center px-4 py-3 border-b border-gray-200">
            <TouchableOpacity onPress={() => setShowAddModal(false)}>
              <Text className="text-blue-600 font-medium">Cancel</Text>
            </TouchableOpacity>
            <Text className="text-xl font-bold text-blue-800">
              Add Supplier
            </Text>
            <TouchableOpacity onPress={handleSubmitAdd}>
              <Text className="text-blue-600 font-medium">Save</Text>
            </TouchableOpacity>
          </View>

          <View className="p-4">
            <View className="mb-4">
              <Text className="text-gray-700 mb-2 font-medium">
                Supplier Name *
              </Text>
              <TextInput
                className="border border-gray-300 rounded-lg p-3 bg-white"
                placeholder="Enter supplier name"
                value={name}
                onChangeText={setName}
              />
            </View>

            <View className="mb-4">
              <Text className="text-gray-700 mb-2 font-medium">
                Contact Person
              </Text>
              <TextInput
                className="border border-gray-300 rounded-lg p-3 bg-white"
                placeholder="Enter contact person name"
                value={contactPerson}
                onChangeText={setContactPerson}
              />
            </View>

            <View className="mb-4">
              <Text className="text-gray-700 mb-2 font-medium">Email</Text>
              <TextInput
                className="border border-gray-300 rounded-lg p-3 bg-white"
                placeholder="Enter email address"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>

            <View className="mb-4">
              <Text className="text-gray-700 mb-2 font-medium">Phone</Text>
              <TextInput
                className="border border-gray-300 rounded-lg p-3 bg-white"
                placeholder="Enter phone number"
                value={phone}
                onChangeText={setPhone}
                keyboardType="phone-pad"
              />
            </View>

            <View className="mb-4">
              <Text className="text-gray-700 mb-2 font-medium">Address</Text>
              <TextInput
                className="border border-gray-300 rounded-lg p-3 bg-white h-24"
                placeholder="Enter address"
                value={address}
                onChangeText={setAddress}
                multiline
                textAlignVertical="top"
              />
            </View>
          </View>
        </SafeAreaView>
      </Modal>

      {/* Edit Supplier Modal */}
      <Modal
        visible={showEditModal}
        animationType="slide"
        transparent={false}
        onRequestClose={() => setShowEditModal(false)}
      >
        <SafeAreaView className="flex-1 bg-white">
          <View className="flex-row justify-between items-center px-4 py-3 border-b border-gray-200">
            <TouchableOpacity onPress={() => setShowEditModal(false)}>
              <Text className="text-blue-600 font-medium">Cancel</Text>
            </TouchableOpacity>
            <Text className="text-xl font-bold text-blue-800">
              Edit Supplier
            </Text>
            <TouchableOpacity onPress={handleSubmitEdit}>
              <Text className="text-blue-600 font-medium">Save</Text>
            </TouchableOpacity>
          </View>

          <View className="p-4">
            <View className="mb-4">
              <Text className="text-gray-700 mb-2 font-medium">
                Supplier Name *
              </Text>
              <TextInput
                className="border border-gray-300 rounded-lg p-3 bg-white"
                placeholder="Enter supplier name"
                value={name}
                onChangeText={setName}
              />
            </View>

            <View className="mb-4">
              <Text className="text-gray-700 mb-2 font-medium">
                Contact Person
              </Text>
              <TextInput
                className="border border-gray-300 rounded-lg p-3 bg-white"
                placeholder="Enter contact person name"
                value={contactPerson}
                onChangeText={setContactPerson}
              />
            </View>

            <View className="mb-4">
              <Text className="text-gray-700 mb-2 font-medium">Email</Text>
              <TextInput
                className="border border-gray-300 rounded-lg p-3 bg-white"
                placeholder="Enter email address"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>

            <View className="mb-4">
              <Text className="text-gray-700 mb-2 font-medium">Phone</Text>
              <TextInput
                className="border border-gray-300 rounded-lg p-3 bg-white"
                placeholder="Enter phone number"
                value={phone}
                onChangeText={setPhone}
                keyboardType="phone-pad"
              />
            </View>

            <View className="mb-4">
              <Text className="text-gray-700 mb-2 font-medium">Address</Text>
              <TextInput
                className="border border-gray-300 rounded-lg p-3 bg-white h-24"
                placeholder="Enter address"
                value={address}
                onChangeText={setAddress}
                multiline
                textAlignVertical="top"
              />
            </View>
          </View>
        </SafeAreaView>
      </Modal>

      {/* Bottom Tabs */}
      <EquipmentTabs activeTab="suppliers" />
    </SafeAreaView>
  );
}
