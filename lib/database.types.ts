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
      equipment: {
        Row: {
          id: string;
          name: string;
          type: string;
          stock_level: number;
          supplier: string | null;
          warehouse_location: string | null;
          notes: string | null;
          image_url: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          type: string;
          stock_level: number;
          supplier?: string | null;
          warehouse_location?: string | null;
          notes?: string | null;
          image_url?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          type?: string;
          stock_level?: number;
          supplier?: string | null;
          warehouse_location?: string | null;
          notes?: string | null;
          image_url?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      equipment_movements: {
        Row: {
          id: string;
          equipment_id: string;
          movement_type: string;
          quantity: number;
          reason: string;
          destination: string | null;
          notes: string | null;
          previous_stock: number;
          new_stock: number;
          timestamp: string;
          created_by: string | null;
        };
        Insert: {
          id?: string;
          equipment_id: string;
          movement_type: string;
          quantity: number;
          reason: string;
          destination?: string | null;
          notes?: string | null;
          previous_stock: number;
          new_stock: number;
          timestamp?: string;
          created_by?: string | null;
        };
        Update: {
          id?: string;
          equipment_id?: string;
          movement_type?: string;
          quantity?: number;
          reason?: string;
          destination?: string | null;
          notes?: string | null;
          previous_stock?: number;
          new_stock?: number;
          timestamp?: string;
          created_by?: string | null;
        };
      };
      suppliers: {
        Row: {
          id: string;
          name: string;
          contact_person: string | null;
          email: string | null;
          phone: string | null;
          address: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          contact_person?: string | null;
          email?: string | null;
          phone?: string | null;
          address?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          contact_person?: string | null;
          email?: string | null;
          phone?: string | null;
          address?: string | null;
          created_at?: string;
          updated_at?: string;
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
      record_equipment_movement: {
        Args: {
          p_equipment_id: string;
          p_movement_type: string;
          p_quantity: number;
          p_reason: string;
          p_destination: string | null;
          p_notes: string | null;
          p_previous_stock: number;
          p_new_stock: number;
        };
        Returns: Json;
      };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
}
