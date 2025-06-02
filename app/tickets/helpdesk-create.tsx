import React, { useState } from "react";
import { Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { useRouter } from "expo-router";
import HelpdeskTicketForm from "../../components/HelpdeskTicketForm";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../../components/AuthProvider";

export default function HelpdeskCreateTicketScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (ticketData: any) => {
    try {
      setIsSubmitting(true);

      // Prepare the ticket data for database insertion
      const ticketPayload = {
        title: ticketData.title,
        priority: ticketData.priority,
        status: "new",
        device_id: ticketData.device?.id,
        restaurant_id: ticketData.restaurant?.id,
        created_by: user?.id,
        assigned_to: null, // Will be assigned by manager or self-assigned by technician
        
        // Enhanced helpdesk fields
        diagnostic_info: `
🎫 JIRA Ticket: ${ticketData.jiraTicketId || 'N/A'}

📞 Customer Report:
${ticketData.customerReport}

🔍 Problem Description:
${ticketData.problemDescription}

🩺 Initial Diagnosis:
${ticketData.initialDiagnosis}

🔧 Remote Steps Attempted:
${ticketData.remoteStepsAttempted}

💼 Business Impact:
${ticketData.businessImpact}

⏱️ Field Work Details:
• On-site Required: ${ticketData.requiresOnSite ? 'Yes' : 'No'}
• Estimated Duration: ${ticketData.estimatedDuration} hours
• Urgency Level: ${ticketData.urgencyLevel}
• Preferred Time: ${ticketData.preferredTimeSlot || 'Any time'}

📞 Contact Information:
• Contact Person: ${ticketData.contactPerson}
• Phone: ${ticketData.contactPhone}

🚪 Access Instructions:
${ticketData.accessInstructions}

📝 Additional Technical Details:
${ticketData.diagnosticInfo}
        `.trim(),
        
        // Additional metadata
        jira_ticket_id: ticketData.jiraTicketId,
        customer_report: ticketData.customerReport,
        problem_description: ticketData.problemDescription,
        initial_diagnosis: ticketData.initialDiagnosis,
        remote_steps_attempted: ticketData.remoteStepsAttempted,
        business_impact: ticketData.businessImpact,
        requires_onsite: ticketData.requiresOnSite,
        estimated_duration: ticketData.estimatedDuration,
        urgency_level: ticketData.urgencyLevel,
        preferred_time_slot: ticketData.preferredTimeSlot,
        contact_person: ticketData.contactPerson,
        contact_phone: ticketData.contactPhone,
        access_instructions: ticketData.accessInstructions,
        
        // Set SLA due date based on priority
        sla_due_at: calculateSLADueDate(ticketData.priority, ticketData.urgencyLevel),
        
        created_at: new Date().toISOString(),
      };

      // Insert the ticket
      const { data: ticket, error: ticketError } = await supabase
        .from("tickets")
        .insert(ticketPayload)
        .select()
        .single();

      if (ticketError) {
        console.error("Error creating ticket:", ticketError);
        Alert.alert("Error", "Failed to create ticket: " + ticketError.message);
        return;
      }

      // Upload photos if any
      if (ticketData.photos && ticketData.photos.length > 0) {
        try {
          // Create photo records in the database
          const photoPromises = ticketData.photos.map(async (photoUrl: string, index: number) => {
            return supabase
              .from("ticket_photos")
              .insert({
                ticket_id: ticket.id,
                photo_url: photoUrl,
                description: `Photo ${index + 1} - Uploaded by helpdesk`,
                uploaded_by: user?.id,
                created_at: new Date().toISOString(),
              });
          });

          await Promise.all(photoPromises);
        } catch (photoError) {
          console.error("Error saving photo records:", photoError);
          // Don't fail the ticket creation for photo errors
        }
      }

      // Create initial ticket history entry
      await supabase
        .from("ticket_history")
        .insert({
          ticket_id: ticket.id,
          status: "new",
          timestamp: new Date().toISOString(),
          notes: `Ticket created by helpdesk. ${ticketData.jiraTicketId ? `JIRA: ${ticketData.jiraTicketId}` : ''}`,
          user_id: user?.id,
        });

      // Create notification for available technicians
      const { data: technicians } = await supabase
        .from("users")
        .select("id")
        .eq("role", "technician");

      if (technicians && technicians.length > 0) {
        const notificationPromises = technicians.map((tech) =>
          supabase
            .from("notifications")
            .insert({
              user_id: tech.id,
              title: "New Field Ticket Available",
              message: `${ticketData.title} at ${ticketData.restaurant?.name} - ${ticketData.priority.toUpperCase()} priority`,
              type: "info",
              related_id: ticket.id,
              related_type: "ticket",
              created_at: new Date().toISOString(),
            })
        );

        await Promise.all(notificationPromises);
      }

      // Success feedback
      Alert.alert(
        "✅ Ticket Created Successfully!",
        `Ticket #${ticket.id.slice(0, 8)} has been created and is now available for technician assignment.`,
        [
          {
            text: "View Ticket",
            onPress: () => router.push(`/tickets/${ticket.id}`),
          },
          {
            text: "Create Another",
            onPress: () => router.push("/tickets/helpdesk-create"),
          },
          {
            text: "Back to Dashboard",
            onPress: () => router.push("/"),
            style: "cancel",
          },
        ]
      );
    } catch (error) {
      console.error("Error creating ticket:", error);
      Alert.alert("Error", "An unexpected error occurred. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const calculateSLADueDate = (priority: string, urgencyLevel: string) => {
    const now = new Date();
    let hoursToAdd = 24; // Default 24 hours

    // Adjust based on priority and urgency
    if (priority === "critical" || urgencyLevel === "critical") {
      hoursToAdd = 2; // 2 hours for critical
    } else if (priority === "high" || urgencyLevel === "high") {
      hoursToAdd = 4; // 4 hours for high
    } else if (priority === "medium" || urgencyLevel === "normal") {
      hoursToAdd = 8; // 8 hours for medium/normal
    } else {
      hoursToAdd = 24; // 24 hours for low
    }

    const dueDate = new Date(now.getTime() + hoursToAdd * 60 * 60 * 1000);
    return dueDate.toISOString();
  };

  const handleCancel = () => {
    Alert.alert(
      "Cancel Ticket Creation",
      "Are you sure you want to cancel? All entered data will be lost.",
      [
        {
          text: "Continue Editing",
          style: "cancel",
        },
        {
          text: "Yes, Cancel",
          style: "destructive",
          onPress: () => router.back(),
        },
      ]
    );
  };

  return (
    <SafeAreaView className="flex-1 bg-white">
      <StatusBar style="light" />
      <HelpdeskTicketForm
        onSubmit={handleSubmit}
        onCancel={handleCancel}
        isSubmitting={isSubmitting}
      />
    </SafeAreaView>
  );
}
