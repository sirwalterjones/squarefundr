"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { isCurrentUserAdmin } from "@/lib/supabaseClient";
import { useAuth } from "@/app/client-layout";

export default function Navbar() {
  const { user, signOut } = useAuth();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [newHelpRequests, setNewHelpRequests] = useState(0);

  // Check admin status when user changes
  useEffect(() => {
    const checkAdminStatus = async () => {
      if (user) {
        console.log(`🔍 Checking admin status for user: ${user.email}`);
        
        // Retry logic for admin check
        let retries = 2; // Reduced from 3 to 2 for faster login
        let adminStatus = false;
        
        while (retries > 0) {
          try {
            adminStatus = await isCurrentUserAdmin();
            console.log(`✅ Admin status result: ${adminStatus} (attempt ${3 - retries})`);
            break; // Success, exit retry loop
          } catch (error) {
            retries--;
            console.error(`❌ Admin check failed for ${user.email} (${retries} retries left):`, error);
            
            if (retries > 0) {
              // Wait before retry (shorter backoff: 300ms, 600ms)
              await new Promise(resolve => setTimeout(resolve, 300 * Math.pow(2, 2 - retries)));
            } else {
              // All retries failed - keep previous state to prevent admin link disappearing
              console.error(`🚨 All admin check retries failed for ${user.email}. Keeping previous admin state.`);
              return; // Exit without changing isAdmin state
            }
          }
        }
        
        setIsAdmin(adminStatus);
        
        // Fetch new help requests count for admins
        if (adminStatus) {
          try {
            const response = await fetch("/api/help-request");
            if (response.ok) {
              const data = await response.json();
              const newCount = data.helpRequests?.filter((req: any) => req.status === 'new').length || 0;
              setNewHelpRequests(newCount);
            }
          } catch (error) {
            console.error("Error fetching help requests:", error);
          }
        }
      } else {
        console.log(`👤 No user, setting admin status to false`);
        setIsAdmin(false);
        setNewHelpRequests(0);
      }
    };

    // Add a small delay to ensure user auth is fully loaded
    const timer = setTimeout(() => {
      checkAdminStatus();
    }, 100);

    return () => clearTimeout(timer);
  }, [user]);

  return (
    <nav className="bg-white/95 backdrop-blur-sm border-b border-gray-200 sticky top-0 z-50 shadow-sm">
      <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center space-x-3 group">
            <div className="w-10 h-10 bg-black rounded-full flex items-center justify-center group-hover:scale-110 group-hover:rotate-12 transition-all duration-300 group-hover:shadow-lg">
              <span className="text-white font-bold text-lg group-hover:scale-110 transition-transform duration-300">SF</span>
            </div>
            <span className="text-2xl font-bold text-black group-hover:text-gray-700 transition-colors duration-300">
              SquareFundr
            </span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-2">
            <Link
              href={user ? "/create" : "/auth"}
              className="relative px-4 py-2 text-gray-600 font-medium rounded-lg hover:text-black transition-all duration-300 hover:bg-gray-50 group overflow-hidden"
            >
              <span className="relative z-10">Create Campaign</span>
              <div className="absolute inset-0 bg-gradient-to-r from-blue-500 to-purple-500 opacity-0 group-hover:opacity-10 transition-opacity duration-300"></div>
              <div className="absolute bottom-0 left-0 w-0 h-0.5 bg-gradient-to-r from-blue-500 to-purple-500 group-hover:w-full transition-all duration-300"></div>
            </Link>
            <Link
              href={`${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/fundraiser/team-championship-fund`}
              className="relative px-4 py-2 text-gray-600 font-medium rounded-lg hover:text-black transition-all duration-300 hover:bg-gray-50 group overflow-hidden"
            >
              <span className="relative z-10">View Demo</span>
              <div className="absolute inset-0 bg-gradient-to-r from-green-500 to-blue-500 opacity-0 group-hover:opacity-10 transition-opacity duration-300"></div>
              <div className="absolute bottom-0 left-0 w-0 h-0.5 bg-gradient-to-r from-green-500 to-blue-500 group-hover:w-full transition-all duration-300"></div>
            </Link>
            <Link
              href="/help"
              className="relative px-4 py-2 text-gray-600 font-medium rounded-lg hover:text-black transition-all duration-300 hover:bg-gray-50 group overflow-hidden"
            >
              <span className="relative z-10">Help</span>
              <div className="absolute inset-0 bg-gradient-to-r from-indigo-500 to-purple-500 opacity-0 group-hover:opacity-10 transition-opacity duration-300"></div>
              <div className="absolute bottom-0 left-0 w-0 h-0.5 bg-gradient-to-r from-indigo-500 to-purple-500 group-hover:w-full transition-all duration-300"></div>
            </Link>

            {user ? (
              <>
                <Link
                  href="/dashboard"
                  className="relative px-4 py-2 text-gray-600 font-medium rounded-lg hover:text-black transition-all duration-300 hover:bg-gray-50 group overflow-hidden"
                >
                  <span className="relative z-10">Dashboard</span>
                  <div className="absolute inset-0 bg-gradient-to-r from-purple-500 to-pink-500 opacity-0 group-hover:opacity-10 transition-opacity duration-300"></div>
                  <div className="absolute bottom-0 left-0 w-0 h-0.5 bg-gradient-to-r from-purple-500 to-pink-500 group-hover:w-full transition-all duration-300"></div>
                </Link>
                {isAdmin && (
                  <Link
                    href="/master-admin"
                    className="relative px-4 py-2 text-gray-600 font-medium rounded-lg hover:text-black transition-all duration-300 hover:bg-gray-50 group overflow-hidden"
                  >
                    <span className="relative z-10">Admin</span>
                    {newHelpRequests > 0 && (
                      <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center font-bold shadow-lg">
                        {newHelpRequests}
                      </span>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-r from-red-500 to-orange-500 opacity-0 group-hover:opacity-10 transition-opacity duration-300"></div>
                    <div className="absolute bottom-0 left-0 w-0 h-0.5 bg-gradient-to-r from-red-500 to-orange-500 group-hover:w-full transition-all duration-300"></div>
                  </Link>
                )}
                <button
                  onClick={signOut}
                  className="relative ml-2 border-2 border-black text-black px-6 py-2 rounded-full font-medium hover:bg-black hover:text-white transition-all duration-300 hover:scale-105 hover:shadow-lg group overflow-hidden"
                >
                  <span className="relative z-10">Sign Out</span>
                  <div className="absolute inset-0 bg-black scale-0 group-hover:scale-100 transition-transform duration-300 rounded-full"></div>
                </button>
              </>
            ) : (
              <Link
                href="/auth"
                className="relative ml-2 bg-black text-white px-6 py-2 rounded-full font-medium hover:bg-gray-900 transition-all duration-300 hover:scale-105 hover:shadow-lg group overflow-hidden"
              >
                <span className="relative z-10">Sign In</span>
                <div className="absolute inset-0 bg-gradient-to-r from-gray-800 to-black opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-full"></div>
              </Link>
            )}
          </div>

          {/* Mobile menu button */}
          <button
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="md:hidden p-2 rounded-full hover:bg-gray-100 transition-all duration-300 text-black hover:scale-110 hover:rotate-180 group"
          >
            <svg
              className="w-6 h-6 group-hover:text-purple-600 transition-colors duration-300"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d={isMenuOpen ? "M6 18L18 6M6 6l12 12" : "M4 6h16M4 12h16M4 18h16"}
              />
            </svg>
          </button>
        </div>

        {/* Mobile Navigation */}
        {isMenuOpen && (
          <div className="md:hidden py-4 border-t border-gray-200 bg-gradient-to-b from-gray-50 to-white animate-in slide-in-from-top duration-300">
            <div className="flex flex-col space-y-2">
              <Link
                href={user ? "/create" : "/auth"}
                className="relative text-gray-600 hover:text-black transition-all duration-300 py-3 px-4 font-medium rounded-lg hover:bg-gradient-to-r hover:from-blue-50 hover:to-purple-50 group"
                onClick={() => setIsMenuOpen(false)}
              >
                <span className="relative z-10">Create Campaign</span>
                <div className="absolute left-0 bottom-0 w-0 h-1 bg-gradient-to-r from-blue-500 to-purple-500 group-hover:w-full transition-all duration-300 rounded-full"></div>
              </Link>
              <Link
                href={`${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/fundraiser/team-championship-fund`}
                className="relative text-gray-600 hover:text-black transition-all duration-300 py-3 px-4 font-medium rounded-lg hover:bg-gradient-to-r hover:from-green-50 hover:to-blue-50 group"
                onClick={() => setIsMenuOpen(false)}
              >
                <span className="relative z-10">View Demo</span>
                <div className="absolute left-0 bottom-0 w-0 h-1 bg-gradient-to-r from-green-500 to-blue-500 group-hover:w-full transition-all duration-300 rounded-full"></div>
              </Link>

              {user ? (
                <>
                  <Link
                    href="/dashboard"
                    className="relative text-gray-600 hover:text-black transition-all duration-300 py-3 px-4 font-medium rounded-lg hover:bg-gradient-to-r hover:from-purple-50 hover:to-pink-50 group"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    <span className="relative z-10">Dashboard</span>
                    <div className="absolute left-0 bottom-0 w-0 h-1 bg-gradient-to-r from-purple-500 to-pink-500 group-hover:w-full transition-all duration-300 rounded-full"></div>
                  </Link>
                  {isAdmin && (
                    <Link
                      href="/master-admin"
                      className="relative text-gray-600 hover:text-black transition-all duration-300 py-3 px-4 font-medium rounded-lg hover:bg-gradient-to-r hover:from-red-50 hover:to-orange-50 group"
                      onClick={() => setIsMenuOpen(false)}
                    >
                      <span className="relative z-10">Admin</span>
                      <div className="absolute left-0 bottom-0 w-0 h-1 bg-gradient-to-r from-red-500 to-orange-500 group-hover:w-full transition-all duration-300 rounded-full"></div>
                  </Link>
                  )}
                  <button
                    onClick={() => {
                      signOut();
                      setIsMenuOpen(false);
                    }}
                    className="relative border-2 border-black text-black px-6 py-3 mt-2 rounded-full font-medium hover:bg-black hover:text-white transition-all duration-300 text-left hover:scale-105 hover:shadow-lg group overflow-hidden"
                  >
                    <span className="relative z-10">Sign Out</span>
                    <div className="absolute inset-0 bg-black scale-0 group-hover:scale-100 transition-transform duration-300 rounded-full"></div>
                  </button>
                </>
              ) : (
                <Link
                  href="/auth"
                  className="relative bg-black text-white px-6 py-3 mt-2 rounded-full font-medium hover:bg-gray-900 transition-all duration-300 inline-block text-center hover:scale-105 hover:shadow-lg group overflow-hidden"
                  onClick={() => setIsMenuOpen(false)}
                >
                  <span className="relative z-10">Sign In</span>
                  <div className="absolute inset-0 bg-gradient-to-r from-gray-800 to-black opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-full"></div>
                </Link>
              )}
            </div>
          </div>
        )}
      </div>
    </nav>
  );
} 