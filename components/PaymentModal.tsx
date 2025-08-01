"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { PaymentModalProps, DonorInfo } from "@/types";
import { formatPrice, calculateTotalPrice } from "@/utils/pricingUtils";
import {
  generatePDFReceipt,
  createReceiptData,
} from "@/utils/receiptGenerator";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

const donorSchema = z.object({
  email: z
    .string()
    .email("Please enter a valid email")
    .min(1, "Email is required"),
  name: z.string().min(1, "Name is required"),
});

type DonorFormData = z.infer<typeof donorSchema>;

export default function PaymentModal({
  isOpen,
  onClose,
  selectedSquares,
  campaign,
  onSuccess,
  isDemoMode = false,
}: PaymentModalProps & { isDemoMode?: boolean }) {
  const [paymentMethod, setPaymentMethod] = useState<"paypal" | "cash">(
    "paypal",
  );
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showSuccess, setShowSuccess] = useState(false);
  const [showReceiptDownload, setShowReceiptDownload] = useState(false);
  const [receiptData, setReceiptData] = useState<any>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<DonorFormData>({
    resolver: zodResolver(donorSchema),
  });

  const total = calculateTotalPrice(
    selectedSquares,
    campaign.pricing_type,
    campaign.price_data,
  );

  const handlePayPalPayment = async (data: DonorFormData) => {
    setIsProcessing(true);
    try {
      // Create PayPal order
      const response = await fetch("/api/create-paypal-order", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          campaignId: campaign.id,
          squares: selectedSquares,
          donorEmail: data.email,
          donorName: data.name,
        }),
      });

      const result = await response.json();

      if (result.approvalUrl) {
        window.location.href = result.approvalUrl;
      } else {
        throw new Error(result.error || "Failed to create PayPal order");
      }
    } catch (error) {
      console.error("Payment error:", error);
      setError(
        error instanceof Error
          ? error.message
          : "Payment failed. Please try again.",
      );
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCashPayment = async (data: DonorFormData) => {
    setIsProcessing(true);
    setError(null);
    try {
      const response = await fetch("/api/claim-squares-cash", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          campaignId: campaign.id,
          squares: selectedSquares,
          donorName: data.name,
          donorEmail: data.email,
        }),
      });

      const result = await response.json();

      if (response.ok) {
        // Create receipt data for cash payments
        const receipt = createReceiptData(
          campaign,
          selectedSquares,
          data.name,
          data.email,
          "cash",
          result.transactionId,
        );
        setReceiptData(receipt);
        setShowSuccess(true);
        setShowReceiptDownload(true);

        // Close modal after showing success message
        setTimeout(() => {
          onSuccess();
          onClose();
          reset();
          setShowSuccess(false);
          setShowReceiptDownload(false);
          setReceiptData(null);
        }, 5000);
      } else {
        throw new Error(result.error || "Failed to claim squares");
      }
    } catch (error) {
      console.error("Cash payment error:", error);
      const errorMessage =
        error instanceof Error
          ? error.message
          : "Failed to claim squares. Please try again.";
      setError(errorMessage);
    } finally {
      setIsProcessing(false);
    }
  };

  const onSubmit = (data: DonorFormData) => {
    if (paymentMethod === "paypal") {
      handlePayPalPayment(data);
    } else {
      handleCashPayment(data);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
      >
        <motion.div
          className="bg-white rounded-xl shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto"
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-gray-900">
                Complete Your Donation
              </h2>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-600 transition-colors"
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
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>

            {/* Demo Mode Notice */}
            {isDemoMode && (
              <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
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

            {/* Selected Squares Summary */}
            <div className="mb-6 p-4 bg-gray-50 rounded-lg">
              <h3 className="font-medium text-gray-900 mb-2">
                Selected Squares
              </h3>
              <div className="space-y-1">
                {selectedSquares.map((square) => (
                  <div
                    key={`${square.row}-${square.col}`}
                    className="flex justify-between text-sm text-gray-700"
                  >
                    <span>Square #{square.number}</span>
                    <span>{formatPrice(square.value)}</span>
                  </div>
                ))}
              </div>
              <div className="border-t border-gray-200 mt-2 pt-2 flex justify-between font-medium text-gray-900">
                <span>Total</span>
                <span>{formatPrice(total)}</span>
              </div>
            </div>

            {/* Payment Method Selection */}
            <div className="mb-6">
              <h3 className="font-medium text-gray-900 mb-3">Payment Method</h3>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setPaymentMethod("paypal")}
                  className={`p-3 border rounded-lg text-center transition-colors ${
                    paymentMethod === "paypal"
                      ? "border-blue-600 bg-blue-50 text-blue-600"
                      : "border-gray-300 hover:border-gray-400"
                  }`}
                >
                  <div className="font-medium">PayPal</div>
                  <div className="text-xs text-gray-500">
                    Secure online payment
                  </div>
                </button>
                <button
                  type="button"
                  onClick={() => setPaymentMethod("cash")}
                  className={`p-3 border rounded-lg text-center transition-colors ${
                    paymentMethod === "cash"
                      ? "border-blue-600 bg-blue-50 text-blue-600"
                      : "border-gray-300 hover:border-gray-400"
                  }`}
                >
                  <div className="font-medium">Cash</div>
                  <div className="text-xs text-gray-500">
                    Pay organizer directly
                  </div>
                </button>
              </div>
            </div>

            {/* Success Message */}
            {showSuccess && (
              <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg">
                <div className="flex items-center justify-center space-x-3">
                  <div className="flex-shrink-0">
                    <svg
                      className="w-6 h-6 text-green-600"
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
                  </div>
                  <div className="text-center">
                    <h4 className="text-lg font-medium text-green-900 mb-1">
                      Success!
                    </h4>
                    <p className="text-sm text-green-700 mb-3">
                      Your squares have been successfully claimed.
                    </p>
                    {showReceiptDownload && receiptData && (
                      <button
                        onClick={() => generatePDFReceipt(receiptData)}
                        className="inline-flex items-center space-x-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg transition-colors text-sm font-medium"
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
                </div>
              </div>
            )}

            {/* Error Message */}
            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm text-red-800">{error}</p>
              </div>
            )}

            {/* Donor Information Form */}
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Your Name *
                </label>
                <input
                  {...register("name")}
                  type="text"
                  className="input-field"
                  placeholder="Enter your name"
                />
                {errors.name && (
                  <p className="text-red-600 text-sm mt-1">
                    {errors.name.message}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email *
                </label>
                <input
                  {...register("email")}
                  type="email"
                  className="input-field"
                  placeholder="Enter your email"
                />
                {errors.email && (
                  <p className="text-red-600 text-sm mt-1">
                    {errors.email.message}
                  </p>
                )}
              </div>

              <div className="pt-4">
                <button
                  type="submit"
                  disabled={isProcessing}
                  className="w-full btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isProcessing ? (
                    <div className="flex items-center justify-center">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Processing...
                    </div>
                  ) : (
                    `${paymentMethod === "paypal" ? "Pay" : "Claim"} ${formatPrice(total)}`
                  )}
                </button>
              </div>
            </form>

            {paymentMethod === "cash" && (
              <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                <p className="text-sm text-yellow-800">
                  <strong>Cash Payment:</strong> Your squares will be reserved.
                  Please arrange payment with the campaign organizer.
                </p>
              </div>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
