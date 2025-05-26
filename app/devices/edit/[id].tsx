import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  Image,
  Switch,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { useLocalSearchParams, useRouter } from "expo-router";
import {
  ArrowLeft,
  Save,
  Camera,
  Package,
  Plus,
  X,
  Calendar,
  Building2,
  QrCode,
} from "lucide-react-native";
import { supabase } from "../../../lib/supabase";
import * as ImagePicker from "expo-image-picker";
import { decode } from "base64-arraybuffer";
import DateTimePicker from "@react-native-community/datetimepicker";
import { Picker } from "@react-native-picker/picker";

type DeviceCategory = {
  id: string;
  name: string;
  maintenance_interval?: number;
};

type CustomField = {
  name: string;
  type: "text" | "number" | "boolean" | "date" | "selection";
  options?: string[];
  value: any;
  required?: boolean;
  showPicker?: boolean;
};

export default function EditDeviceScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const [name, setName] = useState("");
  const [serialNumber, setSerialNumber] = useState("");
  const [model, setModel] = useState("");
  const [type, setType] = useState("");
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [currentImage, setCurrentImage] = useState<string | null>(null);
  const [status, setStatus] = useState<"operational" | "maintenance" | "offline">("operational");
  const [selectedRestaurant, setSelectedRestaurant] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [restaurants, setRestaurants] = useState<{ id: string; name: string }[]>([]);
  const [categories, setCategories] = useState<DeviceCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [showPurchaseDatePicker, setShowPurchaseDatePicker] = useState(false);
  const [showWarrantyDatePicker, setShowWarrantyDatePicker] = useState(false);
  const [purchaseDate, setPurchaseDate] = useState<Date | null>(null);
  const [warrantyExpiry, setWarrantyExpiry] = useState<Date | null>(null);
  const [customFields, setCustomFields] = useState<CustomField[]>([]);

  useEffect(() => {
    if (id) {
      fetchDevice();
      fetchRestaurants();
      fetchCategories();
    }
  }, [id]);

  const fetchDevice = async () => {
    try {
      const { data, error } = await supabase
        .from("devices")
        .select("*")
        .eq("id", id)
        .single();

      if (error) {
        console.error("Error fetching device:", error);
        Alert.alert("Error", "Failed to load device");
        return;
      }

      // Set form fields
      setName(data.name);
      setSerialNumber(data.serial_number);
      setModel(data.model || "");
      setType(data.type);
      setStatus(data.status || "operational");
      setSelectedRestaurant(data.restaurant_id);
      setSelectedCategory(data.category_id || null);
      setCurrentImage(data.image || null);

      // Handle dates
      if (data.purchase_date) {
        setPurchaseDate(new Date(data.purchase_date));
      }
      if (data.warranty_expiry) {
        setWarrantyExpiry(new Date(data.warranty_expiry));
      }

      // Handle custom fields
      if (data.custom_fields) {
        const customFieldsArray: CustomField[] = [];
        for (const [name, value] of Object.entries(data.custom_fields)) {
          // Determine type
          let type: CustomField["type"] = "text";
          if (typeof value === "number") type = "number";
          else if (typeof value === "boolean") type = "boolean";
          else if (value instanceof Date || (typeof value === "string" && !isNaN(Date.parse(value)))) type = "date";

          customFieldsArray.push({
            name,
            type,
            value: type === "date" ? new Date(value as string) : value,
          });
        }
        setCustomFields(customFieldsArray);
      }
    } catch (error) {
      console.error("Exception fetching device:", error);
      Alert.alert("Error", "An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  };

  const fetchRestaurants = async () => {
    try {
      const { data, error } = await supabase
        .from("restaurants")
        .select("id, name")
        .order("name");

      if (error) {
        throw error;
      }

      setRestaurants(data || []);
    } catch (error) {
      console.error("Error fetching restaurants:", error);
      Alert.alert("Error", "Failed to load restaurants");
    }
  };

  const fetchCategories = async () => {
    try {
      const { data, error } = await supabase
        .from("device_categories")
        .select("id, name, maintenance_interval")
        .order("name");

      if (error) {
        throw error;
      }

      setCategories(data || []);
    } catch (error) {
      console.error("Error fetching categories:", error);
      Alert.alert("Error", "Failed to load device categories");
    }
  };

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    
    if (status !== "granted") {
      Alert.alert("Permission needed", "Please grant permission to access your photos");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
      base64: true,
    });

    if (!result.canceled && result.assets && result.assets[0].uri) {
      setImageUri(result.assets[0].uri);
    }
  };

  const captureImage = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    
    if (status !== "granted") {
      Alert.alert("Permission needed", "Please grant permission to access your camera");
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
      base64: true,
    });

    if (!result.canceled && result.assets && result.assets[0].uri) {
      setImageUri(result.assets[0].uri);
    }
  };

  const uploadImage = async (): Promise<string | null> => {
    if (!imageUri) return currentImage;
    
    try {
      setUploading(true);
      
      // Convert to base64 then to ArrayBuffer
      const imageResponse = await fetch(imageUri);
      const blob = await imageResponse.blob();
      const reader = new FileReader();
      
      return new Promise((resolve, reject) => {
        reader.onload = async () => {
          const base64 = reader.result as string;
          const base64Data = base64.split(',')[1];
          const arrayBuffer = decode(base64Data);
          
          // Upload to Supabase Storage
          const fileExt = imageUri.split('.').pop()?.toLowerCase() || 'jpg';
          const filePath = `${id}.${fileExt}`;
          
          const { data, error } = await supabase.storage
            .from('device-images')
            .upload(filePath, arrayBuffer, {
              contentType: `image/${fileExt}`,
              upsert: true,
            });
            
          if (error) {
            console.error('Error uploading image:', error);
            reject(null);
            return;
          }
          
          // Get public URL
          const { data: { publicUrl } } = supabase.storage
            .from('device-images')
            .getPublicUrl(filePath);
            
          resolve(publicUrl);
        };
        
        reader.onerror = () => {
          console.error('Error reading file');
          reject(null);
        };
        
        reader.readAsDataURL(blob);
      });
    } catch (error) {
      console.error('Error in upload process:', error);
      return currentImage;
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async () => {
    if (!name || !serialNumber || !type) {
      Alert.alert("Error", "Name, serial number, and type are required");
      return;
    }

    if (!selectedRestaurant) {
      Alert.alert("Error", "Please select a restaurant");
      return;
    }

    setLoading(true);

    try {
      // Format custom fields for database
      const customFieldsObject: Record<string, any> = {};
      
      customFields.forEach(field => {
        customFieldsObject[field.name] = field.value;
      });

      // Upload image if changed
      let imageUrl = currentImage;
      if (imageUri) {
        imageUrl = await uploadImage();
      }

      // Update device in database
      const { error } = await supabase
        .from("devices")
        .update({
          name,
          serial_number: serialNumber,
          model,
          type,
          status,
          restaurant_id: selectedRestaurant,
          category_id: selectedCategory,
          purchase_date: purchaseDate?.toISOString(),
          warranty_expiry: warrantyExpiry?.toISOString(),
          custom_fields: customFieldsObject,
          image: imageUrl
        })
        .eq("id", id);

      if (error) {
        throw error;
      }

      Alert.alert(
        "Success",
        "Device updated successfully",
        [{ text: "OK", onPress: () => router.back() }]
      );
    } catch (error) {
      console.error("Error updating device:", error);
      Alert.alert("Error", "Failed to update device");
    } finally {
      setLoading(false);
    }
  };

  const updateCustomFieldValue = (index: number, value: any) => {
    const updatedFields = [...customFields];
    updatedFields[index].value = value;
    setCustomFields(updatedFields);
  };

  const removeCustomField = (index: number) => {
    const updatedFields = customFields.filter((_, i) => i !== index);
    setCustomFields(updatedFields);
  };

  const renderCustomFieldInput = (field: CustomField, index: number) => {
    switch (field.type) {
      case "text":
        return (
          <TextInput
            className="bg-white border border-gray-300 rounded-lg px-4 py-3 text-gray-800"
            value={field.value}
            onChangeText={(text) => updateCustomFieldValue(index, text)}
            placeholder={`Enter ${field.name}`}
          />
        );
      
      case "number":
        return (
          <TextInput
            className="bg-white border border-gray-300 rounded-lg px-4 py-3 text-gray-800"
            value={String(field.value)}
            onChangeText={(text) => {
              const numValue = text === "" ? 0 : Number(text);
              if (!isNaN(numValue)) {
                updateCustomFieldValue(index, numValue);
              }
            }}
            keyboardType="numeric"
            placeholder={`Enter ${field.name}`}
          />
        );
      
      case "boolean":
        return (
          <View className="flex-row items-center justify-between bg-white border border-gray-300 rounded-lg px-4 py-3">
            <Text className="text-gray-700">{field.value ? "Yes" : "No"}</Text>
            <Switch
              value={field.value}
              onValueChange={(value) => updateCustomFieldValue(index, value)}
            />
          </View>
        );
      
      case "date":
        return (
          <TouchableOpacity
            className="bg-white border border-gray-300 rounded-lg px-4 py-3 flex-row justify-between items-center"
            onPress={() => {
              // Show date picker for this specific field
              const tempFields = [...customFields];
              tempFields[index].showPicker = true;
              setCustomFields(tempFields);
            }}
          >
            <Text className="text-gray-700">
              {field.value instanceof Date
                ? field.value.toLocaleDateString()
                : "Select date"}
            </Text>
            <Calendar size={20} color="#6B7280" />
            
            {field.showPicker && (
              <DateTimePicker
                value={field.value instanceof Date ? field.value : new Date()}
                mode="date"
                display="default"
                onChange={(event, selectedDate) => {
                  const tempFields = [...customFields];
                  tempFields[index].showPicker = false;
                  setCustomFields(tempFields);
                  
                  if (event.type === "set" && selectedDate) {
                    updateCustomFieldValue(index, selectedDate);
                  }
                }}
              />
            )}
          </TouchableOpacity>
        );
      
      case "selection":
        return (
          <View className="bg-white border border-gray-300 rounded-lg px-1 py-1">
            <Picker
              selectedValue={field.value}
              onValueChange={(itemValue) => updateCustomFieldValue(index, itemValue)}
            >
              {field.options?.map((option, i) => (
                <Picker.Item key={i} label={option} value={option} />
              ))}
            </Picker>
          </View>
        );
      
      default:
        return null;
    }
  };

  if (loading) {
    return (
      <SafeAreaView className="flex-1 bg-gray-50 justify-center items-center">
        <StatusBar style="dark" />
        <ActivityIndicator size="large" color="#3B82F6" />
        <Text className="text-gray-600 mt-4">Loading device...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      <StatusBar style="dark" />
      
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        className="flex-1"
      >
        <View className="flex-row justify-between items-center p-4 border-b border-gray-200 bg-white">
          <View className="flex-row items-center">
            <TouchableOpacity onPress={() => router.back()} className="mr-4">
              <ArrowLeft size={24} color="#0F172A" />
            </TouchableOpacity>
            <Text className="text-xl font-bold text-gray-800">Edit Device</Text>
          </View>
          <TouchableOpacity
            className="bg-blue-500 px-4 py-2 rounded-lg flex-row items-center"
            onPress={handleSave}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <>
                <Save size={18} color="#FFFFFF" />
                <Text className="text-white font-medium ml-2">Save</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
        
        <ScrollView className="flex-1 p-4" showsVerticalScrollIndicator={false}>
          <View className="bg-white rounded-lg shadow-sm p-4 mb-6">
            <Text className="text-lg font-semibold text-gray-800 mb-4">Device Information</Text>
            
            {/* Device Image */}
            <View className="flex items-center mb-6">
              <View className="mb-3 bg-gray-100 rounded-xl p-4">
                {imageUri ? (
                  <Image
                    source={{ uri: imageUri }}
                    className="w-32 h-32 rounded-lg"
                    resizeMode="cover"
                  />
                ) : currentImage ? (
                  <Image
                    source={{ uri: currentImage }}
                    className="w-32 h-32 rounded-lg"
                    resizeMode="cover"
                  />
                ) : (
                  <Package size={80} color="#9CA3AF" />
                )}
              </View>
              <View className="flex-row">
                <TouchableOpacity
                  className="bg-blue-500 px-3 py-2 rounded-lg flex-row items-center mr-2"
                  onPress={pickImage}
                >
                  <Text className="text-white">Gallery</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  className="bg-green-500 px-3 py-2 rounded-lg flex-row items-center"
                  onPress={captureImage}
                >
                  <Camera size={16} color="#FFFFFF" className="mr-1" />
                  <Text className="text-white">Camera</Text>
                </TouchableOpacity>
              </View>
            </View>
            
            {/* Basic Fields */}
            <View className="mb-4">
              <Text className="text-sm font-medium text-gray-700 mb-1">Name *</Text>
              <TextInput
                className="bg-white border border-gray-300 rounded-lg px-4 py-3 text-gray-800"
                value={name}
                onChangeText={setName}
                placeholder="Enter device name"
              />
            </View>
            
            <View className="mb-4">
              <Text className="text-sm font-medium text-gray-700 mb-1">Serial Number *</Text>
              <TextInput
                className="bg-white border border-gray-300 rounded-lg px-4 py-3 text-gray-800"
                value={serialNumber}
                onChangeText={setSerialNumber}
                placeholder="Enter serial number"
              />
            </View>
            
            <View className="mb-4">
              <Text className="text-sm font-medium text-gray-700 mb-1">Type *</Text>
              <TextInput
                className="bg-white border border-gray-300 rounded-lg px-4 py-3 text-gray-800"
                value={type}
                onChangeText={setType}
                placeholder="e.g. Refrigerator, Oven, etc."
              />
            </View>
            
            <View className="mb-4">
              <Text className="text-sm font-medium text-gray-700 mb-1">Model</Text>
              <TextInput
                className="bg-white border border-gray-300 rounded-lg px-4 py-3 text-gray-800"
                value={model}
                onChangeText={setModel}
                placeholder="Enter model name/number"
              />
            </View>
            
            <View className="mb-4">
              <Text className="text-sm font-medium text-gray-700 mb-1">Status</Text>
              <View className="bg-white border border-gray-300 rounded-lg px-1 py-1">
                <Picker
                  selectedValue={status}
                  onValueChange={(itemValue) => setStatus(itemValue as typeof status)}
                >
                  <Picker.Item label="Operational" value="operational" />
                  <Picker.Item label="Maintenance" value="maintenance" />
                  <Picker.Item label="Offline" value="offline" />
                </Picker>
              </View>
            </View>
            
            <View className="mb-4">
              <Text className="text-sm font-medium text-gray-700 mb-1">Restaurant *</Text>
              <View className="bg-white border border-gray-300 rounded-lg px-1 py-1">
                <Picker
                  selectedValue={selectedRestaurant}
                  onValueChange={(itemValue) => setSelectedRestaurant(itemValue)}
                >
                  <Picker.Item label="Select a restaurant" value={null} />
                  {restaurants.map((restaurant) => (
                    <Picker.Item
                      key={restaurant.id}
                      label={restaurant.name}
                      value={restaurant.id}
                    />
                  ))}
                </Picker>
              </View>
            </View>
            
            <View className="mb-4">
              <Text className="text-sm font-medium text-gray-700 mb-1">Category</Text>
              <View className="bg-white border border-gray-300 rounded-lg px-1 py-1">
                <Picker
                  selectedValue={selectedCategory}
                  onValueChange={(itemValue) => setSelectedCategory(itemValue)}
                >
                  <Picker.Item label="Select a category" value={null} />
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
          </View>
          
          {/* Purchase & Warranty */}
          <View className="bg-white rounded-lg shadow-sm p-4 mb-6">
            <Text className="text-lg font-semibold text-gray-800 mb-4">Purchase & Warranty</Text>
            
            <View className="mb-4">
              <Text className="text-sm font-medium text-gray-700 mb-1">Purchase Date</Text>
              <TouchableOpacity
                className="bg-white border border-gray-300 rounded-lg px-4 py-3 flex-row justify-between items-center"
                onPress={() => setShowPurchaseDatePicker(true)}
              >
                <Text className="text-gray-700">
                  {purchaseDate ? purchaseDate.toLocaleDateString() : "Select date"}
                </Text>
                <Calendar size={20} color="#6B7280" />
              </TouchableOpacity>
              
              {showPurchaseDatePicker && (
                <DateTimePicker
                  value={purchaseDate || new Date()}
                  mode="date"
                  display="default"
                  onChange={(event, selectedDate) => {
                    setShowPurchaseDatePicker(false);
                    if (event.type === "set" && selectedDate) {
                      setPurchaseDate(selectedDate);
                    }
                  }}
                />
              )}
            </View>
            
            <View className="mb-4">
              <Text className="text-sm font-medium text-gray-700 mb-1">Warranty Expiry</Text>
              <TouchableOpacity
                className="bg-white border border-gray-300 rounded-lg px-4 py-3 flex-row justify-between items-center"
                onPress={() => setShowWarrantyDatePicker(true)}
              >
                <Text className="text-gray-700">
                  {warrantyExpiry ? warrantyExpiry.toLocaleDateString() : "Select date"}
                </Text>
                <Calendar size={20} color="#6B7280" />
              </TouchableOpacity>
              
              {showWarrantyDatePicker && (
                <DateTimePicker
                  value={warrantyExpiry || new Date()}
                  mode="date"
                  display="default"
                  onChange={(event, selectedDate) => {
                    setShowWarrantyDatePicker(false);
                    if (event.type === "set" && selectedDate) {
                      setWarrantyExpiry(selectedDate);
                    }
                  }}
                />
              )}
            </View>
          </View>
          
          {/* Custom Fields */}
          <View className="bg-white rounded-lg shadow-sm p-4 mb-6">
            <Text className="text-lg font-semibold text-gray-800 mb-4">Custom Fields</Text>
            
            {customFields.length === 0 ? (
              <Text className="text-gray-500 italic text-center py-4">
                No custom fields for this device
              </Text>
            ) : (
              customFields.map((field, index) => (
                <View key={index} className="mb-4 border-b border-gray-100 pb-4">
                  <View className="flex-row justify-between items-center mb-2">
                    <Text className="text-sm font-medium text-gray-700">
                      {field.name} {field.required && <Text className="text-red-500">*</Text>}
                    </Text>
                    <TouchableOpacity onPress={() => removeCustomField(index)}>
                      <X size={16} color="#EF4444" />
                    </TouchableOpacity>
                  </View>
                  {renderCustomFieldInput(field, index)}
                  <Text className="text-xs text-gray-500 mt-1">
                    Type: {field.type.charAt(0).toUpperCase() + field.type.slice(1)}
                  </Text>
                </View>
              ))
            )}
          </View>
          
          <View className="h-20" />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
} 