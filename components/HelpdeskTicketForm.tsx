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
import { Picker } from "@react-native-picker/picker";
import {
  Plus,
  Clock,
  AlertTriangle,
  Phone,
  MapPin,
  Calendar,
  FileText,
  User,
  Building2,
  Wrench,
  Camera,
  Check,
} from "lucide-react-native";
import * as ImagePicker from "expo-image-picker";
import * as Haptics from "expo-haptics";
import { supabase } from "../lib/supabase";
import { useAuth } from "./AuthProvider";
import { decode } from "base64-arraybuffer";

interface DeviceOption {
  id: string;
  name: string;
  type: string;
  serial_number?: string;
  restaurant_name?: string;
  location_in_restaurant?: string;
}

interface RestaurantOption {
  id: string;
  name: string;
  location?: string;
  contact_phone?: string;
  manager_name?: string;
}

interface HelpdeskTicketData {
  // Basic Info
  title: string;
  priority: "low" | "medium" | "high" | "critical";
  device: DeviceOption | null;
  restaurant: RestaurantOption | null;

  // Helpdesk Specific Fields
  jiraTicketId: string;
  customerReport: string;
  problemDescription: string;
  initialDiagnosis: string;
  remoteStepsAttempted: string;
  businessImpact: string;

  // Field Technician Info
  requiresOnSite: boolean;
  estimatedDuration: string;
  urgencyLevel: "low" | "normal" | "high" | "critical";
  preferredTimeSlot: string;

  // Contact & Access
  contactPerson: string;
  contactPhone: string;
  accessInstructions: string;

  // Documentation
  photos: string[];
  diagnosticInfo: string;
}

interface HelpdeskTicketFormProps {
  onSubmit?: (ticketData: HelpdeskTicketData) => void;
  onCancel?: () => void;
  isSubmitting?: boolean;
}

