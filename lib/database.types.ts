export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      tickets: {
        Row: {
          id: string;
          title: string;
          priority: "low" | "medium" | "high";
          restaurant_id: string;
          device_id: string;
          assigned_to: string | null;
          status: "new" | "assigned" | "in-progress" | "resolved";
          created_at: string;
          diagnostic_info: string;
          photos: string[] | null;
        };
        Insert: {
          id?: string;
          title: string;
          priority: "low" | "medium" | "high";
          restaurant_id: string;
          device_id: string;
          assigned_to?: string | null;
          status?: "new" | "assigned" | "in-progress" | "resolved";
          created_at?: string;
          diagnostic_info: string;
          photos?: string[] | null;
        };
        Update: {
          id?: string;
          title?: string;
          priority?: "low" | "medium" | "high";
          restaurant_id?: string;
          device_id?: string;
          assigned_to?: string | null;
          status?: "new" | "assigned" | "in-progress" | "resolved";
          created_at?: string;
          diagnostic_info?: string;
          photos?: string[] | null;
        };
      };
      devices: {
        Row: {
          id: string;
          name: string;
          serial_number: string;
          restaurant_id: string;
          status: "operational" | "maintenance" | "offline";
          last_maintenance: string | null;
          image: string | null;
          created_at: string;
          type: string;
        };
        Insert: {
          id?: string;
          name: string;
          serial_number: string;
          restaurant_id: string;
          status?: "operational" | "maintenance" | "offline";
          last_maintenance?: string | null;
          image?: string | null;
          created_at?: string;
          type: string;
        };
        Update: {
          id?: string;
          name?: string;
          serial_number?: string;
          restaurant_id?: string;
          status?: "operational" | "maintenance" | "offline";
          last_maintenance?: string | null;
          image?: string | null;
          created_at?: string;
          type?: string;
        };
      };
      restaurants: {
        Row: {
          id: string;
          name: string;
          location: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          location: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          location?: string;
          created_at?: string;
        };
      };
      maintenance_records: {
        Row: {
          id: string;
          device_id: string;
          date: string;
          technician_id: string;
          description: string;
          resolved: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          device_id: string;
          date: string;
          technician_id: string;
          description: string;
          resolved?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          device_id?: string;
          date?: string;
          technician_id?: string;
          description?: string;
          resolved?: boolean;
          created_at?: string;
        };
      };
      intervention_history: {
        Row: {
          id: string;
          ticket_id: string;
          date: string;
          technician_id: string;
          actions: string;
          status: "completed" | "pending" | "failed";
          notes: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          ticket_id: string;
          date: string;
          technician_id: string;
          actions: string;
          status: "completed" | "pending" | "failed";
          notes?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          ticket_id?: string;
          date?: string;
          technician_id?: string;
          actions?: string;
          status?: "completed" | "pending" | "failed";
          notes?: string | null;
          created_at?: string;
        };
      };
      users: {
        Row: {
          id: string;
          email: string;
          name: string;
          role:
            | "technician"
            | "software_tech"
            | "admin"
            | "manager"
            | "restaurant_staff"
            | "warehouse";
          avatar_url: string | null;
          created_at: string;
        };
        Insert: {
          id: string;
          email: string;
          name: string;
          role:
            | "technician"
            | "software_tech"
            | "admin"
            | "manager"
            | "restaurant_staff"
            | "warehouse";
          avatar_url?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          email?: string;
          name?: string;
          role?:
            | "technician"
            | "software_tech"
            | "admin"
            | "manager"
            | "restaurant_staff"
            | "warehouse";
          avatar_url?: string | null;
          created_at?: string;
        };
      };
      equipment_inventory: {
        Row: {
          id: string;
          name: string;
          type: string;
          stock_level: number;
          supplier: string | null;
          warehouse_location: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          type: string;
          stock_level: number;
          supplier?: string | null;
          warehouse_location?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          type?: string;
          stock_level?: number;
          supplier?: string | null;
          warehouse_location?: string | null;
          created_at?: string;
        };
      };
      schedules: {
        Row: {
          id: string;
          ticket_id: string;
          technician_id: string;
          scheduled_date: string;
          status: "scheduled" | "completed" | "cancelled";
          notes: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          ticket_id: string;
          technician_id: string;
          scheduled_date: string;
          status?: "scheduled" | "completed" | "cancelled";
          notes?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          ticket_id?: string;
          technician_id?: string;
          scheduled_date?: string;
          status?: "scheduled" | "completed" | "cancelled";
          notes?: string | null;
          created_at?: string;
        };
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
}
