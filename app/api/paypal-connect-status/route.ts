import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabaseServer";
import { isDemoMode } from "@/lib/supabaseClient";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const campaignId = searchParams.get("campaignId");

    if (!campaignId) {
      return NextResponse.json(
        { error: "Campaign ID is required" },
        { status: 400 },
      );
    }

    // Check if in demo mode
    if (isDemoMode()) {
      return NextResponse.json({
        success: true,
        status: "ACTIVE",
        onboardingComplete: true,
        message: "PayPal personal account active (demo mode)",
      });
    }

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

    // Get campaign with PayPal info
    const { data: campaign, error: campaignError } = await supabase
      .from("campaigns")
      .select(
        "id, user_id, paypal_email, paypal_account_id, paypal_onboarding_complete",
      )
      .eq("id", campaignId)
      .eq("user_id", user.id)
      .single();

    if (campaignError || !campaign) {
      return NextResponse.json(
        { error: "Campaign not found or access denied" },
        { status: 404 },
      );
    }

    if (!campaign.paypal_email) {
      return NextResponse.json({
        success: true,
        status: "NOT_CONNECTED",
        onboardingComplete: false,
        message: "PayPal personal account not connected",
      });
    }

    // For personal accounts, if email is set, it's ready to go
    return NextResponse.json({
      success: true,
      status: "ACTIVE",
      onboardingComplete: true,
      paypalEmail: campaign.paypal_email,
      message:
        "PayPal personal account is active and ready to receive payments",
    });
  } catch (error) {
    console.error("API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
