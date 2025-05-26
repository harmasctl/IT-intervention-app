import { supabase } from './supabase';
import { addDays, format, isAfter, isBefore, parseISO } from 'date-fns';

export interface Device {
  id: string;
  name: string;
  serial_number: string;
  type: string;
  status: string;
  last_maintenance?: string;
  next_maintenance_date?: string;
  category_id?: string;
  category?: {
    maintenance_interval?: number;
  };
}

export interface MaintenanceRecord {
  id: string;
  device_id: string;
  date: string;
  technician_id: string;
  description: string;
  resolved: boolean;
  status?: string;
  cost?: number;
  maintenance_duration_minutes?: number;
  parts_replaced?: any[];
  created_at: string;
}

/**
 * Get all devices that need maintenance soon (within the specified days)
 * @param days Number of days to look ahead
 * @returns Array of devices needing maintenance
 */
export async function getDevicesNeedingMaintenance(days: number = 7) {
  const targetDate = addDays(new Date(), days);
  
  try {
    const { data, error } = await supabase
      .from('devices')
      .select(`
        id,
        name,
        serial_number,
        type,
        status,
        last_maintenance,
        next_maintenance_date,
        category_id,
        category:device_categories(maintenance_interval),
        restaurant:restaurants(name, location)
      `)
      .lt('next_maintenance_date', targetDate.toISOString())
      .order('next_maintenance_date');

    if (error) {
      console.error('Error fetching devices needing maintenance:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('Exception in getDevicesNeedingMaintenance:', error);
    return [];
  }
}

/**
 * Calculate the next maintenance date for a device
 * @param device The device to calculate for
 * @param fromDate The date to calculate from (defaults to current date or last maintenance)
 * @returns The calculated next maintenance date or null if not applicable
 */
export function calculateNextMaintenanceDate(device: Device, fromDate?: Date): Date | null {
  if (!device.category?.maintenance_interval) {
    return null;
  }

  const interval = device.category.maintenance_interval;
  const baseDate = fromDate || 
                  (device.last_maintenance ? parseISO(device.last_maintenance) : new Date());
  
  return addDays(baseDate, interval);
}

/**
 * Check if a device is due for maintenance
 * @param device The device to check
 * @returns Boolean indicating if maintenance is due
 */
export function isMaintenanceDue(device: Device): boolean {
  if (!device.next_maintenance_date) {
    return false;
  }

  const nextDate = parseISO(device.next_maintenance_date);
  return isBefore(nextDate, new Date());
}

/**
 * Create a maintenance record for a device
 * @param deviceId The ID of the device
 * @param technicianId The ID of the technician
 * @param description Description of the maintenance
 * @param status Status of the maintenance
 * @param date Date of the maintenance (defaults to current date)
 * @returns The created maintenance record or null if failed
 */
export async function scheduleMaintenance(
  deviceId: string, 
  technicianId: string, 
  description: string,
  status: string = 'pending',
  date: Date = new Date()
): Promise<MaintenanceRecord | null> {
  try {
    const { data, error } = await supabase
      .from('maintenance_records')
      .insert({
        device_id: deviceId,
        technician_id: technicianId,
        date: date.toISOString(),
        description,
        resolved: status === 'completed',
        status
      })
      .select()
      .single();

    if (error) {
      console.error('Error scheduling maintenance:', error);
      return null;
    }

    return data;
  } catch (error) {
    console.error('Exception in scheduleMaintenance:', error);
    return null;
  }
}

/**
 * Get a list of upcoming scheduled maintenance records
 * @param days Number of days to look ahead
 * @returns Array of upcoming maintenance records
 */
export async function getUpcomingMaintenance(days: number = 30) {
  const currentDate = new Date();
  const futureDate = addDays(currentDate, days);
  
  try {
    const { data, error } = await supabase
      .from('maintenance_records')
      .select(`
        *,
        device:device_id(id, name, serial_number, type),
        technician:technician_id(id, name)
      `)
      .gte('date', currentDate.toISOString())
      .lt('date', futureDate.toISOString())
      .order('date');

    if (error) {
      console.error('Error fetching upcoming maintenance:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('Exception in getUpcomingMaintenance:', error);
    return [];
  }
}

/**
 * Format a maintenance record for display
 * @param record The maintenance record to format
 * @returns Formatted record object with additional display properties
 */
export function formatMaintenanceRecord(record: MaintenanceRecord & { 
  device?: { name: string; }, 
  technician?: { name: string; } 
}) {
  const statusMap: Record<string, { color: string, label: string }> = {
    'pending': { color: '#3B82F6', label: 'Pending' },
    'in_progress': { color: '#F59E0B', label: 'In Progress' },
    'completed': { color: '#10B981', label: 'Completed' },
    'cancelled': { color: '#EF4444', label: 'Cancelled' }
  };

  const status = record.status || (record.resolved ? 'completed' : 'in_progress');
  
  return {
    ...record,
    formattedDate: format(parseISO(record.date), 'MMM d, yyyy'),
    statusColor: statusMap[status]?.color || '#6B7280',
    statusLabel: statusMap[status]?.label || 'Unknown',
    deviceName: record.device?.name || 'Unknown Device',
    technicianName: record.technician?.name || 'Unknown Technician',
    formattedCost: record.cost ? `$${record.cost.toFixed(2)}` : 'N/A',
    formattedDuration: record.maintenance_duration_minutes 
      ? `${record.maintenance_duration_minutes} min` 
      : 'N/A'
  };
} 