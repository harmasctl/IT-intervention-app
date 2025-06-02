import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  ScrollView,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Switch,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { useLocalSearchParams, useRouter } from "expo-router";
import {
  ArrowLeft,
  Save,
  Calendar,
  ChevronDown,
  Package,
  User,
  Clipboard,
  AlertCircle,
  CheckCircle2,
  PlusCircle,
  X,
  Clock,
  DollarSign,
  Wrench,
} from "lucide-react-native";
import { supabase } from "../../../lib/supabase";
import DateTimePicker from "@react-native-community/datetimepicker";
import { Picker } from "@react-native-picker/picker";
import { useAuth } from "../../../components/AuthProvider";

type Device = {
  id: string;
  name: string;
  serial_number: string;
  type: string;
  model?: string;
  restaurant_id: string;
  restaurant?: {
    name: string;
  };
};

type User = {
  id: string;
  name: string;
  email: string;
};

type Part = {
  id: string;
  name: string;
  quantity: number;
};

type MaintenanceStatus = "pending" | "in_progress" | "completed" | "cancelled";

export default function CreateMaintenanceScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { session } = useAuth();
  const [loading, setLoading] = useState(false);
  const [saveLoading, setSaveLoading] = useState(false);
  const [date, setDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [description, setDescription] = useState("");
  const [resolved, setResolved] = useState(true);
  const [status, setStatus] = useState<MaintenanceStatus>("completed");
  const [cost, setCost] = useState("");
  const [duration, setDuration] = useState("");
  const [parts, setParts] = useState<Part[]>([]);
  const [newPartName, setNewPartName] = useState("");
  const [newPartQuantity, setNewPartQuantity] = useState("1");
  const [showPartForm, setShowPartForm] = useState(false);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string | null>(null);
  const [devices, setDevices] = useState<Device[]>([]);
  const [technicians, setTechnicians] = useState<User[]>([]);
  const [selectedTechnicianId, setSelectedTechnicianId] = useState<string | null>(null);
  const [showTechnicians, setShowTechnicians] = useState(false);

  // Initialize with deviceId from params if available
  useEffect(() => {
    if (params.device_id) {
      setSelectedDeviceId(params.device_id as string);
    }

    fetchDevices();
    fetchTechnicians();
  }, [params]);

  const fetchDevices = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("devices")
        .select(`
          id,
          name,
          serial_number,
          type,
          model,
          restaurant_id,
          restaurant:restaurants(name)
        `)
        .order("name");

      if (error) {
        console.error("Error fetching devices:", error);
        return;
      }

      // Transform the data to match our Device type
      const rawData: any[] = data || [];
      const typedData: Device[] = rawData.map(item => ({
        id: item.id,
        name: item.name,
        serial_number: item.serial_number,
        type: item.type,
        model: item.model,
        restaurant_id: item.restaurant_id,
        restaurant: {
          name: typeof item.restaurant?.name === 'string'
            ? item.restaurant.name
            : "Unknown"
        }
      }));

      setDevices(typedData);
    } catch (error) {
      console.error("Exception fetching devices:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchTechnicians = async () => {
    try {
      // In a real app, this would fetch users with technician role
      // For now, we'll just use all users or a static list
      const { data, error } = await supabase
        .from("users")
        .select("id, name, email")
        .order("name");

      if (error) {
        console.error("Error fetching technicians:", error);

        // Fallback to current user if we can't fetch technicians
        if (session?.user) {
          setTechnicians([
            {
              id: session.user.id,
              name: session.user.email || "Current User",
              email: session.user.email || "",
            },
          ]);
          setSelectedTechnicianId(session.user.id);
        }
        return;
      }

      setTechnicians(data || []);

      // Select current user as default technician if available
      if (session?.user && data) {
        const currentUser = data.find(user => user.id === session.user.id);
        if (currentUser) {
          setSelectedTechnicianId(currentUser.id);
        } else if (data.length > 0) {
          setSelectedTechnicianId(data[0].id);
        }
      } else if (data && data.length > 0) {
        setSelectedTechnicianId(data[0].id);
      }
    } catch (error) {
      console.error("Exception fetching technicians:", error);
    }
  };

  const addPart = () => {
    if (!newPartName.trim()) {
      Alert.alert("❌ Validation Error", "Please enter a part name");
      return;
    }

    const quantity = parseInt(newPartQuantity, 10);
    if (isNaN(quantity) || quantity <= 0) {
      Alert.alert("❌ Validation Error", "Please enter a valid quantity");
      return;
    }

    const newPart = {
      id: Date.now().toString(),
      name: newPartName.trim(),
      quantity,
    };

    setParts([...parts, newPart]);
    setNewPartName("");
    setNewPartQuantity("1");
    setShowPartForm(false);
    Alert.alert("✅ Part Added", `"${newPart.name}" (Qty: ${newPart.quantity}) has been added to the parts list`);
  };

  const removePart = (id: string) => {
    const partToRemove = parts.find(p => p.id === id);
    setParts(parts.filter((part) => part.id !== id));
    if (partToRemove) {
      Alert.alert("🗑️ Part Removed", `"${partToRemove.name}" has been removed from the parts list`);
    }
  };

  const handleSave = async () => {
    if (!selectedDeviceId) {
      Alert.alert("❌ Validation Error", "Please select a device for maintenance");
      return;
    }

    if (!selectedTechnicianId) {
      Alert.alert("❌ Validation Error", "Please select a technician to assign this maintenance task");
      return;
    }

    if (!description.trim()) {
      Alert.alert("❌ Validation Error", "Please enter a description of the maintenance work");
      return;
    }

    try {
      setSaveLoading(true);

      // Validate cost if entered
      let parsedCost = null;
      if (cost.trim()) {
        parsedCost = parseFloat(cost.trim());
        if (isNaN(parsedCost)) {
          Alert.alert("Error", "Please enter a valid cost");
          setSaveLoading(false);
          return;
        }
      }

      // Validate duration if entered
      let parsedDuration = null;
      if (duration.trim()) {
        parsedDuration = parseInt(duration.trim(), 10);
        if (isNaN(parsedDuration) || parsedDuration <= 0) {
          Alert.alert("Error", "Please enter a valid duration in minutes");
          setSaveLoading(false);
          return;
        }
      }

      // Create maintenance record
      const { data, error } = await supabase
        .from("maintenance_records")
        .insert({
          device_id: selectedDeviceId,
          technician_id: selectedTechnicianId,
          date: date.toISOString(),
          description: description.trim(),
          resolved,
          status: status,
          cost: parsedCost,
          maintenance_duration_minutes: parsedDuration,
          parts_replaced: parts.length > 0 ? parts : null
        })
        .select();

      if (error) {
        throw error;
      }

      // If maintenance is resolved, update the device's last_maintenance date
      if (resolved) {
        const { error: updateError } = await supabase
          .from("devices")
          .update({ last_maintenance: date.toISOString() })
          .eq("id", selectedDeviceId);

        if (updateError) {
          console.error("Error updating device last_maintenance:", updateError);
          // Continue anyway since the main record was created
        }
      }

      const deviceName = devices.find(d => d.id === selectedDeviceId)?.name || "Device";
      const technicianName = technicians.find(t => t.id === selectedTechnicianId)?.name || "Technician";

      Alert.alert(
        "🔧 Maintenance Scheduled Successfully!",
        `Maintenance for "${deviceName}" has been assigned to ${technicianName} and scheduled for ${date.toLocaleDateString()}.`,
        [
          {
            text: "View Device",
            onPress: () => {
              router.replace(`/devices/${selectedDeviceId}`);
            },
          },
          {
            text: "View History",
            onPress: () => {
              router.replace(`/devices/maintenance/history?device_id=${selectedDeviceId}`);
            },
          },
          {
            text: "Schedule Another",
            style: "cancel",
            onPress: () => {
              // Reset form
              setDescription("");
              setResolved(true);
              setStatus("completed");
              setCost("");
              setDuration("");
              setParts([]);
              setDate(new Date());
              if (!params.device_id) {
                setSelectedDeviceId(null);
              }
              Alert.alert("📝 Form Reset", "Ready to schedule another maintenance task!");
            },
          },
        ]
      );
    } catch (error) {
      console.error("Error saving maintenance record:", error);
      Alert.alert("Error", "Failed to save maintenance record");
    } finally {
      setSaveLoading(false);
    }
  };

  const getSelectedDeviceName = () => {
    if (!selectedDeviceId) return "Select a device";
    const device = devices.find((d) => d.id === selectedDeviceId);
    return device ? device.name : "Select a device";
  };

  const getSelectedTechnicianName = () => {
    if (!selectedTechnicianId) return "Select a technician";
    const technician = technicians.find((t) => t.id === selectedTechnicianId);
    return technician ? technician.name : "Select a technician";
  };

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      <StatusBar style="dark" />

      <View className="flex-row justify-between items-center p-4 border-b border-gray-200 bg-white">
        <View className="flex-row items-center">
          <TouchableOpacity onPress={() => router.back()} className="mr-4">
            <ArrowLeft size={24} color="#0F172A" />
          </TouchableOpacity>
          <Text className="text-xl font-bold text-gray-800">Schedule Maintenance</Text>
        </View>
        <TouchableOpacity
          className={`px-4 py-2 rounded-lg flex-row items-center ${
            saveLoading || !selectedDeviceId || !selectedTechnicianId || !description.trim()
              ? "bg-gray-400"
              : "bg-blue-500"
          }`}
          onPress={handleSave}
          disabled={saveLoading || !selectedDeviceId || !selectedTechnicianId || !description.trim()}
        >
          {saveLoading ? (
            <>
              <ActivityIndicator size="small" color="#FFFFFF" />
              <Text className="text-white font-medium ml-2">Saving...</Text>
            </>
          ) : (
            <>
              <Save size={18} color="#FFFFFF" />
              <Text className="text-white font-medium ml-2">Save</Text>
            </>
          )}
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        className="flex-1"
      >
        <ScrollView className="flex-1 p-4">
          <View className="bg-white rounded-lg shadow-sm p-4 mb-6">
            <Text className="text-lg font-semibold text-gray-800 mb-4">
              Maintenance Details
            </Text>

            {/* Date Picker */}
            <View className="mb-4">
              <Text className="text-sm font-medium text-gray-700 mb-1">
                Maintenance Date
              </Text>
              <TouchableOpacity
                className="bg-white border border-gray-300 rounded-lg px-4 py-3 flex-row justify-between items-center"
                onPress={() => {
                  setShowDatePicker(true);
                  Alert.alert("📅 Date Picker", "Select maintenance date");
                }}
              >
                <Text className="text-gray-800">
                  {date.toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  })}
                </Text>
                <Calendar size={20} color="#6B7280" />
              </TouchableOpacity>

              {showDatePicker && (
                <View className="mt-2">
                  <DateTimePicker
                    value={date}
                    mode="date"
                    display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                    onChange={(event, selectedDate) => {
                      if (Platform.OS === 'android') {
                        setShowDatePicker(false);
                      }

                      if (event.type === "set" && selectedDate) {
                        setDate(selectedDate);
                        Alert.alert("✅ Date Selected", `Maintenance scheduled for ${selectedDate.toLocaleDateString()}`);

                        if (Platform.OS === 'ios') {
                          setShowDatePicker(false);
                        }
                      } else if (event.type === "dismissed") {
                        setShowDatePicker(false);
                      }
                    }}
                    minimumDate={new Date()}
                    maximumDate={new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)} // 1 year from now
                  />
                  {Platform.OS === 'ios' && (
                    <View className="flex-row justify-end mt-2">
                      <TouchableOpacity
                        className="bg-blue-500 px-4 py-2 rounded-lg"
                        onPress={() => setShowDatePicker(false)}
                      >
                        <Text className="text-white font-medium">Done</Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
              )}
            </View>

            {/* Device Selection */}
            <View className="mb-4">
              <Text className="text-sm font-medium text-gray-700 mb-1">
                Device *
              </Text>
              {params.device_id ? (
                <View className="bg-gray-50 border border-gray-300 rounded-lg px-4 py-3">
                  <Text className="text-gray-800">{getSelectedDeviceName()}</Text>
                  <Text className="text-gray-500 text-sm">Pre-selected device</Text>
                </View>
              ) : (
                <View className="bg-white border border-gray-300 rounded-lg px-1 py-1">
                  <Picker
                    selectedValue={selectedDeviceId}
                    onValueChange={(itemValue) => setSelectedDeviceId(itemValue)}
                  >
                    <Picker.Item label="Select a device" value="" />
                    {devices.map((device) => (
                      <Picker.Item
                        key={device.id}
                        label={`${device.name} (${device.serial_number})`}
                        value={device.id}
                      />
                    ))}
                  </Picker>
                </View>
              )}
            </View>

            {/* Technician Selection */}
            <View className="mb-4">
              <Text className="text-sm font-medium text-gray-700 mb-1">
                Technician *
              </Text>
              <View className="bg-white border border-gray-300 rounded-lg px-1 py-1">
                <Picker
                  selectedValue={selectedTechnicianId}
                  onValueChange={(itemValue) => setSelectedTechnicianId(itemValue)}
                >
                  <Picker.Item label="Select a technician" value="" />
                  {technicians.map((technician) => (
                    <Picker.Item
                      key={technician.id}
                      label={technician.name}
                      value={technician.id}
                    />
                  ))}
                </Picker>
              </View>
            </View>

            {/* Description */}
            <View className="mb-4">
              <Text className="text-sm font-medium text-gray-700 mb-1">
                Description *
              </Text>
              <TextInput
                className="bg-white border border-gray-300 rounded-lg px-4 py-3 text-gray-800"
                value={description}
                onChangeText={setDescription}
                placeholder="Describe the maintenance work performed..."
                multiline
                numberOfLines={4}
                textAlignVertical="top"
              />
            </View>

            {/* Status */}
            <View className="mb-4">
              <Text className="text-sm font-medium text-gray-700 mb-1">Status</Text>
              <View className="bg-white border border-gray-300 rounded-lg px-1 py-1">
                <Picker
                  selectedValue={status}
                  onValueChange={(itemValue) => setStatus(itemValue as MaintenanceStatus)}
                >
                  <Picker.Item label="Completed" value="completed" />
                  <Picker.Item label="In Progress" value="in_progress" />
                  <Picker.Item label="Pending" value="pending" />
                  <Picker.Item label="Cancelled" value="cancelled" />
                </Picker>
              </View>
            </View>

            {/* Resolved Toggle */}
            <View className="mb-4 flex-row items-center justify-between">
              <Text className="text-sm font-medium text-gray-700">Issue Resolved</Text>
              <Switch
                value={resolved}
                onValueChange={setResolved}
              />
            </View>

            {/* Cost */}
            <View className="mb-4">
              <Text className="text-sm font-medium text-gray-700 mb-1">
                Cost (Optional)
              </Text>
              <TextInput
                className="bg-white border border-gray-300 rounded-lg px-4 py-3 text-gray-800"
                value={cost}
                onChangeText={setCost}
                placeholder="0.00"
                keyboardType="decimal-pad"
              />
            </View>

            {/* Duration */}
            <View className="mb-4">
              <Text className="text-sm font-medium text-gray-700 mb-1">
                Duration (Minutes)
              </Text>
              <TextInput
                className="bg-white border border-gray-300 rounded-lg px-4 py-3 text-gray-800"
                value={duration}
                onChangeText={setDuration}
                placeholder="60"
                keyboardType="numeric"
              />
            </View>
          </View>

          {/* Parts Section */}
          <View className="bg-white rounded-lg shadow-sm p-4 mb-6">
            <View className="flex-row justify-between items-center mb-4">
              <Text className="text-lg font-semibold text-gray-800">Parts Used</Text>
              <TouchableOpacity
                className="bg-blue-500 p-2 rounded-full"
                onPress={() => setShowPartForm(true)}
              >
                <PlusCircle size={18} color="#FFFFFF" />
              </TouchableOpacity>
            </View>

            {parts.length === 0 ? (
              <Text className="text-gray-500 italic text-center py-4">
                No parts added yet
              </Text>
            ) : (
              parts.map((part) => (
                <View key={part.id} className="flex-row justify-between items-center py-2 border-b border-gray-100">
                  <View className="flex-1">
                    <Text className="font-medium text-gray-800">{part.name}</Text>
                    <Text className="text-gray-500 text-sm">Quantity: {part.quantity}</Text>
                  </View>
                  <TouchableOpacity onPress={() => removePart(part.id)}>
                    <X size={20} color="#EF4444" />
                  </TouchableOpacity>
                </View>
              ))
            )}

            {showPartForm && (
              <View className="bg-blue-50 p-4 rounded-lg mt-4">
                <Text className="text-base font-medium text-blue-800 mb-3">Add Part</Text>

                <View className="mb-3">
                  <Text className="text-sm font-medium text-gray-700 mb-1">Part Name</Text>
                  <TextInput
                    className="bg-white border border-gray-300 rounded-lg px-4 py-2 text-gray-800"
                    value={newPartName}
                    onChangeText={setNewPartName}
                    placeholder="Enter part name"
                  />
                </View>

                <View className="mb-4">
                  <Text className="text-sm font-medium text-gray-700 mb-1">Quantity</Text>
                  <TextInput
                    className="bg-white border border-gray-300 rounded-lg px-4 py-2 text-gray-800"
                    value={newPartQuantity}
                    onChangeText={setNewPartQuantity}
                    placeholder="1"
                    keyboardType="numeric"
                  />
                </View>

                <View className="flex-row">
                  <TouchableOpacity
                    className="bg-gray-500 px-4 py-2 rounded-lg mr-2"
                    onPress={() => {
                      setShowPartForm(false);
                      setNewPartName("");
                      setNewPartQuantity("1");
                    }}
                  >
                    <Text className="text-white">Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    className="bg-blue-500 px-4 py-2 rounded-lg"
                    onPress={addPart}
                  >
                    <Text className="text-white">Add Part</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </View>

          <View className="h-20" />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
