// Offline Support and Data Synchronization
import { supabase } from './supabase';
import { performanceMonitor } from './performance';

interface OfflineAction {
  id: string;
  type: 'CREATE' | 'UPDATE' | 'DELETE';
  table: string;
  data: any;
  timestamp: string;
  synced: boolean;
  retryCount: number;
  error?: string;
}

interface OfflineData {
  [table: string]: {
    [id: string]: any;
  };
}

interface SyncResult {
  success: boolean;
  syncedActions: number;
  failedActions: number;
  errors: string[];
  syncTime: number;
}

class OfflineSupportService {
  private isOnline: boolean = true;
  private pendingActions: OfflineAction[] = [];
  private offlineData: OfflineData = {};
  private syncInProgress: boolean = false;
  private maxRetries: number = 3;
  private syncInterval: NodeJS.Timeout | null = null;

  constructor() {
    this.initializeOfflineSupport();
  }

  // Initialize offline support
  private initializeOfflineSupport(): void {
    // Check initial online status
    if (typeof navigator !== 'undefined') {
      this.isOnline = navigator.onLine;

      // Listen for online/offline events
      window.addEventListener('online', () => {
        this.handleOnlineStatusChange(true);
      });

      window.addEventListener('offline', () => {
        this.handleOnlineStatusChange(false);
      });
    }

    // Load offline data and pending actions
    this.loadOfflineData();
    this.loadPendingActions();

    // Start periodic sync when online
    if (this.isOnline) {
      this.startPeriodicSync();
    }

    console.log(`🔌 Offline support initialized - Status: ${this.isOnline ? 'Online' : 'Offline'}`);
  }

  // Handle online status changes
  private handleOnlineStatusChange(isOnline: boolean): void {
    const wasOffline = !this.isOnline;
    this.isOnline = isOnline;

    if (isOnline && wasOffline) {
      console.log('🌐 Back online - Starting sync...');
      this.syncPendingActions();
      this.startPeriodicSync();
    } else if (!isOnline) {
      console.log('📱 Gone offline - Enabling offline mode...');
      this.stopPeriodicSync();
    }

    // Notify listeners
    this.notifyStatusChange(isOnline);
  }

  // Store data for offline access
  async storeOfflineData(table: string, data: any[]): Promise<void> {
    try {
      if (!this.offlineData[table]) {
        this.offlineData[table] = {};
      }

      data.forEach(item => {
        if (item.id) {
          this.offlineData[table][item.id] = item;
        }
      });

      this.persistOfflineData();
      console.log(`💾 Stored ${data.length} ${table} records for offline access`);
    } catch (error) {
      performanceMonitor.logError(error as Error, 'error', { 
        context: 'store_offline_data', 
        table 
      });
    }
  }

  // Get offline data
  getOfflineData(table: string, id?: string): any | any[] {
    if (!this.offlineData[table]) {
      return id ? null : [];
    }

    if (id) {
      return this.offlineData[table][id] || null;
    }

    return Object.values(this.offlineData[table]);
  }

