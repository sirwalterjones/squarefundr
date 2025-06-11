"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Share2, Copy, CheckCircle } from "lucide-react";

function CampaignCreatedContent() {
  const searchParams = useSearchParams();
  const [campaignUrl, setCampaignUrl] = useState("");
  const [campaignTitle, setCampaignTitle] = useState("");
  const [copyMessage, setCopyMessage] = useState("");

  useEffect(() => {
    const title = searchParams.get("title") || "Your Campaign";
    const slug = searchParams.get("slug") || "demo-campaign";
    const url = `${window.location.origin}/fundraiser/${slug}`;

    setCampaignTitle(title);
    setCampaignUrl(url);
  }, [searchParams]);

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(campaignUrl);
      setCopyMessage("Link copied to clipboard!");
      setTimeout(() => setCopyMessage(""), 3000);
    } catch (error) {
      console.error("Failed to copy:", error);
    }
  };

  const handleShare = async () => {
    const shareData = {
      title: `Support: ${campaignTitle}`,
      text: "Check out this interactive fundraising campaign!",
      url: campaignUrl,
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

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="max-w-2xl w-full animate-fade-in">
        <div className="bg-white rounded-2xl shadow-xl p-8 text-center">
          {/* Success Icon */}
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="w-8 h-8 text-green-600" />
          </div>

          {/* Success Message */}
          <h1 className="text-2xl font-bold text-gray-900 mb-4">
            🎉 Campaign Created!
          </h1>
          <p className="text-gray-600 mb-8">
            Your fundraising campaign "{campaignTitle}" is now live and ready to
            receive donations.
          </p>

          {/* PayPal Setup - Prominent Section */}
          <div className="mb-8 p-6 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border-2 border-blue-200">
            <div className="text-center mb-4">
              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <span className="text-2xl">💰</span>
              </div>
              <h3 className="text-xl font-bold text-blue-900 mb-2">
                Set Up PayPal Payments
              </h3>
              <p className="text-blue-800 text-sm">
                Enter your PayPal email to receive donations directly.
                Supporters will be redirected to PayPal to send payments to your
                account.
              </p>
            </div>

            <div className="bg-white rounded-lg p-4 border border-blue-200">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Your PayPal Email Address
              </label>
              <input
                type="email"
                placeholder="Enter your PayPal email address"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
              <p className="text-xs text-gray-600 mt-2">
                Donations will be sent directly to this PayPal email
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <Link
              href={campaignUrl}
              className="bg-blue-600 text-white py-4 rounded-xl font-semibold hover:bg-blue-700 transition-all duration-200 text-center"
            >
              View Your Campaign
            </Link>

            <button
              onClick={handleShare}
              className="border-2 border-blue-600 text-blue-600 py-4 rounded-xl font-semibold hover:bg-blue-600 hover:text-white transition-all duration-200 flex items-center justify-center space-x-2"
            >
              <Share2 className="w-4 h-4" />
              <span>Share Campaign</span>
            </button>
          </div>

          <Link
            href="/create"
            className="w-full text-gray-600 hover:text-gray-900 py-3 rounded-xl font-medium transition-colors block text-center"
          >
            Create Another Campaign
          </Link>

          {/* Next Steps */}
          <div className="mt-8 p-4 bg-green-50 rounded-lg text-left border border-green-200">
            <h3 className="font-semibold text-green-900 mb-2">Next Steps:</h3>
            <ul className="text-sm text-green-800 space-y-1">
              <li>• Set up your PayPal email above to receive donations</li>
              <li>• Share your campaign link with supporters</li>
              <li>• Monitor progress from your dashboard</li>
              <li>• Funds are transferred directly to your PayPal account</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function CampaignCreatedPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="animate-pulse p-8 text-center">
            <div className="w-16 h-16 bg-gray-200 rounded-full mx-auto mb-6"></div>
            <div className="h-8 bg-gray-200 rounded w-3/4 mx-auto mb-4"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2 mx-auto"></div>
          </div>
        </div>
      }
    >
      <CampaignCreatedContent />
    </Suspense>
  );
}
