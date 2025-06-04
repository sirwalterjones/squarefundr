// Backward compatibility file for lib/supabase.ts
// Re-exports everything from supabaseClient.ts

export {
  supabase,
  supabaseAdmin,
  isDemoMode
} from './supabaseClient';

export type { Database } from './supabaseClient'; 