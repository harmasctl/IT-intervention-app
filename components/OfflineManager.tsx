import React, { createContext, useContext, useState, useEffect } from 'react';
import NetInfo from '@react-native-community/netinfo';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../lib/supabase';
import { Alert } from 'react-native';

type OfflineAction = {
  id: string;
  table: string;
  action: 'insert' | 'update' | 'delete';
  data: any;
  timestamp: string;
};

type OfflineContextType = {
  isOnline: boolean;
  pendingActions: number;
  saveOfflineAction: (
    table: string,
    action: 'insert' | 'update' | 'delete',
    data: any
  ) => Promise<void>;
  syncOfflineActions: () => Promise<void>;
};

const OFFLINE_ACTIONS_KEY = 'offline_actions';

const OfflineContext = createContext<OfflineContextType>({
  isOnline: true,
  pendingActions: 0,
  saveOfflineAction: async () => {},
  syncOfflineActions: async () => {},
});

export const useOffline = () => useContext(OfflineContext);

export const OfflineProvider = ({ children }: { children: React.ReactNode }) => {
  const [isOnline, setIsOnline] = useState(true);
  const [offlineActions, setOfflineActions] = useState<OfflineAction[]>([]);

  // Load saved offline actions on startup
  useEffect(() => {
    const loadOfflineActions = async () => {
      try {
        const savedActions = await AsyncStorage.getItem(OFFLINE_ACTIONS_KEY);
        if (savedActions) {
          setOfflineActions(JSON.parse(savedActions));
        }
      } catch (error) {
        console.error('Error loading offline actions:', error);
      }
    };

    loadOfflineActions();
  }, []);

  // Monitor network state
  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state) => {
      const online = state.isConnected && state.isInternetReachable;
      
      // If we just came back online, try to sync
      if (online && !isOnline) {
        syncOfflineActions();
      }
      
      setIsOnline(!!online);
    });

    return () => unsubscribe();
  }, [isOnline, offlineActions]);

  // Save offline actions to AsyncStorage
  const persistOfflineActions = async (actions: OfflineAction[]) => {
    try {
      await AsyncStorage.setItem(OFFLINE_ACTIONS_KEY, JSON.stringify(actions));
    } catch (error) {
      console.error('Error saving offline actions:', error);
    }
  };

  // Save an action to be performed when back online
  const saveOfflineAction = async (
    table: string,
    action: 'insert' | 'update' | 'delete',
    data: any
  ) => {
    const newAction: OfflineAction = {
      id: Math.random().toString(36).substring(2, 15),
      table,
      action,
      data,
      timestamp: new Date().toISOString(),
    };

    const updatedActions = [...offlineActions, newAction];
    setOfflineActions(updatedActions);
    await persistOfflineActions(updatedActions);
    
    return;
  };

  // Sync all pending offline actions
  const syncOfflineActions = async () => {
    if (!isOnline || offlineActions.length === 0) return;

    // Sort actions by timestamp
    const sortedActions = [...offlineActions].sort(
      (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );

    const failedActions: OfflineAction[] = [];

    for (const action of sortedActions) {
      try {
        let error;

        switch (action.action) {
          case 'insert':
            const { error: insertError } = await supabase
              .from(action.table)
              .insert(action.data);
            error = insertError;
            break;

          case 'update':
            // Assuming data has an id field to identify the record
            const { error: updateError } = await supabase
              .from(action.table)
              .update(action.data)
              .eq('id', action.data.id);
            error = updateError;
            break;

          case 'delete':
            // Assuming data has an id field to identify the record
            const { error: deleteError } = await supabase
              .from(action.table)
              .delete()
              .eq('id', action.data.id);
            error = deleteError;
            break;
        }

        if (error) {
          console.error(`Error syncing ${action.action} for ${action.table}:`, error);
          failedActions.push(action);
        }
      } catch (error) {
        console.error(`Exception syncing ${action.action} for ${action.table}:`, error);
        failedActions.push(action);
      }
    }

    // Update the offline actions list with only the failed ones
    setOfflineActions(failedActions);
    await persistOfflineActions(failedActions);

    // Notify user of sync results
    if (failedActions.length === 0 && sortedActions.length > 0) {
      Alert.alert(
        'Sync Complete',
        `Successfully synchronized ${sortedActions.length} offline actions.`
      );
    } else if (failedActions.length > 0) {
      Alert.alert(
        'Sync Incomplete',
        `Synchronized ${sortedActions.length - failedActions.length} actions, but ${failedActions.length} actions failed.`
      );
    }
  };

  return (
    <OfflineContext.Provider
      value={{
        isOnline,
        pendingActions: offlineActions.length,
        saveOfflineAction,
        syncOfflineActions,
      }}
    >
      {children}
    </OfflineContext.Provider>
  );
};
