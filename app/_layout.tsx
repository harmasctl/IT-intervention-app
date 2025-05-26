import { DefaultTheme, ThemeProvider } from "@react-navigation/native";
import { useFonts } from "expo-font";
import { Stack, useRouter, useSegments } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import { useEffect, createContext, useContext, useState } from "react";
import "react-native-reanimated";
import "../global.css";
import { Platform } from "react-native";
import { AuthProvider, useAuth } from "../components/AuthProvider";
import { supabase, ensureStorageBuckets } from "../lib/supabase";
import { OfflineProvider } from "../components/OfflineManager";
import NetworkStatusIndicator from "../components/NetworkStatusIndicator";
import MaintenanceManager from "../components/MaintenanceManager";
import { AppState, AppStateStatus } from 'react-native';

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();

// Create notification context
type Notification = {
  id: string;
  title: string;
  message: string;
  type: "info" | "success" | "warning" | "error" | "low_stock";
  read: boolean;
  timestamp: string;
  related_id?: string;
  related_type?: string;
  user_id: string;
};

type NotificationContextType = {
  notifications: Notification[];
  unreadCount: number;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  refreshNotifications: () => Promise<void>;
};

const NotificationContext = createContext<NotificationContextType>({
  notifications: [],
  unreadCount: 0,
  markAsRead: () => {},
  markAllAsRead: () => {},
  refreshNotifications: async () => {},
});

export const useNotifications = () => useContext(NotificationContext);

const NotificationProvider = ({ children }: { children: React.ReactNode }) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const { session } = useAuth();

  const refreshNotifications = async () => {
    if (!session?.user?.id) return;

    try {
      const { data, error } = await supabase
        .from("notifications")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;

      if (data) {
        setNotifications(data as Notification[]);
        setUnreadCount(data.filter((n) => !n.is_read).length);
      }
    } catch (error) {
      console.error("Error fetching notifications:", error);
    }
  };

  useEffect(() => {
    if (session?.user?.id) {
      refreshNotifications();

      // Set up real-time subscription for notifications
      const notificationSubscription = supabase
        .channel("notifications-channel")
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "notifications" },
          () => {
            refreshNotifications();
          },
        )
        .subscribe();

      return () => {
        notificationSubscription.unsubscribe();
      };
    }
  }, [session]);

  const markAsRead = async (id: string) => {
    try {
      const { error } = await supabase
        .from("notifications")
        .update({ is_read: true })
        .eq("id", id);

      if (error) throw error;

      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, is_read: true } : n)),
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch (error) {
      console.error("Error marking notification as read:", error);
    }
  };

  const markAllAsRead = async () => {
    if (!session?.user?.id) return;

    try {
      const { error } = await supabase
        .from("notifications")
        .update({ is_read: true })
        .eq("is_read", false);

      if (error) throw error;

      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
      setUnreadCount(0);
    } catch (error) {
      console.error("Error marking all notifications as read:", error);
    }
  };

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        unreadCount,
        markAsRead,
        markAllAsRead,
        refreshNotifications,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
};

