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
          } catch (error) {
            console.error("Error checking admin status:", error);
            setIsAdmin(false);
          }
        } else {
          setIsAdmin(false);
        }
        
        setLoading(false);
        setAuthInitialized(true);
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  const signOut = async () => {
    try {
      // Immediately update UI state
      setUser(null);
      setLoading(false);
      
      // Then perform the actual sign out
      await supabase.auth.signOut();
      window.location.href = "/";
    } catch (error) {
              console.error("Error signing out:", error);
      // Even if sign out fails, clear the user state
      setUser(null);
      setLoading(false);
      window.location.href = "/";
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
