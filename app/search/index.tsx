import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  TextInput,
  ActivityIndicator,
  Alert,
  FlatList,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { useRouter } from "expo-router";
import {
  ArrowLeft,
  Search,
  Filter,
  X,
  Clock,
  Bookmark,
  Download,
  RefreshCw,
  Settings,
  ChevronDown,
  ChevronUp,
} from "lucide-react-native";
import { advancedSearchService, SearchFilter, SearchResult } from "../../lib/advanced-search";
import { dataExportService } from "../../lib/data-export";

type SearchTable = 'devices' | 'maintenance_records' | 'tickets' | 'restaurants' | 'users';

export default function AdvancedSearchScreen() {
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedTable, setSelectedTable] = useState<SearchTable>('devices');
  const [loading, setLoading] = useState(false);
  const [searchResults, setSearchResults] = useState<SearchResult | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState<SearchFilter[]>([]);
  const [searchHistory, setSearchHistory] = useState<any[]>([]);

  const tables = [
    { key: 'devices', label: 'Devices', icon: '📱' },
    { key: 'maintenance_records', label: 'Maintenance', icon: '🔧' },
    { key: 'tickets', label: 'Tickets', icon: '🎫' },
    { key: 'restaurants', label: 'Restaurants', icon: '🏢' },
    { key: 'users', label: 'Users', icon: '👥' },
  ];

  const filterOperators = [
    { key: 'eq', label: 'Equals' },
    { key: 'neq', label: 'Not Equals' },
    { key: 'like', label: 'Contains' },
    { key: 'gt', label: 'Greater Than' },
    { key: 'lt', label: 'Less Than' },
    { key: 'gte', label: 'Greater or Equal' },
    { key: 'lte', label: 'Less or Equal' },
  ];

  useEffect(() => {
    loadSearchHistory();
  }, []);

  const loadSearchHistory = () => {
    const history = advancedSearchService.getSearchHistory();
    setSearchHistory(history.slice(0, 10)); // Show last 10 searches
  };

  const performSearch = async () => {
    if (!searchTerm.trim() && filters.length === 0) {
      Alert.alert("⚠️ Search Required", "Please enter a search term or add filters");
      return;
    }

    try {
      setLoading(true);

      let searchFilters = [...filters];

      // Add text search filter if search term provided
      if (searchTerm.trim()) {
        const textFilter: SearchFilter = {
          field: getDefaultSearchField(selectedTable),
          operator: 'ilike',
          value: searchTerm.trim(),
          type: 'string'
        };
        searchFilters.push(textFilter);
      }

      const results = await advancedSearchService.search({
        table: selectedTable,
        filters: searchFilters,
        includeRelations: true,
        limit: 50,
        sortBy: 'created_at',
        sortOrder: 'desc'
      });

      setSearchResults(results);
      loadSearchHistory(); // Refresh history

      Alert.alert(
        "🔍 Search Complete", 
        `Found ${results.count} results in ${results.searchTime.toFixed(2)}ms`
      );

    } catch (error) {
      console.error("Search error:", error);
      Alert.alert("❌ Search Error", "Failed to perform search");
    } finally {
      setLoading(false);
    }
  };

  const performQuickSearch = async () => {
    if (!searchTerm.trim()) return;

    try {
      setLoading(true);
      const results = await advancedSearchService.quickSearch(selectedTable, searchTerm.trim());
      setSearchResults(results);
      
      Alert.alert(
        "⚡ Quick Search", 
        `Found ${results.count} results in ${results.searchTime.toFixed(2)}ms`
      );
    } catch (error) {
      console.error("Quick search error:", error);
      Alert.alert("❌ Search Error", "Failed to perform quick search");
    } finally {
      setLoading(false);
    }
  };

  const getDefaultSearchField = (table: SearchTable): string => {
    switch (table) {
      case 'devices':
        return 'name';
      case 'maintenance_records':
        return 'description';
      case 'tickets':
        return 'title';
      case 'restaurants':
        return 'name';
      case 'users':
        return 'name';
      default:
        return 'name';
    }
  };

  const addFilter = () => {
    const newFilter: SearchFilter = {
      field: getDefaultSearchField(selectedTable),
      operator: 'eq',
      value: '',
      type: 'string'
    };
    setFilters([...filters, newFilter]);
  };

  const updateFilter = (index: number, updates: Partial<SearchFilter>) => {
    const updatedFilters = [...filters];
    updatedFilters[index] = { ...updatedFilters[index], ...updates };
    setFilters(updatedFilters);
  };

  const removeFilter = (index: number) => {
    const updatedFilters = filters.filter((_, i) => i !== index);
    setFilters(updatedFilters);
  };

  const clearSearch = () => {
    setSearchTerm("");
    setFilters([]);
    setSearchResults(null);
  };

  const exportResults = async () => {
    if (!searchResults || searchResults.data.length === 0) {
      Alert.alert("⚠️ No Data", "No search results to export");
      return;
    }

    try {
      const result = await dataExportService.exportData({
        table: selectedTable,
        format: 'csv',
        filters: searchResults.filters,
        includeRelations: true,
        filename: `search_results_${selectedTable}_${new Date().toISOString().split('T')[0]}.csv`
      });

      if (result.success) {
        Alert.alert("📥 Export Complete", `Exported ${result.recordCount} records`);
      } else {
        Alert.alert("❌ Export Failed", result.error || "Unknown error");
      }
    } catch (error) {
      console.error("Export error:", error);
      Alert.alert("❌ Export Error", "Failed to export search results");
    }
  };

  const loadHistorySearch = (historyItem: any) => {
    setSelectedTable(historyItem.table);
    setFilters(historyItem.filters || []);
    setSearchTerm(""); // Clear search term as history contains filters
    performSearch();
  };

  const renderSearchResult = ({ item, index }: { item: any; index: number }) => (
    <TouchableOpacity
      className="bg-white rounded-lg shadow-sm p-4 mb-3 mx-4"
      onPress={() => {
        // Navigate to detail view based on table
        if (selectedTable === 'devices') {
          router.push(`/devices/${item.id}`);
        } else if (selectedTable === 'tickets') {
          router.push(`/tickets/${item.id}`);
        } else if (selectedTable === 'maintenance_records') {
          router.push(`/devices/maintenance/${item.id}`);
        }
      }}
    >
      <View className="flex-row justify-between items-start mb-2">
        <Text className="text-lg font-semibold text-gray-800 flex-1">
          {item.name || item.title || item.description || `${selectedTable} #${index + 1}`}
        </Text>
        <Text className="text-sm text-gray-500">
          {new Date(item.created_at || item.date).toLocaleDateString()}
        </Text>
      </View>

      {/* Show relevant fields based on table */}
      {selectedTable === 'devices' && (
        <View>
          <Text className="text-gray-600">Serial: {item.serial_number}</Text>
          <Text className="text-gray-600">Status: {item.status}</Text>
          {item.restaurant && (
            <Text className="text-gray-600">Location: {item.restaurant.name}</Text>
          )}
        </View>
      )}

      {selectedTable === 'maintenance_records' && (
        <View>
          <Text className="text-gray-600">Type: {item.maintenance_type}</Text>
          <Text className="text-gray-600">Status: {item.status}</Text>
          {item.device && (
            <Text className="text-gray-600">Device: {item.device.name}</Text>
          )}
        </View>
      )}

      {selectedTable === 'tickets' && (
        <View>
          <Text className="text-gray-600">Priority: {item.priority}</Text>
          <Text className="text-gray-600">Status: {item.status}</Text>
          {item.device && (
            <Text className="text-gray-600">Device: {item.device.name}</Text>
          )}
        </View>
      )}
    </TouchableOpacity>
  );

  const renderFilter = (filter: SearchFilter, index: number) => (
    <View key={index} className="bg-gray-50 rounded-lg p-3 mb-3">
      <View className="flex-row justify-between items-center mb-2">
        <Text className="font-medium text-gray-700">Filter {index + 1}</Text>
        <TouchableOpacity onPress={() => removeFilter(index)}>
          <X size={20} color="#EF4444" />
        </TouchableOpacity>
      </View>

      <View className="space-y-2">
        <TextInput
          className="bg-white border border-gray-200 rounded-lg px-3 py-2"
          placeholder="Field name"
          value={filter.field}
          onChangeText={(text) => updateFilter(index, { field: text })}
        />

        <View className="flex-row space-x-2">
          <TextInput
            className="flex-1 bg-white border border-gray-200 rounded-lg px-3 py-2"
            placeholder="Operator"
            value={filter.operator}
            onChangeText={(text) => updateFilter(index, { operator: text as any })}
          />
          <TextInput
            className="flex-1 bg-white border border-gray-200 rounded-lg px-3 py-2"
            placeholder="Value"
            value={filter.value}
            onChangeText={(text) => updateFilter(index, { value: text })}
          />
        </View>
      </View>
    </View>
  );

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      <StatusBar style="dark" />

      {/* Header */}
      <View className="flex-row justify-between items-center p-4 border-b border-gray-200 bg-white">
        <View className="flex-row items-center flex-1">
          <TouchableOpacity onPress={() => router.back()} className="mr-3">
            <ArrowLeft size={24} color="#0F172A" />
          </TouchableOpacity>
          <Text className="text-lg md:text-xl font-bold text-gray-800 flex-1" numberOfLines={1}>
            Advanced Search
          </Text>
        </View>
        <View className="flex-row">
          <TouchableOpacity
            className="bg-gray-100 p-2 rounded-lg mr-2"
            onPress={() => setShowFilters(!showFilters)}
          >
            <Filter size={20} color="#4B5563" />
          </TouchableOpacity>
          {searchResults && (
            <TouchableOpacity
              className="bg-blue-500 px-3 py-2 rounded-lg flex-row items-center"
              onPress={exportResults}
            >
              <Download size={18} color="#FFFFFF" />
              <Text className="text-white font-medium ml-2 hidden md:block">Export</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        {/* Table Selection */}
        <View className="p-4">
          <Text className="text-lg font-semibold text-gray-800 mb-3">🔍 Search In</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View className="flex-row space-x-2">
              {tables.map((table) => (
                <TouchableOpacity
                  key={table.key}
                  className={`px-4 py-2 rounded-full flex-row items-center ${
                    selectedTable === table.key ? "bg-blue-500" : "bg-gray-100"
                  }`}
                  onPress={() => setSelectedTable(table.key as SearchTable)}
                >
                  <Text className="mr-2">{table.icon}</Text>
                  <Text className={`font-medium ${
                    selectedTable === table.key ? "text-white" : "text-gray-700"
                  }`}>
                    {table.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>
        </View>

        {/* Search Input */}
        <View className="px-4 mb-4">
          <View className="flex-row items-center bg-white rounded-lg border border-gray-200 px-3 py-2">
            <Search size={20} color="#6B7280" />
            <TextInput
              className="flex-1 ml-3 text-gray-800"
              placeholder={`Search ${tables.find(t => t.key === selectedTable)?.label.toLowerCase()}...`}
              value={searchTerm}
              onChangeText={setSearchTerm}
              onSubmitEditing={performQuickSearch}
            />
            {searchTerm.length > 0 && (
              <TouchableOpacity onPress={() => setSearchTerm("")}>
                <X size={20} color="#6B7280" />
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Action Buttons */}
        <View className="flex-row px-4 mb-4 space-x-3">
          <TouchableOpacity
            className="flex-1 bg-blue-500 rounded-lg p-3 flex-row items-center justify-center"
            onPress={performSearch}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Search size={20} color="#FFFFFF" />
            )}
            <Text className="text-white font-medium ml-2">
              {loading ? "Searching..." : "Search"}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            className="flex-1 bg-green-500 rounded-lg p-3 flex-row items-center justify-center"
            onPress={performQuickSearch}
            disabled={loading || !searchTerm.trim()}
          >
            <RefreshCw size={20} color="#FFFFFF" />
            <Text className="text-white font-medium ml-2">Quick Search</Text>
          </TouchableOpacity>

          <TouchableOpacity
            className="bg-gray-500 rounded-lg p-3 flex-row items-center justify-center"
            onPress={clearSearch}
          >
            <X size={20} color="#FFFFFF" />
            <Text className="text-white font-medium ml-2">Clear</Text>
          </TouchableOpacity>
        </View>

        {/* Filters Section */}
        {showFilters && (
          <View className="bg-white rounded-lg shadow-sm p-4 mx-4 mb-4">
            <View className="flex-row justify-between items-center mb-4">
              <Text className="text-lg font-semibold text-gray-800">🔧 Advanced Filters</Text>
              <TouchableOpacity
                className="bg-blue-500 px-3 py-2 rounded-lg"
                onPress={addFilter}
              >
                <Text className="text-white font-medium">Add Filter</Text>
              </TouchableOpacity>
            </View>

            {filters.map((filter, index) => renderFilter(filter, index))}

            {filters.length === 0 && (
              <Text className="text-gray-500 text-center py-4">
                No filters added. Click "Add Filter" to create advanced search criteria.
              </Text>
            )}
          </View>
        )}

        {/* Search Results */}
        {searchResults && (
          <View className="mb-4">
            <View className="flex-row justify-between items-center px-4 mb-3">
              <Text className="text-lg font-semibold text-gray-800">
                📊 Results ({searchResults.count})
              </Text>
              <Text className="text-sm text-gray-500">
                {searchResults.searchTime.toFixed(2)}ms
              </Text>
            </View>

            {searchResults.data.length > 0 ? (
              <FlatList
                data={searchResults.data}
                renderItem={renderSearchResult}
                keyExtractor={(item, index) => item.id || index.toString()}
                scrollEnabled={false}
              />
            ) : (
              <View className="bg-white rounded-lg shadow-sm p-8 mx-4 items-center">
                <Search size={48} color="#9CA3AF" />
                <Text className="text-xl font-semibold text-gray-800 mt-4 text-center">
                  No Results Found
                </Text>
                <Text className="text-gray-600 text-center mt-2">
                  Try adjusting your search terms or filters
                </Text>
              </View>
            )}
          </View>
        )}

        {/* Search History */}
        {searchHistory.length > 0 && !searchResults && (
          <View className="bg-white rounded-lg shadow-sm p-4 mx-4 mb-4">
            <Text className="text-lg font-semibold text-gray-800 mb-4">🕒 Recent Searches</Text>
            {searchHistory.slice(0, 5).map((item, index) => (
              <TouchableOpacity
                key={index}
                className="flex-row items-center justify-between py-3 border-b border-gray-100"
                onPress={() => loadHistorySearch(item)}
              >
                <View className="flex-1">
                  <Text className="font-medium text-gray-800">{item.table}</Text>
                  <Text className="text-sm text-gray-600">
                    {item.filters?.length || 0} filters applied
                  </Text>
                </View>
                <Clock size={16} color="#6B7280" />
              </TouchableOpacity>
            ))}
          </View>
        )}

        <View className="h-20" />
      </ScrollView>
    </SafeAreaView>
  );
}
