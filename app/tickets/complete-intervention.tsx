import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
  Switch,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { useRouter, useLocalSearchParams } from "expo-router";
import { Picker } from "@react-native-picker/picker";
import {
  ArrowLeft,
  CheckCircle,
  Camera,
  Package,
  Clock,
  DollarSign,
  FileText,
  AlertTriangle,
  User,
  Calendar,
  Wrench,
} from "lucide-react-native";
import * as ImagePicker from "expo-image-picker";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../../components/AuthProvider";
import { decode } from "base64-arraybuffer";

interface InventoryItem {
  id: string;
  name: string;
  part_number?: string;
  cost: number;
  quantity_used: number;
}

export default function CompleteInterventionScreen() {
  const router = useRouter();
  const { ticketId } = useLocalSearchParams();
  const { user } = useAuth();
  
  const [loading, setLoading] = useState(false);
  const [ticket, setTicket] = useState<any>(null);
  const [completionData, setCompletionData] = useState({
    workPerformed: "",
    rootCause: "",
    resolution: "",
    preventiveMeasures: "",
    customerSatisfaction: "satisfied",
    timeSpent: "",
    actualStartTime: "",
    actualEndTime: "",
    followUpRequired: false,
    followUpNotes: "",
    customerSignature: "",
    technicianNotes: "",
    photos: [] as string[],
    inventoryUsed: [] as InventoryItem[],
    totalCost: 0,
  });

  const [availableInventory, setAvailableInventory] = useState<any[]>([]);
  const [showAddInventory, setShowAddInventory] = useState(false);

  useEffect(() => {
    if (ticketId) {
      fetchTicketDetails();
      fetchAvailableInventory();
    }
  }, [ticketId]);

  const fetchTicketDetails = async () => {
    try {
      const { data, error } = await supabase
        .from("tickets")
        .select(`
          *,
          restaurant:restaurants(name, location),
          device:devices(name, type, serial_number)
        `)
        .eq("id", ticketId)
        .single();

      if (error) {
        Alert.alert("Error", "Failed to fetch ticket details");
        return;
      }

      setTicket(data);
    } catch (error) {
      console.error("Error fetching ticket:", error);
    }
  };

  const fetchAvailableInventory = async () => {
    try {
      const { data, error } = await supabase
        .from("equipment")
        .select("id, name, part_number, cost, stock_level")
        .gt("stock_level", 0);

      if (error) {
        console.error("Error fetching inventory:", error);
        return;
      }

      setAvailableInventory(data || []);
    } catch (error) {
      console.error("Error fetching inventory:", error);
    }
  };

  const addInventoryItem = (item: any, quantity: number) => {
    const newItem: InventoryItem = {
      id: item.id,
      name: item.name,
      part_number: item.part_number,
      cost: item.cost,
      quantity_used: quantity,
    };

    setCompletionData(prev => ({
      ...prev,
      inventoryUsed: [...prev.inventoryUsed, newItem],
      totalCost: prev.totalCost + (item.cost * quantity),
    }));
  };

  const removeInventoryItem = (index: number) => {
    const item = completionData.inventoryUsed[index];
    setCompletionData(prev => ({
      ...prev,
      inventoryUsed: prev.inventoryUsed.filter((_, i) => i !== index),
      totalCost: prev.totalCost - (item.cost * item.quantity_used),
    }));
  };

  const takePhoto = async () => {
    try {
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
        base64: true,
      });

      if (!result.canceled && result.assets && result.assets[0]) {
        await uploadImage(result.assets[0]);
      }
    } catch (error) {
      console.error('Error taking photo:', error);
      Alert.alert('Error', 'Failed to take photo. Please try again.');
    }
  };

  const uploadImage = async (imageAsset: ImagePicker.ImagePickerAsset) => {
    if (!imageAsset.base64) {
      Alert.alert('Error', 'Image data is missing');
      return;
    }

    try {
      setLoading(true);
      
      const timestamp = Date.now();
      const randomString = Math.random().toString(36).substring(2, 8);
      const fileName = `intervention-${ticketId}-${timestamp}-${randomString}.jpg`;
      const filePath = `interventions/${user?.id || 'anonymous'}/${fileName}`;
      
      const { data, error } = await supabase.storage
        .from('ticket-photos')
        .upload(filePath, decode(imageAsset.base64), {
          contentType: 'image/jpeg',
          cacheControl: '3600',
          upsert: false,
        });

      if (error) throw error;

      if (data) {
        const { data: publicUrlData } = supabase.storage
          .from('ticket-photos')
          .getPublicUrl(filePath);

        if (publicUrlData && publicUrlData.publicUrl) {
          setCompletionData(prev => ({
            ...prev,
            photos: [...prev.photos, publicUrlData.publicUrl],
          }));
        }
      }
    } catch (error: any) {
      console.error('Error uploading image:', error);
      Alert.alert('Error', 'Failed to upload image: ' + (error.message || 'Please try again.'));
    } finally {
      setLoading(false);
    }
  };

  const completeIntervention = async () => {
    if (!completionData.workPerformed.trim() || !completionData.resolution.trim()) {
      Alert.alert("Incomplete Form", "Please fill in the work performed and resolution fields");
      return;
    }

    try {
      setLoading(true);

      // Update ticket status to resolved
      const { error: ticketError } = await supabase
        .from("tickets")
        .update({
          status: "resolved",
          resolved_at: new Date().toISOString(),
          resolution_notes: completionData.resolution,
          technician_notes: completionData.technicianNotes,
          time_spent_minutes: completionData.timeSpent ? parseInt(completionData.timeSpent) * 60 : null,
          total_cost: completionData.totalCost,
        })
        .eq("id", ticketId);

      if (ticketError) {
        Alert.alert("Error", "Failed to update ticket status");
        return;
      }

      // Create intervention record
      const { data: intervention, error: interventionError } = await supabase
        .from("interventions")
        .insert({
          ticket_id: ticketId,
          technician_id: user?.id,
          work_performed: completionData.workPerformed,
          root_cause: completionData.rootCause,
          resolution: completionData.resolution,
          preventive_measures: completionData.preventiveMeasures,
          customer_satisfaction: completionData.customerSatisfaction,
          time_spent_hours: completionData.timeSpent ? parseFloat(completionData.timeSpent) : null,
          actual_start_time: completionData.actualStartTime || null,
          actual_end_time: completionData.actualEndTime || null,
          follow_up_required: completionData.followUpRequired,
          follow_up_notes: completionData.followUpNotes,
          customer_signature: completionData.customerSignature,
          technician_notes: completionData.technicianNotes,
          total_cost: completionData.totalCost,
          completed_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (interventionError) {
        console.error("Error creating intervention record:", interventionError);
        // Continue even if intervention record fails
      }

      // Update inventory quantities
      for (const item of completionData.inventoryUsed) {
        await supabase
          .from("equipment")
          .update({
            stock_level: supabase.raw(`stock_level - ${item.quantity_used}`),
          })
          .eq("id", item.id);

        // Create inventory usage record
        await supabase
          .from("inventory_usage")
          .insert({
            equipment_id: item.id,
            ticket_id: ticketId,
            intervention_id: intervention?.id,
            quantity_used: item.quantity_used,
            cost_per_unit: item.cost,
            total_cost: item.cost * item.quantity_used,
            used_by: user?.id,
            used_at: new Date().toISOString(),
          });
      }

      // Add ticket history
      await supabase
        .from("ticket_history")
        .insert({
          ticket_id: ticketId,
          status: "resolved",
          timestamp: new Date().toISOString(),
          notes: `Intervention completed. ${completionData.inventoryUsed.length} items used. Total cost: $${completionData.totalCost.toFixed(2)}`,
          user_id: user?.id,
        });

      // Create notification for ticket creator
      if (ticket?.created_by) {
        await supabase
          .from("notifications")
          .insert({
            user_id: ticket.created_by,
            title: "Intervention Completed",
            message: `Ticket "${ticket.title}" has been resolved by the field technician`,
            type: "success",
            related_id: ticketId,
            related_type: "ticket",
            created_at: new Date().toISOString(),
          });
      }

      Alert.alert(
        "✅ Intervention Completed!",
        `Ticket has been marked as resolved. Total cost: $${completionData.totalCost.toFixed(2)}`,
        [
          {
            text: "View Ticket",
            onPress: () => router.push(`/tickets/${ticketId}`),
          },
          {
            text: "Back to Dashboard",
            onPress: () => router.push("/technician/dashboard"),
            style: "cancel",
          },
        ]
      );
    } catch (error) {
      console.error("Error completing intervention:", error);
      Alert.alert("Error", "Failed to complete intervention. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (!ticket) {
    return (
      <SafeAreaView className="flex-1 bg-white justify-center items-center">
        <ActivityIndicator size="large" color="#3B82F6" />
        <Text className="text-gray-500 mt-2">Loading ticket details...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      <StatusBar style="dark" />

      {/* Header */}
      <View className="flex-row justify-between items-center p-4 border-b border-gray-200 bg-white">
        <View className="flex-row items-center flex-1">
          <TouchableOpacity onPress={() => router.back()} className="mr-3">
            <ArrowLeft size={24} color="#0F172A" />
          </TouchableOpacity>
          <Text className="text-lg font-bold text-gray-800 flex-1" numberOfLines={1}>
            Complete Intervention
          </Text>
        </View>
      </View>

      <ScrollView className="flex-1 p-4" showsVerticalScrollIndicator={false}>
        {/* Ticket Info */}
        <View className="bg-white rounded-lg p-4 mb-4 shadow-sm">
          <Text className="font-bold text-gray-800 mb-2">🎫 Ticket Information</Text>
          <Text className="text-gray-700 mb-1"><Text className="font-medium">Title:</Text> {ticket.title}</Text>
          <Text className="text-gray-700 mb-1"><Text className="font-medium">Restaurant:</Text> {ticket.restaurant?.name}</Text>
          <Text className="text-gray-700 mb-1"><Text className="font-medium">Device:</Text> {ticket.device?.name}</Text>
          <Text className="text-gray-700"><Text className="font-medium">Priority:</Text> {ticket.priority?.toUpperCase()}</Text>
        </View>

        {/* Work Performed */}
        <View className="bg-white rounded-lg p-4 mb-4 shadow-sm">
          <Text className="font-bold text-gray-800 mb-3">🔧 Work Performed *</Text>
          <TextInput
            className="bg-gray-100 p-4 rounded-lg text-base"
            placeholder="Describe the work you performed in detail..."
            value={completionData.workPerformed}
            onChangeText={(text) => setCompletionData(prev => ({ ...prev, workPerformed: text }))}
            multiline
            numberOfLines={4}
          />
        </View>

        {/* Root Cause & Resolution */}
        <View className="bg-white rounded-lg p-4 mb-4 shadow-sm">
          <Text className="font-bold text-gray-800 mb-3">🔍 Root Cause Analysis</Text>
          <TextInput
            className="bg-gray-100 p-4 rounded-lg text-base mb-4"
            placeholder="What was the root cause of the problem?"
            value={completionData.rootCause}
            onChangeText={(text) => setCompletionData(prev => ({ ...prev, rootCause: text }))}
            multiline
            numberOfLines={3}
          />

          <Text className="font-medium text-gray-700 mb-2">Resolution *</Text>
          <TextInput
            className="bg-gray-100 p-4 rounded-lg text-base"
            placeholder="How was the problem resolved?"
            value={completionData.resolution}
            onChangeText={(text) => setCompletionData(prev => ({ ...prev, resolution: text }))}
            multiline
            numberOfLines={3}
          />
        </View>

        {/* Time & Cost Tracking */}
        <View className="bg-white rounded-lg p-4 mb-4 shadow-sm">
          <Text className="font-bold text-gray-800 mb-3">⏱️ Time & Cost</Text>
          
          <Text className="font-medium text-gray-700 mb-2">Time Spent (hours)</Text>
          <TextInput
            className="bg-gray-100 p-4 rounded-lg text-base mb-4"
            placeholder="e.g., 2.5"
            value={completionData.timeSpent}
            onChangeText={(text) => setCompletionData(prev => ({ ...prev, timeSpent: text }))}
            keyboardType="decimal-pad"
          />

          <View className="flex-row items-center justify-between mb-4 p-3 bg-gray-100 rounded-lg">
            <Text className="font-medium text-gray-700">Total Cost: ${completionData.totalCost.toFixed(2)}</Text>
            <DollarSign size={20} color="#10B981" />
          </View>
        </View>

        {/* Inventory Used */}
        <View className="bg-white rounded-lg p-4 mb-4 shadow-sm">
          <View className="flex-row justify-between items-center mb-3">
            <Text className="font-bold text-gray-800">📦 Inventory Used</Text>
            <TouchableOpacity
              className="bg-blue-500 px-3 py-2 rounded-lg"
              onPress={() => setShowAddInventory(true)}
            >
              <Text className="text-white font-medium">Add Item</Text>
            </TouchableOpacity>
          </View>

          {completionData.inventoryUsed.map((item, index) => (
            <View key={index} className="flex-row justify-between items-center p-3 bg-gray-50 rounded-lg mb-2">
              <View className="flex-1">
                <Text className="font-medium text-gray-800">{item.name}</Text>
                <Text className="text-gray-600 text-sm">Qty: {item.quantity_used} × ${item.cost.toFixed(2)}</Text>
              </View>
              <TouchableOpacity
                className="bg-red-500 px-3 py-1 rounded"
                onPress={() => removeInventoryItem(index)}
              >
                <Text className="text-white text-sm">Remove</Text>
              </TouchableOpacity>
            </View>
          ))}

          {completionData.inventoryUsed.length === 0 && (
            <Text className="text-gray-500 text-center py-4">No inventory items used</Text>
          )}
        </View>

        {/* Customer Satisfaction */}
        <View className="bg-white rounded-lg p-4 mb-4 shadow-sm">
          <Text className="font-bold text-gray-800 mb-3">😊 Customer Satisfaction</Text>
          <View className="bg-gray-100 rounded-lg">
            <Picker
              selectedValue={completionData.customerSatisfaction}
              onValueChange={(value) => setCompletionData(prev => ({ ...prev, customerSatisfaction: value }))}
              style={{ height: 50 }}
            >
              <Picker.Item label="Very Satisfied" value="very-satisfied" />
              <Picker.Item label="Satisfied" value="satisfied" />
              <Picker.Item label="Neutral" value="neutral" />
              <Picker.Item label="Dissatisfied" value="dissatisfied" />
              <Picker.Item label="Very Dissatisfied" value="very-dissatisfied" />
            </Picker>
          </View>
        </View>

        {/* Follow-up */}
        <View className="bg-white rounded-lg p-4 mb-4 shadow-sm">
          <View className="flex-row items-center justify-between mb-3">
            <Text className="font-bold text-gray-800">🔄 Follow-up Required</Text>
            <Switch
              value={completionData.followUpRequired}
              onValueChange={(value) => setCompletionData(prev => ({ ...prev, followUpRequired: value }))}
              trackColor={{ false: "#767577", true: "#81b0ff" }}
              thumbColor={completionData.followUpRequired ? "#1e40af" : "#f4f3f4"}
            />
          </View>

          {completionData.followUpRequired && (
            <TextInput
              className="bg-gray-100 p-4 rounded-lg text-base"
              placeholder="Describe the follow-up required..."
              value={completionData.followUpNotes}
              onChangeText={(text) => setCompletionData(prev => ({ ...prev, followUpNotes: text }))}
              multiline
              numberOfLines={3}
            />
          )}
        </View>

        {/* Photos */}
        <View className="bg-white rounded-lg p-4 mb-4 shadow-sm">
          <Text className="font-bold text-gray-800 mb-3">📷 Completion Photos</Text>
          <TouchableOpacity
            className="bg-blue-50 p-4 rounded-lg flex-row items-center justify-center mb-3"
            onPress={takePhoto}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator size="small" color="#1e40af" />
            ) : (
              <>
                <Camera size={20} color="#1e40af" />
                <Text className="text-blue-800 ml-2 font-medium">Take Photo</Text>
              </>
            )}
          </TouchableOpacity>

          <Text className="text-gray-600 text-sm">
            Photos taken: {completionData.photos.length}
          </Text>
        </View>

        {/* Technician Notes */}
        <View className="bg-white rounded-lg p-4 mb-6 shadow-sm">
          <Text className="font-bold text-gray-800 mb-3">📝 Additional Notes</Text>
          <TextInput
            className="bg-gray-100 p-4 rounded-lg text-base"
            placeholder="Any additional notes or observations..."
            value={completionData.technicianNotes}
            onChangeText={(text) => setCompletionData(prev => ({ ...prev, technicianNotes: text }))}
            multiline
            numberOfLines={4}
          />
        </View>
      </ScrollView>

      {/* Complete Button */}
      <View className="p-4 border-t border-gray-200 bg-white">
        <TouchableOpacity
          className="bg-green-500 py-4 rounded-lg flex-row items-center justify-center"
          onPress={completeIntervention}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <>
              <CheckCircle size={20} color="#FFFFFF" />
              <Text className="text-white font-bold ml-2 text-lg">Complete Intervention</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}
