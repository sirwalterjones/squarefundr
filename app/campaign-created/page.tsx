'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Share2, Copy, CheckCircle } from 'lucide-react';

function CampaignCreatedContent() {
  const searchParams = useSearchParams();
  const [campaignUrl, setCampaignUrl] = useState('');
  const [campaignTitle, setCampaignTitle] = useState('');
  const [copyMessage, setCopyMessage] = useState('');

  useEffect(() => {
    const title = searchParams.get('title') || 'Your Campaign';
    const slug = searchParams.get('slug') || 'demo-campaign';
    const url = `${window.location.origin}/fundraiser/${slug}`;
    
    setCampaignTitle(title);
    setCampaignUrl(url);
  }, [searchParams]);

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(campaignUrl);
      setCopyMessage('Link copied to clipboard!');
      setTimeout(() => setCopyMessage(''), 3000);
    } catch (error) {
      console.error('Failed to copy:', error);
    }
  };

  const handleShare = async () => {
    const shareData = {
      title: `Support: ${campaignTitle}`,
      text: 'Check out this interactive fundraising campaign!',
      url: campaignUrl,
    };

    try {
      if (navigator.share) {
        await navigator.share(shareData);
      } else {
        handleCopyLink();
      }
    } catch (error) {
      console.error('Share failed:', error);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="max-w-md w-full animate-fade-in">
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
            Your fundraising campaign "{campaignTitle}" is now live and ready to receive donations.
          </p>

          {/* Campaign URL */}
          <div className="bg-gray-50 rounded-lg p-4 mb-6">
            <p className="text-sm text-gray-600 mb-2">Your campaign link:</p>
            <div className="flex items-center space-x-2">
              <input
                type="text"
                value={campaignUrl}
                readOnly
                className="flex-1 bg-white border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900"
              />
              <button
                onClick={handleCopyLink}
                className="p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                title="Copy link"
              >
                <Copy className="w-4 h-4" />
              </button>
            </div>
            {copyMessage && (
              <p className="text-green-600 text-sm mt-2">{copyMessage}</p>
            )}
          </div>

          {/* Action Buttons */}
          <div className="space-y-3">
            <Link
              href={campaignUrl}
              className="w-full bg-blue-600 text-white py-3 rounded-xl font-semibold hover:bg-blue-700 transition-all duration-200 block"
            >
              View Your Campaign
            </Link>
            
            <button
              onClick={handleShare}
              className="w-full border-2 border-blue-600 text-blue-600 py-3 rounded-xl font-semibold hover:bg-blue-600 hover:text-white transition-all duration-200 flex items-center justify-center space-x-2"
            >
              <Share2 className="w-4 h-4" />
              <span>Share Campaign</span>
            </button>

            <Link
              href="/create"
              className="w-full text-gray-600 hover:text-gray-900 py-3 rounded-xl font-medium transition-colors block"
            >
              Create Another Campaign
            </Link>
          </div>

          {/* Next Steps */}
          <div className="mt-8 p-4 bg-blue-50 rounded-lg text-left">
            <h3 className="font-semibold text-blue-900 mb-2">Next Steps:</h3>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>• Share your campaign link with supporters</li>
              <li>• Monitor progress from your dashboard</li>
              <li>• Funds are transferred after each donation</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function CampaignCreatedPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-pulse p-8 text-center">
          <div className="w-16 h-16 bg-gray-200 rounded-full mx-auto mb-6"></div>
          <div className="h-8 bg-gray-200 rounded w-3/4 mx-auto mb-4"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2 mx-auto"></div>
        </div>
      </div>
    }>
      <CampaignCreatedContent />
    </Suspense>
  );
} 