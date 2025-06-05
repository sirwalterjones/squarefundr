import { createClient } from '@supabase/supabase-js';
import { createBrowserClient } from '@supabase/ssr';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

// Check if Supabase is fully configured
const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

// Create a mock client for when Supabase is not configured
const createMockClient = () => {
  console.warn('Supabase not configured - using mock client');
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

// Public client for browser use
export const supabase = isSupabaseConfigured
  ? createBrowserClient(supabaseUrl, supabaseAnonKey)
  : createMockClient() as any;

// Admin client with service role key
export const supabaseAdmin = isSupabaseConfigured && supabaseServiceRoleKey
  ? createClient(supabaseUrl, supabaseServiceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })
  : createMockClient() as any;

// Check if we're in demo mode
export function isDemoMode(): boolean {
  return !isSupabaseConfigured;
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
