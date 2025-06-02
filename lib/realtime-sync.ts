// Real-Time Database Synchronization Service
import { supabase } from './supabase';
import { performanceMonitor } from './performance';

interface SyncEvent {
  table: string;
  eventType: 'INSERT' | 'UPDATE' | 'DELETE';
  new?: any;
  old?: any;
  timestamp: string;
}

interface SyncStats {
  totalEvents: number;
  lastSync: string;
  connectionStatus: 'connected' | 'disconnected' | 'reconnecting';
  syncErrors: number;
  tablesWatched: string[];
}

class RealTimeSyncService {
  private subscriptions: Map<string, any> = new Map();
  private eventListeners: Map<string, Function[]> = new Map();
  private syncStats: SyncStats = {
    totalEvents: 0,
    lastSync: new Date().toISOString(),
    connectionStatus: 'disconnected',
    syncErrors: 0,
    tablesWatched: [],
  };
  private isEnabled: boolean = true;
  private reconnectAttempts: number = 0;
  private maxReconnectAttempts: number = 5;

  constructor() {
    this.initializeRealTimeSync();
  }

  // Initialize real-time synchronization
  private async initializeRealTimeSync(): Promise<void> {
    try {
      const timer = performanceMonitor.startTimer('realtime_sync_init');
      
      // Subscribe to all critical tables
      await this.subscribeToTable('devices');
      await this.subscribeToTable('maintenance_records');
      await this.subscribeToTable('tickets');
      await this.subscribeToTable('notifications');
      await this.subscribeToTable('restaurants');
      await this.subscribeToTable('device_categories');
      
      this.syncStats.connectionStatus = 'connected';
      this.reconnectAttempts = 0;
      
      timer();
      console.log('✅ Real-time sync initialized successfully');
    } catch (error) {
      this.syncStats.connectionStatus = 'disconnected';
      this.syncStats.syncErrors++;
      performanceMonitor.logError(error as Error, 'error', { context: 'realtime_sync_init' });
      
      // Attempt to reconnect
      this.attemptReconnect();
    }
  }

