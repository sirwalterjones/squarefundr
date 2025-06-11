"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Campaign, Square, SelectedSquare } from "@/types";
import GridOverlay from "@/components/GridOverlay";
import PaymentModal from "@/components/PaymentModal";
import { formatPrice, calculateTotalPrice } from "@/utils/pricingUtils";
import { supabase } from "@/lib/supabaseClient";

interface FundraiserClientProps {
  campaign: Campaign;
  squares: Square[];
}

export default function FundraiserClient({
  campaign,
  squares: initialSquares,
}: FundraiserClientProps) {
  const [squares, setSquares] = useState<Square[]>(initialSquares);
  const [selectedSquares, setSelectedSquares] = useState<SelectedSquare[]>([]);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Check if this is a demo campaign
  const isDemoMode = campaign.slug === "team-championship-fund";

  // Check for success/error messages from URL params
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const success = urlParams.get("success");
    const canceled = urlParams.get("canceled");
    const demo = urlParams.get("demo");

    if (success === "true") {
      if (demo === "true") {
        setSuccessMessage(
          "Demo payment completed! In production, squares would be saved to the database.",
        );
      } else {
        setSuccessMessage(
          "Payment successful! Your squares have been reserved.",
        );
      }
      // Clear URL params
      window.history.replaceState({}, "", window.location.pathname);
      // Auto-hide success message after 5 seconds
      setTimeout(() => setSuccessMessage(null), 5000);
    } else if (canceled === "true") {
      setErrorMessage("Payment was canceled. Your squares were not reserved.");
      // Clear URL params
      window.history.replaceState({}, "", window.location.pathname);
      // Auto-hide error message after 5 seconds
      setTimeout(() => setErrorMessage(null), 5000);
    }
  }, []);

  // Real-time subscription to squares updates
  useEffect(() => {
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
  }, [campaign.id]);

  const handleSquareSelect = (square: SelectedSquare) => {
    setSelectedSquares((prev) => [...prev, square]);
  };

  const handleSquareDeselect = (square: SelectedSquare) => {
    setSelectedSquares((prev) =>
      prev.filter((s) => !(s.row === square.row && s.col === square.col)),
    );
  };

  const handlePaymentSuccess = async () => {
    // Refresh squares data
    setIsLoading(true);
    try {
      const { data: updatedSquares } = await supabase
        .from("squares")
        .select("*")
        .eq("campaign_id", campaign.id)
        .order("number");

      if (updatedSquares) {
        setSquares(updatedSquares);
      }

      setSelectedSquares([]);
      setSuccessMessage(
        "Squares claimed successfully! Payment arrangement confirmed.",
      );
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

  const totalSelected = calculateTotalPrice(
    selectedSquares,
    campaign.pricing_type,
    campaign.price_data,
  );
  const claimedSquares = squares.filter((s) => s.claimed_by).length;
  const totalSquares = campaign.rows * campaign.columns; // Use campaign configuration, not squares array length
  const progressPercentage = (claimedSquares / totalSquares) * 100;

  // Debug logging
  console.log("FundraiserClient Debug:", {
    campaignRows: campaign.rows,
    campaignColumns: campaign.columns,
    totalSquares,
    squaresLength: squares.length,
    claimedSquares,
  });

  const totalRaised = squares
    .filter((s) => s.payment_status === "completed")
    .reduce((sum, s) => sum + s.value, 0);

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
          <div className="flex items-center justify-between">
            <span>{successMessage}</span>
            <button
              onClick={() => setSuccessMessage(null)}
              className="ml-4 text-white hover:text-gray-200"
            >
              ×
            </button>
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
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <div className="bg-white rounded-lg p-4 text-center">
              <div className="text-2xl font-bold text-blue-600">
                {claimedSquares}
              </div>
              <div className="text-sm text-gray-600">Squares Claimed</div>
            </div>
            <div className="bg-white rounded-lg p-4 text-center">
              <div className="text-2xl font-bold text-gray-900">
                {totalSquares}
              </div>
              <div className="text-sm text-gray-600">Total Squares</div>
            </div>
            <div className="bg-white rounded-lg p-4 text-center">
              <div className="text-2xl font-bold text-green-600">
                {formatPrice(totalRaised)}
              </div>
              <div className="text-sm text-gray-600">Raised</div>
            </div>
            <div className="bg-white rounded-lg p-4 text-center">
              <div className="text-2xl font-bold text-gray-900">
                {Math.round(progressPercentage)}%
              </div>
              <div className="text-sm text-gray-600">Complete</div>
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
            <div className="bg-white rounded-xl shadow-sm p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">
                Select Your Squares
              </h2>
              <p className="text-gray-600 mb-6">
                Click on available squares to select them for donation. Selected
                squares will be highlighted.
              </p>

              {isLoading ? (
                <div className="flex items-center justify-center h-64">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                </div>
              ) : (
                <GridOverlay
                  campaign={campaign}
                  squares={squares}
                  selectedSquares={selectedSquares}
                  onSquareSelect={handleSquareSelect}
                  onSquareDeselect={handleSquareDeselect}
                  imageUrl={campaign.image_url}
                />
              )}
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
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

            {/* Selection Summary */}
            <div className="bg-white rounded-xl shadow-sm p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Your Selection
              </h3>

              {selectedSquares.length === 0 ? (
                <p className="text-gray-500 text-center py-8">
                  No squares selected yet
                </p>
              ) : (
                <div className="space-y-4">
                  <div className="max-h-32 overflow-y-auto space-y-2">
                    {selectedSquares.map((square) => (
                      <div
                        key={`${square.row}-${square.col}`}
                        className="flex justify-between items-center text-sm"
                      >
                        <span>Square #{square.number}</span>
                        <span className="font-medium">
                          {formatPrice(square.value)}
                        </span>
                      </div>
                    ))}
                  </div>

                  <div className="border-t border-gray-200 pt-4">
                    <div className="flex justify-between items-center font-semibold">
                      <span>Total ({selectedSquares.length} squares)</span>
                      <span className="text-lg text-blue-600">
                        {formatPrice(totalSelected)}
                      </span>
                    </div>
                  </div>

                  <button
                    onClick={() => setIsPaymentModalOpen(true)}
                    className="w-full btn-primary"
                  >
                    Donate {formatPrice(totalSelected)}
                  </button>

                  <button
                    onClick={() => setSelectedSquares([])}
                    className="w-full btn-outline"
                  >
                    Clear Selection
                  </button>
                </div>
              )}
            </div>

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
                  <p>Your squares will be reserved and marked with your name</p>
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
