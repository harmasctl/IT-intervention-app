import { supabase } from './supabase';
import { startOfMonth, endOfMonth, startOfYear, endOfYear, format, parseISO, subMonths } from 'date-fns';

interface DeviceWithCategory {
  id: string;
  name: string;
  type: string;
  restaurant_id: string;
  category_id: string;
  category: {
    name: string;
  };
}

interface MaintenanceRecordWithDevice {
  id: string;
  cost: number | null;
  device_id: string;
  date: string;
  status: string | null;
  devices: DeviceWithCategory | null;
}

/**
 * Get maintenance cost summary for a specific time period
 * @param startDate Start date for the period
 * @param endDate End date for the period
 * @param restaurantId Optional restaurant ID to filter by
 * @returns Summary of maintenance costs
 */
export async function getMaintenanceCostSummary(
  startDate: Date, 
  endDate: Date,
  restaurantId?: string
) {
  try {
    const query = supabase
      .from('maintenance_records')
      .select(`
        id,
        cost,
        device_id,
        date,
        status,
        devices:device_id(
          id,
          name,
          type,
          restaurant_id,
          category_id,
          category:device_categories(name)
        )
      `)
      .gte('date', startDate.toISOString())
      .lte('date', endDate.toISOString());
    
    // Add restaurant filter if provided
    if (restaurantId) {
      query.eq('devices.restaurant_id', restaurantId);
    }
    
    const { data, error } = await query;

    if (error) {
      console.error('Error fetching maintenance cost summary:', error);
      return {
        totalCost: 0,
        recordCount: 0,
        avgCost: 0,
        completedCount: 0,
        categories: [],
        devices: []
      };
    }

    // Use any[] to avoid type errors, but still provide type safety through our code
    const records = data as any[] || [];

    // Calculate summary statistics
    const validCostRecords = records.filter(record => record.cost !== null && record.cost !== undefined);
    const costs = validCostRecords.map(record => record.cost || 0);
    const totalCost = costs.reduce((sum, cost) => sum + cost, 0);
    const avgCost = costs.length > 0 ? totalCost / costs.length : 0;
    const completedCount = records.filter(record => 
      record.status === 'completed' || record.status === null
    ).length || 0;

    // Group by category
    const categoryMap = new Map();
    validCostRecords.forEach(record => {
      if (!record.devices) return;
      const categoryName = record.devices.category?.name || 'Uncategorized';
      const categoryCost = record.cost || 0;
      
      if (categoryMap.has(categoryName)) {
        categoryMap.set(categoryName, {
          cost: categoryMap.get(categoryName).cost + categoryCost,
          count: categoryMap.get(categoryName).count + 1
        });
      } else {
        categoryMap.set(categoryName, { cost: categoryCost, count: 1 });
      }
    });

    const categories = Array.from(categoryMap.entries()).map(([name, data]) => ({
      name,
      cost: data.cost,
      count: data.count,
      avgCost: data.cost / data.count
    }));

    // Group by device
    const deviceMap = new Map();
    validCostRecords.forEach(record => {
      if (!record.devices) return;
      
      const deviceId = record.devices.id;
      const deviceName = record.devices.name;
      const deviceCost = record.cost || 0;
      
      if (deviceMap.has(deviceId)) {
        deviceMap.set(deviceId, {
          ...deviceMap.get(deviceId),
          cost: deviceMap.get(deviceId).cost + deviceCost,
          count: deviceMap.get(deviceId).count + 1
        });
      } else {
        deviceMap.set(deviceId, { 
          id: deviceId,
          name: deviceName, 
          type: record.devices.type,
          cost: deviceCost, 
          count: 1 
        });
      }
    });

    const devices = Array.from(deviceMap.values()).map(device => ({
      ...device,
      avgCost: device.cost / device.count
    }));

    return {
      totalCost,
      recordCount: records.length,
      avgCost,
      completedCount,
      categories,
      devices
    };
  } catch (error) {
    console.error('Exception in getMaintenanceCostSummary:', error);
    return {
      totalCost: 0,
      recordCount: 0,
      avgCost: 0,
      completedCount: 0,
      categories: [],
      devices: []
    };
  }
}

/**
 * Get monthly maintenance cost reports for the last n months
 * @param months Number of months to include
 * @param restaurantId Optional restaurant ID to filter by
 * @returns Array of monthly cost reports
 */
export async function getMonthlyMaintenanceCosts(months: number = 6, restaurantId?: string) {
  const reports = [];
  const currentDate = new Date();
  
  try {
    for (let i = 0; i < months; i++) {
      const targetMonth = subMonths(currentDate, i);
      const startDate = startOfMonth(targetMonth);
      const endDate = endOfMonth(targetMonth);
      
      const report = await getMaintenanceCostSummary(startDate, endDate, restaurantId);
      
      reports.push({
        month: format(targetMonth, 'MMM yyyy'),
        ...report
      });
    }
    
    return reports.reverse(); // Return in chronological order
  } catch (error) {
    console.error('Exception in getMonthlyMaintenanceCosts:', error);
    return [];
  }
}

/**
 * Get maintenance cost breakdown by device category
 * @param startDate Start date for the period
 * @param endDate End date for the period
 * @param restaurantId Optional restaurant ID to filter by
 * @returns Cost breakdown by category
 */
export async function getCategoryMaintenanceCosts(
  startDate: Date,
  endDate: Date,
  restaurantId?: string
) {
  try {
    const { totalCost, categories } = await getMaintenanceCostSummary(
      startDate,
      endDate,
      restaurantId
    );
    
    // Calculate percentage of total for each category
    const categoriesWithPercentage = categories.map(category => ({
      ...category,
      percentage: totalCost > 0 ? (category.cost / totalCost) * 100 : 0
    }));
    
    return {
      totalCost,
      categories: categoriesWithPercentage.sort((a, b) => b.cost - a.cost)
    };
  } catch (error) {
    console.error('Exception in getCategoryMaintenanceCosts:', error);
    return {
      totalCost: 0,
      categories: []
    };
  }
}

/**
 * Find the most expensive devices to maintain
 * @param startDate Start date for the period
 * @param endDate End date for the period
 * @param limit Maximum number of devices to return
 * @param restaurantId Optional restaurant ID to filter by
 * @returns List of most expensive devices
 */
export async function getMostExpensiveDevices(
  startDate: Date,
  endDate: Date,
  limit: number = 5,
  restaurantId?: string
) {
  try {
    const { devices } = await getMaintenanceCostSummary(
      startDate,
      endDate,
      restaurantId
    );
    
    // Sort by total cost and limit results
    return devices
      .sort((a, b) => b.cost - a.cost)
      .slice(0, limit);
  } catch (error) {
    console.error('Exception in getMostExpensiveDevices:', error);
    return [];
  }
} 