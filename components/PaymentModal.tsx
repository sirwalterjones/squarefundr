'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { PaymentModalProps, DonorInfo } from '@/types';
import { formatPrice, calculateTotalPrice } from '@/utils/pricingUtils';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

const donorSchema = z.object({
  email: z.string().email('Please enter a valid email').optional().or(z.literal('')),
  name: z.string().min(1, 'Name is required'),
  anonymous: z.boolean().optional(),
});

type DonorFormData = z.infer<typeof donorSchema>;

export default function PaymentModal({
  isOpen,
  onClose,
  selectedSquares,
  campaign,
  onSuccess
}: PaymentModalProps) {
  const [paymentMethod, setPaymentMethod] = useState<'stripe' | 'cash'>('stripe');
  const [isProcessing, setIsProcessing] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
    reset
  } = useForm<DonorFormData>({
    resolver: zodResolver(donorSchema),
    defaultValues: {
      anonymous: false
    }
  });

  const isAnonymous = watch('anonymous');
  const total = calculateTotalPrice(selectedSquares, campaign.pricing_type, campaign.price_data);

  const handleStripePayment = async (data: DonorFormData) => {
    setIsProcessing(true);
    try {
      // Create checkout session
      const response = await fetch('/api/create-checkout-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          campaignId: campaign.id,
          squares: selectedSquares,
          donorEmail: data.email,
          donorName: data.name,
          anonymous: data.anonymous,
        }),
      });

      const { url } = await response.json();
      
      if (url) {
        window.location.href = url;
      }
    } catch (error) {
      console.error('Payment error:', error);
      alert('Payment failed. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCashPayment = async (data: DonorFormData) => {
    setIsProcessing(true);
    try {
      const response = await fetch('/api/claim-squares-cash', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          campaignId: campaign.id,
          squares: selectedSquares,
          donorName: data.name,
          donorEmail: data.email,
          anonymous: data.anonymous,
        }),
      });

      if (response.ok) {
        onSuccess();
        onClose();
        reset();
      } else {
        throw new Error('Failed to claim squares');
      }
    } catch (error) {
      console.error('Cash payment error:', error);
      alert('Failed to claim squares. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  const onSubmit = (data: DonorFormData) => {
    if (paymentMethod === 'stripe') {
      handleStripePayment(data);
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
              <h2 className="text-xl font-bold text-gray-900">Complete Your Donation</h2>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Selected Squares Summary */}
            <div className="mb-6 p-4 bg-gray-50 rounded-lg">
              <h3 className="font-medium text-gray-900 mb-2">Selected Squares</h3>
              <div className="space-y-1">
                {selectedSquares.map((square) => (
                  <div key={`${square.row}-${square.col}`} className="flex justify-between text-sm">
                    <span>Square #{square.number}</span>
                    <span>{formatPrice(square.value)}</span>
                  </div>
                ))}
              </div>
              <div className="border-t border-gray-200 mt-2 pt-2 flex justify-between font-medium">
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
                  onClick={() => setPaymentMethod('stripe')}
                  className={`p-3 border rounded-lg text-center transition-colors ${
                    paymentMethod === 'stripe'
                      ? 'border-blue-600 bg-blue-50 text-blue-600'
                      : 'border-gray-300 hover:border-gray-400'
                  }`}
                >
                  <div className="font-medium">Credit Card</div>
                  <div className="text-xs text-gray-500">Secure online payment</div>
                </button>
                <button
                  type="button"
                  onClick={() => setPaymentMethod('cash')}
                  className={`p-3 border rounded-lg text-center transition-colors ${
                    paymentMethod === 'cash'
                      ? 'border-blue-600 bg-blue-50 text-blue-600'
                      : 'border-gray-300 hover:border-gray-400'
                  }`}
                >
                  <div className="font-medium">Cash</div>
                  <div className="text-xs text-gray-500">Pay organizer directly</div>
                </button>
              </div>
            </div>

            {/* Donor Information Form */}
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Your Name *
                </label>
                <input
                  {...register('name')}
                  type="text"
                  className="input-field"
                  placeholder="Enter your name"
                  disabled={isAnonymous}
                />
                {errors.name && (
                  <p className="text-red-600 text-sm mt-1">{errors.name.message}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email {paymentMethod === 'stripe' ? '*' : '(Optional)'}
                </label>
                <input
                  {...register('email')}
                  type="email"
                  className="input-field"
                  placeholder="Enter your email"
                  disabled={isAnonymous}
                />
                {errors.email && (
                  <p className="text-red-600 text-sm mt-1">{errors.email.message}</p>
                )}
              </div>

              <div className="flex items-center">
                <input
                  {...register('anonymous')}
                  type="checkbox"
                  id="anonymous"
                  className="h-4 w-4 text-blue-600 focus:ring-blue-600 border-gray-300 rounded"
                />
                <label htmlFor="anonymous" className="ml-2 text-sm text-gray-700">
                  Make this donation anonymous
                </label>
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
                    `${paymentMethod === 'stripe' ? 'Pay' : 'Claim'} ${formatPrice(total)}`
                  )}
                </button>
              </div>
            </form>

            {paymentMethod === 'cash' && (
              <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                <p className="text-sm text-yellow-800">
                  <strong>Cash Payment:</strong> Your squares will be reserved. Please arrange payment with the campaign organizer.
                </p>
              </div>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
