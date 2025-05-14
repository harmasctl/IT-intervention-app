import "react-native-url-polyfill/auto";
import { createClient } from "@supabase/supabase-js";
import { Database } from "./database.types";

// Set default values for Supabase connection
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || "";
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || "";

// Log environment variables status for debugging
if (!process.env.EXPO_PUBLIC_SUPABASE_URL) {
  console.error(
    "EXPO_PUBLIC_SUPABASE_URL is not defined in environment variables",
  );
}

if (!process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY) {
  console.error(
    "EXPO_PUBLIC_SUPABASE_ANON_KEY is not defined in environment variables",
  );
}

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey);
