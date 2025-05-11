import React, { useState } from "react";
import { View, Text, TouchableOpacity, FlatList, Image } from "react-native";
import { useRouter } from "expo-router";
import {
  AlertCircle,
  Clock,
  CheckCircle,
  ChevronRight,
} from "lucide-react-native";

type Priority = "low" | "medium" | "high";
type Status = "new" | "in-progress" | "resolved";

interface Ticket {
  id: string;
  title: string;
  priority: Priority;
  restaurantName: string;
  deviceAffected: string;
  assignedTo: string | null;
  status: Status;
  createdAt: string;
}

interface TicketListProps {
  tickets?: Ticket[];
  onTicketPress?: (ticketId: string) => void;
}

const TicketList = ({
  tickets = [
    {
      id: "1",
      title: "Ice machine not cooling properly",
      priority: "high",
      restaurantName: "Burger Palace",
      deviceAffected: "Ice Machine XL-500",
      assignedTo: "John Doe",
      status: "new",
      createdAt: "2023-06-15T10:30:00Z",
    },
    {
      id: "2",
      title: "Fryer temperature inconsistent",
      priority: "medium",
      restaurantName: "Pizza Heaven",
      deviceAffected: "Commercial Fryer F-200",
      assignedTo: null,
      status: "new",
      createdAt: "2023-06-14T14:45:00Z",
    },
    {
      id: "3",
      title: "Dishwasher leaking water",
      priority: "medium",
      restaurantName: "Noodle House",
      deviceAffected: "Industrial Dishwasher D-1000",
      assignedTo: "Jane Smith",
      status: "in-progress",
      createdAt: "2023-06-13T09:15:00Z",
    },
    {
      id: "4",
      title: "Refrigerator not maintaining temperature",
      priority: "high",
      restaurantName: "Seafood Shack",
      deviceAffected: "Walk-in Refrigerator R-300",
      assignedTo: "Mike Johnson",
      status: "in-progress",
      createdAt: "2023-06-12T16:20:00Z",
    },
    {
      id: "5",
      title: "Oven heating element replacement",
      priority: "low",
      restaurantName: "Bakery Delight",
      deviceAffected: "Commercial Oven O-750",
      assignedTo: "Sarah Williams",
      status: "resolved",
      createdAt: "2023-06-10T11:00:00Z",
    },
  ],
  onTicketPress = () => {},
}: TicketListProps) => {
  const [activeFilter, setActiveFilter] = useState<Status | "all">("all");
  const router = useRouter();

  // In a real implementation, we would fetch from Supabase here
  // useEffect(() => {
  //   const fetchTickets = async () => {
  //     const { data, error } = await supabase
  //       .from('tickets')
  //       .select(`
  //         *,
  //         restaurants:restaurant_id(name),
  //         devices:device_id(name),
  //         users:assigned_to(name)
  //       `);
  //     if (data) {
  //       // Transform data to match the expected format
  //     }
  //   };
  //   fetchTickets();
  // }, []);

  const filteredTickets =
    activeFilter === "all"
      ? tickets
      : tickets.filter((ticket) => ticket.status === activeFilter);

  const handleTicketPress = (ticketId: string) => {
    onTicketPress(ticketId);
  };

  const getPriorityColor = (priority: Priority) => {
    switch (priority) {
      case "high":
        return "bg-red-500";
      case "medium":
        return "bg-yellow-500";
      case "low":
        return "bg-green-500";
      default:
        return "bg-gray-500";
    }
  };

  const getStatusIcon = (status: Status) => {
    switch (status) {
      case "new":
        return <AlertCircle size={16} color="#ef4444" />;
      case "in-progress":
        return <Clock size={16} color="#eab308" />;
      case "resolved":
        return <CheckCircle size={16} color="#22c55e" />;
      default:
        return null;
    }
  };

  const renderTicketItem = ({ item }: { item: Ticket }) => (
    <TouchableOpacity
      className="bg-white rounded-lg p-4 mb-3 shadow-sm border border-gray-100"
      onPress={() => handleTicketPress(item.id)}
    >
      <View className="flex-row justify-between items-start">
        <View className="flex-1">
          <View className="flex-row items-center mb-1">
            <View
              className={`w-3 h-3 rounded-full mr-2 ${getPriorityColor(item.priority)}`}
            />
            <Text className="font-bold text-lg text-gray-800">
              {item.title}
            </Text>
          </View>
          <Text className="text-gray-600 mb-1">{item.restaurantName}</Text>
          <Text className="text-gray-500 text-sm mb-2">
            {item.deviceAffected}
          </Text>

          <View className="flex-row items-center">
            {getStatusIcon(item.status)}
            <Text className="ml-1 text-xs text-gray-500 capitalize">
              {item.status}
            </Text>
          </View>
        </View>

        <View className="flex-row items-center">
          {item.assignedTo ? (
            <View className="flex-row items-center mr-2">
              <Image
                source={{
                  uri: `https://api.dicebear.com/7.x/avataaars/svg?seed=${item.assignedTo}`,
                }}
                className="w-6 h-6 rounded-full bg-gray-200"
              />
              <Text className="ml-1 text-xs text-gray-500">
                {item.assignedTo}
              </Text>
            </View>
          ) : (
            <Text className="text-xs text-gray-400 italic mr-2">
              Unassigned
            </Text>
          )}
          <ChevronRight size={16} color="#9ca3af" />
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <View className="flex-1 bg-gray-50 p-4">
      {/* Filter tabs */}
      <View className="flex-row bg-white rounded-lg mb-4 p-1 shadow-sm">
        {["all", "new", "in-progress", "resolved"].map((filter) => (
          <TouchableOpacity
            key={filter}
            className={`flex-1 py-2 px-3 rounded-md ${activeFilter === filter ? "bg-blue-100" : ""}`}
            onPress={() => setActiveFilter(filter as Status | "all")}
          >
            <Text
              className={`text-center text-sm ${activeFilter === filter ? "text-blue-600 font-medium" : "text-gray-600"}`}
            >
              {filter === "all"
                ? "All"
                : filter.charAt(0).toUpperCase() + filter.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Ticket list */}
      {filteredTickets.length > 0 ? (
        <FlatList
          data={filteredTickets}
          renderItem={renderTicketItem}
          keyExtractor={(item) => item.id}
          showsVerticalScrollIndicator={false}
          className="flex-1"
        />
      ) : (
        <View className="flex-1 justify-center items-center">
          <Text className="text-gray-500 text-center">No tickets found</Text>
        </View>
      )}
    </View>
  );
};

export default TicketList;
