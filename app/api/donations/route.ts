import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createServerSupabaseClient } from "@/lib/supabaseServer";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// Helper function to safely process square_ids
function processSquareIds(squareIds: any): string[] {
  if (!squareIds) return [];

  try {
    // If it's already an array, return it
    if (Array.isArray(squareIds)) {
      return squareIds.filter((id) => id != null).map((id) => String(id));
    }

    // If it's a string, try to parse as JSON first
    if (typeof squareIds === "string") {
      // Empty string check
      if (!squareIds.trim()) return [];

      // Try JSON parse
      try {
        const parsed = JSON.parse(squareIds);
        if (Array.isArray(parsed)) {
          return parsed.filter((id) => id != null).map((id) => String(id));
        }
        return [String(parsed)];
      } catch {
        // Not JSON, check if comma-separated
        if (squareIds.includes(",")) {
          return squareIds
            .split(",")
            .map((id) => id.trim())
            .filter((id) => id.length > 0);
        }
        return [squareIds];
      }
    }

    // For any other type, convert to string
    return [String(squareIds)];
  } catch (error) {
    console.warn("Error processing square_ids:", error);
    return [];
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const campaignId = searchParams.get("campaignId");

    // Create server supabase client for auth
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Create admin client for database operations
    const adminSupabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    // First, get user's campaigns
    const { data: userCampaigns, error: campaignError } = await adminSupabase
      .from("campaigns")
      .select("id, title, slug")
      .eq("user_id", user.id);

    if (campaignError) {
      console.error("Error fetching campaigns:", campaignError);
      return NextResponse.json(
        { error: "Failed to fetch campaigns" },
        { status: 500 },
      );
    }

    // If no campaigns, return empty donations
    if (!userCampaigns || userCampaigns.length === 0) {
      return NextResponse.json({ donations: [] });
    }

    // Create campaign lookup map
    const campaignMap = new Map();
    const campaignIds: string[] = [];

    for (const campaign of userCampaigns) {
      campaignMap.set(campaign.id, campaign);
      campaignIds.push(campaign.id);
    }

    // Build the transactions query
    let query = adminSupabase
      .from("transactions")
      .select("*")
      .in("campaign_id", campaignIds)
      .order("timestamp", { ascending: false });

    // Apply campaign filter if specified
    if (campaignId) {
      // Validate that the campaign belongs to the user
      if (campaignIds.includes(campaignId)) {
        query = query.eq("campaign_id", campaignId);
      } else {
        return NextResponse.json(
          { error: "Campaign not found or access denied" },
          { status: 403 },
        );
      }
    }

    // Execute the query
    const { data: transactions, error: transactionError } = await query;

    if (transactionError) {
      console.error("Error fetching transactions:", transactionError);
      return NextResponse.json(
        { error: "Failed to fetch donations" },
        { status: 500 },
      );
    }

    // Process the transactions into donations
    const donations: any[] = [];

    for (const transaction of transactions || []) {
      try {
        console.log("Processing transaction:", {
          id: transaction.id,
          total: transaction.total,
          status: transaction.status,
          payment_method: transaction.payment_method,
          square_ids: transaction.square_ids,
        });

        const campaign = campaignMap.get(transaction.campaign_id) || {
          title: "Unknown Campaign",
          slug: "",
        };

        const donation = {
          id: transaction.id,
          campaign_id: transaction.campaign_id,
          amount: transaction.total,
          total: transaction.total, // Dashboard expects 'total' field
          payment_method: transaction.payment_method,
          payment_status: transaction.status,
          status: transaction.status, // Dashboard expects 'status' field
          donor_name: transaction.donor_name,
          donor_email: transaction.donor_email,
          timestamp: transaction.timestamp,
          stripe_payment_intent_id: transaction.stripe_payment_intent_id,
          paypal_order_id: transaction.paypal_order_id,
          square_ids: processSquareIds(transaction.square_ids), // Dashboard expects 'square_ids'
          campaign: campaign,
        };

        // Enhanced logging for PayPal transactions
        if (transaction.payment_method === "paypal") {
          console.log("Processing PayPal transaction:", {
            id: donation.id,
            payment_method: donation.payment_method,
            status: donation.status,
            total: donation.total,
            paypal_order_id: donation.paypal_order_id,
            donor_name: donation.donor_name,
            donor_email: donation.donor_email,
            timestamp: donation.timestamp,
            square_ids: donation.square_ids,
          });
        }

        console.log("Created donation object:", {
          id: donation.id,
          total: donation.total,
          status: donation.status,
          square_ids: donation.square_ids,
        });

        donations.push(donation);
      } catch (error) {
        console.error(
          `Error processing transaction ${transaction?.id}:`,
          error,
        );
        // Continue processing other transactions
      }
    }

    return NextResponse.json({ donations });
  } catch (error) {
    console.error("Donations API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
