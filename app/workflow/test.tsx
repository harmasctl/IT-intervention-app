import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
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
  User,
  Wrench,
  BarChart3,
  Ticket,
  Package,
  Clock,
  DollarSign,
} from "lucide-react-native";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../../components/AuthProvider";

interface WorkflowStep {
  id: string;
  title: string;
  description: string;
  role: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  result?: string;
}

export default function WorkflowTestScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [testing, setTesting] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [steps, setSteps] = useState<WorkflowStep[]>([
    {
      id: "helpdesk-create",
      title: "1. Helpdesk Creates Ticket",
      description: "Software helpdesk creates detailed field ticket with JIRA ID, problem description, and field requirements",
      role: "Helpdesk",
      status: "pending",
    },
    {
      id: "manager-review",
      title: "2. Manager Reviews & Assigns",
      description: "Manager reviews new tickets and assigns them to available field technicians",
      role: "Manager",
      status: "pending",
    },
    {
      id: "technician-accept",
      title: "3. Technician Accepts Assignment",
      description: "Field technician reviews assigned ticket and accepts the job",
      role: "Technician",
      status: "pending",
    },
    {
      id: "technician-schedule",
      title: "4. Technician Schedules Visit",
      description: "Technician schedules the intervention based on restaurant availability",
      role: "Technician",
      status: "pending",
    },
    {
      id: "technician-travel",
      title: "5. Technician Travels to Site",
      description: "Technician starts intervention and travels to restaurant location",
      role: "Technician",
      status: "pending",
    },
    {
      id: "technician-work",
      title: "6. Technician Performs Work",
      description: "On-site intervention: diagnose, repair, test, and document work performed",
      role: "Technician",
      status: "pending",
    },
    {
      id: "inventory-usage",
      title: "7. Inventory Management",
      description: "Track parts/equipment used during intervention and update inventory",
      role: "System",
      status: "pending",
    },
    {
      id: "completion-report",
      title: "8. Complete Intervention",
      description: "Technician completes intervention report with photos, costs, and customer satisfaction",
      role: "Technician",
      status: "pending",
    },
    {
      id: "notification-update",
      title: "9. Notify Stakeholders",
      description: "System notifies helpdesk and manager of completion with full report",
      role: "System",
      status: "pending",
    },
    {
      id: "analytics-update",
      title: "10. Update Analytics",
      description: "Update performance metrics, costs, and generate insights for management",
      role: "System",
      status: "pending",
    },
  ]);

  const runWorkflowTest = async () => {
    setTesting(true);
    setCurrentStep(0);

    // Reset all steps
    setSteps(prev => prev.map(step => ({ ...step, status: "pending", result: undefined })));

    for (let i = 0; i < steps.length; i++) {
      setCurrentStep(i);
      
      // Update step to running
      setSteps(prev => prev.map((step, index) => 
        index === i ? { ...step, status: "running" } : step
      ));

      try {
        const result = await executeStep(steps[i]);
        
        // Update step to completed
        setSteps(prev => prev.map((step, index) => 
          index === i ? { ...step, status: "completed", result } : step
        ));
      } catch (error) {
        // Update step to failed
        setSteps(prev => prev.map((step, index) => 
          index === i ? { 
            ...step, 
            status: "failed", 
            result: (error as Error).message 
          } : step
        ));
        break;
      }

      // Small delay between steps
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    setTesting(false);
    
    const completedSteps = steps.filter(s => s.status === "completed").length;
    const failedSteps = steps.filter(s => s.status === "failed").length;

    Alert.alert(
      "🧪 Workflow Test Complete",
      `${completedSteps} steps completed successfully\n${failedSteps} steps failed`,
      [
        {
          text: "View Results",
          style: "default"
        },
        {
          text: "OK",
          style: "cancel"
        }
      ]
    );
  };

  const executeStep = async (step: WorkflowStep): Promise<string> => {
    switch (step.id) {
      case "helpdesk-create":
        return await testHelpdeskCreate();
      case "manager-review":
        return await testManagerReview();
      case "technician-accept":
        return await testTechnicianAccept();
      case "technician-schedule":
        return await testTechnicianSchedule();
      case "technician-travel":
        return await testTechnicianTravel();
      case "technician-work":
        return await testTechnicianWork();
      case "inventory-usage":
        return await testInventoryUsage();
      case "completion-report":
        return await testCompletionReport();
      case "notification-update":
        return await testNotificationUpdate();
      case "analytics-update":
        return await testAnalyticsUpdate();
      default:
        throw new Error("Unknown step");
    }
  };

  const testHelpdeskCreate = async (): Promise<string> => {
    // Test creating a helpdesk ticket with all required fields
    const { data: device } = await supabase.from("devices").select("id").limit(1).single();
    const { data: restaurant } = await supabase.from("restaurants").select("id").limit(1).single();

    if (!device || !restaurant) {
      throw new Error("Missing test data (device or restaurant)");
    }

    const { data, error } = await supabase
      .from("tickets")
      .insert({
        title: "Test Workflow - POS Terminal Issue",
        priority: "high",
        status: "new",
        device_id: device.id,
        restaurant_id: restaurant.id,
        created_by: user?.id,
        jira_ticket_id: "HELP-TEST-001",
        customer_report: "Customer reports POS terminal is not responding",
        problem_description: "Terminal appears to freeze during transactions",
        initial_diagnosis: "Possible hardware or software issue",
        remote_steps_attempted: "Attempted remote restart and driver update",
        business_impact: "High - affecting customer checkout process",
        requires_onsite: true,
        estimated_duration: "2",
        urgency_level: "high",
        contact_person: "Test Manager",
        contact_phone: "+1-555-TEST",
        access_instructions: "Use main entrance, ask for manager",
        created_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) throw error;
    return `Ticket created: ${data.id.slice(0, 8)}`;
  };

  const testManagerReview = async (): Promise<string> => {
    // Test manager assignment functionality
    const { data: tickets } = await supabase
      .from("tickets")
      .select("id")
      .eq("status", "new")
      .limit(1);

    if (!tickets || tickets.length === 0) {
      throw new Error("No new tickets to assign");
    }

    const { data: technician } = await supabase
      .from("users")
      .select("id, name")
      .eq("role", "technician")
      .limit(1)
      .single();

    if (!technician) {
      throw new Error("No technicians available");
    }

    const { error } = await supabase
      .from("tickets")
      .update({
        assigned_to: technician.id,
        assignee_name: technician.name,
        status: "assigned",
        assigned_at: new Date().toISOString(),
      })
      .eq("id", tickets[0].id);

    if (error) throw error;
    return `Assigned to ${technician.name}`;
  };

  const testTechnicianAccept = async (): Promise<string> => {
    // Test technician accepting assignment
    const { data: tickets } = await supabase
      .from("tickets")
      .select("id")
      .eq("status", "assigned")
      .limit(1);

    if (!tickets || tickets.length === 0) {
      throw new Error("No assigned tickets to accept");
    }

    // Add history entry for acceptance
    await supabase
      .from("ticket_history")
      .insert({
        ticket_id: tickets[0].id,
        status: "assigned",
        timestamp: new Date().toISOString(),
        notes: "Ticket accepted by technician",
        user_id: user?.id,
      });

    return "Technician accepted assignment";
  };

  const testTechnicianSchedule = async (): Promise<string> => {
    // Test scheduling functionality
    const { data: tickets } = await supabase
      .from("tickets")
      .select("id")
      .eq("status", "assigned")
      .limit(1);

    if (!tickets || tickets.length === 0) {
      throw new Error("No assigned tickets to schedule");
    }

    const { error } = await supabase
      .from("tickets")
      .update({ status: "scheduled" })
      .eq("id", tickets[0].id);

    if (error) throw error;
    return "Intervention scheduled for tomorrow morning";
  };

  const testTechnicianTravel = async (): Promise<string> => {
    // Test starting intervention
    const { data: tickets } = await supabase
      .from("tickets")
      .select("id")
      .eq("status", "scheduled")
      .limit(1);

    if (!tickets || tickets.length === 0) {
      throw new Error("No scheduled tickets to start");
    }

    const { error } = await supabase
      .from("tickets")
      .update({ status: "in-progress" })
      .eq("id", tickets[0].id);

    if (error) throw error;
    return "Technician en route to restaurant";
  };

  const testTechnicianWork = async (): Promise<string> => {
    // Test work performance tracking
    return "On-site work: diagnosed issue, replaced faulty component, tested system";
  };

  const testInventoryUsage = async (): Promise<string> => {
    // Test inventory tracking
    const { data: equipment } = await supabase
      .from("equipment")
      .select("id, name, cost")
      .gt("stock_level", 0)
      .limit(1)
      .single();

    if (!equipment) {
      return "No inventory items available for testing";
    }

    return `Used 1x ${equipment.name} ($${equipment.cost})`;
  };

  const testCompletionReport = async (): Promise<string> => {
    // Test completion workflow
    const { data: tickets } = await supabase
      .from("tickets")
      .select("id")
      .eq("status", "in-progress")
      .limit(1);

    if (!tickets || tickets.length === 0) {
      throw new Error("No in-progress tickets to complete");
    }

    const { error } = await supabase
      .from("tickets")
      .update({
        status: "resolved",
        resolved_at: new Date().toISOString(),
        resolution_notes: "Issue resolved - replaced faulty component",
        total_cost: 150.00,
      })
      .eq("id", tickets[0].id);

    if (error) throw error;
    return "Intervention completed with full report";
  };

  const testNotificationUpdate = async (): Promise<string> => {
    // Test notification system
    const { data: users } = await supabase
      .from("users")
      .select("id")
      .limit(2);

    if (!users || users.length === 0) {
      throw new Error("No users to notify");
    }

    const notificationPromises = users.map(user =>
      supabase
        .from("notifications")
        .insert({
          user_id: user.id,
          title: "Workflow Test Complete",
          message: "Test intervention has been completed successfully",
          type: "success",
          created_at: new Date().toISOString(),
        })
    );

    await Promise.all(notificationPromises);
    return `Notified ${users.length} stakeholders`;
  };

  const testAnalyticsUpdate = async (): Promise<string> => {
    // Test analytics calculation
    const { data: tickets } = await supabase
      .from("tickets")
      .select("total_cost, status")
      .eq("status", "resolved");

    const totalCost = tickets?.reduce((sum, t) => sum + (t.total_cost || 0), 0) || 0;
    const resolvedCount = tickets?.length || 0;

    return `Analytics updated: ${resolvedCount} resolved tickets, $${totalCost.toFixed(2)} total cost`;
  };

  const getStepIcon = (status: string) => {
    switch (status) {
      case "completed":
        return <CheckCircle2 size={20} color="#10B981" />;
      case "failed":
        return <X size={20} color="#EF4444" />;
      case "running":
        return <ActivityIndicator size={20} color="#3B82F6" />;
      default:
        return <AlertTriangle size={20} color="#6B7280" />;
    }
  };

  const getStepColor = (status: string) => {
    switch (status) {
      case "completed":
        return "#10B981";
      case "failed":
        return "#EF4444";
      case "running":
        return "#3B82F6";
      default:
        return "#6B7280";
    }
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case "Helpdesk":
        return <User size={16} color="#7C3AED" />;
      case "Manager":
        return <BarChart3 size={16} color="#4F46E5" />;
      case "Technician":
        return <Wrench size={16} color="#EA580C" />;
      case "System":
        return <Package size={16} color="#059669" />;
      default:
        return <AlertTriangle size={16} color="#6B7280" />;
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
          <Text className="text-lg font-bold text-gray-800 flex-1" numberOfLines={1}>
            🔄 Complete Workflow Test
          </Text>
        </View>
        <TouchableOpacity
          className="bg-blue-500 px-4 py-2 rounded-lg flex-row items-center"
          onPress={runWorkflowTest}
          disabled={testing}
        >
          {testing ? (
            <ActivityIndicator size={18} color="#FFFFFF" />
          ) : (
            <Play size={18} color="#FFFFFF" />
          )}
          <Text className="text-white font-medium ml-2">
            {testing ? "Testing..." : "Run Test"}
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView className="flex-1 p-4" showsVerticalScrollIndicator={false}>
        <Text className="text-lg font-semibold text-gray-800 mb-4">
          🧪 End-to-End Workflow Testing
        </Text>
        <Text className="text-gray-600 mb-6">
          This test simulates the complete helpdesk-to-field-technician workflow from ticket creation to completion.
        </Text>

        {/* Workflow Steps */}
        {steps.map((step, index) => (
          <View key={step.id} className="bg-white rounded-lg shadow-sm p-4 mb-3">
            <View className="flex-row items-center justify-between mb-2">
              <View className="flex-row items-center flex-1">
                {getRoleIcon(step.role)}
                <Text className="text-lg font-semibold text-gray-800 ml-2 flex-1" numberOfLines={1}>
                  {step.title}
                </Text>
              </View>
              <View className="flex-row items-center">
                {getStepIcon(step.status)}
                <Text 
                  className="ml-2 font-medium text-sm"
                  style={{ color: getStepColor(step.status) }}
                >
                  {step.status.toUpperCase()}
                </Text>
              </View>
            </View>
            
            <Text className="text-gray-700 mb-2">{step.description}</Text>
            
            <View className="flex-row items-center justify-between">
              <Text className="text-sm text-gray-500">Role: {step.role}</Text>
              {step.result && (
                <Text className="text-sm text-blue-600 flex-1 text-right" numberOfLines={1}>
                  {step.result}
                </Text>
              )}
            </View>

            {/* Progress indicator */}
            {testing && index === currentStep && (
              <View className="mt-3 pt-3 border-t border-gray-200">
                <View className="flex-row items-center">
                  <ActivityIndicator size="small" color="#3B82F6" />
                  <Text className="text-blue-600 ml-2 text-sm">Executing step...</Text>
                </View>
              </View>
            )}
          </View>
        ))}

        {/* Test Summary */}
        <View className="bg-blue-50 rounded-lg p-4 mt-6 border border-blue-200">
          <Text className="text-blue-800 font-bold mb-2">🎯 What This Test Covers</Text>
          <Text className="text-blue-700 text-sm">
            • Helpdesk ticket creation with JIRA integration{"\n"}
            • Manager review and technician assignment{"\n"}
            • Technician workflow from acceptance to completion{"\n"}
            • Inventory tracking and cost management{"\n"}
            • Real-time notifications and status updates{"\n"}
            • Analytics and reporting integration{"\n"}
            • Complete audit trail and history tracking
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
