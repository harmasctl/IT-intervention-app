import "react-native-url-polyfill/auto";
import { createClient } from "@supabase/supabase-js";
import { Database } from "../lib/database.types";

// Initialize Supabase client
const supabaseUrl = 'https://mxbebraqpukeanginfxr.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im14YmVicmFxcHVrZWFuZ2luZnhyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDY3MTkzOTIsImV4cCI6MjA2MjI5NTM5Mn0.wR-tHSGk7h5XtZPQsNnPOiZa68fQcuuGdqZj_Av8voo';

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: false,
  },
});

// Helper function to get the current user
export async function getCurrentUser() {
  try {
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error) throw error;
    return user;
  } catch (error) {
    console.error('Error getting current user:', error);
    return null;
  }
}

// Helper function to sign out
export async function signOut() {
  try {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  } catch (error) {
    console.error('Error signing out:', error);
    throw error;
  }
}

// Helper function to ensure storage buckets exist
export async function ensureStorageBuckets() {
  try {
    // Check if the ticket-photos bucket exists
    const { data: buckets, error } = await supabase.storage.listBuckets();
    
    if (error) {
      console.error('Error listing buckets:', error);
      return;
    }

    const ticketPhotosBucketExists = buckets.some(bucket => bucket.name === 'ticket-photos');
    
    if (!ticketPhotosBucketExists) {
      // Create the bucket with public access
      const { error: createError } = await supabase.storage.createBucket('ticket-photos', {
        public: true,
        fileSizeLimit: 10485760, // 10MB
        allowedMimeTypes: ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
      });

      if (createError) {
        console.error('Error creating ticket-photos bucket:', createError);
      } else {
        console.log('Created ticket-photos bucket successfully');
      }
    }
  } catch (error) {
    console.error('Error ensuring storage buckets:', error);
  }
}

// Call this function when the app starts
ensureStorageBuckets();
