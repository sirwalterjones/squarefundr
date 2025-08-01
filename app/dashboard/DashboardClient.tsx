"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { User } from "@supabase/supabase-js";
import { Campaign } from "@/types";
import { formatPrice } from "@/utils/pricingUtils";
import EditDonationModal from "@/components/EditDonationModal";
import {
  generatePDFReceipt,
  createReceiptData,
} from "@/utils/receiptGenerator";
import { SelectedSquare } from "@/types";

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
  const [selectedCampaignFilter, setSelectedCampaignFilter] = useState<string>("");
  const [sortField, setSortField] = useState<string>("timestamp");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [selectedDonation, setSelectedDonation] = useState<any>(null);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [donationToDelete, setDonationToDelete] = useState<any>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [deleteCampaignModalOpen, setDeleteCampaignModalOpen] = useState(false);
  const [campaignToDelete, setCampaignToDelete] =
    useState<CampaignWithStats | null>(null);
  const [deletingCampaign, setDeletingCampaign] = useState(false);

  // Load donations on component mount to show count in tab header
  useEffect(() => {
    loadDonations(selectedCampaignFilter || undefined);
  }, []);

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
          "Pragma": "no-cache",
        },
        cache: "no-store",
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
        // Force refresh with cache busting
        console.log('[DASHBOARD] Edit successful, refreshing donations...');
        setTimeout(() => {
          loadDonations();
        }, 100);
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

  const showDeleteCampaignConfirmation = (campaign: CampaignWithStats) => {
    setCampaignToDelete(campaign);
    setDeleteCampaignModalOpen(true);
  };

  const deleteCampaign = async () => {
    if (!campaignToDelete) return;

    setDeletingCampaign(true);
    try {
      console.log("Deleting campaign:", campaignToDelete.id);

      const response = await fetch("/api/delete-campaign", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ campaignId: campaignToDelete.id }),
      });

      const responseData = await response.json();

      if (response.ok) {
        setSuccessMessage("Campaign deleted successfully!");
        setDeleteCampaignModalOpen(false);
        setCampaignToDelete(null);

        // Refresh the page to update the campaigns list
        window.location.reload();
      } else {
        const errorMessage =
          responseData?.error || `Server error (${response.status})`;
        console.error("Error deleting campaign:", errorMessage);
        alert(`Failed to delete campaign: ${errorMessage}`);
      }
    } catch (error) {
      console.error("Network error deleting campaign:", error);
      alert(
        `Failed to delete campaign. Network error: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    } finally {
      setDeletingCampaign(false);
    }
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
          debug: responseData?.debug,
        });

        // Show more detailed error message
        let alertMessage = `Failed to delete donation: ${errorMessage}`;

        if (responseData?.debug) {
          const debug = responseData.debug;
          alertMessage += `\n\nDebug Information:`;
          alertMessage += `\n• Transaction ID: ${debug.searchedId}`;
          alertMessage += `\n• Your campaigns: ${debug.userCampaigns}`;

          if (debug.globalMatch) {
            alertMessage += `\n• Found transaction in campaign: ${debug.globalMatch.campaign_id}`;
            alertMessage += `\n• Belongs to you: ${debug.globalMatch.belongsToUser ? "Yes" : "No"}`;
          } else {
            alertMessage += `\n• Transaction not found in database`;
          }

          if (debug.recentTransactions?.length > 0) {
            alertMessage += `\n• Recent transactions: ${debug.recentTransactions
              .slice(0, 3)
              .map((t) => t.id.substring(0, 8))
              .join(", ")}...`;
          }
        }

        alert(alertMessage);
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

  const downloadReceipt = (donation: any) => {
    try {
      // Find the campaign for this donation
      const campaign =
        campaigns.find((c) => c.id === donation.campaign_id) ||
        donation.campaign;

      if (!campaign) {
        alert("Campaign information not found for this donation.");
        return;
      }

      // Convert square_ids to SelectedSquare format
      const squareIds = Array.isArray(donation.square_ids)
        ? donation.square_ids
        : [];
      const squares: SelectedSquare[] = squareIds.map(
        (id: string, index: number) => ({
          row: Math.floor(index / campaign.columns),
          col: index % campaign.columns,
          number: index + 1,
          value: donation.total / squareIds.length, // Distribute total evenly across squares
        }),
      );

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

  const SortIcon = ({ field }: { field: string }) => {
    if (sortField !== field) {
      return (
        <svg
                                      className="w-4 h-4 text-gray-500"
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
          <h1 className="text-3xl font-bold text-black mb-2">Dashboard</h1>
          <p className="text-gray-600">Welcome back, {user.email}</p>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-6 sm:mb-8">
          <div className="bg-white border border-black rounded-xl p-4 sm:p-6 shadow-sm">
            <div className="text-lg sm:text-2xl font-bold text-green-600">
              {formatPrice(totalRaised)}
            </div>
            <div className="text-xs sm:text-sm text-gray-600">Total Raised</div>
          </div>
          <div className="bg-white border border-black rounded-xl p-4 sm:p-6 shadow-sm">
            <div className="text-lg sm:text-2xl font-bold text-blue-600">
              {totalCampaigns}
            </div>
            <div className="text-xs sm:text-sm text-gray-600">
              Total Campaigns
            </div>
          </div>
          <div className="bg-white border border-black rounded-xl p-4 sm:p-6 shadow-sm">
            <div className="text-lg sm:text-2xl font-bold text-blue-600">
              {activeCampaigns}
            </div>
            <div className="text-xs sm:text-sm text-gray-600">
              Active Campaigns
            </div>
          </div>
          <div className="bg-white border border-black rounded-xl p-4 sm:p-6 shadow-sm">
            <div className="text-lg sm:text-2xl font-bold text-purple-600">
              {totalSquaresClaimed}
            </div>
            <div className="text-xs sm:text-sm text-gray-600">
              Squares Claimed
            </div>
          </div>
        </div>

        <div className="mb-6">
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-8">
              <button
                onClick={() => setSelectedTab("overview")}
                className={`py-3 px-4 border-b-2 font-medium text-sm transition-colors ${
                  selectedTab === "overview"
                    ? "border-blue-500 text-blue-600 bg-blue-50 rounded-t-lg"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 hover:bg-gray-50 rounded-t-lg"
                }`}
              >
                Overview
              </button>
              <button
                onClick={() => setSelectedTab("campaigns")}
                className={`py-3 px-4 border-b-2 font-medium text-sm transition-colors ${
                  selectedTab === "campaigns"
                    ? "border-blue-500 text-blue-600 bg-blue-50 rounded-t-lg"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 hover:bg-gray-50 rounded-t-lg"
                }`}
              >
                Campaigns ({campaigns.length})
              </button>
              <button
                onClick={() => {
                  setSelectedTab("donations");
                  loadDonations(selectedCampaignFilter || undefined);
                }}
                className={`py-3 px-4 border-b-2 font-medium text-sm transition-colors ${
                  selectedTab === "donations"
                    ? "border-blue-500 text-blue-600 bg-blue-50 rounded-t-lg"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 hover:bg-gray-50 rounded-t-lg"
                }`}
              >
                Donations ({donations.length})
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
            <div className="bg-white border border-black rounded-xl p-6 shadow-sm">
              <h2 className="text-xl font-semibold text-black mb-4">
                Quick Actions
              </h2>
              <div className="flex flex-col sm:flex-row gap-4">
                <Link href="/create" className="btn-primary text-center">
                  Create New Campaign
                </Link>
              </div>
            </div>

            <div className="bg-white border border-black rounded-xl p-6 shadow-sm">
              <h2 className="text-xl font-semibold text-black mb-4">
                Recent Campaigns
              </h2>
              {campaigns.length === 0 ? (
                <div className="text-center py-8">
                  <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <svg
                                                  className="w-8 h-8 text-gray-500"
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
                          <div className="mt-2 flex gap-2 justify-end">
                            <Link
                              href={`/fundraiser/${campaign.slug}`}
                              className="px-2 py-1 text-xs border border-black text-black rounded hover:bg-black hover:text-white transition-colors"
                              target="_blank"
                            >
                              View
                            </Link>
                            <button
                              onClick={() => {
                                const url = `${window.location.origin}/fundraiser/${campaign.slug}`;
                                navigator.clipboard.writeText(url).then(() => {
                                  setSuccessMessage("Campaign URL copied to clipboard!");
                                  setTimeout(() => setSuccessMessage(null), 3000);
                                }).catch(() => {
                                  alert("Failed to copy URL. Please copy manually: " + url);
                                });
                              }}
                              className="px-2 py-1 text-xs border border-blue-300 text-blue-600 rounded hover:bg-blue-50 transition-colors"
                            >
                              Copy URL
                            </button>
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
            <div className="bg-white border border-black rounded-xl shadow-sm">
              <div className="p-6 border-b border-black">
                <div className="flex justify-between items-center">
                  <h2 className="text-xl font-semibold text-black">
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
                <div className="divide-y divide-black">
                  {campaigns.map((campaign) => (
                    <motion.div
                      key={campaign.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="p-6 hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
                        <div className="flex items-start space-x-4">
                          <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0">
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
                              className={`w-full h-full flex items-center justify-center text-gray-500 ${campaign.image_url ? "hidden" : ""}`}
                            >
                              <svg
                                className="w-6 h-6 sm:w-8 sm:h-8"
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
                          <div className="flex-1 min-w-0">
                            <h3 className="text-base sm:text-lg font-medium text-black truncate">
                              {campaign.title}
                            </h3>
                            <p className="text-xs sm:text-sm text-gray-600 mb-2">
                              Created{" "}
                              {new Date(
                                campaign.created_at,
                              ).toLocaleDateString()}
                            </p>
                            <div className="flex flex-col sm:flex-row sm:items-center sm:space-x-4 space-y-1 sm:space-y-0 text-xs sm:text-sm">
                              <span className="text-gray-600">
                                {campaign.stats.claimedSquares}/
                                {campaign.stats.totalSquares} squares
                              </span>
                              <span className="text-green-600 font-medium">
                                {formatPrice(campaign.stats.totalRaised)} raised
                              </span>
                              <span
                                className={`px-2 py-1 rounded-full text-xs w-fit ${campaign.is_active ? "bg-green-100 text-green-800 border border-green-300" : "bg-gray-100 text-gray-800 border border-gray-300"}`}
                              >
                                {campaign.is_active ? "Active" : "Inactive"}
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="flex flex-col lg:flex-row lg:items-center space-y-3 lg:space-y-0 lg:space-x-3">
                          <div className="flex flex-wrap gap-2">
                            <button
                              onClick={() => {
                                setSelectedCampaignFilter(campaign.id);
                                setSelectedTab("donations");
                                loadDonations(campaign.id);
                              }}
                              className="px-3 py-2 text-xs sm:text-sm border border-black rounded-lg hover:bg-black hover:text-white transition-colors flex-1 sm:flex-none whitespace-nowrap text-black"
                            >
                              Donations
                            </button>
                            <Link
                              href={`/fundraiser/${campaign.slug}`}
                              className="px-3 py-2 text-xs sm:text-sm border border-black rounded-lg hover:bg-black hover:text-white transition-colors flex-1 sm:flex-none whitespace-nowrap text-center text-black"
                              target="_blank"
                            >
                              View Public
                            </Link>
                            <button
                              onClick={() => {
                                const url = `${window.location.origin}/fundraiser/${campaign.slug}`;
                                navigator.clipboard.writeText(url).then(() => {
                                  setSuccessMessage("Campaign URL copied to clipboard!");
                                  setTimeout(() => setSuccessMessage(null), 3000);
                                }).catch(() => {
                                  alert("Failed to copy URL. Please copy manually: " + url);
                                });
                              }}
                              className="px-3 py-2 text-xs sm:text-sm border border-black text-black rounded-lg hover:bg-gray-50 transition-colors flex-1 sm:flex-none whitespace-nowrap"
                            >
                              Copy URL
                            </button>
                            <Link
                              href={`/edit/${campaign.id}`}
                              className="px-3 py-2 text-xs sm:text-sm bg-white text-black border border-black rounded-lg hover:bg-gray-50 transition-colors flex-1 sm:flex-none whitespace-nowrap text-center"
                            >
                              Edit
                            </Link>
                            <button
                              onClick={() =>
                                showDeleteCampaignConfirmation(campaign)
                              }
                              className="px-3 py-2 text-xs sm:text-sm text-red-600 hover:text-red-700 border border-red-300 rounded-lg hover:bg-red-50 transition-colors flex-1 sm:flex-none whitespace-nowrap"
                            >
                              Delete
                            </button>
                          </div>
                          <div className="text-center lg:text-right lg:ml-4">
                            <div className="text-xl sm:text-2xl font-bold text-black">
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
                            className="bg-black h-2 rounded-full transition-all duration-300"
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
            <div className="bg-white border border-black rounded-xl shadow-sm">
              <div className="p-6 border-b border-black">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                  <h2 className="text-xl font-semibold text-black">
                    Donations ({filteredDonations.length})
                    {selectedCampaignFilter && (
                      <span className="text-sm font-normal text-gray-600 ml-2">
                        • {campaigns.find(c => c.id === selectedCampaignFilter)?.title || "Filtered"}
                      </span>
                    )}
                  </h2>
                  <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
                    <select
                      value={selectedCampaignFilter}
                      onChange={(e) => {
                        setSelectedCampaignFilter(e.target.value);
                        loadDonations(e.target.value || undefined);
                      }}
                      className="px-3 py-2 border border-black rounded-lg focus:ring-2 focus:ring-black focus:border-black bg-white text-black w-full sm:w-48"
                    >
                      <option value="">All Campaigns</option>
                      {campaigns.map((campaign) => (
                        <option key={campaign.id} value={campaign.id}>
                          {campaign.title}
                        </option>
                      ))}
                    </select>
                    <div className="relative">
                      <input
                        type="text"
                        placeholder="Search donations..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10 pr-4 py-2 border border-black rounded-lg focus:ring-2 focus:ring-black focus:border-black w-full sm:w-64 bg-white text-black placeholder-gray-500"
                      />
                      <svg
                        className="absolute left-3 top-2.5 h-5 w-5 text-gray-500"
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
                    {selectedCampaignFilter && (
                      <button
                        onClick={() => {
                          setSelectedCampaignFilter("");
                          loadDonations();
                        }}
                        className="px-3 py-2 text-xs border border-gray-300 text-gray-600 rounded-lg hover:bg-gray-50 transition-colors whitespace-nowrap"
                      >
                        Clear Filter
                      </button>
                    )}
                    <button
                      onClick={() => loadDonations(selectedCampaignFilter || undefined)}
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
                  <table className="mobile-table min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th
                          className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                          onClick={() => handleSort("donor_name")}
                        >
                          <div className="flex items-center space-x-1">
                            <span>Donor</span>
                            <SortIcon field="donor_name" />
                          </div>
                        </th>
                        <th
                          className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                          onClick={() => handleSort("campaign")}
                        >
                          <div className="flex items-center space-x-1">
                            <span>Campaign</span>
                            <SortIcon field="campaign" />
                          </div>
                        </th>
                        <th
                          className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                          onClick={() => handleSort("total")}
                        >
                          <div className="flex items-center space-x-1">
                            <span>Amount</span>
                            <SortIcon field="total" />
                          </div>
                        </th>
                        <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                          Squares
                        </th>
                        <th
                          className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                          onClick={() => handleSort("status")}
                        >
                          <div className="flex items-center space-x-1">
                            <span>Status</span>
                            <SortIcon field="status" />
                          </div>
                        </th>
                        <th
                          className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                          onClick={() => handleSort("payment_method")}
                        >
                          <div className="flex items-center space-x-1">
                            <span>Method</span>
                            <SortIcon field="payment_method" />
                          </div>
                        </th>
                        <th
                          className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                          onClick={() => handleSort("timestamp")}
                        >
                          <div className="flex items-center space-x-1">
                            <span>Date</span>
                            <SortIcon field="timestamp" />
                          </div>
                        </th>
                        <th className="px-3 sm:px-6 py-3 text-right text-xs font-medium text-gray-700 uppercase tracking-wider">
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
                          <td
                            className="px-3 sm:px-6 py-4 whitespace-nowrap"
                            data-label="Donor"
                          >
                            <div>
                              <div className="text-sm font-medium text-gray-900">
                                {donation.donor_name || "Anonymous"}
                              </div>
                              <div className="text-sm text-gray-500">
                                {donation.donor_email || "No email"}
                              </div>
                            </div>
                          </td>
                          <td
                            className="px-3 sm:px-6 py-4 whitespace-nowrap"
                            data-label="Campaign"
                          >
                            <div className="text-sm text-gray-900">
                              {donation.campaign?.title || "Unknown Campaign"}
                            </div>
                          </td>
                          <td
                            className="px-3 sm:px-6 py-4 whitespace-nowrap"
                            data-label="Amount"
                          >
                            <div className="text-sm font-medium text-green-600">
                              {formatPrice(donation.total || 0)}
                            </div>
                          </td>
                          <td
                            className="px-3 sm:px-6 py-4 whitespace-nowrap"
                            data-label="Squares"
                          >
                            <div className="text-sm text-gray-900">
                              {Array.isArray(donation.square_ids)
                                ? donation.square_ids.length
                                : 0}
                            </div>
                          </td>
                          <td
                            className="px-3 sm:px-6 py-4 whitespace-nowrap"
                            data-label="Status"
                          >
                            <span
                              className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${donation.status === "completed" ? "bg-green-100 text-green-800 border border-green-300" : donation.status === "pending" ? "bg-yellow-100 text-yellow-800 border border-yellow-300" : "bg-red-100 text-red-800 border border-red-300"}`}
                            >
                              {donation.status || "unknown"}
                            </span>
                          </td>
                          <td
                            className="px-3 sm:px-6 py-4 whitespace-nowrap"
                            data-label="Method"
                          >
                            <span
                              className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${donation.payment_method === "stripe" ? "bg-blue-100 text-blue-800 border border-blue-300" : "bg-purple-100 text-purple-800 border border-purple-300"}`}
                            >
                              {donation.payment_method || "unknown"}
                            </span>
                          </td>
                          <td
                            className="px-3 sm:px-6 py-4 whitespace-nowrap text-sm text-gray-500"
                            data-label="Date"
                          >
                            <div className="text-gray-900">
                              {new Date(
                                donation.timestamp,
                              ).toLocaleDateString()}
                            </div>
                            <div className="text-xs text-gray-500">
                              {new Date(
                                donation.timestamp,
                              ).toLocaleTimeString()}
                            </div>
                          </td>
                          <td
                            className="px-3 sm:px-6 py-4 whitespace-nowrap text-right text-sm font-medium actions-cell"
                            data-label="Actions"
                          >
                            <div className="flex items-center justify-end space-x-2">
                              <button
                                onClick={() => downloadReceipt(donation)}
                                className="text-purple-600 hover:text-purple-700 px-2 py-1 text-xs border border-purple-300 rounded hover:bg-purple-50 transition-colors"
                                title="Download Receipt"
                              >
                                Receipt
                              </button>
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

      {deleteCampaignModalOpen && (
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
                  Delete Campaign
                </h3>
                <p className="text-sm text-gray-600">
                  This action cannot be undone
                </p>
              </div>
            </div>

            <div className="mb-6">
              <p className="text-gray-700">
                Are you sure you want to delete the campaign{" "}
                <span className="font-semibold">
                  &quot;{campaignToDelete?.title}&quot;
                </span>
                ?
              </p>
              <p className="text-sm text-gray-500 mt-2">
                This will permanently delete the campaign, all its squares, and
                all associated donations. This action cannot be undone.
              </p>
            </div>

            <div className="flex justify-end space-x-3">
              <button
                onClick={() => {
                  setDeleteCampaignModalOpen(false);
                  setCampaignToDelete(null);
                }}
                disabled={deletingCampaign}
                className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={deleteCampaign}
                disabled={deletingCampaign}
                className="px-4 py-2 bg-red-600 text-white hover:bg-red-700 rounded-lg transition-colors disabled:opacity-50 flex items-center"
              >
                {deletingCampaign && (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                )}
                {deletingCampaign ? "Deleting..." : "Delete Campaign"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default DashboardClient;
