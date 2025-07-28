import Stripe from 'stripe';
import { loadStripe } from '@stripe/stripe-js';

// Check if Stripe is properly configured
const isStripeConfigured = Boolean(
  process.env.STRIPE_SECRET_KEY && 
  process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
);

// Create a mock Stripe instance for when Stripe is not yet configured
const createMockStripe = () => {
  return {
    checkout: {
      sessions: {
        create: () => {
          console.warn('Stripe not configured - using mock implementation');
          return Promise.resolve({ url: '/stripe-not-configured' });
        }
      }
    },
    accounts: {
      create: () => Promise.resolve({ id: 'mock_acct_123' })
    },
    accountLinks: {
      create: () => Promise.resolve({ url: '/mock-account-link' })
    },
    paymentIntents: {
      create: () => Promise.resolve({ client_secret: 'mock_pi_secret' })
    }
  } as unknown as Stripe;
};

// Server-side Stripe instance with fallback for when not configured
export const stripe = isStripeConfigured
  ? new Stripe(process.env.STRIPE_SECRET_KEY!, {
      apiVersion: '2025-05-28.basil',
    })
  : createMockStripe();

// Client-side Stripe instance
export const getStripe = () => {
  if (!process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY) {
    console.warn('Stripe publishable key not configured');
    return Promise.resolve(null);
  }
  return loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY);
};

// Check if we're in demo mode for Stripe (not configured yet)
export function isStripeDemo(): boolean {
  return !isStripeConfigured;
}

// Stripe Connect helpers
export async function createConnectedAccount(email: string) {
  if (!isStripeConfigured) {
    console.warn('Stripe not configured - using mock implementation');
    return { id: 'mock_acct_123' };
  }
  
  try {
    const account = await stripe.accounts.create({
      type: 'standard',
      email: email,
    });
    return account;
  } catch (error) {
    console.error('Error creating Stripe Connect account:', error);
    throw error;
  }
}

export async function createAccountLink(accountId: string, refreshUrl: string, returnUrl: string) {
  if (!isStripeConfigured) {
    console.warn('Stripe not configured - using mock implementation');
    return { url: returnUrl };
  }
  
  try {
    const accountLink = await stripe.accountLinks.create({
      account: accountId,
      refresh_url: refreshUrl,
      return_url: returnUrl,
      type: 'account_onboarding',
    });
    return accountLink;
  } catch (error) {
    console.error('Error creating account link:', error);
    throw error;
  }
}

// Admin fee payment - simplified to regular payment
export async function createAdminFeePaymentIntent(amount: number, currency: string = 'usd') {
  if (!isStripeConfigured) {
    console.warn('Stripe not configured - using mock implementation');
    return { client_secret: 'mock_pi_secret' };
  }
  
  try {
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(amount * 100), // Convert to cents
      currency,
    });
    return paymentIntent;
  } catch (error) {
    console.error('Error creating admin fee payment intent:', error);
    throw error;
  }
}

// Donation payment with application fee
export async function createDonationPaymentIntent(
  amount: number,
  connectedAccountId: string,
  applicationFeeAmount: number,
  currency: string = 'usd'
) {
  if (!isStripeConfigured) {
    console.warn('Stripe not configured - using mock implementation');
    return { client_secret: 'mock_pi_secret' };
  }
  
  try {
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(amount * 100), // Convert to cents
      currency,
      application_fee_amount: Math.round(applicationFeeAmount * 100),
      transfer_data: {
        destination: connectedAccountId,
      },
    });
    return paymentIntent;
  } catch (error) {
    console.error('Error creating donation payment intent:', error);
    throw error;
  }
}

// Create Checkout Session for donations
export async function createCheckoutSession(
  amount: number,
  connectedAccountId: string,
  campaignId: string,
  squareIds: string[],
  successUrl: string,
  cancelUrl: string,
  donorEmail?: string
) {
  if (!isStripeConfigured) {
    console.warn('Stripe not configured - using mock implementation');
    return { url: successUrl };
  }
  
  try {
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: 'Square Donation',
              description: `Donation for squares: ${squareIds.join(', ')}`,
            },
            unit_amount: Math.round(amount * 100),
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: successUrl,
      cancel_url: cancelUrl,
      customer_email: donorEmail,
      metadata: {
        campaign_id: campaignId,
        square_ids: JSON.stringify(squareIds),
      },
      payment_intent_data: {
        application_fee_amount: Math.round(amount * 0.03 * 100), // 3% platform fee
        transfer_data: {
          destination: connectedAccountId,
        },
      },
    });
    return session;
  } catch (error) {
    console.error('Error creating checkout session:', error);
    throw error;
  }
}
