"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { supabase, isDemoMode } from "@/lib/supabaseClient";
import { User } from "@supabase/supabase-js";
import ImageUploader from "@/components/ImageUploader";
import { PricingType, PriceData } from "@/types";
import {
  formatPrice,
  validatePriceData,
  isValidGridSize,
} from "@/utils/pricingUtils";
import { generateSlug } from "@/utils/slugGenerator";
import Link from "next/link";

const campaignSchema = z.object({
  title: z
    .string()
    .min(1, "Campaign title is required")
    .max(100, "Title too long"),
  description: z.string().max(500, "Description too long").optional(),
  rows: z.number().min(2, "Minimum 2 rows").max(50, "Maximum 50 rows"),
  columns: z.number().min(2, "Minimum 2 columns").max(50, "Maximum 50 columns"),
  pricing_type: z.enum(["fixed", "sequential", "manual"]),
  fixed_price: z.number().min(0.01, "Minimum $0.01").optional(),
  sequential_start: z.number().min(0.01, "Minimum $0.01").optional(),
  sequential_increment: z.number().min(0, "Cannot be negative").optional(),
});

type CampaignFormData = z.infer<typeof campaignSchema>;

export default function CreateCampaignPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadedImage, setUploadedImage] = useState<File | null>(null);
  const [imageUrl, setImageUrl] = useState<string>("");
  const [isUploading, setIsUploading] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [successData, setSuccessData] = useState<{
    campaign: {
      id: string;
      slug: string;
      publicUrl: string;
      title: string;
    };
  } | null>(null);
  const [showPayPalSetup, setShowPayPalSetup] = useState(false);
  const [paypalBusinessName, setPaypalBusinessName] = useState("");
  const [isSettingUpPayPal, setIsSettingUpPayPal] = useState(false);
  const [copyMessage, setCopyMessage] = useState("");
  const [isPayPalConfigured, setIsPayPalConfigured] = useState(true);
  const [successMessage, setSuccessMessage] = useState("");

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
    setValue,
    getValues,
  } = useForm<CampaignFormData>({
    resolver: zodResolver(campaignSchema),
    defaultValues: {
      rows: 10,
      columns: 10,
      pricing_type: "fixed",
      fixed_price: 5,
      sequential_start: 1,
      sequential_increment: 1,
    },
  });

  const watchedValues = watch();
  const totalSquares = watchedValues.rows * watchedValues.columns;

  useEffect(() => {
    const checkAuth = async () => {
      try {
        if (isDemoMode()) {
          // In demo mode, create a mock user
          const mockUser = {
            id: "demo-user-" + Date.now(),
            email: "demo@example.com",
            created_at: new Date().toISOString(),
          } as User;
          setUser(mockUser);
          setLoading(false);
          return;
        }

        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) {
          // Not authenticated - redirect to auth page
          router.push("/auth");
          return;
        }

        setUser(user);
        setLoading(false);
      } catch (error) {
        console.error("Auth error:", error);
        router.push("/auth");
      }
    };

    const checkPayPalConfig = async () => {
      try {
        // Check if PayPal is configured using the dedicated endpoint
        const response = await fetch("/api/paypal-config-check");
        const data = await response.json();

        setIsPayPalConfigured(data.configured);
      } catch (error) {
        console.error("Error checking PayPal config:", error);
        setIsPayPalConfigured(false);
      }
    };

    checkAuth();
    checkPayPalConfig();
  }, [router]);

  const handleImageUpload = async (file: File, url: string) => {
    setIsUploading(true);
    try {
      // Use the storage URL or data URL which persists across sessions
      setImageUrl(url);
      setUploadedImage(file);

      console.log("Image processed:", file.name, file.size, "URL:", url);
    } catch (error) {
      console.error("Upload error:", error);
      alert("Failed to upload image. Please try again.");
    } finally {
      setIsUploading(false);
    }
  };

  const generatePriceData = (formData: CampaignFormData): PriceData => {
    try {
      switch (formData.pricing_type) {
        case "fixed":
          const fixedPrice = formData.fixed_price || 5;
          return { fixed: Math.max(0.01, fixedPrice) };
        case "sequential":
          const start = formData.sequential_start || 1;
          const increment = formData.sequential_increment || 1;
          return {
            sequential: {
              start: Math.max(0.01, start),
              increment: Math.max(0, increment),
            },
          };
        case "manual":
          // For now, initialize with fixed pricing that user can edit later
          const manualPrices: { [key: string]: number } = {};
          for (let row = 0; row < formData.rows; row++) {
            for (let col = 0; col < formData.columns; col++) {
              manualPrices[`${row},${col}`] = 5;
            }
          }
          return { manual: manualPrices };
        default:
          return { fixed: 5 };
      }
    } catch (error) {
      console.error("Error generating price data:", error);
      return { fixed: 5 };
    }
  };

  const onSubmit = async (data: CampaignFormData) => {
    console.log("=== FORM SUBMISSION START ===");
    console.log("Form data:", data);

    // Clear any previous errors
    setErrorMessage("");

    if (!imageUrl) {
      setErrorMessage("Please upload an image first");
      return;
    }

    if (!user) {
      setErrorMessage("You must be logged in to create a campaign");
      return;
    }

    setIsSubmitting(true);

    // Add timeout to prevent infinite loading
    const timeoutId = setTimeout(() => {
      console.error("Request timeout after 30 seconds");
      setErrorMessage("Request timed out. Please try again.");
      setIsSubmitting(false);
    }, 30000);

    try {
      const priceData = generatePriceData(data);
      console.log("Generated price data:", priceData);

      const requestBody = {
        title: data.title,
        description: data.description || null,
        imageUrl: imageUrl,
        rows: data.rows,
        columns: data.columns,
        pricingType: data.pricing_type,
        priceData: priceData,
      };

      console.log("Request body:", requestBody);

      // Create campaign via API
      console.log("Making API request...");
      const response = await fetch("/api/create-campaign", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
      });

      console.log("API response status:", response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error("API error response:", errorText);
        let errorData;
        try {
          errorData = JSON.parse(errorText);
        } catch {
          errorData = { error: errorText || "Unknown server error" };
        }
        throw new Error(errorData.error || "Failed to create campaign");
      }

      const result = await response.json();
      console.log("API success response:", result);

      // Clear timeout since request succeeded
      clearTimeout(timeoutId);

      // Show success state
      setSuccessData(result);

      // Show PayPal setup option
      setShowPayPalSetup(true);
    } catch (error) {
      console.error("=== CAMPAIGN CREATION ERROR ===");
      console.error("Campaign creation error:", error);
      clearTimeout(timeoutId);
      setErrorMessage(
        `Failed to create campaign: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCopyLink = async () => {
    if (!successData) return;

    try {
      await navigator.clipboard.writeText(successData.campaign.publicUrl);
      setCopyMessage("Link copied to clipboard!");
      setTimeout(() => setCopyMessage(""), 3000);
    } catch (error) {
      console.error("Failed to copy:", error);
    }
  };

  const handleShare = async () => {
    if (!successData) return;

    const shareData = {
      title: `Support: ${successData.campaign.title}`,
      text: "Check out this interactive fundraising campaign!",
      url: successData.campaign.publicUrl,
    };

    try {
      if (navigator.share) {
        await navigator.share(shareData);
      } else {
        handleCopyLink();
      }
    } catch (error) {
      console.error("Share failed:", error);
    }
  };

  const handlePayPalSetup = async () => {
    if (!isPayPalConfigured) {
      setErrorMessage(
        "PayPal is not configured on this platform. Please contact support to enable PayPal integration.",
      );
      return;
    }

    if (!successData || !paypalBusinessName.trim()) {
      setErrorMessage("Please enter your PayPal email address");
      return;
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(paypalBusinessName.trim())) {
      setErrorMessage("Please enter a valid email address");
      return;
    }

    setIsSettingUpPayPal(true);
    try {
      const response = await fetch("/api/create-paypal-connect-account", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: paypalBusinessName.trim(),
          campaignId: successData.campaign.id,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to connect PayPal account");
      }

      const result = await response.json();

      setSuccessMessage(
        "PayPal account connected successfully! You can now receive donations.",
      );

      // Hide PayPal setup after success
      setShowPayPalSetup(false);
    } catch (error) {
      console.error("PayPal setup error:", error);
      setErrorMessage(
        `Failed to connect PayPal: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    } finally {
      setIsSettingUpPayPal(false);
    }
  };

  const skipPayPalSetup = () => {
    setShowPayPalSetup(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="text-gray-600 mt-2">Loading...</p>
        </div>
      </div>
    );
  }

  // Success State
  if (successData) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="max-w-md w-full animate-fade-in">
          <div className="bg-white rounded-2xl shadow-xl p-8 text-center">
            {/* Success Icon */}
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <svg
                className="w-8 h-8 text-green-600"
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

            {/* Success Message */}
            <h1 className="text-2xl font-bold text-gray-900 mb-4">
              🎉 Campaign Created!
            </h1>
            <p className="text-gray-600 mb-8">
              Your fundraising campaign "{successData.campaign.title}" is now
              live and ready to receive donations.
            </p>

            {/* Campaign URL */}
            <div className="bg-gray-50 rounded-lg p-4 mb-6">
              <p className="text-sm text-gray-600 mb-2">Your campaign link:</p>
              <div className="flex items-center space-x-2">
                <input
                  type="text"
                  value={successData.campaign.publicUrl}
                  readOnly
                  className="flex-1 bg-white border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900"
                />
                <button
                  onClick={handleCopyLink}
                  className="p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  title="Copy link"
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
                </button>
              </div>
              {copyMessage && (
                <p className="text-green-600 text-sm mt-2">{copyMessage}</p>
              )}
            </div>

            {/* Action Buttons */}
            <div className="space-y-3">
              <Link
                href={successData.campaign.publicUrl}
                className="w-full bg-blue-600 text-white py-3 rounded-xl font-semibold hover:bg-blue-700 transition-all duration-200 block text-center"
              >
                View Your Campaign
              </Link>

              <button
                onClick={handleShare}
                className="w-full border-2 border-blue-600 text-blue-600 py-3 rounded-xl font-semibold hover:bg-blue-600 hover:text-white transition-all duration-200 flex items-center justify-center space-x-2"
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
                <span>Share Campaign</span>
              </button>

              <button
                onClick={() => {
                  setSuccessData(null);
                  setCurrentStep(1);
                  setImageUrl("");
                  setUploadedImage(null);
                }}
                className="w-full text-gray-600 hover:text-gray-900 py-3 rounded-xl font-medium transition-colors"
              >
                Create Another Campaign
              </button>
            </div>

            {/* PayPal Setup Section */}
            {showPayPalSetup && (
              <div className="mt-8 p-6 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="flex items-start">
                  <div className="flex-shrink-0">
                    <svg
                      className="h-6 w-6 text-blue-600"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1"
                      />
                    </svg>
                  </div>
                  <div className="ml-3 flex-1">
                    <h3 className="text-lg font-medium text-blue-800 mb-2">
                      Set Up PayPal Payments
                    </h3>

                    {!isPayPalConfigured ? (
                      <div className="p-4 bg-red-50 border border-red-200 rounded-lg mb-4">
                        <div className="flex items-start">
                          <div className="flex-shrink-0">
                            <svg
                              className="h-5 w-5 text-red-400"
                              viewBox="0 0 20 20"
                              fill="currentColor"
                            >
                              <path
                                fillRule="evenodd"
                                d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                                clipRule="evenodd"
                              />
                            </svg>
                          </div>
                          <div className="ml-3">
                            <h4 className="text-sm font-medium text-red-800">
                              PayPal Not Available
                            </h4>
                            <p className="text-sm text-red-700 mt-1">
                              PayPal integration is not configured on this
                              platform. Please contact support to enable PayPal
                              payment processing.
                            </p>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <>
                        <p className="text-sm text-blue-700 mb-4">
                          Enter your PayPal email to receive donations directly.
                          Supporters will be redirected to PayPal to send
                          payments to your account.
                        </p>

                        <div className="mb-4">
                          <label className="block text-sm font-medium text-blue-800 mb-2">
                            Your PayPal Email Address
                          </label>
                          <input
                            type="email"
                            value={paypalBusinessName}
                            onChange={(e) =>
                              setPaypalBusinessName(e.target.value)
                            }
                            placeholder="Enter your PayPal email address"
                            className="w-full px-3 py-2 border border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          />
                          <p className="text-xs text-blue-600 mt-1">
                            Donations will be sent directly to this PayPal email
                            address
                          </p>
                        </div>

                        <div className="p-3 bg-green-50 border border-green-200 rounded-lg mb-4">
                          <div className="flex items-start">
                            <div className="flex-shrink-0">
                              <svg
                                className="h-4 w-4 text-green-400 mt-0.5"
                                viewBox="0 0 20 20"
                                fill="currentColor"
                              >
                                <path
                                  fillRule="evenodd"
                                  d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                                  clipRule="evenodd"
                                />
                              </svg>
                            </div>
                            <div className="ml-2">
                              <p className="text-xs text-green-700">
                                <strong>Personal accounts welcome!</strong> You
                                can use your existing personal PayPal account -
                                no business account required.
                              </p>
                            </div>
                          </div>
                        </div>

                        <div className="flex space-x-3">
                          <button
                            onClick={handlePayPalSetup}
                            disabled={
                              isSettingUpPayPal ||
                              !paypalBusinessName.trim() ||
                              !isPayPalConfigured
                            }
                            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
                          >
                            {isSettingUpPayPal ? (
                              <>
                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                                <span>Setting up...</span>
                              </>
                            ) : (
                              <>
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
                                    d="M13 10V3L4 14h7v7l9-11h-7z"
                                  />
                                </svg>
                                <span>Connect PayPal</span>
                              </>
                            )}
                          </button>

                          <button
                            onClick={skipPayPalSetup}
                            className="text-blue-700 hover:text-blue-800 px-4 py-2 rounded-lg border border-blue-300 hover:bg-blue-100 transition-colors"
                          >
                            Skip for Now
                          </button>
                        </div>

                        <p className="text-xs text-blue-600 mt-3">
                          You can set up PayPal payments later from your
                          dashboard
                        </p>
                      </>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Next Steps */}
            <div className="mt-8 p-4 bg-blue-50 rounded-lg text-left">
              <h3 className="font-semibold text-blue-900 mb-2">Next Steps:</h3>
              <ul className="text-sm text-blue-800 space-y-1">
                <li>
                  •{" "}
                  {showPayPalSetup
                    ? "Set up PayPal to receive donations"
                    : "Share your campaign link with supporters"}
                </li>
                <li>• Monitor progress from your dashboard</li>
                <li>
                  •{" "}
                  {showPayPalSetup
                    ? "Funds will be transferred to your PayPal account"
                    : "Set up payment processing to receive donations"}
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="container-responsive max-w-4xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Create New Campaign
          </h1>
          <p className="text-gray-600">
            Set up your interactive fundraising campaign in a few simple steps.
          </p>
        </div>

        {/* Demo Mode Notice */}
        {isDemoMode() && (
          <div className="mb-8 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <div className="flex items-start">
              <div className="flex-shrink-0">
                <svg
                  className="h-5 w-5 text-yellow-400"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path
                    fillRule="evenodd"
                    d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                    clipRule="evenodd"
                  />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-yellow-800">
                  Demo Mode
                </h3>
                <div className="mt-2 text-sm text-yellow-700">
                  <p>
                    You're running in demo mode. To create real campaigns and
                    connect to a database, you need to:
                  </p>
                  <ol className="mt-2 ml-4 list-decimal space-y-1">
                    <li>
                      Create a{" "}
                      <a
                        href="https://supabase.com"
                        target="_blank"
                        className="font-medium underline"
                      >
                        Supabase account
                      </a>
                    </li>
                    <li>
                      Create a{" "}
                      <code className="bg-yellow-100 px-1 rounded">
                        .env.local
                      </code>{" "}
                      file in your project root
                    </li>
                    <li>Add your Supabase credentials to the file</li>
                  </ol>
                  <p className="mt-2">
                    For now, you can explore the demo functionality.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Progress Steps */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            {[1, 2, 3].map((step) => (
              <div key={step} className="flex items-center">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium mr-3 ${
                    currentStep >= step
                      ? "bg-blue-600 text-white"
                      : "bg-gray-200 text-gray-600"
                  }`}
                >
                  {step}
                </div>
                <div
                  className={`h-0.5 flex-1 ${
                    currentStep > step ? "bg-blue-600" : "bg-gray-200"
                  }`}
                />
              </div>
            ))}
          </div>
          <div className="flex justify-between mt-2 text-sm text-gray-600">
            <span>Campaign Details</span>
            <span>Grid Setup</span>
            <span>Review & Launch</span>
          </div>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
          {/* Error Message Display */}
          {errorMessage && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex items-start">
                <div className="flex-shrink-0">
                  <svg
                    className="h-5 w-5 text-red-400"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                  >
                    <path
                      fillRule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                      clipRule="evenodd"
                    />
                  </svg>
                </div>
                <div className="ml-3 flex-1">
                  <h3 className="text-sm font-medium text-red-800">Error</h3>
                  <p className="text-sm text-red-700 mt-1">{errorMessage}</p>
                  <button
                    type="button"
                    onClick={() => setErrorMessage("")}
                    className="text-red-600 hover:text-red-800 text-sm font-medium mt-2"
                  >
                    Dismiss
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Step 1: Campaign Details */}
          {currentStep === 1 && (
            <div className="card space-y-6">
              <h2 className="text-xl font-semibold text-gray-900">
                Campaign Details
              </h2>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Campaign Title *
                </label>
                <input
                  {...register("title")}
                  type="text"
                  className="input-field"
                  placeholder="Enter your campaign title"
                />
                {errors.title && (
                  <p className="text-red-600 text-sm mt-1">
                    {errors.title.message}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description (Optional)
                </label>
                <textarea
                  {...register("description")}
                  rows={3}
                  className="input-field"
                  placeholder="Describe your campaign and what you're raising funds for"
                />
                {errors.description && (
                  <p className="text-red-600 text-sm mt-1">
                    {errors.description.message}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Campaign Image *
                </label>
                <ImageUploader
                  onImageUpload={handleImageUpload}
                  currentImage={imageUrl}
                />
              </div>

              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() => setCurrentStep(2)}
                  disabled={!watchedValues.title || !imageUrl}
                  className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next: Grid Setup
                </button>
              </div>
            </div>
          )}

          {/* Step 2: Grid Setup */}
          {currentStep === 2 && (
            <div className="card space-y-6">
              <h2 className="text-xl font-semibold text-gray-900">
                Grid Configuration
              </h2>

              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Rows
                  </label>
                  <input
                    {...register("rows", { valueAsNumber: true })}
                    type="number"
                    min="2"
                    max="50"
                    className="input-field"
                  />
                  {errors.rows && (
                    <p className="text-red-600 text-sm mt-1">
                      {errors.rows.message}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Columns
                  </label>
                  <input
                    {...register("columns", { valueAsNumber: true })}
                    type="number"
                    min="2"
                    max="50"
                    className="input-field"
                  />
                  {errors.columns && (
                    <p className="text-red-600 text-sm mt-1">
                      {errors.columns.message}
                    </p>
                  )}
                </div>
              </div>

              <div className="p-4 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-600">
                  Total squares:{" "}
                  <span className="font-medium">{totalSquares}</span>
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Pricing Strategy
                </label>
                <div className="space-y-3">
                  <label className="flex items-center">
                    <input
                      {...register("pricing_type")}
                      type="radio"
                      value="fixed"
                      className="h-4 w-4 text-blue-600 focus:ring-blue-600 border-gray-300"
                    />
                    <span className="ml-2 text-sm text-gray-700">
                      Fixed price per square
                    </span>
                  </label>
                  <label className="flex items-center">
                    <input
                      {...register("pricing_type")}
                      type="radio"
                      value="sequential"
                      className="h-4 w-4 text-blue-600 focus:ring-blue-600 border-gray-300"
                    />
                    <span className="ml-2 text-sm text-gray-700">
                      Sequential pricing (increases per square)
                    </span>
                  </label>
                  <label className="flex items-center">
                    <input
                      {...register("pricing_type")}
                      type="radio"
                      value="manual"
                      className="h-4 w-4 text-blue-600 focus:ring-blue-600 border-gray-300"
                    />
                    <span className="ml-2 text-sm text-gray-700">
                      Manual pricing (set each square individually)
                    </span>
                  </label>
                </div>
              </div>

              {watchedValues.pricing_type === "fixed" && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Price per square
                  </label>
                  <input
                    {...register("fixed_price", { valueAsNumber: true })}
                    type="number"
                    step="0.01"
                    min="0.01"
                    className="input-field"
                    placeholder="5.00"
                  />
                  {errors.fixed_price && (
                    <p className="text-red-600 text-sm mt-1">
                      {errors.fixed_price.message}
                    </p>
                  )}
                </div>
              )}

              {watchedValues.pricing_type === "sequential" && (
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Starting price
                    </label>
                    <input
                      {...register("sequential_start", { valueAsNumber: true })}
                      type="number"
                      step="0.01"
                      min="0.01"
                      className="input-field"
                      placeholder="1.00"
                    />
                    {errors.sequential_start && (
                      <p className="text-red-600 text-sm mt-1">
                        {errors.sequential_start.message}
                      </p>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Increment per square
                    </label>
                    <input
                      {...register("sequential_increment", {
                        valueAsNumber: true,
                      })}
                      type="number"
                      step="0.01"
                      min="0"
                      className="input-field"
                      placeholder="1.00"
                    />
                    {errors.sequential_increment && (
                      <p className="text-red-600 text-sm mt-1">
                        {errors.sequential_increment.message}
                      </p>
                    )}
                  </div>
                </div>
              )}

              <div className="flex justify-between">
                <button
                  type="button"
                  onClick={() => setCurrentStep(1)}
                  className="btn-secondary"
                >
                  Back
                </button>
                <button
                  type="button"
                  onClick={() => setCurrentStep(3)}
                  className="btn-primary"
                >
                  Next: Review
                </button>
              </div>
            </div>
          )}

          {/* Step 3: Review & Launch */}
          {currentStep === 3 && (
            <div className="card space-y-6">
              <h2 className="text-xl font-semibold text-gray-900">
                Review & Launch
              </h2>

              <div className="grid md:grid-cols-2 gap-8">
                <div>
                  <h3 className="font-medium text-gray-900 mb-4">
                    Campaign Summary
                  </h3>
                  <dl className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <dt className="text-gray-600">Title:</dt>
                      <dd className="font-medium">{watchedValues.title}</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-gray-600">Grid size:</dt>
                      <dd className="font-medium">
                        {watchedValues.rows} × {watchedValues.columns}
                      </dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-gray-600">Total squares:</dt>
                      <dd className="font-medium">{totalSquares}</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-gray-600">Pricing:</dt>
                      <dd className="font-medium capitalize">
                        {watchedValues.pricing_type}
                      </dd>
                    </div>
                    {watchedValues.pricing_type === "fixed" && (
                      <div className="flex justify-between">
                        <dt className="text-gray-600">Price per square:</dt>
                        <dd className="font-medium">
                          {formatPrice(watchedValues.fixed_price || 0)}
                        </dd>
                      </div>
                    )}
                  </dl>
                </div>

                <div>
                  <h3 className="font-medium text-gray-900 mb-4">
                    Campaign Preview
                  </h3>
                  {imageUrl && (
                    <div className="relative">
                      <img
                        src={imageUrl}
                        alt="Campaign preview"
                        className="w-full h-48 object-cover rounded-lg"
                      />
                      <div className="absolute inset-0 bg-black/20 rounded-lg flex items-center justify-center">
                        <div className="text-white text-center">
                          <div className="text-sm font-medium">
                            {totalSquares} squares
                          </div>
                          <div className="text-xs">
                            Grid overlay will appear here
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <h4 className="font-medium text-blue-800 mb-2">
                  Ready to launch:
                </h4>
                <ul className="text-sm text-blue-700 space-y-1">
                  <li>• Your campaign will be live immediately</li>
                  <li>
                    • You can edit pricing and details from your dashboard
                  </li>
                  <li>
                    • Funds will be transferred to your account after each
                    donation
                  </li>
                </ul>
              </div>

              <div className="flex justify-between">
                <button
                  type="button"
                  onClick={() => setCurrentStep(2)}
                  className="btn-secondary"
                >
                  Back
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? (
                    <div className="flex items-center">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Creating Campaign...
                    </div>
                  ) : (
                    "Launch Campaign"
                  )}
                </button>
              </div>
            </div>
          )}
        </form>
      </div>
    </div>
  );
}
