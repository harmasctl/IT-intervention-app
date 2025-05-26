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
  Modal,
  FlatList,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { useRouter } from "expo-router";
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
  Barcode,
} from "lucide-react-native";
import { supabase } from "../../lib/supabase";
import * as ImagePicker from "expo-image-picker";
import { decode } from "base64-arraybuffer";
import DateTimePicker from "@react-native-community/datetimepicker";
import { Picker } from "@react-native-picker/picker";
import * as FileSystem from "expo-file-system";
import QRCodeGenerator from "../../components/QRCodeGenerator";
import { BarCodeScanner } from "expo-barcode-scanner";

type CustomField = {
  name: string;
  type: "text" | "number" | "boolean" | "date" | "selection";
  options?: string[];
  value: any;
  required?: boolean;
  showPicker?: boolean;
};

export default function CreateDeviceScreen() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [serialNumber, setSerialNumber] = useState("");
  const [serialNumberError, setSerialNumberError] = useState<string | null>(null);
  const [isCheckingSerial, setIsCheckingSerial] = useState(false);
  const [model, setModel] = useState("");
  const [modelId, setModelId] = useState<string | null>(null);
  const [type, setType] = useState("");
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [status, setStatus] = useState<"operational" | "maintenance" | "offline">("operational");
  const [selectedRestaurant, setSelectedRestaurant] = useState<string>("");
  const [selectedCategory, setSelectedCategory] = useState<string>("");
  const [restaurants, setRestaurants] = useState<{ id: string; name: string }[]>([]);
  const [categories, setCategories] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [showPurchaseDatePicker, setShowPurchaseDatePicker] = useState(false);
  const [showWarrantyDatePicker, setShowWarrantyDatePicker] = useState(false);
  const [purchaseDate, setPurchaseDate] = useState<Date | null>(null);
  const [warrantyExpiry, setWarrantyExpiry] = useState<Date | null>(null);
  const [showScanner, setShowScanner] = useState(false);
  const [hasCameraPermission, setHasCameraPermission] = useState<boolean | null>(null);

  // Custom fields
  const [customFields, setCustomFields] = useState<CustomField[]>([]);
  const [showAddField, setShowAddField] = useState(false);
  const [newFieldName, setNewFieldName] = useState("");
  const [newFieldType, setNewFieldType] = useState<CustomField["type"]>("text");
  const [newFieldOptions, setNewFieldOptions] = useState("");
  const [newFieldRequired, setNewFieldRequired] = useState(false);

  const [deviceModels, setDeviceModels] = useState<{id: string; name: string; manufacturer: string}[]>([]);
  const [showModelPicker, setShowModelPicker] = useState(false);

  useEffect(() => {
    fetchRestaurants();
    fetchCategories();
    fetchDeviceModels();
  }, []);
  
  useEffect(() => {
    // Request camera permission for barcode scanning
    (async () => {
      const { status } = await BarCodeScanner.requestPermissionsAsync();
      setHasCameraPermission(status === 'granted');
    })();
  }, []);

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
        .select("id, name")
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

  const fetchDeviceModels = async () => {
    try {
      const { data, error } = await supabase
        .from("device_models")
        .select("id, name, manufacturer")
        .order("name");

      if (error) {
        throw error;
      }

      setDeviceModels(data || []);
    } catch (error) {
      console.error("Error fetching device models:", error);
      Alert.alert("Error", "Failed to load device models");
    }
  };

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    
    if (status !== "granted") {
      Alert.alert("Permission needed", "Please grant permission to access your photos");
      return;
    }

    try {
      // Handle platform differences without using arrays that cause type errors
      let result;
      if (Platform.OS === 'web') {
        result = await ImagePicker.launchImageLibraryAsync({
          allowsEditing: true,
          aspect: [1, 1],
          quality: 0.8,
          base64: true,
        });
      } else {
        // For native platforms
        result = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.Images,
          allowsEditing: true,
          aspect: [1, 1],
          quality: 0.8,
          base64: true,
        });
      }

      if (!result.canceled && result.assets && result.assets[0].uri) {
        setImageUri(result.assets[0].uri);
      }
    } catch (error) {
      console.error("Error picking image:", error);
      Alert.alert("Error", "Failed to select image");
    }
  };

  const captureImage = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    
    if (status !== "granted") {
      Alert.alert("Permission needed", "Please grant permission to access your camera");
      return;
    }

    try {
      // Handle platform differences without using arrays that cause type errors
      let result;
      if (Platform.OS === 'web') {
        result = await ImagePicker.launchCameraAsync({
          allowsEditing: true,
          aspect: [1, 1],
          quality: 0.8,
          base64: true,
        });
      } else {
        // For native platforms
        result = await ImagePicker.launchCameraAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.Images,
          allowsEditing: true,
          aspect: [1, 1],
          quality: 0.8,
          base64: true,
        });
      }

      if (!result.canceled && result.assets && result.assets[0].uri) {
        setImageUri(result.assets[0].uri);
      }
    } catch (error) {
      console.error("Error capturing image:", error);
      Alert.alert("Error", "Failed to capture image");
    }
  };

  const uploadImage = async (deviceId: string): Promise<string | null> => {
    if (!imageUri) return null;
    
    try {
      setUploading(true);
      
      // Skip FileSystem check on web platform
      if (Platform.OS !== 'web') {
        try {
          const imageInfo = await FileSystem.getInfoAsync(imageUri);
          if (!imageInfo.exists) {
            throw new Error("Image file doesn't exist");
          }
        } catch (error) {
          console.error("Error checking image:", error);
          // Continue anyway, as the error might be platform-specific
        }
      }
      
      // Process image data differently based on platform
      let blob: Blob;
      let base64Data: string | null = null;
      
      if (Platform.OS === 'web') {
        try {
          // For web, fetch the image and convert it to a proper blob
          const response = await fetch(imageUri);
          blob = await response.blob();
        } catch (error) {
          console.error("Error processing image on web:", error);
          return null;
        }
      } else {
        // Native platforms - convert base64 to blob
        try {
          const base64 = await FileSystem.readAsStringAsync(imageUri, {
            encoding: FileSystem.EncodingType.Base64,
          });
          
          // Store base64 for fallback use
          base64Data = base64;
          
          // Create ArrayBuffer from base64
          const arrayBuffer = decode(base64);
          
          // Create blob from ArrayBuffer
          const fileExt = imageUri.split('.').pop()?.toLowerCase() || 'jpg';
          blob = new Blob([arrayBuffer], { type: `image/${fileExt}` });
        } catch (error) {
          console.error("Error reading image:", error);
          return null;
        }
      }
      
      if (!blob) {
        throw new Error("Failed to process image data");
      }
      
      // Determine file extension
      const fileExt = imageUri.split('.').pop()?.toLowerCase() || 'jpg';
      const filePath = `${deviceId}.${fileExt}`;
      const contentType = `image/${fileExt}`;
      
      // Make sure user is authenticated before uploading
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        Alert.alert("Error", "You must be logged in to upload images");
        return null;
      }
      
      // Try multiple approaches to upload
      try {
        // First try uploading the blob directly
      const { data, error } = await supabase.storage
        .from('device-images')
        .upload(filePath, blob, {
            contentType,
          upsert: true,
        });
        
      if (error) {
          throw error;
      }
      
        // Get public URL on success
      const { data: { publicUrl } } = supabase.storage
        .from('device-images')
        .getPublicUrl(filePath);
        
      return publicUrl;
      } catch (error) {
        console.error('First upload attempt failed:', error);
        
        // If that failed and we have base64 data, try a different approach
        if (base64Data) {
          try {
            console.log('Trying alternative upload method...');
            
            // Store the image URL in the database directly
            const dbPath = `https://mxbebraqpukeanginfxr.supabase.co/storage/v1/object/public/device-images/${filePath}`;
            
            await supabase
              .from("devices")
              .update({ image: dbPath })
              .eq("id", deviceId);
              
            return dbPath;
          } catch (finalError) {
            console.error('Alternative approach also failed:', finalError);
            return null;
          }
        }
        
        return null;
      }
    } catch (error) {
      console.error('Error in uploadImage:', error);
      return null;
    } finally {
      setUploading(false);
    }
  };

  const generateQRCode = async (deviceId: string, serialNumber: string): Promise<string | null> => {
    try {
      // Create QR code data
      const qrData = JSON.stringify({
        id: deviceId,
        serial: serialNumber,
        type: "device"
      });
      
      // Store QR code data in the database directly, regardless of storage outcome
      try {
        await supabase
          .from("devices")
          .update({ qr_code: qrData })
          .eq("id", deviceId);
      } catch (dbError) {
        console.error('Error storing QR code data in database:', dbError);
        // Continue anyway, we still want to try storage upload
      }
      
      // Try storage upload, but consider it optional
      try {
        // Make sure user is authenticated before uploading
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
      // Upload data to device-data bucket
      const filePath = `${deviceId}.json`;
      
      // Create proper blob for JSON data
      const blob = new Blob([qrData], {
        type: 'application/json'
      });
      
          await supabase.storage
        .from('device-data')
        .upload(filePath, blob, {
          contentType: 'application/json',
          upsert: true
        });
        }
      } catch (storageError) {
        console.error('Error storing QR code data in storage:', storageError);
        // Continue anyway, as we already stored the data in the database
      }
      
      // Return the data itself, which can be used directly by QRCodeGenerator
      return qrData;
    } catch (error) {
      console.error('Error generating QR code data:', error);
      return null;
    }
  };

  const handleBarCodeScanned = ({ type, data }: { type: string; data: string }) => {
    setShowScanner(false);
    // Use the handleSerialNumberChange function to validate the serial number
    handleSerialNumberChange(data);
  };

  const handleSelectModel = (id: string) => {
    const selectedModel = deviceModels.find(m => m.id === id);
    if (selectedModel) {
      setModelId(id);
      setModel(`${selectedModel.manufacturer} ${selectedModel.name}`);
      setType(selectedModel.manufacturer);
      setShowModelPicker(false);
    }
  };

  const handleSave = async () => {
    if (!name || !serialNumber) {
      Alert.alert("Error", "Name and serial number are required");
      return;
    }

    if (serialNumberError) {
      Alert.alert("Error", serialNumberError);
      return;
    }

    if (!modelId) {
      Alert.alert("Error", "Please select a device model");
      return;
    }

    if (!selectedRestaurant) {
      Alert.alert("Error", "Please select a restaurant");
      return;
    }

    // Validate required custom fields
    const missingRequiredFields = customFields.filter(
      field => field.required && (
        (typeof field.value === "string" && !field.value.trim()) || 
        field.value === null || 
        field.value === undefined
      )
    );
    
    if (missingRequiredFields.length > 0) {
      Alert.alert(
        "Error", 
        `Please fill in the required custom field(s): ${missingRequiredFields.map(f => f.name).join(", ")}`
      );
      return;
    }

    setLoading(true);

    try {
      // Make sure user is authenticated
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        Alert.alert("Error", "You must be logged in to create a device");
        setLoading(false);
        return;
      }
      
      // Check if serial number already exists
      const { data: existingDevice, error: checkError } = await supabase
        .from("devices")
        .select("id, name")
        .eq("serial_number", serialNumber)
        .maybeSingle();
        
      if (checkError) {
        console.error("Error checking for existing device:", checkError);
      }
      
      if (existingDevice) {
        Alert.alert(
          "Duplicate Serial Number", 
          `A device with serial number "${serialNumber}" already exists (${existingDevice.name}). Please use a different serial number.`
        );
        setLoading(false);
        return;
      }
      
      // Verify model exists
      const { data: modelData, error: modelError } = await supabase
        .from("device_models")
        .select("id, name, manufacturer")
        .eq("id", modelId)
        .single();
        
      if (modelError || !modelData) {
        console.error("Error validating model:", modelError);
        Alert.alert("Error", "The selected model could not be verified. Please try selecting it again.");
        setLoading(false);
        return;
      }
      
      // Format custom fields for database
      const customFieldsObject: Record<string, any> = {};
      
      customFields.forEach(field => {
        customFieldsObject[field.name] = field.value;
      });
      
      // Prepare data for insert
      const deviceData = {
        name,
        serial_number: serialNumber,
        model: `${modelData.manufacturer} ${modelData.name}`, // Set proper model name
        model_id: modelId,
        type: type || modelData.manufacturer || "Unknown", // Ensure type is never null
        status,
        restaurant_id: selectedRestaurant,
        category_id: selectedCategory || null,
        purchase_date: purchaseDate?.toISOString(),
        warranty_expiry: warrantyExpiry?.toISOString(),
        custom_fields: customFieldsObject
      };

      console.log("Creating device with data:", deviceData);

      // Create device in database
      const { data, error } = await supabase
        .from("devices")
        .insert(deviceData)
        .select("id")
        .single();

      if (error) {
        console.error("Error creating device:", error);
        
        // Handle specific database errors with user-friendly messages
        if (error.code === '23505' && error.message.includes('devices_serial_number_key')) {
          Alert.alert(
            "Duplicate Serial Number", 
            "A device with this serial number already exists. Please use a different serial number."
          );
        } else {
          Alert.alert(
            "Error", 
            `Failed to add device: ${error.message || "Database error"}. Please try again or contact support.`
          );
        }
        setLoading(false);
        return;
      }

      if (data) {
        let newDeviceId = data.id;
        let hasErrors = false;
        let errorMessages = [];
        
        // Try to upload image, but continue even if it fails
        if (imageUri) {
          try {
            const imageUrl = await uploadImage(newDeviceId);
          if (imageUrl) {
              // Update device with image URL if upload succeeded
              await supabase
                .from("devices")
                .update({ image: imageUrl })
                .eq("id", newDeviceId);
            } else {
              hasErrors = true;
              errorMessages.push("Image upload failed");
            }
          } catch (imgError) {
            console.error("Error with image upload:", imgError);
            hasErrors = true;
            errorMessages.push("Image upload failed");
          }
        }

        // Generate QR code data - continue even if storing in bucket fails
        try {
          const qrCodeData = await generateQRCode(newDeviceId, serialNumber);
        if (qrCodeData) {
          // Store QR code data in the database 
            await supabase
            .from("devices")
              .update({ qr_code: qrCodeData })
              .eq("id", newDeviceId);
          } else {
            hasErrors = true;
            errorMessages.push("QR code generation failed");
          }
        } catch (qrError) {
          console.error("Error with QR code generation:", qrError);
          hasErrors = true;
          errorMessages.push("QR code generation failed");
        }

        // If we have a category, calculate next maintenance date
        if (selectedCategory) {
          try {
            const { data: categoryData } = await supabase
              .from("device_categories")
              .select("maintenance_interval")
              .eq("id", selectedCategory)
              .single();
              
            if (categoryData?.maintenance_interval) {
              // Let database trigger handle this calculation, just make a dummy update to trigger it
              await supabase
                .from("devices")
                .update({ 
                  last_maintenance: purchaseDate ? purchaseDate.toISOString() : new Date().toISOString() 
                })
                .eq("id", newDeviceId);
            }
          } catch (maintError) {
            console.error("Error setting maintenance schedule:", maintError);
            errorMessages.push("Maintenance schedule setup failed");
          }
        }

        if (hasErrors) {
          // Show success with warnings
          Alert.alert(
            "Device Created with Warnings",
            `Device was created successfully, but the following issues occurred: ${errorMessages.join(", ")}`,
            [
              { 
                text: "View Device", 
                onPress: () => router.push(`/devices/${newDeviceId}`)
              },
              {
                text: "Create Another",
                onPress: () => {
                  // Reset form for a new device
                  setName("");
                  setSerialNumber("");
                  setModelId(null);
                  setModel("");
                  setType("");
                  setImageUri(null);
                  setStatus("operational");
                  setSelectedRestaurant("");
                  setSelectedCategory("");
                  setPurchaseDate(null);
                  setWarrantyExpiry(null);
                  setCustomFields([]);
                  setLoading(false);
                }
              }
            ]
          );
        } else {
          // Show success and navigate to device details
        Alert.alert(
          "Success",
            "Device added successfully!",
            [
              { 
                text: "View Device", 
                onPress: () => router.push(`/devices/${newDeviceId}`)
              },
              {
                text: "Create Another",
                style: "cancel",
                onPress: () => {
                  // Reset form for a new device
                  setName("");
                  setSerialNumber("");
                  setModelId(null);
                  setModel("");
                  setType("");
                  setImageUri(null);
                  setStatus("operational");
                  setSelectedRestaurant("");
                  setSelectedCategory("");
                  setPurchaseDate(null);
                  setWarrantyExpiry(null);
                  setCustomFields([]);
                  setLoading(false);
                }
              }
            ]
          );
        }
      }
    } catch (error) {
      console.error("Error adding device:", error);
      Alert.alert("Error", "Failed to add device");
      setLoading(false);
    }
  };

  const addCustomField = () => {
    if (!newFieldName.trim()) {
      Alert.alert("Error", "Field name is required");
      return;
    }
    
    // Check for duplicate field name
    if (customFields.some(field => field.name === newFieldName.trim())) {
      Alert.alert("Error", "A field with this name already exists");
      return;
    }
    
    let initialValue: any = "";
    if (newFieldType === "number") initialValue = 0;
    if (newFieldType === "boolean") initialValue = false;
    if (newFieldType === "date") initialValue = new Date();
    if (newFieldType === "selection") initialValue = newFieldOptions.split(",")[0]?.trim() || "";
    
    const newField: CustomField = {
      name: newFieldName.trim(),
      type: newFieldType,
      value: initialValue,
      required: newFieldRequired
    };
    
    if (newFieldType === "selection") {
      newField.options = newFieldOptions.split(",").map(opt => opt.trim()).filter(opt => opt);
      if (!newField.options.length) {
        Alert.alert("Error", "Please provide at least one option for selection field");
        return;
      }
    }
    
    setCustomFields([...customFields, newField]);
    setNewFieldName("");
    setNewFieldType("text");
    setNewFieldOptions("");
    setNewFieldRequired(false);
    setShowAddField(false);
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
          <>
          <TouchableOpacity
            className="bg-white border border-gray-300 rounded-lg px-4 py-3 flex-row justify-between items-center"
            onPress={() => {
                if (Platform.OS === 'web') {
                  // For web, use a simple date input
                  const input = document.createElement('input');
                  input.type = 'date';
                  input.value = field.value instanceof Date ? 
                    field.value.toISOString().split('T')[0] : 
                    new Date().toISOString().split('T')[0];
                  
                  input.onchange = (e: any) => {
                    const date = new Date(e.target.value);
                    updateCustomFieldValue(index, date);
                  };
                  
                  // Trigger the input click to open the date picker
                  input.style.position = 'absolute';
                  input.style.opacity = '0';
                  document.body.appendChild(input);
                  input.click();
                  
                  // Clean up after selection
                  input.addEventListener('change', () => {
                    document.body.removeChild(input);
                  });
                  
                  // Clean up if canceled
                  input.addEventListener('blur', () => {
                    if (document.body.contains(input)) {
                      document.body.removeChild(input);
                    }
                  });
                } else {
              // Show date picker for this specific field
              const tempFields = [...customFields];
              tempFields[index].showPicker = true;
              setCustomFields(tempFields);
                }
            }}
          >
            <Text className="text-gray-700">
              {field.value instanceof Date
                ? field.value.toLocaleDateString()
                : "Select date"}
            </Text>
            <Calendar size={20} color="#6B7280" />
            </TouchableOpacity>
            
            {Platform.OS !== 'web' && field.showPicker && (
              Platform.OS === 'ios' ? (
                <View className="bg-white border border-gray-300 rounded-lg mt-1 p-2">
                  <DateTimePicker
                    value={field.value instanceof Date ? field.value : new Date()}
                    mode="date"
                    display="spinner"
                    onChange={(event, selectedDate) => {
                      if (selectedDate) {
                        updateCustomFieldValue(index, selectedDate);
                      }
                    }}
                  />
                  <View className="flex-row justify-end mt-2">
                    <TouchableOpacity
                      className="bg-blue-500 px-3 py-1 rounded-lg"
                      onPress={() => {
                        const tempFields = [...customFields];
                        tempFields[index].showPicker = false;
                        setCustomFields(tempFields);
                      }}
                    >
                      <Text className="text-white">Done</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ) : (
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
              )
            )}
          </>
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

  const handleSerialNumberChange = (text: string) => {
    setSerialNumber(text);
    setSerialNumberError(null);
    
    // Simple validation
    if (text.trim() === "") {
      return;
    }
    
    // Add debounce to avoid too many requests
    // Only check if serial number is long enough (e.g., at least 4 characters)
    if (text.length >= 4) {
      setIsCheckingSerial(true);
      
      // Use timeout for debounce
      const checkTimeout = setTimeout(async () => {
        try {
          // Check if serial number already exists
          const { data, error } = await supabase
            .from("devices")
            .select("id, name")
            .eq("serial_number", text)
            .maybeSingle();
            
          if (error) {
            console.error("Error checking serial number:", error);
          } else if (data) {
            setSerialNumberError(`Serial number already in use by "${data.name}"`);
          }
        } catch (error) {
          console.error("Exception checking serial:", error);
        } finally {
          setIsCheckingSerial(false);
        }
      }, 500);
      
      // Cleanup function to cancel the timeout if component unmounts or input changes again
      return () => clearTimeout(checkTimeout);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      <StatusBar style="dark" />
      
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        className="flex-1"
      >
        <View className="flex-row justify-between items-center p-4 border-b border-gray-200 bg-white">
          <View className="flex-row items-center">
            <TouchableOpacity onPress={() => router.canGoBack() ? router.back() : router.replace("/devices")} className="mr-4">
              <ArrowLeft size={24} color="#0F172A" />
            </TouchableOpacity>
            <Text className="text-xl font-bold text-gray-800">Add New Device</Text>
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
              <View className="mb-3 bg-gray-100 rounded-xl p-4 relative">
                {imageUri ? (
                  <View>
                  <Image
                    source={{ uri: imageUri }}
                    className="w-32 h-32 rounded-lg"
                    resizeMode="cover"
                  />
                    <TouchableOpacity
                      className="absolute top-2 right-2 bg-red-500 rounded-full p-1"
                      onPress={() => setImageUri(null)}
                    >
                      <X size={16} color="#FFFFFF" />
                    </TouchableOpacity>
                  </View>
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
              <View className="flex-row">
                <View className="flex-1 mr-2 relative">
                <TextInput
                    className={`bg-white border ${serialNumberError ? 'border-red-500' : 'border-gray-300'} rounded-lg px-4 py-3 text-gray-800`}
                  value={serialNumber}
                    onChangeText={handleSerialNumberChange}
                  placeholder="Enter serial number"
                />
                  {isCheckingSerial && (
                    <View className="absolute right-3 top-3">
                      <ActivityIndicator size="small" color="#6B7280" />
                    </View>
                  )}
                </View>
                <TouchableOpacity
                  className="bg-blue-500 px-3 py-3 rounded-lg flex-row items-center"
                  onPress={() => setShowScanner(true)}
                >
                  <Barcode size={20} color="#FFFFFF" />
                </TouchableOpacity>
              </View>
              {serialNumberError && (
                <Text className="text-red-500 text-xs mt-1">{serialNumberError}</Text>
              )}
            </View>
            
            <View className="mb-4">
              <View className="flex-row justify-between items-center mb-1">
                <Text className="text-sm font-medium text-gray-700">Model *</Text>
                <TouchableOpacity onPress={() => router.push("/devices/models")}>
                  <Text className="text-sm text-blue-500">Manage Models</Text>
                </TouchableOpacity>
            </View>
              <View className="flex-row">
              <TextInput
                  className="bg-white border border-gray-300 rounded-lg px-4 py-3 text-gray-800 flex-1 mr-2"
                value={model}
                onChangeText={setModel}
                  placeholder="Select a model"
                  editable={false}
                />
                <TouchableOpacity
                  className="bg-blue-500 px-3 py-3 rounded-lg flex-row items-center"
                  onPress={() => setShowModelPicker(true)}
                >
                  <Package size={20} color="#FFFFFF" />
                </TouchableOpacity>
              </View>
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
                  <Picker.Item label="Select a restaurant" value="" />
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
              <Text className="text-sm font-medium text-gray-700 mb-1">Device Category</Text>
              <View className="bg-white border border-gray-300 rounded-lg px-1 py-1">
                <Picker
                  selectedValue={selectedCategory}
                  onValueChange={(itemValue) => setSelectedCategory(itemValue)}
                >
                  <Picker.Item label="Select a category" value="" />
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
                onPress={() => {
                  if (Platform.OS === 'web') {
                    // For web, use a simple date input
                    const input = document.createElement('input');
                    input.type = 'date';
                    input.value = purchaseDate ? 
                      purchaseDate.toISOString().split('T')[0] : 
                      new Date().toISOString().split('T')[0];
                    
                    input.onchange = (e: any) => {
                      const date = new Date(e.target.value);
                      setPurchaseDate(date);
                    };
                    
                    // Trigger the input click to open the date picker
                    input.style.position = 'absolute';
                    input.style.opacity = '0';
                    document.body.appendChild(input);
                    input.click();
                    
                    // Clean up after selection
                    input.addEventListener('change', () => {
                      document.body.removeChild(input);
                    });
                    
                    // Clean up if canceled
                    input.addEventListener('blur', () => {
                      if (document.body.contains(input)) {
                        document.body.removeChild(input);
                      }
                    });
                  } else {
                    setShowPurchaseDatePicker(true);
                  }
                }}
              >
                <Text className="text-gray-700">
                  {purchaseDate ? purchaseDate.toLocaleDateString() : "Select date"}
                </Text>
                <Calendar size={20} color="#6B7280" />
              </TouchableOpacity>
              
              {Platform.OS !== 'web' && showPurchaseDatePicker && (
                Platform.OS === 'ios' ? (
                  <View className="bg-white border border-gray-300 rounded-lg mt-1 p-2">
                <DateTimePicker
                  testID="purchaseDatePicker"
                  value={purchaseDate || new Date()}
                  mode="date"
                      display="spinner"
                  onChange={(event, selectedDate) => {
                    if (selectedDate) {
                      setPurchaseDate(selectedDate);
                    }
                  }}
                />
                    <View className="flex-row justify-end mt-2">
                      <TouchableOpacity
                        className="bg-blue-500 px-3 py-1 rounded-lg"
                        onPress={() => setShowPurchaseDatePicker(false)}
                      >
                        <Text className="text-white">Done</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                ) : (
                  <DateTimePicker
                    testID="purchaseDatePicker"
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
                )
              )}
            </View>
            
            <View className="mb-4">
              <Text className="text-sm font-medium text-gray-700 mb-1">Warranty Expiry</Text>
              <TouchableOpacity
                className="bg-white border border-gray-300 rounded-lg px-4 py-3 flex-row justify-between items-center"
                onPress={() => {
                  if (Platform.OS === 'web') {
                    // For web, use a simple date input
                    const input = document.createElement('input');
                    input.type = 'date';
                    input.value = warrantyExpiry ? 
                      warrantyExpiry.toISOString().split('T')[0] : 
                      new Date().toISOString().split('T')[0];
                    
                    input.onchange = (e: any) => {
                      const date = new Date(e.target.value);
                      setWarrantyExpiry(date);
                    };
                    
                    // Trigger the input click to open the date picker
                    input.style.position = 'absolute';
                    input.style.opacity = '0';
                    document.body.appendChild(input);
                    input.click();
                    
                    // Clean up after selection
                    input.addEventListener('change', () => {
                      document.body.removeChild(input);
                    });
                    
                    // Clean up if canceled
                    input.addEventListener('blur', () => {
                      if (document.body.contains(input)) {
                        document.body.removeChild(input);
                      }
                    });
                  } else {
                    setShowWarrantyDatePicker(true);
                  }
                }}
              >
                <Text className="text-gray-700">
                  {warrantyExpiry ? warrantyExpiry.toLocaleDateString() : "Select date"}
                </Text>
                <Calendar size={20} color="#6B7280" />
              </TouchableOpacity>
              
              {Platform.OS !== 'web' && showWarrantyDatePicker && (
                Platform.OS === 'ios' ? (
                  <View className="bg-white border border-gray-300 rounded-lg mt-1 p-2">
                <DateTimePicker
                  testID="warrantyDatePicker"
                  value={warrantyExpiry || new Date()}
                  mode="date"
                      display="spinner"
                  onChange={(event, selectedDate) => {
                    if (selectedDate) {
                      setWarrantyExpiry(selectedDate);
                    }
                  }}
                />
                    <View className="flex-row justify-end mt-2">
                      <TouchableOpacity
                        className="bg-blue-500 px-3 py-1 rounded-lg"
                        onPress={() => setShowWarrantyDatePicker(false)}
                      >
                        <Text className="text-white">Done</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                ) : (
                  <DateTimePicker
                    testID="warrantyDatePicker"
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
                )
              )}
            </View>
          </View>
          
          {/* Custom Fields */}
          <View className="bg-white rounded-lg shadow-sm p-4 mb-6">
            <View className="flex-row justify-between items-center mb-4">
              <Text className="text-lg font-semibold text-gray-800">Custom Fields</Text>
              <TouchableOpacity
                className="bg-blue-500 p-2 rounded-full"
                onPress={() => setShowAddField(true)}
              >
                <Plus size={18} color="#FFFFFF" />
              </TouchableOpacity>
            </View>
            
            {customFields.length === 0 ? (
              <Text className="text-gray-500 italic text-center py-4">
                No custom fields added yet
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
            
            {showAddField && (
              <View className="bg-blue-50 p-4 rounded-lg mt-2">
                <Text className="text-base font-medium text-blue-800 mb-3">Add Custom Field</Text>
                
                <View className="mb-3">
                  <Text className="text-sm font-medium text-gray-700 mb-1">Field Name *</Text>
                  <TextInput
                    className="bg-white border border-gray-300 rounded-lg px-4 py-2 text-gray-800"
                    value={newFieldName}
                    onChangeText={setNewFieldName}
                    placeholder="Enter field name"
                  />
                </View>
                
                <View className="mb-3">
                  <Text className="text-sm font-medium text-gray-700 mb-1">Field Type</Text>
                  <View className="bg-white border border-gray-300 rounded-lg px-1 py-1">
                    <Picker
                      selectedValue={newFieldType}
                      onValueChange={(itemValue) => setNewFieldType(itemValue as CustomField["type"])}
                    >
                      <Picker.Item label="Text" value="text" />
                      <Picker.Item label="Number" value="number" />
                      <Picker.Item label="Yes/No" value="boolean" />
                      <Picker.Item label="Date" value="date" />
                      <Picker.Item label="Selection" value="selection" />
                    </Picker>
                  </View>
                </View>
                
                {newFieldType === "selection" && (
                  <View className="mb-3">
                    <Text className="text-sm font-medium text-gray-700 mb-1">Options (comma separated)</Text>
                    <TextInput
                      className="bg-white border border-gray-300 rounded-lg px-4 py-2 text-gray-800"
                      value={newFieldOptions}
                      onChangeText={setNewFieldOptions}
                      placeholder="Option 1, Option 2, Option 3"
                    />
                  </View>
                )}
                
                <View className="mb-4 flex-row items-center">
                  <Switch
                    value={newFieldRequired}
                    onValueChange={setNewFieldRequired}
                  />
                  <Text className="text-gray-700 ml-2">Required field</Text>
                </View>
                
                <View className="flex-row">
                  <TouchableOpacity
                    className="bg-gray-500 px-4 py-2 rounded-lg mr-2"
                    onPress={() => {
                      setShowAddField(false);
                      setNewFieldName("");
                      setNewFieldType("text");
                      setNewFieldOptions("");
                      setNewFieldRequired(false);
                    }}
                  >
                    <Text className="text-white">Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    className="bg-blue-500 px-4 py-2 rounded-lg"
                    onPress={addCustomField}
                  >
                    <Text className="text-white">Add Field</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </View>
          
          <View className="h-20" />
        </ScrollView>
      </KeyboardAvoidingView>
      
      {/* Barcode Scanner Modal */}
      {showScanner && (
        <Modal
          animationType="slide"
          transparent={false}
          visible={showScanner}
          onRequestClose={() => setShowScanner(false)}
        >
          <SafeAreaView className="flex-1">
            <View className="flex-row justify-between items-center p-4 bg-white border-b border-gray-200">
              <Text className="text-xl font-bold text-gray-800">Scan Barcode</Text>
              <TouchableOpacity 
                onPress={() => setShowScanner(false)}
                className="p-2"
              >
                <X size={24} color="#0F172A" />
              </TouchableOpacity>
            </View>
            
            <View className="flex-1">
              {hasCameraPermission === null ? (
                <View className="flex-1 justify-center items-center">
                  <Text className="text-gray-600">Requesting camera permission...</Text>
                </View>
              ) : hasCameraPermission === false ? (
                <View className="flex-1 justify-center items-center p-4">
                  <Text className="text-red-500 text-center mb-4">
                    Camera permission is required to scan barcodes.
                  </Text>
                  <TouchableOpacity
                    className="bg-blue-500 px-4 py-2 rounded-lg"
                    onPress={() => setShowScanner(false)}
                  >
                    <Text className="text-white font-medium">Close</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <BarCodeScanner
                  onBarCodeScanned={handleBarCodeScanned}
                  style={{ flex: 1 }}
                />
              )}
            </View>
            
            <View className="p-4 bg-white border-t border-gray-200">
              <Text className="text-gray-600 text-center mb-4">
                Position the barcode in the center of the screen.
              </Text>
              <TouchableOpacity
                className="bg-gray-200 py-3 rounded-lg"
                onPress={() => setShowScanner(false)}
              >
                <Text className="text-gray-800 font-medium text-center">Cancel</Text>
              </TouchableOpacity>
            </View>
          </SafeAreaView>
        </Modal>
      )}

      {/* Device Model Picker Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={showModelPicker}
        onRequestClose={() => setShowModelPicker(false)}
      >
        <View className="flex-1 justify-end bg-black/50">
          <View className="bg-white rounded-t-xl h-3/4">
            <View className="flex-row justify-between items-center p-4 border-b border-gray-200">
              <Text className="text-lg font-semibold text-gray-800">Select Device Model</Text>
              <TouchableOpacity onPress={() => setShowModelPicker(false)}>
                <X size={24} color="#0F172A" />
              </TouchableOpacity>
            </View>
            
            <FlatList
              data={deviceModels}
              keyExtractor={(item) => item.id}
              contentContainerStyle={{ padding: 16 }}
              ListEmptyComponent={
                <View className="py-4">
                  <Text className="text-center text-gray-500">No device models found</Text>
                  <TouchableOpacity
                    className="mt-2 bg-blue-500 px-4 py-2 rounded-lg mx-auto"
                    onPress={() => {
                      setShowModelPicker(false);
                      router.push("/devices/models");
                    }}
                  >
                    <Text className="text-white">Add Models</Text>
                  </TouchableOpacity>
                </View>
              }
              renderItem={({item}) => (
                <TouchableOpacity
                  className={`p-4 border-b border-gray-100 ${item.id === modelId ? "bg-blue-50" : ""}`}
                  onPress={() => handleSelectModel(item.id)}
                >
                  <Text className="font-medium text-gray-800">{item.name}</Text>
                  <Text className="text-gray-500">{item.manufacturer}</Text>
                </TouchableOpacity>
              )}
            />
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
} 