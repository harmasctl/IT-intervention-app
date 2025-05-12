import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  ScrollView,
  TouchableOpacity,
  Image,
} from "react-native";
import {
  Camera,
  ChevronRight,
  AlertCircle,
  Upload,
  Check,
} from "lucide-react-native";
import * as Haptics from "expo-haptics";

interface DeviceOption {
  id: string;
  name: string;
  type: string;
}

interface RestaurantOption {
  id: string;
  name: string;
  location: string;
}

interface CreateTicketFormProps {
  onSubmit?: (ticketData: TicketData) => void;
  onCancel?: () => void;
}

interface TicketData {
  title: string;
  device: DeviceOption | null;
  diagnosticInfo: string;
  restaurant: RestaurantOption | null;
  priority: "low" | "medium" | "high";
  photos: string[];
  jiraTicketId: string;
}

const MOCK_DEVICES: DeviceOption[] = [
  { id: "1", name: "Ice Cream Machine", type: "Kitchen Equipment" },
  { id: "2", name: "POS Terminal", type: "Electronics" },
  { id: "3", name: "Refrigerator #2", type: "Kitchen Equipment" },
  { id: "4", name: "Digital Menu Board", type: "Electronics" },
  { id: "5", name: "Dishwasher", type: "Kitchen Equipment" },
];

const MOCK_RESTAURANTS: RestaurantOption[] = [
  { id: "1", name: "Downtown Grill", location: "123 Main St, City" },
  { id: "2", name: "Seaside Bistro", location: "456 Ocean Ave, Beach Town" },
  { id: "3", name: "Mountain View Cafe", location: "789 Summit Rd, Highland" },
  { id: "4", name: "City Center Diner", location: "101 Plaza Square, Metro" },
];

