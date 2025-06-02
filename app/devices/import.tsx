import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
  FlatList,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { useRouter } from "expo-router";
import {
  ArrowLeft,
  Upload,
  Download,
  FileText,
  CheckCircle2,
  AlertCircle,
  X,
  Package,
  Building2,
} from "lucide-react-native";
import { supabase } from "../../lib/supabase";
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';

type ImportDevice = {
  name: string;
  serial_number: string;
  model: string;
  type: string;
  status: string;
  restaurant_name: string;
  category_name: string;
  purchase_date?: string;
  warranty_expiry?: string;
  notes?: string;
  error?: string;
  success?: boolean;
};

export default function BulkImportScreen() {
  const router = useRouter();
  const [importing, setImporting] = useState(false);
  const [devices, setDevices] = useState<ImportDevice[]>([]);
  const [restaurants, setRestaurants] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [models, setModels] = useState<any[]>([]);
  const [importResults, setImportResults] = useState<{success: number, failed: number, total: number} | null>(null);

  useEffect(() => {
    fetchReferenceData();
  }, []);

  const fetchReferenceData = async () => {
    try {
      const [restaurantsRes, categoriesRes, modelsRes] = await Promise.all([
        supabase.from("restaurants").select("id, name"),
        supabase.from("device_categories").select("id, name"),
        supabase.from("device_models").select("id, name, manufacturer")
      ]);

      setRestaurants(restaurantsRes.data || []);
      setCategories(categoriesRes.data || []);
      setModels(modelsRes.data || []);
    } catch (error) {
      console.error("Error fetching reference data:", error);
      Alert.alert("❌ Error", "Failed to load reference data");
    }
  };

  const downloadTemplate = async () => {
    try {
      const csvContent = `name,serial_number,model,type,status,restaurant_name,category_name,purchase_date,warranty_expiry,notes
Example Device 1,SN001,MacBook Pro,Laptop,operational,Main Office,Computers,2024-01-15,2027-01-15,Sample device
Example Device 2,SN002,iPhone 15,Phone,maintenance,Branch Office,Mobile Devices,2024-02-20,2026-02-20,Another sample`;

      if (typeof window !== 'undefined') {
        // Web implementation
        const blob = new Blob([csvContent], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = 'device_import_template.csv';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
        
        Alert.alert("📥 Template Downloaded", "CSV template has been downloaded to your Downloads folder");
      } else {
        // Mobile implementation
        const fileUri = FileSystem.documentDirectory + 'device_import_template.csv';
        await FileSystem.writeAsStringAsync(fileUri, csvContent);
        Alert.alert("📥 Template Created", `Template saved to: ${fileUri}`);
      }
    } catch (error) {
      console.error("Error downloading template:", error);
      Alert.alert("❌ Error", "Failed to download template");
    }
  };

  const pickFile = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['text/csv', 'application/vnd.ms-excel', 'text/plain'],
        copyToCacheDirectory: true,
      });

      if (!result.canceled && result.assets[0]) {
        const file = result.assets[0];
        Alert.alert("📄 File Selected", `Selected: ${file.name}`);
        await parseCSV(file.uri);
      }
    } catch (error) {
      console.error("Error picking file:", error);
      Alert.alert("❌ Error", "Failed to select file");
    }
  };

  const parseCSV = async (fileUri: string) => {
    try {
      setImporting(true);
      let csvContent: string;

      if (typeof window !== 'undefined' && fileUri.startsWith('blob:')) {
        // Web implementation
        const response = await fetch(fileUri);
        csvContent = await response.text();
      } else {
        // Mobile implementation
        csvContent = await FileSystem.readAsStringAsync(fileUri);
      }

      const lines = csvContent.split('\n').filter(line => line.trim());
      const headers = lines[0].split(',').map(h => h.trim());
      
      const parsedDevices: ImportDevice[] = [];
      
      for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(',').map(v => v.trim());
        const device: ImportDevice = {
          name: values[0] || '',
          serial_number: values[1] || '',
          model: values[2] || '',
          type: values[3] || '',
          status: values[4] || 'operational',
          restaurant_name: values[5] || '',
          category_name: values[6] || '',
          purchase_date: values[7] || undefined,
          warranty_expiry: values[8] || undefined,
          notes: values[9] || undefined,
        };

        // Validate device
        if (!device.name || !device.serial_number) {
          device.error = "Missing required fields (name, serial_number)";
        }

        parsedDevices.push(device);
      }

      setDevices(parsedDevices);
      Alert.alert("✅ File Parsed", `Found ${parsedDevices.length} devices to import`);
    } catch (error) {
      console.error("Error parsing CSV:", error);
      Alert.alert("❌ Parse Error", "Failed to parse CSV file. Please check the format.");
    } finally {
      setImporting(false);
    }
  };

  const validateAndImport = async () => {
    if (devices.length === 0) {
      Alert.alert("❌ No Data", "Please select a CSV file first");
      return;
    }

    try {
      setImporting(true);
      let successCount = 0;
      let failedCount = 0;
      const updatedDevices = [...devices];

      for (let i = 0; i < updatedDevices.length; i++) {
        const device = updatedDevices[i];
        
        try {
          // Find restaurant ID
          const restaurant = restaurants.find(r => 
            r.name.toLowerCase() === device.restaurant_name.toLowerCase()
          );
          
          // Find category ID
          const category = categories.find(c => 
            c.name.toLowerCase() === device.category_name.toLowerCase()
          );

          // Find model ID
          const model = models.find(m => 
            m.name.toLowerCase().includes(device.model.toLowerCase())
          );

          if (!restaurant) {
            device.error = `Restaurant "${device.restaurant_name}" not found`;
            failedCount++;
            continue;
          }

          const deviceData = {
            name: device.name,
            serial_number: device.serial_number,
            model: device.model,
            model_id: model?.id || null,
            type: device.type,
            status: device.status,
            restaurant_id: restaurant.id,
            category_id: category?.id || null,
            purchase_date: device.purchase_date ? new Date(device.purchase_date).toISOString() : null,
            warranty_expiry: device.warranty_expiry ? new Date(device.warranty_expiry).toISOString() : null,
            notes: device.notes || null,
          };

          const { error } = await supabase
            .from("devices")
            .insert([deviceData]);

          if (error) {
            device.error = error.message;
            failedCount++;
          } else {
            device.success = true;
            successCount++;
          }
        } catch (error: any) {
          device.error = error.message || "Unknown error";
          failedCount++;
        }
      }

      setDevices(updatedDevices);
      setImportResults({ success: successCount, failed: failedCount, total: devices.length });

      Alert.alert(
        "📊 Import Complete",
        `Successfully imported: ${successCount}\nFailed: ${failedCount}\nTotal: ${devices.length}`,
        [
          {
            text: "View Results",
            onPress: () => {}
          },
          {
            text: "Back to Devices",
            onPress: () => router.replace("/devices")
          }
        ]
      );
    } catch (error) {
      console.error("Error importing devices:", error);
      Alert.alert("❌ Import Error", "Failed to import devices");
    } finally {
      setImporting(false);
    }
  };

  const renderDevice = ({ item, index }: { item: ImportDevice; index: number }) => (
    <View className="bg-white rounded-lg shadow-sm p-4 mb-3 mx-4">
      <View className="flex-row justify-between items-start mb-2">
        <View className="flex-1">
          <Text className="text-lg font-semibold text-gray-800">{item.name}</Text>
          <Text className="text-sm text-gray-500">SN: {item.serial_number}</Text>
        </View>
        <View className="flex-row items-center">
          {item.success ? (
            <CheckCircle2 size={20} color="#10B981" />
          ) : item.error ? (
            <AlertCircle size={20} color="#EF4444" />
          ) : (
            <Package size={20} color="#6B7280" />
          )}
        </View>
      </View>

      <View className="flex-row justify-between items-center mb-2">
        <Text className="text-sm text-gray-600">Model: {item.model}</Text>
        <Text className="text-sm text-gray-600">Type: {item.type}</Text>
      </View>

      <View className="flex-row justify-between items-center">
        <Text className="text-sm text-gray-600">Restaurant: {item.restaurant_name}</Text>
        <Text className="text-sm text-gray-600">Status: {item.status}</Text>
      </View>

      {item.error && (
        <View className="mt-2 p-2 bg-red-50 rounded-lg">
          <Text className="text-sm text-red-600">❌ {item.error}</Text>
        </View>
      )}

      {item.success && (
        <View className="mt-2 p-2 bg-green-50 rounded-lg">
          <Text className="text-sm text-green-600">✅ Successfully imported</Text>
        </View>
      )}
    </View>
  );

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      <StatusBar style="dark" />

      {/* Header */}
      <View className="flex-row justify-between items-center p-4 border-b border-gray-200 bg-white">
        <View className="flex-row items-center flex-1">
          <TouchableOpacity onPress={() => router.back()} className="mr-3">
            <ArrowLeft size={24} color="#0F172A" />
          </TouchableOpacity>
          <Text className="text-lg md:text-xl font-bold text-gray-800 flex-1" numberOfLines={1}>
            Bulk Import Devices
          </Text>
        </View>
      </View>

      {/* Instructions */}
      <View className="bg-blue-50 p-4 mx-4 mt-4 rounded-lg">
        <Text className="text-blue-800 font-semibold mb-2">📋 Import Instructions</Text>
        <Text className="text-blue-700 text-sm mb-2">
          1. Download the CSV template below
        </Text>
        <Text className="text-blue-700 text-sm mb-2">
          2. Fill in your device data following the template format
        </Text>
        <Text className="text-blue-700 text-sm">
          3. Upload your completed CSV file to import devices
        </Text>
      </View>

      {/* Action Buttons */}
      <View className="flex-row p-4 space-x-3">
        <TouchableOpacity
          className="flex-1 bg-green-500 rounded-lg p-4 flex-row items-center justify-center"
          onPress={downloadTemplate}
        >
          <Download size={20} color="#FFFFFF" />
          <Text className="text-white font-medium ml-2">Download Template</Text>
        </TouchableOpacity>

        <TouchableOpacity
          className="flex-1 bg-blue-500 rounded-lg p-4 flex-row items-center justify-center"
          onPress={pickFile}
          disabled={importing}
        >
          <Upload size={20} color="#FFFFFF" />
          <Text className="text-white font-medium ml-2">Select CSV File</Text>
        </TouchableOpacity>
      </View>

      {/* Import Results Summary */}
      {importResults && (
        <View className="bg-white p-4 mx-4 rounded-lg shadow-sm mb-4">
          <Text className="text-lg font-semibold text-gray-800 mb-3">📊 Import Results</Text>
          <View className="flex-row justify-between">
            <View className="items-center">
              <Text className="text-2xl font-bold text-green-600">{importResults.success}</Text>
              <Text className="text-sm text-gray-600">Success</Text>
            </View>
            <View className="items-center">
              <Text className="text-2xl font-bold text-red-600">{importResults.failed}</Text>
              <Text className="text-sm text-gray-600">Failed</Text>
            </View>
            <View className="items-center">
              <Text className="text-2xl font-bold text-blue-600">{importResults.total}</Text>
              <Text className="text-sm text-gray-600">Total</Text>
            </View>
          </View>
        </View>
      )}

      {/* Device List */}
      {devices.length > 0 && (
        <View className="flex-1">
          <View className="flex-row justify-between items-center p-4">
            <Text className="text-lg font-semibold text-gray-800">
              Devices to Import ({devices.length})
            </Text>
            <TouchableOpacity
              className={`px-4 py-2 rounded-lg flex-row items-center ${
                importing ? "bg-gray-400" : "bg-orange-500"
              }`}
              onPress={validateAndImport}
              disabled={importing}
            >
              {importing ? (
                <>
                  <ActivityIndicator size="small" color="#FFFFFF" />
                  <Text className="text-white font-medium ml-2">Importing...</Text>
                </>
              ) : (
                <>
                  <Upload size={16} color="#FFFFFF" />
                  <Text className="text-white font-medium ml-2">Import All</Text>
                </>
              )}
            </TouchableOpacity>
          </View>

          <FlatList
            data={devices}
            renderItem={renderDevice}
            keyExtractor={(item, index) => index.toString()}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: 20 }}
          />
        </View>
      )}

      {devices.length === 0 && !importing && (
        <View className="flex-1 justify-center items-center p-8">
          <FileText size={64} color="#9CA3AF" />
          <Text className="text-xl font-semibold text-gray-800 mt-4 text-center">
            No CSV File Selected
          </Text>
          <Text className="text-gray-600 text-center mt-2">
            Download the template and upload your device data to get started
          </Text>
        </View>
      )}
    </SafeAreaView>
  );
}
