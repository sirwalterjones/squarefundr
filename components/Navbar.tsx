"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { isCurrentUserAdmin } from "@/lib/supabaseClient";
import { useAuth } from "@/app/client-layout";

export default function Navbar() {
  const { user, signOut } = useAuth();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  // Check admin status when user changes
  useEffect(() => {
    const checkAdminStatus = async () => {
      if (user) {
        const adminStatus = await isCurrentUserAdmin();
        setIsAdmin(adminStatus);
      } else {
        setIsAdmin(false);
      }
    };

    checkAdminStatus();
  }, [user]);

  return (
    <nav className="bg-black/95 backdrop-blur-sm border-b border-gray-800 sticky top-0 z-50">
      <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center space-x-3 group">
            <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center group-hover:scale-105 transition-transform duration-200">
              <span className="text-black font-bold text-lg">SF</span>
            </div>
            <span className="text-2xl font-bold text-white">
              SquareFundr
            </span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-8">
            <Link
              href={user ? "/create" : "/auth"}
              className="text-gray-300 hover:text-white transition-colors font-medium"
            >
              Create Campaign
            </Link>
            <Link
              href={`${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/fundraiser/team-championship-fund`}
              className="text-gray-300 hover:text-white transition-colors font-medium"
            >
              View Demo
            </Link>

            {user ? (
              <>
                <Link
                  href="/dashboard"
                  className="text-gray-300 hover:text-white transition-colors font-medium"
                >
                  Dashboard
                </Link>
                {isAdmin && (
                  <Link
                    href="/master-admin"
                    className="text-gray-300 hover:text-white transition-colors font-medium"
                  >
                    Admin
                  </Link>
                )}
                <button
                  onClick={signOut}
                  className="border-2 border-white text-white px-6 py-2 rounded-full font-medium hover:bg-white hover:text-black transition-all duration-200"
                >
                  Sign Out
                </button>
              </>
            ) : (
              <Link
                href="/auth"
                className="bg-white text-black px-6 py-2 rounded-full font-medium hover:bg-gray-100 transition-all duration-200"
              >
                Sign In
              </Link>
            )}
          </div>

          {/* Mobile menu button */}
          <button
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="md:hidden p-2 rounded-full hover:bg-gray-900 transition-colors text-white"
          >
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 6h16M4 12h16M4 18h16"
              />
            </svg>
          </button>
        </div>

        {/* Mobile Navigation */}
        {isMenuOpen && (
          <div className="md:hidden py-4 border-t border-gray-800">
            <div className="flex flex-col space-y-4">
              <Link
                href={user ? "/create" : "/auth"}
                className="text-gray-300 hover:text-white transition-colors py-2 font-medium"
                onClick={() => setIsMenuOpen(false)}
              >
                Create Campaign
              </Link>
              <Link
                href={`${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/fundraiser/team-championship-fund`}
                className="text-gray-300 hover:text-white transition-colors py-2 font-medium"
                onClick={() => setIsMenuOpen(false)}
              >
                View Demo
              </Link>

              {user ? (
                <>
                  <Link
                    href="/dashboard"
                    className="text-gray-300 hover:text-white transition-colors py-2 font-medium"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    Dashboard
                  </Link>
                  {isAdmin && (
                    <Link
                      href="/master-admin"
                      className="text-gray-300 hover:text-white transition-colors py-2 font-medium"
                      onClick={() => setIsMenuOpen(false)}
                    >
                      Admin
                  </Link>
                  )}
                  <button
                    onClick={() => {
                      signOut();
                      setIsMenuOpen(false);
                    }}
                    className="border-2 border-white text-white px-6 py-2 rounded-full font-medium hover:bg-white hover:text-black transition-all duration-200 text-left"
                  >
                    Sign Out
                  </button>
                </>
              ) : (
                <Link
                  href="/auth"
                  className="bg-white text-black px-6 py-2 rounded-full font-medium hover:bg-gray-100 transition-all duration-200 inline-block text-center"
                  onClick={() => setIsMenuOpen(false)}
                >
                  Sign In
                </Link>
              )}
            </div>
          </div>
        )}
      </div>
    </nav>
  );
} 