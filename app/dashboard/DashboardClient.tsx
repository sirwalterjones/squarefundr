'use client';

import { useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { User } from '@supabase/supabase-js';
import { Campaign } from '@/types';
import { formatPrice } from '@/utils/pricingUtils';

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

export default function DashboardClient({ campaigns, user }: DashboardClientProps) {
  const [selectedTab, setSelectedTab] = useState<'overview' | 'campaigns'>('overview');

  const totalRaised = campaigns.reduce((sum, campaign) => sum + campaign.stats.totalRaised, 0);
  const totalCampaigns = campaigns.length;
  const activeCampaigns = campaigns.filter(c => c.is_active).length;
  const totalSquaresClaimed = campaigns.reduce((sum, campaign) => sum + campaign.stats.claimedSquares, 0);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container-responsive py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Dashboard</h1>
          <p className="text-gray-600">Welcome back, {user.email}</p>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-xl shadow-sm p-6">
            <div className="text-2xl font-bold text-green-600">{formatPrice(totalRaised)}</div>
            <div className="text-sm text-gray-600">Total Raised</div>
          </div>
          <div className="bg-white rounded-xl shadow-sm p-6">
            <div className="text-2xl font-bold text-blue-600">{totalCampaigns}</div>
            <div className="text-sm text-gray-600">Total Campaigns</div>
          </div>
          <div className="bg-white rounded-xl shadow-sm p-6">
            <div className="text-2xl font-bold text-blue-600">{activeCampaigns}</div>
            <div className="text-sm text-gray-600">Active Campaigns</div>
          </div>
          <div className="bg-white rounded-xl shadow-sm p-6">
            <div className="text-2xl font-bold text-purple-600">{totalSquaresClaimed}</div>
            <div className="text-sm text-gray-600">Squares Claimed</div>
          </div>
        </div>

        {/* Tabs */}
        <div className="mb-6">
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-8">
              <button
                onClick={() => setSelectedTab('overview')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  selectedTab === 'overview'
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Overview
              </button>
              <button
                onClick={() => setSelectedTab('campaigns')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  selectedTab === 'campaigns'
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Campaigns
              </button>
            </nav>
          </div>
        </div>

        {/* Content */}
        {selectedTab === 'overview' && (
          <div className="space-y-6">
            {/* Quick Actions */}
            <div className="bg-white rounded-xl shadow-sm p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Quick Actions</h2>
              <div className="flex flex-col sm:flex-row gap-4">
                <Link href="/create" className="btn-primary text-center">
                  Create New Campaign
                </Link>
                <button className="btn-outline">
                  View Analytics
                </button>
                <button className="btn-outline">
                  Export Data
                </button>
              </div>
            </div>

            {/* Recent Activity */}
            <div className="bg-white rounded-xl shadow-sm p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Recent Campaigns</h2>
              {campaigns.length === 0 ? (
                <div className="text-center py-8">
                  <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No campaigns yet</h3>
                  <p className="text-gray-600 mb-4">Create your first fundraising campaign to get started.</p>
                  <Link href="/create" className="btn-primary">
                    Create Campaign
                  </Link>
                </div>
              ) : (
                <div className="space-y-4">
                  {campaigns.slice(0, 3).map((campaign) => (
                    <div key={campaign.id} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-4">
                          <div className="w-16 h-16 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0">
                            {campaign.image_url ? (
                              <img
                                src={campaign.image_url}
                                alt={campaign.title}
                                className="w-full h-full object-cover"
                                onError={(e) => {
                                  e.currentTarget.style.display = 'none';
                                  e.currentTarget.nextElementSibling?.classList.remove('hidden');
                                }}
                              />
                            ) : null}
                            <div className={`w-full h-full flex items-center justify-center text-gray-400 ${campaign.image_url ? 'hidden' : ''}`}>
                              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                              </svg>
                            </div>
                          </div>
                          <div>
                            <h3 className="font-medium text-gray-900">{campaign.title}</h3>
                            <p className="text-sm text-gray-600">
                              {campaign.stats.claimedSquares} of {campaign.stats.totalSquares} squares claimed
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-lg font-semibold text-green-600">
                            {formatPrice(campaign.stats.totalRaised)}
                          </div>
                          <div className="text-sm text-gray-600">
                            {Math.round(campaign.stats.progressPercentage)}% complete
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

        {selectedTab === 'campaigns' && (
          <div className="space-y-6">
            {/* Campaign List */}
            <div className="bg-white rounded-xl shadow-sm">
              <div className="p-6 border-b border-gray-200">
                <div className="flex justify-between items-center">
                  <h2 className="text-xl font-semibold text-gray-900">Your Campaigns</h2>
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
                                  e.currentTarget.style.display = 'none';
                                  e.currentTarget.nextElementSibling?.classList.remove('hidden');
                                }}
                              />
                            ) : null}
                            <div className={`w-full h-full flex items-center justify-center text-gray-400 ${campaign.image_url ? 'hidden' : ''}`}>
                              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                              </svg>
                            </div>
                          </div>
                          <div>
                            <h3 className="text-lg font-medium text-gray-900">{campaign.title}</h3>
                            <p className="text-sm text-gray-600 mb-2">
                              Created {new Date(campaign.created_at).toLocaleDateString()}
                            </p>
                            <div className="flex items-center space-x-4 text-sm">
                              <span className="text-gray-600">
                                {campaign.stats.claimedSquares}/{campaign.stats.totalSquares} squares
                              </span>
                              <span className="text-green-600 font-medium">
                                {formatPrice(campaign.stats.totalRaised)} raised
                              </span>
                              <span className={`px-2 py-1 rounded-full text-xs ${
                                campaign.is_active 
                                  ? 'bg-green-100 text-green-800' 
                                  : 'bg-gray-100 text-gray-800'
                              }`}>
                                {campaign.is_active ? 'Active' : 'Inactive'}
                              </span>
                            </div>
                          </div>
                        </div>
                        
                        <div className="flex items-center space-x-3">
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
                            <div className="text-xs text-gray-600">Complete</div>
                          </div>
                        </div>
                      </div>
                      
                      {/* Progress Bar */}
                      <div className="mt-4">
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div
                            className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                            style={{ width: `${campaign.stats.progressPercentage}%` }}
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
      </div>
    </div>
  );
} 