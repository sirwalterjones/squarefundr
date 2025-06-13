"use client";

import React, { useState, useEffect } from "react";
import { User } from "@supabase/supabase-js";
import { Campaign, Transaction } from "@/types";
import { formatPrice } from "@/utils/pricingUtils";
import { motion } from "framer-motion";
import EditDonationModal from "@/components/EditDonationModal";

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
    "campaigns" | "users" | "donations"
  >("campaigns");
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [donations, setDonations] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [selectedDonation, setSelectedDonation] = useState<any>(null);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<any>(null);
  const [deleteType, setDeleteType] = useState<
    "campaign" | "user" | "donation" | null
  >(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [campaignOwners, setCampaignOwners] = useState<{
    [key: string]: string;
  }>({});

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
          ...new Set(data.campaigns?.map((c: Campaign) => c.user_id) || []),
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

  useEffect(() => {
    if (selectedTab === "campaigns") {
      loadCampaigns();
    } else if (selectedTab === "users") {
      loadUsers();
    } else if (selectedTab === "donations") {
      loadDonations();
    }
  }, [selectedTab]);

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
                Campaigns ({campaigns.length})
              </button>
              <button
                onClick={() => setSelectedTab("users")}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  selectedTab === "users"
                    ? "border-blue-600 text-blue-600"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                }`}
              >
                Users ({users.length})
              </button>
              <button
                onClick={() => setSelectedTab("donations")}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  selectedTab === "donations"
                    ? "border-blue-600 text-blue-600"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                }`}
              >
                Donations ({donations.length})
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

              {/* Empty States */}
              {!loading &&
                ((selectedTab === "campaigns" &&
                  filteredCampaigns.length === 0) ||
                  (selectedTab === "users" && filteredUsers.length === 0) ||
                  (selectedTab === "donations" &&
                    filteredDonations.length === 0)) && (
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
    </div>
  );
}

export default MasterAdminClient;
