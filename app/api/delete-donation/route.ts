import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabaseServer";

export async function DELETE(request: NextRequest) {
  try {
    console.log("[DELETE-DONATION] Starting delete request");

    let requestBody;
    try {
      requestBody = await request.json();
    } catch (parseError) {
      console.error(
        "[DELETE-DONATION] Failed to parse request body:",
        parseError,
      );
      return NextResponse.json(
        {
          error: "Invalid request format",
          details: "Request body must be valid JSON",
        },
        { status: 400 },
      );
    }

    const { transactionId } = requestBody;
    console.log("[DELETE-DONATION] Request body:", requestBody);
    console.log(
      "[DELETE-DONATION] Transaction ID:",
      transactionId,
      "(type:",
      typeof transactionId,
      ")",
    );

    if (!transactionId) {
      console.log("[DELETE-DONATION] No transaction ID provided");
      console.log("[DELETE-DONATION] Request body was:", requestBody);
      return NextResponse.json(
        {
          error: "Transaction ID is required",
          details: "Missing transactionId in request body",
          receivedBody: requestBody,
        },
        { status: 400 },
      );
    }

    const supabase = await createServerSupabaseClient();

    // Check authentication
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError) {
      console.error("[DELETE-DONATION] Auth error:", authError);
      return NextResponse.json(
        {
          error: "Authentication failed",
          details: authError.message || "Unable to verify user authentication",
        },
        { status: 401 },
      );
    }

    if (!user) {
      console.log("[DELETE-DONATION] No user found");
      return NextResponse.json(
        {
          error: "User not authenticated",
          details: "No valid user session found",
        },
        { status: 401 },
      );
    }

    console.log("[DELETE-DONATION] User authenticated:", user.id);

    // Get user's campaigns first to limit our search scope
    const { data: userCampaigns, error: campaignError } = await supabase
      .from("campaigns")
      .select("id")
      .eq("user_id", user.id);

    if (campaignError) {
      console.error(
        "[DELETE-DONATION] Error fetching user campaigns:",
        campaignError,
      );
      return NextResponse.json(
        {
          error: "Failed to fetch campaigns",
          details:
            campaignError.message ||
            "Database error while fetching user campaigns",
        },
        { status: 500 },
      );
    }

    if (!userCampaigns || userCampaigns.length === 0) {
      console.log("[DELETE-DONATION] User has no campaigns");
      return NextResponse.json(
        { error: "No campaigns found" },
        { status: 404 },
      );
    }

    const campaignIds = userCampaigns.map((c) => c.id);
    console.log("[DELETE-DONATION] User campaign IDs:", campaignIds);

    console.log("[DELETE-DONATION] Looking up transaction:", transactionId);
    console.log("[DELETE-DONATION] Transaction ID type:", typeof transactionId);

    // Check if this is a transaction ID from the transactions table
    console.log(
      "[DELETE-DONATION] Looking for transaction with ID:",
      transactionId,
    );

    const { data: transaction, error: transactionError } = await supabase
      .from("transactions")
      .select("*")
      .eq("id", transactionId)
      .in("campaign_id", campaignIds)
      .maybeSingle();

    if (transaction) {
      console.log("[DELETE-DONATION] Found transaction, deleting...");

      // Parse square_ids and reset the squares
      let squareIds = transaction.square_ids;
      if (typeof squareIds === "string") {
        try {
          squareIds = JSON.parse(squareIds);
        } catch (e) {
          squareIds = squareIds
            .split(",")
            .map((id) => id.trim())
            .filter((id) => id);
        }
      }

      if (Array.isArray(squareIds) && squareIds.length > 0) {
        const { error: resetError } = await supabase
          .from("squares")
          .update({
            claimed_by: null,
            donor_name: null,
            payment_status: "pending",
            payment_type: "cash",
            claimed_at: null,
            updated_at: new Date().toISOString(),
          })
          .eq("campaign_id", transaction.campaign_id)
          .in("number", squareIds);

        if (resetError) {
          console.error(
            "[DELETE-DONATION] Error resetting squares:",
            resetError,
          );
          return NextResponse.json(
            {
              error: "Failed to reset squares",
              details:
                resetError.message || "Database error while resetting squares",
            },
            { status: 500 },
          );
        }
      }

      // Delete the transaction
      const { error: deleteError } = await supabase
        .from("transactions")
        .delete()
        .eq("id", transactionId);

      if (deleteError) {
        console.error(
          "[DELETE-DONATION] Error deleting transaction:",
          deleteError,
        );
        return NextResponse.json(
          {
            error: "Failed to delete transaction",
            details: deleteError.message,
          },
          { status: 500 },
        );
      }

      return NextResponse.json({
        success: true,
        message: "Donation deleted successfully",
      });
    }

    if (transactionError && transactionError.code !== "PGRST116") {
      console.error(
        "[DELETE-DONATION] Transaction lookup error:",
        transactionError,
      );
    }

    // If not found as transaction, check if it's a square that was claimed directly
    console.log("[DELETE-DONATION] Checking for squares claimed by this ID...");

    const { data: claimedSquares, error: squareError } = await supabase
      .from("squares")
      .select("*")
      .eq("claimed_by", transactionId)
      .in("campaign_id", campaignIds);

    if (claimedSquares && claimedSquares.length > 0) {
      console.log(
        "[DELETE-DONATION] Found squares claimed by this ID, resetting...",
      );

      const { error: resetError } = await supabase
        .from("squares")
        .update({
          claimed_by: null,
          donor_name: null,
          payment_status: "pending",
          payment_type: "cash",
          claimed_at: null,
          updated_at: new Date().toISOString(),
        })
        .eq("claimed_by", transactionId)
        .in("campaign_id", campaignIds);

      if (resetError) {
        console.error("[DELETE-DONATION] Error resetting squares:", resetError);
        return NextResponse.json(
          {
            error: "Failed to reset squares",
            details:
              resetError.message ||
              "Database error while resetting claimed squares",
          },
          { status: 500 },
        );
      }

      return NextResponse.json({
        success: true,
        message: "Donation deleted successfully",
      });
    }

    if (squareError && squareError.code !== "PGRST116") {
      console.error("[DELETE-DONATION] Square lookup error:", squareError);
    }

    // If nothing found, return error with debug info
    console.log("[DELETE-DONATION] Donation not found anywhere");

    // Get some debug info
    const { data: sampleTransactions } = await supabase
      .from("transactions")
      .select("id, donor_name, total")
      .in("campaign_id", campaignIds)
      .limit(5);

    return NextResponse.json(
      {
        error: "Donation not found",
        details: `No donation found with ID: ${transactionId}`,
        debug: {
          transactionId,
          userCampaigns: campaignIds.length,
          sampleTransactions: sampleTransactions?.map((t) => ({
            id: t.id,
            donor_name: t.donor_name,
          })),
        },
      },
      { status: 404 },
    );
  } catch (error) {
    console.error("[DELETE-DONATION] Unexpected error:", error);

    // Provide more detailed error information
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error occurred";
    const errorStack = error instanceof Error ? error.stack : undefined;

    console.error("[DELETE-DONATION] Error stack:", errorStack);

    return NextResponse.json(
      {
        error: "Internal server error",
        details: `Server encountered an unexpected error: ${errorMessage}`,
        timestamp: new Date().toISOString(),
      },
      { status: 500 },
    );
  }
}