const HelpdeskTicketForm = ({ onSubmit, onCancel, isSubmitting = false }: HelpdeskTicketFormProps) => {
  const { user } = useAuth();
  const [currentStep, setCurrentStep] = useState(0);
  const [ticketData, setTicketData] = useState<HelpdeskTicketData>({
    title: "",
    priority: "medium",
    device: null,
    restaurant: null,
    jiraTicketId: "",
    customerReport: "",
    problemDescription: "",
    initialDiagnosis: "",
    remoteStepsAttempted: "",
    businessImpact: "",
    requiresOnSite: true,
    estimatedDuration: "2",
    urgencyLevel: "normal",
    preferredTimeSlot: "",
    contactPerson: "",
    contactPhone: "",
    accessInstructions: "",
    photos: [],
    diagnosticInfo: "",
  });

  const [devices, setDevices] = useState<DeviceOption[]>([]);
  const [restaurants, setRestaurants] = useState<RestaurantOption[]>([]);
  const [loading, setLoading] = useState({
    devices: false,
    restaurants: false,
    imageUpload: false,
  });

  const [deviceSearchQuery, setDeviceSearchQuery] = useState("");
  const [restaurantSearchQuery, setRestaurantSearchQuery] = useState("");

  useEffect(() => {
    fetchDevices();
    fetchRestaurants();
  }, []);

  const fetchDevices = async (restaurantId?: string) => {
    try {
      setLoading((prev) => ({ ...prev, devices: true }));

      let query = supabase
        .from("devices")
        .select(`
          id,
          name,
          type,
          serial_number,
          status,
          restaurant_id,
          location_in_restaurant,
          restaurant:restaurants(name)
        `)
        .order("name");

      // Filter by restaurant if one is selected
      if (restaurantId) {
        query = query.eq("restaurant_id", restaurantId);
      }

      const { data, error } = await query;

      if (error) {
        console.error("Error fetching devices:", error);
        setDevices([]);
      } else if (data) {
        const formattedDevices = data.map((device) => ({
          id: device.id,
          name: device.name,
          type: device.type || "Unknown Type",
          serial_number: device.serial_number,
          restaurant_name: device.restaurant?.name,
          location_in_restaurant: device.location_in_restaurant,
        }));
        setDevices(formattedDevices);
      }
    } catch (error) {
      console.error("Error fetching devices:", error);
      setDevices([]);
    } finally {
      setLoading((prev) => ({ ...prev, devices: false }));
    }
  };

  const fetchRestaurants = async () => {
    try {
      setLoading((prev) => ({ ...prev, restaurants: true }));
      const { data, error } = await supabase
        .from("restaurants")
        .select("id, name, location, contact_phone, manager_name")
        .order("name");

      if (error) {
        console.error("Error fetching restaurants:", error);
        setRestaurants([]);
      } else if (data) {
        const formattedRestaurants = data.map((restaurant) => ({
          id: restaurant.id,
          name: restaurant.name,
          location: restaurant.location,
          contact_phone: restaurant.contact_phone,
          manager_name: restaurant.manager_name,
        }));
        setRestaurants(formattedRestaurants);
      }
    } catch (error) {
      console.error("Error fetching restaurants:", error);
      setRestaurants([]);
    } finally {
      setLoading((prev) => ({ ...prev, restaurants: false }));
    }
  };

  const updateTicketData = (field: keyof HelpdeskTicketData, value: any) => {
    setTicketData((prev) => ({ ...prev, [field]: value }));
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
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
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
      setLoading(prev => ({ ...prev, imageUpload: true }));

      const timestamp = Date.now();
      const randomString = Math.random().toString(36).substring(2, 8);
      const fileName = `helpdesk-ticket-${timestamp}-${randomString}.jpg`;
      const filePath = `tickets/${user?.id || 'anonymous'}/${fileName}`;

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
          updateTicketData('photos', [...ticketData.photos, publicUrlData.publicUrl]);
        }
      }
    } catch (error: any) {
      console.error('Error uploading image:', error);
      Alert.alert('Error', 'Failed to upload image: ' + (error.message || 'Please try again.'));
    } finally {
      setLoading(prev => ({ ...prev, imageUpload: false }));
    }
  };

  const isFormValid = () => {
    return (
      ticketData.title.trim() !== "" &&
      ticketData.device !== null &&
      ticketData.restaurant !== null &&
      ticketData.problemDescription.trim() !== "" &&
      ticketData.customerReport.trim() !== ""
    );
  };

  const handleSubmit = async () => {
    if (!isFormValid()) {
      Alert.alert("Incomplete Form", "Please fill in all required fields");
      return;
    }

    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    if (onSubmit) {
      onSubmit(ticketData);
    }
  };

  const renderStepIndicator = () => (
    <View className="flex-row justify-center my-4">
      {[0, 1, 2, 3, 4].map((step) => (
        <View
          key={step}
          className={`h-2 w-2 rounded-full mx-1 ${
            currentStep === step ? "bg-blue-600" : "bg-gray-300"
          }`}
        />
      ))}
    </View>
  );

  const steps = [
    "Basic Info",
    "Problem Details",
    "Device & Location",
    "Field Work Info",
    "Review & Submit"
  ];

  return (
    <View className="flex-1 bg-white">
      {/* Header */}
      <View className="bg-blue-600 px-4 py-6 pb-8">
        <Text className="text-white text-xl font-bold text-center">
          🎫 Create Helpdesk Ticket
        </Text>
        <Text className="text-blue-100 text-center mt-1">
          Step {currentStep + 1} of {steps.length}: {steps[currentStep]}
        </Text>
        {renderStepIndicator()}
      </View>

      <ScrollView className="flex-1 px-4 py-6" showsVerticalScrollIndicator={false}>
        {currentStep === 0 && (
          <View>
            <Text className="text-lg font-bold mb-4 text-gray-800">📋 Basic Information</Text>

            <Text className="text-sm font-medium text-gray-700 mb-2">Ticket Title *</Text>
            <TextInput
              className="bg-gray-100 p-4 rounded-lg text-base mb-4"
              placeholder="Brief description of the issue"
              value={ticketData.title}
              onChangeText={(text) => updateTicketData("title", text)}
            />

            <Text className="text-sm font-medium text-gray-700 mb-2">JIRA Ticket ID</Text>
            <TextInput
              className="bg-gray-100 p-4 rounded-lg text-base mb-4"
              placeholder="e.g., HELP-1234"
              value={ticketData.jiraTicketId}
              onChangeText={(text) => updateTicketData("jiraTicketId", text)}
            />

            <Text className="text-sm font-medium text-gray-700 mb-2">Priority Level *</Text>
            <View className="flex-row justify-between mb-4">
              {[
                { key: "low", label: "Low", color: "bg-green-500" },
                { key: "medium", label: "Medium", color: "bg-yellow-500" },
                { key: "high", label: "High", color: "bg-orange-500" },
                { key: "critical", label: "Critical", color: "bg-red-500" }
              ].map((priority) => (
                <TouchableOpacity
                  key={priority.key}
                  className={`flex-1 py-3 mx-1 rounded-lg ${
                    ticketData.priority === priority.key
                      ? priority.color
                      : "bg-gray-200"
                  }`}
                  onPress={() => {
                    updateTicketData("priority", priority.key);
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  }}
                >
                  <Text
                    className={`text-center font-medium text-xs ${
                      ticketData.priority === priority.key
                        ? "text-white"
                        : "text-gray-700"
                    }`}
                  >
                    {priority.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text className="text-sm font-medium text-gray-700 mb-2">Urgency Level</Text>
            <View className="bg-gray-100 rounded-lg mb-4">
              <Picker
                selectedValue={ticketData.urgencyLevel}
                onValueChange={(value) => updateTicketData("urgencyLevel", value)}
                style={{ height: 50 }}
              >
                <Picker.Item label="Low - Can wait" value="low" />
                <Picker.Item label="Normal - Standard response" value="normal" />
                <Picker.Item label="High - Needs quick attention" value="high" />
                <Picker.Item label="Critical - Immediate response" value="critical" />
              </Picker>
            </View>
          </View>
        )}

        {currentStep === 1 && (
          <View>
            <Text className="text-lg font-bold mb-4 text-gray-800">🔍 Problem Details</Text>

            <Text className="text-sm font-medium text-gray-700 mb-2">Customer Report *</Text>
            <TextInput
              className="bg-gray-100 p-4 rounded-lg text-base mb-4"
              placeholder="What did the customer report? (exact words if possible)"
              value={ticketData.customerReport}
              onChangeText={(text) => updateTicketData("customerReport", text)}
              multiline
              numberOfLines={3}
            />

            <Text className="text-sm font-medium text-gray-700 mb-2">Problem Description *</Text>
            <TextInput
              className="bg-gray-100 p-4 rounded-lg text-base mb-4"
              placeholder="Detailed description of the technical issue"
              value={ticketData.problemDescription}
              onChangeText={(text) => updateTicketData("problemDescription", text)}
              multiline
              numberOfLines={4}
            />

            <Text className="text-sm font-medium text-gray-700 mb-2">Initial Diagnosis</Text>
            <TextInput
              className="bg-gray-100 p-4 rounded-lg text-base mb-4"
              placeholder="Your initial assessment of the problem"
              value={ticketData.initialDiagnosis}
              onChangeText={(text) => updateTicketData("initialDiagnosis", text)}
              multiline
              numberOfLines={3}
            />

            <Text className="text-sm font-medium text-gray-700 mb-2">Remote Steps Attempted</Text>
            <TextInput
              className="bg-gray-100 p-4 rounded-lg text-base mb-4"
              placeholder="What troubleshooting steps have you already tried remotely?"
              value={ticketData.remoteStepsAttempted}
              onChangeText={(text) => updateTicketData("remoteStepsAttempted", text)}
              multiline
              numberOfLines={4}
            />

            <Text className="text-sm font-medium text-gray-700 mb-2">Business Impact</Text>
            <TextInput
              className="bg-gray-100 p-4 rounded-lg text-base mb-4"
              placeholder="How is this affecting restaurant operations?"
              value={ticketData.businessImpact}
              onChangeText={(text) => updateTicketData("businessImpact", text)}
              multiline
              numberOfLines={3}
            />
          </View>
        )}

        {currentStep === 2 && (
          <View>
            <Text className="text-lg font-bold mb-4 text-gray-800">🏢 Device & Location</Text>

            <Text className="text-sm font-medium text-gray-700 mb-2">Restaurant *</Text>
            <TextInput
              className="bg-gray-100 p-4 rounded-lg text-base mb-4"
              placeholder="Search restaurants..."
              value={restaurantSearchQuery}
              onChangeText={setRestaurantSearchQuery}
            />

            {loading.restaurants ? (
              <ActivityIndicator size="small" color="#1e40af" />
            ) : (
              <ScrollView className="max-h-48 mb-4" showsVerticalScrollIndicator={true}>
                {restaurants
                  .filter((restaurant) =>
                    restaurant.name
                      .toLowerCase()
                      .includes(restaurantSearchQuery.toLowerCase())
                  )
                  .map((restaurant) => (
                    <TouchableOpacity
                      key={restaurant.id}
                      className={`p-4 mb-2 rounded-lg ${
                        ticketData.restaurant?.id === restaurant.id
                          ? "bg-blue-100 border border-blue-300"
                          : "bg-gray-100"
                      }`}
                      onPress={() => {
                        updateTicketData("restaurant", restaurant);
                        // Auto-fill contact info if available
                        if (restaurant.contact_phone) {
                          updateTicketData("contactPhone", restaurant.contact_phone);
                        }
                        if (restaurant.manager_name) {
                          updateTicketData("contactPerson", restaurant.manager_name);
                        }
                        // Clear selected device when restaurant changes
                        updateTicketData("device", null);
                        // Fetch devices for the selected restaurant
                        fetchDevices(restaurant.id);
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      }}
                    >
                      <View className="flex-row justify-between items-center">
                        <View className="flex-1">
                          <Text className="font-medium">{restaurant.name}</Text>
                          {restaurant.location && (
                            <Text className="text-gray-500 text-sm">{restaurant.location}</Text>
                          )}
                          {restaurant.manager_name && (
                            <Text className="text-gray-600 text-sm">Manager: {restaurant.manager_name}</Text>
                          )}
                        </View>
                        {ticketData.restaurant?.id === restaurant.id && (
                          <Check size={20} color="#1e40af" />
                        )}
                      </View>
                    </TouchableOpacity>
                  ))}
              </ScrollView>
            )}

            <Text className="text-sm font-medium text-gray-700 mb-2">Device *</Text>
            <TextInput
              className="bg-gray-100 p-4 rounded-lg text-base mb-4"
              placeholder="Search devices..."
              value={deviceSearchQuery}
              onChangeText={setDeviceSearchQuery}
            />

            {loading.devices ? (
              <ActivityIndicator size="small" color="#1e40af" />
            ) : (
              <ScrollView className="max-h-48 mb-4" showsVerticalScrollIndicator={true}>
                {devices
                  .filter((device) =>
                    device.name
                      .toLowerCase()
                      .includes(deviceSearchQuery.toLowerCase())
                  )
                  .map((device) => (
                    <TouchableOpacity
                      key={device.id}
                      className={`p-4 mb-2 rounded-lg ${
                        ticketData.device?.id === device.id
                          ? "bg-blue-100 border border-blue-300"
                          : "bg-gray-100"
                      }`}
                      onPress={() => {
                        updateTicketData("device", device);
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      }}
                    >
                      <View className="flex-row justify-between items-center">
                        <View className="flex-1">
                          <Text className="font-medium">{device.name}</Text>
                          <Text className="text-gray-500 text-sm">{device.type}</Text>
                          {device.serial_number && (
                            <Text className="text-gray-600 text-sm">S/N: {device.serial_number}</Text>
                          )}
                          {device.restaurant_name && !ticketData.restaurant && (
                            <Text className="text-blue-600 text-sm">📍 {device.restaurant_name}</Text>
                          )}
                          {device.location_in_restaurant && (
                            <Text className="text-gray-500 text-xs">Location: {device.location_in_restaurant}</Text>
                          )}
                        </View>
                        {ticketData.device?.id === device.id && (
                          <Check size={20} color="#1e40af" />
                        )}
                      </View>
                    </TouchableOpacity>
                  ))}
              </ScrollView>
            )}
          </View>
        )}

        {currentStep === 3 && (
          <View>
            <Text className="text-lg font-bold mb-4 text-gray-800">🔧 Field Work Information</Text>

            <View className="flex-row items-center justify-between mb-4 p-4 bg-gray-100 rounded-lg">
              <Text className="text-sm font-medium text-gray-700">Requires On-Site Visit</Text>
              <Switch
                value={ticketData.requiresOnSite}
                onValueChange={(value) => updateTicketData("requiresOnSite", value)}
                trackColor={{ false: "#767577", true: "#81b0ff" }}
                thumbColor={ticketData.requiresOnSite ? "#1e40af" : "#f4f3f4"}
              />
            </View>

            <Text className="text-sm font-medium text-gray-700 mb-2">Estimated Duration (hours)</Text>
            <View className="bg-gray-100 rounded-lg mb-4">
              <Picker
                selectedValue={ticketData.estimatedDuration}
                onValueChange={(value) => updateTicketData("estimatedDuration", value)}
                style={{ height: 50 }}
              >
                <Picker.Item label="1 hour" value="1" />
                <Picker.Item label="2 hours" value="2" />
                <Picker.Item label="3 hours" value="3" />
                <Picker.Item label="4 hours" value="4" />
                <Picker.Item label="Half day (4+ hours)" value="4+" />
                <Picker.Item label="Full day (8+ hours)" value="8+" />
              </Picker>
            </View>

            <Text className="text-sm font-medium text-gray-700 mb-2">Preferred Time Slot</Text>
            <View className="bg-gray-100 rounded-lg mb-4">
              <Picker
                selectedValue={ticketData.preferredTimeSlot}
                onValueChange={(value) => updateTicketData("preferredTimeSlot", value)}
                style={{ height: 50 }}
              >
                <Picker.Item label="Any time" value="" />
                <Picker.Item label="Morning (8AM - 12PM)" value="morning" />
                <Picker.Item label="Afternoon (12PM - 5PM)" value="afternoon" />
                <Picker.Item label="Evening (5PM - 9PM)" value="evening" />
                <Picker.Item label="After hours (9PM+)" value="after-hours" />
                <Picker.Item label="Before opening" value="before-opening" />
              </Picker>
            </View>

            <Text className="text-sm font-medium text-gray-700 mb-2">Contact Person</Text>
            <TextInput
              className="bg-gray-100 p-4 rounded-lg text-base mb-4"
              placeholder="Name of person to contact at restaurant"
              value={ticketData.contactPerson}
              onChangeText={(text) => updateTicketData("contactPerson", text)}
            />

            <Text className="text-sm font-medium text-gray-700 mb-2">Contact Phone</Text>
            <TextInput
              className="bg-gray-100 p-4 rounded-lg text-base mb-4"
              placeholder="Phone number for coordination"
              value={ticketData.contactPhone}
              onChangeText={(text) => updateTicketData("contactPhone", text)}
              keyboardType="phone-pad"
            />

            <Text className="text-sm font-medium text-gray-700 mb-2">Access Instructions</Text>
            <TextInput
              className="bg-gray-100 p-4 rounded-lg text-base mb-4"
              placeholder="How to access the location, parking, entry codes, etc."
              value={ticketData.accessInstructions}
              onChangeText={(text) => updateTicketData("accessInstructions", text)}
              multiline
              numberOfLines={3}
            />
          </View>
        )}

        {currentStep === 4 && (
          <View>
            <Text className="text-lg font-bold mb-4 text-gray-800">📋 Review & Submit</Text>

            <View className="bg-gray-50 p-4 rounded-lg mb-4">
              <Text className="font-bold text-gray-800 mb-2">Ticket Summary</Text>
              <Text className="text-gray-700 mb-1"><Text className="font-medium">Title:</Text> {ticketData.title}</Text>
              <Text className="text-gray-700 mb-1"><Text className="font-medium">Priority:</Text> {ticketData.priority.toUpperCase()}</Text>
              {ticketData.jiraTicketId && (
                <Text className="text-gray-700 mb-1"><Text className="font-medium">JIRA ID:</Text> {ticketData.jiraTicketId}</Text>
              )}
              <Text className="text-gray-700 mb-1"><Text className="font-medium">Restaurant:</Text> {ticketData.restaurant?.name}</Text>
              <Text className="text-gray-700 mb-1"><Text className="font-medium">Device:</Text> {ticketData.device?.name}</Text>
              <Text className="text-gray-700 mb-1"><Text className="font-medium">On-site Required:</Text> {ticketData.requiresOnSite ? "Yes" : "No"}</Text>
              <Text className="text-gray-700 mb-1"><Text className="font-medium">Estimated Duration:</Text> {ticketData.estimatedDuration} hours</Text>
            </View>

            <Text className="text-sm font-medium text-gray-700 mb-2">Additional Diagnostic Information</Text>
            <TextInput
              className="bg-gray-100 p-4 rounded-lg text-base mb-4"
              placeholder="Any additional technical details for the field technician"
              value={ticketData.diagnosticInfo}
              onChangeText={(text) => updateTicketData("diagnosticInfo", text)}
              multiline
              numberOfLines={4}
            />

            <Text className="text-sm font-medium text-gray-700 mb-2">Photos ({ticketData.photos.length})</Text>
            <TouchableOpacity
              className="bg-blue-50 p-4 rounded-lg flex-row items-center justify-center mb-4"
              onPress={takePhoto}
              disabled={loading.imageUpload}
            >
              {loading.imageUpload ? (
                <ActivityIndicator size="small" color="#1e40af" />
              ) : (
                <>
                  <Camera size={20} color="#1e40af" />
                  <Text className="text-blue-800 ml-2 font-medium">Add Photo</Text>
                </>
              )}
            </TouchableOpacity>

            {ticketData.photos.length > 0 && (
              <View className="mb-4">
                <Text className="text-sm text-gray-600 mb-2">Attached Photos:</Text>
                {ticketData.photos.map((photo, index) => (
                  <Text key={index} className="text-xs text-gray-500 mb-1">
                    📷 Photo {index + 1}
                  </Text>
                ))}
              </View>
            )}

            <View className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
              <Text className="text-yellow-800 font-medium mb-2">⚠️ Before Submitting</Text>
              <Text className="text-yellow-700 text-sm">
                • Ensure all required fields are completed{"\n"}
                • Verify restaurant and device information{"\n"}
                • Double-check contact details{"\n"}
                • Add any relevant photos or documentation
              </Text>
            </View>
          </View>
        )}
      </ScrollView>

      {/* Navigation Buttons */}
      <View className="flex-row justify-between p-4 border-t border-gray-200">
        <TouchableOpacity
          className={`px-6 py-3 rounded-lg ${
            currentStep === 0 ? "bg-gray-300" : "bg-gray-500"
          }`}
          onPress={() => {
            if (currentStep > 0) {
              setCurrentStep(currentStep - 1);
            } else if (onCancel) {
              onCancel();
            }
          }}
          disabled={isSubmitting}
        >
          <Text className="text-white font-medium">
            {currentStep === 0 ? "Cancel" : "Previous"}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          className="bg-blue-600 px-6 py-3 rounded-lg"
          onPress={() => {
            if (currentStep < steps.length - 1) {
              setCurrentStep(currentStep + 1);
            } else {
              handleSubmit();
            }
          }}
          disabled={isSubmitting}
        >
          {isSubmitting ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <Text className="text-white font-medium">
              {currentStep === steps.length - 1 ? "Create Ticket" : "Next"}
            </Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
};

export default HelpdeskTicketForm;
