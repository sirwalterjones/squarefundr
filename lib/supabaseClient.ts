import { createClient } from '@supabase/supabase-js';
import { createBrowserClient } from '@supabase/ssr';

// Declare the testSupabaseConnection function on the Window interface
declare global {
  interface Window {
    testSupabaseConnection: () => Promise<{ success: boolean, data?: any, error?: any }>;
    __SUPABASE_CLIENT_INITIALIZED__: boolean;
  }
}

// Singleton pattern for Supabase clients
class SupabaseClientSingleton {
  private static instance: SupabaseClientSingleton;
  private _supabase: any;
  private _supabaseAdmin: any;
  private _demoMode: boolean = false;

  private constructor() {
    if (typeof window !== 'undefined' && window.__SUPABASE_CLIENT_INITIALIZED__) {
      console.warn('Attempted to re-initialize Supabase client when it was already initialized');
      return;
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

    this.initializeClients();

    // Mark as initialized in window object to prevent duplicates
    if (typeof window !== 'undefined') {
      window.__SUPABASE_CLIENT_INITIALIZED__ = true;
      
      // For debugging: Add a global reference to this singleton
      (window as any).__SUPABASE_SINGLETON__ = this;
    }
  }

  private initializeClients() {
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

    // ONLY initialize browser client in browser environment
    if (typeof window !== 'undefined') {
      // Browser environment - use browser client
      console.log('BROWSER: Creating Supabase browser client (SINGLETON)');
      try {
        if (!supabaseUrl || !supabaseAnonKey) {
          console.error('Cannot create Supabase browser client: missing environment variables');
          this._supabase = this.createMockClient('browser');
        } else {
          this._supabase = createBrowserClient(supabaseUrl, supabaseAnonKey);
          console.log('✅ SUCCESS: Real Supabase browser client initialized (SINGLETON)');
          
          // Create a test function to verify client works
          window.testSupabaseConnection = async () => {
            try {
              const { data, error } = await this._supabase.from('campaigns').select('id').limit(1);
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
        this._supabase = this.createMockClient('browser');
      }
    } else {
      // Server environment - mock client only for typing, will be overridden by server client
      this._supabase = this.createMockClient('server browser placeholder');
    }

    // ONLY initialize admin client in server environment
    if (typeof window === 'undefined') {
      // Server environment - use server client with service role
      console.log('SERVER: Creating Supabase admin client (SINGLETON)');
      try {
        if (!supabaseUrl || !supabaseServiceRoleKey) {
          console.error('Cannot create Supabase admin client: missing environment variables');
          this._supabaseAdmin = this.createMockClient('server admin');
        } else {
          this._supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey, {
            auth: {
              autoRefreshToken: false,
              persistSession: false
            }
          });
          console.log('✅ SUCCESS: Real Supabase admin client initialized (SINGLETON)');
        }
      } catch (error) {
        console.error('Failed to create Supabase admin client:', error);
        this._supabaseAdmin = this.createMockClient('server admin');
      }
    } else {
      // Browser environment - mock admin client (should never be used in browser)
      this._supabaseAdmin = this.createMockClient('browser admin placeholder');
    }
  }

  // Create a mock client for fallback ONLY if necessary
  private createMockClient(context: string) {
    console.warn(`Using mock Supabase client - THIS SHOULD NOT HAPPEN IN PRODUCTION (context: ${context})`);
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
  }

  public static getInstance(): SupabaseClientSingleton {
    if (!SupabaseClientSingleton.instance) {
      SupabaseClientSingleton.instance = new SupabaseClientSingleton();
    }
    return SupabaseClientSingleton.instance;
  }

  get supabase() {
    return this._supabase;
  }

  get supabaseAdmin() {
    return this._supabaseAdmin;
  }

  isDemoMode(): boolean {
    return this._demoMode;
  }
}

// Export the singleton instance clients
const singleton = SupabaseClientSingleton.getInstance();
const supabase = singleton.supabase;
const supabaseAdmin = singleton.supabaseAdmin;

// Function to check if we're in demo mode
function isDemoMode(): boolean {
  return singleton.isDemoMode();
}

export { supabase, supabaseAdmin, isDemoMode };

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
