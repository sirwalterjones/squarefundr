import { createClient } from "@supabase/supabase-js";
import { createBrowserClient } from "@supabase/ssr";

// Declare the testSupabaseConnection function on the Window interface
declare global {
  interface Window {
    testSupabaseConnection: () => Promise<{
      success: boolean;
      data?: any;
      error?: any;
    }>;
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
    if (
      typeof window !== "undefined" &&
      window.__SUPABASE_CLIENT_INITIALIZED__
    ) {
      console.warn(
        "Attempted to re-initialize Supabase client when it was already initialized",
      );
      return;
    }

    // Log environment variables presence for debugging (only on client)
    if (typeof window !== "undefined") {
      console.log(
        "ENV Check - NEXT_PUBLIC_SUPABASE_URL:",
        process.env.NEXT_PUBLIC_SUPABASE_URL ? "exists" : "missing",
      );
      console.log(
        "ENV Check - NEXT_PUBLIC_SUPABASE_ANON_KEY:",
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? "exists" : "missing",
      );

      // Log actual values (length only, for security)
      console.log(
        "ENV Value Check - URL length:",
        process.env.NEXT_PUBLIC_SUPABASE_URL?.length || 0,
      );
      console.log(
        "ENV Value Check - KEY length:",
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.length || 0,
      );
      
      // Log first few characters to help identify if URL is correct
      const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
      if (url) {
        console.log(
          "ENV URL Check - starts with https://:",
          url.startsWith("https://")
        );
        console.log(
          "ENV URL Check - contains supabase:",
          url.includes("supabase")
        );
        console.log(
          "ENV URL Check - first 20 chars:",
          url.substring(0, 20) + "..."
        );
      }
    }

    this.initializeClients();

    // Mark as initialized in window object to prevent duplicates
    if (typeof window !== "undefined") {
      window.__SUPABASE_CLIENT_INITIALIZED__ = true;

      // For debugging: Add a global reference to this singleton
      (window as any).__SUPABASE_SINGLETON__ = this;
    }
  }

  private initializeClients() {
    // Get the environment variables with strict validation
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    if (!supabaseUrl) {
      console.error("ERROR: NEXT_PUBLIC_SUPABASE_URL is required but not set");
    }

    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!supabaseAnonKey) {
      console.error(
        "ERROR: NEXT_PUBLIC_SUPABASE_ANON_KEY is required but not set",
      );
    }

    const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (typeof window === "undefined" && !supabaseServiceRoleKey) {
      console.error("ERROR: SUPABASE_SERVICE_ROLE_KEY is required but not set");
    }

    // ONLY initialize browser client in browser environment
    if (typeof window !== "undefined") {
      // Browser environment - use browser client
      console.log("BROWSER: Creating Supabase browser client (SINGLETON)");
      try {
        if (!supabaseUrl || !supabaseAnonKey) {
          console.error(
            "Cannot create Supabase browser client: missing environment variables",
          );
          this._supabase = this.createMockClient("browser");
        } else {
          this._supabase = createBrowserClient(supabaseUrl, supabaseAnonKey);
          console.log(
            "✅ SUCCESS: Real Supabase browser client initialized (SINGLETON)",
          );

          // Create a test function to verify client works
          window.testSupabaseConnection = async () => {
            try {
              const { data, error } = await this._supabase
                .from("campaigns")
                .select("id")
                .limit(1);
              if (error) throw error;
              console.log("Supabase connection test result:", {
                data,
                success: true,
              });
              return { success: true, data };
            } catch (err) {
              console.error("Supabase connection test failed:", err);
              return { success: false, error: err };
            }
          };
        }
      } catch (error) {
        console.error("Failed to create Supabase browser client:", error);
        this._supabase = this.createMockClient("browser");
      }
    } else {
      // Server environment - mock client only for typing, will be overridden by server client
      this._supabase = this.createMockClient("server browser placeholder");
    }

    // ONLY initialize admin client in server environment
    if (typeof window === "undefined") {
      // Server environment - use server client with service role
      console.log("SERVER: Creating Supabase admin client (SINGLETON)");
      try {
        if (!supabaseUrl || !supabaseServiceRoleKey) {
          console.error(
            "Cannot create Supabase admin client: missing environment variables",
          );
          this._supabaseAdmin = this.createMockClient("server admin");
        } else {
          this._supabaseAdmin = createClient(
            supabaseUrl,
            supabaseServiceRoleKey,
            {
              auth: {
                autoRefreshToken: false,
                persistSession: false,
              },
            },
          );
          console.log(
            "✅ SUCCESS: Real Supabase admin client initialized (SINGLETON)",
          );
        }
      } catch (error) {
        console.error("Failed to create Supabase admin client:", error);
        this._supabaseAdmin = this.createMockClient("server admin");
      }
    } else {
      // Browser environment - mock admin client (should never be used in browser)
      // This is expected behavior - admin clients should only exist on server
      this._supabaseAdmin = this.createQuietMockClient(
        "browser admin placeholder",
      );
    }
  }

  // Create a quiet mock client for expected scenarios (like admin client in browser)
  private createQuietMockClient(context: string) {
    // No warnings for expected mock scenarios
    return this.createBasicMockClient(context);
  }

  // Create a mock client for fallback ONLY if necessary
  private createMockClient(context: string) {
    console.warn(
      `Using mock Supabase client - THIS SHOULD NOT HAPPEN IN PRODUCTION (context: ${context})`,
    );
    console.trace("Mock client creation stack trace");
    return this.createBasicMockClient(context);
  }

  private createBasicMockClient(context: string) {
    const mockError = new Error(
      `Mock Supabase client used in ${context} - this should not happen in production`,
    );

    return {
      auth: {
        getUser: () => Promise.resolve({ data: { user: null }, error: null }),
        getSession: () =>
          Promise.resolve({ data: { session: null }, error: null }),
        signInWithPassword: () =>
          Promise.resolve({ data: { user: null }, error: null }),
        signUp: () => Promise.resolve({ data: { user: null }, error: null }),
        signOut: () => Promise.resolve({ error: null }),
      },
      from: (table: string) => {
        // Log every interaction with the mock client
        console.warn(
          `Mock Supabase client: Attempted to access table '${table}' in ${context}`,
        );

        return {
          select: (columns?: string) => {
            console.warn(
              `Mock Supabase client: select(${columns}) called on table '${table}' in ${context}`,
            );
            return {
              eq: (column: string, value: any) => {
                console.warn(
                  `Mock Supabase client: eq(${column}, ${value}) called on table '${table}' in ${context}`,
                );
                return {
                  single: () =>
                    Promise.resolve({
                      data: null,
                      error: {
                        message: `Mock client cannot return data for ${table}.${column}=${value}`,
                      },
                    }),
                  limit: () =>
                    Promise.resolve({
                      data: [],
                      error: {
                        message: `Mock client cannot return data for ${table}.${column}=${value}`,
                      },
                    }),
                  order: () =>
                    Promise.resolve({
                      data: [],
                      error: {
                        message: `Mock client cannot return data for ${table}.${column}=${value}`,
                      },
                    }),
                };
              },
              order: (column: string) => {
                console.warn(
                  `Mock Supabase client: order(${column}) called on table '${table}' in ${context}`,
                );
                return {
                  limit: () =>
                    Promise.resolve({
                      data: [],
                      error: {
                        message: `Mock client cannot return ordered data for ${table}.${column}`,
                      },
                    }),
                };
              },
              limit: () =>
                Promise.resolve({
                  data: [],
                  error: {
                    message: `Mock client cannot return limited data for ${table}`,
                  },
                }),
            };
          },
          insert: (data: any) => {
            console.warn(
              `Mock Supabase client: insert called on table '${table}' in ${context}`,
              data,
            );
            return Promise.resolve({
              data: null,
              error: {
                message: `Mock client cannot insert data into ${table}`,
              },
            });
          },
          update: (data: any) => {
            console.warn(
              `Mock Supabase client: update called on table '${table}' in ${context}`,
              data,
            );
            return {
              eq: (column: string, value: any) => {
                console.warn(
                  `Mock Supabase client: update.eq(${column}, ${value}) called on table '${table}' in ${context}`,
                );
                return Promise.resolve({
                  data: null,
                  error: {
                    message: `Mock client cannot update data in ${table}.${column}=${value}`,
                  },
                });
              },
            };
          },
          delete: () => {
            console.warn(
              `Mock Supabase client: delete called on table '${table}' in ${context}`,
            );
            return {
              eq: (column: string, value: any) => {
                console.warn(
                  `Mock Supabase client: delete.eq(${column}, ${value}) called on table '${table}' in ${context}`,
                );
                return Promise.resolve({
                  data: null,
                  error: {
                    message: `Mock client cannot delete data from ${table}.${column}=${value}`,
                  },
                });
              },
            };
          },
        };
      },
      storage: {
        from: (bucket: string) => {
          console.warn(
            `Mock Supabase client: storage.from(${bucket}) called in ${context}`,
          );
          return {
            upload: (path: string, file: any) => {
              console.warn(
                `Mock Supabase client: upload(${path}) called for bucket '${bucket}' in ${context}`,
              );
              return Promise.resolve({
                data: { path: "" },
                error: {
                  message: `Mock client cannot upload to ${bucket}/${path}`,
                },
              });
            },
            getPublicUrl: (path: string) => {
              console.warn(
                `Mock Supabase client: getPublicUrl(${path}) called for bucket '${bucket}' in ${context}`,
              );
              return { data: { publicUrl: "" } };
            },
          };
        },
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

// Function to check if current user is admin
export async function isCurrentUserAdmin(): Promise<boolean> {
  try {
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();

    if (error || !user) {
      return false;
    }

    const { data, error: roleError } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "admin")
      .single();

    return !roleError && data !== null;
  } catch (error) {
    console.error("Error checking admin status:", error);
    return false;
  }
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
          pricing_type: "fixed" | "sequential" | "manual";
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
          pricing_type: "fixed" | "sequential" | "manual";
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
          pricing_type?: "fixed" | "sequential" | "manual";
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
          payment_status: "pending" | "completed" | "failed";
          payment_type: "stripe" | "cash";
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
          payment_status?: "pending" | "completed" | "failed";
          payment_type?: "stripe" | "cash";
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
          payment_status?: "pending" | "completed" | "failed";
          payment_type?: "stripe" | "cash";
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
          payment_method: "stripe" | "cash";
          donor_email: string | null;
          donor_name: string | null;
          status: "pending" | "completed" | "failed" | "refunded";
          stripe_payment_intent_id: string | null;
          timestamp: string;
        };
        Insert: {
          id?: string;
          campaign_id: string;
          square_ids: string[];
          total: number;
          payment_method: "stripe" | "cash";
          donor_email?: string | null;
          donor_name?: string | null;
          status?: "pending" | "completed" | "failed" | "refunded";
          stripe_payment_intent_id?: string | null;
          timestamp?: string;
        };
        Update: {
          id?: string;
          campaign_id?: string;
          square_ids?: string[];
          total?: number;
          payment_method?: "stripe" | "cash";
          donor_email?: string | null;
          donor_name?: string | null;
          status?: "pending" | "completed" | "failed" | "refunded";
          stripe_payment_intent_id?: string | null;
          timestamp?: string;
        };
      };
    };
  };
};
