import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  Alert,
} from "react-native";
import { supabase } from "../lib/supabase";
import { Search, BookOpen, Tag, ChevronRight } from "lucide-react-native";
import { useRouter } from "expo-router";

type KnowledgeArticle = {
  id: string;
  title: string;
  summary: string;
  content: string;
  category: string;
  tags: string[];
  created_at: string;
  updated_at: string;
  view_count: number;
};

type KnowledgeSearchProps = {
  initialCategory?: string;
  onArticlePress?: (article: KnowledgeArticle) => void;
};

export default function KnowledgeSearch({
  initialCategory,
  onArticlePress,
}: KnowledgeSearchProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [articles, setArticles] = useState<KnowledgeArticle[]>([]);
  const [filteredArticles, setFilteredArticles] = useState<KnowledgeArticle[]>(
    [],
  );
  const [loading, setLoading] = useState(true);
  const [categories, setCategories] = useState<string[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(
    initialCategory || null,
  );
  const router = useRouter();

  useEffect(() => {
    fetchArticles();
  }, []);

  useEffect(() => {
    filterArticles();
  }, [searchQuery, selectedCategory, articles]);

  const fetchArticles = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("knowledge_articles")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;

      if (data) {
        setArticles(data as KnowledgeArticle[]);

        // Extract unique categories
        const uniqueCategories = [
          ...new Set(data.map((article) => article.category)),
        ];
        setCategories(uniqueCategories);
      }
    } catch (error) {
      console.error("Error fetching knowledge articles:", error);
      Alert.alert("Error", "Failed to load knowledge articles");
    } finally {
      setLoading(false);
    }
  };

  const filterArticles = () => {
    let filtered = [...articles];

    // Filter by search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (article) =>
          article.title.toLowerCase().includes(query) ||
          article.summary.toLowerCase().includes(query) ||
          article.content.toLowerCase().includes(query) ||
          (article.tags &&
            article.tags.some((tag) => tag.toLowerCase().includes(query))),
      );
    }

    // Filter by category
    if (selectedCategory) {
      filtered = filtered.filter(
        (article) => article.category === selectedCategory,
      );
    }

    setFilteredArticles(filtered);
  };

  const handleArticleSelect = async (article: KnowledgeArticle) => {
    try {
      // Increment view count
      await supabase
        .from("knowledge_articles")
        .update({ view_count: (article.view_count || 0) + 1 })
        .eq("id", article.id);

      if (onArticlePress) {
        onArticlePress(article);
      } else {
        router.push({
          pathname: "/knowledge/article",
          params: { id: article.id },
        });
      }
    } catch (error) {
      console.error("Error updating article view count:", error);
    }
  };

  const renderArticleItem = ({ item }: { item: KnowledgeArticle }) => (
    <TouchableOpacity
      className="bg-white p-4 rounded-lg mb-3 shadow-sm border border-gray-100"
      onPress={() => handleArticleSelect(item)}
    >
      <View className="flex-row justify-between items-start">
        <View className="flex-1 pr-2">
          <Text className="font-bold text-gray-800 text-lg">{item.title}</Text>
          <Text className="text-gray-600 mt-1 text-sm" numberOfLines={2}>
            {item.summary}
          </Text>

          {item.tags && item.tags.length > 0 && (
            <View className="flex-row flex-wrap mt-2">
              {item.tags.slice(0, 3).map((tag, index) => (
                <View
                  key={index}
                  className="bg-blue-100 rounded-full px-2 py-1 mr-1 mb-1"
                >
                  <Text className="text-blue-800 text-xs">{tag}</Text>
                </View>
              ))}
              {item.tags.length > 3 && (
                <Text className="text-gray-500 text-xs self-center">
                  +{item.tags.length - 3} more
                </Text>
              )}
            </View>
          )}
        </View>
        <ChevronRight size={20} color="#9ca3af" />
      </View>

      <View className="flex-row justify-between items-center mt-3">
        <View className="flex-row items-center">
          <Tag size={14} color="#4b5563" />
          <Text className="text-gray-500 text-xs ml-1">{item.category}</Text>
        </View>
        <Text className="text-gray-500 text-xs">
          {new Date(item.updated_at || item.created_at).toLocaleDateString()}
        </Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <View className="flex-1">
      <View className="mb-4">
        <View className="flex-row items-center bg-gray-100 rounded-xl px-4 py-3">
          <Search size={20} color="#4b5563" />
          <TextInput
            className="flex-1 ml-3 py-1 text-base"
            placeholder="Search knowledge base..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholderTextColor="#9ca3af"
          />
        </View>
      </View>

      <View className="mb-4">
        <Text className="text-gray-700 mb-2 font-medium">Categories</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <TouchableOpacity
            className={`px-4 py-2 mr-2 rounded-lg ${selectedCategory === null ? "bg-blue-600" : "bg-gray-200"}`}
            onPress={() => setSelectedCategory(null)}
          >
            <Text
              className={
                selectedCategory === null ? "text-white" : "text-gray-700"
              }
            >
              All
            </Text>
          </TouchableOpacity>
          {categories.map((category) => (
            <TouchableOpacity
              key={category}
              className={`px-4 py-2 mr-2 rounded-lg ${selectedCategory === category ? "bg-blue-600" : "bg-gray-200"}`}
              onPress={() => setSelectedCategory(category)}
            >
              <Text
                className={
                  selectedCategory === category ? "text-white" : "text-gray-700"
                }
              >
                {category}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {loading ? (
        <View className="flex-1 justify-center items-center">
          <ActivityIndicator size="large" color="#1e40af" />
          <Text className="mt-2 text-gray-500">Loading articles...</Text>
        </View>
      ) : filteredArticles.length > 0 ? (
        <FlatList
          data={filteredArticles}
          renderItem={renderArticleItem}
          keyExtractor={(item) => item.id}
          showsVerticalScrollIndicator={false}
        />
      ) : (
        <View className="flex-1 justify-center items-center p-4">
          <BookOpen size={48} color="#9ca3af" />
          <Text className="mt-4 text-gray-500 text-center">
            No articles found matching your search
          </Text>
          {searchQuery || selectedCategory ? (
            <TouchableOpacity
              className="mt-4 bg-blue-600 px-4 py-2 rounded-lg"
              onPress={() => {
                setSearchQuery("");
                setSelectedCategory(null);
              }}
            >
              <Text className="text-white font-medium">Clear Filters</Text>
            </TouchableOpacity>
          ) : null}
        </View>
      )}
    </View>
  );
}