function RootLayoutNav() {
  const { session, user, loading } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;

    const inAuthGroup = segments[0] === "auth";

    if (!session && !inAuthGroup) {
      // Redirect to login if not authenticated and not already in auth group
      router.replace("/auth/login");
    } else if (session && inAuthGroup) {
      // Redirect to home if authenticated and in auth group
      router.replace("/");
    }
  }, [session, segments, loading]);

  return (
    <Stack
      screenOptions={({ route }) => ({
        headerShown: !route.name.startsWith("tempobook"),
      })}
    >
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen name="dashboard" options={{ headerShown: false }} />
      <Stack.Screen name="tickets/index" options={{ headerShown: false }} />
      <Stack.Screen name="tickets/[id]" options={{ headerShown: false }} />
      <Stack.Screen name="tickets/create" options={{ headerShown: false }} />
      <Stack.Screen name="inventory/index" options={{ headerShown: false }} />
      <Stack.Screen name="devices/index" options={{ headerShown: false }} />
      <Stack.Screen
        name="devices/bulk-import"
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="devices/categories"
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="devices/models"
        options={{ headerShown: false }}
      />
      <Stack.Screen name="profile/index" options={{ headerShown: false }} />
      <Stack.Screen name="auth/login" options={{ headerShown: false }} />
      <Stack.Screen name="auth/signup" options={{ headerShown: false }} />
      <Stack.Screen name="schedule/index" options={{ headerShown: false }} />
      <Stack.Screen name="schedule/maintenance" options={{ headerShown: false }} />
      <Stack.Screen name="equipment/index" options={{ headerShown: false }} />
      <Stack.Screen name="equipment/history" options={{ headerShown: false }} />
      <Stack.Screen
        name="equipment/suppliers"
        options={{ headerShown: false }}
      />
      <Stack.Screen name="reports/index" options={{ headerShown: false }} />
      <Stack.Screen name="knowledge/index" options={{ headerShown: false }} />
      <Stack.Screen name="knowledge/article" options={{ headerShown: false }} />
      <Stack.Screen name="profile/edit" options={{ headerShown: false }} />
      <Stack.Screen name="profile/settings" options={{ headerShown: false }} />
      <Stack.Screen name="schedule/create" options={{ headerShown: false }} />
      <Stack.Screen name="restaurants/index" options={{ headerShown: false }} />
      <Stack.Screen name="restaurants/[id]" options={{ headerShown: false }} />
      <Stack.Screen name="restaurants/device-map" options={{ headerShown: false }} />
      <Stack.Screen name="restaurants/simple-map" options={{ headerShown: false }} />
      <Stack.Screen name="test-device-map" options={{ headerShown: false }} />
      <Stack.Screen name="admin/index" options={{ headerShown: false }} />
      <Stack.Screen
        name="notifications/index"
        options={{ headerShown: false }}
      />
      <Stack.Screen name="notification-handler" options={{ headerShown: false }} />
      <Stack.Screen name="users/index" options={{ headerShown: false }} />
      <Stack.Screen name="users/[id]" options={{ headerShown: false }} />
    </Stack>
  );
}

export default function RootLayout() {
  const [loaded, error] = useFonts({
    SpaceMono: require("../assets/fonts/SpaceMono-Regular.ttf"),
  });

  // Initialize app functionality
  useEffect(() => {
    const initializeApp = async () => {
      try {
        // Ensure storage buckets are created
        if (typeof ensureStorageBuckets === "function") {
          ensureStorageBuckets();
        } else {
          console.warn("ensureStorageBuckets not defined");
        }

        // Hide splash screen after initialization is complete
        SplashScreen.hideAsync();
      } catch (e) {
        console.error("Error during app initialization:", e);
        SplashScreen.hideAsync();
      }
    };

    if (loaded) {
      initializeApp();
    }
  }, [loaded]);

  useEffect(() => {
    if (process.env.EXPO_PUBLIC_TEMPO && Platform.OS === "web") {
      try {
        // Only try to require if we're in a web environment and the env var is set
        const tempoDevtools = require("tempo-devtools");
        tempoDevtools.TempoDevtools.init();
      } catch (error) {
        // Silently fail if the module is not available
        console.log("Tempo devtools not available, skipping initialization");
      }
    }
  }, []);

  if (!loaded) {
    return null;
  }

  return (
    <ThemeProvider value={DefaultTheme}>
      <AuthProvider>
        <OfflineProvider>
          <NotificationProvider>
            <RootLayoutNav />
            <NetworkStatusIndicator />
            {Platform.OS !== 'web' && <MaintenanceManager />}
          </NotificationProvider>
        </OfflineProvider>
      </AuthProvider>
      <StatusBar style="auto" />
    </ThemeProvider>
  );
}
