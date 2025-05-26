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
    // Get list of existing buckets
    const { data: buckets, error: listError } = await supabase.storage.listBuckets();
    
    if (listError) {
      console.error('Error listing buckets:', listError);
      throw listError;
    }

    // Check and create ticket-photos bucket if needed
    const ticketPhotosBucketExists = buckets.some(bucket => bucket.name === 'ticket-photos');
    if (!ticketPhotosBucketExists) {
      await createBucket('ticket-photos', true);
      await createBucketPolicies('ticket-photos');
    }

    // Check and create device-images bucket if needed
    const deviceImagesBucketExists = buckets.some(bucket => bucket.name === 'device-images');
    if (!deviceImagesBucketExists) {
      await createBucket('device-images', true);
      await createBucketPolicies('device-images');
    }

    // Check and create device-data bucket if needed
    const deviceDataBucketExists = buckets.some(bucket => bucket.name === 'device-data');
    if (!deviceDataBucketExists) {
      await createBucket('device-data', true);
      await createBucketPolicies('device-data');
    }
    
    return true;
  } catch (error) {
    console.error('Error ensuring storage buckets:', error);
    // Don't throw - allow the app to continue even if bucket setup fails
    return false;
  }
}

// Helper to create a storage bucket
async function createBucket(bucketName: string, isPublic: boolean) {
  try {
    // Try direct bucket creation first
    const { error } = await supabase.storage.createBucket(bucketName, {
      public: isPublic,
      fileSizeLimit: 10485760, // 10MB
      allowedMimeTypes: ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'application/json']
    });

    if (error) {
      console.error(`Error creating ${bucketName} bucket:`, error);
      
      // Try using RPC as fallback
      try {
        await supabase.rpc('create_storage_bucket', {
          bucket_name: bucketName,
          is_public: isPublic
        });
      } catch (rpcError) {
        console.error(`Error creating bucket through RPC:`, rpcError);
      }
    }
  } catch (error) {
    console.error(`Error in createBucket for ${bucketName}:`, error);
  }
}

// Helper to create policies for a bucket
async function createBucketPolicies(bucketName: string) {
  try {
    // Create select policy
    try {
      await supabase.rpc('exec_sql', { 
        sql: `CREATE POLICY "Public can view ${bucketName}" ON storage.objects
              FOR SELECT USING (bucket_id = '${bucketName}');` 
      });
    } catch (error) {
      console.log(`Select policy for ${bucketName} may already exist`);
    }
    
    // Create insert policy
    try {
      await supabase.rpc('exec_sql', { 
        sql: `CREATE POLICY "Authenticated users can upload to ${bucketName}" 
              ON storage.objects FOR INSERT 
              WITH CHECK (bucket_id = '${bucketName}' AND auth.role() = 'authenticated');`
      });
    } catch (error) {
      console.log(`Insert policy for ${bucketName} may already exist`);
    }
    
    // Create update policy
    try {
      await supabase.rpc('exec_sql', { 
        sql: `CREATE POLICY "Authenticated users can update ${bucketName}" 
              ON storage.objects FOR UPDATE 
              USING (bucket_id = '${bucketName}' AND auth.role() = 'authenticated');`
      });
    } catch (error) {
      console.log(`Update policy for ${bucketName} may already exist`);
    }
    
    // Create delete policy
    try {
      await supabase.rpc('exec_sql', { 
        sql: `CREATE POLICY "Authenticated users can delete from ${bucketName}" 
              ON storage.objects FOR DELETE 
              USING (bucket_id = '${bucketName}' AND auth.role() = 'authenticated');`
      });
    } catch (error) {
      console.log(`Delete policy for ${bucketName} may already exist`);
    }
  } catch (error) {
    console.error(`Error creating policies for ${bucketName}:`, error);
  }
}

// Call the function when the app starts
ensureStorageBuckets();
