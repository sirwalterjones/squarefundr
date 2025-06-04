import { createServerClient } from '@supabase/ssr';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// Server client creation function
export async function createServerSupabaseClient() {
  return createServerClient(
    supabaseUrl,
    supabaseAnonKey,
    {
      cookies: {
        get(name) {
          try {
            // Import is inside the function to avoid "cookies can only be used in a Server Component" errors
            const { cookies } = require('next/headers');
            return cookies().get(name)?.value;
          } catch {
            return undefined;
          }
        },
        set(name, value, options) {
          try {
            const { cookies } = require('next/headers');
            cookies().set({ name, value, ...options });
          } catch {
            // Ignore set errors
          }
        },
        remove(name, options) {
          try {
            const { cookies } = require('next/headers');
            cookies().set({ name, value: '', ...options });
          } catch {
            // Ignore remove errors
          }
        },
      },
    }
  );
} 