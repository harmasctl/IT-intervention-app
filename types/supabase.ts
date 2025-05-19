export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string
          email: string
          name: string
          role: 'technician' | 'software_tech' | 'admin' | 'manager' | 'restaurant_staff' | 'warehouse'
          avatar_url: string | null
          created_at: string
        }
        Insert: {
          id: string
          email: string
          name: string
          role: 'technician' | 'software_tech' | 'admin' | 'manager' | 'restaurant_staff' | 'warehouse'
          avatar_url?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          email?: string
          name?: string
          role?: 'technician' | 'software_tech' | 'admin' | 'manager' | 'restaurant_staff' | 'warehouse'
          avatar_url?: string | null
          created_at?: string
        }
      }
      restaurants: {
        Row: {
          id: string
          name: string
          created_at: string
          updated_at: string | null
        }
        Insert: {
          id?: string
          name: string
          created_at?: string
          updated_at?: string | null
        }
        Update: {
          id?: string
          name?: string
          created_at?: string
          updated_at?: string | null
        }
      }
      devices: {
        Row: {
          id: string
          name: string
          serial_number: string
          restaurant_id: string
          status: 'operational' | 'maintenance' | 'offline'
          last_maintenance: string | null
          image: string | null
          type: string
          created_at: string
          category_id: string | null
        }
        Insert: {
          id?: string
          name: string
          serial_number: string
          restaurant_id: string
          status?: 'operational' | 'maintenance' | 'offline'
          last_maintenance?: string | null
          image?: string | null
          type: string
          created_at?: string
          category_id?: string | null
        }
        Update: {
          id?: string
          name?: string
          serial_number?: string
          restaurant_id?: string
          status?: 'operational' | 'maintenance' | 'offline'
          last_maintenance?: string | null
          image?: string | null
          type?: string
          created_at?: string
          category_id?: string | null
        }
      }
      device_categories: {
        Row: {
          id: string
          name: string
          description: string | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          name: string
          description?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          name?: string
          description?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
      }
      tickets: {
        Row: {
          id: string
          title: string
          priority: 'low' | 'medium' | 'high'
          restaurant_id: string
          device_id: string
          assigned_to: string | null
          status: 'new' | 'assigned' | 'in-progress' | 'resolved'
          diagnostic_info: string
          photos: string[] | null
          created_at: string
          resolution: string | null
          assignee_id: string | null
          assignee_name: string | null
          assigned_at: string | null
          resolved_at: string | null
          first_response_at: string | null
          sla_due_at: string | null
          created_by: string | null
        }
        Insert: {
          id?: string
          title: string
          priority: 'low' | 'medium' | 'high'
          restaurant_id: string
          device_id: string
          assigned_to?: string | null
          status?: 'new' | 'assigned' | 'in-progress' | 'resolved'
          diagnostic_info: string
          photos?: string[] | null
          created_at?: string
          resolution?: string | null
          assignee_id?: string | null
          assignee_name?: string | null
          assigned_at?: string | null
          resolved_at?: string | null
          first_response_at?: string | null
          sla_due_at?: string | null
          created_by?: string | null
        }
        Update: {
          id?: string
          title?: string
          priority?: 'low' | 'medium' | 'high'
          restaurant_id?: string
          device_id?: string
          assigned_to?: string | null
          status?: 'new' | 'assigned' | 'in-progress' | 'resolved'
          diagnostic_info?: string
          photos?: string[] | null
          created_at?: string
          resolution?: string | null
          assignee_id?: string | null
          assignee_name?: string | null
          assigned_at?: string | null
          resolved_at?: string | null
          first_response_at?: string | null
          sla_due_at?: string | null
          created_by?: string | null
        }
      }
      equipment_inventory: {
        Row: {
          id: string
          name: string
          type: string
          stock_level: number
          supplier: string | null
          warehouse_location: string | null
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          type: string
          stock_level?: number
          supplier?: string | null
          warehouse_location?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          type?: string
          stock_level?: number
          supplier?: string | null
          warehouse_location?: string | null
          created_at?: string
        }
      }
      maintenance_records: {
        Row: {
          id: string
          device_id: string
          date: string
          technician_id: string
          description: string
          resolved: boolean
          created_at: string
        }
        Insert: {
          id?: string
          device_id: string
          date: string
          technician_id: string
          description: string
          resolved?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          device_id?: string
          date?: string
          technician_id?: string
          description?: string
          resolved?: boolean
          created_at?: string
        }
      }
      schedules: {
        Row: {
          id: string
          ticket_id: string
          technician_id: string
          scheduled_date: string
          status: 'scheduled' | 'completed' | 'cancelled'
          notes: string | null
          created_at: string
        }
        Insert: {
          id?: string
          ticket_id: string
          technician_id: string
          scheduled_date: string
          status?: 'scheduled' | 'completed' | 'cancelled'
          notes?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          ticket_id?: string
          technician_id?: string
          scheduled_date?: string
          status?: 'scheduled' | 'completed' | 'cancelled'
          notes?: string | null
          created_at?: string
        }
      }
      intervention_history: {
        Row: {
          id: string
          ticket_id: string
          date: string
          technician_id: string
          actions: string
          status: 'completed' | 'pending' | 'failed'
          notes: string | null
          created_at: string
        }
        Insert: {
          id?: string
          ticket_id: string
          date: string
          technician_id: string
          actions: string
          status: 'completed' | 'pending' | 'failed'
          notes?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          ticket_id?: string
          date?: string
          technician_id?: string
          actions?: string
          status?: 'completed' | 'pending' | 'failed'
          notes?: string | null
          created_at?: string
        }
      }
      ticket_comments: {
        Row: {
          id: string
          ticket_id: string
          user_id: string
          comment: string
          created_at: string | null
        }
        Insert: {
          id?: string
          ticket_id: string
          user_id: string
          comment: string
          created_at?: string | null
        }
        Update: {
          id?: string
          ticket_id?: string
          user_id?: string
          comment?: string
          created_at?: string | null
        }
      }
      notifications: {
        Row: {
          id: string
          user_id: string
          title: string
          message: string
          type: 'info' | 'success' | 'warning' | 'error' | 'low_stock'
          is_read: boolean | null
          related_id: string | null
          related_type: string | null
          created_at: string | null
        }
        Insert: {
          id?: string
          user_id: string
          title: string
          message: string
          type: 'info' | 'success' | 'warning' | 'error' | 'low_stock'
          is_read?: boolean | null
          related_id?: string | null
          related_type?: string | null
          created_at?: string | null
        }
        Update: {
          id?: string
          user_id?: string
          title?: string
          message?: string
          type?: 'info' | 'success' | 'warning' | 'error' | 'low_stock'
          is_read?: boolean | null
          related_id?: string | null
          related_type?: string | null
          created_at?: string | null
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
  }
} 