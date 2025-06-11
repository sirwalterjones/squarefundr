import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createServerSupabaseClient } from "@/lib/supabaseServer";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const campaignId = searchParams.get("campaignId");

    // Check auth with regular client
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Use admin client for data queries
    const adminSupabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    // Get user's campaigns
    const { data: userCampaigns, error: campaignError } = await adminSupabase
      .from("campaigns")
      .select("id, title, slug")
      .eq("user_id", user.id);

    if (campaignError) {
      return NextResponse.json(
        { error: "Failed to fetch campaigns" },
        { status: 500 },
      );
    }

    if (!userCampaigns || userCampaigns.length === 0) {
      return NextResponse.json({ donations: [] });
    }

    const campaignIds = userCampaigns.map((c) => c.id);
    const campaignMap = userCampaigns.reduce(
      (acc, c) => {
        acc[c.id] = c;
        return acc;
      },
      {} as Record<string, any>,
    );

    // Build transaction query
    let query = adminSupabase
      .from("transactions")
      .select("*")
      .in("campaign_id", campaignIds)
      .order("timestamp", { ascending: false });

    if (campaignId && campaignIds.includes(campaignId)) {
      query = query.eq("campaign_id", campaignId);
    }

    const { data: transactions, error: transactionError } = await query;

    if (transactionError) {
      return NextResponse.json(
        { error: "Failed to fetch transactions" },
        { status: 500 },
      );
    }

    // Process donations
    const donations = (transactions || []).map((donation) => {
      let processedSquareIds = donation.square_ids;

      // Parse square_ids if it's a string
      if (typeof donation.square_ids === "string") {
        try {
          processedSquareIds = JSON.parse(donation.square_ids);
        } catch (e) {
          processedSquareIds = donation.square_ids
            .split(",")
            .map((id) => {
              const num = parseInt(id.trim(), 10);
              return isNaN(num) ? id.trim() : num;
            })
            .filter((id) => id !== "" && id !== 0);
        }
      }

      if (!Array.isArray(processedSquareIds)) {
        processedSquareIds = processedSquareIds ? [processedSquareIds] : [];
      }

      return {
        ...donation,
        square_ids: processedSquareIds,
        campaign: campaignMap[donation.campaign_id],
      };
    });

    return NextResponse.json({ donations });
  } catch (error) {
    console.error("Donations API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
