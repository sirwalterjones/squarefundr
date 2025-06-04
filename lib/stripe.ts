import Stripe from 'stripe';
import { loadStripe } from '@stripe/stripe-js';

// Server-side Stripe instance
export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-05-28.basil',
});

// Client-side Stripe instance
export const getStripe = () => {
  return loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);
};

// Stripe Connect helpers
export async function createConnectedAccount(email: string) {
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
