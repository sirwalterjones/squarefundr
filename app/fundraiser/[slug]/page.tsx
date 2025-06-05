'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import GridOverlay from '@/components/GridOverlay';
import PaymentModal from '@/components/PaymentModal';
import { Campaign, Square as SquareType, SelectedSquare, PricingType } from '@/types';
import { formatPrice } from '@/utils/pricingUtils';
import { Share2, Heart, Users, Target } from 'lucide-react';

export default function FundraiserPage() {
  const params = useParams();
  const slug = params?.slug as string;
  
  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [squares, setSquares] = useState<SquareType[]>([]);
  const [selectedSquares, setSelectedSquares] = useState<SelectedSquare[]>([]);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [shareMessage, setShareMessage] = useState('');
  const [showDemoSettings, setShowDemoSettings] = useState(false);
  const [demoConfig, setDemoConfig] = useState({
    rows: 10,
    columns: 10,
    pricingType: 'sequential' as PricingType,
    fixedPrice: 10,
    sequentialStart: 5,
    sequentialIncrement: 2,
    title: 'Baseball Team Championship Fund',
    description: 'Help our high school baseball team make it to the state championship! We need funds for new equipment, uniforms, travel expenses, and tournament fees. Every square you purchase brings us closer to our championship dreams and supports our student athletes.',
    imageUrl: 'https://images.unsplash.com/photo-1566577739112-5180d4bf9390?w=800&h=600&fit=crop'
  });

  // Demo campaign data - in production this would come from Supabase
  useEffect(() => {
    const loadCampaign = async () => {
      try {
        // Simulate API call delay
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // Check if this is the demo slug
        if (slug === 'team-championship-fund') {
          // Demo campaign data
          const demoCampaign: Campaign = {
            id: 'demo-campaign-1',
            title: demoConfig.title,
            description: demoConfig.description,
            image_url: demoConfig.imageUrl,
            rows: demoConfig.rows,
            columns: demoConfig.columns,
            pricing_type: demoConfig.pricingType,
            price_data: demoConfig.pricingType === 'fixed' 
              ? { fixed: demoConfig.fixedPrice }
              : { sequential: { start: demoConfig.sequentialStart, increment: demoConfig.sequentialIncrement } },
            user_id: 'campaign-owner',
            created_at: new Date().toISOString(),
            slug: slug,
            public_url: `${window.location.origin}/fundraiser/${slug}`,
            paid_to_admin: true,
            is_active: true
          };

          // Generate squares with some already claimed
          const demoSquares: SquareType[] = [];
          for (let row = 0; row < demoCampaign.rows; row++) {
            for (let col = 0; col < demoCampaign.columns; col++) {
              const number = (row * demoCampaign.columns) + col + 1;
              const value = demoConfig.pricingType === 'fixed' 
                ? demoConfig.fixedPrice 
                : demoConfig.sequentialStart + (number - 1) * demoConfig.sequentialIncrement;
              
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
                payment_status: isClaimed ? 'completed' : 'pending',
                payment_type: 'stripe',
                claimed_at: isClaimed ? new Date().toISOString() : undefined
              });
            }
          }

          setCampaign(demoCampaign);
          setSquares(demoSquares);
        } else {
          // Load real campaign from database
          const response = await fetch(`/api/campaigns/${slug}`);
          
          if (!response.ok) {
            throw new Error('Campaign not found');
          }
          
          const { campaign: realCampaign, squares: realSquares } = await response.json();
          setCampaign(realCampaign);
          setSquares(realSquares);
        }
      } catch (error) {
        console.error('Failed to load campaign:', error);
        setCampaign(null);
      } finally {
        setLoading(false);
      }
    };

    if (slug) {
      loadCampaign();
    }
  }, [slug, demoConfig]);

  const handleSquareSelect = (square: SelectedSquare) => {
    setSelectedSquares(prev => [...prev, square]);
  };

  const handleSquareDeselect = (square: SelectedSquare) => {
    setSelectedSquares(prev => 
      prev.filter(s => !(s.row === square.row && s.col === square.col))
    );
  };

  const handleDonate = () => {
    if (selectedSquares.length === 0) {
      alert('Please select at least one square to donate');
      return;
    }
    setIsPaymentModalOpen(true);
  };

  const handlePaymentSuccess = () => {
    // For demo campaigns, update state locally
    if (slug === 'team-championship-fund') {
      const claimedSquareIds = selectedSquares.map(s => `${s.row}-${s.col}`);
      
      setSquares(prev => prev.map(square => {
        const squareId = `${square.row}-${square.col}`;
        if (claimedSquareIds.includes(squareId)) {
          return {
            ...square,
            claimed_by: 'new-donor',
            donor_name: 'Anonymous Supporter',
            payment_status: 'completed' as const,
            claimed_at: new Date().toISOString()
          };
        }
        return square;
      }));
    } else {
      // For real campaigns, reload data from database
      const loadUpdatedData = async () => {
        try {
          const response = await fetch(`/api/campaigns/${slug}`);
          if (response.ok) {
            const { campaign: updatedCampaign, squares: updatedSquares } = await response.json();
            setCampaign(updatedCampaign);
            setSquares(updatedSquares);
          }
        } catch (error) {
          console.error('Error refreshing campaign data:', error);
        }
      };
      loadUpdatedData();
    }

    setSelectedSquares([]);
    setIsPaymentModalOpen(false);
    
    // Show success message
    alert('Thank you for your donation! Your squares have been claimed.');
  };

  const handleShare = async () => {
    const shareData = {
      title: campaign?.title || 'Support this fundraiser',
      text: campaign?.description || 'Help us reach our goal!',
      url: window.location.href,
    };

    try {
      if (navigator.share) {
        await navigator.share(shareData);
      } else {
        // Fallback: copy to clipboard
        await navigator.clipboard.writeText(window.location.href);
        setShareMessage('Link copied to clipboard!');
        setTimeout(() => setShareMessage(''), 3000);
      }
    } catch (error) {
      console.error('Share failed:', error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading campaign...</p>
        </div>
      </div>
    );
  }

  if (!campaign) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Campaign Not Found</h1>
          <p className="text-gray-600">The fundraiser you're looking for doesn't exist or has been removed.</p>
        </div>
      </div>
    );
  }

  const totalSquares = campaign.rows * campaign.columns;
  const claimedSquares = squares.filter(s => s.claimed_by).length;
  const totalRaised = squares.filter(s => s.claimed_by).reduce((sum, s) => sum + s.value, 0);
  const totalValue = selectedSquares.reduce((sum, s) => sum + s.value, 0);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero Section */}
      <div className="bg-white border-b border-gray-200">
        <div className="container-responsive py-4 md:py-8">
          <div className="flex flex-col lg:flex-row gap-6 lg:gap-8">
            {/* Campaign Info - 35% on desktop, full width on mobile */}
            <div className="lg:w-[35%] order-2 lg:order-1">
              <h1 className="text-2xl md:text-3xl lg:text-4xl font-bold text-gray-900 mb-3 md:mb-4">
                {campaign.title}
              </h1>
              <p className="text-base md:text-lg text-gray-600 mb-4 md:mb-6">
                {campaign.description}
              </p>
              
              {/* Progress Stats */}
              <div className="grid grid-cols-3 gap-2 md:gap-4 mb-4 md:mb-6">
                <div className="text-center p-2 md:p-4 bg-blue-50 rounded-lg">
                  <div className="flex items-center justify-center mb-1 md:mb-2">
                    <Target className="w-4 h-4 md:w-5 md:h-5 text-blue-600" />
                  </div>
                  <div className="text-lg md:text-2xl font-bold text-blue-600">{claimedSquares}</div>
                  <div className="text-xs md:text-sm text-gray-600">of {totalSquares} squares</div>
                </div>
                <div className="text-center p-2 md:p-4 bg-green-50 rounded-lg">
                  <div className="flex items-center justify-center mb-1 md:mb-2">
                    <Heart className="w-4 h-4 md:w-5 md:h-5 text-green-600" />
                  </div>
                  <div className="text-lg md:text-2xl font-bold text-green-600">${totalRaised}</div>
                  <div className="text-xs md:text-sm text-gray-600">raised so far</div>
                </div>
                <div className="text-center p-2 md:p-4 bg-purple-50 rounded-lg">
                  <div className="flex items-center justify-center mb-1 md:mb-2">
                    <Users className="w-4 h-4 md:w-5 md:h-5 text-purple-600" />
                  </div>
                  <div className="text-lg md:text-2xl font-bold text-purple-600">{Math.round((claimedSquares / totalSquares) * 100)}%</div>
                  <div className="text-xs md:text-sm text-gray-600">complete</div>
                </div>
              </div>

              {/* Share Button */}
              <button
                onClick={handleShare}
                className="flex items-center space-x-2 text-blue-600 hover:text-blue-700 transition-colors mb-4"
              >
                <Share2 className="w-4 h-4" />
                <span className="text-sm md:text-base">Share this campaign</span>
              </button>
              {shareMessage && (
                <p className="text-green-600 text-sm mt-2">{shareMessage}</p>
              )}

              {/* Demo Settings Button */}
              {slug === 'team-championship-fund' && (
                <button
                  onClick={() => setShowDemoSettings(!showDemoSettings)}
                  className="flex items-center space-x-2 bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition-colors mb-4 text-sm md:text-base"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  <span>Customize Demo</span>
                </button>
              )}

              {/* Legend */}
              <div className="mt-4 md:mt-6 p-3 md:p-4 bg-gray-50 rounded-lg">
                <h3 className="font-semibold text-gray-900 mb-2 text-sm md:text-base">Square Legend:</h3>
                <div className="space-y-2 text-xs md:text-sm">
                  <div className="flex items-center space-x-2">
                    <div className="w-4 h-4 bg-white bg-opacity-30 border border-white rounded"></div>
                    <span className="text-gray-700">Available to claim</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="w-4 h-4 bg-blue-500 bg-opacity-60 border border-blue-600 rounded"></div>
                    <span className="text-gray-700">Selected for donation</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="w-4 h-4 bg-red-500 bg-opacity-60 border border-red-600 rounded"></div>
                    <span className="text-gray-700">Already claimed</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Grid Area - 65% on desktop, full width on mobile */}
            <div className="lg:w-[65%] order-1 lg:order-2">
              <div className="relative w-full">
                <GridOverlay
                  campaign={campaign}
                  squares={squares}
                  selectedSquares={selectedSquares}
                  onSquareSelect={handleSquareSelect}
                  onSquareDeselect={handleSquareDeselect}
                  imageUrl={campaign.image_url}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Selection Summary & Donate */}
      {selectedSquares.length > 0 && (
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-lg z-50 animate-slide-up">
          <div className="container-responsive py-3 md:py-4">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="text-center sm:text-left">
                <p className="font-semibold text-gray-900 text-sm md:text-base">
                  {selectedSquares.length} square{selectedSquares.length !== 1 ? 's' : ''} selected
                </p>
                <p className="text-xs md:text-sm text-gray-600">
                  Total: {formatPrice(totalValue)}
                </p>
              </div>
              <div className="flex space-x-2 md:space-x-3">
                <button
                  onClick={() => setSelectedSquares([])}
                  className="px-3 md:px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors text-sm md:text-base"
                >
                  Clear
                </button>
                <button
                  onClick={() => setIsPaymentModalOpen(true)}
                  className="px-4 md:px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-semibold text-sm md:text-base"
                >
                  Donate {formatPrice(totalValue)}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* How it Works */}
      <div className="container-responsive py-12">
        <div className="text-center mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">How it Works</h2>
          <p className="text-gray-600 max-w-2xl mx-auto">
            Select squares on the image above to support this campaign. Each square has a different value, and once claimed, your support helps reach the fundraising goal.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          <div className="text-center p-6 bg-white rounded-xl shadow-sm border border-gray-100">
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mx-auto mb-4">
              <span className="text-2xl font-bold text-blue-600">1</span>
            </div>
            <h3 className="font-semibold text-gray-900 mb-2">Select Squares</h3>
            <p className="text-sm text-gray-600">
              Click on available squares in the grid above. Each square shows its value.
            </p>
          </div>

          <div className="text-center p-6 bg-white rounded-xl shadow-sm border border-gray-100">
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mx-auto mb-4">
              <span className="text-2xl font-bold text-blue-600">2</span>
            </div>
            <h3 className="font-semibold text-gray-900 mb-2">Make Payment</h3>
            <p className="text-sm text-gray-600">
              Complete your donation securely with your preferred payment method.
            </p>
          </div>

          <div className="text-center p-6 bg-white rounded-xl shadow-sm border border-gray-100">
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mx-auto mb-4">
              <span className="text-2xl font-bold text-blue-600">3</span>
            </div>
            <h3 className="font-semibold text-gray-900 mb-2">Support the Cause</h3>
            <p className="text-sm text-gray-600">
              Your squares are claimed and your donation helps reach the fundraising goal!
            </p>
          </div>
        </div>
      </div>

      {/* Payment Modal */}
      {campaign && (
        <PaymentModal
          isOpen={isPaymentModalOpen}
          onClose={() => setIsPaymentModalOpen(false)}
          selectedSquares={selectedSquares}
          campaign={campaign}
          onSuccess={handlePaymentSuccess}
        />
      )}

      {/* Demo Settings Modal */}
      {showDemoSettings && slug === 'team-championship-fund' && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold text-gray-900">Customize Demo</h2>
                <button
                  onClick={() => setShowDemoSettings(false)}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="space-y-6">
                {/* Campaign Info */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Campaign Title</label>
                  <input
                    type="text"
                    value={demoConfig.title}
                    onChange={(e) => setDemoConfig(prev => ({ ...prev, title: e.target.value }))}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
                  <textarea
                    value={demoConfig.description}
                    onChange={(e) => setDemoConfig(prev => ({ ...prev, description: e.target.value }))}
                    rows={3}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:border-transparent"
                  />
                </div>

                {/* Image Selection */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Campaign Image</label>
                  <div className="space-y-3">
                    {/* Preset Options */}
                    <div className="grid grid-cols-2 gap-2">
                      {[
                        { 
                          name: 'Baseball', 
                          url: 'https://images.unsplash.com/photo-1566577739112-5180d4bf9390?w=800&h=600&fit=crop',
                          title: 'Baseball Team Championship Fund',
                          description: 'Help our high school baseball team make it to the state championship! We need funds for new equipment, uniforms, travel expenses, and tournament fees. Every square you purchase brings us closer to our championship dreams and supports our student athletes.'
                        },
                        { 
                          name: 'Football', 
                          url: 'https://images.unsplash.com/photo-1551698618-1dfe5d97d256?w=800&h=600&fit=crop',
                          title: 'Football Team Championship Fund',
                          description: 'Help our high school football team reach the state championship! We need funds for new equipment, travel expenses, and tournament fees. Every square you purchase brings us closer to our goal and supports our student athletes in their pursuit of excellence.'
                        },
                        { 
                          name: 'Basketball', 
                          url: 'https://images.unsplash.com/photo-1546519638-68e109498ffc?w=800&h=600&fit=crop',
                          title: 'Basketball Team Championship Fund',
                          description: 'Help our varsity basketball team compete in the state tournament! We need funds for new uniforms, equipment, and travel costs. Every square you purchase helps our athletes reach their full potential and represent our school with pride.'
                        },
                        { 
                          name: 'Soccer', 
                          url: 'https://images.unsplash.com/photo-1553778263-73a83bab9b0c?w=800&h=600&fit=crop',
                          title: 'Soccer Team Championship Fund',
                          description: 'Support our soccer team as they work toward the regional championship! We need funds for equipment, field fees, and tournament travel. Your contribution helps our dedicated student athletes pursue their championship goals.'
                        }
                      ].map((preset) => (
                        <button
                          key={preset.name}
                          onClick={() => setDemoConfig(prev => ({ 
                            ...prev, 
                            imageUrl: preset.url,
                            title: preset.title,
                            description: preset.description
                          }))}
                          className={`p-2 rounded-lg border text-xs font-medium transition-colors ${
                            demoConfig.imageUrl === preset.url
                              ? 'bg-blue-50 border-blue-500 text-blue-700'
                              : 'bg-gray-50 border-gray-300 text-gray-700 hover:bg-gray-100'
                          }`}
                        >
                          {preset.name}
                        </button>
                      ))}
                    </div>
                    
                    {/* Custom URL Input */}
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Or enter custom image URL:</label>
                      <input
                        type="url"
                        value={demoConfig.imageUrl}
                        onChange={(e) => setDemoConfig(prev => ({ ...prev, imageUrl: e.target.value }))}
                        placeholder="https://example.com/image.jpg"
                        className="w-full p-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:border-transparent"
                      />
                    </div>
                  </div>
                </div>

                {/* Grid Dimensions */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Rows</label>
                    <input
                      type="number"
                      min="3"
                      max="20"
                      value={demoConfig.rows}
                      onChange={(e) => setDemoConfig(prev => ({ ...prev, rows: parseInt(e.target.value) || 3 }))}
                      className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Columns</label>
                    <input
                      type="number"
                      min="3"
                      max="20"
                      value={demoConfig.columns}
                      onChange={(e) => setDemoConfig(prev => ({ ...prev, columns: parseInt(e.target.value) || 3 }))}
                      className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:border-transparent"
                    />
                  </div>
                </div>

                {/* Pricing Type */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Pricing Type</label>
                  <select
                    value={demoConfig.pricingType}
                    onChange={(e) => setDemoConfig(prev => ({ ...prev, pricingType: e.target.value as PricingType }))}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:border-transparent"
                  >
                    <option value="fixed">Fixed Price</option>
                    <option value="sequential">Sequential Pricing</option>
                  </select>
                </div>

                {/* Pricing Settings */}
                {demoConfig.pricingType === 'fixed' ? (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Price per Square ($)</label>
                    <input
                      type="number"
                      min="1"
                      value={demoConfig.fixedPrice}
                      onChange={(e) => setDemoConfig(prev => ({ ...prev, fixedPrice: parseInt(e.target.value) || 1 }))}
                      className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:border-transparent"
                    />
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Starting Price ($)</label>
                      <input
                        type="number"
                        min="1"
                        value={demoConfig.sequentialStart}
                        onChange={(e) => setDemoConfig(prev => ({ ...prev, sequentialStart: parseInt(e.target.value) || 1 }))}
                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:border-transparent"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Increment ($)</label>
                      <input
                        type="number"
                        min="0"
                        value={demoConfig.sequentialIncrement}
                        onChange={(e) => setDemoConfig(prev => ({ ...prev, sequentialIncrement: parseInt(e.target.value) || 0 }))}
                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:border-transparent"
                      />
                    </div>
                  </div>
                )}

                {/* Apply Button */}
                <div className="pt-4">
                  <button
                    onClick={() => setShowDemoSettings(false)}
                    className="w-full bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors"
                  >
                    Apply Changes
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 