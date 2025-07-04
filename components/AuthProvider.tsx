import React, { createContext, useState, useEffect, useContext } from "react";
import { Session, User } from "@supabase/supabase-js";
import { View, Text, ActivityIndicator, Alert } from "react-native";
import { supabase } from "../lib/supabase";
import { Database } from "../types/supabase";

type AuthContextType = {
  session: Session | null;
  user: User | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: any | null }>;
  signUp: (
    email: string,
    password: string,
    userData: any,
  ) => Promise<{ error: any | null }>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check for active session on mount
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const signIn = async (email: string, password: string) => {
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      return { error };
    } catch (error) {
      console.error("Sign in error:", error);
      return {
        error: {
          message: "An error occurred during sign in. Please try again later.",
        },
      };
    }
  };

  const signUp = async (email: string, password: string, userData: any) => {
    try {
      const { data, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            name: userData.name,
            role: userData.role,
          },
        },
      });

      if (signUpError) return { error: signUpError };

      // Create user profile in the users table
      if (data?.user) {
        const { error: profileError } = await supabase
          .from("users")
          .insert([
            {
              id: data.user.id,
              email: email,
              name: userData.name,
              role: userData.role,
              avatar_url: userData.avatar_url || null,
              created_at: new Date().toISOString(),
            },
          ] as any); // Type assertion to fix TypeScript error

        if (profileError) {
          console.error("Error creating user profile:", profileError);
          return { error: profileError };
        }
      }

      return { error: null };
    } catch (error) {
      console.error("Sign up error:", error);
      return {
        error: {
          message: "An error occurred during sign up. Please try again later.",
        },
      };
    }
  };

  const signOut = async () => {
    try {
      await supabase.auth.signOut();
    } catch (error) {
      console.error("Sign out error:", error);
      Alert.alert("Error", "Failed to sign out. Please try again.");
    }
  };

  const value = {
    session,
    user,
    loading,
    signIn,
    signUp,
    signOut,
  };

  return (
    <AuthContext.Provider value={value}>
      {loading ? (
        <View className="flex-1 justify-center items-center bg-white">
          <ActivityIndicator size="large" color="#1e40af" />
          <Text className="mt-4 text-gray-600">Loading...</Text>
        </View>
      ) : (
        children
      )}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