  // Perform offline action
  async performOfflineAction(
    type: 'CREATE' | 'UPDATE' | 'DELETE',
    table: string,
    data: any
  ): Promise<string> {
    const actionId = `action_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const action: OfflineAction = {
      id: actionId,
      type,
      table,
      data,
      timestamp: new Date().toISOString(),
      synced: false,
      retryCount: 0,
    };

    // Store action for later sync
    this.pendingActions.push(action);
    this.persistPendingActions();

    // Update offline data immediately for optimistic UI
    this.updateOfflineDataOptimistically(action);

    console.log(`📝 Queued offline action: ${type} ${table}`);

    // Try to sync immediately if online
    if (this.isOnline && !this.syncInProgress) {
      this.syncPendingActions();
    }

    return actionId;
  }

  // Update offline data optimistically
  private updateOfflineDataOptimistically(action: OfflineAction): void {
    const { type, table, data } = action;

    if (!this.offlineData[table]) {
      this.offlineData[table] = {};
    }

    switch (type) {
      case 'CREATE':
        if (data.id) {
          this.offlineData[table][data.id] = data;
        }
        break;
      case 'UPDATE':
        if (data.id && this.offlineData[table][data.id]) {
          this.offlineData[table][data.id] = { ...this.offlineData[table][data.id], ...data };
        }
        break;
      case 'DELETE':
        if (data.id) {
          delete this.offlineData[table][data.id];
        }
        break;
    }

    this.persistOfflineData();
  }

  // Sync pending actions with server
  async syncPendingActions(): Promise<SyncResult> {
    if (this.syncInProgress || !this.isOnline) {
      return {
        success: false,
        syncedActions: 0,
        failedActions: 0,
        errors: ['Sync already in progress or offline'],
        syncTime: 0,
      };
    }

    const timer = performanceMonitor.startTimer('offline_sync');
    this.syncInProgress = true;

    try {
      const actionsToSync = this.pendingActions.filter(action => !action.synced);
      let syncedCount = 0;
      let failedCount = 0;
      const errors: string[] = [];

      console.log(`🔄 Syncing ${actionsToSync.length} pending actions...`);

      for (const action of actionsToSync) {
        try {
          await this.syncSingleAction(action);
          action.synced = true;
          syncedCount++;
          console.log(`✅ Synced: ${action.type} ${action.table}`);
        } catch (error) {
          action.retryCount++;
          action.error = (error as Error).message;
          failedCount++;
          errors.push(`${action.type} ${action.table}: ${action.error}`);
          
          console.error(`❌ Failed to sync: ${action.type} ${action.table}`, error);

          // Remove action if max retries exceeded
          if (action.retryCount >= this.maxRetries) {
            console.warn(`🗑️ Removing action after ${this.maxRetries} failed attempts`);
            const index = this.pendingActions.indexOf(action);
            if (index > -1) {
              this.pendingActions.splice(index, 1);
            }
          }
        }
      }

      // Remove synced actions
      this.pendingActions = this.pendingActions.filter(action => !action.synced);
      this.persistPendingActions();

      const syncTime = timer();
      const result: SyncResult = {
        success: failedCount === 0,
        syncedActions: syncedCount,
        failedActions: failedCount,
        errors,
        syncTime,
      };

      console.log(`🎯 Sync completed: ${syncedCount} synced, ${failedCount} failed`);
      return result;

    } catch (error) {
      const syncTime = timer();
      performanceMonitor.logError(error as Error, 'error', { context: 'sync_pending_actions' });
      
      return {
        success: false,
        syncedActions: 0,
        failedActions: this.pendingActions.length,
        errors: [(error as Error).message],
        syncTime,
      };
    } finally {
      this.syncInProgress = false;
    }
  }

  // Sync a single action
  private async syncSingleAction(action: OfflineAction): Promise<void> {
    const { type, table, data } = action;

    switch (type) {
      case 'CREATE':
        const { error: createError } = await supabase.from(table).insert(data);
        if (createError) throw createError;
        break;

      case 'UPDATE':
        const { error: updateError } = await supabase
          .from(table)
          .update(data)
          .eq('id', data.id);
        if (updateError) throw updateError;
        break;

      case 'DELETE':
        const { error: deleteError } = await supabase
          .from(table)
          .delete()
          .eq('id', data.id);
        if (deleteError) throw deleteError;
        break;

      default:
        throw new Error(`Unknown action type: ${type}`);
    }
  }

  // Start periodic sync
  private startPeriodicSync(): void {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
    }

    // Sync every 30 seconds when online
    this.syncInterval = setInterval(() => {
      if (this.isOnline && this.pendingActions.length > 0) {
        this.syncPendingActions();
      }
    }, 30000);
  }

  // Stop periodic sync
  private stopPeriodicSync(): void {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
    }
  }

  // Check if data is available offline
  isDataAvailableOffline(table: string, id?: string): boolean {
    if (!this.offlineData[table]) {
      return false;
    }

    if (id) {
      return !!this.offlineData[table][id];
    }

    return Object.keys(this.offlineData[table]).length > 0;
  }

  // Get offline status
  getOfflineStatus(): {
    isOnline: boolean;
    pendingActions: number;
    offlineDataTables: string[];
    lastSyncAttempt?: string;
  } {
    return {
      isOnline: this.isOnline,
      pendingActions: this.pendingActions.filter(a => !a.synced).length,
      offlineDataTables: Object.keys(this.offlineData),
      lastSyncAttempt: this.pendingActions.length > 0 
        ? this.pendingActions[this.pendingActions.length - 1].timestamp 
        : undefined,
    };
  }

  // Clear offline data
  clearOfflineData(table?: string): void {
    if (table) {
      delete this.offlineData[table];
    } else {
      this.offlineData = {};
    }
    this.persistOfflineData();
  }

  // Clear pending actions
  clearPendingActions(): void {
    this.pendingActions = [];
    this.persistPendingActions();
  }

  // Persistence methods
  private persistOfflineData(): void {
    if (typeof window !== 'undefined' && window.localStorage) {
      localStorage.setItem('offline_data', JSON.stringify(this.offlineData));
    }
  }

  private persistPendingActions(): void {
    if (typeof window !== 'undefined' && window.localStorage) {
      localStorage.setItem('pending_actions', JSON.stringify(this.pendingActions));
    }
  }

  private loadOfflineData(): void {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        const data = localStorage.getItem('offline_data');
        if (data) {
          this.offlineData = JSON.parse(data);
        }
      }
    } catch (error) {
      performanceMonitor.logError(error as Error, 'warning', { context: 'load_offline_data' });
    }
  }

  private loadPendingActions(): void {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        const actions = localStorage.getItem('pending_actions');
        if (actions) {
          this.pendingActions = JSON.parse(actions);
        }
      }
    } catch (error) {
      performanceMonitor.logError(error as Error, 'warning', { context: 'load_pending_actions' });
    }
  }

  // Notify status change listeners
  private notifyStatusChange(isOnline: boolean): void {
    // Dispatch custom event for components to listen to
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('offlineStatusChange', { 
        detail: { isOnline } 
      }));
    }
  }

  // Public API methods
  public isOnlineStatus(): boolean {
    return this.isOnline;
  }

  public getPendingActionsCount(): number {
    return this.pendingActions.filter(a => !a.synced).length;
  }

  public forceSyncNow(): Promise<SyncResult> {
    return this.syncPendingActions();
  }
}

// Create singleton instance
export const offlineSupportService = new OfflineSupportService();

// Convenience functions
export const storeDevicesOffline = (devices: any[]) =>
  offlineSupportService.storeOfflineData('devices', devices);

export const getOfflineDevices = (id?: string) =>
  offlineSupportService.getOfflineData('devices', id);

export const createOfflineDevice = (deviceData: any) =>
  offlineSupportService.performOfflineAction('CREATE', 'devices', deviceData);

export const updateOfflineDevice = (deviceData: any) =>
  offlineSupportService.performOfflineAction('UPDATE', 'devices', deviceData);

export const deleteOfflineDevice = (deviceId: string) =>
  offlineSupportService.performOfflineAction('DELETE', 'devices', { id: deviceId });

export const getOfflineStatus = () => offlineSupportService.getOfflineStatus();

export const syncNow = () => offlineSupportService.forceSyncNow();
