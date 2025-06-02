import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  TextInput,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { useRouter } from "expo-router";
import {
  ArrowLeft,
  Upload,
  FileText,
  CheckCircle,
  AlertCircle,
  Download,
  HelpCircle,
  Copy,
} from "lucide-react-native";
import { supabase } from "../../lib/supabase";
// Removed external dependencies for simplified implementation

interface DeviceImport {
  name: string;
  serial_number: string;
  type: string;
  model?: string;
  status?: string;
  restaurant_id: string;
  category_id?: string;
}

export default function BulkImportScreen() {
  const router = useRouter();
  const [importText, setImportText] = useState("");
  const [importStatus, setImportStatus] = useState<"idle" | "processing" | "success" | "error">("idle");
  const [importResult, setImportResult] = useState<{
    total: number;
    success: number;
    errors: { row: number; message: string }[];
  }>({ total: 0, success: 0, errors: [] });
  const [showInstructions, setShowInstructions] = useState(false);

  const handleSelectFile = async () => {
    // Simplified file selection - show instructions for manual paste
    Alert.alert(
      "File Selection",
      "For this demo, please copy your CSV content and paste it in the text area below. In a production app, this would open a file picker.",
      [{ text: "OK" }]
    );
  };

  const handleImport = async () => {
    if (!importText.trim()) {
      Alert.alert("Error", "Please enter CSV data or select a file");
      return;
    }

    try {
      setImportStatus("processing");

      // Simple CSV parsing
      const lines = importText.trim().split('\n');
      if (lines.length < 2) {
        Alert.alert("Error", "CSV must have at least a header row and one data row.");
        setImportStatus("error");
        return;
      }

      const headers = lines[0].split(',').map(h => h.trim());
      const dataRows = lines.slice(1).map(line => {
        const values = line.split(',').map(v => v.trim());
        const row: Record<string, string> = {};
        headers.forEach((header, index) => {
          row[header] = values[index] || '';
        });
        return row;
      });

      const devices: DeviceImport[] = [];
      const errors: { row: number; message: string }[] = [];

      // Validate and transform data
      dataRows.forEach((row, index) => {
        if (!row.name || !row.serial_number || !row.type || !row.restaurant_id) {
          errors.push({
            row: index + 2, // +2 for header row and 1-indexing
            message: "Missing required field(s): name, serial_number, type, or restaurant_id",
          });
          return;
        }

        const device: DeviceImport = {
          name: row.name,
          serial_number: row.serial_number,
          type: row.type,
          model: row.model,
          restaurant_id: row.restaurant_id,
          category_id: row.category_id,
        };

        if (row.status) {
          if (["operational", "maintenance", "offline"].includes(row.status)) {
            device.status = row.status;
          } else {
            errors.push({
              row: index + 2,
              message: "Invalid status. Must be 'operational', 'maintenance', or 'offline'",
            });
          }
        }

        devices.push(device);
      });

      if (errors.length > 0 && errors.length === dataRows.length) {
        setImportResult({
          total: dataRows.length,
          success: 0,
          errors,
        });
        setImportStatus("error");
        return;
      }

      // Insert devices
      let successCount = 0;

      for (const device of devices) {
        const { error } = await supabase.from("devices").insert([device]);

        if (error) {
          console.error("Error inserting device:", error);
          const rowIndex = devices.indexOf(device);
          errors.push({
            row: rowIndex + 2,
            message: error.message,
          });
        } else {
          successCount++;
        }
      }

      setImportResult({
        total: devices.length,
        success: successCount,
        errors,
      });

      setImportStatus(errors.length > 0 ? "error" : "success");
    } catch (error) {
      console.error("Error importing devices:", error);
      Alert.alert("Error", "Failed to import devices");
      setImportStatus("error");
    }
  };

  const copyTemplateToClipboard = async () => {
    const template =
      "name,serial_number,type,model,status,restaurant_id,category_id\n" +
      "Refrigerator XL,REF123456,refrigerator,Model ABC,operational,restaurant_id_here,category_id_here\n" +
      "Oven Pro,OVN789012,oven,Model DEF,operational,restaurant_id_here,";

    // For demo purposes, just show the template
    Alert.alert(
      "CSV Template",
      template + "\n\nCopy this template and paste it in the text area above.",
      [{ text: "OK" }]
    );
  };

  const renderInstructionsModal = () => (
    <ScrollView className="bg-white rounded-lg p-4 mb-6">
      <View className="flex-row justify-between items-center mb-4">
        <Text className="text-lg font-semibold text-gray-800">Import Instructions</Text>
        <TouchableOpacity onPress={() => setShowInstructions(false)}>
          <Text className="text-blue-500">Close</Text>
        </TouchableOpacity>
      </View>

      <Text className="text-gray-700 mb-3">
        The CSV file should have the following columns:
      </Text>

      <View className="mb-4">
        <Text className="font-medium text-gray-800 mb-1">Required columns:</Text>
        <Text className="text-gray-700">• name - Device name</Text>
        <Text className="text-gray-700">• serial_number - Unique identifier</Text>
        <Text className="text-gray-700">• type - Device type (e.g., refrigerator, oven)</Text>
        <Text className="text-gray-700">• restaurant_id - Restaurant ID</Text>
      </View>

      <View className="mb-4">
        <Text className="font-medium text-gray-800 mb-1">Optional columns:</Text>
        <Text className="text-gray-700">• model - Device model</Text>
        <Text className="text-gray-700">• status - One of: operational, maintenance, offline</Text>
        <Text className="text-gray-700">• category_id - Device category ID</Text>
      </View>

      <Text className="text-gray-700 mb-3">
        You can copy a template to get started.
      </Text>

      <TouchableOpacity
        className="bg-blue-100 rounded-lg py-2 px-4 flex-row items-center justify-center mb-3"
        onPress={copyTemplateToClipboard}
      >
        <Copy size={16} color="#1E40AF" className="mr-2" />
        <Text className="text-blue-700">Copy Template</Text>
      </TouchableOpacity>

      <Text className="text-gray-500 text-sm">
        Note: For restaurant_id and category_id, you need to use the actual IDs from the database.
        You can find these in the restaurants and device_categories tables.
      </Text>
    </ScrollView>
  );

  const renderStatusIndicator = () => {
    switch (importStatus) {
      case "processing":
        return (
          <View className="flex-row items-center bg-blue-100 p-4 rounded-lg">
            <ActivityIndicator color="#1E40AF" />
            <Text className="text-blue-700 ml-2">Processing import...</Text>
          </View>
        );
      case "success":
        return (
          <View className="bg-green-100 p-4 rounded-lg">
            <View className="flex-row items-center mb-2">
              <CheckCircle size={20} color="#10B981" />
              <Text className="text-green-700 font-medium ml-2">Import successful</Text>
            </View>
            <Text className="text-green-700">
              Successfully imported {importResult.success} of {importResult.total} devices.
            </Text>
            {importResult.errors.length > 0 && (
              <Text className="text-yellow-700 mt-2">
                Warning: {importResult.errors.length} devices had errors.
              </Text>
            )}
          </View>
        );
      case "error":
        return (
          <View className="bg-red-100 p-4 rounded-lg">
            <View className="flex-row items-center mb-2">
              <AlertCircle size={20} color="#EF4444" />
              <Text className="text-red-700 font-medium ml-2">Import failed</Text>
            </View>
            <Text className="text-red-700">
              {importResult.success > 0
                ? `Partially imported ${importResult.success} of ${importResult.total} devices.`
                : "No devices were imported."}
            </Text>
            <Text className="text-red-700 mt-2">
              Errors: {importResult.errors.length}
            </Text>
            <ScrollView className="mt-2 max-h-32">
              {importResult.errors.map((error, index) => (
                <Text key={index} className="text-red-700 text-sm">
                  • Row {error.row}: {error.message}
                </Text>
              ))}
            </ScrollView>
          </View>
        );
      default:
        return null;
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      <StatusBar style="dark" />

      <View className="flex-row justify-between items-center p-4 border-b border-gray-200 bg-white">
        <View className="flex-row items-center">
          <TouchableOpacity onPress={() => router.back()} className="mr-4">
            <ArrowLeft size={24} color="#0F172A" />
          </TouchableOpacity>
          <Text className="text-xl font-bold text-gray-800">Bulk Import Devices</Text>
        </View>
        <TouchableOpacity
          className="bg-blue-100 p-2 rounded-full"
          onPress={() => setShowInstructions(true)}
        >
          <HelpCircle size={20} color="#1E40AF" />
        </TouchableOpacity>
      </View>

      <ScrollView className="flex-1 p-4">
        {showInstructions ? renderInstructionsModal() : (
          <>
            <View className="bg-white rounded-lg p-4 mb-6">
              <View className="flex-row items-center mb-4">
                <FileText size={20} color="#6B7280" className="mr-2" />
                <Text className="text-lg font-semibold text-gray-800">CSV Data</Text>
              </View>

              <TextInput
                className="border border-gray-300 rounded-lg p-3 mb-4 min-h-[150px]"
                multiline
                placeholder="Paste CSV data here or select a file..."
                value={importText}
                onChangeText={setImportText}
                style={{ textAlignVertical: "top" }}
              />

              <View className="flex-row">
                <TouchableOpacity
                  className="bg-gray-100 rounded-lg py-2 px-4 flex-row items-center mr-2"
                  onPress={handleSelectFile}
                >
                  <Download size={16} color="#4B5563" className="mr-2" />
                  <Text className="text-gray-700">Select CSV File</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  className="bg-blue-100 rounded-lg py-2 px-4 flex-row items-center"
                  onPress={copyTemplateToClipboard}
                >
                  <Copy size={16} color="#1E40AF" className="mr-2" />
                  <Text className="text-blue-700">Copy Template</Text>
                </TouchableOpacity>
              </View>
            </View>

            {importStatus !== "idle" && (
              <View className="mb-6">
                {renderStatusIndicator()}
              </View>
            )}

            <TouchableOpacity
              className="bg-blue-500 py-3 rounded-lg items-center flex-row justify-center mb-6"
              onPress={handleImport}
              disabled={importStatus === "processing" || !importText.trim()}
            >
              <Upload size={20} color="#FFFFFF" className="mr-2" />
              <Text className="text-white font-bold">
                {importStatus === "processing" ? "Importing..." : "Import Devices"}
              </Text>
            </TouchableOpacity>

            <View className="bg-yellow-50 p-4 rounded-lg mb-6">
              <Text className="text-yellow-800">
                <Text className="font-medium">Note: </Text>
                Make sure your CSV file has all required columns. Click the help icon for more information.
              </Text>
            </View>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
