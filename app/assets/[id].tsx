import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  Modal,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { useLocalSearchParams, useRouter } from "expo-router";
import {
  ArrowLeft,
  Edit,
  Trash2,
  Calendar,
  Clock,
  CheckCircle,
  AlertCircle,
  Building2,
  User,
  Tag,
  DollarSign,
  FileText,
  Tool,
} from "lucide-react-native";
import { supabase } from "../../lib/supabase";
import AssetForm from "../../components/AssetForm";
import AssetMaintenanceHistory from "../../components/AssetMaintenanceHistory";
import MaintenanceScheduler from "../../components/MaintenanceScheduler";

export default function AssetDetailScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const [asset, setAsset] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showEditForm, setShowEditForm] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showMaintenanceScheduler, setShowMaintenanceScheduler] =
    useState(false);

  useEffect(() => {
    if (id) {
      fetchAssetDetails();
    }
  }, [id]);

  const fetchAssetDetails = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("assets")
        .select("*, restaurants(id, name)")
        .eq("id", id)
        .single();

      if (error) throw error;

      if (data) {
        setAsset({
          ...data,
          location_name: data.restaurants?.name || "Unassigned",
        });
      }
    } catch (error) {
      console.error("Error fetching asset details:", error);
      Alert.alert("Error", "Failed to load asset details");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    try {
      const { error } = await supabase.from("assets").delete().eq("id", id);

      if (error) throw error;

      Alert.alert("Success", "Asset deleted successfully");
      router.replace("/assets");
    } catch (error) {
      console.error("Error deleting asset:", error);
      Alert.alert("Error", "Failed to delete asset");
    }
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case "operational":
        return "bg-green-100 text-green-800";
      case "maintenance":
        return "bg-amber-100 text-amber-800";
      case "offline":
        return "bg-red-100 text-red-800";
      case "retired":
        return "bg-gray-100 text-gray-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status.toLowerCase()) {
      case "operational":
        return <CheckCircle size={16} color="#15803d" />;
      case "maintenance":
        return <Clock size={16} color="#b45309" />;
      case "offline":
        return <AlertCircle size={16} color="#dc2626" />;
      case "retired":
        return <AlertCircle size={16} color="#6b7280" />;
      default:
        return <CheckCircle size={16} color="#15803d" />;
    }
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return "Not set";
    return new Date(dateString).toLocaleDateString();
  };

  const formatCurrency = (value?: number) => {
    if (value === undefined || value === null) return "Not set";
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(value);
  };

  if (loading) {
    return (
      <SafeAreaView className="flex-1 bg-white">
        <StatusBar style="auto" />
        <View className="flex-1 justify-center items-center">
          <ActivityIndicator size="large" color="#1e40af" />
          <Text className="mt-4 text-gray-500">Loading asset details...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!asset) {
    return (
      <SafeAreaView className="flex-1 bg-white">
        <StatusBar style="auto" />
        <View className="flex-1 justify-center items-center p-4">
          <AlertCircle size={48} color="#ef4444" />
          <Text className="mt-4 text-gray-800 text-lg font-bold">
            Asset Not Found
          </Text>
          <Text className="mt-2 text-gray-500 text-center">
            The asset you're looking for doesn't exist or has been deleted.
          </Text>
          <TouchableOpacity
            className="mt-6 bg-blue-600 px-4 py-2 rounded-lg"
            onPress={() => router.back()}
          >
            <Text className="text-white font-medium">Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-white">
      <StatusBar style="auto" />

      {showEditForm ? (
        <AssetForm
          asset={asset}
          onClose={() => setShowEditForm(false)}
          onSuccess={() => {
            setShowEditForm(false);
            fetchAssetDetails();
          }}
        />
      ) : showMaintenanceScheduler ? (
        <MaintenanceScheduler
          deviceId={asset.id}
          deviceName={asset.name}
          onCancel={() => setShowMaintenanceScheduler(false)}
          onSuccess={() => {
            setShowMaintenanceScheduler(false);
            fetchAssetDetails();
          }}
        />
      ) : (
        <>
          {/* Header */}
          <View className="flex-row items-center p-4 border-b border-gray-200">
            <TouchableOpacity onPress={() => router.back()} className="mr-4">
              <ArrowLeft size={24} color="#1e40af" />
            </TouchableOpacity>
            <View className="flex-1">
              <Text
                className="text-xl font-bold text-gray-800"
                numberOfLines={1}
              >
                {asset.name}
              </Text>
              <Text className="text-gray-500">{asset.model}</Text>
            </View>
            <View className="flex-row">
              <TouchableOpacity
                className="mr-4"
                onPress={() => setShowEditForm(true)}
              >
                <Edit size={20} color="#1e40af" />
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setShowDeleteConfirm(true)}>
                <Trash2 size={20} color="#ef4444" />
              </TouchableOpacity>
            </View>
          </View>

          <ScrollView className="flex-1 p-4">
            {/* Status */}
            <View className="mb-6 flex-row justify-between items-center">
              <Text className="text-lg font-bold text-gray-800">Status</Text>
              <View
                className={`px-3 py-1.5 rounded-full flex-row items-center ${getStatusColor(
                  asset.status,
                )}`}
              >
                {getStatusIcon(asset.status)}
                <Text className="ml-1 font-medium capitalize">
                  {asset.status}
                </Text>
              </View>
            </View>

            {/* Asset Details */}
            <View className="bg-gray-50 rounded-xl p-4 mb-6">
              <Text className="text-lg font-bold text-gray-800 mb-3">
                Asset Details
              </Text>

              <View className="space-y-3">
                <View className="flex-row items-center">
                  <Tag size={18} color="#4b5563" className="mr-3" />
                  <View>
                    <Text className="text-gray-500 text-sm">Type</Text>
                    <Text className="text-gray-800 font-medium">
                      {asset.type}
                    </Text>
                  </View>
                </View>

                <View className="flex-row items-center">
                  <FileText size={18} color="#4b5563" className="mr-3" />
                  <View>
                    <Text className="text-gray-500 text-sm">Serial Number</Text>
                    <Text className="text-gray-800 font-medium">
                      {asset.serial_number || "Not available"}
                    </Text>
                  </View>
                </View>

                <View className="flex-row items-center">
                  <Building2 size={18} color="#4b5563" className="mr-3" />
                  <View>
                    <Text className="text-gray-500 text-sm">Location</Text>
                    <Text className="text-gray-800 font-medium">
                      {asset.location_name}
                    </Text>
                  </View>
                </View>

                <View className="flex-row items-center">
                  <User size={18} color="#4b5563" className="mr-3" />
                  <View>
                    <Text className="text-gray-500 text-sm">Assigned To</Text>
                    <Text className="text-gray-800 font-medium">
                      {asset.assigned_name || "Unassigned"}
                    </Text>
                  </View>
                </View>

                <View className="flex-row items-center">
                  <Calendar size={18} color="#4b5563" className="mr-3" />
                  <View>
                    <Text className="text-gray-500 text-sm">Purchase Date</Text>
                    <Text className="text-gray-800 font-medium">
                      {formatDate(asset.purchase_date)}
                    </Text>
                  </View>
                </View>

                <View className="flex-row items-center">
                  <Calendar size={18} color="#4b5563" className="mr-3" />
                  <View>
                    <Text className="text-gray-500 text-sm">
                      Warranty Expiry
                    </Text>
                    <Text className="text-gray-800 font-medium">
                      {formatDate(asset.warranty_expiry)}
                    </Text>
                  </View>
                </View>

                <View className="flex-row items-center">
                  <DollarSign size={18} color="#4b5563" className="mr-3" />
                  <View>
                    <Text className="text-gray-500 text-sm">Value</Text>
                    <Text className="text-gray-800 font-medium">
                      {formatCurrency(asset.value)}
                    </Text>
                  </View>
                </View>
              </View>
            </View>

            {/* Maintenance */}
            <View className="mb-6">
              <View className="flex-row justify-between items-center mb-3">
                <Text className="text-lg font-bold text-gray-800">
                  Maintenance
                </Text>
                <TouchableOpacity
                  className="bg-blue-600 px-3 py-1.5 rounded-lg flex-row items-center"
                  onPress={() => setShowMaintenanceScheduler(true)}
                >
                  <Tool size={16} color="white" className="mr-1" />
                  <Text className="text-white font-medium">Schedule</Text>
                </TouchableOpacity>
              </View>

              <View className="bg-gray-50 rounded-xl p-4">
                <View className="flex-row justify-between items-center mb-3">
                  <View className="flex-row items-center">
                    <Clock size={18} color="#4b5563" className="mr-2" />
                    <Text className="text-gray-800">Last Maintenance</Text>
                  </View>
                  <Text className="text-gray-800 font-medium">
                    {formatDate(asset.last_maintenance)}
                  </Text>
                </View>

                <View className="flex-row justify-between items-center">
                  <View className="flex-row items-center">
                    <Calendar size={18} color="#4b5563" className="mr-2" />
                    <Text className="text-gray-800">Next Scheduled</Text>
                  </View>
                  <Text className="text-gray-800 font-medium">
                    {formatDate(asset.next_maintenance)}
                  </Text>
                </View>
              </View>
            </View>

            {/* Maintenance History */}
            <AssetMaintenanceHistory
              assetId={asset.id}
              onAddMaintenance={() => setShowMaintenanceScheduler(true)}
            />

            {/* Notes */}
            {asset.notes && (
              <View className="mb-6">
                <Text className="text-lg font-bold text-gray-800 mb-2">
                  Notes
                </Text>
                <View className="bg-gray-50 rounded-xl p-4">
                  <Text className="text-gray-800">{asset.notes}</Text>
                </View>
              </View>
            )}
          </ScrollView>

          {/* Delete Confirmation Modal */}
          <Modal
            visible={showDeleteConfirm}
            transparent={true}
            animationType="fade"
            onRequestClose={() => setShowDeleteConfirm(false)}
          >
            <View className="flex-1 bg-black bg-opacity-50 justify-center items-center p-4">
              <View className="bg-white rounded-xl p-6 w-full max-w-sm">
                <AlertCircle
                  size={48}
                  color="#ef4444"
                  className="self-center mb-4"
                />
                <Text className="text-xl font-bold text-center mb-2">
                  Delete Asset
                </Text>
                <Text className="text-gray-600 text-center mb-6">
                  Are you sure you want to delete this asset? This action cannot
                  be undone.
                </Text>
                <View className="flex-row justify-between">
                  <TouchableOpacity
                    className="bg-gray-200 px-4 py-2 rounded-lg flex-1 mr-2"
                    onPress={() => setShowDeleteConfirm(false)}
                  >
                    <Text className="text-gray-800 font-medium text-center">
                      Cancel
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    className="bg-red-600 px-4 py-2 rounded-lg flex-1 ml-2"
                    onPress={handleDelete}
                  >
                    <Text className="text-white font-medium text-center">
                      Delete
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </Modal>
        </>
      )}
    </SafeAreaView>
  );
}
