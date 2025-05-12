import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  ScrollView,
  Alert,
} from "react-native";
import {
  Camera,
  Filter,
  Plus,
  Search,
  Settings,
  Smartphone,
} from "lucide-react-native";
import { Image } from "expo-image";

interface Device {
  id: string;
  name: string;
  serialNumber: string;
  restaurant: string;
  status: "operational" | "maintenance" | "offline";
  lastMaintenance: string;
  image?: string;
}

interface MaintenanceRecord {
  id: string;
  date: string;
  technician: string;
  description: string;
  resolved: boolean;
}

interface DeviceInventoryProps {
  devices?: Device[];
  restaurants?: string[];
  onAddDevice?: () => void;
  onScanSerial?: () => void;
  onSelectDevice?: (device: Device) => void;
  onScheduleMaintenance?: (device: Device) => void;
  onUpdateStatus?: (device: Device) => void;
}

const DeviceInventory = ({
  devices = [
    {
      id: "1",
      name: "POS Terminal",
      serialNumber: "POS-2023-001",
      restaurant: "Bella Italia",
      status: "operational",
      lastMaintenance: "2023-10-15",
      image:
        "https://images.unsplash.com/photo-1516997121675-4c2d1684aa3e?w=400&q=80",
    },
    {
      id: "2",
      name: "Kitchen Display",
      serialNumber: "KD-2022-045",
      restaurant: "Bella Italia",
      status: "maintenance",
      lastMaintenance: "2023-11-20",
      image:
        "https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=400&q=80",
    },
    {
      id: "3",
      name: "Digital Menu Board",
      serialNumber: "DMB-2023-012",
      restaurant: "Sushi Express",
      status: "offline",
      lastMaintenance: "2023-09-05",
      image:
        "https://images.unsplash.com/photo-1563203369-26f2e4a5ccf7?w=400&q=80",
    },
    {
      id: "4",
      name: "Self-Order Kiosk",
      serialNumber: "SOK-2022-089",
      restaurant: "Burger Junction",
      status: "operational",
      lastMaintenance: "2023-12-01",
      image:
        "https://images.unsplash.com/photo-1581092335397-9583eb92d232?w=400&q=80",
    },
  ],
  restaurants = [
    "All Restaurants",
    "Bella Italia",
    "Sushi Express",
    "Burger Junction",
    "Pizza Palace",
  ],
  onAddDevice = () => console.log("Add device"),
  onScanSerial = () => console.log("Scan serial"),
  onSelectDevice = (device) => console.log("Selected device:", device),
  onScheduleMaintenance = (device) =>
    console.log("Schedule maintenance:", device),
  onUpdateStatus = (device) => console.log("Update status:", device),
}: DeviceInventoryProps) => {
  // In a real implementation, we would fetch from Supabase here
  // useEffect(() => {
  //   const fetchDevices = async () => {
  //     const { data, error } = await supabase
  //       .from('devices')
  //       .select('*, restaurants(name)');
  //     if (data) {
  //       // Transform data to match the expected format
  //     }
  //   };
  //   fetchDevices();
  // }, []);
  const [selectedRestaurant, setSelectedRestaurant] =
    useState("All Restaurants");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedDevice, setSelectedDevice] = useState<Device | null>(null);

  const maintenanceHistory: MaintenanceRecord[] = [
    {
      id: "1",
      date: "2023-10-15",
      technician: "John Smith",
      description: "Routine maintenance and software update",
      resolved: true,
    },
    {
      id: "2",
      date: "2023-08-22",
      technician: "Maria Garcia",
      description: "Replaced faulty touchscreen",
      resolved: true,
    },
    {
      id: "3",
      date: "2023-11-20",
      technician: "David Chen",
      description: "System not booting, investigating hardware issue",
      resolved: false,
    },
  ];

  const filteredDevices = devices.filter((device) => {
    const matchesRestaurant =
      selectedRestaurant === "All Restaurants" ||
      device.restaurant === selectedRestaurant;
    const matchesSearch =
      device.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      device.serialNumber.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesRestaurant && matchesSearch;
  });

  const handleDeviceSelect = (device: Device) => {
    setSelectedDevice(device);
    onSelectDevice(device);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "operational":
        return "bg-green-500";
      case "maintenance":
        return "bg-yellow-500";
      case "offline":
        return "bg-red-500";
      default:
        return "bg-gray-500";
    }
  };

  const renderDeviceItem = ({ item }: { item: Device }) => (
    <TouchableOpacity
      className="bg-white rounded-lg p-4 mb-3 shadow-sm border border-gray-200 flex-row"
      onPress={() => handleDeviceSelect(item)}
    >
      {item.image ? (
        <Image
          source={{ uri: item.image }}
          className="w-16 h-16 rounded-md mr-3"
          contentFit="cover"
        />
      ) : (
        <View className="w-16 h-16 rounded-md mr-3 bg-gray-200 items-center justify-center">
          <Smartphone size={24} color="#666" />
        </View>
      )}
      <View className="flex-1">
        <View className="flex-row justify-between items-start">
          <Text className="font-bold text-lg">{item.name}</Text>
          <View
            className={`${getStatusColor(item.status)} px-2 py-1 rounded-full`}
          >
            <Text className="text-white text-xs capitalize">{item.status}</Text>
          </View>
        </View>
        <Text className="text-gray-600 text-sm">S/N: {item.serialNumber}</Text>
        <Text className="text-gray-600 text-sm">{item.restaurant}</Text>
        <Text className="text-gray-500 text-xs mt-1">
          Last maintenance: {item.lastMaintenance}
        </Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <View className="flex-1 bg-gray-50 p-4">
      {!selectedDevice ? (
        <>
          <View className="flex-row justify-between items-center mb-4">
            <Text className="text-2xl font-bold">Device Inventory</Text>
            <View className="flex-row">
              <TouchableOpacity
                className="bg-blue-500 p-2 rounded-full mr-2"
                onPress={onScanSerial}
              >
                <Camera size={20} color="white" />
              </TouchableOpacity>
              <TouchableOpacity
                className="bg-blue-500 p-2 rounded-full"
                onPress={onAddDevice}
              >
                <Plus size={20} color="white" />
              </TouchableOpacity>
            </View>
          </View>

          <View className="mb-4">
            <View className="flex-row items-center bg-white rounded-lg px-3 mb-3 border border-gray-200">
              <Search size={20} color="#666" />
              <TextInput
                className="flex-1 py-2 px-2"
                placeholder="Search devices by name or serial number"
                value={searchQuery}
                onChangeText={setSearchQuery}
              />
            </View>

            <View className="flex-row items-center mb-2">
              <Filter size={16} color="#666" />
              <Text className="ml-1 text-gray-600">Filter by restaurant:</Text>
            </View>

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              className="mb-2"
            >
              {restaurants.map((restaurant) => (
                <TouchableOpacity
                  key={restaurant}
                  className={`px-4 py-2 mr-2 rounded-full ${selectedRestaurant === restaurant ? "bg-blue-500" : "bg-white border border-gray-300"}`}
                  onPress={() => setSelectedRestaurant(restaurant)}
                >
                  <Text
                    className={`${selectedRestaurant === restaurant ? "text-white" : "text-gray-700"}`}
                  >
                    {restaurant}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          <FlatList
            data={filteredDevices}
            renderItem={renderDeviceItem}
            keyExtractor={(item) => item.id}
            showsVerticalScrollIndicator={false}
            ListEmptyComponent={
              <View className="items-center justify-center py-10">
                <Text className="text-gray-500">No devices found</Text>
              </View>
            }
          />
        </>
      ) : (
        // Device Detail View
        <ScrollView className="flex-1">
          <View className="flex-row justify-between items-center mb-4">
            <TouchableOpacity
              onPress={() => setSelectedDevice(null)}
              className="flex-row items-center"
            >
              <Text className="text-blue-500 mr-2">Back</Text>
            </TouchableOpacity>
            <TouchableOpacity className="p-2">
              <Settings size={20} color="#666" />
            </TouchableOpacity>
          </View>

          <View className="bg-white rounded-lg p-4 mb-4 shadow-sm border border-gray-200">
            <View className="items-center mb-4">
              {selectedDevice.image ? (
                <Image
                  source={{ uri: selectedDevice.image }}
                  className="w-32 h-32 rounded-lg mb-3"
                  contentFit="cover"
                />
              ) : (
                <View className="w-32 h-32 rounded-lg mb-3 bg-gray-200 items-center justify-center">
                  <Smartphone size={40} color="#666" />
                </View>
              )}
              <Text className="font-bold text-xl">{selectedDevice.name}</Text>
              <View
                className={`${getStatusColor(selectedDevice.status)} px-3 py-1 rounded-full mt-2`}
              >
                <Text className="text-white text-sm capitalize">
                  {selectedDevice.status}
                </Text>
              </View>
            </View>

            <View className="border-t border-gray-200 pt-3">
              <View className="flex-row justify-between mb-2">
                <Text className="text-gray-500">Serial Number:</Text>
                <Text className="font-medium">
                  {selectedDevice.serialNumber}
                </Text>
              </View>
              <View className="flex-row justify-between mb-2">
                <Text className="text-gray-500">Restaurant:</Text>
                <Text className="font-medium">{selectedDevice.restaurant}</Text>
              </View>
              <View className="flex-row justify-between mb-2">
                <Text className="text-gray-500">Last Maintenance:</Text>
                <Text className="font-medium">
                  {selectedDevice.lastMaintenance}
                </Text>
              </View>
            </View>
          </View>

          <View className="mb-4">
            <Text className="text-lg font-bold mb-2">Maintenance History</Text>
            {maintenanceHistory.map((record) => (
              <View
                key={record.id}
                className="bg-white rounded-lg p-4 mb-3 shadow-sm border border-gray-200"
              >
                <View className="flex-row justify-between items-start">
                  <Text className="font-medium">{record.date}</Text>
                  <View
                    className={`px-2 py-1 rounded-full ${record.resolved ? "bg-green-500" : "bg-yellow-500"}`}
                  >
                    <Text className="text-white text-xs">
                      {record.resolved ? "Resolved" : "In Progress"}
                    </Text>
                  </View>
                </View>
                <Text className="text-gray-600 mt-1">
                  Technician: {record.technician}
                </Text>
                <Text className="mt-2">{record.description}</Text>
              </View>
            ))}
          </View>

          <View className="flex-row justify-between mb-10">
            <TouchableOpacity
              className="bg-blue-500 py-3 px-4 rounded-lg flex-1 mr-2"
              onPress={() => {
                // Call the onScheduleMaintenance prop with the selected device
                if (onScheduleMaintenance) {
                  onScheduleMaintenance(selectedDevice);
                }
              }}
            >
              <Text className="text-white text-center font-medium">
                Schedule Maintenance
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              className="bg-gray-200 py-3 px-4 rounded-lg flex-1 ml-2"
              onPress={() => {
                // Call the onUpdateStatus prop with the selected device
                if (onUpdateStatus) {
                  onUpdateStatus(selectedDevice);
                }
              }}
            >
              <Text className="text-gray-700 text-center font-medium">
                Update Status
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      )}
    </View>
  );
};

export default DeviceInventory;