const CreateTicketForm = ({ onSubmit, onCancel }: CreateTicketFormProps) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [ticketData, setTicketData] = useState<TicketData>({
    title: "",
    device: null,
    diagnosticInfo: "",
    restaurant: null,
    priority: "medium",
    photos: [],
    jiraTicketId: "",
  });

  const [deviceSearchQuery, setDeviceSearchQuery] = useState("");
  const [restaurantSearchQuery, setRestaurantSearchQuery] = useState("");

  const handleNext = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setCurrentStep(currentStep + 1);
  };

  const handleBack = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setCurrentStep(currentStep - 1);
  };

  const handleSubmit = async () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    // In a real implementation, we would save to Supabase here
    // const { data, error } = await supabase.from('tickets').insert([{
    //   title: ticketData.title,
    //   priority: ticketData.priority,
    //   restaurant_id: ticketData.restaurant?.id,
    //   device_id: ticketData.device?.id,
    //   diagnostic_info: ticketData.diagnosticInfo,
    //   photos: ticketData.photos,
    // }]);

    if (onSubmit) {
      onSubmit(ticketData);
    }
  };

  const updateTicketData = (field: keyof TicketData, value: any) => {
    setTicketData((prev) => ({ ...prev, [field]: value }));
  };

  const addMockPhoto = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const newPhoto = `https://images.unsplash.com/photo-${Math.floor(Math.random() * 1000)}?w=300&q=80`;
    updateTicketData("photos", [...ticketData.photos, newPhoto]);
  };

  const removeMockPhoto = (index: number) => {
    const updatedPhotos = [...ticketData.photos];
    updatedPhotos.splice(index, 1);
    updateTicketData("photos", updatedPhotos);
  };

  const filteredDevices = MOCK_DEVICES.filter(
    (device) =>
      device.name.toLowerCase().includes(deviceSearchQuery.toLowerCase()) ||
      device.type.toLowerCase().includes(deviceSearchQuery.toLowerCase()),
  );

  const filteredRestaurants = MOCK_RESTAURANTS.filter(
    (restaurant) =>
      restaurant.name
        .toLowerCase()
        .includes(restaurantSearchQuery.toLowerCase()) ||
      restaurant.location
        .toLowerCase()
        .includes(restaurantSearchQuery.toLowerCase()),
  );

  const renderStepIndicator = () => (
    <View className="flex-row justify-between mb-6 px-4">
      {[0, 1, 2, 3, 4, 5].map((step) => (
        <View
          key={step}
          className={`h-2 flex-1 mx-1 rounded-full ${currentStep >= step ? "bg-blue-500" : "bg-gray-300"}`}
        />
      ))}
    </View>
  );

  const renderStepContent = () => {
    switch (currentStep) {
      case 0:
        return (
          <View className="px-4">
            <Text className="text-lg font-bold mb-2">Ticket Title</Text>
            <Text className="text-gray-600 mb-4">
              Enter a clear, descriptive title for this support ticket
            </Text>
            <TextInput
              className="border border-gray-300 rounded-lg p-3 mb-4 bg-white"
              placeholder="e.g., Ice Cream Machine Not Cooling"
              value={ticketData.title}
              onChangeText={(text) => updateTicketData("title", text)}
            />
            <TouchableOpacity
              className={`py-3 px-4 rounded-lg ${ticketData.title.trim() ? "bg-blue-500" : "bg-gray-300"} ${ticketData.title.trim() ? "animate-pulse" : ""}`}
              onPress={handleNext}
              disabled={!ticketData.title.trim()}
            >
              <Text className="text-white text-center font-semibold">Next</Text>
            </TouchableOpacity>
          </View>
        );

      case 1:
        return (
          <View className="px-4">
            <Text className="text-lg font-bold mb-2">Select Device</Text>
            <Text className="text-gray-600 mb-4">
              Choose the device that is experiencing issues
            </Text>

            <TextInput
              className="border border-gray-300 rounded-lg p-3 mb-4 bg-white"
              placeholder="Search devices..."
              value={deviceSearchQuery}
              onChangeText={setDeviceSearchQuery}
            />

            <ScrollView className="max-h-64 mb-4">
              {filteredDevices.map((device) => (
                <TouchableOpacity
                  key={device.id}
                  className={`p-3 border-b border-gray-200 flex-row justify-between items-center ${ticketData.device?.id === device.id ? "bg-blue-50" : ""} animate-fade-in`}
                  onPress={() => updateTicketData("device", device)}
                >
                  <View>
                    <Text className="font-semibold">{device.name}</Text>
                    <Text className="text-gray-500 text-sm">{device.type}</Text>
                  </View>
                  {ticketData.device?.id === device.id && (
                    <Check size={20} color="#3b82f6" />
                  )}
                </TouchableOpacity>
              ))}
              {filteredDevices.length === 0 && (
                <View className="py-4 items-center">
                  <Text className="text-gray-500">No devices found</Text>
                </View>
              )}
            </ScrollView>

            <View className="flex-row justify-between">
              <TouchableOpacity
                className="py-3 px-4 rounded-lg bg-gray-200 w-[48%]"
                onPress={handleBack}
              >
                <Text className="text-gray-800 text-center font-semibold">
                  Back
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                className={`py-3 px-4 rounded-lg w-[48%] ${ticketData.device ? "bg-blue-500" : "bg-gray-300"}`}
                onPress={handleNext}
                disabled={!ticketData.device}
              >
                <Text className="text-white text-center font-semibold">
                  Next
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        );

      case 2:
        return (
          <View className="px-4">
            <Text className="text-lg font-bold mb-2">
              Diagnostic Information
            </Text>
            <Text className="text-gray-600 mb-4">
              Describe the issue and any relevant observations
            </Text>

            <TextInput
              className="border border-gray-300 rounded-lg p-3 mb-4 bg-white h-32"
              placeholder="Describe the problem in detail..."
              multiline
              textAlignVertical="top"
              value={ticketData.diagnosticInfo}
              onChangeText={(text) => updateTicketData("diagnosticInfo", text)}
            />

            <View className="flex-row justify-between">
              <TouchableOpacity
                className="py-3 px-4 rounded-lg bg-gray-200 w-[48%]"
                onPress={handleBack}
              >
                <Text className="text-gray-800 text-center font-semibold">
                  Back
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                className={`py-3 px-4 rounded-lg w-[48%] ${ticketData.diagnosticInfo.trim() ? "bg-blue-500" : "bg-gray-300"}`}
                onPress={handleNext}
                disabled={!ticketData.diagnosticInfo.trim()}
              >
                <Text className="text-white text-center font-semibold">
                  Next
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        );

      case 3:
        return (
          <View className="px-4">
            <Text className="text-lg font-bold mb-2">Restaurant Location</Text>
            <Text className="text-gray-600 mb-4">
              Select the restaurant where the issue is occurring
            </Text>

            <TextInput
              className="border border-gray-300 rounded-lg p-3 mb-4 bg-white"
              placeholder="Search restaurants..."
              value={restaurantSearchQuery}
              onChangeText={setRestaurantSearchQuery}
            />

            <ScrollView className="max-h-64 mb-4">
              {filteredRestaurants.map((restaurant) => (
                <TouchableOpacity
                  key={restaurant.id}
                  className={`p-3 border-b border-gray-200 flex-row justify-between items-center ${ticketData.restaurant?.id === restaurant.id ? "bg-blue-50" : ""} animate-fade-in`}
                  onPress={() => updateTicketData("restaurant", restaurant)}
                >
                  <View>
                    <Text className="font-semibold">{restaurant.name}</Text>
                    <Text className="text-gray-500 text-sm">
                      {restaurant.location}
                    </Text>
                  </View>
                  {ticketData.restaurant?.id === restaurant.id && (
                    <Check size={20} color="#3b82f6" />
                  )}
                </TouchableOpacity>
              ))}
              {filteredRestaurants.length === 0 && (
                <View className="py-4 items-center">
                  <Text className="text-gray-500">No restaurants found</Text>
                </View>
              )}
            </ScrollView>

            <View className="flex-row justify-between">
              <TouchableOpacity
                className="py-3 px-4 rounded-lg bg-gray-200 w-[48%]"
                onPress={handleBack}
              >
                <Text className="text-gray-800 text-center font-semibold">
                  Back
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                className={`py-3 px-4 rounded-lg w-[48%] ${ticketData.restaurant ? "bg-blue-500" : "bg-gray-300"}`}
                onPress={handleNext}
                disabled={!ticketData.restaurant}
              >
                <Text className="text-white text-center font-semibold">
                  Next
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        );

      case 4:
        return (
          <View className="px-4">
            <Text className="text-lg font-bold mb-2">Jira Integration</Text>
            <Text className="text-gray-600 mb-4">
              Link this ticket to an existing Jira ticket (optional)
            </Text>

            <TextInput
              className="border border-gray-300 rounded-lg p-3 mb-4 bg-white"
              placeholder="e.g., TECH-123"
              value={ticketData.jiraTicketId}
              onChangeText={(text) => updateTicketData("jiraTicketId", text)}
            />

            <View className="flex-row justify-between">
              <TouchableOpacity
                className="py-3 px-4 rounded-lg bg-gray-200 w-[48%]"
                onPress={handleBack}
              >
                <Text className="text-gray-800 text-center font-semibold">
                  Back
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                className="py-3 px-4 rounded-lg bg-blue-500 w-[48%]"
                onPress={handleNext}
              >
                <Text className="text-white text-center font-semibold">
                  Next
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        );

      case 5:
        return (
          <View className="px-4">
            <Text className="text-lg font-bold mb-2">Priority & Photos</Text>
            <Text className="text-gray-600 mb-4">
              Set priority level and attach relevant photos
            </Text>

            <Text className="font-semibold mb-2">Priority Level</Text>
            <View className="flex-row mb-6">
              {(["low", "medium", "high"] as const).map((priority) => (
                <TouchableOpacity
                  key={priority}
                  className={`flex-1 py-2 mx-1 rounded-lg ${
                    ticketData.priority === priority
                      ? priority === "low"
                        ? "bg-green-500"
                        : priority === "medium"
                          ? "bg-yellow-500"
                          : "bg-red-500"
                      : "bg-gray-200"
                  }`}
                  onPress={() => updateTicketData("priority", priority)}
                >
                  <Text
                    className={`text-center font-semibold ${ticketData.priority === priority ? "text-white" : "text-gray-700"}`}
                  >
                    {priority.charAt(0).toUpperCase() + priority.slice(1)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text className="font-semibold mb-2">Photos</Text>
            <View className="flex-row flex-wrap mb-4">
              {ticketData.photos.map((photo, index) => (
                <View key={index} className="w-1/3 p-1 relative">
                  <Image
                    source={{ uri: photo }}
                    className="w-full h-24 rounded-lg"
                  />
                  <TouchableOpacity
                    className="absolute top-2 right-2 bg-red-500 rounded-full w-6 h-6 items-center justify-center"
                    onPress={() => removeMockPhoto(index)}
                  >
                    <Text className="text-white font-bold">×</Text>
                  </TouchableOpacity>
                </View>
              ))}
              <TouchableOpacity className="w-1/3 p-1" onPress={addMockPhoto}>
                <View className="w-full h-24 border-2 border-dashed border-gray-300 rounded-lg items-center justify-center bg-gray-50 animate-pulse">
                  <Camera size={24} color="#9ca3af" />
                  <Text className="text-gray-400 mt-1">Add Photo</Text>
                </View>
              </TouchableOpacity>
            </View>

            <View className="flex-row justify-between">
              <TouchableOpacity
                className="py-3 px-4 rounded-lg bg-gray-200 w-[48%]"
                onPress={handleBack}
              >
                <Text className="text-gray-800 text-center font-semibold">
                  Back
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                className="py-3 px-4 rounded-lg bg-blue-500 w-[48%] animate-pulse"
                onPress={handleSubmit}
              >
                <Text className="text-white text-center font-semibold">
                  Submit Ticket
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        );

      default:
        return null;
    }
  };

  return (
    <ScrollView className="flex-1 bg-white">
      <View className="pt-4 pb-8 animate-fade-in">
        {renderStepIndicator()}
        {renderStepContent()}
      </View>
    </ScrollView>
  );
};

export default CreateTicketForm;
