import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  TextInput,
  Switch,
  Platform,
  FlatList,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useLocalSearchParams, useRouter } from 'expo-router';
import {
  ArrowLeft,
  Calendar,
  Wrench,
  Save,
  User,
  Trash2,
  SquareCheck,
  AlertCircle,
  Clipboard,
  Package,
  Clock,
  DollarSign,
  Tag,
  PlusCircle,
  X,
} from 'lucide-react-native';
import { supabase } from '../../../lib/supabase';
import { format } from 'date-fns';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useAuth } from '../../../components/AuthProvider';

type MaintenanceRecord = {
  id: string;
  device_id: string;
  date: string;
  technician_id: string;
  description: string;
  resolved: boolean;
  status?: string;
  cost?: number;
  maintenance_duration_minutes?: number;
  parts_replaced?: any[];
  created_at: string;
  device?: {
    id: string;
    name: string;
    serial_number: string;
    type: string;
  };
  technician?: {
    id: string;
    name: string;
  };
};

type MaintenanceStatus = "pending" | "in_progress" | "completed" | "cancelled";

type Part = {
  id: string;
  name: string;
  quantity: number;
};

export default function MaintenanceDetailsScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const id = typeof params.id === 'string' ? params.id : '';
  const { session } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saveLoading, setSaveLoading] = useState(false);
  const [maintenanceRecord, setMaintenanceRecord] = useState<MaintenanceRecord | null>(null);
  const [date, setDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [description, setDescription] = useState('');
  const [resolved, setResolved] = useState(true);
  const [status, setStatus] = useState<MaintenanceStatus>('completed');
  const [cost, setCost] = useState('');
  const [duration, setDuration] = useState('');
  const [parts, setParts] = useState<Part[]>([]);
  const [newPartName, setNewPartName] = useState("");
  const [newPartQuantity, setNewPartQuantity] = useState("1");
  const [showPartForm, setShowPartForm] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    if (id) {
      fetchMaintenanceRecord();
    }
  }, [id]);

  const fetchMaintenanceRecord = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('maintenance_records')
        .select(`
          *,
          device:device_id(id, name, serial_number, type),
          technician:technician_id(id, name)
        `)
        .eq('id', id)
        .single();

      if (error) {
        console.error('Error fetching maintenance record:', error);
        Alert.alert('Error', 'Failed to load maintenance record');
        return;
      }

      setMaintenanceRecord(data);
      setDate(new Date(data.date));
      setDescription(data.description || '');
      setResolved(data.resolved);
      
      // Set the additional fields if available
      if (data.status) setStatus(data.status as MaintenanceStatus);
      if (data.cost) setCost(data.cost.toString());
      if (data.maintenance_duration_minutes) setDuration(data.maintenance_duration_minutes.toString());
      if (data.parts_replaced && Array.isArray(data.parts_replaced)) setParts(data.parts_replaced);
    } catch (error) {
      console.error('Exception fetching maintenance record:', error);
      Alert.alert('Error', 'An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = () => {
    setIsEditing(true);
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
    if (!description.trim()) {
      Alert.alert('Error', 'Please enter a description');
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

      // Update maintenance record
      const { error } = await supabase
        .from('maintenance_records')
        .update({
          date: date.toISOString(),
          description: description.trim(),
          resolved,
          status,
          cost: parsedCost,
          maintenance_duration_minutes: parsedDuration,
          parts_replaced: parts.length > 0 ? parts : null
        })
        .eq('id', id);

      if (error) {
        throw error;
      }

      // If maintenance is resolved and wasn't before, update the device's last_maintenance date
      if (resolved && !maintenanceRecord?.resolved) {
        const { error: updateError } = await supabase
          .from('devices')
          .update({ last_maintenance: date.toISOString() })
          .eq('id', maintenanceRecord?.device_id);

        if (updateError) {
          console.error('Error updating device last_maintenance:', updateError);
          // Continue anyway since the main record was updated
        }
      }

      Alert.alert('Success', 'Maintenance record updated successfully');
      setIsEditing(false);
      fetchMaintenanceRecord();
    } catch (error) {
      console.error('Error updating maintenance record:', error);
      Alert.alert('Error', 'Failed to update maintenance record');
    } finally {
      setSaveLoading(false);
    }
  };

  const handleDelete = () => {
    Alert.alert(
      'Delete Maintenance Record',
      'Are you sure you want to delete this maintenance record? This action cannot be undone.',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              setLoading(true);
              const { error } = await supabase
                .from('maintenance_records')
                .delete()
                .eq('id', id);

              if (error) {
                throw error;
              }

              Alert.alert('Success', 'Maintenance record deleted successfully');
              router.back();
            } catch (error) {
              console.error('Error deleting maintenance record:', error);
              Alert.alert('Error', 'Failed to delete maintenance record');
              setLoading(false);
            }
          },
        },
      ]
    );
  };

  const handleViewDevice = () => {
    if (maintenanceRecord?.device_id) {
      router.push({
        pathname: '/devices/[id]',
        params: { id: maintenanceRecord.device_id }
      });
    }
  };

  // Get status color
  const getStatusColor = (statusValue: string) => {
    switch(statusValue) {
      case 'completed': return "#10B981"; // Green
      case 'in_progress': return "#F59E0B"; // Amber
      case 'pending': return "#3B82F6"; // Blue
      case 'cancelled': return "#EF4444"; // Red
      default: return "#6B7280"; // Gray
    }
  };

  if (loading && !maintenanceRecord) {
    return (
      <SafeAreaView className="flex-1 bg-gray-50">
        <StatusBar style="dark" />
        <View className="flex-1 justify-center items-center">
          <ActivityIndicator size="large" color="#3B82F6" />
          <Text className="text-gray-600 mt-2">Loading maintenance details...</Text>
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
          <Text className="text-xl font-bold text-gray-800">
            {isEditing ? 'Edit Maintenance' : 'Maintenance Details'}
          </Text>
        </View>
        {!isEditing ? (
          <View className="flex-row">
            <TouchableOpacity onPress={handleEdit} className="mr-4">
              <Wrench size={24} color="#3B82F6" />
            </TouchableOpacity>
            <TouchableOpacity onPress={handleDelete}>
              <Trash2 size={24} color="#EF4444" />
            </TouchableOpacity>
          </View>
        ) : (
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
        )}
      </View>
      
      <ScrollView className="flex-1 p-4">
        {maintenanceRecord && (
          <>
            {/* Device Info */}
            <TouchableOpacity 
              className="bg-white rounded-lg p-4 shadow-sm mb-4 flex-row items-center"
              onPress={handleViewDevice}
            >
              <View className="bg-blue-100 p-3 rounded-full mr-3">
                <Package size={24} color="#3B82F6" />
              </View>
              <View className="flex-1">
                <Text className="text-gray-500 text-xs">Device</Text>
                <Text className="text-lg font-semibold text-gray-800">
                  {maintenanceRecord.device?.name || 'Unknown Device'}
                </Text>
                <Text className="text-gray-600 text-sm">
                  {maintenanceRecord.device?.serial_number || ''} • {maintenanceRecord.device?.type || ''}
                </Text>
              </View>
            </TouchableOpacity>
            
            {/* Maintenance Details */}
            <View className="bg-white rounded-lg p-4 shadow-sm mb-4">
              <Text className="text-lg font-semibold text-gray-800 mb-4">
                Maintenance Details
              </Text>
              
              {/* Date */}
              <View className="mb-4">
                <Text className="text-sm font-medium text-gray-700 mb-1">
                  Maintenance Date
                </Text>
                {isEditing ? (
                  <>
                    <TouchableOpacity
                      className="bg-white border border-gray-300 rounded-lg px-4 py-3 flex-row justify-between items-center"
                      onPress={() => setShowDatePicker(true)}
                    >
                      <Text className="text-gray-800">
                        {format(date, 'MMM d, yyyy')}
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
                          if (selectedDate) {
                            setDate(selectedDate);
                          }
                        }}
                      />
                    )}
                  </>
                ) : (
                  <View className="flex-row items-center">
                    <Calendar size={18} color="#6B7280" className="mr-2" />
                    <Text className="text-gray-800">
                      {format(new Date(maintenanceRecord.date), 'MMMM d, yyyy')}
                    </Text>
                  </View>
                )}
              </View>
              
              {/* Technician */}
              <View className="mb-4">
                <Text className="text-sm font-medium text-gray-700 mb-1">
                  Technician
                </Text>
                <View className="flex-row items-center">
                  <User size={18} color="#6B7280" className="mr-2" />
                  <Text className="text-gray-800">
                    {maintenanceRecord.technician?.name || 'Unknown'}
                  </Text>
                </View>
              </View>
              
              {/* Description */}
              <View className="mb-4">
                <Text className="text-sm font-medium text-gray-700 mb-1">
                  Description
                </Text>
                {isEditing ? (
                  <TextInput
                    className="bg-white border border-gray-300 rounded-lg px-4 py-3 text-gray-800 min-h-[100px]"
                    multiline
                    value={description}
                    onChangeText={setDescription}
                    placeholder="Enter maintenance details"
                    textAlignVertical="top"
                  />
                ) : (
                  <Text className="text-gray-800">{maintenanceRecord.description}</Text>
                )}
              </View>
              
              {/* Status */}
              <View className="mb-4">
                <Text className="text-sm font-medium text-gray-700 mb-1">
                  Status
                </Text>
                {isEditing ? (
                  <View className="border border-gray-300 rounded-lg overflow-hidden mb-2">
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
                ) : (
                  <View className="flex-row items-center">
                    <View 
                      className="w-3 h-3 rounded-full mr-2"
                      style={{ backgroundColor: getStatusColor(maintenanceRecord.status || (maintenanceRecord.resolved ? 'completed' : 'in_progress')) }}
                    />
                    <Text className="text-gray-800 font-medium">
                      {maintenanceRecord.status 
                        ? maintenanceRecord.status.charAt(0).toUpperCase() + maintenanceRecord.status.slice(1).replace('_', ' ')
                        : (maintenanceRecord.resolved ? 'Completed' : 'In Progress')
                      }
                    </Text>
                  </View>
                )}
              </View>
              
              {/* Cost */}
              <View className="mb-4">
                <Text className="text-sm font-medium text-gray-700 mb-1">
                  Cost
                </Text>
                {isEditing ? (
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
                ) : (
                  <View className="flex-row items-center">
                    <DollarSign size={18} color="#6B7280" className="mr-2" />
                    <Text className="text-gray-800">
                      {maintenanceRecord.cost ? `$${maintenanceRecord.cost.toFixed(2)}` : 'Not specified'}
                    </Text>
                  </View>
                )}
              </View>
              
              {/* Duration */}
              <View className="mb-4">
                <Text className="text-sm font-medium text-gray-700 mb-1">
                  Duration
                </Text>
                {isEditing ? (
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
                ) : (
                  <View className="flex-row items-center">
                    <Clock size={18} color="#6B7280" className="mr-2" />
                    <Text className="text-gray-800">
                      {maintenanceRecord.maintenance_duration_minutes 
                        ? `${maintenanceRecord.maintenance_duration_minutes} minutes` 
                        : 'Not specified'}
                    </Text>
                  </View>
                )}
              </View>
              
              {/* Parts Replaced */}
              <View className="mb-4">
                <View className="flex-row justify-between items-center mb-1">
                  <Text className="text-sm font-medium text-gray-700">
                    Parts Replaced
                  </Text>
                  {isEditing && (
                    <TouchableOpacity 
                      onPress={() => setShowPartForm(true)}
                      className="flex-row items-center"
                    >
                      <PlusCircle size={16} color="#3B82F6" />
                      <Text className="text-blue-500 text-sm ml-1">Add Part</Text>
                    </TouchableOpacity>
                  )}
                </View>
                
                {isEditing && showPartForm && (
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
                        <View className="flex-row items-center flex-1">
                          <Tag size={16} color="#6B7280" className="mr-2" />
                          <View>
                            <Text className="font-medium text-gray-800">{part.name}</Text>
                            <Text className="text-gray-500 text-xs">
                              Quantity: {part.quantity}
                            </Text>
                          </View>
                        </View>
                        {isEditing && (
                          <TouchableOpacity
                            onPress={() => removePart(part.id)}
                            className="p-1"
                          >
                            <X size={18} color="#EF4444" />
                          </TouchableOpacity>
                        )}
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
              {isEditing && (
                <View className="flex-row items-center justify-between py-2 mb-2">
                  <View className="flex-row items-center">
                    {resolved ? (
                      <SquareCheck size={20} color="#10B981" className="mr-2" />
                    ) : (
                      <AlertCircle size={20} color="#F59E0B" className="mr-2" />
                    )}
                    <Text className="text-gray-800 font-medium">
                      Mark as resolved
                    </Text>
                  </View>
                  <Switch value={resolved} onValueChange={setResolved} />
                </View>
              )}
            </View>
            
            {/* Created Info */}
            <View className="bg-white rounded-lg p-4 shadow-sm mb-4">
              <View className="flex-row items-center mb-2">
                <Clipboard size={18} color="#6B7280" className="mr-2" />
                <Text className="text-lg font-semibold text-gray-800">
                  Record Information
                </Text>
              </View>
              <Text className="text-gray-600 mb-1">
                Created: {format(new Date(maintenanceRecord.created_at), 'MMM d, yyyy h:mm a')}
              </Text>
              <Text className="text-gray-600">
                Record ID: {maintenanceRecord.id}
              </Text>
            </View>
            
            {/* Maintenance Tips */}
            <View className="bg-white rounded-lg p-4 shadow-sm mb-6">
              <View className="flex-row items-center mb-2">
                <Wrench size={18} color="#6B7280" className="mr-2" />
                <Text className="text-lg font-semibold text-gray-800">
                  Maintenance Best Practices
                </Text>
              </View>
              <Text className="text-gray-600 mb-2">
                • Regular maintenance extends equipment lifespan and prevents unexpected failures
              </Text>
              <Text className="text-gray-600 mb-2">
                • Document all maintenance tasks thoroughly for future reference
              </Text>
              <Text className="text-gray-600 mb-2">
                • Always follow manufacturer's guidelines when servicing equipment
              </Text>
              <Text className="text-gray-600">
                • Track parts and costs to analyze maintenance expenses over time
              </Text>
            </View>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
} 