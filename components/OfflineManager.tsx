import React, { useState, useEffect, createContext, useContext } from "react";
import { View, Text, Alert, AppState, AppStateStatus } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import NetInfo from "@react-native-community/netinfo";
import { supabase } from "../lib/supabase";

type OfflineAction = {
  id: string;
  table: string;
  action: "insert" | "update" | "delete";
  data: any;
  timestamp: number;
};

type OfflineContextType = {
  isOnline: boolean;
  isPendingSync: boolean;
  pendingActionsCount: number;
  saveOfflineAction: (
    table: string,
    action: "insert" | "update" | "delete",
    data: any,
  ) => Promise<void>;
  syncOfflineActions: () => Promise<void>;
};

const OfflineContext = createContext<OfflineContextType>({
  isOnline: true,
  isPendingSync: false,
  pendingActionsCount: 0,
  saveOfflineAction: async () => {},
  syncOfflineActions: async () => {},
});

export const useOffline = () => useContext(OfflineContext);

type OfflineManagerProps = {
  children: React.ReactNode;
};

export default function OfflineManager({ children }: OfflineManagerProps) {
  const [isOnline, setIsOnline] = useState(true);
  const [isPendingSync, setIsPendingSync] = useState(false);
  const [pendingActions, setPendingActions] = useState<OfflineAction[]>([]);
  const [appState, setAppState] = useState<AppStateStatus>(
    AppState.currentState,
  );

  // Initialize and set up listeners
  useEffect(() => {
    const loadPendingActions = async () => {
      try {
        const storedActions = await AsyncStorage.getItem("offlineActions");
        if (storedActions) {
          setPendingActions(JSON.parse(storedActions));
        }
      } catch (error) {
        console.error("Error loading offline actions:", error);
      }
    };

    loadPendingActions();

    // Set up network connectivity listener
    const unsubscribeNetInfo = NetInfo.addEventListener((state) => {
      const online =
        state.isConnected !== false && state.isInternetReachable !== false;
      setIsOnline(online);

      // If we're coming back online and have pending actions, sync them
      if (online && pendingActions.length > 0) {
        syncOfflineActions();
      }
    });

    // Set up app state listener for background/foreground transitions
    const appStateSubscription = AppState.addEventListener(
      "change",
      (nextAppState) => {
        if (
          appState.match(/inactive|background/) &&
          nextAppState === "active"
        ) {
          // App has come to the foreground
          NetInfo.fetch().then((state) => {
            const online =
              state.isConnected !== false &&
              state.isInternetReachable !== false;
            setIsOnline(online);

            if (online && pendingActions.length > 0) {
              syncOfflineActions();
            }
          });
        }
        setAppState(nextAppState);
      },
    );

    return () => {
      unsubscribeNetInfo();
      appStateSubscription.remove();
    };
  }, [appState, pendingActions.length]);

  // Save pending actions to AsyncStorage whenever they change
  useEffect(() => {
    const savePendingActions = async () => {
      try {
        await AsyncStorage.setItem(
          "offlineActions",
          JSON.stringify(pendingActions),
        );
      } catch (error) {
        console.error("Error saving offline actions:", error);
      }
    };

    savePendingActions();
  }, [pendingActions]);

  const saveOfflineAction = async (
    table: string,
    action: "insert" | "update" | "delete",
    data: any,
  ) => {
    try {
      const newAction: OfflineAction = {
        id: `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
        table,
        action,
        data,
        timestamp: Date.now(),
      };

      setPendingActions((prev) => [...prev, newAction]);

      // If we're online, try to sync immediately
      if (isOnline) {
        await syncOfflineActions();
      } else {
        Alert.alert(
          "Offline Mode",
          "Your changes have been saved locally and will be synchronized when you're back online.",
        );
      }
    } catch (error) {
      console.error("Error saving offline action:", error);
      Alert.alert("Error", "Failed to save your changes offline");
    }
  };

  const syncOfflineActions = async () => {
    if (pendingActions.length === 0) return;

    try {
      setIsPendingSync(true);

      // Process actions in order (oldest first)
      const sortedActions = [...pendingActions].sort(
        (a, b) => a.timestamp - b.timestamp,
      );
      const failedActions: OfflineAction[] = [];

      for (const action of sortedActions) {
        try {
          switch (action.action) {
            case "insert":
              await supabase.from(action.table).insert(action.data);
              break;
            case "update":
              if (!action.data.id) throw new Error("Missing ID for update");
              await supabase
                .from(action.table)
                .update(action.data)
                .eq("id", action.data.id);
              break;
            case "delete":
              if (!action.data.id) throw new Error("Missing ID for delete");
              await supabase
                .from(action.table)
                .delete()
                .eq("id", action.data.id);
              break;
          }
        } catch (error) {
          console.error(`Error syncing action ${action.id}:`, error);
          failedActions.push(action);
        }
      }

      // Update pending actions to only include failed ones
      setPendingActions(failedActions);

      if (failedActions.length > 0) {
        Alert.alert(
          "Sync Incomplete",
          `${sortedActions.length - failedActions.length} of ${sortedActions.length} changes were synchronized. ${failedActions.length} changes failed to sync.`,
        );
      } else if (sortedActions.length > 0) {
        Alert.alert(
          "Sync Complete",
          `All ${sortedActions.length} changes have been synchronized successfully.`,
        );
      }
    } catch (error) {
      console.error("Error syncing offline actions:", error);
      Alert.alert("Sync Error", "Failed to synchronize some offline changes");
    } finally {
      setIsPendingSync(false);
    }
  };

  return (
    <OfflineContext.Provider
      value={{
        isOnline,
        isPendingSync,
        pendingActionsCount: pendingActions.length,
        saveOfflineAction,
        syncOfflineActions,
      }}
    >
      {children}
      {!isOnline && (
        <View className="absolute bottom-0 left-0 right-0 bg-amber-500 py-2 px-4">
          <Text className="text-white font-medium text-center">
            You're offline. Changes will be saved locally.
          </Text>
        </View>
      )}
      {isOnline && pendingActions.length > 0 && (
        <View className="absolute bottom-0 left-0 right-0 bg-blue-500 py-2 px-4">
          <Text className="text-white font-medium text-center">
            {isPendingSync
              ? `Syncing ${pendingActions.length} offline changes...`
              : `${pendingActions.length} changes pending sync`}
          </Text>
        </View>
      )}
    </OfflineContext.Provider>
  );
}
