import { createClient } from '@supabase/supabase-js';
import { createBrowserClient } from '@supabase/ssr';

// Log environment variables presence for debugging (only on client)
if (typeof window !== 'undefined') {
  console.log('ENV Check - NEXT_PUBLIC_SUPABASE_URL:', 
    process.env.NEXT_PUBLIC_SUPABASE_URL ? 'exists' : 'missing');
  console.log('ENV Check - NEXT_PUBLIC_SUPABASE_ANON_KEY:', 
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? 'exists' : 'missing');
  
  // Log actual values (length only, for security)
  console.log('ENV Value Check - URL length:', 
    process.env.NEXT_PUBLIC_SUPABASE_URL?.length || 0);
  console.log('ENV Value Check - KEY length:', 
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.length || 0);
}

// Get the environment variables with fallbacks
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder-project.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-key-for-development-only';
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'placeholder-service-key';

// Create a mock client for when access is limited or in development
const createMockClient = () => {
  console.warn('Using mock Supabase client');
  // Log stack trace to find where this is being called from
  console.trace('Mock client creation stack trace');
  
  return {
    auth: {
      getUser: () => Promise.resolve({ data: { user: null }, error: null }),
      getSession: () => Promise.resolve({ data: { session: null }, error: null }),
      signInWithPassword: () => Promise.resolve({ data: { user: null }, error: null }),
      signUp: () => Promise.resolve({ data: { user: null }, error: null }),
      signOut: () => Promise.resolve({ error: null }),
    },
    from: () => ({
      select: () => ({
        eq: () => ({
          single: () => Promise.resolve({ data: null, error: null }),
          limit: () => Promise.resolve({ data: [], error: null }),
          order: () => Promise.resolve({ data: [], error: null }),
        }),
        order: () => ({
          limit: () => Promise.resolve({ data: [], error: null }),
        }),
        limit: () => Promise.resolve({ data: [], error: null }),
      }),
      insert: () => Promise.resolve({ data: null, error: null }),
      update: () => ({
        eq: () => Promise.resolve({ data: null, error: null }),
      }),
      delete: () => ({
        eq: () => Promise.resolve({ data: null, error: null }),
      }),
    }),
    storage: {
      from: () => ({
        upload: () => Promise.resolve({ data: { path: '' }, error: null }),
        getPublicUrl: () => ({ data: { publicUrl: '' } }),
      }),
    },
  };
};

// Public client for browser use - with proper try/catch
let supabase;
try {
  if (typeof window !== 'undefined') {
    console.log('Attempting to create Supabase browser client');
    const realClient = createBrowserClient(supabaseUrl, supabaseAnonKey);
    console.log('Supabase browser client created successfully');
    
    // Add a direct test to see if realClient is valid
    if (!realClient) {
      console.error('❌ ERROR: realClient is undefined or null after creation');
      supabase = createMockClient();
    } else {
      console.log('✅ SUCCESS: Using real Supabase client in browser');
      supabase = realClient;
    }
  } else {
    console.log('Not in browser environment, using mock client');
    supabase = createMockClient();
  }
} catch (error) {
  console.error('Error creating Supabase client:', error);
  supabase = createMockClient();
}

// Admin client with service role key - with proper try/catch
let supabaseAdmin;
try {
  if (typeof window === 'undefined') { // Server-side only
    supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });
  } else {
    supabaseAdmin = createMockClient();
  }
} catch (error) {
  console.error('Error creating Supabase admin client:', error);
  supabaseAdmin = createMockClient();
}

export { supabase, supabaseAdmin };

// Check if we're in demo mode
export function isDemoMode(): boolean {
  // Set to false to work with real data
  return false;
}

// Database type definitions
export type Database = {
  public: {
    Tables: {
      campaigns: {
        Row: {
          id: string;
          user_id: string;
          title: string;
          description: string | null;
          image_url: string;
          rows: number;
          columns: number;
          pricing_type: 'fixed' | 'sequential' | 'manual';
          price_data: any;
          slug: string;
          created_at: string;
          updated_at: string;
          is_active: boolean;
          sold_squares: number;
        };
        Insert: {
          id?: string;
          user_id: string;
          title: string;
          description?: string | null;
          image_url: string;
          rows: number;
          columns: number;
          pricing_type: 'fixed' | 'sequential' | 'manual';
          price_data: any;
          slug: string;
          created_at?: string;
          updated_at?: string;
          is_active?: boolean;
          sold_squares?: number;
        };
        Update: {
          id?: string;
          user_id?: string;
          title?: string;
          description?: string | null;
          image_url?: string;
          rows?: number;
          columns?: number;
          pricing_type?: 'fixed' | 'sequential' | 'manual';
          price_data?: any;
          slug?: string;
          created_at?: string;
          updated_at?: string;
          is_active?: boolean;
          sold_squares?: number;
        };
      };
      squares: {
        Row: {
          id: string;
          campaign_id: string;
          row: number;
          col: number;
          number: number;
          value: number;
          claimed_by: string | null;
          donor_name: string | null;
          payment_status: 'pending' | 'completed' | 'failed';
          payment_type: 'stripe' | 'cash';
          claimed_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          campaign_id: string;
          row: number;
          col: number;
          number: number;
          value: number;
          claimed_by?: string | null;
          donor_name?: string | null;
          payment_status?: 'pending' | 'completed' | 'failed';
          payment_type?: 'stripe' | 'cash';
          claimed_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          campaign_id?: string;
          row?: number;
          col?: number;
          number?: number;
          value?: number;
          claimed_by?: string | null;
          donor_name?: string | null;
          payment_status?: 'pending' | 'completed' | 'failed';
          payment_type?: 'stripe' | 'cash';
          claimed_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      transactions: {
        Row: {
          id: string;
          campaign_id: string;
          square_ids: string[];
          total: number;
          payment_method: 'stripe' | 'cash';
          donor_email: string | null;
          donor_name: string | null;
          status: 'pending' | 'completed' | 'failed' | 'refunded';
          stripe_payment_intent_id: string | null;
          timestamp: string;
        };
        Insert: {
          id?: string;
          campaign_id: string;
          square_ids: string[];
          total: number;
          payment_method: 'stripe' | 'cash';
          donor_email?: string | null;
          donor_name?: string | null;
          status?: 'pending' | 'completed' | 'failed' | 'refunded';
          stripe_payment_intent_id?: string | null;
          timestamp?: string;
        };
        Update: {
          id?: string;
          campaign_id?: string;
          square_ids?: string[];
          total?: number;
          payment_method?: 'stripe' | 'cash';
          donor_email?: string | null;
          donor_name?: string | null;
          status?: 'pending' | 'completed' | 'failed' | 'refunded';
          stripe_payment_intent_id?: string | null;
          timestamp?: string;
        };
      };
    };
  };
};
