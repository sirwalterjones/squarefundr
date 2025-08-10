"use client";

import React, { useState, useEffect } from "react";
import { User } from "@supabase/supabase-js";
import { Campaign, Transaction } from "@/types";
import { formatPrice } from "@/utils/pricingUtils";
import { motion } from "framer-motion";
import EditDonationModal from "@/components/EditDonationModal";
import {
  generatePDFReceipt,
  createReceiptData,
} from "@/utils/receiptGenerator";
import { SelectedSquare } from "@/types";

interface AdminUser {
  id: string;
  email: string;
  created_at: string;
  last_sign_in_at?: string;
  raw_user_meta_data?: {
    full_name?: string;
    name?: string;
  };
}

interface MasterAdminClientProps {
  user: User;
}

function MasterAdminClient({ user }: MasterAdminClientProps) {
  const [selectedTab, setSelectedTab] = useState<
    "campaigns" | "users" | "donations" | "help-requests" | "messaging"
  >("campaigns");
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [donations, setDonations] = useState<any[]>([]);
  const [helpRequests, setHelpRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [selectedDonation, setSelectedDonation] = useState<any>(null);
  const [editUserModalOpen, setEditUserModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<any>(null);
  const [deleteType, setDeleteType] = useState<
    "campaign" | "user" | "donation" | null
  >(null);
  const [helpRequestModalOpen, setHelpRequestModalOpen] = useState(false);
  const [selectedHelpRequest, setSelectedHelpRequest] = useState<any>(null);
  const [adminResponse, setAdminResponse] = useState("");
  const [updatingHelpRequest, setUpdatingHelpRequest] = useState(false);
  const [showArchived, setShowArchived] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [completingId, setCompletingId] = useState<string | null>(null);
  const [campaignOwners, setCampaignOwners] = useState<{
    [key: string]: string;
  }>({});

  // Messaging state
  const [messageModalOpen, setMessageModalOpen] = useState(false);
  const [selectedMessageUser, setSelectedMessageUser] = useState<any>(null);
  const [messageSubject, setMessageSubject] = useState("");
  const [messageContent, setMessageContent] = useState("");
  const [sendingMessage, setSendingMessage] = useState(false);
  const [userSearchQuery, setUserSearchQuery] = useState("");
  const [userSearchResults, setUserSearchResults] = useState<any[]>([]);
  const [showUserDropdown, setShowUserDropdown] = useState(false);
  const [isGlobalMessage, setIsGlobalMessage] = useState(false);

  const loadCampaigns = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/master-admin/campaigns");
      if (response.ok) {
        const data = await response.json();
        setCampaigns(data.campaigns || []);

        // Load owner names for campaigns
        const ownerIds = [
          ...new Set(
            data.campaigns?.map((c: Campaign) => c.user_id).filter(Boolean) ||
              [],
          ),
        ] as string[];
        const ownerNames: { [key: string]: string } = {};

        for (const ownerId of ownerIds) {
          try {
            const userResponse = await fetch(
              `/api/master-admin/users?userId=${ownerId}`,
            );
            if (userResponse.ok) {
              const userData = await userResponse.json();
              const user = userData.users?.[0];
              if (user) {
                ownerNames[ownerId] =
                  user.raw_user_meta_data?.full_name ||
                  user.raw_user_meta_data?.name ||
                  user.email ||
                  ownerId;
              }
            }
          } catch (err) {
            console.error(`Failed to load user ${ownerId}:`, err);
            ownerNames[ownerId] = ownerId;
          }
        }

        setCampaignOwners(ownerNames);
      } else {
        setError("Failed to load campaigns");
      }
    } catch (err) {
      setError("Error loading campaigns");
    } finally {
      setLoading(false);
    }
  };

  const loadUsers = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/master-admin/users");
      if (response.ok) {
        const data = await response.json();
        setUsers(data.users || []);
      } else {
        setError("Failed to load users");
      }
    } catch (err) {
      setError("Error loading users");
    } finally {
      setLoading(false);
    }
  };

  const loadDonations = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/master-admin/donations");
      if (response.ok) {
        const data = await response.json();
        setDonations(data.donations || []);
      } else {
        setError("Failed to load donations");
      }
    } catch (err) {
      setError("Error loading donations");
    } finally {
      setLoading(false);
    }
  };

  const loadHelpRequests = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/help-request");
      if (response.ok) {
        const data = await response.json();
        setHelpRequests(data.helpRequests || []);
      } else {
        setError("Failed to load help requests");
      }
    } catch (err) {
      setError("Error loading help requests");
    } finally {
      setLoading(false);
    }
  };

  // Load all data on component mount to show counts immediately
  useEffect(() => {
    const loadAllData = async () => {
      await Promise.all([
        loadCampaigns(),
        loadUsers(), 
        loadDonations(),
        loadHelpRequests()
      ]);
      setInitialLoading(false);
    };
    loadAllData();
  }, []);

  const handleDelete = async () => {
    if (!itemToDelete || !deleteType) return;

    try {
      const response = await fetch(`/api/master-admin/${deleteType}s`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: itemToDelete.id }),
      });

      if (response.ok) {
        setSuccessMessage(
          `${deleteType.charAt(0).toUpperCase() + deleteType.slice(1)} deleted successfully!`,
        );
        setDeleteModalOpen(false);
        setItemToDelete(null);
        setDeleteType(null);

        // Reload data
        if (deleteType === "campaign") loadCampaigns();
        else if (deleteType === "user") loadUsers();
        else if (deleteType === "donation") loadDonations();

        setTimeout(() => setSuccessMessage(null), 3000);
      } else {
        const errorData = await response.json();
        setError(errorData.error || "Failed to delete item");
      }
    } catch (err) {
      setError("Error deleting item");
    }
  };

  const showDeleteConfirmation = (
    item: any,
    type: "campaign" | "user" | "donation",
  ) => {
    setItemToDelete(item);
    setDeleteType(type);
    setDeleteModalOpen(true);
  };

  const editDonation = (donation: any) => {
    setSelectedDonation(donation);
    setEditModalOpen(true);
  };

  const editUser = (user: AdminUser) => {
    setSelectedUser(user);
    setEditUserModalOpen(true);
  };

  const saveEditedUser = async (data: {
    email: string;
    full_name: string;
  }) => {
    if (!selectedUser) return;
    
    try {
      const response = await fetch("/api/master-admin/users", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: selectedUser.id,
          email: data.email,
          full_name: data.full_name,
        }),
      });

      if (response.ok) {
        loadUsers();
        setSuccessMessage("User updated successfully!");
        setEditUserModalOpen(false);
        setSelectedUser(null);
        setTimeout(() => setSuccessMessage(null), 3000);
      } else {
        const errorData = await response.json();
        setError(errorData.error || "Failed to update user");
      }
    } catch (err) {
      setError("Error updating user");
    }
  };

  const saveEditedDonation = async (data: {
    donorName: string;
    donorEmail: string;
    status: string;
  }) => {
    try {
      const response = await fetch("/api/edit-donation", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          transactionId: selectedDonation.id,
          donorName: data.donorName,
          donorEmail: data.donorEmail,
          status: data.status,
        }),
      });

      if (response.ok) {
        loadDonations();
        setSuccessMessage("Donation updated successfully!");
        setTimeout(() => setSuccessMessage(null), 3000);
      } else {
        const errorData = await response.json();
        setError(errorData.error || "Failed to update donation");
      }
    } catch (err) {
      setError("Error updating donation");
    }
  };

  const completeSquaresNow = async (donation: any) => {
    try {
      setCompletingId(donation.id);
      const response = await fetch("/api/mark-donation-paid", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ transactionId: donation.id }),
      });

      const result = await response.json().catch(() => ({}));

      if (response.ok) {
        setSuccessMessage(
          `Squares updated${typeof result.squaresReserved === "number" ? ` (${result.squaresReserved} affected)` : ""}.`,
        );
        loadDonations();
        setTimeout(() => setSuccessMessage(null), 3000);
      } else {
        setError(result?.error || "Failed to complete squares");
      }
    } catch (e) {
      setError("Error completing squares");
    } finally {
      setCompletingId(null);
    }
  };

  const downloadReceipt = async (donation: any) => {
    try {
      // Find the campaign for this donation
      const campaign = campaigns.find((c) => c.id === donation.campaign_id);
      
      if (!campaign) {
        alert("Campaign not found for this donation.");
        return;
      }

      // Get the actual squares data for this transaction
      let squares: SelectedSquare[] = [];
      
      if (donation.square_ids && donation.square_ids.length > 0) {
        // Fetch actual square data from the database
        const response = await fetch(`/api/campaigns/${campaign.slug}`);
        if (response.ok) {
          const { squares: campaignSquares } = await response.json();
          
          // Filter to get only the squares for this transaction
          squares = campaignSquares
            .filter((square: any) => donation.square_ids.includes(square.id))
            .map((square: any) => ({
              row: square.row,
              col: square.col,
              number: square.number,
              value: square.value || square.price,
            }));
        }
      }
      
      // If no squares found, create placeholder data
      if (squares.length === 0) {
        const squareIds = donation.square_ids || [];
        squares = squareIds.map((id: string, index: number) => ({
          row: 0,
          col: index,
          number: index + 1,
          value: donation.total / squareIds.length,
        }));
      }

      // Create receipt data
      const receiptData = createReceiptData(
        campaign,
        squares,
        donation.donor_name || "Anonymous",
        donation.donor_email || "No email provided",
        donation.payment_method === "paypal" ? "paypal" : "cash",
        donation.id,
      );

      // Generate and download PDF
      generatePDFReceipt(receiptData);
    } catch (error) {
      console.error("Error generating receipt:", error);
      alert("Failed to generate receipt. Please try again.");
    }
  };

  const viewHelpRequest = (request: any) => {
    setSelectedHelpRequest(request);
    setAdminResponse(request.notes || "");
    setHelpRequestModalOpen(true);
  };

  const updateHelpRequestStatus = async (id: string, status: string) => {
    try {
      const response = await fetch("/api/help-request", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          id,
          status,
          resolved_at: status === 'resolved' ? new Date().toISOString() : null,
        }),
      });

      if (response.ok) {
        setHelpRequests(prev =>
          prev.map(req =>
            req.id === id
              ? { ...req, status, resolved_at: status === 'resolved' ? new Date().toISOString() : req.resolved_at }
              : req
          )
        );
        setSuccessMessage(`Help request ${status === 'resolved' ? 'resolved' : 'updated'} successfully`);
        setTimeout(() => setSuccessMessage(null), 3000);
      } else {
        throw new Error("Failed to update help request");
      }
    } catch (error) {
      console.error("Error updating help request:", error);
      setError("Failed to update help request");
    }
  };

  const saveAdminResponse = async () => {
    if (!selectedHelpRequest || !adminResponse.trim()) return;
    
    setUpdatingHelpRequest(true);
    try {
      const response = await fetch("/api/help-request", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          id: selectedHelpRequest.id,
          notes: adminResponse.trim(),
        }),
      });

      if (response.ok) {
        setHelpRequests(prev =>
          prev.map(req =>
            req.id === selectedHelpRequest.id
              ? { ...req, notes: adminResponse.trim() }
              : req
          )
        );
        setSelectedHelpRequest(prev => ({ ...prev, notes: adminResponse.trim() }));
        setSuccessMessage("Response saved successfully");
        setTimeout(() => setSuccessMessage(null), 3000);
      } else {
        throw new Error("Failed to save response");
      }
    } catch (error) {
      console.error("Error saving response:", error);
      setError("Failed to save response");
    } finally {
      setUpdatingHelpRequest(false);
    }
  };

  const archiveHelpRequest = async (id: string) => {
    try {
      const response = await fetch("/api/help-request", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          id,
          status: "closed",
        }),
      });

      if (response.ok) {
        setHelpRequests(prev =>
          prev.map(req =>
            req.id === id
              ? { ...req, status: "closed" }
              : req
          )
        );
        setSuccessMessage("Help request archived successfully");
        setTimeout(() => setSuccessMessage(null), 3000);
      } else {
        throw new Error("Failed to archive help request");
      }
    } catch (error) {
      console.error("Error archiving help request:", error);
      setError("Failed to archive help request");
    }
  };

  // Messaging functions
  const searchUsers = async (query: string) => {
    if (query.length < 2) {
      setUserSearchResults([]);
      setShowUserDropdown(false);
      return;
    }

    try {
      const response = await fetch(`/api/users-autocomplete?q=${encodeURIComponent(query)}`);
      if (response.ok) {
        const data = await response.json();
        setUserSearchResults(data.users || []);
        setShowUserDropdown(true);
      }
    } catch (error) {
      console.error("Error searching users:", error);
    }
  };

  const selectUser = (user: any) => {
    setSelectedMessageUser(user);
    setUserSearchQuery(user.display);
    setShowUserDropdown(false);
  };

  const openMessageModal = (user?: any, isGlobal: boolean = false) => {
    if (user) {
      setSelectedMessageUser(user);
      setUserSearchQuery(user.display || `${user.name} (${user.email})`);
    } else {
      setSelectedMessageUser(null);
      setUserSearchQuery("");
    }
    setIsGlobalMessage(isGlobal);
    setMessageSubject("");
    setMessageContent("");
    setMessageModalOpen(true);
  };

  const sendMessage = async () => {
    if (isGlobalMessage) {
      if (!messageSubject.trim() || !messageContent.trim()) {
        setError("Please fill in both subject and message for global message");
        return;
      }
    } else {
      if (!selectedMessageUser || !messageSubject.trim() || !messageContent.trim()) {
        setError("Please select a user and fill in both subject and message");
        return;
      }
    }

    setSendingMessage(true);
    try {
      const endpoint = isGlobalMessage ? "/api/admin-messages/global" : "/api/admin-messages";
      const body = isGlobalMessage 
        ? {
            subject: messageSubject,
            message: messageContent,
          }
        : {
            to_user_id: selectedMessageUser.id,
            subject: messageSubject,
            message: messageContent,
          };

      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      });

      if (response.ok) {
        setMessageModalOpen(false);
        const successMsg = isGlobalMessage 
          ? "Global message sent to all users successfully!" 
          : "Message sent successfully!";
        setSuccessMessage(successMsg);
        setTimeout(() => setSuccessMessage(null), 3000);
        
        // Reset form
        setSelectedMessageUser(null);
        setUserSearchQuery("");
        setMessageSubject("");
        setMessageContent("");
        setIsGlobalMessage(false);
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to send message");
      }
    } catch (error) {
      console.error("Error sending message:", error);
      setError(error instanceof Error ? error.message : "Failed to send message");
    } finally {
      setSendingMessage(false);
    }
  };

  const filteredCampaigns = campaigns.filter(
    (campaign) =>
      campaign.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      campaign.slug.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  const filteredUsers = users.filter((user) =>
    user.email.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  const filteredDonations = donations.filter(
    (donation) =>
      (donation.donor_name || "")
        .toLowerCase()
        .includes(searchTerm.toLowerCase()) ||
      (donation.donor_email || "")
        .toLowerCase()
        .includes(searchTerm.toLowerCase()) ||
      (donation.campaign?.title || "")
        .toLowerCase()
        .includes(searchTerm.toLowerCase()),
  );

  const filteredHelpRequests = helpRequests.filter(
    (request) => {
      // Filter by archive status
      const archiveFilter = showArchived || request.status !== 'closed';
      
      // Filter by search term
      const searchFilter = 
        request.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        request.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        request.subject?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        request.message?.toLowerCase().includes(searchTerm.toLowerCase());
      
      return archiveFilter && searchFilter;
    }
  );

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container-responsive py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Master Admin
          </h1>
          <p className="text-gray-600">
            Manage all campaigns, users, and donations
          </p>
        </div>

        {/* Tab Navigation */}
        <div className="mb-6">
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-8">
              <button
                onClick={() => setSelectedTab("campaigns")}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  selectedTab === "campaigns"
                    ? "border-blue-600 text-blue-600"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                }`}
              >
                Campaigns ({initialLoading ? "..." : campaigns.length})
              </button>
              <button
                onClick={() => setSelectedTab("users")}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  selectedTab === "users"
                    ? "border-blue-600 text-blue-600"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                }`}
              >
                Users ({initialLoading ? "..." : users.length})
              </button>
              <button
                onClick={() => setSelectedTab("donations")}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  selectedTab === "donations"
                    ? "border-blue-600 text-blue-600"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                }`}
              >
                Donations ({initialLoading ? "..." : donations.length})
              </button>
              <button
                onClick={() => setSelectedTab("help-requests")}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  selectedTab === "help-requests"
                    ? "border-blue-600 text-blue-600"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                }`}
              >
                Help Requests ({initialLoading ? "..." : helpRequests.filter(req => req.status !== 'closed').length})
                {helpRequests.filter(req => req.status === 'new').length > 0 && (
                  <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                    {helpRequests.filter(req => req.status === 'new').length} new
                  </span>
                )}
              </button>
              <button
                onClick={() => setSelectedTab("messaging")}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  selectedTab === "messaging"
                    ? "border-blue-600 text-blue-600"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                }`}
              >
                Messaging
              </button>
            </nav>
          </div>
        </div>

        {/* Success Message */}
        {successMessage && (
          <div className="mb-6 bg-green-50 border border-green-200 rounded-lg p-4">
            <div className="flex items-center">
              <svg
                className="w-5 h-5 text-green-600 mr-2"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
              <p className="text-green-800 font-medium">{successMessage}</p>
            </div>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-center">
              <svg
                className="w-5 h-5 text-red-600 mr-2"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <p className="text-red-800 font-medium">{error}</p>
            </div>
          </div>
        )}

        {/* Search Bar */}
        <div className="mb-6">
          <div className="relative max-w-md">
            <input
              type="text"
              placeholder={`Search ${selectedTab}...`}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 w-full"
            />
            <svg
              className="absolute left-3 top-2.5 h-5 w-5 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
          </div>
        </div>

        {/* Content */}
        <div className="bg-white rounded-xl shadow-sm">
          {loading ? (
            <div className="p-6 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-600">Loading {selectedTab}...</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              {selectedTab === "campaigns" && (
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Campaign
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Owner
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Created
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Grid Size
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {filteredCampaigns.map((campaign, index) => (
                      <motion.tr
                        key={campaign.id}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: index * 0.05 }}
                        className="hover:bg-gray-50"
                      >
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="w-10 h-10 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0 mr-4">
                              {campaign.image_url ? (
                                <img
                                  src={campaign.image_url}
                                  alt={campaign.title}
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center text-gray-400">
                                  <svg
                                    className="w-5 h-5"
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                  >
                                    <path
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                      strokeWidth={2}
                                      d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                                    />
                                  </svg>
                                </div>
                              )}
                            </div>
                            <div>
                              <div className="text-sm font-medium text-gray-900">
                                {campaign.title}
                              </div>
                              <div className="text-sm text-gray-500">
                                {campaign.slug}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {campaignOwners[campaign.user_id] || campaign.user_id}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span
                            className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                              campaign.is_active
                                ? "bg-green-100 text-green-800"
                                : "bg-gray-100 text-gray-800"
                            }`}
                          >
                            {campaign.is_active ? "Active" : "Inactive"}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {new Date(campaign.created_at).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {campaign.rows} × {campaign.columns}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <div className="flex items-center justify-end space-x-2">
                            <a
                              href={`/fundraiser/${campaign.slug}`}
                              target="_blank"
                              className="text-blue-600 hover:text-blue-700 px-2 py-1 text-xs border border-blue-300 rounded hover:bg-blue-50"
                            >
                              View
                            </a>
                            <a
                              href={`/edit/${campaign.id}`}
                              className="text-green-600 hover:text-green-700 px-2 py-1 text-xs border border-green-300 rounded hover:bg-green-50"
                            >
                              Edit
                            </a>
                            <button
                              onClick={() =>
                                showDeleteConfirmation(campaign, "campaign")
                              }
                              className="text-red-600 hover:text-red-700 px-2 py-1 text-xs border border-red-300 rounded hover:bg-red-50"
                            >
                              Delete
                            </button>
                          </div>
                        </td>
                      </motion.tr>
                    ))}
                  </tbody>
                </table>
              )}

              {selectedTab === "users" && (
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Email
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        User ID
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Created
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Last Sign In
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {filteredUsers.map((user, index) => (
                      <motion.tr
                        key={user.id}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: index * 0.05 }}
                        className="hover:bg-gray-50"
                      >
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div>
                            <div className="text-sm font-medium text-gray-900">
                              {user.raw_user_meta_data?.full_name ||
                                user.raw_user_meta_data?.name ||
                                user.email}
                            </div>
                            {(user.raw_user_meta_data?.full_name ||
                              user.raw_user_meta_data?.name) && (
                              <div className="text-sm text-gray-500">
                                {user.email}
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {user.id.substring(0, 8)}...
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {new Date(user.created_at).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {user.last_sign_in_at
                            ? new Date(
                                user.last_sign_in_at,
                              ).toLocaleDateString()
                            : "Never"}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <div className="flex items-center justify-end space-x-2">
                            <button
                              onClick={() => editUser(user)}
                              className="text-blue-600 hover:text-blue-700 px-2 py-1 text-xs border border-blue-300 rounded hover:bg-blue-50"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() =>
                                showDeleteConfirmation(user, "user")
                              }
                              className="text-red-600 hover:text-red-700 px-2 py-1 text-xs border border-red-300 rounded hover:bg-red-50"
                            >
                              Delete
                            </button>
                          </div>
                        </td>
                      </motion.tr>
                    ))}
                  </tbody>
                </table>
              )}

              {selectedTab === "donations" && (
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Donor
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Campaign
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Amount
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Squares
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Method
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Date
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {filteredDonations.map((donation, index) => (
                      <motion.tr
                        key={donation.id}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: index * 0.05 }}
                        className="hover:bg-gray-50"
                      >
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div>
                            <div className="text-sm font-medium text-gray-900">
                              {donation.donor_name || "Anonymous"}
                            </div>
                            <div className="text-sm text-gray-500">
                              {donation.donor_email || "No email"}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {donation.campaign?.title || "Unknown Campaign"}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-green-600">
                          {formatPrice(donation.total || 0)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {Array.isArray(donation.square_ids) ? donation.square_ids.length : 0}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span
                            className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                              donation.status === "completed"
                                ? "bg-green-100 text-green-800"
                                : donation.status === "pending"
                                  ? "bg-yellow-100 text-yellow-800"
                                  : "bg-red-100 text-red-800"
                            }`}
                          >
                            {donation.status || "unknown"}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span
                            className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                              donation.payment_method === "stripe"
                                ? "bg-blue-100 text-blue-800"
                                : donation.payment_method === "paypal"
                                  ? "bg-purple-100 text-purple-800"
                                  : "bg-gray-100 text-gray-800"
                            }`}
                          >
                            {donation.payment_method || "unknown"}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {new Date(donation.timestamp).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <div className="flex items-center justify-end space-x-2">
                            <button
                              onClick={() => downloadReceipt(donation)}
                              className="text-purple-600 hover:text-purple-700 px-2 py-1 text-xs border border-purple-300 rounded hover:bg-purple-50 transition-colors"
                              title="Download Receipt"
                            >
                              Receipt
                            </button>
                            {/* Complete Squares button hidden but kept for emergency use
                            {donation.payment_method === "paypal" && (
                              <button
                                onClick={() => completeSquaresNow(donation)}
                                disabled={completingId === donation.id}
                                className="text-purple-600 hover:text-purple-700 px-2 py-1 text-xs border border-purple-300 rounded hover:bg-purple-50 transition-colors disabled:opacity-60"
                                title="Force-complete squares for this PayPal transaction"
                              >
                                {completingId === donation.id ? "Working..." : "Complete Squares"}
                              </button>
                            )}
                            */}
                            <button
                              onClick={() => editDonation(donation)}
                              className="text-blue-600 hover:text-blue-700 px-2 py-1 text-xs border border-blue-300 rounded hover:bg-blue-50"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() =>
                                showDeleteConfirmation(donation, "donation")
                              }
                              className="text-red-600 hover:text-red-700 px-2 py-1 text-xs border border-red-300 rounded hover:bg-red-50"
                            >
                              Delete
                            </button>
                          </div>
                        </td>
                      </motion.tr>
                    ))}
                  </tbody>
                </table>
              )}

              {selectedTab === "help-requests" && (
                <div>
                  {/* Archive Toggle */}
                  <div className="mb-4 flex justify-between items-center">
                    <button
                      onClick={() => setShowArchived(!showArchived)}
                      className={`px-4 py-2 rounded-lg font-medium text-sm transition-colors ${
                        showArchived 
                          ? 'bg-gray-600 text-white hover:bg-gray-700' 
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      {showArchived ? 'Hide Archived' : 'Show Archived'}
                    </button>
                    <div className="text-sm text-gray-600">
                      {showArchived 
                        ? `Showing ${filteredHelpRequests.length} requests (including closed)`
                        : `Showing ${filteredHelpRequests.length} active requests`
                      }
                    </div>
                  </div>
                  
                  <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Name & Email
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Subject
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Priority
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Created
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {filteredHelpRequests.map((request: any) => (
                      <motion.tr
                        key={request.id}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="hover:bg-gray-50"
                      >
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div>
                            <div className="text-sm font-medium text-gray-900">
                              {request.name}
                            </div>
                            <div className="text-sm text-gray-500">
                              {request.email}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm text-gray-900 max-w-xs truncate">
                            {request.subject}
                          </div>
                          <div className="text-xs text-gray-500 max-w-xs truncate">
                            {request.message}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span
                            className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                              request.status === 'new'
                                ? 'bg-red-100 text-red-800'
                                : request.status === 'in_progress'
                                ? 'bg-yellow-100 text-yellow-800'
                                : request.status === 'resolved'
                                ? 'bg-green-100 text-green-800'
                                : request.status === 'closed'
                                ? 'bg-gray-100 text-gray-600'
                                : 'bg-gray-100 text-gray-800'
                            }`}
                          >
                            {request.status.replace('_', ' ')}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span
                            className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                              request.priority === 'urgent'
                                ? 'bg-red-100 text-red-800'
                                : request.priority === 'high'
                                ? 'bg-orange-100 text-orange-800'
                                : request.priority === 'normal'
                                ? 'bg-blue-100 text-blue-800'
                                : 'bg-gray-100 text-gray-800'
                            }`}
                          >
                            {request.priority}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {new Date(request.created_at).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <div className="flex space-x-2">
                            <button
                              onClick={() => viewHelpRequest(request)}
                              className="text-blue-600 hover:text-blue-700 px-2 py-1 text-xs border border-blue-300 rounded hover:bg-blue-50"
                            >
                              View
                            </button>
                            <button
                              onClick={() => updateHelpRequestStatus(request.id, 'in_progress')}
                              disabled={request.status === 'in_progress'}
                              className="text-yellow-600 hover:text-yellow-700 px-2 py-1 text-xs border border-yellow-300 rounded hover:bg-yellow-50 disabled:opacity-50"
                            >
                              Start
                            </button>
                            <button
                              onClick={() => updateHelpRequestStatus(request.id, 'resolved')}
                              disabled={request.status === 'resolved'}
                              className="text-green-600 hover:text-green-700 px-2 py-1 text-xs border border-green-300 rounded hover:bg-green-50 disabled:opacity-50"
                            >
                              Resolve
                            </button>
                            {request.status !== 'closed' && (
                              <button
                                onClick={() => archiveHelpRequest(request.id)}
                                className="text-gray-600 hover:text-gray-700 px-2 py-1 text-xs border border-gray-300 rounded hover:bg-gray-50"
                                title="Archive this request"
                              >
                                Archive
                              </button>
                            )}
                          </div>
                        </td>
                      </motion.tr>
                    ))}
                  </tbody>
                </table>
                </div>
              )}

              {/* Messaging Section */}
              {selectedTab === "messaging" && (
                <div>
                  <div className="mb-6 flex flex-col sm:flex-row gap-4">
                    <button
                      onClick={() => openMessageModal(null, false)}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      📧 Send Individual Message
                    </button>
                    <button
                      onClick={() => openMessageModal(null, true)}
                      className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
                    >
                      📢 Send Global Announcement
                    </button>
                  </div>

                  <div className="bg-white rounded-lg border p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">
                      Admin Messaging Center
                    </h3>
                    <div className="space-y-4">
                      <div className="p-4 bg-blue-50 rounded-lg">
                        <h4 className="font-medium text-blue-900 mb-2">📧 Individual Messages</h4>
                        <p className="text-blue-700 text-sm">
                          Send targeted messages to specific users. Use the user autocomplete to find and select recipients.
                        </p>
                      </div>
                      <div className="p-4 bg-purple-50 rounded-lg">
                        <h4 className="font-medium text-purple-900 mb-2">📢 Global Announcements</h4>
                        <p className="text-purple-700 text-sm">
                          Send important announcements to all users at once. Messages will be prefixed with "[ANNOUNCEMENT]" and delivered to every user's help section.
                        </p>
                      </div>
                      <div className="p-4 bg-yellow-50 rounded-lg">
                        <h4 className="font-medium text-yellow-900 mb-2">💡 Tips</h4>
                        <ul className="text-yellow-700 text-sm space-y-1">
                          <li>• Users will see messages in their dashboard help section</li>
                          <li>• Global messages are great for maintenance notices, feature updates, or important announcements</li>
                          <li>• Individual messages are perfect for customer support or personalized communication</li>
                        </ul>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Empty States */}
              {!loading &&
                selectedTab !== "messaging" &&
                ((selectedTab === "campaigns" &&
                  filteredCampaigns.length === 0) ||
                  (selectedTab === "users" && filteredUsers.length === 0) ||
                  (selectedTab === "donations" &&
                    filteredDonations.length === 0) ||
                  (selectedTab === "help-requests" &&
                    filteredHelpRequests.length === 0)) && (
                  <div className="p-6 text-center">
                    <p className="text-gray-600">
                      {searchTerm
                        ? `No ${selectedTab} found matching "${searchTerm}"`
                        : `No ${selectedTab} found.`}
                    </p>
                  </div>
                )}
            </div>
          )}
        </div>
      </div>

      {/* Edit Donation Modal */}
      <EditDonationModal
        isOpen={editModalOpen}
        onClose={() => {
          setEditModalOpen(false);
          setSelectedDonation(null);
        }}
        donation={selectedDonation}
        onSave={saveEditedDonation}
      />

      {/* Edit User Modal */}
      {editUserModalOpen && selectedUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-gray-900">Edit User</h3>
              <button
                onClick={() => {
                  setEditUserModalOpen(false);
                  setSelectedUser(null);
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                const formData = new FormData(e.currentTarget);
                saveEditedUser({
                  email: formData.get('email') as string,
                  full_name: formData.get('full_name') as string,
                });
              }}
            >
              <div className="space-y-4">
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                    Email
                  </label>
                  <input
                    type="email"
                    id="email"
                    name="email"
                    defaultValue={selectedUser.email}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label htmlFor="full_name" className="block text-sm font-medium text-gray-700 mb-2">
                    Full Name
                  </label>
                  <input
                    type="text"
                    id="full_name"
                    name="full_name"
                    defaultValue={selectedUser.raw_user_meta_data?.full_name || selectedUser.raw_user_meta_data?.name || ''}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div className="bg-gray-50 p-3 rounded-lg">
                  <p className="text-sm text-gray-600">
                    <strong>User ID:</strong> {selectedUser.id.substring(0, 8)}...
                  </p>
                  <p className="text-sm text-gray-600">
                    <strong>Created:</strong> {new Date(selectedUser.created_at).toLocaleDateString()}
                  </p>
                  <p className="text-sm text-gray-600">
                    <strong>Last Sign In:</strong> {selectedUser.last_sign_in_at 
                      ? new Date(selectedUser.last_sign_in_at).toLocaleDateString() 
                      : 'Never'
                    }
                  </p>
                </div>
              </div>

              <div className="flex justify-end space-x-3 mt-6">
                <button
                  type="button"
                  onClick={() => {
                    setEditUserModalOpen(false);
                    setSelectedUser(null);
                  }}
                  className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white hover:bg-blue-700 rounded-lg transition-colors"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <div className="flex items-center mb-4">
              <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mr-4">
                <svg
                  className="w-6 h-6 text-red-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"
                  />
                </svg>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">
                  Delete {deleteType?.charAt(0).toUpperCase()}
                  {deleteType?.slice(1)}
                </h3>
                <p className="text-sm text-gray-600">
                  This action cannot be undone
                </p>
              </div>
            </div>

            <div className="mb-6">
              <p className="text-gray-700">
                Are you sure you want to delete this {deleteType}?
                {deleteType === "campaign" &&
                  " This will also delete all associated squares and donations."}
                {deleteType === "user" &&
                  " This will also delete all their campaigns and donations."}
                {deleteType === "donation" &&
                  " This will make the squares available for other donors."}
              </p>
            </div>

            <div className="flex justify-end space-x-3">
              <button
                onClick={() => {
                  setDeleteModalOpen(false);
                  setItemToDelete(null);
                  setDeleteType(null);
                }}
                className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                className="px-4 py-2 bg-red-600 text-white hover:bg-red-700 rounded-lg transition-colors"
              >
                Delete {deleteType?.charAt(0).toUpperCase()}
                {deleteType?.slice(1)}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Help Request Modal */}
      {helpRequestModalOpen && selectedHelpRequest && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-semibold text-gray-900">
                  Help Request Details
                </h3>
                <button
                  onClick={() => {
                    setHelpRequestModalOpen(false);
                    setSelectedHelpRequest(null);
                    setAdminResponse("");
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Left Column - Request Details */}
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      From
                    </label>
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <div className="font-medium text-lg text-gray-900">{selectedHelpRequest.name}</div>
                      <div className="text-gray-600">{selectedHelpRequest.email}</div>
                      <div className="text-xs text-gray-500 mt-1">
                        Submitted on {new Date(selectedHelpRequest.created_at).toLocaleString()}
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Subject
                    </label>
                    <div className="bg-gray-50 p-4 rounded-lg font-medium text-gray-900">
                      {selectedHelpRequest.subject}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Status
                      </label>
                      <span
                        className={`inline-flex px-3 py-1 text-sm font-semibold rounded-full ${
                          selectedHelpRequest.status === 'new'
                            ? 'bg-red-100 text-red-800'
                            : selectedHelpRequest.status === 'in_progress'
                            ? 'bg-yellow-100 text-yellow-800'
                            : selectedHelpRequest.status === 'resolved'
                            ? 'bg-green-100 text-green-800'
                            : selectedHelpRequest.status === 'closed'
                            ? 'bg-gray-100 text-gray-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}
                      >
                        {selectedHelpRequest.status.replace('_', ' ')}
                      </span>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Priority
                      </label>
                      <span
                        className={`inline-flex px-3 py-1 text-sm font-semibold rounded-full ${
                          selectedHelpRequest.priority === 'urgent'
                            ? 'bg-red-100 text-red-800'
                            : selectedHelpRequest.priority === 'high'
                            ? 'bg-orange-100 text-orange-800'
                            : selectedHelpRequest.priority === 'normal'
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}
                      >
                        {selectedHelpRequest.priority}
                      </span>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Full Message
                    </label>
                    <div className="bg-gray-50 p-4 rounded-lg min-h-[120px] whitespace-pre-wrap text-sm text-gray-900">
                      {selectedHelpRequest.message}
                    </div>
                  </div>
                </div>

                {/* Right Column - Admin Response */}
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Admin Response
                    </label>
                    <textarea
                      value={adminResponse}
                      onChange={(e) => setAdminResponse(e.target.value)}
                      placeholder="Type your response to the user here..."
                      className="w-full h-40 p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
                    />
                    <div className="flex justify-between items-center mt-2">
                      <div className="text-xs text-gray-500">
                        {adminResponse.length}/2000 characters
                      </div>
                      <button
                        onClick={saveAdminResponse}
                        disabled={!adminResponse.trim() || updatingHelpRequest}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      >
                        {updatingHelpRequest ? "Saving..." : "Save Response"}
                      </button>
                    </div>
                  </div>

                  {selectedHelpRequest.notes && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Previous Responses
                      </label>
                      <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg">
                        <div className="whitespace-pre-wrap text-sm text-blue-900">
                          {selectedHelpRequest.notes}
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="bg-gray-50 p-4 rounded-lg">
                    <h4 className="font-medium text-gray-900 mb-2">Quick Actions</h4>
                    <div className="space-y-2">
                      <button
                        onClick={() => updateHelpRequestStatus(selectedHelpRequest.id, 'in_progress')}
                        disabled={selectedHelpRequest.status === 'in_progress'}
                        className="w-full px-4 py-2 text-yellow-700 bg-yellow-100 hover:bg-yellow-200 rounded-lg transition-colors disabled:opacity-50"
                      >
                        {selectedHelpRequest.status === 'in_progress' ? '✓ In Progress' : 'Mark In Progress'}
                      </button>
                      <button
                        onClick={() => updateHelpRequestStatus(selectedHelpRequest.id, 'resolved')}
                        disabled={selectedHelpRequest.status === 'resolved'}
                        className="w-full px-4 py-2 text-green-700 bg-green-100 hover:bg-green-200 rounded-lg transition-colors disabled:opacity-50"
                      >
                        {selectedHelpRequest.status === 'resolved' ? '✓ Resolved' : 'Mark Resolved'}
                      </button>
                      {selectedHelpRequest.status !== 'closed' && (
                        <button
                          onClick={() => {
                            archiveHelpRequest(selectedHelpRequest.id);
                            setHelpRequestModalOpen(false);
                            setSelectedHelpRequest(null);
                            setAdminResponse("");
                          }}
                          className="w-full px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                        >
                          Archive Request
                        </button>
                      )}
                    </div>
                  </div>

                  {selectedHelpRequest.resolved_at && (
                    <div className="text-xs text-gray-500 text-center">
                      Resolved on {new Date(selectedHelpRequest.resolved_at).toLocaleString()}
                    </div>
                  )}
                </div>
              </div>

              <div className="flex justify-center pt-6 border-t mt-6">
                <button
                  onClick={() => {
                    setHelpRequestModalOpen(false);
                    setSelectedHelpRequest(null);
                    setAdminResponse("");
                  }}
                  className="px-6 py-2 bg-gray-600 text-white hover:bg-gray-700 rounded-lg transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Message Modal */}
      {messageModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-semibold text-gray-900">
                  {isGlobalMessage ? "📢 Send Global Announcement" : "📧 Send Message"}
                </h3>
                <button
                  onClick={() => {
                    setMessageModalOpen(false);
                    setSelectedMessageUser(null);
                    setUserSearchQuery("");
                    setMessageSubject("");
                    setMessageContent("");
                    setIsGlobalMessage(false);
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ✕
                </button>
              </div>

              <div className="space-y-4">
                {!isGlobalMessage && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Recipient
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        value={userSearchQuery}
                        onChange={(e) => {
                          setUserSearchQuery(e.target.value);
                          searchUsers(e.target.value);
                        }}
                        placeholder="Type to search for users..."
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                      
                      {/* User Dropdown */}
                      {showUserDropdown && userSearchResults.length > 0 && (
                        <div className="absolute top-full left-0 right-0 bg-white border border-gray-300 rounded-lg mt-1 max-h-60 overflow-y-auto z-10 shadow-lg">
                          {userSearchResults.map((user, index) => (
                            <button
                              key={user.id || index}
                              onClick={() => selectUser(user)}
                              className="w-full px-3 py-2 text-left hover:bg-gray-50 border-b border-gray-100 last:border-b-0"
                            >
                              <div className="font-medium text-gray-900">{user.name}</div>
                              <div className="text-sm text-gray-500">{user.email}</div>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                    {selectedMessageUser && (
                      <div className="mt-2 p-2 bg-green-50 border border-green-200 rounded text-sm">
                        ✓ Selected: <strong>{selectedMessageUser.name}</strong> ({selectedMessageUser.email})
                      </div>
                    )}
                  </div>
                )}

                {isGlobalMessage && (
                  <div className="p-4 bg-purple-50 border border-purple-200 rounded-lg">
                    <p className="text-purple-800 text-sm">
                      <strong>Global Announcement:</strong> This message will be sent to all users and will appear in their help section with the prefix "[ANNOUNCEMENT]".
                    </p>
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Subject
                  </label>
                  <input
                    type="text"
                    value={messageSubject}
                    onChange={(e) => setMessageSubject(e.target.value)}
                    placeholder="Enter message subject..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Message
                  </label>
                  <textarea
                    value={messageContent}
                    onChange={(e) => setMessageContent(e.target.value)}
                    placeholder="Enter your message..."
                    rows={6}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                  <div className="text-sm text-gray-500 mt-1">
                    {messageContent.length} characters
                  </div>
                </div>

                <div className="flex justify-end space-x-3 pt-4">
                  <button
                    onClick={() => {
                      setMessageModalOpen(false);
                      setSelectedMessageUser(null);
                      setUserSearchQuery("");
                      setMessageSubject("");
                      setMessageContent("");
                      setIsGlobalMessage(false);
                    }}
                    className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={sendMessage}
                    disabled={sendingMessage || (!isGlobalMessage && !selectedMessageUser) || !messageSubject.trim() || !messageContent.trim()}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {sendingMessage ? "Sending..." : (isGlobalMessage ? "Send to All Users" : "Send Message")}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default MasterAdminClient;