  // Subscribe to a specific table for real-time updates
  private async subscribeToTable(tableName: string): Promise<void> {
    try {
      // Remove existing subscription if any
      if (this.subscriptions.has(tableName)) {
        await supabase.removeChannel(this.subscriptions.get(tableName));
      }

      const subscription = supabase
        .channel(`${tableName}_changes`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: tableName,
          },
          (payload) => this.handleTableChange(tableName, payload)
        )
        .subscribe((status) => {
          if (status === 'SUBSCRIBED') {
            console.log(`📡 Subscribed to ${tableName} changes`);
            this.syncStats.tablesWatched.push(tableName);
          } else if (status === 'CHANNEL_ERROR') {
            console.error(`❌ Error subscribing to ${tableName}`);
            this.syncStats.syncErrors++;
          }
        });

      this.subscriptions.set(tableName, subscription);
    } catch (error) {
      performanceMonitor.logError(error as Error, 'error', { 
        context: 'table_subscription', 
        table: tableName 
      });
    }
  }

  // Handle real-time table changes
  private handleTableChange(tableName: string, payload: any): void {
    try {
      const timer = performanceMonitor.startTimer(`realtime_${tableName}_change`);
      
      const syncEvent: SyncEvent = {
        table: tableName,
        eventType: payload.eventType,
        new: payload.new,
        old: payload.old,
        timestamp: new Date().toISOString(),
      };

      // Update sync stats
      this.syncStats.totalEvents++;
      this.syncStats.lastSync = syncEvent.timestamp;

      // Notify listeners
      this.notifyListeners(tableName, syncEvent);
      
      // Log significant events
      if (payload.eventType === 'INSERT') {
        console.log(`➕ New ${tableName} record:`, payload.new?.id || 'unknown');
      } else if (payload.eventType === 'UPDATE') {
        console.log(`✏️ Updated ${tableName} record:`, payload.new?.id || 'unknown');
      } else if (payload.eventType === 'DELETE') {
        console.log(`🗑️ Deleted ${tableName} record:`, payload.old?.id || 'unknown');
      }

      timer();
    } catch (error) {
      this.syncStats.syncErrors++;
      performanceMonitor.logError(error as Error, 'error', { 
        context: 'handle_table_change', 
        table: tableName,
        eventType: payload.eventType 
      });
    }
  }

  // Notify registered listeners about changes
  private notifyListeners(tableName: string, event: SyncEvent): void {
    const listeners = this.eventListeners.get(tableName) || [];
    listeners.forEach(listener => {
      try {
        listener(event);
      } catch (error) {
        performanceMonitor.logError(error as Error, 'warning', { 
          context: 'notify_listeners', 
          table: tableName 
        });
      }
    });

    // Also notify global listeners
    const globalListeners = this.eventListeners.get('*') || [];
    globalListeners.forEach(listener => {
      try {
        listener(event);
      } catch (error) {
        performanceMonitor.logError(error as Error, 'warning', { 
          context: 'notify_global_listeners' 
        });
      }
    });
  }

  // Attempt to reconnect on connection failure
  private async attemptReconnect(): Promise<void> {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('❌ Max reconnection attempts reached');
      this.syncStats.connectionStatus = 'disconnected';
      return;
    }

    this.reconnectAttempts++;
    this.syncStats.connectionStatus = 'reconnecting';
    
    console.log(`🔄 Attempting to reconnect (${this.reconnectAttempts}/${this.maxReconnectAttempts})...`);
    
    // Wait before reconnecting (exponential backoff)
    const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30000);
    setTimeout(() => {
      this.initializeRealTimeSync();
    }, delay);
  }

  // Public API Methods

  // Register a listener for table changes
  public onTableChange(tableName: string, callback: (event: SyncEvent) => void): () => void {
    if (!this.eventListeners.has(tableName)) {
      this.eventListeners.set(tableName, []);
    }
    
    this.eventListeners.get(tableName)!.push(callback);
    
    // Return unsubscribe function
    return () => {
      const listeners = this.eventListeners.get(tableName) || [];
      const index = listeners.indexOf(callback);
      if (index > -1) {
        listeners.splice(index, 1);
      }
    };
  }

  // Register a global listener for all table changes
  public onAnyChange(callback: (event: SyncEvent) => void): () => void {
    return this.onTableChange('*', callback);
  }

  // Get current sync statistics
  public getSyncStats(): SyncStats {
    return { ...this.syncStats };
  }

  // Force reconnection
  public async forceReconnect(): Promise<void> {
    this.reconnectAttempts = 0;
    await this.disconnect();
    await this.initializeRealTimeSync();
  }

  // Disconnect all subscriptions
  public async disconnect(): Promise<void> {
    try {
      for (const [tableName, subscription] of this.subscriptions) {
        await supabase.removeChannel(subscription);
        console.log(`🔌 Disconnected from ${tableName}`);
      }
      
      this.subscriptions.clear();
      this.syncStats.connectionStatus = 'disconnected';
      this.syncStats.tablesWatched = [];
      
      console.log('🔌 All real-time subscriptions disconnected');
    } catch (error) {
      performanceMonitor.logError(error as Error, 'error', { context: 'disconnect' });
    }
  }

  // Enable/disable sync service
  public setEnabled(enabled: boolean): void {
    this.isEnabled = enabled;
    if (enabled && this.syncStats.connectionStatus === 'disconnected') {
      this.initializeRealTimeSync();
    } else if (!enabled) {
      this.disconnect();
    }
  }

  // Get connection status
  public isConnected(): boolean {
    return this.syncStats.connectionStatus === 'connected';
  }

  // Manual sync trigger for specific table
  public async triggerSync(tableName: string): Promise<void> {
    try {
      const timer = performanceMonitor.startTimer(`manual_sync_${tableName}`);
      
      // Fetch latest data from table
      const { data, error } = await supabase
        .from(tableName)
        .select('*')
        .order('updated_at', { ascending: false })
        .limit(10);

      if (error) {
        throw error;
      }

      // Notify listeners about manual sync
      const syncEvent: SyncEvent = {
        table: tableName,
        eventType: 'UPDATE',
        new: data,
        timestamp: new Date().toISOString(),
      };

      this.notifyListeners(tableName, syncEvent);
      
      timer();
      console.log(`🔄 Manual sync completed for ${tableName}`);
    } catch (error) {
      this.syncStats.syncErrors++;
      performanceMonitor.logError(error as Error, 'error', { 
        context: 'manual_sync', 
        table: tableName 
      });
    }
  }

  // Get real-time performance metrics
  public getPerformanceMetrics(): any {
    return {
      totalEvents: this.syncStats.totalEvents,
      eventsPerMinute: this.calculateEventsPerMinute(),
      connectionUptime: this.calculateUptime(),
      errorRate: this.calculateErrorRate(),
      tablesWatched: this.syncStats.tablesWatched.length,
      lastSync: this.syncStats.lastSync,
    };
  }

  private calculateEventsPerMinute(): number {
    // Simple calculation - in production, you'd track this over time
    return Math.round(this.syncStats.totalEvents / Math.max(1, this.calculateUptime() / 60));
  }

  private calculateUptime(): number {
    // Calculate uptime in seconds since last connection
    const now = new Date().getTime();
    const lastSync = new Date(this.syncStats.lastSync).getTime();
    return Math.round((now - lastSync) / 1000);
  }

  private calculateErrorRate(): number {
    return this.syncStats.totalEvents > 0 
      ? this.syncStats.syncErrors / this.syncStats.totalEvents 
      : 0;
  }
}

// Create singleton instance
export const realTimeSyncService = new RealTimeSyncService();

// Convenience functions
export const onDeviceChange = (callback: (event: SyncEvent) => void) => 
  realTimeSyncService.onTableChange('devices', callback);

export const onMaintenanceChange = (callback: (event: SyncEvent) => void) => 
  realTimeSyncService.onTableChange('maintenance_records', callback);

export const onTicketChange = (callback: (event: SyncEvent) => void) => 
  realTimeSyncService.onTableChange('tickets', callback);

export const onNotificationChange = (callback: (event: SyncEvent) => void) => 
  realTimeSyncService.onTableChange('notifications', callback);

export const getSyncStats = () => realTimeSyncService.getSyncStats();

export const forceSyncReconnect = () => realTimeSyncService.forceReconnect();
