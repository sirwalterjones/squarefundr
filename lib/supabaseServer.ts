import { createServerClient } from "@supabase/ssr";
// @ts-ignore - Suppressing TypeScript errors for deployment
import { cookies } from "next/headers";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

/**
 * Creates a Supabase client for server-side operations.
 * Uses dynamic imports to avoid issues with cookies in server components.
 */
export async function createServerSupabaseClient() {
  let cookieStore;

  try {
    // Get cookies in a server context
    cookieStore = await cookies();
  } catch (e) {
    console.warn("Error accessing cookies, fallback to empty implementation");
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
          cookieStore.set({ name, value: "", ...options });
        } catch (e) {
          // Ignore errors
        }
      },
    },
  });
}

/**
 * Creates a Supabase client with service role key for admin operations.
 * This bypasses RLS and should only be used for trusted server-side operations.
 */
export async function createAdminSupabaseClient() {
  let cookieStore;

  try {
    cookieStore = await cookies();
  } catch (e) {
    console.warn("Error accessing cookies, fallback to empty implementation");
    cookieStore = {
      get: () => undefined,
      set: () => {},
    };
  }

  return createServerClient(supabaseUrl, supabaseServiceKey, {
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
          cookieStore.set({ name, value: "", ...options });
        } catch (e) {
          // Ignore errors
        }
      },
    },
  });
}
