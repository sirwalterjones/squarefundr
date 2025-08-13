import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createServerSupabaseClient } from "@/lib/supabaseServer";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// Helper function to safely process square_ids
function processSquareIds(squareIds: any): string[] {
  if (!squareIds) return [];

  try {
    if (Array.isArray(squareIds)) {
      return squareIds.filter((id) => id != null).map((id) => String(id));
    }

    if (typeof squareIds === "string") {
      if (!squareIds.trim()) return [];

      try {
        const parsed = JSON.parse(squareIds);
        if (Array.isArray(parsed)) {
          return parsed.filter((id) => id != null).map((id) => String(id));
        }
        return [String(parsed)];
      } catch {
        if (squareIds.includes(",")) {
          return squareIds
            .split(",")
            .map((id) => id.trim())
            .filter((id) => id.length > 0);
        }
        return [squareIds];
      }
    }

    return [String(squareIds)];
  } catch (error) {
    console.warn("Error processing square_ids:", error);
    return [];
  }
}

export async function GET(request: NextRequest) {
  try {
    // Create server supabase client for auth
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Create admin client for role check


    const adminSupabase = createClient(supabaseUrl, supabaseServiceKey, {


      auth: {


        autoRefreshToken: false,


        persistSession: false,


      },


    });



    // Check if user is admin using admin client


    const { data: userRole, error: roleError } = await adminSupabase


      .from("user_roles")


      .select("role")


      .eq("user_id", user.id)


      .eq("role", "admin")


      .single();

    if (roleError || !userRole) {
      return NextResponse.json(
        { error: "Admin access required" },
        { status: 403 },
      );
    }

    // Continue with admin client for database operations

    // Get all campaigns for lookup
    const { data: campaigns, error: campaignError } = await adminSupabase
      .from("campaigns")
      .select("id, title, slug");

    if (campaignError) {
      console.error("Error fetching campaigns:", campaignError);
      return NextResponse.json(
        { error: "Failed to fetch campaigns" },
        { status: 500 },
      );
    }

    // Create campaign lookup map
    const campaignMap = new Map();
    for (const campaign of campaigns || []) {
      campaignMap.set(campaign.id, campaign);
    }

    // Get all transactions
    const { data: transactions, error: transactionError } = await adminSupabase
      .from("transactions")
      .select("*")
      .order("timestamp", { ascending: false });

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
        const campaign = campaignMap.get(transaction.campaign_id) || {
          title: "Unknown Campaign",
          slug: "",
        };

        const donation = {
          id: transaction.id,
          campaign_id: transaction.campaign_id,
          amount: transaction.total,
          total: transaction.total,
          payment_method: transaction.payment_method,
          payment_status: transaction.status,
          status: transaction.status,
          donor_name: transaction.donor_name,
          donor_email: transaction.donor_email,
          timestamp: transaction.timestamp,
          stripe_payment_intent_id: transaction.stripe_payment_intent_id,
          paypal_order_id: transaction.paypal_order_id,
          square_ids: processSquareIds(transaction.square_ids),
          campaign: campaign,
        };

        donations.push(donation);
      } catch (error) {
        console.error(
          `Error processing transaction ${transaction?.id}:`,
          error,
        );
      }
    }

    return NextResponse.json({ donations });
  } catch (error) {
    console.error("Master admin donations API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { id } = await request.json();

    if (!id) {
      return NextResponse.json(
        { error: "Transaction ID is required" },
        { status: 400 },
      );
    }

    // Create server supabase client for auth
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Create admin client for role check
    const adminSupabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    
    // Check if user is admin using admin client


    const { data: userRole, error: roleError } = await adminSupabase


      .from("user_roles")


      .select("role")


      .eq("user_id", user.id)


      .eq("role", "admin")


      .single();

    if (roleError || !userRole) {
      return NextResponse.json(
        { error: "Admin access required" },
        { status: 403 },
      );
    }

    // Continue with admin client for database operations

    // Get the transaction to find associated squares
    const { data: transaction, error: fetchError } = await adminSupabase
      .from("transactions")
      .select("square_ids")
      .eq("id", id)
      .single();

    if (fetchError) {
      console.error("Error fetching transaction:", fetchError);
      return NextResponse.json(
        { error: "Transaction not found" },
        { status: 404 },
      );
    }

    // Process square IDs
    const squareIds = processSquareIds(transaction.square_ids);

    // Reset squares to unclaimed if there are any
    if (squareIds.length > 0) {
      const { error: squareError } = await adminSupabase
        .from("squares")
        .update({
          claimed_by: null,
          donor_name: null,
          payment_status: "pending",
          claimed_at: null,
        })
        .in("id", squareIds);

      if (squareError) {
        console.error("Error resetting squares:", squareError);
        // Continue with transaction deletion even if square reset fails
      }
    }

    // Delete the transaction
    const { error: deleteError } = await adminSupabase
      .from("transactions")
      .delete()
      .eq("id", id);

    if (deleteError) {
      console.error("Error deleting transaction:", deleteError);
      return NextResponse.json(
        { error: "Failed to delete donation" },
        { status: 500 },
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Master admin delete donation API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
