import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
} from "react-native";
import { ArrowLeft, Upload, Check, X, AlertCircle } from "lucide-react-native";
import { supabase } from "../lib/supabase";

interface Restaurant {
  id: string;
  name: string;
}

interface DeviceCategory {
  id: string;
  name: string;
}

interface BulkDeviceImportProps {
  onClose: () => void;
  onSuccess?: () => void;
}

const BulkDeviceImport = ({ onClose, onSuccess }: BulkDeviceImportProps) => {
  const [csvData, setCsvData] = useState("");
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [categories, setCategories] = useState<DeviceCategory[]>([]);
  const [selectedRestaurant, setSelectedRestaurant] = useState<string>("");
  const [selectedCategory, setSelectedCategory] = useState<string>("");
  const [loading, setLoading] = useState({
    restaurants: true,
    categories: true,
    import: false,
  });
  const [parsedDevices, setParsedDevices] = useState<any[]>([]);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);

  useEffect(() => {
    fetchRestaurants();
    fetchCategories();
  }, []);

  const fetchRestaurants = async () => {
    try {
      const { data, error } = await supabase
        .from("restaurants")
        .select("id, name")
        .order("name");

      if (error) throw error;

      setRestaurants(data || []);
    } catch (error) {
      console.error("Error fetching restaurants:", error);
      Alert.alert("Error", "Failed to load restaurants");
    } finally {
      setLoading((prev) => ({ ...prev, restaurants: false }));
    }
  };

  const fetchCategories = async () => {
    try {
      const { data, error } = await supabase
        .from("device_categories")
        .select("id, name")
        .order("name");

      if (error) throw error;

      setCategories(data || []);
    } catch (error) {
      console.error("Error fetching categories:", error);
      Alert.alert("Error", "Failed to load device categories");
    } finally {
      setLoading((prev) => ({ ...prev, categories: false }));
    }
  };

  const parseCSV = () => {
    if (!csvData.trim()) {
      Alert.alert("Error", "Please enter CSV data");
      return;
    }

    try {
      // Split by lines and remove empty lines
      const lines = csvData
        .split("\n")
        .map((line) => line.trim())
        .filter((line) => line.length > 0);

      if (lines.length === 0) {
        Alert.alert("Error", "No data found in CSV");
        return;
      }

      // Parse header
      const header = lines[0].split(",").map((h) => h.trim());
      const requiredColumns = ["name", "serial_number", "status", "type"];
      const missingColumns = requiredColumns.filter(
        (col) => !header.includes(col),
      );

      if (missingColumns.length > 0) {
        Alert.alert(
          "Error",
          `Missing required columns: ${missingColumns.join(", ")}`,
        );
        return;
      }

      // Parse data rows
      const devices = [];
      const errors = [];

      for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(",").map((v) => v.trim());

        // Skip if row doesn't have enough values
        if (values.length < header.length) {
          errors.push(`Line ${i + 1}: Not enough values`);
          continue;
        }

        const device = {};
        let hasError = false;

        // Map values to object properties
        header.forEach((column, index) => {
          device[column] = values[index];

          // Validate required fields
          if (
            requiredColumns.includes(column) &&
            (!values[index] || values[index].length === 0)
          ) {
            errors.push(`Line ${i + 1}: Missing ${column}`);
            hasError = true;
          }
        });

        // Validate status
        if (
          device["status"] &&
          !["operational", "maintenance", "offline"].includes(
            device["status"].toLowerCase(),
          )
        ) {
          errors.push(
            `Line ${i + 1}: Invalid status "${device["status"]}". Must be operational, maintenance, or offline`,
          );
          hasError = true;
        }

        if (!hasError) {
          devices.push(device);
        }
      }

      setParsedDevices(devices);
      setValidationErrors(errors);

      if (errors.length > 0) {
        Alert.alert(
          "Validation Errors",
          `Found ${errors.length} errors in CSV data. Please review and fix before importing.`,
        );
      } else if (devices.length === 0) {
        Alert.alert("Error", "No valid devices found in CSV data");
      } else {
        Alert.alert(
          "CSV Parsed Successfully",
          `Found ${devices.length} valid devices ready to import.`,
        );
      }
    } catch (error) {
      console.error("Error parsing CSV:", error);
      Alert.alert("Error", "Failed to parse CSV data. Please check format.");
    }
  };

  const handleImport = async () => {
    if (parsedDevices.length === 0) {
      Alert.alert("Error", "No devices to import");
      return;
    }

    if (!selectedRestaurant) {
      Alert.alert("Error", "Please select a restaurant");
      return;
    }

    try {
      setLoading((prev) => ({ ...prev, import: true }));

      // Prepare devices for import with restaurant_id and category_id
      const devicesToImport = parsedDevices.map((device) => ({
        ...device,
        restaurant_id: selectedRestaurant,
        category_id: selectedCategory || null,
        status: device.status.toLowerCase(),
        created_at: new Date().toISOString(),
      }));

      // Insert devices in batches of 20 to avoid potential limits
      const batchSize = 20;
      let successCount = 0;
      let errorCount = 0;

      for (let i = 0; i < devicesToImport.length; i += batchSize) {
        const batch = devicesToImport.slice(i, i + batchSize);
        const { data, error } = await supabase.from("devices").insert(batch);

        if (error) {
          console.error(`Error importing batch ${i / batchSize + 1}:`, error);
          errorCount += batch.length;
        } else {
          successCount += batch.length;
        }
      }

      if (errorCount > 0) {
        Alert.alert(
          "Import Completed with Errors",
          `Successfully imported ${successCount} devices. Failed to import ${errorCount} devices.`,
        );
      } else {
        Alert.alert(
          "Import Successful",
          `Successfully imported ${successCount} devices.`,
        );
        if (onSuccess) onSuccess();
        onClose();
      }
    } catch (error) {
      console.error("Error importing devices:", error);
      Alert.alert("Error", "Failed to import devices");
    } finally {
      setLoading((prev) => ({ ...prev, import: false }));
    }
  };

  return (
    <View className="flex-1 bg-gray-50 p-4">
      {/* Header */}
      <View className="flex-row items-center mb-4">
        <TouchableOpacity onPress={onClose} className="mr-2">
          <ArrowLeft size={24} color="#1e40af" />
        </TouchableOpacity>
        <Text className="text-2xl font-bold">Bulk Import Devices</Text>
      </View>

      <ScrollView className="flex-1">
        {/* Instructions */}
        <View className="bg-blue-50 p-4 rounded-lg mb-4 border border-blue-200">
          <Text className="font-bold text-blue-800 mb-2">Instructions</Text>
          <Text className="text-blue-800">
            1. Enter CSV data with the following columns: name, serial_number,
            status, type
          </Text>
          <Text className="text-blue-800">
            2. Status must be one of: operational, maintenance, offline
          </Text>
          <Text className="text-blue-800">
            3. First row should be the header row
          </Text>
          <Text className="text-blue-800">
            4. Select a restaurant and optional category for all devices
          </Text>
        </View>

        {/* CSV Input */}
        <Text className="font-bold mb-2">CSV Data</Text>
        <TextInput
          className="border border-gray-300 rounded-lg p-3 mb-4 bg-white h-40"
          placeholder="name,serial_number,status,type\nIce Cream Machine,ICM123,operational,Kitchen Equipment\nPOS Terminal,POS456,maintenance,Electronics"
          multiline
          textAlignVertical="top"
          value={csvData}
          onChangeText={setCsvData}
        />

        <TouchableOpacity
          className="bg-blue-500 py-3 px-4 rounded-lg mb-4"
          onPress={parseCSV}
        >
          <Text className="text-white text-center font-medium">Parse CSV</Text>
        </TouchableOpacity>

        {/* Restaurant Selection */}
        <Text className="font-bold mb-2">Select Restaurant</Text>
        {loading.restaurants ? (
          <ActivityIndicator size="small" color="#1e40af" />
        ) : (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            className="mb-4"
          >
            {restaurants.map((restaurant) => (
              <TouchableOpacity
                key={restaurant.id}
                className={`px-4 py-2 mr-2 rounded-full ${selectedRestaurant === restaurant.id ? "bg-blue-500" : "bg-white border border-gray-300"}`}
                onPress={() => setSelectedRestaurant(restaurant.id)}
              >
                <Text
                  className={`${selectedRestaurant === restaurant.id ? "text-white" : "text-gray-700"}`}
                >
                  {restaurant.name}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}

        {/* Category Selection */}
        <Text className="font-bold mb-2">Select Category (Optional)</Text>
        {loading.categories ? (
          <ActivityIndicator size="small" color="#1e40af" />
        ) : (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            className="mb-4"
          >
            <TouchableOpacity
              className={`px-4 py-2 mr-2 rounded-full ${selectedCategory === "" ? "bg-blue-500" : "bg-white border border-gray-300"}`}
              onPress={() => setSelectedCategory("")}
            >
              <Text
                className={`${selectedCategory === "" ? "text-white" : "text-gray-700"}`}
              >
                None
              </Text>
            </TouchableOpacity>
            {categories.map((category) => (
              <TouchableOpacity
                key={category.id}
                className={`px-4 py-2 mr-2 rounded-full ${selectedCategory === category.id ? "bg-blue-500" : "bg-white border border-gray-300"}`}
                onPress={() => setSelectedCategory(category.id)}
              >
                <Text
                  className={`${selectedCategory === category.id ? "text-white" : "text-gray-700"}`}
                >
                  {category.name}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}

        {/* Validation Results */}
        {validationErrors.length > 0 && (
          <View className="mb-4">
            <Text className="font-bold text-red-500 mb-2">
              Validation Errors
            </Text>
            {validationErrors.map((error, index) => (
              <View
                key={index}
                className="flex-row items-center bg-red-50 p-2 rounded mb-1 border border-red-200"
              >
                <AlertCircle size={16} color="#ef4444" className="mr-2" />
                <Text className="text-red-700">{error}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Parsed Devices */}
        {parsedDevices.length > 0 && (
          <View className="mb-4">
            <Text className="font-bold mb-2">
              Devices Ready to Import ({parsedDevices.length})
            </Text>
            {parsedDevices.slice(0, 5).map((device, index) => (
              <View
                key={index}
                className="bg-white p-3 rounded-lg mb-2 border border-gray-200"
              >
                <Text className="font-medium">{device.name}</Text>
                <Text className="text-gray-600">
                  S/N: {device.serial_number}
                </Text>
                <View className="flex-row justify-between">
                  <Text className="text-gray-600">Type: {device.type}</Text>
                  <Text
                    className={`${device.status.toLowerCase() === "operational" ? "text-green-600" : device.status.toLowerCase() === "maintenance" ? "text-yellow-600" : "text-red-600"}`}
                  >
                    {device.status}
                  </Text>
                </View>
              </View>
            ))}
            {parsedDevices.length > 5 && (
              <Text className="text-gray-500 text-center">
                ...and {parsedDevices.length - 5} more
              </Text>
            )}
          </View>
        )}

        {/* Import Button */}
        <TouchableOpacity
          className={`py-3 px-4 rounded-lg mb-4 ${parsedDevices.length > 0 && selectedRestaurant && !loading.import ? "bg-green-500" : "bg-gray-300"}`}
          onPress={handleImport}
          disabled={
            parsedDevices.length === 0 || !selectedRestaurant || loading.import
          }
        >
          {loading.import ? (
            <View className="flex-row justify-center items-center">
              <ActivityIndicator size="small" color="white" />
              <Text className="text-white text-center font-medium ml-2">
                Importing...
              </Text>
            </View>
          ) : (
            <Text className="text-white text-center font-medium">
              Import {parsedDevices.length} Devices
            </Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
};

export default BulkDeviceImport;
