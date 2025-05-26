import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  Image,
  RefreshControl,
  Share,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { useLocalSearchParams, useRouter } from "expo-router";
import {
  ArrowLeft,
  Edit,
  Trash2,
  Clock,
  Calendar,
  Package,
  QrCode,
  Share2,
  Wrench,
  Download,
  Building2,
  PenTool,
  SquareCheck,
  AlertCircle,
  ShieldCheck,
  BadgeCheck,
  ShieldAlert,
  Plus,
} from "lucide-react-native";
import { supabase } from "../../lib/supabase";
import { format, formatDistanceToNow } from "date-fns";
import MaintenanceHistory from "../../components/MaintenanceHistory";
import UpcomingMaintenance from "../../components/UpcomingMaintenance";
import DeviceQRCode from "../../components/DeviceQRCode";

type Device = {
  id: string;
  name: string;
  serial_number: string;
  type: string;
  model?: string;
  status: "operational" | "maintenance" | "offline";
  restaurant_id: string;
  restaurant?: {
    name: string;
    location?: string;
  };
  category_id?: string;
  category?: {
    id: string;
    name: string;
    icon?: string;
    color?: string;
    maintenance_interval?: number;
  };
  last_maintenance?: string;
  warranty_expiry?: string;
  purchase_date?: string;
  qr_code?: string;
  notes?: string;
  custom_fields?: Record<string, any>;
  image?: string;
  created_at: string;
};

type MaintenanceRecord = {
  id: string;
  device_id: string;
  date: string;
  technician_id: string;
  description: string;
  resolved: boolean;
  created_at: string;
  technician?: {
    name: string;
  };
};

