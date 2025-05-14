import React from "react";
import { View, Text, TouchableOpacity, Image } from "react-native";
import { ChevronRight, BookOpen } from "lucide-react-native";

interface Article {
  id: string;
  title: string;
  summary: string;
  tags: string[];
  author: string;
  created_at: string;
  image_url?: string;
}

interface KnowledgeArticleCardProps {
  article: Article;
  onPress: (id: string) => void;
}

const KnowledgeArticleCard = ({
  article,
  onPress,
}: KnowledgeArticleCardProps) => {
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  return (
    <TouchableOpacity
      className="bg-white rounded-xl p-4 mb-4 shadow-md border border-gray-100"
      onPress={() => onPress(article.id)}
      activeOpacity={0.7}
      style={{ elevation: 2 }}
    >
      <View className="flex-row">
        {article.image_url ? (
          <Image
            source={{ uri: article.image_url }}
            style={{ width: 90, height: 90 }}
            className="rounded-xl mr-4"
          />
        ) : (
          <View className="w-[90px] h-[90px] bg-blue-100 rounded-xl mr-4 items-center justify-center">
            <BookOpen size={32} color="#1e40af" />
          </View>
        )}
        <View className="flex-1">
          <Text className="font-bold text-lg text-gray-800 mb-1">
            {article.title}
          </Text>
          <Text className="text-gray-600 mb-2" numberOfLines={2}>
            {article.summary}
          </Text>
          <View className="flex-row flex-wrap mb-2">
            {article.tags.map((tag) => (
              <View
                key={tag}
                className="bg-blue-100 rounded-full px-3 py-1 mr-1.5 mb-1.5"
              >
                <Text className="text-blue-800 text-xs font-medium">{tag}</Text>
              </View>
            ))}
          </View>
          <View className="flex-row justify-between items-center mt-1">
            <Text className="text-gray-500 text-xs">
              By {article.author} • {formatDate(article.created_at)}
            </Text>
            <View className="bg-gray-100 rounded-full p-1">
              <ChevronRight size={16} color="#4b5563" />
            </View>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
};

export default KnowledgeArticleCard;
