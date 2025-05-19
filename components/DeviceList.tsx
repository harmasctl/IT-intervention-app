import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, ActivityIndicator, StyleSheet, Image } from 'react-native';
import { supabase } from '../lib/supabase';
import { Database } from '../types/supabase';

type Device = Database['public']['Tables']['devices']['Row'] & {
  restaurant_name?: string;
  category_name?: string;
};

export default function DeviceList() {
  const [devices, setDevices] = useState<Device[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchDevices();
  }, []);

  const fetchDevices = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('devices')
        .select(`
          *,
          restaurants:restaurant_id(name),
          device_categories:category_id(name)
        `)
        .order('name');

      if (error) {
        throw error;
      }

      if (data) {
        // Transform the data to match our expected format
        const formattedDevices = data.map(device => ({
          ...device,
          restaurant_name: device.restaurants?.name,
          category_name: device.device_categories?.name
        }));
        setDevices(formattedDevices);
      }
    } catch (error: any) {
      console.error('Error fetching devices:', error);
      setError(error.message || 'An error occurred while fetching devices');
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'operational':
        return '#22c55e'; // green
      case 'maintenance':
        return '#f59e0b'; // amber
      case 'offline':
        return '#ef4444'; // red
      default:
        return '#6b7280'; // gray
    }
  };

  if (loading) {
    return (
      <View style={styles.centeredContainer}>
        <ActivityIndicator size="large" color="#1e40af" />
        <Text style={styles.loadingText}>Loading devices...</Text>
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

  if (devices.length === 0) {
    return (
      <View style={styles.centeredContainer}>
        <Text style={styles.emptyText}>No devices found</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Devices</Text>
      <FlatList
        data={devices}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View style={styles.deviceCard}>
            <View style={styles.deviceHeader}>
              <Text style={styles.deviceName}>{item.name}</Text>
              <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) }]}>
                <Text style={styles.statusText}>{item.status}</Text>
              </View>
            </View>
            
            <View style={styles.deviceDetails}>
              <Text style={styles.deviceInfo}>Serial: {item.serial_number}</Text>
              <Text style={styles.deviceInfo}>Type: {item.type}</Text>
              {item.category_name && (
                <Text style={styles.deviceInfo}>Category: {item.category_name}</Text>
              )}
              {item.restaurant_name && (
                <Text style={styles.deviceInfo}>Location: {item.restaurant_name}</Text>
              )}
              {item.last_maintenance && (
                <Text style={styles.deviceInfo}>
                  Last Maintenance: {new Date(item.last_maintenance).toLocaleDateString()}
                </Text>
              )}
            </View>
            
            {item.image && (
              <Image 
                source={{ uri: item.image }} 
                style={styles.deviceImage} 
                resizeMode="cover"
              />
            )}
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
  deviceCard: {
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
  deviceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  deviceName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    flex: 1,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '500',
  },
  deviceDetails: {
    marginBottom: 12,
  },
  deviceInfo: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 4,
  },
  deviceImage: {
    width: '100%',
    height: 150,
    borderRadius: 4,
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