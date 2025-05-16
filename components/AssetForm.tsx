import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Alert,
  ScrollView,
  Modal,
  ActivityIndicator,
} from "react-native";
import {
  ArrowLeft,
  Camera,
  Calendar,
  Building2,
  User,
} from "lucide-react-native";
import { supabase } from "../lib/supabase";
import DateTimePicker from "@react-native-community/datetimepicker";
import { useAuth } from "./AuthProvider";

type AssetFormProps = {
  asset?: any;
  onClose: () => void;
  onSuccess: () => void;
};

export default function AssetForm({
  asset,
  onClose,
  onSuccess,
}: AssetFormProps) {
  const { user } = useAuth();
  const [name, setName] = useState(asset?.name || "");
  const [type, setType] = useState(asset?.type || "Computer");
  const [model, setModel] = useState(asset?.model || "");
  const [serialNumber, setSerialNumber] = useState(asset?.serial_number || "");
  const [status, setStatus] = useState(asset?.status || "operational");
  const [purchaseDate, setPurchaseDate] = useState(
    asset?.purchase_date ? new Date(asset.purchase_date) : new Date(),
  );
  const [warrantyExpiry, setWarrantyExpiry] = useState(
    asset?.warranty_expiry ? new Date(asset.warranty_expiry) : new Date(),
  );
  const [value, setValue] = useState(asset?.value?.toString() || "");
  const [notes, setNotes] = useState(asset?.notes || "");
  const [locationId, setLocationId] = useState(asset?.location_id || null);
  const [locationName, setLocationName] = useState(asset?.location_name || "");
  const [showPurchaseDatePicker, setShowPurchaseDatePicker] = useState(false);
  const [showWarrantyDatePicker, setShowWarrantyDatePicker] = useState(false);
  const [showLocationModal, setShowLocationModal] = useState(false);
  const [locations, setLocations] = useState<any[]>([]);
  const [loadingLocations, setLoadingLocations] = useState(false);
  const [loading, setLoading] = useState(false);

  const assetTypes = [
    "Computer",
    "Smartphone",
    "Printer",
    "Monitor",
    "Server",
    "Network",
    "POS",
    "Other",
  ];

  const statusTypes = ["operational", "maintenance", "offline", "retired"];

  useEffect(() => {
    if (showLocationModal) {
      fetchLocations();
    }
  }, [showLocationModal]);

  const fetchLocations = async () => {
    try {
      setLoadingLocations(true);
      const { data, error } = await supabase
        .from("restaurants")
        .select("id, name")
        .order("name");

      if (error) throw error;

      if (data) {
        setLocations(data);
      }
    } catch (error) {
      console.error("Error fetching locations:", error);
      Alert.alert("Error", "Failed to load locations");
    } finally {
      setLoadingLocations(false);
    }
  };

  const handlePurchaseDateChange = (event: any, selectedDate?: Date) => {
    setShowPurchaseDatePicker(false);
    if (selectedDate) {
      setPurchaseDate(selectedDate);
    }
  };

  const handleWarrantyDateChange = (event: any, selectedDate?: Date) => {
    setShowWarrantyDatePicker(false);
    if (selectedDate) {
      setWarrantyExpiry(selectedDate);
    }
  };

  const handleSubmit = async () => {
    if (!name) {
      Alert.alert("Error", "Please enter asset name");
      return;
    }

    if (!model) {
      Alert.alert("Error", "Please enter asset model");
      return;
    }

    try {
      setLoading(true);

      const assetData = {
        name,
        type,
        model,
        serial_number: serialNumber || null,
        status,
        purchase_date: purchaseDate.toISOString(),
        warranty_expiry: warrantyExpiry.toISOString(),
        value: value ? parseFloat(value) : null,
        notes: notes || null,
        location_id: locationId,
        updated_at: new Date().toISOString(),
      };

      if (asset) {
        // Update existing asset
        const { error } = await supabase
          .from("assets")
          .update(assetData)
          .eq("id", asset.id);

        if (error) throw error;

        Alert.alert("Success", "Asset updated successfully");
      } else {
        // Create new asset
        const newAssetData = {
          ...assetData,
          created_at: new Date().toISOString(),
          created_by: user?.id,
        };

        const { error } = await supabase.from("assets").insert([newAssetData]);

        if (error) throw error;

        Alert.alert("Success", "Asset added successfully");
      }

      onSuccess();
    } catch (error) {
      console.error("Error saving asset:", error);
      Alert.alert("Error", "Failed to save asset");
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString();
  };

  return (
    <View className="flex-1 bg-white">
      {/* Header */}
      <View className="flex-row justify-between items-center px-4 py-3 border-b border-gray-200">
        <TouchableOpacity onPress={onClose} className="flex-row items-center">
          <ArrowLeft size={20} color="#3b82f6" />
          <Text className="text-blue-500 ml-1">Cancel</Text>
        </TouchableOpacity>
        <Text className="text-xl font-bold text-blue-800">
          {asset ? "Edit Asset" : "Add Asset"}
        </Text>
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
              placeholder="Enter asset name"
              value={name}
              onChangeText={setName}
            />
          </View>

          <View className="mb-4">
            <Text className="text-gray-700 mb-1 font-medium">Type *</Text>
            <View className="border border-gray-300 rounded-lg overflow-hidden">
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View className="flex-row p-1">
                  {assetTypes.map((assetType) => (
                    <TouchableOpacity
                      key={assetType}
                      className={`px-3 py-2 rounded-lg mr-2 ${type === assetType ? "bg-blue-500" : "bg-gray-100"}`}
                      onPress={() => setType(assetType)}
                    >
                      <Text
                        className={`${type === assetType ? "text-white" : "text-gray-700"}`}
                      >
                        {assetType}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </ScrollView>
            </View>
          </View>

          <View className="mb-4">
            <Text className="text-gray-700 mb-1 font-medium">Model *</Text>
            <TextInput
              className="border border-gray-300 rounded-lg px-3 py-2"
              placeholder="Enter model number"
              value={model}
              onChangeText={setModel}
            />
          </View>

          <View className="mb-4">
            <Text className="text-gray-700 mb-1 font-medium">
              Serial Number
            </Text>
            <View className="flex-row">
              <TextInput
                className="border border-gray-300 rounded-l-lg px-3 py-2 flex-1"
                placeholder="Enter serial number"
                value={serialNumber}
                onChangeText={setSerialNumber}
              />
              <TouchableOpacity className="bg-blue-500 rounded-r-lg px-3 items-center justify-center">
                <Camera size={20} color="white" />
              </TouchableOpacity>
            </View>
          </View>

          <View className="mb-4">
            <Text className="text-gray-700 mb-1 font-medium">Status *</Text>
            <View className="border border-gray-300 rounded-lg overflow-hidden">
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View className="flex-row p-1">
                  {statusTypes.map((statusType) => (
                    <TouchableOpacity
                      key={statusType}
                      className={`px-3 py-2 rounded-lg mr-2 ${status === statusType ? "bg-blue-500" : "bg-gray-100"}`}
                      onPress={() => setStatus(statusType)}
                    >
                      <Text
                        className={`${status === statusType ? "text-white" : "text-gray-700"} capitalize`}
                      >
                        {statusType}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </ScrollView>
            </View>
          </View>

          <View className="mb-4">
            <Text className="text-gray-700 mb-1 font-medium">
              Purchase Date
            </Text>
            <TouchableOpacity
              className="flex-row items-center border border-gray-300 rounded-lg px-3 py-2"
              onPress={() => setShowPurchaseDatePicker(true)}
            >
              <Calendar size={20} color="#4b5563" className="mr-2" />
              <Text className="text-gray-800">{formatDate(purchaseDate)}</Text>
            </TouchableOpacity>
            {showPurchaseDatePicker && (
              <DateTimePicker
                value={purchaseDate}
                mode="date"
                display="default"
                onChange={handlePurchaseDateChange}
              />
            )}
          </View>

          <View className="mb-4">
            <Text className="text-gray-700 mb-1 font-medium">
              Warranty Expiry
            </Text>
            <TouchableOpacity
              className="flex-row items-center border border-gray-300 rounded-lg px-3 py-2"
              onPress={() => setShowWarrantyDatePicker(true)}
            >
              <Calendar size={20} color="#4b5563" className="mr-2" />
              <Text className="text-gray-800">
                {formatDate(warrantyExpiry)}
              </Text>
            </TouchableOpacity>
            {showWarrantyDatePicker && (
              <DateTimePicker
                value={warrantyExpiry}
                mode="date"
                display="default"
                onChange={handleWarrantyDateChange}
                minimumDate={purchaseDate}
              />
            )}
          </View>

          <View className="mb-4">
            <Text className="text-gray-700 mb-1 font-medium">Value</Text>
            <TextInput
              className="border border-gray-300 rounded-lg px-3 py-2"
              placeholder="Enter asset value"
              value={value}
              onChangeText={setValue}
              keyboardType="numeric"
            />
          </View>

          <View className="mb-4">
            <Text className="text-gray-700 mb-1 font-medium">Location</Text>
            <TouchableOpacity
              className="flex-row justify-between items-center border border-gray-300 rounded-lg px-3 py-2"
              onPress={() => setShowLocationModal(true)}
            >
              <View className="flex-row items-center">
                <Building2 size={20} color="#4b5563" className="mr-2" />
                <Text
                  className={locationName ? "text-gray-800" : "text-gray-400"}
                >
                  {locationName || "Select a location"}
                </Text>
              </View>
              <Text className="text-gray-500">▼</Text>
            </TouchableOpacity>
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
              {loading ? "Saving..." : asset ? "Update Asset" : "Add Asset"}
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Location Selection Modal */}
      <Modal
        visible={showLocationModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowLocationModal(false)}
      >
        <View className="flex-1 bg-black bg-opacity-50 justify-end">
          <View className="bg-white rounded-t-3xl max-h-[70%]">
            <View className="p-4 border-b border-gray-200">
              <Text className="text-xl font-bold text-center text-blue-800">
                Select Location
              </Text>
              <TouchableOpacity
                className="absolute right-4 top-4"
                onPress={() => setShowLocationModal(false)}
              >
                <Text className="text-blue-600 font-medium">Close</Text>
              </TouchableOpacity>
            </View>

            {loadingLocations ? (
              <View className="p-8 items-center justify-center">
                <ActivityIndicator size="large" color="#1e40af" />
                <Text className="mt-2 text-gray-500">Loading locations...</Text>
              </View>
            ) : locations.length > 0 ? (
              <ScrollView className="p-4">
                {locations.map((location) => (
                  <TouchableOpacity
                    key={location.id}
                    className="p-4 border-b border-gray-100 flex-row items-center"
                    onPress={() => {
                      setLocationId(location.id);
                      setLocationName(location.name);
                      setShowLocationModal(false);
                    }}
                  >
                    <View className="bg-blue-100 w-10 h-10 rounded-full items-center justify-center mr-3">
                      <Building2 size={20} color="#1e40af" />
                    </View>
                    <Text className="font-bold text-gray-800">
                      {location.name}
                    </Text>
                  </TouchableOpacity>
                ))}
                <TouchableOpacity
                  className="p-4 bg-blue-50 flex-row items-center justify-center"
                  onPress={() => {
                    setLocationId(null);
                    setLocationName("");
                    setShowLocationModal(false);
                  }}
                >
                  <Text className="font-medium text-blue-600">
                    Clear Selection
                  </Text>
                </TouchableOpacity>
              </ScrollView>
            ) : (
              <View className="p-8 items-center justify-center">
                <Text className="text-gray-500 text-center">
                  No locations available. Add locations first.
                </Text>
              </View>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}
