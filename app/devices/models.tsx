import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  ScrollView,
  ActivityIndicator,
  Alert,
  Modal,
  FlatList,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { useRouter } from "expo-router";
import {
  ArrowLeft,
  Plus,
  Search,
  Edit,
  Trash2,
  Save,
  X,
  Package,
} from "lucide-react-native";
import { supabase } from "../../lib/supabase";
import { Picker } from "@react-native-picker/picker";

// Define types
interface DeviceModel {
  id: string;
  name: string;
  manufacturer: string;
  category_id?: string;
  description?: string;
  specifications?: Record<string, any>;
  created_at: string;
}

interface DeviceCategory {
  id: string;
  name: string;
}

export default function DeviceModelsScreen() {
  const router = useRouter();
  const [models, setModels] = useState<DeviceModel[]>([]);
  const [filteredModels, setFilteredModels] = useState<DeviceModel[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [categories, setCategories] = useState<DeviceCategory[]>([]);

  // Modal states
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingModel, setEditingModel] = useState<DeviceModel | null>(null);
  const [modalName, setModalName] = useState("");
  const [modalManufacturer, setModalManufacturer] = useState("");
  const [modalCategory, setModalCategory] = useState<string | undefined>(undefined);
  const [modalDescription, setModalDescription] = useState("");
  const [modalProcessing, setModalProcessing] = useState(false);
  
  // Specifications
  const [modalSpecs, setModalSpecs] = useState<{key: string; value: string}[]>([]);
  const [newSpecKey, setNewSpecKey] = useState("");
  const [newSpecValue, setNewSpecValue] = useState("");

  useEffect(() => {
    // Check if table exists and create it if needed
    checkAndCreateTable();
    fetchDeviceModels();
    fetchCategories();
  }, []);

  useEffect(() => {
    if (searchQuery === "") {
      setFilteredModels(models);
    } else {
      const filtered = models.filter(
        (model) =>
          model.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          model.manufacturer.toLowerCase().includes(searchQuery.toLowerCase())
      );
      setFilteredModels(filtered);
    }
  }, [searchQuery, models]);

  // Function to check if table exists and create it if needed
  const checkAndCreateTable = async () => {
    try {
      console.log("Checking if device_models table exists...");
      
      // First, try to query the table to see if it exists
      const { error } = await supabase
        .from('device_models')
        .select('count(*)', { count: 'exact', head: true });
      
      if (error) {
        console.log("Error checking table, attempting to create it:", error);
        
        // Create the table since it doesn't exist
        const createTableSQL = `
          CREATE TABLE IF NOT EXISTS device_models (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            name TEXT NOT NULL,
            manufacturer TEXT NOT NULL,
            category_id UUID REFERENCES device_categories(id),
            description TEXT,
            specifications JSONB DEFAULT '{}'::jsonb,
            created_at TIMESTAMPTZ DEFAULT NOW(),
            updated_at TIMESTAMPTZ DEFAULT NOW()
          );
          
          -- Add RLS policies
          ALTER TABLE device_models ENABLE ROW LEVEL SECURITY;
          
          CREATE POLICY "Allow authenticated users to select device_models" 
              ON device_models FOR SELECT 
              USING (auth.role() = 'authenticated');
          
          CREATE POLICY "Allow authenticated users to insert device_models" 
              ON device_models FOR INSERT 
              WITH CHECK (auth.role() = 'authenticated');
          
          CREATE POLICY "Allow authenticated users to update device_models" 
              ON device_models FOR UPDATE 
              USING (auth.role() = 'authenticated')
              WITH CHECK (auth.role() = 'authenticated');
          
          CREATE POLICY "Allow authenticated users to delete device_models" 
              ON device_models FOR DELETE 
              USING (auth.role() = 'authenticated');
        `;
        
        // Execute SQL to create table
        const { error: sqlError } = await supabase.rpc('exec_sql', { sql: createTableSQL });
        
        if (sqlError) {
          console.error("Error creating table:", sqlError);
          Alert.alert("Database Error", "There was an error setting up the device models database. Please contact support.");
        } else {
          console.log("Successfully created device_models table");
          
          // Add the model_id column to devices table if needed
          const alterTableSQL = `
            ALTER TABLE devices ADD COLUMN IF NOT EXISTS model_id UUID REFERENCES device_models(id);
          `;
          
          const { error: alterError } = await supabase.rpc('exec_sql', { sql: alterTableSQL });
          if (alterError) {
            console.error("Error adding model_id column:", alterError);
          } else {
            console.log("Successfully added model_id column to devices table");
          }
        }
      } else {
        console.log("device_models table exists");
      }
    } catch (error) {
      console.error("Exception checking/creating table:", error);
    }
  };

  const fetchDeviceModels = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("device_models")
        .select(`*`)
        .order("name");

      if (error) {
        console.error("Error fetching device models:", error);
        Alert.alert("Error", "Failed to load device models");
        return;
      }

      // Transform data to properly handle category data
      const processedModels = data?.map(model => {
        return {
          ...model
        };
      }) || [];

      setModels(processedModels);
      setFilteredModels(processedModels);
    } catch (error) {
      console.error("Exception fetching device models:", error);
      Alert.alert("Error", "An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const { data, error } = await supabase
        .from("device_categories")
        .select("id, name")
        .order("name");

      if (error) {
        console.error("Error fetching categories:", error);
        Alert.alert("Error", "Failed to load device categories");
        return;
      }

      setCategories(data || []);
    } catch (error) {
      console.error("Exception fetching categories:", error);
    }
  };

  const openAddModal = () => {
    setEditingModel(null);
    setModalName("");
    setModalManufacturer("");
    setModalCategory(undefined);
    setModalDescription("");
    setModalSpecs([]);
    setShowAddModal(true);
  };

  const openEditModal = (model: DeviceModel) => {
    setEditingModel(model);
    setModalName(model.name);
    setModalManufacturer(model.manufacturer);
    setModalCategory(model.category_id);
    setModalDescription(model.description || "");
    
    // Transform specifications object to array
    const specs = [];
    if (model.specifications) {
      for (const [key, value] of Object.entries(model.specifications)) {
        specs.push({ key, value: String(value) });
      }
    }
    setModalSpecs(specs);
    
    setShowAddModal(true);
  };

  const addSpecification = () => {
    if (!newSpecKey.trim()) {
      Alert.alert("Error", "Specification key is required");
      return;
    }
    
    // Check if key already exists
    if (modalSpecs.some(spec => spec.key === newSpecKey.trim())) {
      Alert.alert("Error", "A specification with this key already exists");
      return;
    }
    
    setModalSpecs([...modalSpecs, { key: newSpecKey.trim(), value: newSpecValue }]);
    setNewSpecKey("");
    setNewSpecValue("");
  };
  
  const removeSpecification = (index: number) => {
    const newSpecs = [...modalSpecs];
    newSpecs.splice(index, 1);
    setModalSpecs(newSpecs);
  };

  const handleSave = async () => {
    if (!modalName || !modalManufacturer) {
      Alert.alert("Error", "Name and manufacturer are required");
      return;
    }

    try {
      setModalProcessing(true);
      
      // Convert specs array to object
      const specifications: Record<string, any> = {};
      modalSpecs.forEach(spec => {
        specifications[spec.key] = spec.value;
      });

      const modelData = {
        name: modalName,
        manufacturer: modalManufacturer,
        category_id: modalCategory || null,
        description: modalDescription || null,
        specifications
      };

      console.log("Saving model with data:", modelData);

      if (editingModel) {
        // Update existing model
        const { data, error } = await supabase
          .from("device_models")
          .update(modelData)
          .eq("id", editingModel.id)
          .select();

        if (error) {
          console.error("Error updating model:", error);
          Alert.alert("Error", `Failed to update device model: ${error.message}`);
          return;
        }

        Alert.alert("Success", "Device model updated successfully");
      } else {
        // Create new model
        const { data, error } = await supabase
          .from("device_models")
          .insert(modelData)
          .select();

        if (error) {
          console.error("Error creating model:", error);
          Alert.alert("Error", `Failed to create device model: ${error.message}`);
          return;
        }

        Alert.alert("Success", "Device model created successfully");
      }

      // Refresh data
      fetchDeviceModels();
      setShowAddModal(false);
    } catch (error) {
      console.error("Exception saving device model:", error);
      Alert.alert("Error", "An unexpected error occurred");
    } finally {
      setModalProcessing(false);
    }
  };

  const handleDelete = async (modelId: string) => {
    // Confirm deletion
    Alert.alert(
      "Delete Model",
      "Are you sure you want to delete this model?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              const { error } = await supabase
                .from("device_models")
                .delete()
                .eq("id", modelId);

              if (error) {
                console.error("Error deleting model:", error);
                Alert.alert("Error", `Failed to delete device model: ${error.message}`);
                return;
              }

              Alert.alert("Success", "Device model deleted successfully");
              fetchDeviceModels();
            } catch (error) {
              console.error("Exception deleting model:", error);
              Alert.alert("Error", "An unexpected error occurred");
            }
          },
        },
      ]
    );
  };

  const renderItem = ({ item }: { item: DeviceModel }) => (
    <View className="bg-white p-4 rounded-lg shadow-sm mb-3">
      <View className="flex-row justify-between">
        <View className="flex-1">
          <Text className="text-lg font-semibold text-gray-800">{item.name}</Text>
          <Text className="text-sm text-gray-600 mb-1">{item.manufacturer}</Text>
          
          {item.category_id && (
            <Text className="text-xs text-gray-500">
              Category: {categories.find(c => c.id === item.category_id)?.name || "Unknown"}
            </Text>
          )}
        </View>
        
        <View className="flex-row">
          <TouchableOpacity
            className="bg-blue-100 p-2 rounded-full mr-2"
            onPress={() => openEditModal(item)}
          >
            <Edit size={16} color="#1D4ED8" />
          </TouchableOpacity>
          
          <TouchableOpacity
            className="bg-red-100 p-2 rounded-full"
            onPress={() => handleDelete(item.id)}
          >
            <Trash2 size={16} color="#DC2626" />
          </TouchableOpacity>
        </View>
      </View>
      
      {item.description && (
        <Text className="text-gray-700 mt-2">{item.description}</Text>
      )}
      
      {item.specifications && Object.keys(item.specifications).length > 0 && (
        <View className="mt-2 border-t border-gray-100 pt-2">
          <Text className="text-sm font-medium text-gray-700 mb-1">Specifications:</Text>
          
          {Object.entries(item.specifications).map(([key, value], index) => (
            <Text key={index} className="text-xs text-gray-600">
              • {key}: {value}
            </Text>
          ))}
        </View>
      )}
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
          <Text className="text-xl font-bold text-gray-800">Device Models</Text>
        </View>
        
        <TouchableOpacity
          className="bg-blue-500 px-3 py-2 rounded-lg flex-row items-center"
          onPress={openAddModal}
        >
          <Plus size={16} color="#FFFFFF" className="mr-1" />
          <Text className="text-white font-medium">Add Model</Text>
        </TouchableOpacity>
      </View>
      
      <View className="px-4 py-3">
        <View className="flex-row items-center bg-white border border-gray-300 rounded-lg px-3 py-1">
          <Search size={18} color="#9CA3AF" />
          <TextInput
            className="flex-1 ml-2 text-gray-800"
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Search models..."
          />
          {searchQuery !== "" && (
            <TouchableOpacity onPress={() => setSearchQuery("")}>
              <X size={18} color="#9CA3AF" />
            </TouchableOpacity>
          )}
        </View>
      </View>
      
      {loading ? (
        <View className="flex-1 justify-center items-center">
          <ActivityIndicator size="large" color="#4F46E5" />
          <Text className="mt-2 text-gray-600">Loading device models...</Text>
        </View>
      ) : (
        <FlatList
          data={filteredModels}
          renderItem={renderItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ padding: 16 }}
          ListEmptyComponent={
            <View className="bg-white rounded-lg p-4 flex items-center justify-center">
              <Package size={40} color="#9CA3AF" />
              <Text className="text-lg text-gray-600 mt-2">
                {searchQuery
                  ? "No models match your search"
                  : "No device models found"}
              </Text>
              <Text className="text-sm text-gray-500 mt-1">
                {searchQuery
                  ? "Try a different search term"
                  : "Add your first device model"}
              </Text>
            </View>
          }
        />
      )}
      
      {/* Add/Edit Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={showAddModal}
        onRequestClose={() => setShowAddModal(false)}
      >
        <View className="flex-1 justify-end bg-black/50">
          <View className="bg-white rounded-t-xl h-4/5">
            <View className="flex-row justify-between items-center p-4 border-b border-gray-200">
              <Text className="text-lg font-semibold text-gray-800">
                {editingModel ? "Edit Device Model" : "Add Device Model"}
              </Text>
              <TouchableOpacity
                onPress={() => setShowAddModal(false)}
                disabled={modalProcessing}
              >
                <X size={24} color="#0F172A" />
              </TouchableOpacity>
            </View>
            
            <ScrollView className="p-4">
              <View className="space-y-4">
                <View>
                  <Text className="text-sm font-medium text-gray-700 mb-1">
                    Model Name *
                  </Text>
                  <TextInput
                    className="bg-white border border-gray-300 rounded-lg px-4 py-3"
                    value={modalName}
                    onChangeText={setModalName}
                    placeholder="Enter model name"
                  />
                </View>
                
                <View>
                  <Text className="text-sm font-medium text-gray-700 mb-1">
                    Manufacturer *
                  </Text>
                  <TextInput
                    className="bg-white border border-gray-300 rounded-lg px-4 py-3"
                    value={modalManufacturer}
                    onChangeText={setModalManufacturer}
                    placeholder="Enter manufacturer"
                  />
                </View>
                
                <View>
                  <Text className="text-sm font-medium text-gray-700 mb-1">
                    Category
                  </Text>
                  <View className="bg-white border border-gray-300 rounded-lg">
                    <Picker
                      selectedValue={modalCategory}
                      onValueChange={(itemValue) => setModalCategory(itemValue)}
                    >
                      <Picker.Item label="Select category (optional)" value={undefined} />
                      {categories.map((category) => (
                        <Picker.Item
                          key={category.id}
                          label={category.name}
                          value={category.id}
                        />
                      ))}
                    </Picker>
                  </View>
                </View>
                
                <View>
                  <Text className="text-sm font-medium text-gray-700 mb-1">
                    Description
                  </Text>
                  <TextInput
                    className="bg-white border border-gray-300 rounded-lg px-4 py-3"
                    value={modalDescription}
                    onChangeText={setModalDescription}
                    placeholder="Enter description (optional)"
                    multiline
                    numberOfLines={3}
                    textAlignVertical="top"
                  />
                </View>
                
                {/* Specifications */}
                <View>
                  <View className="flex-row justify-between items-center mb-2">
                    <Text className="text-sm font-medium text-gray-700">
                      Specifications
                    </Text>
                  </View>
                  
                  {modalSpecs.map((spec, index) => (
                    <View key={index} className="flex-row items-center mb-2">
                      <View className="flex-1 mr-2">
                        <Text className="text-xs text-gray-500">{spec.key}:</Text>
                        <Text className="text-sm text-gray-800">{spec.value}</Text>
                      </View>
                      <TouchableOpacity
                        className="bg-red-100 p-2 rounded-full"
                        onPress={() => removeSpecification(index)}
                      >
                        <X size={14} color="#DC2626" />
                      </TouchableOpacity>
                    </View>
                  ))}
                  
                  <View className="bg-gray-50 p-3 rounded-lg mb-2">
                    <View className="mb-2">
                      <Text className="text-xs font-medium text-gray-700 mb-1">
                        Key
                      </Text>
                      <TextInput
                        className="bg-white border border-gray-300 rounded-lg px-3 py-2 text-sm"
                        value={newSpecKey}
                        onChangeText={setNewSpecKey}
                        placeholder="e.g. Weight, Dimensions, Power"
                      />
                    </View>
                    
                    <View className="mb-2">
                      <Text className="text-xs font-medium text-gray-700 mb-1">
                        Value
                      </Text>
                      <TextInput
                        className="bg-white border border-gray-300 rounded-lg px-3 py-2 text-sm"
                        value={newSpecValue}
                        onChangeText={setNewSpecValue}
                        placeholder="e.g. 5kg, 10x15x20 cm, 220V"
                      />
                    </View>
                    
                    <TouchableOpacity
                      className="bg-blue-500 rounded-lg py-2 items-center mt-1"
                      onPress={addSpecification}
                    >
                      <Text className="text-white text-sm font-medium">
                        Add Specification
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            </ScrollView>
            
            <View className="p-4 border-t border-gray-200">
              <TouchableOpacity
                className="bg-blue-500 rounded-lg py-3 items-center"
                onPress={handleSave}
                disabled={modalProcessing}
              >
                {modalProcessing ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <View className="flex-row items-center">
                    <Save size={18} color="#FFFFFF" className="mr-1" />
                    <Text className="text-white font-semibold">
                      {editingModel ? "Update Model" : "Save Model"}
                    </Text>
                  </View>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
} 