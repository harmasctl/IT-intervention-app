import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Image,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { useRouter, useLocalSearchParams } from "expo-router";
import { ArrowLeft, Tag, Calendar, User, Edit } from "lucide-react-native";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../../components/AuthProvider";

type Article = {
  id: string;
  title: string;
  summary: string;
  content: string;
  tags: string[];
  author: string;
  created_at: string;
  image_url?: string;
};

export default function ArticleDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();
  const [article, setArticle] = useState<Article | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id) {
      fetchArticle(id);
    }
  }, [id]);

  const fetchArticle = async (articleId: string) => {
    try {
      setLoading(true);

      // In a real app, this would fetch from Supabase
      // For now, using mock data
      const mockArticles: Article[] = [
        {
          id: "1",
          title: "Troubleshooting Ice Machine Cooling Issues",
          summary:
            "Common problems and solutions for ice machines that aren't cooling properly.",
          content:
            "Ice machines may fail to cool properly due to several reasons including dirty condenser coils, low refrigerant levels, or faulty thermostats.\n\nCommon causes of cooling issues:\n\n1. Dirty condenser coils: Over time, dust and debris can accumulate on the condenser coils, reducing their efficiency. Regular cleaning is essential.\n\n2. Low refrigerant levels: Refrigerant leaks can prevent the machine from cooling properly. Signs include hissing sounds, oil spots, or frost buildup on the refrigeration lines.\n\n3. Faulty thermostat: If the thermostat is not reading temperatures correctly, it may not signal the cooling system to activate when needed.\n\n4. Water supply issues: Insufficient water flow can prevent proper ice formation. Check water filters, inlet valves, and supply lines for blockages.\n\n5. Ambient temperature: Ice machines operate less efficiently in hot environments. Ensure proper ventilation and keep the ambient temperature within the manufacturer's recommended range.\n\nTroubleshooting steps:\n\n1. Clean the condenser coils using a soft brush or vacuum.\n2. Check water filters and replace if necessary.\n3. Inspect refrigerant lines for signs of leaks.\n4. Test the thermostat functionality.\n5. Ensure proper airflow around the machine.\n\nIf these steps don't resolve the issue, a professional technician should inspect the refrigeration system for leaks or component failures.",
          tags: ["ice machine", "cooling", "maintenance"],
          author: "John Doe",
          created_at: "2023-05-15T10:30:00Z",
          image_url:
            "https://images.unsplash.com/photo-1585704032915-c3400ca199e7?w=400&q=80",
        },
        {
          id: "2",
          title: "POS System Error Codes Explained",
          summary:
            "A comprehensive guide to understanding and resolving common POS system error codes.",
          content:
            "This article provides detailed explanations of common error codes encountered in restaurant POS systems, along with step-by-step troubleshooting procedures for each code.\n\nError Code E001: Network Connection Failure\n- Description: The POS terminal cannot connect to the local network or server.\n- Troubleshooting: Check physical network connections, router status, and network settings. Restart the POS terminal and network equipment if necessary.\n\nError Code E002: Printer Communication Error\n- Description: The POS system cannot communicate with the receipt or kitchen printer.\n- Troubleshooting: Verify printer power and connection, check paper supply, restart the printer, and ensure correct printer drivers are installed.\n\nError Code E003: Database Synchronization Error\n- Description: The local POS database is out of sync with the central server.\n- Troubleshooting: Check network connectivity, force a manual sync operation, or contact support for database recovery options.\n\nError Code E004: Payment Processing Failure\n- Description: Credit card or payment processing is not functioning.\n- Troubleshooting: Verify payment terminal connections, check internet connectivity for payment gateways, and ensure payment services are operational.\n\nError Code E005: System Resource Error\n- Description: The POS terminal is running low on memory or processing resources.\n- Troubleshooting: Close unnecessary applications, restart the POS terminal, and check for pending software updates that might address resource management.\n\nFor persistent errors, contact technical support with the specific error code and a description of when the error occurs for faster resolution.",
          tags: ["POS", "error codes", "software"],
          author: "Jane Smith",
          created_at: "2023-06-02T14:45:00Z",
          image_url:
            "https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=400&q=80",
        },
      ];

      const foundArticle = mockArticles.find((a) => a.id === articleId);
      if (foundArticle) {
        setArticle(foundArticle);
      }
    } catch (error) {
      console.error("Error fetching article:", error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const handleEditArticle = () => {
    // Navigate to edit article screen
    console.log("Edit article:", id);
    // In a real app: router.push(`/knowledge/edit/${id}`);
  };

  const formatContent = (content: string) => {
    return content.split("\n").map((paragraph, index) => (
      <Text key={index} className="text-gray-800 mb-4">
        {paragraph}
      </Text>
    ));
  };

  return (
    <SafeAreaView className="flex-1 bg-white">
      <StatusBar style="auto" />

      {/* Header */}
      <View className="flex-row justify-between items-center px-4 py-3 border-b border-gray-200">
        <TouchableOpacity
          onPress={() => router.back()}
          className="flex-row items-center"
        >
          <ArrowLeft size={20} color="#3b82f6" />
          <Text className="text-blue-500 ml-1">Back</Text>
        </TouchableOpacity>
        <Text className="text-xl font-bold text-blue-800">Article</Text>
        {user?.user_metadata?.role === "admin" && (
          <TouchableOpacity onPress={handleEditArticle}>
            <Edit size={20} color="#3b82f6" />
          </TouchableOpacity>
        )}
      </View>

      {loading ? (
        <View className="flex-1 justify-center items-center">
          <ActivityIndicator size="large" color="#1e40af" />
          <Text className="mt-2 text-gray-600">Loading article...</Text>
        </View>
      ) : article ? (
        <ScrollView className="flex-1 p-4">
          <Text className="text-2xl font-bold text-gray-900 mb-2">
            {article.title}
          </Text>

          <View className="flex-row items-center mb-4">
            <Calendar size={16} color="#6b7280" />
            <Text className="ml-2 text-gray-600">
              {formatDate(article.created_at)}
            </Text>
          </View>

          <View className="flex-row items-center mb-4">
            <User size={16} color="#6b7280" />
            <Text className="ml-2 text-gray-600">By {article.author}</Text>
          </View>

          <View className="flex-row flex-wrap mb-6">
            <Tag size={16} color="#6b7280" className="mr-2" />
            {article.tags.map((tag) => (
              <View
                key={tag}
                className="bg-blue-100 rounded-full px-3 py-1 mr-2 mb-2"
              >
                <Text className="text-blue-800">{tag}</Text>
              </View>
            ))}
          </View>

          {article.image_url && (
            <Image
              source={{ uri: article.image_url }}
              style={{ width: "100%", height: 200 }}
              className="rounded-lg mb-6"
            />
          )}

          <Text className="text-lg font-medium text-gray-700 mb-4">
            {article.summary}
          </Text>

          <View className="mb-8">{formatContent(article.content)}</View>
        </ScrollView>
      ) : (
        <View className="flex-1 justify-center items-center p-4">
          <Text className="text-gray-500 text-center">
            Article not found or has been removed.
          </Text>
          <TouchableOpacity
            className="mt-4 bg-blue-600 px-4 py-2 rounded-lg"
            onPress={() => router.back()}
          >
            <Text className="text-white font-medium">Go Back</Text>
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
  );
}
