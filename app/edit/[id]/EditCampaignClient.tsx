"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { User } from "@supabase/supabase-js";
import { Campaign } from "@/types";
import { formatPrice } from "@/utils/pricingUtils";
import ImageUploader from "@/components/ImageUploader";

const campaignSchema = z.object({
  title: z.string().min(1, "Title is required").max(100, "Title too long"),
  description: z.string().optional(),
  rows: z.number().min(2, "Minimum 2 rows").max(50, "Maximum 50 rows"),
  columns: z.number().min(2, "Minimum 2 columns").max(50, "Maximum 50 columns"),
  pricing_type: z.enum(["fixed", "sequential", "manual"], {
    required_error: "Please select a pricing type",
  }),
  fixed_price: z.number().min(1, "Price must be at least $1").optional(),
  sequential_start: z
    .number()
    .min(1, "Starting price must be at least $1")
    .optional(),
  sequential_increment: z
    .number()
    .min(0.01, "Increment must be at least $0.01")
    .optional(),
  is_active: z.boolean(),
});

type CampaignFormData = z.infer<typeof campaignSchema>;

interface EditCampaignClientProps {
  campaign: Campaign;
  user: User;
}

export default function EditCampaignClient({
  campaign,
  user,
}: EditCampaignClientProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [imageUrl, setImageUrl] = useState(campaign.image_url || "");
  const [uploadedImage, setUploadedImage] = useState<File | null>(null);
  const [paypalBusinessName, setPaypalBusinessName] = useState("");
  const [paypalStatus, setPaypalStatus] = useState<{
    connected: boolean;
    onboardingComplete: boolean;
    status: string;
  }>({ connected: false, onboardingComplete: false, status: "NOT_CONNECTED" });
  const [isCheckingPaypalStatus, setIsCheckingPaypalStatus] = useState(false);
  const [isSettingUpPaypal, setIsSettingUpPaypal] = useState(false);
  const [isPayPalConfigured, setIsPayPalConfigured] = useState(true);

  // Parse existing price data
  const getInitialPriceData = () => {
    if (campaign.pricing_type === "fixed") {
      return {
        fixed_price: campaign.price_data?.fixed || 10,
        sequential_start: 5,
        sequential_increment: 1,
      };
    } else if (campaign.pricing_type === "sequential") {
      return {
        fixed_price: 10,
        sequential_start: campaign.price_data?.sequential?.start || 5,
        sequential_increment: campaign.price_data?.sequential?.increment || 1,
      };
    } else {
      return {
        fixed_price: 10,
        sequential_start: 5,
        sequential_increment: 1,
      };
    }
  };

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<CampaignFormData>({
    resolver: zodResolver(campaignSchema),
    defaultValues: {
      title: campaign.title,
      description: campaign.description || "",
      rows: campaign.rows,
      columns: campaign.columns,
      pricing_type: campaign.pricing_type,
      is_active: campaign.is_active,
      ...getInitialPriceData(),
    },
  });

  const watchedValues = watch();
  const totalSquares = watchedValues.rows * watchedValues.columns;

  // Check PayPal status and configuration on component mount
  useEffect(() => {
    const checkPaypalStatus = async () => {
      if (campaign.paypal_account_id) {
        setIsCheckingPaypalStatus(true);
        try {
          const response = await fetch(
            `/api/paypal-connect-status?campaignId=${campaign.id}`,
          );
          const data = await response.json();

          if (data.success) {
            setPaypalStatus({
              connected: data.status !== "NOT_CONNECTED",
              onboardingComplete: data.onboardingComplete,
              status: data.status,
            });
          }
        } catch (error) {
          console.error("Error checking PayPal status:", error);
        } finally {
          setIsCheckingPaypalStatus(false);
        }
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

    checkPaypalStatus();
    checkPayPalConfig();
  }, [campaign.id, campaign.paypal_account_id]);

  const generatePriceData = (data: CampaignFormData) => {
    if (data.pricing_type === "fixed") {
      return { fixed: data.fixed_price };
    } else if (data.pricing_type === "sequential") {
      return {
        sequential: {
          start: data.sequential_start,
          increment: data.sequential_increment,
        },
      };
    } else {
      return { manual: {} };
    }
  };

  const onSubmit = async (data: CampaignFormData) => {
    setErrorMessage("");
    setSuccessMessage("");

    if (!imageUrl) {
      setErrorMessage("Please ensure an image is uploaded");
      return;
    }

    setIsSubmitting(true);
    try {
      const priceData = generatePriceData(data);

      const response = await fetch(`/api/update-campaign/${campaign.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title: data.title,
          description: data.description || null,
          imageUrl: imageUrl,
          rows: data.rows,
          columns: data.columns,
          pricingType: data.pricing_type,
          priceData: priceData,
          isActive: data.is_active,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to update campaign");
      }

      setSuccessMessage("Campaign updated successfully!");

      // Redirect to dashboard after a short delay
      setTimeout(() => {
        router.push("/dashboard");
      }, 2000);
    } catch (error) {
      console.error("Campaign update error:", error);
      setErrorMessage(
        `Failed to update campaign: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleImageUpload = (file: File, url: string) => {
    // Use the storage URL or data URL which persists across sessions
    setImageUrl(url);
    setUploadedImage(file);
  };

  const handleRemoveImage = () => {
    setImageUrl("");
    setUploadedImage(null);
  };

  const handlePaypalSetup = async () => {
    if (!paypalBusinessName.trim()) {
      setErrorMessage("Please enter your PayPal email address");
      return;
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(paypalBusinessName.trim())) {
      setErrorMessage("Please enter a valid email address");
      return;
    }

    setIsSettingUpPaypal(true);
    setErrorMessage("");

    try {
      const response = await fetch("/api/create-paypal-connect-account", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: paypalBusinessName.trim(),
          campaignId: campaign.id,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setSuccessMessage(
          "PayPal account connected successfully! You can now receive donations.",
        );

        // Refresh the page to show updated status
        setTimeout(() => {
          window.location.reload();
        }, 2000);
      } else {
        throw new Error(data.error || "Failed to connect PayPal account");
      }
    } catch (error) {
      console.error("PayPal setup error:", error);
      setErrorMessage(
        `PayPal connection failed: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    } finally {
      setIsSettingUpPaypal(false);
    }
  };

  // Grid preview generation
  const generateGridPreview = () => {
    const squares: Array<{
      number: number;
      price: number;
      row: number;
      col: number;
      available: boolean;
    }> = [];

    const rows = watchedValues.rows || 1;
    const columns = watchedValues.columns || 1;

    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < columns; col++) {
        const squareNumber = row * columns + col + 1;
        let price = 0;

        if (watchedValues.pricing_type === "fixed") {
          price = watchedValues.fixed_price || 10;
        } else if (watchedValues.pricing_type === "sequential") {
          const start = watchedValues.sequential_start || 1;
          const increment = watchedValues.sequential_increment || 1;
          price = start + (squareNumber - 1) * increment;
        }

        squares.push({
          number: squareNumber,
          price,
          row,
          col,
          available: true,
        });
      }
    }
    return squares;
  };

  const squares = generateGridPreview();

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="container mx-auto max-w-6xl px-4">
        {/* Header */}
        <div className="mb-8 text-center">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            Edit Campaign
          </h1>
          <p className="text-gray-600">
            Update your campaign details and settings
          </p>
        </div>

        <div className="grid lg:grid-cols-2 gap-8">
          {/* Left Column - Form */}
          <div className="space-y-6">
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              {/* Success Message */}
              {successMessage && (
                <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                  <div className="flex items-start">
                    <div className="flex-shrink-0">
                      <svg
                        className="h-5 w-5 text-green-400"
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
                    <div className="ml-3">
                      <p className="text-sm text-green-700">{successMessage}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Error Message */}
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
                      <h3 className="text-sm font-medium text-red-800">
                        Error
                      </h3>
                      <p className="text-sm text-red-700 mt-1">
                        {errorMessage}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Campaign Details */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 space-y-6">
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
                    placeholder="Enter a compelling title for your campaign"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-colors"
                  />
                  {errors.title && (
                    <p className="text-red-600 text-sm mt-1">
                      {errors.title.message}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Description
                  </label>
                  <textarea
                    {...register("description")}
                    rows={4}
                    placeholder="Describe what this campaign is raising money for..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Campaign Image *
                  </label>
                  <div className="h-48 w-full">
                    <ImageUploader
                      onImageUpload={handleImageUpload}
                      currentImage={imageUrl}
                      onRemoveImage={handleRemoveImage}
                      className="h-full w-full"
                    />
                  </div>
                </div>
              </div>

              {/* Grid Configuration */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 space-y-6">
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
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-colors"
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
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-colors"
                    />
                    {errors.columns && (
                      <p className="text-red-600 text-sm mt-1">
                        {errors.columns.message}
                      </p>
                    )}
                  </div>
                </div>

                <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <p className="text-sm text-blue-800">
                    <span className="font-medium">Total squares:</span>{" "}
                    {totalSquares}
                  </p>
                </div>
              </div>

              {/* Pricing Configuration */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 space-y-6">
                <h2 className="text-xl font-semibold text-gray-900">Pricing</h2>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-3">
                    Pricing Type
                  </label>
                  <div className="space-y-3">
                    <label className="flex items-start space-x-3">
                      <input
                        {...register("pricing_type")}
                        type="radio"
                        value="fixed"
                        className="mt-1"
                      />
                      <div>
                        <div className="font-medium">Fixed Price</div>
                        <div className="text-sm text-gray-600">
                          All squares cost the same amount
                        </div>
                      </div>
                    </label>

                    <label className="flex items-start space-x-3">
                      <input
                        {...register("pricing_type")}
                        type="radio"
                        value="sequential"
                        className="mt-1"
                      />
                      <div>
                        <div className="font-medium">Sequential Pricing</div>
                        <div className="text-sm text-gray-600">
                          Prices increase as squares are claimed
                        </div>
                      </div>
                    </label>
                  </div>
                  {errors.pricing_type && (
                    <p className="text-red-600 text-sm mt-1">
                      {errors.pricing_type.message}
                    </p>
                  )}
                </div>

                {watchedValues.pricing_type === "fixed" && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Price per square
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">
                        $
                      </span>
                      <input
                        {...register("fixed_price", { valueAsNumber: true })}
                        type="number"
                        min="1"
                        step="0.01"
                        className="w-full pl-8 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-colors"
                        placeholder="10.00"
                      />
                    </div>
                    {errors.fixed_price && (
                      <p className="text-red-600 text-sm mt-1">
                        {errors.fixed_price.message}
                      </p>
                    )}
                  </div>
                )}

                {watchedValues.pricing_type === "sequential" && (
                  <div className="grid md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Starting price
                      </label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">
                          $
                        </span>
                        <input
                          {...register("sequential_start", {
                            valueAsNumber: true,
                          })}
                          type="number"
                          min="1"
                          step="0.01"
                          className="w-full pl-8 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-colors"
                          placeholder="5.00"
                        />
                      </div>
                      {errors.sequential_start && (
                        <p className="text-red-600 text-sm mt-1">
                          {errors.sequential_start.message}
                        </p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Price increment
                      </label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">
                          $
                        </span>
                        <input
                          {...register("sequential_increment", {
                            valueAsNumber: true,
                          })}
                          type="number"
                          min="0.01"
                          step="0.01"
                          className="w-full pl-8 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-colors"
                          placeholder="1.00"
                        />
                      </div>
                      {errors.sequential_increment && (
                        <p className="text-red-600 text-sm mt-1">
                          {errors.sequential_increment.message}
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* PayPal Payment Setup */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 space-y-6">
                <h2 className="text-xl font-semibold text-gray-900">
                  PayPal Payment Setup
                </h2>

                {isCheckingPaypalStatus ? (
                  <div className="flex items-center space-x-2 text-gray-600">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-600"></div>
                    <span>Checking PayPal status...</span>
                  </div>
                ) : paypalStatus.connected ? (
                  <div className="space-y-4">
                    <div className="flex items-start space-x-3">
                      <div className="flex-shrink-0">
                        {paypalStatus.onboardingComplete ? (
                          <svg
                            className="h-5 w-5 text-green-400"
                            viewBox="0 0 20 20"
                            fill="currentColor"
                          >
                            <path
                              fillRule="evenodd"
                              d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                              clipRule="evenodd"
                            />
                          </svg>
                        ) : (
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
                        )}
                      </div>
                      <div className="flex-1">
                        <h3 className="text-sm font-medium text-gray-900">
                          PayPal Status:{" "}
                          {paypalStatus.onboardingComplete
                            ? "Active"
                            : "Setup Required"}
                        </h3>
                        <p className="text-sm text-gray-600 mt-1">
                          {paypalStatus.onboardingComplete
                            ? "Your PayPal account is ready to receive donations."
                            : "Complete your PayPal onboarding to start receiving donations."}
                        </p>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Update PayPal Email
                        </label>
                        <input
                          type="email"
                          value={paypalBusinessName}
                          onChange={(e) =>
                            setPaypalBusinessName(e.target.value)
                          }
                          placeholder="Enter your PayPal email address"
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-colors"
                        />
                      </div>

                      <button
                        type="button"
                        onClick={handlePaypalSetup}
                        disabled={
                          isSettingUpPaypal || !paypalBusinessName.trim()
                        }
                        className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      >
                        {isSettingUpPaypal ? (
                          <div className="flex items-center justify-center">
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                            Updating PayPal...
                          </div>
                        ) : (
                          "Update PayPal Account"
                        )}
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {!isPayPalConfigured ? (
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
                          <div className="ml-3">
                            <h3 className="text-sm font-medium text-red-800">
                              PayPal Not Available
                            </h3>
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
                        <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
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
                                PayPal Not Connected
                              </h3>
                              <p className="text-sm text-yellow-700 mt-1">
                                Enter your PayPal email to start receiving
                                donations directly to your account.
                              </p>
                            </div>
                          </div>
                        </div>

                        <div className="space-y-3">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              PayPal Email Address
                            </label>
                            <input
                              type="email"
                              value={paypalBusinessName}
                              onChange={(e) =>
                                setPaypalBusinessName(e.target.value)
                              }
                              placeholder="Enter your PayPal email address"
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-colors"
                            />
                            <p className="text-xs text-gray-600 mt-1">
                              Donations will be sent directly to this PayPal
                              email
                            </p>
                          </div>

                          <button
                            type="button"
                            onClick={handlePaypalSetup}
                            disabled={
                              isSettingUpPaypal || !paypalBusinessName.trim()
                            }
                            className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                          >
                            {isSettingUpPaypal ? (
                              <div className="flex items-center justify-center">
                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                                Connecting PayPal...
                              </div>
                            ) : (
                              "Connect PayPal Account"
                            )}
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                )}
              </div>

              {/* Campaign Status */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 space-y-6">
                <h2 className="text-xl font-semibold text-gray-900">
                  Campaign Status
                </h2>

                <div className="flex items-center space-x-3">
                  <input
                    {...register("is_active")}
                    type="checkbox"
                    id="is_active"
                    className="h-4 w-4 text-blue-600 rounded border-gray-300"
                  />
                  <label
                    htmlFor="is_active"
                    className="text-sm font-medium text-gray-700"
                  >
                    Campaign is active and accepting donations
                  </label>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex justify-between space-x-4">
                <button
                  type="button"
                  onClick={() => router.push("/dashboard")}
                  className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={isSubmitting || !!successMessage}
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {isSubmitting ? (
                    <div className="flex items-center">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Updating...
                    </div>
                  ) : successMessage ? (
                    "Updated Successfully!"
                  ) : (
                    "Update Campaign"
                  )}
                </button>
              </div>
            </form>
          </div>

          {/* Right Column - Preview */}
          <div className="space-y-6">
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">
                Live Preview
              </h2>

              {/* Campaign Header Preview */}
              <div className="mb-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  {watchedValues.title || "Campaign Title"}
                </h3>
                {watchedValues.description && (
                  <p className="text-gray-600 text-sm mb-4">
                    {watchedValues.description}
                  </p>
                )}
                <div className="w-full h-32 bg-gray-100 rounded-lg mb-4 overflow-hidden">
                  {imageUrl ? (
                    <img
                      src={imageUrl}
                      alt="Campaign preview"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-400">
                      No image uploaded
                    </div>
                  )}
                </div>
              </div>

              {/* Grid Preview */}
              <div className="space-y-4">
                <h4 className="font-medium text-gray-900">
                  Grid Preview ({watchedValues.rows}x{watchedValues.columns})
                </h4>
                <div
                  className="grid gap-1 bg-gray-100 p-2 rounded-lg max-h-64 overflow-auto"
                  style={{
                    gridTemplateColumns: `repeat(${watchedValues.columns}, minmax(0, 1fr))`,
                  }}
                >
                  {squares
                    .slice(0, Math.min(100, totalSquares))
                    .map((square) => (
                      <div
                        key={square.number}
                        className="bg-white border border-gray-200 rounded text-xs p-1 text-center hover:bg-blue-50 transition-colors cursor-pointer"
                        style={{ minHeight: "24px", fontSize: "10px" }}
                      >
                        <div className="font-medium">{square.number}</div>
                        <div className="text-gray-600">
                          {formatPrice(square.price)}
                        </div>
                      </div>
                    ))}
                </div>
                {totalSquares > 100 && (
                  <p className="text-xs text-gray-500 text-center">
                    Showing first 100 squares. Total: {totalSquares}
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
