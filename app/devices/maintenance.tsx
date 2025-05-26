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
import { supabase } from "../../lib/supabase";
import DateTimePicker from "@react-native-community/datetimepicker";
import { Picker } from "@react-native-picker/picker";
import { useAuth } from "../../components/AuthProvider";

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

export default function MaintenanceScreen() {
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
    if (params.deviceId) {
      setSelectedDeviceId(params.deviceId as string);
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

      // Transform the data to match our Device type, but use 'any' for initial data to avoid type errors
      const rawData: any[] = data || [];
      const typedData: Device[] = rawData.map(item => ({
        id: item.id,
        name: item.name,
        serial_number: item.serial_number,
        type: item.type,
        model: item.model,
        restaurant_id: item.restaurant_id,
        // Handle restaurant data in a safe way
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
      Alert.alert("Error", "Please enter a part name");
      return;
    }

    const quantity = parseInt(newPartQuantity, 10);
    if (isNaN(quantity) || quantity <= 0) {
      Alert.alert("Error", "Please enter a valid quantity");
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
  };

  const removePart = (id: string) => {
    setParts(parts.filter((part) => part.id !== id));
  };

  const handleSave = async () => {
    if (!selectedDeviceId) {
      Alert.alert("Error", "Please select a device");
      return;
    }

    if (!selectedTechnicianId) {
      Alert.alert("Error", "Please select a technician");
      return;
    }

    if (!description.trim()) {
      Alert.alert("Error", "Please enter a description");
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

      Alert.alert(
        "Success",
        "Maintenance record created successfully",
        [
          {
            text: "OK",
            onPress: () => {
              // If we came from a device detail page, go back to it
              if (params.deviceId) {
                router.back();
              } else {
                // Navigate using the proper type
                router.push({
                  pathname: "/devices/[id]",
                  params: { id: selectedDeviceId }
                });
              }
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

  const renderDeviceItem = (device: Device) => {
    return (
      <TouchableOpacity
        key={device.id}
        className="flex-row items-center p-4 border-b border-gray-100"
        onPress={() => {
          setSelectedDeviceId(device.id);
        }}
      >
        <View className="mr-3 bg-gray-100 p-2 rounded-full">
          <Package size={20} color="#6B7280" />
        </View>
        <View className="flex-1">
          <Text className="font-medium text-gray-800">{device.name}</Text>
          <Text className="text-gray-500 text-sm">
            {device.serial_number} • {device.restaurant?.name || "Unassigned"}
          </Text>
        </View>
        {selectedDeviceId === device.id && (
          <CheckCircle2 size={20} color="#10B981" />
        )}
      </TouchableOpacity>
    );
  };

  const renderTechnicianItem = (technician: User) => {
    return (
      <TouchableOpacity
        key={technician.id}
        className="flex-row items-center p-4 border-b border-gray-100"
        onPress={() => {
          setSelectedTechnicianId(technician.id);
        }}
      >
        <View className="mr-3 bg-gray-100 p-2 rounded-full">
          <User size={20} color="#6B7280" />
        </View>
        <View className="flex-1">
          <Text className="font-medium text-gray-800">{technician.name}</Text>
          <Text className="text-gray-500 text-sm">{technician.email}</Text>
        </View>
        {selectedTechnicianId === technician.id && (
          <CheckCircle2 size={20} color="#10B981" />
        )}
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      <StatusBar style="dark" />
      
      <View className="flex-row justify-between items-center p-4 border-b border-gray-200 bg-white">
        <View className="flex-row items-center">
          <TouchableOpacity onPress={() => router.back()} className="mr-4">
            <ArrowLeft size={24} color="#0F172A" />
          </TouchableOpacity>
          <Text className="text-xl font-bold text-gray-800">Add Maintenance</Text>
        </View>
        <TouchableOpacity
          className="bg-blue-500 px-4 py-2 rounded-lg flex-row items-center"
          onPress={handleSave}
          disabled={saveLoading}
        >
          {saveLoading ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
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
                onPress={() => setShowDatePicker(true)}
              >
                <Text className="text-gray-800">
                  {date.toLocaleDateString()}
                </Text>
                <Calendar size={20} color="#6B7280" />
              </TouchableOpacity>
              
              {showDatePicker && (
                <DateTimePicker
                  value={date}
                  mode="date"
                  display="default"
                  onChange={(event, selectedDate) => {
                    setShowDatePicker(false);
                    if (event.type === "set" && selectedDate) {
                      setDate(selectedDate);
                    }
                  }}
                />
              )}
            </View>
            
            {/* Device Selection */}
            <View className="mb-4">
              <Text className="text-sm font-medium text-gray-700 mb-1">
                Device
              </Text>
              <View>
                <TouchableOpacity
                  className="bg-white border border-gray-300 rounded-lg px-4 py-3 flex-row justify-between items-center"
                  onPress={() => {
                    if (!params.deviceId) {
                      setShowTechnicians(false);
                    }
                  }}
                >
                  <Text className="text-gray-800">
                    {getSelectedDeviceName()}
                  </Text>
                  <ChevronDown size={20} color="#6B7280" />
                </TouchableOpacity>
                
                {!params.deviceId && (
                  <View className="mt-2 border border-gray-200 rounded-lg bg-white max-h-64">
                    <ScrollView>
                      {loading ? (
                        <ActivityIndicator className="py-4" />
                      ) : devices.length > 0 ? (
                        devices.map(renderDeviceItem)
                      ) : (
                        <Text className="p-4 text-gray-500 text-center">
                          No devices found
                        </Text>
                      )}
                    </ScrollView>
                  </View>
                )}
              </View>
            </View>
            
            {/* Technician Selection */}
            <View className="mb-4">
              <Text className="text-sm font-medium text-gray-700 mb-1">
                Technician
              </Text>
              <View>
                <TouchableOpacity
                  className="bg-white border border-gray-300 rounded-lg px-4 py-3 flex-row justify-between items-center"
                  onPress={() => setShowTechnicians(!showTechnicians)}
                >
                  <Text className="text-gray-800">
                    {getSelectedTechnicianName()}
                  </Text>
                  <ChevronDown size={20} color="#6B7280" />
                </TouchableOpacity>
                
                {showTechnicians && (
                  <View className="mt-2 border border-gray-200 rounded-lg bg-white max-h-64">
                    <ScrollView>
                      {technicians.length > 0 ? (
                        technicians.map(renderTechnicianItem)
                      ) : (
                        <Text className="p-4 text-gray-500 text-center">
                          No technicians found
                        </Text>
                      )}
                    </ScrollView>
                  </View>
                )}
              </View>
            </View>
            
            {/* Description */}
            <View className="mb-4">
              <Text className="text-sm font-medium text-gray-700 mb-1">
                Description
              </Text>
              <TextInput
                className="bg-white border border-gray-300 rounded-lg px-4 py-3 text-gray-800 min-h-[100px]"
                multiline
                value={description}
                onChangeText={setDescription}
                placeholder="Enter maintenance details"
                textAlignVertical="top"
              />
            </View>
            
            {/* Status */}
            <View className="mb-4">
              <Text className="text-sm font-medium text-gray-700 mb-1">
                Status
              </Text>
              <View className="border border-gray-300 rounded-lg overflow-hidden">
                <View className="flex-row flex-wrap">
                  {["pending", "in_progress", "completed", "cancelled"].map((s) => (
                    <TouchableOpacity
                      key={s}
                      className={`flex-1 py-2 px-3 min-w-[25%] ${
                        status === s ? "bg-blue-500" : "bg-white"
                      }`}
                      onPress={() => setStatus(s as MaintenanceStatus)}
                    >
                      <Text
                        className={`text-center text-sm ${
                          status === s ? "text-white font-medium" : "text-gray-700"
                        }`}
                      >
                        {s.charAt(0).toUpperCase() + s.slice(1).replace("_", " ")}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            </View>
            
            {/* Cost */}
            <View className="mb-4">
              <Text className="text-sm font-medium text-gray-700 mb-1">
                Cost (Optional)
              </Text>
              <View className="flex-row items-center">
                <View className="bg-gray-100 p-3 rounded-l-lg">
                  <DollarSign size={20} color="#6B7280" />
                </View>
                <TextInput
                  className="flex-1 bg-white border border-gray-300 border-l-0 rounded-r-lg px-4 py-3 text-gray-800"
                  keyboardType="decimal-pad"
                  value={cost}
                  onChangeText={setCost}
                  placeholder="0.00"
                />
              </View>
            </View>
            
            {/* Duration */}
            <View className="mb-4">
              <Text className="text-sm font-medium text-gray-700 mb-1">
                Duration in Minutes (Optional)
              </Text>
              <View className="flex-row items-center">
                <View className="bg-gray-100 p-3 rounded-l-lg">
                  <Clock size={20} color="#6B7280" />
                </View>
                <TextInput
                  className="flex-1 bg-white border border-gray-300 border-l-0 rounded-r-lg px-4 py-3 text-gray-800"
                  keyboardType="number-pad"
                  value={duration}
                  onChangeText={setDuration}
                  placeholder="Duration in minutes"
                />
              </View>
            </View>
            
            {/* Parts Replaced */}
            <View className="mb-4">
              <View className="flex-row justify-between items-center mb-1">
                <Text className="text-sm font-medium text-gray-700">
                  Parts Replaced
                </Text>
                <TouchableOpacity 
                  onPress={() => setShowPartForm(true)}
                  className="flex-row items-center"
                >
                  <PlusCircle size={16} color="#3B82F6" />
                  <Text className="text-blue-500 text-sm ml-1">Add Part</Text>
                </TouchableOpacity>
              </View>
              
              {showPartForm && (
                <View className="bg-gray-50 p-3 rounded-lg mb-3 border border-gray-200">
                  <View className="flex-row mb-2">
                    <TextInput
                      className="flex-1 bg-white border border-gray-300 rounded-lg px-3 py-2 text-gray-800 mr-2"
                      value={newPartName}
                      onChangeText={setNewPartName}
                      placeholder="Part name"
                    />
                    <TextInput
                      className="w-20 bg-white border border-gray-300 rounded-lg px-3 py-2 text-gray-800"
                      keyboardType="number-pad"
                      value={newPartQuantity}
                      onChangeText={setNewPartQuantity}
                      placeholder="Qty"
                    />
                  </View>
                  <View className="flex-row justify-end">
                    <TouchableOpacity
                      className="bg-gray-200 px-3 py-1 rounded-lg mr-2"
                      onPress={() => setShowPartForm(false)}
                    >
                      <Text className="text-gray-700">Cancel</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      className="bg-blue-500 px-3 py-1 rounded-lg"
                      onPress={addPart}
                    >
                      <Text className="text-white">Add</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}
              
              {parts.length > 0 ? (
                <View className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                  {parts.map((part) => (
                    <View
                      key={part.id}
                      className="flex-row justify-between items-center p-3 border-b border-gray-100"
                    >
                      <View className="flex-1">
                        <Text className="font-medium text-gray-800">{part.name}</Text>
                        <Text className="text-gray-500 text-xs">
                          Quantity: {part.quantity}
                        </Text>
                      </View>
                      <TouchableOpacity
                        onPress={() => removePart(part.id)}
                        className="p-1"
                      >
                        <X size={18} color="#EF4444" />
                      </TouchableOpacity>
                    </View>
                  ))}
                </View>
              ) : (
                <Text className="text-gray-500 italic text-center py-2">
                  No parts added
                </Text>
              )}
            </View>
            
            {/* Resolved Switch */}
            <View className="flex-row items-center justify-between p-2">
              <View className="flex-row items-center">
                {resolved ? (
                  <CheckCircle2 size={20} color="#10B981" className="mr-2" />
                ) : (
                  <AlertCircle size={20} color="#F59E0B" className="mr-2" />
                )}
                <Text className="text-gray-800 font-medium">
                  Mark as resolved
                </Text>
              </View>
              <Switch value={resolved} onValueChange={setResolved} />
            </View>
            
            {resolved && (
              <Text className="text-xs text-gray-500 mt-2 ml-2">
                This will update the device's last maintenance date
              </Text>
            )}
          </View>
          
          <View className="bg-white rounded-lg shadow-sm p-4 mb-6">
            <View className="flex-row items-center mb-4">
              <Wrench size={20} color="#6B7280" className="mr-2" />
              <Text className="text-lg font-semibold text-gray-800">
                Maintenance Tips
              </Text>
            </View>
            
            <Text className="text-gray-600 mb-2">
              • Regular maintenance helps extend the life of equipment
            </Text>
            <Text className="text-gray-600 mb-2">
              • Include as much detail as possible in your description
            </Text>
            <Text className="text-gray-600 mb-2">
              • Track parts replaced for inventory management
            </Text>
            <Text className="text-gray-600 mb-2">
              • Record accurate costs for budgeting purposes
            </Text>
            <Text className="text-gray-600">
              • Remember to update maintenance records when follow-up work is completed
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
} 