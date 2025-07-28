import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabaseServer";
import { isDemoMode } from "@/lib/supabaseClient";
import { setupPersonalPayPalAccount } from "@/lib/paypal";

export async function POST(request: NextRequest) {
  try {
    const { email, campaignId } = await request.json();

    if (!email || !campaignId) {
      return NextResponse.json(
        { error: "Missing required fields: email, campaignId" },
        { status: 400 },
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: "Please enter a valid PayPal email address" },
        { status: 400 },
      );
    }

    // Check if in demo mode
    if (isDemoMode()) {
      console.log("Using demo mode for PayPal personal account setup");
      return NextResponse.json({
        success: true,
        accountId: "demo_paypal_personal_123",
        message: "PayPal personal account configured successfully (demo mode)",
      });
    }

    // Personal PayPal accounts only need an email address
    // No complex API setup required

    // Get authenticated user
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 },
      );
    }

    // Verify the campaign belongs to the user
    const { data: campaign, error: campaignError } = await supabase
      .from("campaigns")
      .select("id, user_id")
      .eq("id", campaignId)
      .eq("user_id", user.id)
      .single();

    if (campaignError || !campaign) {
      return NextResponse.json(
        { error: "Campaign not found or access denied" },
        { status: 404 },
      );
    }

    // Set up personal PayPal account (simplified)
    const paypalResult = setupPersonalPayPalAccount(email);

    // Store the PayPal email in the campaign
    const { error: updateError } = await supabase
      .from("campaigns")
      .update({
        paypal_email: email,
        paypal_account_id: paypalResult.accountId,
        paypal_onboarding_complete: true, // Personal accounts are immediately ready
      })
      .eq("id", campaignId);

    if (updateError) {
      console.error("Error updating campaign with PayPal info:", updateError);
      return NextResponse.json(
        { error: "Failed to save PayPal information" },
        { status: 500 },
      );
    }

    return NextResponse.json({
      success: true,
      accountId: paypalResult.accountId,
      message:
        "PayPal email saved! Supporters can now send donations directly to your PayPal account.",
    });
  } catch (error) {
    console.error("API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
