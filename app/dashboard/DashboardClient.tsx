"use client";

import React, { useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { User } from "@supabase/supabase-js";
import { Campaign } from "@/types";
import { formatPrice } from "@/utils/pricingUtils";
import EditDonationModal from "@/components/EditDonationModal";

interface CampaignWithStats extends Campaign {
  stats: {
    totalSquares: number;
    claimedSquares: number;
    completedSquares: number;
    totalRaised: number;
    progressPercentage: number;
  };
}

interface DashboardClientProps {
  campaigns: CampaignWithStats[];
  user: User;
}

function DashboardClient({ campaigns, user }: DashboardClientProps) {
  const [selectedTab, setSelectedTab] = useState<
    "overview" | "campaigns" | "donations"
  >("overview");
  const [donations, setDonations] = useState<any[]>([]);
  const [loadingDonations, setLoadingDonations] = useState(false);
  const [donationsError, setDonationsError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [sortField, setSortField] = useState<string>("timestamp");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [selectedDonation, setSelectedDonation] = useState<any>(null);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [donationToDelete, setDonationToDelete] = useState<any>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const totalRaised = campaigns.reduce(
    (sum, campaign) => sum + campaign.stats.totalRaised,
    0,
  );
  const totalCampaigns = campaigns.length;
  const activeCampaigns = campaigns.filter((c) => c.is_active).length;
  const totalSquaresClaimed = campaigns.reduce(
    (sum, campaign) => sum + campaign.stats.claimedSquares,
    0,
  );

  const loadDonations = async (campaignId?: string) => {
    setLoadingDonations(true);
    setDonationsError(null);

    try {
      const url = campaignId
        ? `/api/donations?campaignId=${campaignId}`
        : "/api/donations";

      const response = await fetch(url, {
        headers: {
          "Cache-Control": "no-cache",
        },
      });

      if (response.ok) {
        const data = await response.json();
        setDonations(data.donations || []);
      } else {
        const errorData = await response.json().catch(() => null);
        setDonationsError(
          errorData?.error || `Server error: ${response.status}`,
        );
      }
    } catch (error: any) {
      console.error("Error loading donations:", error);
      setDonationsError("Failed to load donations. Please try again.");
    } finally {
      setLoadingDonations(false);
    }
  };

  const markAsPaid = async (transactionId: string) => {
    try {
      const response = await fetch("/api/mark-donation-paid", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ transactionId }),
      });
      if (response.ok) {
        loadDonations();
      }
    } catch (error) {
      console.error("Error marking donation as paid:", error);
    }
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
      } else {
        const errorData = await response.json();
        console.error("Error updating donation:", errorData);
        alert(
          "Failed to update donation: " + (errorData.error || "Unknown error"),
        );
      }
    } catch (error) {
      console.error("Error updating donation:", error);
      alert("Failed to update donation. Please try again.");
    }
  };

  const showDeleteConfirmation = (donation: any) => {
    setDonationToDelete(donation);
    setDeleteModalOpen(true);
  };

  const deleteDonation = async () => {
    if (!donationToDelete) return;

    try {
      console.log(
        "[DASHBOARD] Deleting donation with ID:",
        donationToDelete.id,
        "(type:",
        typeof donationToDelete.id,
        ")",
      );
      console.log("[DASHBOARD] Full donation object:", donationToDelete);

      const response = await fetch("/api/delete-donation", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ transactionId: donationToDelete.id }),
      });

      let responseData;
      try {
        responseData = await response.json();
      } catch (parseError) {
        console.error("[DASHBOARD] Failed to parse response JSON:", parseError);
        responseData = {
          error: "Invalid server response",
          details: "Response was not valid JSON",
        };
      }

      console.log("[DASHBOARD] Delete response:", {
        status: response.status,
        statusText: response.statusText,
        ok: response.ok,
        data: responseData,
      });

      if (response.ok) {
        setSuccessMessage("Donation deleted successfully!");
        setDeleteModalOpen(false);
        setDonationToDelete(null);

        // Force a fresh reload with a small delay to ensure backend is updated
        setTimeout(() => {
          loadDonations();
        }, 500);

        setTimeout(() => setSuccessMessage(null), 3000);
      } else {
        const errorMessage =
          responseData?.error || `Server error (${response.status})`;
        const errorDetails =
          responseData?.details || response.statusText || "Unknown error";

        console.error("[DASHBOARD] Error deleting donation:", {
          status: response.status,
          error: errorMessage,
          details: errorDetails,
          fullResponse: responseData,
        });

        alert(
          `Failed to delete donation: ${errorMessage}${errorDetails ? ` (${errorDetails})` : ""}`,
        );
      }
    } catch (error) {
      console.error(
        "[DASHBOARD] Network/unexpected error deleting donation:",
        error,
      );
      alert(
        `Failed to delete donation. Network error: ${error instanceof Error ? error.message : "Unknown error"}. Please check your connection and try again.`,
      );
    }
  };

  const filteredDonations = donations.filter((donation) => {
    const searchLower = searchTerm.toLowerCase();
    return (
      (donation.donor_name || "").toLowerCase().includes(searchLower) ||
      (donation.donor_email || "").toLowerCase().includes(searchLower) ||
      (donation.campaign?.title || "").toLowerCase().includes(searchLower) ||
      donation.status.toLowerCase().includes(searchLower) ||
      donation.payment_method.toLowerCase().includes(searchLower)
    );
  });

  const sortedDonations = [...filteredDonations].sort((a, b) => {
    let aValue = a[sortField];
    let bValue = b[sortField];

    if (sortField === "campaign") {
      aValue = a.campaign?.title || "";
      bValue = b.campaign?.title || "";
    }

    if (sortField === "timestamp") {
      aValue = new Date(aValue).getTime();
      bValue = new Date(bValue).getTime();
    }

    if (sortField === "total") {
      aValue = Number(aValue) || 0;
      bValue = Number(bValue) || 0;
    }

    if (typeof aValue === "string" && typeof bValue === "string") {
      aValue = aValue.toLowerCase();
      bValue = bValue.toLowerCase();
    }

    if (sortDirection === "asc") {
      return aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
    } else {
      return aValue > bValue ? -1 : aValue < bValue ? 1 : 0;
    }
  });

  const handleSort = (field: string) => {
    if (sortField !== field) {
      setSortDirection("desc");
    } else {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    }
  };

  const SortIcon = ({ field }: { field: string }) => {
    if (sortField !== field) {
      return (
        <svg
          className="w-4 h-4 text-gray-400"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4"
          />
        </svg>
      );
    }
    return (
      <svg
        className={`w-4 h-4 ${sortDirection === "asc" ? "text-blue-600" : "text-blue-600"}`}
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d={sortDirection === "asc" ? "M5 15l7-7 7 7" : "M19 9l-7 7-7-7"}
        />
      </svg>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container-responsive py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Dashboard</h1>
          <p className="text-gray-600">Welcome back, {user.email}</p>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-xl shadow-sm p-6">
            <div className="text-2xl font-bold text-green-600">
              {formatPrice(totalRaised)}
            </div>
            <div className="text-sm text-gray-600">Total Raised</div>
          </div>
          <div className="bg-white rounded-xl shadow-sm p-6">
            <div className="text-2xl font-bold text-blue-600">
              {totalCampaigns}
            </div>
            <div className="text-sm text-gray-600">Total Campaigns</div>
          </div>
          <div className="bg-white rounded-xl shadow-sm p-6">
            <div className="text-2xl font-bold text-blue-600">
              {activeCampaigns}
            </div>
            <div className="text-sm text-gray-600">Active Campaigns</div>
          </div>
          <div className="bg-white rounded-xl shadow-sm p-6">
            <div className="text-2xl font-bold text-purple-600">
              {totalSquaresClaimed}
            </div>
            <div className="text-sm text-gray-600">Squares Claimed</div>
          </div>
        </div>

        <div className="mb-6">
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-8">
              <button
                onClick={() => setSelectedTab("overview")}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  selectedTab === "overview"
                    ? "border-blue-600 text-blue-600"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                }`}
              >
                Overview
              </button>
              <button
                onClick={() => setSelectedTab("campaigns")}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  selectedTab === "campaigns"
                    ? "border-blue-600 text-blue-600"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                }`}
              >
                Campaigns
              </button>
              <button
                onClick={() => {
                  setSelectedTab("donations");
                  loadDonations();
                }}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  selectedTab === "donations"
                    ? "border-blue-600 text-blue-600"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                }`}
              >
                Donations
              </button>
            </nav>
          </div>
        </div>

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

        {selectedTab === "overview" && (
          <div className="space-y-6">
            <div className="bg-white rounded-xl shadow-sm p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">
                Quick Actions
              </h2>
              <div className="flex flex-col sm:flex-row gap-4">
                <Link href="/create" className="btn-primary text-center">
                  Create New Campaign
                </Link>
                <button className="btn-outline">View Analytics</button>
                <button className="btn-outline">Export Data</button>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">
                Recent Campaigns
              </h2>
              {campaigns.length === 0 ? (
                <div className="text-center py-8">
                  <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <svg
                      className="w-8 h-8 text-gray-400"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
                      />
                    </svg>
                  </div>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    No campaigns yet
                  </h3>
                  <p className="text-gray-600 mb-4">
                    Create your first fundraising campaign to get started.
                  </p>
                  <Link href="/create" className="btn-primary">
                    Create Campaign
                  </Link>
                </div>
              ) : (
                <div className="space-y-4">
                  {campaigns.slice(0, 3).map((campaign) => (
                    <div
                      key={campaign.id}
                      className="border border-gray-200 rounded-lg p-4"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-4">
                          <div className="w-16 h-16 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0">
                            {campaign.image_url ? (
                              <img
                                src={campaign.image_url}
                                alt={campaign.title}
                                className="w-full h-full object-cover"
                                onError={(e) => {
                                  e.currentTarget.style.display = "none";
                                  e.currentTarget.nextElementSibling?.classList.remove(
                                    "hidden",
                                  );
                                }}
                              />
                            ) : null}
                            <div
                              className={`w-full h-full flex items-center justify-center text-gray-400 ${campaign.image_url ? "hidden" : ""}`}
                            >
                              <svg
                                className="w-8 h-8"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2 2v12a2 2 0 002 2z"
                                />
                              </svg>
                            </div>
                          </div>
                          <div>
                            <h3 className="font-medium text-gray-900">
                              {campaign.title}
                            </h3>
                            <p className="text-sm text-gray-600">
                              {campaign.stats.claimedSquares} of{" "}
                              {campaign.stats.totalSquares} squares claimed
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-lg font-semibold text-green-600">
                            {formatPrice(campaign.stats.totalRaised)}
                          </div>
                          <div className="text-sm text-gray-600">
                            {Math.round(campaign.stats.progressPercentage)}%
                            complete
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {selectedTab === "campaigns" && (
          <div className="space-y-6">
            <div className="bg-white rounded-xl shadow-sm">
              <div className="p-6 border-b border-gray-200">
                <div className="flex justify-between items-center">
                  <h2 className="text-xl font-semibold text-gray-900">
                    Your Campaigns
                  </h2>
                  <Link href="/create" className="btn-primary">
                    Create New Campaign
                  </Link>
                </div>
              </div>

              {campaigns.length === 0 ? (
                <div className="p-6 text-center">
                  <p className="text-gray-600">No campaigns found.</p>
                </div>
              ) : (
                <div className="divide-y divide-gray-200">
                  {campaigns.map((campaign) => (
                    <motion.div
                      key={campaign.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="p-6 hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-4">
                          <div className="w-16 h-16 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0">
                            {campaign.image_url ? (
                              <img
                                src={campaign.image_url}
                                alt={campaign.title}
                                className="w-full h-full object-cover"
                                onError={(e) => {
                                  e.currentTarget.style.display = "none";
                                  e.currentTarget.nextElementSibling?.classList.remove(
                                    "hidden",
                                  );
                                }}
                              />
                            ) : null}
                            <div
                              className={`w-full h-full flex items-center justify-center text-gray-400 ${campaign.image_url ? "hidden" : ""}`}
                            >
                              <svg
                                className="w-8 h-8"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2 2v12a2 2 0 002 2z"
                                />
                              </svg>
                            </div>
                          </div>
                          <div>
                            <h3 className="text-lg font-medium text-gray-900">
                              {campaign.title}
                            </h3>
                            <p className="text-sm text-gray-600 mb-2">
                              Created{" "}
                              {new Date(
                                campaign.created_at,
                              ).toLocaleDateString()}
                            </p>
                            <div className="flex items-center space-x-4 text-sm">
                              <span className="text-gray-600">
                                {campaign.stats.claimedSquares}/
                                {campaign.stats.totalSquares} squares
                              </span>
                              <span className="text-green-600 font-medium">
                                {formatPrice(campaign.stats.totalRaised)} raised
                              </span>
                              <span
                                className={`px-2 py-1 rounded-full text-xs ${campaign.is_active ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-800"}`}
                              >
                                {campaign.is_active ? "Active" : "Inactive"}
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center space-x-3">
                          <button
                            onClick={() => {
                              setSelectedTab("donations");
                              loadDonations(campaign.id);
                            }}
                            className="btn-outline"
                          >
                            View Donations
                          </button>
                          <Link
                            href={`/fundraiser/${campaign.slug}`}
                            className="btn-outline"
                            target="_blank"
                          >
                            View Public
                          </Link>
                          <Link
                            href={`/edit/${campaign.id}`}
                            className="btn-secondary"
                          >
                            Edit
                          </Link>
                          <div className="text-right">
                            <div className="text-2xl font-bold text-gray-900">
                              {Math.round(campaign.stats.progressPercentage)}%
                            </div>
                            <div className="text-xs text-gray-600">
                              Complete
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="mt-4">
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div
                            className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                            style={{
                              width: `${campaign.stats.progressPercentage}%`,
                            }}
                          />
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {selectedTab === "donations" && (
          <div className="space-y-6">
            <div className="bg-white rounded-xl shadow-sm">
              <div className="p-6 border-b border-gray-200">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                  <h2 className="text-xl font-semibold text-gray-900">
                    Donations ({filteredDonations.length})
                  </h2>
                  <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
                    <div className="relative">
                      <input
                        type="text"
                        placeholder="Search donations..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 w-full sm:w-64"
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
                    <button
                      onClick={() => loadDonations()}
                      className="btn-outline whitespace-nowrap"
                      disabled={loadingDonations}
                    >
                      {loadingDonations ? "Loading..." : "Refresh"}
                    </button>
                  </div>
                </div>
              </div>

              {loadingDonations ? (
                <div className="p-6 text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
                  <p className="text-gray-600">Loading donations...</p>
                </div>
              ) : donationsError ? (
                <div className="p-6 text-center">
                  <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <svg
                      className="w-8 h-8 text-red-500"
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
                  </div>
                  <p className="text-red-600 mb-4">{donationsError}</p>
                  <button
                    onClick={() => loadDonations()}
                    className="btn-primary"
                  >
                    Try Again
                  </button>
                </div>
              ) : donations.length === 0 ? (
                <div className="p-6 text-center">
                  <p className="text-gray-600">No donations found.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th
                          className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                          onClick={() => handleSort("donor_name")}
                        >
                          <div className="flex items-center space-x-1">
                            <span>Donor</span>
                            <SortIcon field="donor_name" />
                          </div>
                        </th>
                        <th
                          className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                          onClick={() => handleSort("campaign")}
                        >
                          <div className="flex items-center space-x-1">
                            <span>Campaign</span>
                            <SortIcon field="campaign" />
                          </div>
                        </th>
                        <th
                          className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                          onClick={() => handleSort("total")}
                        >
                          <div className="flex items-center space-x-1">
                            <span>Amount</span>
                            <SortIcon field="total" />
                          </div>
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Squares
                        </th>
                        <th
                          className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                          onClick={() => handleSort("status")}
                        >
                          <div className="flex items-center space-x-1">
                            <span>Status</span>
                            <SortIcon field="status" />
                          </div>
                        </th>
                        <th
                          className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                          onClick={() => handleSort("payment_method")}
                        >
                          <div className="flex items-center space-x-1">
                            <span>Method</span>
                            <SortIcon field="payment_method" />
                          </div>
                        </th>
                        <th
                          className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                          onClick={() => handleSort("timestamp")}
                        >
                          <div className="flex items-center space-x-1">
                            <span>Date</span>
                            <SortIcon field="timestamp" />
                          </div>
                        </th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {sortedDonations.map((donation, index) => (
                        <motion.tr
                          key={`${donation.id}-${index}`}
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          transition={{ delay: index * 0.05 }}
                          className="hover:bg-gray-50 transition-colors"
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
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900">
                              {donation.campaign?.title || "Unknown Campaign"}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-medium text-green-600">
                              {formatPrice(donation.total || 0)}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900">
                              {Array.isArray(donation.square_ids)
                                ? donation.square_ids.length
                                : 0}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span
                              className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${donation.status === "completed" ? "bg-green-100 text-green-800" : donation.status === "pending" ? "bg-yellow-100 text-yellow-800" : "bg-red-100 text-red-800"}`}
                            >
                              {donation.status || "unknown"}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span
                              className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${donation.payment_method === "stripe" ? "bg-blue-100 text-blue-800" : "bg-purple-100 text-purple-800"}`}
                            >
                              {donation.payment_method || "unknown"}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            <div>
                              {new Date(
                                donation.timestamp,
                              ).toLocaleDateString()}
                            </div>
                            <div className="text-xs">
                              {new Date(
                                donation.timestamp,
                              ).toLocaleTimeString()}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                            <div className="flex items-center justify-end space-x-2">
                              <button
                                onClick={() => editDonation(donation)}
                                className="text-blue-600 hover:text-blue-700 px-2 py-1 text-xs border border-blue-300 rounded hover:bg-blue-50 transition-colors"
                              >
                                Edit
                              </button>
                              {donation.payment_method === "cash" &&
                                donation.status === "pending" && (
                                  <button
                                    onClick={() => markAsPaid(donation.id)}
                                    className="text-green-600 hover:text-green-700 px-2 py-1 text-xs border border-green-300 rounded hover:bg-green-50 transition-colors"
                                  >
                                    Mark Paid
                                  </button>
                                )}
                              <button
                                onClick={() => showDeleteConfirmation(donation)}
                                className="text-red-600 hover:text-red-700 px-2 py-1 text-xs border border-red-300 rounded hover:bg-red-50 transition-colors"
                              >
                                Delete
                              </button>
                            </div>
                          </td>
                        </motion.tr>
                      ))}
                    </tbody>
                  </table>

                  {filteredDonations.length === 0 && searchTerm && (
                    <div className="p-6 text-center">
                      <p className="text-gray-600">
                        No donations found matching &quot;{searchTerm}&quot;
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      <EditDonationModal
        isOpen={editModalOpen}
        onClose={() => {
          setEditModalOpen(false);
          setSelectedDonation(null);
        }}
        donation={selectedDonation}
        onSave={saveEditedDonation}
      />

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
                  Delete Donation
                </h3>
                <p className="text-sm text-gray-600">
                  This action cannot be undone
                </p>
              </div>
            </div>

            <div className="mb-6">
              <p className="text-gray-700">
                Are you sure you want to delete the donation from{" "}
                <span className="font-semibold">
                  {donationToDelete?.donor_name || "Anonymous"}
                </span>{" "}
                for{" "}
                <span className="font-semibold text-green-600">
                  {formatPrice(donationToDelete?.total || 0)}
                </span>
                ?
              </p>
              <p className="text-sm text-gray-500 mt-2">
                This will make the squares available for other donors.
              </p>
            </div>

            <div className="flex justify-end space-x-3">
              <button
                onClick={() => {
                  setDeleteModalOpen(false);
                  setDonationToDelete(null);
                }}
                className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={deleteDonation}
                className="px-4 py-2 bg-red-600 text-white hover:bg-red-700 rounded-lg transition-colors"
              >
                Delete Donation
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default DashboardClient;
