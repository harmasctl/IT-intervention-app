import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, ActivityIndicator, StyleSheet } from 'react-native';
import { supabase } from '../lib/supabase';
import { Database } from '../types/supabase';

type Restaurant = Database['public']['Tables']['restaurants']['Row'];

export default function RestaurantList() {
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchRestaurants();
  }, []);

  const fetchRestaurants = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('restaurants')
        .select('*')
        .order('name');

      if (error) {
        throw error;
      }

      if (data) {
        setRestaurants(data);
      }
    } catch (error: any) {
      console.error('Error fetching restaurants:', error);
      setError(error.message || 'An error occurred while fetching restaurants');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.centeredContainer}>
        <ActivityIndicator size="large" color="#1e40af" />
        <Text style={styles.loadingText}>Loading restaurants...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centeredContainer}>
        <Text style={styles.errorText}>Error: {error}</Text>
      </View>
    );
  }

  if (restaurants.length === 0) {
    return (
      <View style={styles.centeredContainer}>
        <Text style={styles.emptyText}>No restaurants found</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Restaurants</Text>
      <FlatList
        data={restaurants}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View style={styles.restaurantCard}>
            <Text style={styles.restaurantName}>{item.name}</Text>
            <Text style={styles.restaurantDate}>
              Created: {new Date(item.created_at).toLocaleDateString()}
            </Text>
          </View>
        )}
        contentContainerStyle={styles.listContent}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: '#f9fafb',
  },
  centeredContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#f9fafb',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 16,
    color: '#1e40af',
  },
  listContent: {
    paddingBottom: 16,
  },
  restaurantCard: {
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  restaurantName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
  },
  restaurantDate: {
    fontSize: 14,
    color: '#6b7280',
    marginTop: 4,
  },
  loadingText: {
    marginTop: 8,
    fontSize: 16,
    color: '#6b7280',
  },
  errorText: {
    fontSize: 16,
    color: '#ef4444',
    textAlign: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: '#6b7280',
    textAlign: 'center',
  },
}); 