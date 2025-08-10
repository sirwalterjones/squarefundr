"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";

interface NotificationBannerProps {
  isAdmin: boolean;
  user: any;
}

export default function NotificationBanner({ isAdmin, user }: NotificationBannerProps) {
  const [notifications, setNotifications] = useState<any[]>([]);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (!user || !isAdmin) return;

    const fetchNotifications = async () => {
      try {
        const response = await fetch("/api/help-request");
        if (response.ok) {
          const data = await response.json();
          const newHelpRequests = data.helpRequests?.filter((req: any) => req.status === 'new') || [];
          
          if (newHelpRequests.length > 0) {
            setNotifications(newHelpRequests);
            setIsVisible(true);
          }
        }
      } catch (error) {
        console.error("Error fetching notifications:", error);
      }
    };

    fetchNotifications();
    
    // Poll for new notifications every 30 seconds
    const interval = setInterval(fetchNotifications, 30000);
    
    return () => clearInterval(interval);
  }, [user, isAdmin]);

  const dismissNotification = () => {
    setIsVisible(false);
  };

  if (!isAdmin || !user || notifications.length === 0) return null;

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, y: -50 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -50 }}
          className="bg-gradient-to-r from-red-500 to-orange-500 text-white px-4 py-3 shadow-lg"
        >
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="flex-shrink-0">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5l-6.928-7.5c-.768-.833-2.036-.833-2.804 0l-6.928 7.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              </div>
              <div className="flex-1">
                <p className="font-medium">
                  {notifications.length === 1 
                    ? "You have 1 new help request" 
                    : `You have ${notifications.length} new help requests`}
                </p>
                <p className="text-sm opacity-90">
                  {notifications.length === 1 
                    ? `"${notifications[0].subject}" from ${notifications[0].name}`
                    : "Check the admin panel to review all requests"}
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <Link
                href="/master-admin"
                className="bg-white text-red-600 px-4 py-2 rounded-lg font-medium hover:bg-gray-100 transition-colors"
                onClick={dismissNotification}
              >
                View Requests
              </Link>
              <button
                onClick={dismissNotification}
                className="text-white hover:text-gray-200 transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
