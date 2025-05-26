import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  TextInput,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { useRouter } from "expo-router";
import {
  ArrowLeft,
  Upload,
  FileText,
  Check,
  AlertCircle,
} from "lucide-react-native";
import { supabase } from "../../lib/supabase";
import * as DocumentPicker from "expo-document-picker";
import * as FileSystem from "expo-file-system";
import Papa from "papaparse";

type RestaurantImport = {
  name: string;
  location?: string;
  address?: string;
  phone?: string;
  email?: string;
  manager_name?: string;
  status?: "active" | "closed" | "renovation";
};

export default function BulkImportScreen() {
  const router = useRouter();
  const [importing, setImporting] = useState(false);
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [previewData, setPreviewData] = useState<RestaurantImport[]>([]);
  const [importErrors, setImportErrors] = useState<string[]>([]);
  const [importSuccess, setImportSuccess] = useState(false);
  const [successCount, setSuccessCount] = useState(0);

  const pickCSVFile = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: "text/comma-separated-values",
        copyToCacheDirectory: true,
      });

      if (result.canceled) {
        return;
      }

      const fileUri = result.assets[0].uri;
      const fileName = result.assets[0].name;

      setSelectedFile(fileUri);
      setFileName(fileName);
      
      // Read and parse the CSV file
      const fileContent = await FileSystem.readAsStringAsync(fileUri);
      parseCSV(fileContent);
    } catch (error) {
      console.error("Error picking CSV file:", error);
      Alert.alert("Error", "Failed to pick CSV file");
    }
  };

  const parseCSV = (csvContent: string) => {
    Papa.parse(csvContent, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const data = results.data as RestaurantImport[];
        
        // Validate data
        const errors: string[] = [];
        
        data.forEach((row, index) => {
          if (!row.name) {
            errors.push(`Row ${index + 1}: Missing restaurant name`);
          }
        });
        
        setPreviewData(data);
        setImportErrors(errors);
      },
      error: (error) => {
        console.error("CSV parsing error:", error);
        setImportErrors([`CSV parsing error: ${error.message}`]);
      }
    });
  };

  const handleImport = async () => {
    if (importErrors.length > 0) {
      Alert.alert("Error", "Please fix the errors before importing");
      return;
    }

    if (previewData.length === 0) {
      Alert.alert("Error", "No data to import");
      return;
    }

    setImporting(true);
    try {
      // Map data to match database schema
      const dataToImport = previewData.map(restaurant => ({
        name: restaurant.name,
        location: restaurant.location || null,
        address: restaurant.address || null,
        phone: restaurant.phone || null,
        email: restaurant.email || null,
        manager_name: restaurant.manager_name || null,
        status: restaurant.status || "active",
        created_at: new Date().toISOString(),
      }));
      
      // Insert data in batches of 50
      const batchSize = 50;
      let successCount = 0;
      
      for (let i = 0; i < dataToImport.length; i += batchSize) {
        const batch = dataToImport.slice(i, i + batchSize);
        
        const { data, error } = await supabase
          .from("restaurants")
          .insert(batch)
          .select();
          
        if (error) {
          console.error("Import error:", error);
          throw error;
        }
        
        if (data) {
          successCount += data.length;
        }
      }
      
      setSuccessCount(successCount);
      setImportSuccess(true);
      
      Alert.alert(
        "Import Successful",
        `Successfully imported ${successCount} restaurants`,
        [{ text: "OK", onPress: () => router.push("/restaurants") }]
      );
    } catch (error: any) {
      console.error("Error importing restaurants:", error);
      Alert.alert("Import Failed", error.message || "Failed to import restaurants");
    } finally {
      setImporting(false);
    }
  };

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
        <Text className="text-xl font-bold text-gray-800">Bulk Import Restaurants</Text>
        <View style={{ width: 20 }} />
      </View>
      
      <ScrollView className="flex-1 p-4">
        {/* Instructions */}
        <View className="bg-blue-50 p-4 rounded-xl mb-6">
          <Text className="text-blue-800 font-medium mb-2">Instructions:</Text>
          <Text className="text-blue-700 mb-1">1. Prepare a CSV file with the following columns:</Text>
          <Text className="text-blue-600 ml-4 mb-2">name (required), location, address, phone, email, manager_name, status</Text>
          <Text className="text-blue-700 mb-1">2. Upload the CSV file using the button below</Text>
          <Text className="text-blue-700 mb-1">3. Review the data preview</Text>
          <Text className="text-blue-700">4. Click Import to add the restaurants to the database</Text>
        </View>
        
        {/* File Upload */}
        <TouchableOpacity
          onPress={pickCSVFile}
          className="border-2 border-dashed border-blue-300 rounded-xl p-6 items-center mb-6"
        >
          <Upload size={40} color="#3b82f6" />
          <Text className="text-blue-700 font-medium mt-3 mb-1">
            {fileName ? "Change CSV File" : "Select CSV File"}
          </Text>
          {fileName && (
            <View className="flex-row items-center mt-2">
              <FileText size={16} color="#4b5563" />
              <Text className="text-gray-600 ml-1">{fileName}</Text>
            </View>
          )}
        </TouchableOpacity>
        
        {/* Errors */}
        {importErrors.length > 0 && (
          <View className="bg-red-50 p-4 rounded-xl mb-6">
            <Text className="text-red-800 font-medium mb-2">Errors Found:</Text>
            {importErrors.map((error, index) => (
              <View key={index} className="flex-row items-start mb-1">
                <AlertCircle size={16} color="#b91c1c" style={{ marginTop: 2 }} />
                <Text className="text-red-700 ml-2 flex-1">{error}</Text>
              </View>
            ))}
          </View>
        )}
        
        {/* Data Preview */}
        {previewData.length > 0 && (
          <View className="mb-6">
            <Text className="text-gray-800 font-bold text-lg mb-3">
              Data Preview ({previewData.length} restaurants)
            </Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={true}
              className="mb-3"
            >
              <View>
                <View className="flex-row bg-gray-100 p-2">
                  <Text className="font-medium text-gray-800 w-40">Name</Text>
                  <Text className="font-medium text-gray-800 w-40">Location</Text>
                  <Text className="font-medium text-gray-800 w-40">Phone</Text>
                  <Text className="font-medium text-gray-800 w-40">Manager</Text>
                  <Text className="font-medium text-gray-800 w-20">Status</Text>
                </View>
                <ScrollView style={{ maxHeight: 200 }}>
                  {previewData.slice(0, 10).map((item, index) => (
                    <View
                      key={index}
                      className={`flex-row p-2 ${
                        index % 2 === 0 ? "bg-white" : "bg-gray-50"
                      }`}
                    >
                      <Text className="text-gray-800 w-40" numberOfLines={1}>
                        {item.name}
                      </Text>
                      <Text className="text-gray-600 w-40" numberOfLines={1}>
                        {item.location || "-"}
                      </Text>
                      <Text className="text-gray-600 w-40" numberOfLines={1}>
                        {item.phone || "-"}
                      </Text>
                      <Text className="text-gray-600 w-40" numberOfLines={1}>
                        {item.manager_name || "-"}
                      </Text>
                      <Text className="text-gray-600 w-20" numberOfLines={1}>
                        {item.status || "active"}
                      </Text>
                    </View>
                  ))}
                  {previewData.length > 10 && (
                    <View className="p-2 bg-gray-50 items-center">
                      <Text className="text-gray-500 italic">
                        +{previewData.length - 10} more rows
                      </Text>
                    </View>
                  )}
                </ScrollView>
              </View>
            </ScrollView>
          </View>
        )}
        
        {/* Import Button */}
        <TouchableOpacity
          className={`py-3 rounded-xl ${
            previewData.length > 0 && importErrors.length === 0
              ? "bg-blue-600"
              : "bg-gray-300"
          }`}
          onPress={handleImport}
          disabled={previewData.length === 0 || importErrors.length > 0 || importing}
        >
          {importing ? (
            <ActivityIndicator color="white" />
          ) : (
            <Text className="text-white font-bold text-center text-lg">
              Import Restaurants
            </Text>
          )}
        </TouchableOpacity>
        
        {/* Success State */}
        {importSuccess && (
          <View className="mt-6 bg-green-50 p-4 rounded-xl">
            <View className="flex-row items-center mb-2">
              <Check size={20} color="#16a34a" />
              <Text className="text-green-800 font-medium ml-2">
                Import Successful!
              </Text>
            </View>
            <Text className="text-green-700">
              Successfully imported {successCount} restaurants.
            </Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
