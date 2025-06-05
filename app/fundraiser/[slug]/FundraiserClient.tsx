'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Campaign, Square, SelectedSquare } from '@/types';
import GridOverlay from '@/components/GridOverlay';
import PaymentModal from '@/components/PaymentModal';
import { formatPrice, calculateTotalPrice } from '@/utils/pricingUtils';
import { supabase } from '@/lib/supabaseClient';

interface FundraiserClientProps {
  campaign: Campaign;
  squares: Square[];
}

export default function FundraiserClient({ campaign, squares: initialSquares }: FundraiserClientProps) {
  const [squares, setSquares] = useState<Square[]>(initialSquares);
  const [selectedSquares, setSelectedSquares] = useState<SelectedSquare[]>([]);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Real-time subscription to squares updates
  useEffect(() => {
    const channel = supabase
      .channel('squares-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'squares',
          filter: `campaign_id=eq.${campaign.id}`,
        },
        (payload) => {
          if (payload.eventType === 'UPDATE') {
            setSquares(prev => 
              prev.map(square => 
                square.id === payload.new.id 
                  ? { ...square, ...payload.new }
                  : square
              )
            );
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [campaign.id]);

  const handleSquareSelect = (square: SelectedSquare) => {
    setSelectedSquares(prev => [...prev, square]);
  };

  const handleSquareDeselect = (square: SelectedSquare) => {
    setSelectedSquares(prev => 
      prev.filter(s => !(s.row === square.row && s.col === square.col))
    );
  };

  const handlePaymentSuccess = async () => {
    // Refresh squares data
    setIsLoading(true);
    try {
      const { data: updatedSquares } = await supabase
        .from('squares')
        .select('*')
        .eq('campaign_id', campaign.id)
        .order('number');

      if (updatedSquares) {
        setSquares(updatedSquares);
      }
      
      setSelectedSquares([]);
    } catch (error) {
      console.error('Error refreshing squares:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const totalSelected = calculateTotalPrice(selectedSquares, campaign.pricing_type, campaign.price_data);
  const claimedSquares = squares.filter(s => s.claimed_by).length;
  const totalSquares = squares.length;
  const progressPercentage = (claimedSquares / totalSquares) * 100;

  const totalRaised = squares
    .filter(s => s.payment_status === 'completed')
    .reduce((sum, s) => sum + s.value, 0);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container-responsive py-8">
        {/* Campaign Header */}
        <div className="mb-8">
          <h1 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-4">
            {campaign.title}
          </h1>
          {campaign.description && (
            <p className="text-lg text-gray-600 mb-6">
              {campaign.description}
            </p>
          )}
          
          {/* Progress Stats */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <div className="bg-white rounded-lg p-4 text-center">
              <div className="text-2xl font-bold text-blue-600">{claimedSquares}</div>
              <div className="text-sm text-gray-600">Squares Claimed</div>
            </div>
            <div className="bg-white rounded-lg p-4 text-center">
              <div className="text-2xl font-bold text-gray-900">{totalSquares}</div>
              <div className="text-sm text-gray-600">Total Squares</div>
            </div>
            <div className="bg-white rounded-lg p-4 text-center">
              <div className="text-2xl font-bold text-green-600">{formatPrice(totalRaised)}</div>
              <div className="text-sm text-gray-600">Raised</div>
            </div>
            <div className="bg-white rounded-lg p-4 text-center">
              <div className="text-2xl font-bold text-gray-900">{Math.round(progressPercentage)}%</div>
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
                Click on available squares to select them for donation. Selected squares will be highlighted.
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
                        <span className="font-medium">{formatPrice(square.value)}</span>
                      </div>
                    ))}
                  </div>
                  
                  <div className="border-t border-gray-200 pt-4">
                    <div className="flex justify-between items-center font-semibold">
                      <span>Total ({selectedSquares.length} squares)</span>
                      <span className="text-lg text-blue-600">{formatPrice(totalSelected)}</span>
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
                {campaign.pricing_type === 'fixed' && (
                  <p>All squares: <span className="font-medium text-blue-600">{formatPrice(campaign.price_data.fixed || 0)}</span></p>
                )}
                {campaign.pricing_type === 'sequential' && campaign.price_data.sequential && (
                  <p>
                    Starting at <span className="font-medium text-blue-600">{formatPrice(campaign.price_data.sequential.start)}</span>, 
                    increasing by <span className="font-medium">{formatPrice(campaign.price_data.sequential.increment)}</span> per square
                  </p>
                )}
                {campaign.pricing_type === 'manual' && (
                  <p>Each square has individual pricing - hover over squares to see prices</p>
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
      />
    </div>
  );
} 