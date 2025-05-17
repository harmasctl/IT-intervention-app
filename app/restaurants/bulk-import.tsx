import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Alert,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { useRouter } from "expo-router";
import { ArrowLeft, Upload, FileText, AlertCircle } from "lucide-react-native";
import { supabase } from "../../lib/supabase";

export default function BulkImportRestaurantsScreen() {
  const router = useRouter();
  const [csvData, setCsvData] = useState("");
  const [loading, setLoading] = useState(false);
  const [previewData, setPreviewData] = useState<any[]>([]);
  const [showPreview, setShowPreview] = useState(false);

  const handlePreview = () => {
    if (!csvData.trim()) {
      Alert.alert("Error", "Please enter CSV data");
      return;
    }

    try {
      // Parse CSV data
      const lines = csvData.trim().split("\n");
      const headers = lines[0].split(",").map((header) => header.trim());

      // Validate required headers
      const requiredHeaders = ["id", "name"];
      const missingHeaders = requiredHeaders.filter(
        (header) => !headers.includes(header),
      );

      if (missingHeaders.length > 0) {
        Alert.alert(
          "Invalid CSV Format",
          `Missing required headers: ${missingHeaders.join(", ")}`,
        );
        return;
      }

      // Parse data rows
      const data = [];
      for (let i = 1; i < lines.length; i++) {
        if (!lines[i].trim()) continue;

        const values = lines[i].split(",").map((value) => value.trim());
        const row: any = {};

        headers.forEach((header, index) => {
          row[header] = values[index] || "";
        });

        data.push(row);
      }

      setPreviewData(data);
      setShowPreview(true);
    } catch (error) {
      console.error("Error parsing CSV:", error);
      Alert.alert("Error", "Failed to parse CSV data");
    }
  };

  const handleImport = async () => {
    if (previewData.length === 0) {
      Alert.alert("Error", "No data to import");
      return;
    }

    try {
      setLoading(true);

      // Prepare data for import
      const restaurantsToImport = previewData.map((item) => ({
        id: item.id,
        name: item.name,
        address: item.address || null,
        city: item.city || null,
        phone: item.phone || null,
        email: item.email || null,
      }));

      // Insert data in batches of 50
      const batchSize = 50;
      let successCount = 0;
      let errorCount = 0;

      for (let i = 0; i < restaurantsToImport.length; i += batchSize) {
        const batch = restaurantsToImport.slice(i, i + batchSize);
        const { data, error } = await supabase
          .from("restaurants")
          .insert(batch);

        if (error) {
          console.error("Error importing batch:", error);
          errorCount += batch.length;
        } else {
          successCount += batch.length;
        }
      }

      Alert.alert(
        "Import Complete",
        `Successfully imported ${successCount} restaurants. ${errorCount > 0 ? `Failed to import ${errorCount} restaurants.` : ""}`,
        [
          {
            text: "OK",
            onPress: () => router.replace("/restaurants"),
          },
        ],
      );
    } catch (error) {
      console.error("Error importing restaurants:", error);
      Alert.alert("Error", "Failed to import restaurants");
    } finally {
      setLoading(false);
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
          <Text className="text-blue-500 ml-1">Cancel</Text>
        </TouchableOpacity>
        <Text className="text-xl font-bold text-blue-800">
          Bulk Import Restaurants
        </Text>
        <View style={{ width: 70 }} />
      </View>

      <ScrollView className="flex-1 p-4">
        <View className="bg-blue-50 p-4 rounded-lg mb-6">
          <Text className="text-blue-800 font-medium">
            Import multiple restaurants at once using CSV format. The first row
            should contain headers.
          </Text>
          <Text className="text-blue-800 mt-2">Required columns: id, name</Text>
          <Text className="text-blue-800 mt-1">
            Optional columns: address, city, phone, email
          </Text>
        </View>

        <View className="mb-6">
          <Text className="text-gray-700 mb-2 font-medium">
            Paste CSV Data Below
          </Text>
          <TextInput
            className="border border-gray-300 rounded-lg px-3 py-2 h-40"
            placeholder="id,name,address,city,phone,email\nREST001,Restaurant 1,123 Main St,New York,555-1234,rest1@example.com\nREST002,Restaurant 2,456 Oak Ave,Chicago,555-5678,rest2@example.com"
            value={csvData}
            onChangeText={setCsvData}
            multiline
            textAlignVertical="top"
            style={{ fontFamily: "monospace" }}
          />
        </View>

        <TouchableOpacity
          className="bg-blue-600 py-3 rounded-lg items-center mb-6 flex-row justify-center"
          onPress={handlePreview}
          disabled={loading}
        >
          <FileText size={20} color="white" className="mr-2" />
          <Text className="text-white font-bold text-lg">Preview Data</Text>
        </TouchableOpacity>

        {showPreview && (
          <View className="mb-6">
            <Text className="text-lg font-bold text-gray-800 mb-2">
              Preview ({previewData.length} restaurants)
            </Text>

            {previewData.length > 0 ? (
              <View className="border border-gray-300 rounded-lg overflow-hidden">
                <ScrollView horizontal>
                  <View>
                    {/* Headers */}
                    <View className="flex-row bg-gray-100 p-2">
                      {Object.keys(previewData[0]).map((header) => (
                        <Text
                          key={header}
                          className="font-bold text-gray-800 px-2 w-32"
                        >
                          {header}
                        </Text>
                      ))}
                    </View>

                    {/* Data rows (limit to 5 for preview) */}
                    <ScrollView>
                      {previewData.slice(0, 5).map((row, rowIndex) => (
                        <View
                          key={rowIndex}
                          className="flex-row border-t border-gray-200 p-2"
                        >
                          {Object.entries(row).map(([key, value]) => (
                            <Text
                              key={key}
                              className="text-gray-800 px-2 w-32"
                              numberOfLines={1}
                            >
                              {value as string}
                            </Text>
                          ))}
                        </View>
                      ))}
                    </ScrollView>

                    {previewData.length > 5 && (
                      <View className="p-2 bg-gray-50 border-t border-gray-200">
                        <Text className="text-gray-500 text-center">
                          {previewData.length - 5} more rows not shown in
                          preview
                        </Text>
                      </View>
                    )}
                  </View>
                </ScrollView>
              </View>
            ) : (
              <View className="bg-gray-50 p-4 rounded-lg items-center">
                <AlertCircle size={24} color="#f59e0b" />
                <Text className="text-gray-500 mt-2">No data to preview</Text>
              </View>
            )}

            <TouchableOpacity
              className="bg-green-600 py-3 rounded-lg items-center mt-4 flex-row justify-center"
              onPress={handleImport}
              disabled={loading || previewData.length === 0}
            >
              {loading ? (
                <>
                  <ActivityIndicator
                    color="white"
                    size="small"
                    className="mr-2"
                  />
                  <Text className="text-white font-bold text-lg">
                    Importing...
                  </Text>
                </>
              ) : (
                <>
                  <Upload size={20} color="white" className="mr-2" />
                  <Text className="text-white font-bold text-lg">
                    Import {previewData.length} Restaurants
                  </Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        )}

        <View className="bg-gray-50 p-4 rounded-lg mb-6">
          <Text className="text-gray-700 font-medium mb-2">Example Format</Text>
          <ScrollView horizontal>
            <View>
              <Text style={{ fontFamily: "monospace" }}>
                id,name,address,city,phone,email
              </Text>
              <Text style={{ fontFamily: "monospace" }}>
                REST001,Restaurant 1,123 Main St,New
                York,555-1234,rest1@example.com
              </Text>
              <Text style={{ fontFamily: "monospace" }}>
                REST002,Restaurant 2,456 Oak
                Ave,Chicago,555-5678,rest2@example.com
              </Text>
            </View>
          </ScrollView>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
