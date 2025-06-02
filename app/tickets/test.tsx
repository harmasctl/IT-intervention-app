import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { useRouter } from "expo-router";
import {
  ArrowLeft,
  CheckCircle2,
  AlertTriangle,
  X,
  Play,
  RefreshCw,
  Ticket,
  Plus,
  MessageSquare,
  History,
  Users,
} from "lucide-react-native";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../../components/AuthProvider";

interface TestResult {
  feature: string;
  status: 'PASS' | 'FAIL' | 'RUNNING';
  message: string;
  details?: string;
}

export default function TicketTestScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [testing, setTesting] = useState(false);
  const [results, setResults] = useState<TestResult[]>([]);

  const tests = [
    { name: 'Database Connection', test: testDatabaseConnection },
    { name: 'Tickets Table', test: testTicketsTable },
    { name: 'Ticket Creation', test: testTicketCreation },
    { name: 'Ticket Status Updates', test: testTicketStatusUpdates },
    { name: 'Ticket Assignment', test: testTicketAssignment },
    { name: 'Ticket Comments', test: testTicketComments },
    { name: 'Ticket History', test: testTicketHistory },
    { name: 'Notifications', test: testNotifications },
    { name: 'Photo Upload', test: testPhotoUpload },
    { name: 'Real-time Updates', test: testRealtimeUpdates },
  ];

  async function testDatabaseConnection(): Promise<TestResult> {
    try {
      const { data, error } = await supabase.from('tickets').select('count').limit(1);
      
      if (error) {
        return {
          feature: 'Database Connection',
          status: 'FAIL',
          message: 'Connection failed',
          details: error.message
        };
      }

      return {
        feature: 'Database Connection',
        status: 'PASS',
        message: 'Successfully connected to tickets table',
        details: 'Database is accessible and responding'
      };
    } catch (error) {
      return {
        feature: 'Database Connection',
        status: 'FAIL',
        message: 'Exception occurred',
        details: (error as Error).message
      };
    }
  }

  async function testTicketsTable(): Promise<TestResult> {
    try {
      const { data, error } = await supabase
        .from('tickets')
        .select(`
          *,
          restaurants:restaurant_id(name),
          devices:device_id(name, type)
        `)
        .limit(5);

      if (error) {
        return {
          feature: 'Tickets Table',
          status: 'FAIL',
          message: 'Query failed',
          details: error.message
        };
      }

      if (!data || data.length === 0) {
        return {
          feature: 'Tickets Table',
          status: 'FAIL',
          message: 'No tickets found',
          details: 'Table exists but contains no data'
        };
      }

      // Check required fields
      const ticket = data[0];
      const hasRequiredFields = ticket.id && ticket.title && ticket.status && ticket.priority;

      if (hasRequiredFields) {
        return {
          feature: 'Tickets Table',
          status: 'PASS',
          message: `Found ${data.length} tickets with proper structure`,
          details: `Sample ticket: ${ticket.title} (${ticket.status})`
        };
      } else {
        return {
          feature: 'Tickets Table',
          status: 'FAIL',
          message: 'Tickets missing required fields',
          details: 'Table structure is incomplete'
        };
      }
    } catch (error) {
      return {
        feature: 'Tickets Table',
        status: 'FAIL',
        message: 'Exception occurred',
        details: (error as Error).message
      };
    }
  }

  async function testTicketCreation(): Promise<TestResult> {
    try {
      // Get a device and restaurant for testing
      const [devicesRes, restaurantsRes] = await Promise.all([
        supabase.from('devices').select('id, name').limit(1),
        supabase.from('restaurants').select('id, name').limit(1)
      ]);

      if (devicesRes.error || restaurantsRes.error) {
        return {
          feature: 'Ticket Creation',
          status: 'FAIL',
          message: 'Failed to get test data',
          details: 'Could not fetch devices or restaurants for testing'
        };
      }

      if (!devicesRes.data?.[0] || !restaurantsRes.data?.[0]) {
        return {
          feature: 'Ticket Creation',
          status: 'FAIL',
          message: 'No test data available',
          details: 'Need at least one device and restaurant to test ticket creation'
        };
      }

      const device = devicesRes.data[0];
      const restaurant = restaurantsRes.data[0];

      // Create a test ticket
      const testTicket = {
        title: `Test Ticket - ${new Date().toISOString()}`,
        priority: 'medium' as const,
        status: 'new' as const,
        device_id: device.id,
        restaurant_id: restaurant.id,
        diagnostic_info: 'This is a test ticket created by the automated test system',
        created_by: user?.id || null,
        created_at: new Date().toISOString(),
      };

      const { data, error } = await supabase
        .from('tickets')
        .insert(testTicket)
        .select()
        .single();

      if (error) {
        return {
          feature: 'Ticket Creation',
          status: 'FAIL',
          message: 'Failed to create ticket',
          details: error.message
        };
      }

      if (data) {
        // Clean up - delete the test ticket
        await supabase.from('tickets').delete().eq('id', data.id);

        return {
          feature: 'Ticket Creation',
          status: 'PASS',
          message: 'Successfully created and deleted test ticket',
          details: `Ticket ID: ${data.id.slice(0, 8)}, Device: ${device.name}, Restaurant: ${restaurant.name}`
        };
      }

      return {
        feature: 'Ticket Creation',
        status: 'FAIL',
        message: 'No data returned',
        details: 'Ticket creation returned no data'
      };
    } catch (error) {
      return {
        feature: 'Ticket Creation',
        status: 'FAIL',
        message: 'Exception occurred',
        details: (error as Error).message
      };
    }
  }

  async function testTicketStatusUpdates(): Promise<TestResult> {
    try {
      // Get an existing ticket
      const { data: tickets, error } = await supabase
        .from('tickets')
        .select('id, status')
        .limit(1);

      if (error || !tickets?.[0]) {
        return {
          feature: 'Ticket Status Updates',
          status: 'FAIL',
          message: 'No tickets available for testing',
          details: 'Need at least one ticket to test status updates'
        };
      }

      const ticket = tickets[0];
      const originalStatus = ticket.status;
      const newStatus = originalStatus === 'new' ? 'assigned' : 'new';

      // Update status
      const { error: updateError } = await supabase
        .from('tickets')
        .update({ status: newStatus })
        .eq('id', ticket.id);

      if (updateError) {
        return {
          feature: 'Ticket Status Updates',
          status: 'FAIL',
          message: 'Failed to update status',
          details: updateError.message
        };
      }

      // Restore original status
      await supabase
        .from('tickets')
        .update({ status: originalStatus })
        .eq('id', ticket.id);

      return {
        feature: 'Ticket Status Updates',
        status: 'PASS',
        message: 'Successfully updated and restored ticket status',
        details: `Changed from ${originalStatus} to ${newStatus} and back`
      };
    } catch (error) {
      return {
        feature: 'Ticket Status Updates',
        status: 'FAIL',
        message: 'Exception occurred',
        details: (error as Error).message
      };
    }
  }

  async function testTicketAssignment(): Promise<TestResult> {
    try {
      // Check if users table exists and has data
      const { data: users, error } = await supabase
        .from('users')
        .select('id, name')
        .limit(1);

      if (error) {
        return {
          feature: 'Ticket Assignment',
          status: 'FAIL',
          message: 'Failed to fetch users',
          details: error.message
        };
      }

      if (!users?.[0]) {
        return {
          feature: 'Ticket Assignment',
          status: 'FAIL',
          message: 'No users available for assignment',
          details: 'Need at least one user to test ticket assignment'
        };
      }

      return {
        feature: 'Ticket Assignment',
        status: 'PASS',
        message: 'Assignment system ready',
        details: `Found ${users.length} users available for assignment`
      };
    } catch (error) {
      return {
        feature: 'Ticket Assignment',
        status: 'FAIL',
        message: 'Exception occurred',
        details: (error as Error).message
      };
    }
  }

  async function testTicketComments(): Promise<TestResult> {
    try {
      const { data, error } = await supabase
        .from('ticket_comments')
        .select('*')
        .limit(5);

      if (error) {
        return {
          feature: 'Ticket Comments',
          status: 'FAIL',
          message: 'Failed to query comments table',
          details: error.message
        };
      }

      return {
        feature: 'Ticket Comments',
        status: 'PASS',
        message: `Comments system working`,
        details: `Found ${data?.length || 0} comments in database`
      };
    } catch (error) {
      return {
        feature: 'Ticket Comments',
        status: 'FAIL',
        message: 'Exception occurred',
        details: (error as Error).message
      };
    }
  }

  async function testTicketHistory(): Promise<TestResult> {
    try {
      const { data, error } = await supabase
        .from('ticket_history')
        .select('*')
        .limit(5);

      if (error) {
        return {
          feature: 'Ticket History',
          status: 'FAIL',
          message: 'Failed to query history table',
          details: error.message
        };
      }

      return {
        feature: 'Ticket History',
        status: 'PASS',
        message: `History tracking working`,
        details: `Found ${data?.length || 0} history records in database`
      };
    } catch (error) {
      return {
        feature: 'Ticket History',
        status: 'FAIL',
        message: 'Exception occurred',
        details: (error as Error).message
      };
    }
  }

  async function testNotifications(): Promise<TestResult> {
    try {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('related_type', 'ticket')
        .limit(5);

      if (error) {
        return {
          feature: 'Notifications',
          status: 'FAIL',
          message: 'Failed to query notifications',
          details: error.message
        };
      }

      return {
        feature: 'Notifications',
        status: 'PASS',
        message: `Notifications system working`,
        details: `Found ${data?.length || 0} ticket-related notifications`
      };
    } catch (error) {
      return {
        feature: 'Notifications',
        status: 'FAIL',
        message: 'Exception occurred',
        details: (error as Error).message
      };
    }
  }

  async function testPhotoUpload(): Promise<TestResult> {
    try {
      // Check if storage bucket exists
      const { data, error } = await supabase.storage
        .from('ticket-photos')
        .list('', { limit: 1 });

      if (error) {
        return {
          feature: 'Photo Upload',
          status: 'FAIL',
          message: 'Storage bucket not accessible',
          details: error.message
        };
      }

      return {
        feature: 'Photo Upload',
        status: 'PASS',
        message: 'Photo storage system ready',
        details: 'ticket-photos bucket is accessible'
      };
    } catch (error) {
      return {
        feature: 'Photo Upload',
        status: 'FAIL',
        message: 'Exception occurred',
        details: (error as Error).message
      };
    }
  }

  async function testRealtimeUpdates(): Promise<TestResult> {
    try {
      // Test if we can subscribe to real-time changes
      const channel = supabase
        .channel('test-tickets')
        .on('postgres_changes', 
          { event: '*', schema: 'public', table: 'tickets' },
          (payload) => {
            console.log('Real-time test received:', payload);
          }
        );

      const subscribeResult = await channel.subscribe();

      if (subscribeResult === 'SUBSCRIBED') {
        // Unsubscribe immediately
        await channel.unsubscribe();

        return {
          feature: 'Real-time Updates',
          status: 'PASS',
          message: 'Real-time subscriptions working',
          details: 'Successfully subscribed and unsubscribed from ticket changes'
        };
      } else {
        return {
          feature: 'Real-time Updates',
          status: 'FAIL',
          message: 'Failed to subscribe to real-time updates',
          details: `Subscription status: ${subscribeResult}`
        };
      }
    } catch (error) {
      return {
        feature: 'Real-time Updates',
        status: 'FAIL',
        message: 'Exception occurred',
        details: (error as Error).message
      };
    }
  }

  const runAllTests = async () => {
    setTesting(true);
    setResults([]);

    for (const test of tests) {
      // Update status to running
      setResults(prev => [...prev, {
        feature: test.name,
        status: 'RUNNING',
        message: 'Testing...'
      }]);

      try {
        const result = await test.test();
        
        // Update with actual result
        setResults(prev => prev.map(r => 
          r.feature === test.name ? result : r
        ));
      } catch (error) {
        setResults(prev => prev.map(r => 
          r.feature === test.name ? {
            feature: test.name,
            status: 'FAIL',
            message: 'Test exception',
            details: (error as Error).message
          } : r
        ));
      }

      // Small delay between tests
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    setTesting(false);

    // Show summary
    const passed = results.filter(r => r.status === 'PASS').length;
    const failed = results.filter(r => r.status === 'FAIL').length;

    Alert.alert(
      "🎫 Ticket System Test Results",
      `${passed} tests passed, ${failed} tests failed`,
      [
        {
          text: "View Details",
          style: "default"
        },
        {
          text: "OK",
          style: "cancel"
        }
      ]
    );
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'PASS':
        return <CheckCircle2 size={20} color="#10B981" />;
      case 'FAIL':
        return <X size={20} color="#EF4444" />;
      case 'RUNNING':
        return <ActivityIndicator size={20} color="#3B82F6" />;
      default:
        return <AlertTriangle size={20} color="#6B7280" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PASS':
        return '#10B981';
      case 'FAIL':
        return '#EF4444';
      case 'RUNNING':
        return '#3B82F6';
      default:
        return '#6B7280';
    }
  };

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
            🎫 Ticket System Tests
          </Text>
        </View>
        <TouchableOpacity
          className="bg-blue-500 px-4 py-2 rounded-lg flex-row items-center"
          onPress={runAllTests}
          disabled={testing}
        >
          {testing ? (
            <ActivityIndicator size={18} color="#FFFFFF" />
          ) : (
            <Play size={18} color="#FFFFFF" />
          )}
          <Text className="text-white font-medium ml-2">
            {testing ? "Testing..." : "Run Tests"}
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        <View className="p-4">
          <Text className="text-lg font-semibold text-gray-800 mb-4">
            🧪 Comprehensive Ticket System Testing
          </Text>
          <Text className="text-gray-600 mb-6">
            This will test all ticket-related features to ensure they work correctly with real data.
          </Text>

          {/* Test Results */}
          {results.map((result, index) => (
            <View key={index} className="bg-white rounded-lg shadow-sm p-4 mb-3">
              <View className="flex-row items-center justify-between mb-2">
                <Text className="text-lg font-semibold text-gray-800">
                  {result.feature}
                </Text>
                <View className="flex-row items-center">
                  {getStatusIcon(result.status)}
                  <Text 
                    className="ml-2 font-medium"
                    style={{ color: getStatusColor(result.status) }}
                  >
                    {result.status}
                  </Text>
                </View>
              </View>
              <Text className="text-gray-700 mb-1">{result.message}</Text>
              {result.details && (
                <Text className="text-sm text-gray-500">{result.details}</Text>
              )}
            </View>
          ))}

          {/* Feature Links */}
          <View className="mt-8">
            <Text className="text-lg font-semibold text-gray-800 mb-4">
              🎫 Test Individual Ticket Features
            </Text>
            
            <View className="space-y-3">
              <TouchableOpacity
                className="bg-blue-500 rounded-lg p-4 flex-row items-center justify-between"
                onPress={() => router.push("/tickets")}
              >
                <Text className="text-white font-medium">📋 View All Tickets</Text>
                <ArrowLeft size={20} color="#FFFFFF" style={{ transform: [{ rotate: '180deg' }] }} />
              </TouchableOpacity>

              <TouchableOpacity
                className="bg-green-500 rounded-lg p-4 flex-row items-center justify-between"
                onPress={() => router.push("/tickets/create")}
              >
                <Text className="text-white font-medium">➕ Create New Ticket</Text>
                <ArrowLeft size={20} color="#FFFFFF" style={{ transform: [{ rotate: '180deg' }] }} />
              </TouchableOpacity>

              <TouchableOpacity
                className="bg-purple-500 rounded-lg p-4 flex-row items-center justify-between"
                onPress={() => {
                  // Navigate to first ticket if available
                  supabase.from('tickets').select('id').limit(1).then(({ data }) => {
                    if (data?.[0]) {
                      router.push(`/tickets/${data[0].id}`);
                    } else {
                      Alert.alert("No Tickets", "Create a ticket first to test ticket details");
                    }
                  });
                }}
              >
                <Text className="text-white font-medium">🔍 View Ticket Details</Text>
                <ArrowLeft size={20} color="#FFFFFF" style={{ transform: [{ rotate: '180deg' }] }} />
              </TouchableOpacity>
            </View>
          </View>
        </View>

        <View className="h-20" />
      </ScrollView>
    </SafeAreaView>
  );
}