export default function DeviceDetailScreen() {
  const params = useLocalSearchParams();
  const id = typeof params.id === 'string' ? params.id : '';
  const router = useRouter();
  const [device, setDevice] = useState<Device | null>(null);
  const [maintenanceRecords, setMaintenanceRecords] = useState<MaintenanceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [isWarrantyValid, setIsWarrantyValid] = useState<boolean | null>(null);
  const [isMaintenanceDue, setIsMaintenanceDue] = useState<boolean | null>(null);
  const [daysSinceLastMaintenance, setDaysSinceLastMaintenance] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (id) {
      fetchDevice();
      fetchMaintenanceRecords();
    } else {
      setError("Invalid device ID");
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    if (device) {
      // Check warranty status
      if (device.warranty_expiry) {
        const warrantyDate = new Date(device.warranty_expiry);
        setIsWarrantyValid(warrantyDate > new Date());
      } else {
        setIsWarrantyValid(null);
      }

      // Check maintenance status
      if (device.last_maintenance && device.category?.maintenance_interval) {
        const lastMaintDate = new Date(device.last_maintenance);
        const interval = device.category.maintenance_interval;
        const nextDueDate = new Date(lastMaintDate);
        nextDueDate.setDate(nextDueDate.getDate() + interval);
        
        setIsMaintenanceDue(nextDueDate <= new Date());
        
        // Calculate days since last maintenance
        const now = new Date();
        const diffTime = Math.abs(now.getTime() - lastMaintDate.getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        setDaysSinceLastMaintenance(diffDays);
      } else {
        setIsMaintenanceDue(null);
        setDaysSinceLastMaintenance(null);
      }
    }
  }, [device]);

  const fetchDevice = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const { data, error } = await supabase
        .from("devices")
        .select(`
          *,
          restaurant:restaurants(name, location),
          category:device_categories(id, name, icon, color, maintenance_interval)
        `)
        .eq("id", id)
        .maybeSingle();

      if (error) {
        console.error("Error fetching device:", error);
        setError("Failed to load device details. The device may not exist or has been deleted.");
        return;
      }

      if (!data) {
        setError("Device not found");
        return;
      }

      // Ensure all required fields exist and have valid values
      const processedDevice = {
        ...data,
        name: data.name || "Unnamed Device",
        serial_number: data.serial_number || "Unknown",
        type: data.type || "Other",
        status: data.status || "operational",
        restaurant: data.restaurant || null,
        category: data.category || null,
      };

      // Handle potential null values in nested objects
      if (processedDevice.restaurant) {
        if (Array.isArray(processedDevice.restaurant)) {
          processedDevice.restaurant = processedDevice.restaurant.length > 0 ? processedDevice.restaurant[0] : null;
        }
        
        if (processedDevice.restaurant && typeof processedDevice.restaurant === 'object') {
          processedDevice.restaurant = {
            name: processedDevice.restaurant.name || "Unknown Location",
            location: processedDevice.restaurant.location || null
          };
        }
      }

      if (processedDevice.category) {
        if (Array.isArray(processedDevice.category)) {
          processedDevice.category = processedDevice.category.length > 0 ? processedDevice.category[0] : null;
        }
        
        if (processedDevice.category && typeof processedDevice.category === 'object') {
          processedDevice.category = {
            id: processedDevice.category.id || "",
            name: processedDevice.category.name || "Uncategorized",
            icon: processedDevice.category.icon || null,
            color: processedDevice.category.color || "#6B7280",
            maintenance_interval: processedDevice.category.maintenance_interval || null
          };
        }
      }

      setDevice(processedDevice as Device);
    } catch (error) {
      console.error("Exception fetching device:", error);
      setError("An unexpected error occurred while loading device details");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const fetchMaintenanceRecords = async () => {
    if (!id) return;
    
    try {
      const { data, error } = await supabase
        .from("maintenance_records")
        .select(`
          *,
          technician:technician_id(name)
        `)
        .eq("device_id", id)
        .order("date", { ascending: false });

      if (error) {
        console.error("Error fetching maintenance records:", error);
        return;
      }

      // Process data to handle potential null values
      const processedRecords = (data || []).map(record => {
        let technicianData = null;
        
        if (record.technician) {
          if (Array.isArray(record.technician)) {
            technicianData = record.technician.length > 0 ? { name: record.technician[0]?.name || "Unknown" } : null;
          } else if (typeof record.technician === 'object' && record.technician !== null) {
            technicianData = { name: record.technician.name || "Unknown" };
          }
        }
        
        return {
          ...record,
          technician: technicianData
        };
      });

      setMaintenanceRecords(processedRecords as MaintenanceRecord[]);
    } catch (error) {
      console.error("Exception fetching maintenance records:", error);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    fetchDevice();
    fetchMaintenanceRecords();
  };

  const handleEdit = () => {
    router.push({
      pathname: `/devices/edit/[id]`,
      params: { id }
    });
  };

  const handleDelete = () => {
    Alert.alert(
      "Delete Device",
      "Are you sure you want to delete this device? This action cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Delete", 
          style: "destructive",
          onPress: async () => {
            try {
              setLoading(true);
              
              // First, try to delete related maintenance records
              const { error: maintenanceError } = await supabase
                .from("maintenance_records")
                .delete()
                .eq("device_id", id);
                
              if (maintenanceError) {
                console.error("Error deleting maintenance records:", maintenanceError);
                // Continue anyway, as we can still try to delete the device
              }
              
              // Try to delete storage objects (images, QR codes)
              try {
                // Delete from device-images bucket
                await supabase.storage
                  .from("device-images")
                  .remove([`${id}.png`, `${id}.jpg`, `${id}.jpeg`]);
                  
                // Delete from device-data bucket
                await supabase.storage
                  .from("device-data")
                  .remove([`${id}.json`]);
              } catch (storageError) {
                console.error("Error deleting storage objects:", storageError);
                // Continue anyway
              }
              
              // Finally, delete the device itself
              const { error } = await supabase
                .from("devices")
                .delete()
                .eq("id", id);
                
              if (error) {
                console.error("Error deleting device:", error);
                Alert.alert("Error", "Failed to delete device. Please try again.");
                return;
              }
              
              Alert.alert(
                "Success",
                "Device deleted successfully",
                [
                  { 
                    text: "OK", 
                    onPress: () => router.replace("/devices")
                  }
                ]
              );
            } catch (error) {
              console.error("Exception deleting device:", error);
              Alert.alert("Error", "An unexpected error occurred while deleting the device");
            } finally {
              setLoading(false);
            }
          }
        }
      ]
    );
  };

  const handleScheduleMaintenance = () => {
    if (!device) return;
    
    router.push({
      pathname: "/devices/maintenance",
      params: { deviceId: id }
    });
  };

  const handleShare = async () => {
    if (!device) return;
    
    try {
      await Share.share({
        title: `${device.name} (${device.serial_number})`,
        message: `Device: ${device.name}\nSerial: ${device.serial_number}\nType: ${device.type}\nModel: ${device.model || 'N/A'}\nLocation: ${device.restaurant?.name || 'N/A'}\nStatus: ${device.status}`,
      });
    } catch (error) {
      console.error("Error sharing device:", error);
    }
  };

  const handleViewQRCode = () => {
    if (!device?.qr_code) {
      Alert.alert("QR Code Unavailable", "No QR code available for this device");
      return;
    }
    
    Alert.alert(
      "Device QR Code",
      "What would you like to do with this QR code?",
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "View", 
          onPress: () => {
            // Navigate to a dedicated QR code view screen
            router.push({
              pathname: "/devices/qr-codes",
              params: { 
                data: device.qr_code,
                name: device.name,
                id: device.id
              }
            });
          }
        }
      ]
    );
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "operational":
        return "#10B981"; // Green
      case "maintenance":
        return "#F59E0B"; // Amber
      case "offline":
        return "#EF4444"; // Red
      default:
        return "#6B7280"; // Gray
    }
  };

  const renderCustomFields = () => {
    if (!device?.custom_fields || Object.keys(device.custom_fields).length === 0) {
      return (
        <Text className="text-gray-500 italic text-center">
          No custom fields for this device
        </Text>
      );
    }

    return (
      <View className="space-y-3">
        {Object.entries(device.custom_fields).map(([name, value], index) => (
          <View key={index} className="flex-row justify-between">
            <Text className="text-gray-700 font-medium">{name}</Text>
            <Text className="text-gray-800">
              {typeof value === "boolean"
                ? value
                  ? "Yes"
                  : "No"
                : value instanceof Date
                ? value.toLocaleDateString()
                : String(value)}
            </Text>
          </View>
        ))}
      </View>
    );
  };

  if (loading && !device) {
    return (
      <SafeAreaView className="flex-1 bg-gray-50">
        <StatusBar style="dark" />
        <View className="flex-1 justify-center items-center">
          <ActivityIndicator size="large" color="#3B82F6" />
          <Text className="text-gray-600 mt-2">Loading device details...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView className="flex-1 bg-gray-50">
        <StatusBar style="dark" />
        <View className="flex-row justify-between items-center p-4 border-b border-gray-200 bg-white">
          <View className="flex-row items-center">
            <TouchableOpacity onPress={() => router.back()} className="mr-4">
              <ArrowLeft size={24} color="#0F172A" />
            </TouchableOpacity>
            <Text className="text-xl font-bold text-gray-800">Device Details</Text>
          </View>
        </View>
        <View className="flex-1 justify-center items-center p-4">
          <AlertCircle size={48} color="#EF4444" />
          <Text className="text-xl font-bold text-gray-800 mt-4">Error</Text>
          <Text className="text-gray-600 text-center mt-2">{error}</Text>
          <TouchableOpacity
            className="mt-6 bg-blue-500 py-3 px-6 rounded-lg"
            onPress={() => router.push("/devices")}
          >
            <Text className="text-white font-medium">View All Devices</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      <StatusBar style="dark" />
      
      <View className="flex-row justify-between items-center p-4 border-b border-gray-200 bg-white">
        <View className="flex-row items-center">
          <TouchableOpacity onPress={() => router.back()} className="mr-4">
            <ArrowLeft size={24} color="#0F172A" />
          </TouchableOpacity>
          <Text className="text-xl font-bold text-gray-800">Device Details</Text>
        </View>
        <View className="flex-row">
          <TouchableOpacity onPress={handleShare} className="mr-4">
            <Share2 size={24} color="#0F172A" />
          </TouchableOpacity>
          <TouchableOpacity onPress={handleEdit}>
            <Edit size={24} color="#0F172A" />
          </TouchableOpacity>
        </View>
      </View>
      
      <ScrollView
        className="flex-1"
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
        showsVerticalScrollIndicator={false}
      >
        {device && (
          <>
            {/* Header Info */}
            <View className="bg-white p-4 mb-4">
              <View className="flex-row">
                <View className="mr-4 bg-gray-100 rounded-xl p-3">
                  {device.image ? (
                    <Image
                      source={{ uri: device.image }}
                      className="w-20 h-20 rounded-lg"
                      resizeMode="cover"
                    />
                  ) : (
                    <Package
                      size={40}
                      color={device.category?.color || "#6B7280"}
                    />
                  )}
                </View>
                
                <View className="flex-1">
                  <Text className="text-2xl font-bold text-gray-800">
                    {device.name}
                  </Text>
                  <Text className="text-gray-600">{device.model || device.type}</Text>
                  <View className="flex-row items-center mt-1">
                    <View
                      className="w-2 h-2 rounded-full mr-2"
                      style={{ backgroundColor: getStatusColor(device.status) }}
                    />
                    <Text
                      className="text-sm"
                      style={{ color: getStatusColor(device.status) }}
                    >
                      {device.status.charAt(0).toUpperCase() + device.status.slice(1)}
                    </Text>
                  </View>
                  <View className="flex-row items-center mt-2">
                    <Building2 size={14} color="#6B7280" className="mr-1" />
                    <Text className="text-gray-700 text-sm">
                      {device.restaurant?.name || "Unassigned"}
                      {device.restaurant?.location
                        ? ` (${device.restaurant.location})`
                        : ""}
                    </Text>
                  </View>
                </View>
              </View>
              
              <View className="flex-row mt-4 justify-around">
                <TouchableOpacity
                  className="items-center"
                  onPress={handleScheduleMaintenance}
                >
                  <View className="bg-blue-100 w-10 h-10 rounded-full items-center justify-center mb-1">
                    <Wrench size={20} color="#1D4ED8" />
                  </View>
                  <Text className="text-xs text-gray-700">Maintenance</Text>
                </TouchableOpacity>
                
                <TouchableOpacity
                  className="items-center"
                  onPress={handleViewQRCode}
                >
                  <View className="bg-purple-100 w-10 h-10 rounded-full items-center justify-center mb-1">
                    <QrCode size={20} color="#7E22CE" />
                  </View>
                  <Text className="text-xs text-gray-700">QR Code</Text>
                </TouchableOpacity>
                
                <TouchableOpacity
                  className="items-center"
                  onPress={handleEdit}
                >
                  <View className="bg-green-100 w-10 h-10 rounded-full items-center justify-center mb-1">
                    <PenTool size={20} color="#047857" />
                  </View>
                  <Text className="text-xs text-gray-700">Edit</Text>
                </TouchableOpacity>
                
                <TouchableOpacity
                  className="items-center"
                  onPress={handleDelete}
                >
                  <View className="bg-red-100 w-10 h-10 rounded-full items-center justify-center mb-1">
                    <Trash2 size={20} color="#B91C1C" />
                  </View>
                  <Text className="text-xs text-gray-700">Delete</Text>
                </TouchableOpacity>
              </View>
            </View>
            
            {/* Device Details */}
            <View className="bg-white rounded-lg mx-4 mb-4 p-4 shadow-sm">
              <Text className="text-lg font-semibold text-gray-800 mb-4">
                Basic Information
              </Text>
              
              <View className="space-y-3">
                <View className="flex-row justify-between">
                  <Text className="text-gray-700 font-medium">Serial Number</Text>
                  <Text className="text-gray-800">{device.serial_number}</Text>
                </View>
                
                <View className="flex-row justify-between">
                  <Text className="text-gray-700 font-medium">Type</Text>
                  <Text className="text-gray-800">{device.type}</Text>
                </View>
                
                <View className="flex-row justify-between">
                  <Text className="text-gray-700 font-medium">Model</Text>
                  <View className="flex-row items-center">
                    <Text className="text-gray-800 mr-1">{device.model || "N/A"}</Text>
                    <TouchableOpacity onPress={() => router.push("/devices/models")}>
                      <Edit size={14} color="#6B7280" />
                    </TouchableOpacity>
                  </View>
                </View>
                
                <View className="flex-row justify-between">
                  <Text className="text-gray-700 font-medium">Category</Text>
                  <Text className="text-gray-800">
                    {device.category?.name || "Uncategorized"}
                  </Text>
                </View>
                
                <View className="flex-row justify-between">
                  <Text className="text-gray-700 font-medium">Created</Text>
                  <Text className="text-gray-800">
                    {format(new Date(device.created_at), "MMM d, yyyy")}
                  </Text>
                </View>
              </View>
            </View>
            
            {/* QR Code Preview */}
            <View className="bg-white rounded-lg mx-4 mb-4 p-4 shadow-sm">
              <View className="flex-row justify-between items-center mb-4">
                <Text className="text-lg font-semibold text-gray-800">QR Code</Text>
                <TouchableOpacity onPress={handleViewQRCode}>
                  <Text className="text-blue-500 font-medium">View Full</Text>
                </TouchableOpacity>
              </View>
              
              <View className="items-center">
                {device.qr_code ? (
                  <DeviceQRCode 
                    data={device.qr_code} 
                    size={150} 
                    showDetails={false}
                    showActions={false}
                  />
                ) : (
                  <TouchableOpacity
                    className="bg-blue-50 p-4 rounded-lg flex-row items-center"
                    onPress={handleViewQRCode}
                  >
                    <QrCode size={24} color="#3B82F6" />
                    <Text className="text-blue-700 font-medium ml-2">Generate QR Code</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
            
            {/* Warranty & Maintenance */}
            <View className="bg-white rounded-lg mx-4 mb-4 p-4 shadow-sm">
              <Text className="text-lg font-semibold text-gray-800 mb-4">
                Warranty & Maintenance
              </Text>
              
              <View className="space-y-4">
                <View className="flex-row items-center">
                  {isWarrantyValid === true ? (
                    <ShieldCheck size={18} color="#10B981" className="mr-2" />
                  ) : isWarrantyValid === false ? (
                    <ShieldAlert size={18} color="#EF4444" className="mr-2" />
                  ) : (
                    <Clock size={18} color="#6B7280" className="mr-2" />
                  )}
                  
                  <View>
                    <Text className="text-gray-700 font-medium">Warranty Status</Text>
                    <Text className="text-gray-600 text-sm">
                      {device.warranty_expiry
                        ? isWarrantyValid
                          ? `Valid until ${format(
                              new Date(device.warranty_expiry),
                              "MMM d, yyyy"
                            )}`
                          : `Expired on ${format(
                              new Date(device.warranty_expiry),
                              "MMM d, yyyy"
                            )}`
                        : "No warranty information"}
                    </Text>
                  </View>
                </View>
                
                <View className="flex-row items-center">
                  {isMaintenanceDue === true ? (
                    <AlertCircle size={18} color="#EF4444" className="mr-2" />
                  ) : isMaintenanceDue === false ? (
                    <BadgeCheck size={18} color="#10B981" className="mr-2" />
                  ) : (
                    <Wrench size={18} color="#6B7280" className="mr-2" />
                  )}
                  
                  <View>
                    <Text className="text-gray-700 font-medium">Maintenance Status</Text>
                    <Text className="text-gray-600 text-sm">
                      {device.last_maintenance
                        ? isMaintenanceDue
                          ? `Maintenance due (Last: ${daysSinceLastMaintenance} days ago)`
                          : `Last maintained ${format(
                              new Date(device.last_maintenance),
                              "MMM d, yyyy"
                            )}`
                        : "No maintenance records"}
                    </Text>
                  </View>
                </View>
                
                <View className="flex-row items-center">
                  <Calendar size={18} color="#6B7280" className="mr-2" />
                  <View>
                    <Text className="text-gray-700 font-medium">Purchase Date</Text>
                    <Text className="text-gray-600 text-sm">
                      {device.purchase_date
                        ? format(new Date(device.purchase_date), "MMM d, yyyy")
                        : "Not specified"}
                    </Text>
                  </View>
                </View>
              </View>
            </View>
            
            {/* Custom Fields */}
            <View className="bg-white rounded-lg mx-4 mb-4 p-4 shadow-sm">
              <Text className="text-lg font-semibold text-gray-800 mb-4">
                Custom Fields
              </Text>
              {renderCustomFields()}
            </View>
            
            {/* Upcoming Maintenance */}
            {device.status !== "offline" && (
              <View className="bg-white rounded-lg mx-4 mb-4 p-4 shadow-sm">
                <UpcomingMaintenance 
                  limit={2} 
                  showDeviceInfo={false}
                  title="Scheduled Maintenance"
                />
              </View>
            )}
            
            {/* Maintenance History */}
            <View className="bg-white rounded-lg mx-4 mb-4 p-4 shadow-sm">
              <MaintenanceHistory 
                deviceId={id} 
                limit={3} 
                onAddPress={handleScheduleMaintenance}
              />
            </View>
            
            <View className="h-8" />
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
} 