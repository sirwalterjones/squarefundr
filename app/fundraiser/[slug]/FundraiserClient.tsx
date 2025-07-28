"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Campaign, Square, SelectedSquare } from "@/types";
import GridOverlay from "@/components/GridOverlay";
import PaymentModal from "@/components/PaymentModal";
import { formatPrice, calculateTotalPrice } from "@/utils/pricingUtils";
import {
  generatePDFReceipt,
  createReceiptData,
} from "@/utils/receiptGenerator";
import { supabase } from "@/lib/supabaseClient";

interface FundraiserClientProps {
  slug: string;
  initialCampaign?: Campaign;
  initialSquares?: Square[];
}

export default function FundraiserClient({
  slug,
  initialCampaign,
  initialSquares = [],
}: FundraiserClientProps) {
  const [campaign, setCampaign] = useState<Campaign | null>(
    initialCampaign || null,
  );
  const [squares, setSquares] = useState<Square[]>(initialSquares);
  const [selectedSquares, setSelectedSquares] = useState<SelectedSquare[]>([]);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(!initialCampaign);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showReceiptButton, setShowReceiptButton] = useState(false);
  const [lastReceiptData, setLastReceiptData] = useState<any>(null);

  // Check if this is a demo campaign
  const isDemoMode = slug === "team-championship-fund";

  // Check for success/error messages from URL params
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const success = urlParams.get("success");
    const canceled = urlParams.get("canceled");
    const demo = urlParams.get("demo");
    const donorName = urlParams.get("donor_name");
    const donorEmail = urlParams.get("donor_email");
    const transactionId = urlParams.get("transaction_id");
    const paymentMethod = urlParams.get("payment_method") as
      | "paypal"
      | "cash"
      | null;

    if (success === "true") {
      if (demo === "true" || isDemoMode) {
        setSuccessMessage(
          "Demo Campaign - Start Yours Now! Link to Create Campaign.",
        );
      } else {
        setSuccessMessage(
          "Payment successful! Your squares have been reserved.",
        );

        // If we have receipt data from URL params, prepare receipt download
        if (donorName && donorEmail && paymentMethod && transactionId) {
          // We'll need to get the squares data from the transaction
          // For now, we'll show a generic receipt button
          setShowReceiptButton(true);

          // Store receipt data for later use
          setLastReceiptData({
            donorName,
            donorEmail,
            paymentMethod,
            transactionId,
          });
        }
      }
      // Clear URL params
      window.history.replaceState({}, "", window.location.pathname);
      // Auto-hide success message after 8 seconds to give time for receipt download
      setTimeout(() => {
        setSuccessMessage(null);
        setShowReceiptButton(false);
        setLastReceiptData(null);
      }, 8000);
    } else if (canceled === "true") {
      setErrorMessage("Payment was canceled. Your squares were not reserved.");
      // Clear URL params
      window.history.replaceState({}, "", window.location.pathname);
      // Auto-hide error message after 5 seconds
      setTimeout(() => setErrorMessage(null), 5000);
    }
  }, [isDemoMode]);

  // Load campaign data if not provided initially
  useEffect(() => {
    const loadCampaign = async () => {
      if (initialCampaign) return; // Skip if we already have campaign data

      try {
        setIsLoading(true);

        // Check if this is the demo slug
        if (slug === "team-championship-fund") {
          // Demo campaign data with default config
          const demoConfig = {
            rows: 10,
            columns: 10,
            pricingType: "sequential" as const,
            fixedPrice: 10,
            sequentialStart: 5,
            sequentialIncrement: 2,
            title: "Football Team Championship Fund",
            description:
              "Help our high school football team reach the state championship! We need funds for new equipment, travel expenses, and tournament fees. Every square you purchase brings us closer to our goal and supports our student athletes in their pursuit of excellence.",
            imageUrl:
              "https://images.unsplash.com/photo-1566577739112-5180d4bf9390?w=800&h=600&fit=crop",
          };

          const demoCampaign: Campaign = {
            id: "demo-campaign-1",
            title: demoConfig.title,
            description: demoConfig.description,
            image_url: demoConfig.imageUrl,
            rows: demoConfig.rows,
            columns: demoConfig.columns,
            pricing_type: demoConfig.pricingType,
            price_data: {
              sequential: {
                start: demoConfig.sequentialStart,
                increment: demoConfig.sequentialIncrement,
              },
            },
            user_id: "campaign-owner",
            created_at: new Date().toISOString(),
            slug: slug,
            public_url: `${window.location.origin}/fundraiser/${slug}`,
            paid_to_admin: true,
            is_active: true,
          };

          // Generate squares with some already claimed
          const demoSquares: Square[] = [];
          for (let row = 0; row < demoCampaign.rows; row++) {
            for (let col = 0; col < demoCampaign.columns; col++) {
              const number = row * demoCampaign.columns + col + 1;
              const value =
                demoConfig.sequentialStart +
                (number - 1) * demoConfig.sequentialIncrement;

              // Randomly claim some squares for demo
              const isClaimed = Math.random() < 0.15; // 15% claimed

              demoSquares.push({
                id: `square-${number}`,
                campaign_id: demoCampaign.id,
                row,
                col: col,
                number,
                value,
                claimed_by: isClaimed ? `donor-${number}` : undefined,
                donor_name: isClaimed ? `Supporter ${number}` : undefined,
                payment_status: isClaimed ? "completed" : "pending",
                payment_type: "paypal",
                claimed_at: isClaimed ? new Date().toISOString() : undefined,
              });
            }
          }

          setCampaign(demoCampaign);
          setSquares(demoSquares);
        } else {
          // Load real campaign from database
          const response = await fetch(`/api/campaigns/${slug}`);

          if (!response.ok) {
            throw new Error("Campaign not found");
          }

          const { campaign: realCampaign, squares: realSquares } =
            await response.json();
          setCampaign(realCampaign);
          setSquares(realSquares);
        }
      } catch (error) {
        console.error("Failed to load campaign:", error);
        setCampaign(null);
      } finally {
        setIsLoading(false);
      }
    };

    loadCampaign();
  }, [slug, initialCampaign]);

  // Real-time subscription to squares updates
  useEffect(() => {
    if (!campaign?.id || isDemoMode) return;

    const channel = supabase
      .channel("squares-changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "squares",
          filter: `campaign_id=eq.${campaign.id}`,
        },
        (payload) => {
          if (payload.eventType === "UPDATE") {
            setSquares((prev) =>
              prev.map((square) =>
                square.id === payload.new.id
                  ? { ...square, ...payload.new }
                  : square,
              ),
            );
          }
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [campaign?.id, isDemoMode]);

  const handleSquareSelect = (square: SelectedSquare) => {
    setSelectedSquares((prev) => [...prev, square]);
  };

  const handleSquareDeselect = (square: SelectedSquare) => {
    setSelectedSquares((prev) =>
      prev.filter((s) => !(s.row === square.row && s.col === square.col)),
    );
  };

  const handlePaymentSuccess = async () => {
    if (!campaign) return;

    // Refresh squares data
    setIsLoading(true);
    try {
      if (isDemoMode) {
        // For demo mode, update locally
        const claimedSquareIds = selectedSquares.map(
          (s) => `${s.row}-${s.col}`,
        );
        setSquares((prev) =>
          prev.map((square) => {
            const squareId = `${square.row}-${square.col}`;
            if (claimedSquareIds.includes(squareId)) {
              return {
                ...square,
                claimed_by: "new-donor",
                donor_name: "Anonymous Supporter",
                payment_status: "completed" as const,
                claimed_at: new Date().toISOString(),
              };
            }
            return square;
          }),
        );
      } else {
        // For real campaigns, fetch from database
        const { data: updatedSquares } = await supabase
          .from("squares")
          .select("*")
          .eq("campaign_id", campaign.id)
          .order("number");

        if (updatedSquares) {
          setSquares(updatedSquares);
        }
      }

      setSelectedSquares([]);

      // Show appropriate success message based on demo mode
      if (isDemoMode) {
        setSuccessMessage(
          "Demo Campaign - Start Yours Now! Link to Create Campaign.",
        );
      } else {
        setSuccessMessage(
          "Squares claimed successfully! Payment arrangement confirmed.",
        );
      }
      // Auto-hide success message after 5 seconds
      setTimeout(() => setSuccessMessage(null), 5000);
    } catch (error) {
      console.error("Error refreshing squares:", error);
      setErrorMessage("Error refreshing squares. Please refresh the page.");
      setTimeout(() => setErrorMessage(null), 5000);
    } finally {
      setIsLoading(false);
    }
  };

  const totalSelected = campaign
    ? calculateTotalPrice(
        selectedSquares,
        campaign.pricing_type,
        campaign.price_data,
      )
    : 0;
  // Count squares that are actually claimed (not temp reservations)
  const claimedSquares = squares.filter(
    (s) =>
      s.claimed_by &&
      !s.claimed_by.startsWith("temp_") &&
      s.payment_status === "completed",
  ).length;

  // Debug logging for claimed squares count
  console.log("Claimed squares calculation:", {
    totalSquares: squares.length,
    claimedSquares,
    completedSquares: squares.filter((s) => s.payment_status === "completed")
      .length,
    paypalSquares: squares.filter(
      (s) => s.payment_type === "paypal" && s.payment_status === "completed",
    ).length,
    cashSquares: squares.filter(
      (s) => s.payment_type === "cash" && s.payment_status === "completed",
    ).length,
    tempSquares: squares.filter((s) => s.claimed_by?.startsWith("temp_"))
      .length,
  });
  const totalSquares = campaign ? campaign.rows * campaign.columns : 0;
  const progressPercentage =
    totalSquares > 0 ? (claimedSquares / totalSquares) * 100 : 0;

  const totalRaised = squares
    .filter((s) => s.payment_status === "completed")
    .reduce((sum, s) => sum + s.value, 0);

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setSuccessMessage("Campaign link copied to clipboard!");
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (error) {
      console.error("Copy failed:", error);
      setErrorMessage("Failed to copy link. Please try again.");
      setTimeout(() => setErrorMessage(null), 3000);
    }
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading campaign...</p>
        </div>
      </div>
    );
  }

  // Campaign not found state
  if (!campaign) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">
            Campaign Not Found
          </h1>
          <p className="text-gray-600">
            The fundraiser you're looking for doesn't exist or has been removed.
          </p>
        </div>
      </div>
    );
  }

  const handleShareFacebook = () => {
    const currentUrl = window.location.href;
    const shareText = `${campaign.title} - ${campaign.description || "Help us reach our goal!"}`;
    const shareUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(currentUrl)}&quote=${encodeURIComponent(shareText)}`;
    window.open(shareUrl, "_blank", "width=600,height=400");
  };

  const handleShareInstagram = () => {
    // Instagram doesn't have a direct web share API, so we'll copy the link and show instructions
    handleCopyLink();
    setSuccessMessage(
      "Link copied! Open Instagram and paste the link in your story or post.",
    );
    setTimeout(() => setSuccessMessage(null), 5000);
  };

  const handleNativeShare = async () => {
    if (!campaign) return;

    const shareData = {
      title: campaign.title || "Support this fundraiser",
      text: campaign.description || "Help us reach our goal!",
      url: window.location.href,
    };

    try {
      if (
        navigator.share &&
        navigator.canShare &&
        navigator.canShare(shareData)
      ) {
        await navigator.share(shareData);
      } else {
        // Fallback: copy to clipboard
        await handleCopyLink();
      }
    } catch (error) {
      console.error("Share failed:", error);
      // Fallback to copy link if share fails
      await handleCopyLink();
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Success/Error Messages */}
      {successMessage && (
        <motion.div
          initial={{ opacity: 0, y: -50 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -50 }}
          className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50 bg-green-500 text-white px-6 py-3 rounded-lg shadow-lg max-w-md text-center"
        >
          <div className="flex flex-col items-center space-y-3">
            <div className="flex items-center justify-between w-full">
              <span>{successMessage}</span>
              <button
                onClick={() => {
                  setSuccessMessage(null);
                  setShowReceiptButton(false);
                  setLastReceiptData(null);
                }}
                className="ml-4 text-white hover:text-gray-200"
              >
                ×
              </button>
            </div>
            {showReceiptButton && lastReceiptData && (
              <button
                onClick={() => {
                  // Create receipt with available data
                  const receipt = createReceiptData(
                    campaign,
                    selectedSquares.length > 0 ? selectedSquares : [], // Use selected squares or empty array
                    lastReceiptData.donorName,
                    lastReceiptData.donorEmail,
                    lastReceiptData.paymentMethod,
                    lastReceiptData.transactionId,
                  );
                  generatePDFReceipt(receipt);
                }}
                className="inline-flex items-center space-x-2 bg-white text-green-600 hover:bg-gray-100 px-4 py-2 rounded-lg transition-colors text-sm font-medium border border-green-600"
              >
                <svg
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                  />
                </svg>
                <span>Download Receipt</span>
              </button>
            )}
          </div>
        </motion.div>
      )}

      {errorMessage && (
        <motion.div
          initial={{ opacity: 0, y: -50 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -50 }}
          className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50 bg-red-500 text-white px-6 py-3 rounded-lg shadow-lg max-w-md text-center"
        >
          <div className="flex items-center justify-between">
            <span>{errorMessage}</span>
            <button
              onClick={() => setErrorMessage(null)}
              className="ml-4 text-white hover:text-gray-200"
            >
              ×
            </button>
          </div>
        </motion.div>
      )}

      <div className="container-responsive py-8">
        {/* Campaign Header */}
        <div className="mb-8">
          <h1 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-4">
            {campaign.title}
          </h1>
          {campaign.description && (
            <p className="text-lg text-gray-600 mb-6">{campaign.description}</p>
          )}

          {/* Progress Stats */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6">
            <div className="bg-white rounded-lg p-3 sm:p-4 text-center">
              <div className="text-lg sm:text-2xl font-bold text-blue-600">
                {claimedSquares}
              </div>
              <div className="text-xs sm:text-sm text-gray-600">
                Squares Claimed
              </div>
            </div>
            <div className="bg-white rounded-lg p-3 sm:p-4 text-center">
              <div className="text-lg sm:text-2xl font-bold text-gray-900">
                {totalSquares}
              </div>
              <div className="text-xs sm:text-sm text-gray-600">
                Total Squares
              </div>
            </div>
            <div className="bg-white rounded-lg p-3 sm:p-4 text-center">
              <div className="text-lg sm:text-2xl font-bold text-green-600">
                {formatPrice(totalRaised)}
              </div>
              <div className="text-xs sm:text-sm text-gray-600">Raised</div>
            </div>
            <div className="bg-white rounded-lg p-3 sm:p-4 text-center">
              <div className="text-lg sm:text-2xl font-bold text-gray-900">
                {Math.round(progressPercentage)}%
              </div>
              <div className="text-xs sm:text-sm text-gray-600">Complete</div>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="w-full bg-gray-200 rounded-full h-3 mb-6">
            <motion.div
              className="bg-blue-600 h-3 rounded-full"
              initial={{ width: 0 }}
              animate={{ width: `${progressPercentage}%` }}
              transition={{ duration: 1, ease: "easeOut" }}
            />
          </div>
        </div>

        {/* Main Content */}
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Grid Section */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-xl shadow-sm p-4 sm:p-6">
              <h2 className="text-lg sm:text-xl font-semibold text-gray-900 mb-3 sm:mb-4">
                Select Your Squares
              </h2>
              <p className="text-sm sm:text-base text-gray-600 mb-4 sm:mb-6">
                Tap on available squares to select them for donation. Selected
                squares will be highlighted.
              </p>

              {isLoading ? (
                <div className="flex items-center justify-center h-48 sm:h-64">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                </div>
              ) : (
                <div
                  className="w-full overflow-hidden"
                  style={{
                    paddingBottom: selectedSquares.length > 0 ? "140px" : "0px",
                  }}
                >
                  <GridOverlay
                    campaign={campaign}
                    squares={squares}
                    selectedSquares={selectedSquares}
                    onSquareSelect={handleSquareSelect}
                    onSquareDeselect={handleSquareDeselect}
                    imageUrl={campaign.image_url}
                  />
                </div>
              )}
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Share Campaign */}
            <div className="bg-white rounded-xl shadow-sm p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Share Campaign
              </h3>
              <div className="space-y-3">
                <button
                  onClick={handleCopyLink}
                  className="w-full flex items-center justify-center space-x-2 bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-3 rounded-lg transition-colors"
                >
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                    />
                  </svg>
                  <span className="font-medium">Copy Link</span>
                </button>

                <button
                  onClick={handleShareFacebook}
                  className="w-full flex items-center justify-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-3 rounded-lg transition-colors"
                >
                  <svg
                    className="w-4 h-4"
                    fill="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                  </svg>
                  <span className="font-medium">Share on Facebook</span>
                </button>

                <button
                  onClick={handleNativeShare}
                  className="w-full flex items-center justify-center space-x-2 bg-green-600 hover:bg-green-700 text-white px-4 py-3 rounded-lg transition-colors"
                >
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.367 2.684 3 3 0 00-5.367-2.684z"
                    />
                  </svg>
                  <span className="font-medium">Share</span>
                </button>
              </div>
            </div>

            {/* Demo Mode Notice */}
            {isDemoMode && (
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-6">
                <div className="flex items-start space-x-3">
                  <div className="flex-shrink-0">
                    <svg
                      className="w-5 h-5 text-blue-600 mt-0.5"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        fillRule="evenodd"
                        d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </div>
                  <div>
                    <h4 className="text-sm font-medium text-blue-900 mb-1">
                      This is a demo only.
                    </h4>
                    <p className="text-sm text-blue-700 mb-3">
                      Would you like to create your own campaign?
                    </p>
                    <a
                      href="https://www.squarefundr.com/auth"
                      className="inline-flex items-center text-sm font-medium text-blue-600 hover:text-blue-500 transition-colors"
                    >
                      Create Your Campaign
                      <svg
                        className="w-4 h-4 ml-1"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                        />
                      </svg>
                    </a>
                  </div>
                </div>
              </div>
            )}

            {/* Campaign Info */}
            <div className="bg-white rounded-xl shadow-sm p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                How It Works
              </h3>
              <div className="space-y-3 text-sm text-gray-600">
                <div className="flex items-start space-x-3">
                  <div className="w-6 h-6 bg-blue-50 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-blue-600 text-xs font-bold">1</span>
                  </div>
                  <p>Select one or more squares by clicking on them</p>
                </div>
                <div className="flex items-start space-x-3">
                  <div className="w-6 h-6 bg-blue-50 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-blue-600 text-xs font-bold">2</span>
                  </div>
                  <p>Choose to pay online or mark as cash payment</p>
                </div>
                <div className="flex items-start space-x-3">
                  <div className="w-6 h-6 bg-blue-50 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-blue-600 text-xs font-bold">3</span>
                  </div>
                  <p>Your squares will be reserved.</p>
                </div>
              </div>
            </div>

            {/* Pricing Info */}
            <div className="bg-white rounded-xl shadow-sm p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Pricing
              </h3>
              <div className="text-sm text-gray-600">
                {campaign.pricing_type === "fixed" && (
                  <p>
                    All squares:{" "}
                    <span className="font-medium text-blue-600">
                      {formatPrice(campaign.price_data.fixed || 0)}
                    </span>
                  </p>
                )}
                {campaign.pricing_type === "sequential" &&
                  campaign.price_data.sequential && (
                    <p>
                      Starting at{" "}
                      <span className="font-medium text-blue-600">
                        {formatPrice(campaign.price_data.sequential.start)}
                      </span>
                      , increasing by{" "}
                      <span className="font-medium">
                        {formatPrice(campaign.price_data.sequential.increment)}
                      </span>{" "}
                      per square
                    </p>
                  )}
                {campaign.pricing_type === "manual" && (
                  <p>
                    Each square has individual pricing - hover over squares to
                    see prices
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Floating Selection Summary - Only show when squares are selected */}
        {selectedSquares.length > 0 && (
          <motion.div
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className="fixed bottom-0 left-0 right-0 z-30 bg-white border-t shadow-2xl p-4 sm:p-6"
          >
            <div className="container-responsive">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between space-y-4 sm:space-y-0">
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    Your Selection ({selectedSquares.length} squares)
                  </h3>
                  <div className="flex flex-wrap gap-2 mb-2">
                    {selectedSquares.slice(0, 5).map((square) => (
                      <span
                        key={`${square.row}-${square.col}`}
                        className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
                      >
                        #{square.number} - {formatPrice(square.value)}
                      </span>
                    ))}
                    {selectedSquares.length > 5 && (
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
                        +{selectedSquares.length - 5} more
                      </span>
                    )}
                  </div>
                  <div className="text-lg font-bold text-blue-600">
                    Total: {formatPrice(totalSelected)}
                  </div>
                </div>
                <div className="flex space-x-3 w-full sm:w-auto">
                  <button
                    onClick={() => setSelectedSquares([])}
                    className="flex-1 sm:flex-none px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
                  >
                    Clear
                  </button>
                  <button
                    onClick={() => setIsPaymentModalOpen(true)}
                    className="flex-1 sm:flex-none bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-medium transition-colors"
                  >
                    Donate {formatPrice(totalSelected)}
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </div>

      {/* Payment Modal */}
      <PaymentModal
        isOpen={isPaymentModalOpen}
        onClose={() => setIsPaymentModalOpen(false)}
        selectedSquares={selectedSquares}
        campaign={campaign}
        onSuccess={handlePaymentSuccess}
        isDemoMode={isDemoMode}
      />
    </div>
  );
}
