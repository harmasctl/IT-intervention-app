import React from 'react';
import { View, Text, StyleSheet, ScrollView, SafeAreaView, TouchableOpacity, Platform } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useRouter } from 'expo-router';
import { Home, User, Bell, Plus, Wrench } from 'lucide-react-native';
import { useAuth } from '../components/AuthProvider';
import RestaurantList from '../components/RestaurantList';
import DeviceList from '../components/DeviceList';
import MaintenanceNotifications from '../components/MaintenanceNotifications';
import WebMaintenanceNotifications from '../components/WebMaintenanceNotifications';

export default function DashboardScreen() {
  const { user } = useAuth();
  const router = useRouter();

  const handleCreateTicket = () => {
    router.push('/tickets/create');
  };

  const handleViewAllMaintenance = () => {
    router.push('/schedule/maintenance');
  };

  // Use the appropriate maintenance component based on platform
  const MaintenanceComponent = Platform.OS === 'web' 
    ? WebMaintenanceNotifications 
    : MaintenanceNotifications;

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerTitleContainer}>
          <Home size={24} color="#ffffff" />
          <Text style={styles.headerTitle}>Tech Support</Text>
        </View>
        <View style={styles.headerActions}>
          <TouchableOpacity 
            style={styles.iconButton}
            onPress={() => router.push('/notifications')}
          >
            <Bell size={20} color="#ffffff" />
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.iconButton}
            onPress={() => router.push('/profile')}
          >
            <User size={20} color="#ffffff" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Create Ticket Button - Added prominently at the top */}
      <TouchableOpacity
        style={styles.createTicketButton}
        onPress={handleCreateTicket}
      >
        <Plus size={24} color="#ffffff" />
        <Text style={styles.createTicketText}>
          Create New Ticket
        </Text>
      </TouchableOpacity>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.welcomeSection}>
          <Text style={styles.greeting}>
            Welcome, {user?.user_metadata?.name || 'Technician'}
          </Text>
          <Text style={styles.subtitle}>
            IT Support Dashboard
          </Text>
        </View>

        {/* Maintenance Alerts Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionTitleContainer}>
              <Wrench size={18} color="#1e40af" />
              <Text style={styles.sectionTitle}>Maintenance Alerts</Text>
            </View>
            <TouchableOpacity onPress={handleViewAllMaintenance}>
              <Text style={styles.viewAllText}>View All</Text>
            </TouchableOpacity>
          </View>
          <MaintenanceComponent 
            limit={3} 
            showHeader={false} 
            onViewAllPress={handleViewAllMaintenance} 
          />
        </View>

        <View style={styles.section}>
          <RestaurantList />
        </View>

        <View style={styles.section}>
          <DeviceList />
        </View>
      </ScrollView>
      <StatusBar style="light" />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: '#1e40af', // Deep blue
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 4,
  },
  headerTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: 'white',
    marginLeft: 8,
  },
  headerActions: {
    flexDirection: 'row',
    gap: 12,
  },
  iconButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    padding: 8,
    borderRadius: 20,
  },
  createTicketButton: {
    marginHorizontal: 16,
    marginTop: 16,
    backgroundColor: '#2563eb',
    padding: 16,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 4,
  },
  createTicketText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 18,
    marginLeft: 8,
  },
  scrollContent: {
    flexGrow: 1,
    padding: 16,
  },
  welcomeSection: {
    marginBottom: 24,
    backgroundColor: 'white',
    padding: 16,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  greeting: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#111827',
  },
  subtitle: {
    fontSize: 16,
    color: '#6b7280',
    marginTop: 4,
  },
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  sectionTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginLeft: 6,
  },
  viewAllText: {
    color: '#2563eb',
    fontWeight: '500',
  },
}); 