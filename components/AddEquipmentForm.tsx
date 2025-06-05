import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Alert,
  ScrollView,
  Modal,
  Image,
} from "react-native";
import { ArrowLeft, Camera, X, Image as ImageIcon, Upload } from "lucide-react-native";
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from "expo-router";
import { supabase } from "../lib/supabase";
import BarcodeScanner from "../components/BarcodeScanner";
import QuickAddTypeModal from "../components/QuickAddTypeModal";
import QuickAddSupplierModal from "../components/QuickAddSupplierModal";

type AddEquipmentFormProps = {
  onCancel: () => void;
  onSuccess: () => void;
};

export default function AddEquipmentForm({
  onCancel,
  onSuccess,
}: AddEquipmentFormProps) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [type, setType] = useState("");
  const [typeOptions, setTypeOptions] = useState<{ id: string; name: string }[]>([]);
  const [showTypeDropdown, setShowTypeDropdown] = useState(false);
  const [stockLevel, setStockLevel] = useState("0");
  const [supplier, setSupplier] = useState("");
  const [supplierOptions, setSupplierOptions] = useState<
    { id: string; name: string }[]
  >([]);
  const [showSupplierDropdown, setShowSupplierDropdown] = useState(false);
  const [warehouseLocation, setWarehouseLocation] = useState("");
  const [warehouseOptions, setWarehouseOptions] = useState<{ id: string; name: string }[]>([]);
  const [showWarehouseDropdown, setShowWarehouseDropdown] = useState(false);
  const [notes, setNotes] = useState("");
  const [minStockLevel, setMinStockLevel] = useState("");
  const [maxStockLevel, setMaxStockLevel] = useState("");
  const [cost, setCost] = useState("");
  const [loading, setLoading] = useState(false);
  const [showBarcodeScanner, setShowBarcodeScanner] = useState(false);
  const [barcodeId, setBarcodeId] = useState("");
  const [showQuickAddType, setShowQuickAddType] = useState(false);
  const [showQuickAddSupplier, setShowQuickAddSupplier] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);



  useEffect(() => {
    // Fetch suppliers for dropdown
    const fetchSuppliers = async () => {
      try {
        const { data, error } = await supabase
          .from("suppliers")
          .select("id, name")
          .order("name");

        if (error) throw error;

        if (data) {
          setSupplierOptions(data);
        }
      } catch (error) {
        console.error("Error fetching suppliers:", error);
      }
    };

    // Fetch equipment types
    const fetchTypes = async () => {
      try {
        const { data, error } = await supabase
          .from("equipment_types")
          .select("id, name")
          .order("name");

        if (error) throw error;

        if (data) {
          setTypeOptions(data);
        }
      } catch (error) {
        console.error("Error fetching equipment types:", error);
      }
    };

    // Fetch warehouses
    const fetchWarehouses = async () => {
      try {
        const { data, error } = await supabase
          .from("warehouses")
          .select("id, name")
          .order("name");

        if (error) throw error;

        if (data) {
          setWarehouseOptions(data);
        }
      } catch (error) {
        console.error("Error fetching warehouses:", error);
      }
    };

    fetchSuppliers();
    fetchTypes();
    fetchWarehouses();
  }, []);

  const fetchTypes = async () => {
    try {
      const { data, error } = await supabase
        .from("equipment_types")
        .select("id, name")
        .order("name");

      if (error) throw error;
      setTypeOptions(data || []);
    } catch (error) {
      console.error("Error fetching types:", error);
    }
  };

  const fetchSuppliers = async () => {
    try {
      const { data, error } = await supabase
        .from("suppliers")
        .select("id, name")
        .order("name");

      if (error) throw error;
      setSupplierOptions(data || []);
    } catch (error) {
      console.error("Error fetching suppliers:", error);
    }
  };

  const handleTypeAdded = (typeName: string) => {
    setType(typeName);
    fetchTypes(); // Refresh the types list
  };

  const handleSupplierAdded = (supplierName: string) => {
    setSupplier(supplierName);
    fetchSuppliers(); // Refresh the suppliers list
  };

  const pickImage = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Required', 'Please grant camera roll permissions to upload images.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        setSelectedImage(result.assets[0].uri);
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert('Error', 'Failed to pick image');
    }
  };

  const takePhoto = async () => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Required', 'Please grant camera permissions to take photos.');
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        setSelectedImage(result.assets[0].uri);
      }
    } catch (error) {
      console.error('Error taking photo:', error);
      Alert.alert('Error', 'Failed to take photo');
    }
  };

  const showImagePicker = () => {
    Alert.alert(
      'Select Image',
      'Choose how you want to add an image',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Camera', onPress: takePhoto },
        { text: 'Gallery', onPress: pickImage },
      ]
    );
  };

  const uploadImage = async (imageUri: string): Promise<string | null> => {
    try {
      setUploadingImage(true);

      const fileExt = imageUri.split('.').pop();
      const fileName = `${Date.now()}.${fileExt}`;
      const filePath = `images/${fileName}`;

      // Convert image to blob for upload
      const response = await fetch(imageUri);
      const blob = await response.blob();

      const { error: uploadError } = await supabase.storage
        .from('equipment')
        .upload(filePath, blob);

      if (uploadError) throw uploadError;

      // Get public URL
      const { data } = supabase.storage
        .from('equipment')
        .getPublicUrl(filePath);

      return data.publicUrl;
    } catch (error) {
      console.error('Error uploading image:', error);
      Alert.alert('Error', 'Failed to upload image');
      return null;
    } finally {
      setUploadingImage(false);
    }
  };

  const handleSubmit = async () => {
    if (!name.trim()) {
      Alert.alert("Error", "Please enter equipment name");
      return;
    }

    if (!type) {
      Alert.alert("Error", "Please select equipment type");
      return;
    }

    if (isNaN(parseInt(stockLevel)) || parseInt(stockLevel) < 0) {
      Alert.alert("Error", "Stock level must be a valid number");
      return;
    }

    try {
      setLoading(true);

      // Upload image if selected
      let imageUrl = null;
      if (selectedImage) {
        imageUrl = await uploadImage(selectedImage);
      }

      const newEquipment = {
        name,
        type,
        stock_level: parseInt(stockLevel),
        supplier: supplier || null,
        warehouse_location: warehouseLocation || null,
        description: notes || null,
        min_stock_level: minStockLevel ? parseInt(minStockLevel) : Math.max(1, Math.floor(parseInt(stockLevel) * 0.2)),
        max_stock_level: maxStockLevel ? parseInt(maxStockLevel) : parseInt(stockLevel) * 2,
        cost: cost ? parseFloat(cost) : 0,
        sku: barcodeId || `SKU-${Date.now()}`, // Use scanned barcode or generate SKU
        image_url: imageUrl,
      };

      const { data, error } = await supabase
        .from("equipment_inventory")
        .insert([newEquipment])
        .select();

      if (error) throw error;

      Alert.alert("Success", "Equipment added successfully");
      onSuccess();
    } catch (error) {
      console.error("Error adding equipment:", error);
      Alert.alert("Error", "Failed to add equipment");
    } finally {
      setLoading(false);
    }
  };

  return (
    <View className="flex-1 bg-white">
      {/* Header */}
      <View className="flex-row justify-between items-center px-4 py-3 border-b border-gray-200">
        <TouchableOpacity onPress={onCancel} className="flex-row items-center">
          <ArrowLeft size={20} color="#3b82f6" />
          <Text className="text-blue-500 ml-1">Cancel</Text>
        </TouchableOpacity>
        <Text className="text-xl font-bold text-blue-800">Add Stock Item</Text>
        <TouchableOpacity
          onPress={handleSubmit}
          disabled={loading}
          className={`${loading ? "opacity-50" : ""}`}
        >
          <Text className="text-blue-600 font-medium">
            {loading ? "Saving..." : "Save"}
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView className="flex-1 p-4">
        <View className="space-y-4">
          <View className="mb-4">
            <Text className="text-gray-700 mb-1 font-medium">Name *</Text>
            <TextInput
              className="border border-gray-300 rounded-lg px-3 py-2"
              placeholder="Enter equipment name"
              value={name}
              onChangeText={setName}
            />
          </View>

          <View className="mb-4">
            <Text className="text-gray-700 mb-1 font-medium">Type *</Text>
            <TouchableOpacity
              onPress={() => setShowTypeDropdown(!showTypeDropdown)}
              className="border border-gray-300 rounded-lg px-3 py-2 flex-row justify-between items-center"
            >
              <Text className={type ? "text-gray-800" : "text-gray-400"}>
                {type || "Select equipment type"}
              </Text>
              <Text className="text-gray-500">
                {showTypeDropdown ? "▲" : "▼"}
              </Text>
            </TouchableOpacity>

            {showTypeDropdown && (
              <View className="border border-gray-300 rounded-lg mt-1 max-h-40 bg-white z-10">
                <ScrollView>
                  {typeOptions.map((item) => (
                    <TouchableOpacity
                      key={item.id}
                      className="px-3 py-2 border-b border-gray-100"
                      onPress={() => {
                        setType(item.name);
                        setShowTypeDropdown(false);
                      }}
                    >
                      <Text className="text-gray-800">{item.name}</Text>
                    </TouchableOpacity>
                  ))}
                  <TouchableOpacity
                    className="px-3 py-2 bg-blue-50"
                    onPress={() => {
                      setShowTypeDropdown(false);
                      setShowQuickAddType(true);
                    }}
                  >
                    <Text className="text-blue-600 font-medium">
                      + Add New Type
                    </Text>
                  </TouchableOpacity>
                </ScrollView>
              </View>
            )}
          </View>

          <View className="mb-4">
            <Text className="text-gray-700 mb-1 font-medium">
              Initial Stock *
            </Text>
            <TextInput
              className="border border-gray-300 rounded-lg px-3 py-2"
              placeholder="Enter initial stock level"
              value={stockLevel}
              onChangeText={setStockLevel}
              keyboardType="numeric"
            />
          </View>

          <View className="mb-4">
            <Text className="text-gray-700 mb-1 font-medium">Cost per Unit</Text>
            <TextInput
              className="border border-gray-300 rounded-lg px-3 py-2"
              placeholder="Enter cost per unit"
              value={cost}
              onChangeText={setCost}
              keyboardType="decimal-pad"
            />
          </View>

          {/* Equipment Image */}
          <View className="mb-4">
            <Text className="text-gray-700 mb-1 font-medium">Equipment Image</Text>
            <TouchableOpacity
              className="border border-gray-300 rounded-lg p-4 items-center justify-center bg-gray-50"
              onPress={showImagePicker}
              disabled={uploadingImage}
            >
              {selectedImage ? (
                <View className="items-center">
                  <Image
                    source={{ uri: selectedImage }}
                    className="w-24 h-24 rounded-lg mb-2"
                    resizeMode="cover"
                  />
                  <Text className="text-blue-600 font-medium">Tap to change image</Text>
                </View>
              ) : (
                <View className="items-center">
                  <ImageIcon size={32} color="#9CA3AF" />
                  <Text className="text-gray-500 mt-2">
                    {uploadingImage ? "Uploading..." : "Tap to add image"}
                  </Text>
                  <Text className="text-gray-400 text-sm mt-1">Camera or Gallery</Text>
                </View>
              )}
            </TouchableOpacity>
          </View>

          <View className="mb-4">
            <Text className="text-gray-700 mb-1 font-medium">Supplier</Text>
            <TouchableOpacity
              onPress={() => setShowSupplierDropdown(!showSupplierDropdown)}
              className="border border-gray-300 rounded-lg px-3 py-2 flex-row justify-between items-center"
            >
              <Text className={supplier ? "text-gray-800" : "text-gray-400"}>
                {supplier || "Select a supplier"}
              </Text>
              <Text className="text-gray-500">
                {showSupplierDropdown ? "▲" : "▼"}
              </Text>
            </TouchableOpacity>

            {showSupplierDropdown && (
              <View className="border border-gray-300 rounded-lg mt-1 max-h-40 bg-white z-10">
                <ScrollView>
                  {supplierOptions.map((item) => (
                    <TouchableOpacity
                      key={item.id}
                      className="px-3 py-2 border-b border-gray-100"
                      onPress={() => {
                        setSupplier(item.name);
                        setShowSupplierDropdown(false);
                      }}
                    >
                      <Text className="text-gray-800">{item.name}</Text>
                    </TouchableOpacity>
                  ))}
                  <TouchableOpacity
                    className="px-3 py-2 bg-blue-50"
                    onPress={() => {
                      setShowSupplierDropdown(false);
                      setShowQuickAddSupplier(true);
                    }}
                  >
                    <Text className="text-blue-600 font-medium">
                      + Add New Supplier
                    </Text>
                  </TouchableOpacity>
                </ScrollView>
              </View>
            )}
          </View>

          <View className="mb-4">
            <Text className="text-gray-700 mb-1 font-medium">
              Warehouse Location
            </Text>
            <TouchableOpacity
              onPress={() => setShowWarehouseDropdown(!showWarehouseDropdown)}
              className="border border-gray-300 rounded-lg px-3 py-2 flex-row justify-between items-center"
            >
              <Text className={warehouseLocation ? "text-gray-800" : "text-gray-400"}>
                {warehouseLocation || "Select warehouse location"}
              </Text>
              <Text className="text-gray-500">
                {showWarehouseDropdown ? "▲" : "▼"}
              </Text>
            </TouchableOpacity>

            {showWarehouseDropdown && (
              <View className="border border-gray-300 rounded-lg mt-1 max-h-40 bg-white z-10">
                <ScrollView>
                  {warehouseOptions.map((item) => (
                    <TouchableOpacity
                      key={item.id}
                      className="px-3 py-2 border-b border-gray-100"
                      onPress={() => {
                        setWarehouseLocation(item.name);
                        setShowWarehouseDropdown(false);
                      }}
                    >
                      <Text className="text-gray-800">{item.name}</Text>
                    </TouchableOpacity>
                  ))}
                  <TouchableOpacity
                    className="px-3 py-2 bg-blue-50"
                    onPress={() => {
                      setShowWarehouseDropdown(false);
                      router.push("/equipment/warehouses");
                    }}
                  >
                    <Text className="text-blue-600 font-medium">
                      + Add New Warehouse
                    </Text>
                  </TouchableOpacity>
                </ScrollView>
              </View>
            )}
          </View>

          <View className="mb-4">
            <Text className="text-gray-700 mb-1 font-medium">
              Minimum Stock Level
            </Text>
            <TextInput
              className="border border-gray-300 rounded-lg px-3 py-2"
              placeholder="Enter minimum stock level for alerts"
              value={minStockLevel}
              onChangeText={setMinStockLevel}
              keyboardType="numeric"
            />
          </View>

          <View className="mb-4">
            <Text className="text-gray-700 mb-1 font-medium">
              Maximum Stock Level
            </Text>
            <TextInput
              className="border border-gray-300 rounded-lg px-3 py-2"
              placeholder="Enter maximum stock level"
              value={maxStockLevel}
              onChangeText={setMaxStockLevel}
              keyboardType="numeric"
            />
          </View>

          <View className="mb-4">
            <Text className="text-gray-700 mb-1 font-medium">Notes</Text>
            <TextInput
              className="border border-gray-300 rounded-lg px-3 py-2 h-24"
              placeholder="Enter any additional notes"
              value={notes}
              onChangeText={setNotes}
              multiline
              textAlignVertical="top"
            />
          </View>

          <TouchableOpacity
            className="bg-blue-600 py-3 rounded-lg items-center mt-4"
            onPress={handleSubmit}
            disabled={loading}
          >
            <Text className="text-white font-bold text-lg">
              {loading ? "Adding..." : "Add Stock Item"}
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Barcode Scanner Modal */}
      <Modal
        visible={showBarcodeScanner}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setShowBarcodeScanner(false)}
      >
        <View style={{ flex: 1 }}>
          <BarcodeScanner
            onScan={(data, type) => {
              setBarcodeId(data);
              setShowBarcodeScanner(false);
            }}
            onClose={() => setShowBarcodeScanner(false)}
          />
        </View>
      </Modal>

      {/* Quick Add Type Modal */}
      <QuickAddTypeModal
        visible={showQuickAddType}
        onClose={() => setShowQuickAddType(false)}
        onSuccess={handleTypeAdded}
      />

      {/* Quick Add Supplier Modal */}
      <QuickAddSupplierModal
        visible={showQuickAddSupplier}
        onClose={() => setShowQuickAddSupplier(false)}
        onSuccess={handleSupplierAdded}
      />
    </View>
  );
}
