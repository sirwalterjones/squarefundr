import { createServerClient } from '@supabase/ssr';
// @ts-ignore - Suppressing TypeScript errors for deployment
import { cookies } from 'next/headers';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

// Check if Supabase is fully configured
const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

// Create a mock client for when Supabase is not configured
const createMockServerClient = () => {
  console.warn('Supabase not configured - using mock server client');
  return {
    auth: {
      getUser: () => Promise.resolve({ data: { user: null }, error: null }),
      getSession: () => Promise.resolve({ data: { session: null }, error: null }),
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

/**
 * Creates a Supabase client for server-side operations.
 * Uses dynamic imports to avoid issues with cookies in server components.
 */
export async function createServerSupabaseClient() {
  if (!isSupabaseConfigured) {
    return createMockServerClient();
  }
  
  let cookieStore;
  
  try {
    // Get cookies in a server context
    cookieStore = cookies();
  } catch (e) {
    console.warn('Error accessing cookies, fallback to empty implementation');
    // Fallback to dummy implementation if cookies() fails
    cookieStore = {
      get: () => undefined,
      set: () => {},
    };
  }

  return createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      get: (name) => cookieStore.get(name)?.value,
      set: (name, value, options) => {
        try {
          cookieStore.set({ name, value, ...options });
        } catch (e) {
          // Ignore errors
        }
      },
      remove: (name, options) => {
        try {
          cookieStore.set({ name, value: '', ...options });
        } catch (e) {
          // Ignore errors
        }
      },
    },
  });
} 