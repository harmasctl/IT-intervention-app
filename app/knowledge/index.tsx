import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  FlatList,
  ScrollView,
  ActivityIndicator,
  Image,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { useRouter } from "expo-router";
import {
  Search,
  Tag,
  BookOpen,
  Plus,
  ChevronRight,
  Filter,
} from "lucide-react-native";
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

export default function KnowledgeBaseScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [articles, setArticles] = useState<Article[]>([]);
  const [filteredArticles, setFilteredArticles] = useState<Article[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [allTags, setAllTags] = useState<string[]>([]);

  useEffect(() => {
    fetchArticles();
  }, []);

  const fetchArticles = async () => {
    try {
      setLoading(true);

      // Fetch real articles from Supabase
      const { data, error } = await supabase.from("knowledge_articles").select(`
          *,
          users:author(name)
        `);

      if (error) throw error;

      if (data && data.length > 0) {
        // Transform data to match the expected format
        const formattedArticles = data.map((article) => ({
          id: article.id,
          title: article.title,
          summary: article.summary,
          content: article.content,
          tags: article.tags || [],
          author: article.users?.name || "Unknown Author",
          created_at: article.created_at,
          image_url: article.image_url,
        }));

        setArticles(formattedArticles);
        setFilteredArticles(formattedArticles);

        // Extract all unique tags
        const tags = Array.from(
          new Set(formattedArticles.flatMap((article) => article.tags || [])),
        );
        setAllTags(tags);
      } else {
        // If no articles found, set empty arrays
        setArticles([]);
        setFilteredArticles([]);
        setAllTags([]);
      }
    } catch (error) {
      console.error("Error fetching articles:", error);
      setArticles([]);
      setFilteredArticles([]);
      setAllTags([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Filter articles based on search query and selected tags
    let filtered = [...articles];

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (article) =>
          article.title.toLowerCase().includes(query) ||
          article.summary.toLowerCase().includes(query) ||
          article.content.toLowerCase().includes(query),
      );
    }

    if (selectedTags.length > 0) {
      filtered = filtered.filter((article) =>
        selectedTags.some((tag) => article.tags.includes(tag)),
      );
    }

    setFilteredArticles(filtered);
  }, [searchQuery, selectedTags, articles]);

  const toggleTag = (tag: string) => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag],
    );
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const handleCreateArticle = () => {
    // Navigate to create article screen
    console.log("Create new article");
    // In a real app: router.push("/knowledge/create");
  };

  const handleArticlePress = (articleId: string) => {
    // Navigate to article detail
    router.push(`/knowledge/article?id=${articleId}`);
  };

  const renderArticleItem = ({ item }: { item: Article }) => (
    <TouchableOpacity
      className="bg-white rounded-lg p-4 mb-3 shadow-sm border border-gray-100"
      onPress={() => handleArticlePress(item.id)}
    >
      <View className="flex-row">
        {item.image_url && (
          <Image
            source={{ uri: item.image_url }}
            style={{ width: 80, height: 80 }}
            className="rounded-lg mr-3"
          />
        )}
        <View className="flex-1">
          <Text className="font-bold text-lg text-gray-800 mb-1">
            {item.title}
          </Text>
          <Text className="text-gray-600 mb-2" numberOfLines={2}>
            {item.summary}
          </Text>
          <View className="flex-row flex-wrap mb-2">
            {item.tags.map((tag) => (
              <View
                key={tag}
                className="bg-blue-100 rounded-full px-2 py-1 mr-1 mb-1"
              >
                <Text className="text-blue-800 text-xs">{tag}</Text>
              </View>
            ))}
          </View>
          <View className="flex-row justify-between items-center">
            <Text className="text-gray-500 text-xs">
              By {item.author} • {formatDate(item.created_at)}
            </Text>
            <ChevronRight size={16} color="#9ca3af" />
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView className="flex-1 bg-white">
      <StatusBar style="auto" />

      {/* Header */}
      <View className="flex-row justify-between items-center px-5 py-4 bg-gradient-to-r from-purple-700 to-purple-900 shadow-lg">
        <View className="flex-row items-center">
          <BookOpen size={24} color="white" className="mr-2" />
          <Text className="text-2xl font-bold text-white">Knowledge Base</Text>
        </View>
        {user?.user_metadata?.role === "admin" && (
          <TouchableOpacity
            className="bg-white p-2.5 rounded-full shadow-md"
            onPress={handleCreateArticle}
          >
            <Plus size={22} color="#7e22ce" />
          </TouchableOpacity>
        )}
      </View>

      {/* Search */}
      <View className="p-4 bg-white shadow-sm">
        <View className="flex-row items-center bg-gray-100 rounded-xl px-4 py-3 mb-1">
          <Search size={20} color="#6b7280" />
          <TextInput
            className="flex-1 ml-3 py-1 text-base"
            placeholder="Search articles..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholderTextColor="#9ca3af"
          />
        </View>
      </View>

      {/* Tags filter */}
      <View className="px-4 py-3 bg-white shadow-sm mb-2">
        <View className="flex-row items-center mb-3">
          <View className="bg-purple-100 p-1.5 rounded-full mr-2">
            <Filter size={16} color="#7e22ce" />
          </View>
          <Text className="text-gray-800 font-medium">Filter by tags</Text>
        </View>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          className="pb-2"
        >
          {allTags.map((tag) => (
            <TouchableOpacity
              key={tag}
              className={`px-4 py-2 mr-3 rounded-full shadow-sm ${selectedTags.includes(tag) ? "bg-purple-600" : "bg-white"}`}
              onPress={() => toggleTag(tag)}
              style={{ elevation: selectedTags.includes(tag) ? 3 : 1 }}
            >
              <Text
                className={
                  selectedTags.includes(tag)
                    ? "text-white font-medium"
                    : "text-gray-700"
                }
              >
                {tag}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Articles list */}
      <View className="flex-1 bg-gray-50 p-4">
        {loading ? (
          <View className="flex-1 justify-center items-center">
            <ActivityIndicator size="large" color="#1e40af" />
            <Text className="mt-2 text-gray-600">Loading articles...</Text>
          </View>
        ) : filteredArticles.length > 0 ? (
          <FlatList
            data={filteredArticles}
            renderItem={renderArticleItem}
            keyExtractor={(item) => item.id}
            showsVerticalScrollIndicator={false}
          />
        ) : (
          <View className="flex-1 justify-center items-center">
            <BookOpen size={48} color="#9ca3af" />
            <Text className="mt-4 text-gray-500 text-center">
              No articles found
            </Text>
            {user?.user_metadata?.role === "admin" && (
              <TouchableOpacity
                className="mt-4 bg-blue-600 px-4 py-2 rounded-lg"
                onPress={handleCreateArticle}
              >
                <Text className="text-white font-medium">Create Article</Text>
              </TouchableOpacity>
            )}
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}
