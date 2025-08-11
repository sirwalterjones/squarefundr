"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { User } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabaseClient";
import Navbar from "@/components/Navbar";
import NotificationBanner from "@/components/NotificationBanner";
import { TempoInit } from "./tempo-init";
import { isCurrentUserAdmin } from "@/lib/supabaseClient";

interface AuthContextType {
  user: User | null;
  loading: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [authInitialized, setAuthInitialized] = useState(false);

  useEffect(() => {
    // Get initial session
    const getInitialSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        setUser(session?.user ?? null);
      } catch (error) {
        console.error("Error getting initial session:", error);
        setUser(null);
      } finally {
        setLoading(false);
        setAuthInitialized(true);
      }
    };

    getInitialSession();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log("Auth state changed:", event, session?.user?.email || 'none');
        setUser(session?.user ?? null);
        
        // Check admin status
        if (session?.user) {
          try {
            const adminStatus = await isCurrentUserAdmin();
            setIsAdmin(adminStatus);
            // Hint cookie for nav rendering on hard refresh
            if (typeof document !== 'undefined') {
              if (adminStatus) {
                document.cookie = 'sf_is_admin=1; path=/; max-age=60; samesite=lax';
              } else {
                document.cookie = 'sf_is_admin=; path=/; max-age=0; samesite=lax';
              }
            }
          } catch (error) {
            console.error("Error checking admin status:", error);
            setIsAdmin(false);
            if (typeof document !== 'undefined') {
              document.cookie = 'sf_is_admin=; path=/; max-age=0; samesite=lax';
            }
          }
        } else {
          setIsAdmin(false);
          if (typeof document !== 'undefined') {
            document.cookie = 'sf_is_admin=; path=/; max-age=0; samesite=lax';
          }
        }
        
        setLoading(false);
        setAuthInitialized(true);
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  const signOut = async () => {
    try {
      console.log("🚪 Starting sign out process...");
      
      // Immediately update UI state for fast response
      setUser(null);
      setIsAdmin(false);
      setLoading(true);
      
      // Perform the actual sign out to clear session/cookies
      const { error } = await supabase.auth.signOut({ scope: 'global' });
      if (error) {
        console.error("Supabase sign out error:", error);
      }
      
      // Clear any additional storage that might be hanging around
      if (typeof window !== 'undefined') {
        try {
          localStorage.clear();
          sessionStorage.clear();
          
          // Clear any supabase-specific storage
          Object.keys(localStorage).forEach(key => {
            if (key.startsWith('supabase.')) {
              localStorage.removeItem(key);
            }
          });
          
          // Force clear cookies by setting them to expire
          document.cookie.split(";").forEach(cookie => {
            const eqPos = cookie.indexOf("=");
            const name = eqPos > -1 ? cookie.substr(0, eqPos).trim() : cookie.trim();
            if (name.includes('supabase') || name.includes('auth')) {
              document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/;domain=${window.location.hostname}`;
              document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/`;
            }
          });
        } catch (storageError) {
          console.warn("Storage clearing error:", storageError);
        }
      }
      
      console.log("✅ Sign out completed, redirecting...");
      
      // Fast redirect without delay
      window.location.replace("/");
      
    } catch (error) {
      console.error("Error during sign out:", error);
      
      // Even if sign out fails, clear everything and redirect
      setUser(null);
      setIsAdmin(false);
      setLoading(false);
      
      if (typeof window !== 'undefined') {
        localStorage.clear();
        sessionStorage.clear();
        window.location.replace("/");
      }
    }
  };

  const value = {
    user,
    loading: loading || !authInitialized,
    signOut,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

interface ClientLayoutProps {
  children: ReactNode;
}

export default function ClientLayout({ children }: ClientLayoutProps) {
  return (
    <AuthProvider>
      <TempoInit />
      <ClientLayoutInner>{children}</ClientLayoutInner>
    </AuthProvider>
  );
}

function ClientLayoutInner({ children }: ClientLayoutProps) {
  const { user } = useAuth();
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    const checkAdminStatus = async () => {
      if (user) {
        try {
          const adminStatus = await isCurrentUserAdmin();
          setIsAdmin(adminStatus);
        } catch (error) {
          console.error("Error checking admin status:", error);
          setIsAdmin(false);
        }
      } else {
        setIsAdmin(false);
      }
    };

    checkAdminStatus();
  }, [user]);

  return (
    <>
      <Navbar />
      <NotificationBanner isAdmin={isAdmin} user={user} />
      <main className="min-h-screen">{children}</main>
    </>
  );
}
