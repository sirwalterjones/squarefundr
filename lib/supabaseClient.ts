import { createClient } from '@supabase/supabase-js';
import { createBrowserClient } from '@supabase/ssr';

// Declare the testSupabaseConnection function on the Window interface
declare global {
  interface Window {
    testSupabaseConnection: () => Promise<{ success: boolean, data?: any, error?: any }>;
  }
}

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

// Get the environment variables with strict validation
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
if (!supabaseUrl) {
  console.error('ERROR: NEXT_PUBLIC_SUPABASE_URL is required but not set');
}

const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
if (!supabaseAnonKey) {
  console.error('ERROR: NEXT_PUBLIC_SUPABASE_ANON_KEY is required but not set');
}

const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (typeof window === 'undefined' && !supabaseServiceRoleKey) {
  console.error('ERROR: SUPABASE_SERVICE_ROLE_KEY is required but not set');
}

// Force direct definition of our real clients
let supabase: any;
let supabaseAdmin: any;

// Create a mock client for fallback ONLY if necessary
const createMockClient = () => {
  console.warn('Using mock Supabase client - THIS SHOULD NOT HAPPEN IN PRODUCTION');
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

// ONLY initialize browser client in browser environment
if (typeof window !== 'undefined') {
  // Browser environment - use browser client
  console.log('BROWSER: Creating Supabase browser client');
  try {
    if (!supabaseUrl || !supabaseAnonKey) {
      console.error('Cannot create Supabase browser client: missing environment variables');
      supabase = createMockClient();
    } else {
      supabase = createBrowserClient(supabaseUrl, supabaseAnonKey);
      console.log('✅ SUCCESS: Real Supabase browser client initialized');
      
      // Create a test function to verify client works
      window.testSupabaseConnection = async () => {
        try {
          const { data, error } = await supabase.from('campaigns').select('id').limit(1);
          if (error) throw error;
          console.log('Supabase connection test result:', { data, success: true });
          return { success: true, data };
        } catch (err) {
          console.error('Supabase connection test failed:', err);
          return { success: false, error: err };
        }
      };
    }
  } catch (error) {
    console.error('Failed to create Supabase browser client:', error);
    supabase = createMockClient();
  }
} else {
  // Server environment - mock client only for typing, will be overridden by server client
  supabase = createMockClient();
}

// ONLY initialize admin client in server environment
if (typeof window === 'undefined') {
  // Server environment - use server client with service role
  console.log('SERVER: Creating Supabase admin client');
  try {
    if (!supabaseUrl || !supabaseServiceRoleKey) {
      console.error('Cannot create Supabase admin client: missing environment variables');
      supabaseAdmin = createMockClient();
    } else {
      supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey, {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      });
      console.log('✅ SUCCESS: Real Supabase admin client initialized');
    }
  } catch (error) {
    console.error('Failed to create Supabase admin client:', error);
    supabaseAdmin = createMockClient();
  }
} else {
  // Browser environment - mock admin client (should never be used in browser)
  supabaseAdmin = createMockClient();
}

export { supabase, supabaseAdmin };

// Demo mode is ALWAYS false now
export function isDemoMode(): boolean {
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
