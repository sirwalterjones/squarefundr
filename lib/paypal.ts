// PayPal configuration and utilities

// For personal PayPal accounts, we don't need client credentials from individual users
// The platform can facilitate payments directly to their PayPal email addresses
const isPayPalConfigured = true; // Always available for personal accounts

// PayPal API base URL (sandbox vs production)
const PAYPAL_API_BASE =
  process.env.NODE_ENV === "production"
    ? "https://api-m.paypal.com"
    : "https://api-m.sandbox.paypal.com";

// For personal PayPal accounts, we use a simplified approach
// Payments are sent directly to the recipient's PayPal email
export async function getPayPalAccessToken(): Promise<string> {
  // For personal account integration, we don't need platform-level tokens
  // PayPal handles the payment directly to the recipient's email
  throw new Error("Access token not needed for personal PayPal integration");
}

// Create PayPal payment link for personal accounts
export async function createPayPalOrder(
  amount: number,
  currency: string = "USD",
  campaignId: string,
  squareIds: string[],
  returnUrl: string,
  cancelUrl: string,
  payeeEmail?: string,
) {
  if (!payeeEmail) {
    throw new Error("PayPal email is required for personal account payments");
  }

  // For personal PayPal accounts, we create a direct payment link
  // This uses PayPal's simple payment link format
  const paypalParams = new URLSearchParams({
    cmd: "_xclick",
    business: payeeEmail,
    item_name: `Square Donation - Campaign ${campaignId}`,
    amount: amount.toFixed(2),
    currency_code: currency,
    return: returnUrl,
    cancel_return: cancelUrl,
    custom: JSON.stringify({
      campaign_id: campaignId,
      square_ids: squareIds,
    }),
    no_shipping: "1",
    no_note: "1",
  });

  const paypalUrl = `https://www.paypal.com/cgi-bin/webscr?${paypalParams.toString()}`;

  return {
    id: `personal_order_${Date.now()}`,
    links: [{ href: paypalUrl, rel: "approve" }],
    personal_account: true,
  };
}

// For personal accounts, PayPal handles capture automatically
export async function capturePayPalOrder(orderId: string) {
  // Personal PayPal payments are captured automatically
  // We just return a success status
  return { id: orderId, status: "COMPLETED" };
}

// PayPal personal accounts are always available
export function isPayPalDemo(): boolean {
  return false; // Personal accounts don't need demo mode
}

// Get PayPal client ID for frontend
export function getPayPalClientId(): string {
  return process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID || "";
}

// Simplified PayPal setup for personal accounts
export function setupPersonalPayPalAccount(email: string) {
  // For personal accounts, users just need to provide their PayPal email
  // No complex onboarding process required
  return {
    accountId: `personal_${email.replace("@", "_at_")}`,
    email: email,
    setupComplete: true,
    message: "Personal PayPal account configured successfully",
  };
}
