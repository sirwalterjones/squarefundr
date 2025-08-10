import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export async function GET(request: NextRequest) {
  try {
    // Create admin client for public stats (no auth required for public data)
    const adminSupabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    // Get count of active campaigns
    const { data: campaigns, error: campaignError } = await adminSupabase
      .from("campaigns")
      .select("id")
      .eq("is_active", true);

    if (campaignError) {
      console.error("Error fetching campaign count:", campaignError);
      return NextResponse.json(
        { error: "Failed to fetch campaign statistics" },
        { status: 500 },
      );
    }

    const totalCampaigns = campaigns?.length || 0;

    // Get total money raised from completed transactions
    const { data: transactions, error: transactionError } = await adminSupabase
      .from("transactions")
      .select("total")
      .eq("status", "completed");

    if (transactionError) {
      console.error("Error fetching transaction totals:", transactionError);
      return NextResponse.json(
        { error: "Failed to fetch donation statistics" },
        { status: 500 },
      );
    }

    const totalRaised = transactions?.reduce((sum, transaction) => {
      return sum + (parseFloat(transaction.total) || 0);
    }, 0) || 0;

    console.log(`📊 Public stats: ${totalCampaigns} campaigns, $${totalRaised} raised`);

    return NextResponse.json({
      success: true,
      stats: {
        totalCampaigns,
        totalRaised: Math.round(totalRaised),
      },
    });

  } catch (error) {
    console.error("Public stats API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
