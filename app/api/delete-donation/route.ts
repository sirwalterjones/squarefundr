import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabaseServer";

export async function DELETE(request: NextRequest) {
  try {
    console.log("[DELETE-DONATION] Starting delete request");
    const requestBody = await request.json();
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
        { error: "Authentication failed", details: authError.message },
        { status: 401 },
      );
    }

    if (!user) {
      console.log("[DELETE-DONATION] No user found");
      return NextResponse.json(
        { error: "User not authenticated" },
        { status: 401 },
      );
    }

    console.log("[DELETE-DONATION] User authenticated:", user.id);

    // Strategy: Look for donation in multiple places
    // 1. Check transactions table
    // 2. Check squares table for direct square claims

    console.log("[DELETE-DONATION] Looking up transaction:", transactionId);
    const { data: transaction, error: transactionError } = await supabase
      .from("transactions")
      .select("*")
      .eq("id", transactionId)
      .single();

    console.log("[DELETE-DONATION] Transaction lookup result:", {
      transaction: transaction
        ? {
            id: transaction.id,
            campaign_id: transaction.campaign_id,
            square_ids: transaction.square_ids,
          }
        : null,
      transactionError: transactionError
        ? { code: transactionError.code, message: transactionError.message }
        : null,
      hasTransaction: !!transaction,
    });

    if (transactionError) {
      if (transactionError.code === "PGRST116") {
        // Transaction not found, continue to check squares table
        console.log(
          "[DELETE-DONATION] Transaction not found, checking squares table",
        );
      } else {
        console.error(
          "[DELETE-DONATION] Transaction lookup error:",
          transactionError,
        );
        return NextResponse.json(
          {
            error: "Database error while looking up transaction",
            details: transactionError.message,
          },
          { status: 500 },
        );
      }
    }

    // If found in transactions table
    if (transaction && !transactionError) {
      console.log("[DELETE-DONATION] Found transaction, verifying ownership");

      // Get campaign to verify ownership
      const { data: campaign, error: campaignError } = await supabase
        .from("campaigns")
        .select("user_id")
        .eq("id", transaction.campaign_id)
        .single();

      if (campaignError || !campaign) {
        console.log("[DELETE-DONATION] Campaign not found");
        return NextResponse.json(
          { error: "Campaign not found" },
          { status: 404 },
        );
      }

      // Verify ownership
      if (campaign.user_id !== user.id) {
        console.log("[DELETE-DONATION] User does not own this campaign");
        return NextResponse.json(
          { error: "Unauthorized - you don't own this campaign" },
          { status: 403 },
        );
      }

      // First, unclaim the squares (reset them to available)
      if (transaction.square_ids && transaction.square_ids.length > 0) {
        console.log(
          "[DELETE-DONATION] Unclaiming squares:",
          transaction.square_ids,
        );

        // Parse square_ids if it's a string
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

        console.log("[DELETE-DONATION] Parsed square IDs:", squareIds);

        // Update squares by number instead of ID for better reliability
        const { error: squareUpdateError } = await supabase
          .from("squares")
          .update({
            claimed_by: null,
            donor_name: null,
            payment_status: "pending",
            payment_type: "stripe",
            claimed_at: null,
            updated_at: new Date().toISOString(),
          })
          .eq("campaign_id", transaction.campaign_id)
          .in("number", squareIds);

        if (squareUpdateError) {
          console.error(
            "[DELETE-DONATION] Error unclaiming squares:",
            squareUpdateError,
          );
          return NextResponse.json(
            {
              error: "Failed to unclaim squares",
              details: squareUpdateError.message,
            },
            { status: 500 },
          );
        }

        console.log(
          "[DELETE-DONATION] Successfully unclaimed",
          squareIds.length,
          "squares",
        );
      }

      // Then delete the transaction
      console.log("[DELETE-DONATION] Deleting transaction");
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

      console.log("[DELETE-DONATION] Transaction deleted successfully");
      return NextResponse.json({
        success: true,
        message: "Donation deleted successfully",
      });
    }

    // If not found in transactions, check if it's a direct square claim
    console.log(
      "[DELETE-DONATION] Not found in transactions, checking squares table for ID:",
      transactionId,
    );
    const { data: square, error: squareError } = await supabase
      .from("squares")
      .select("*")
      .eq("id", transactionId)
      .single();

    console.log("[DELETE-DONATION] Square lookup result:", {
      square: square
        ? {
            id: square.id,
            campaign_id: square.campaign_id,
            claimed_by: square.claimed_by,
            payment_status: square.payment_status,
          }
        : null,
      squareError: squareError
        ? { code: squareError.code, message: squareError.message }
        : null,
      hasSquare: !!square,
      transactionIdType: typeof transactionId,
      transactionIdValue: transactionId,
    });

    if (squareError) {
      if (squareError.code === "PGRST116") {
        // Square not found either
        console.log("[DELETE-DONATION] Square not found either");
      } else {
        console.error("[DELETE-DONATION] Square lookup error:", squareError);
        return NextResponse.json(
          {
            error: "Database error while looking up square",
            details: squareError.message,
          },
          { status: 500 },
        );
      }
    }

    if (!square || squareError) {
      console.log("[DELETE-DONATION] Donation not found in either table");
      console.log("[DELETE-DONATION] Debug info:", {
        transactionId,
        transactionIdType: typeof transactionId,
        searchedInTransactions: true,
        searchedInSquares: true,
        foundTransaction: false,
        foundSquare: false,
      });

      // Let's also try a broader search to see if the ID exists anywhere
      const { data: allSquares, error: allSquaresError } = await supabase
        .from("squares")
        .select("id, campaign_id, claimed_by")
        .limit(5);

      console.log("[DELETE-DONATION] Sample squares in database:", {
        allSquares: allSquares?.slice(0, 3),
        allSquaresError,
        totalFound: allSquares?.length,
      });

      return NextResponse.json(
        {
          error: "Donation not found",
          details: `No donation found with ID: ${transactionId} (type: ${typeof transactionId})`,
          debug: {
            searchedTransactions: true,
            searchedSquares: true,
            transactionId,
            transactionIdType: typeof transactionId,
          },
        },
        { status: 404 },
      );
    }

    // Get campaign to verify ownership for square
    const { data: squareCampaign, error: squareCampaignError } = await supabase
      .from("campaigns")
      .select("user_id")
      .eq("id", square.campaign_id)
      .single();

    if (squareCampaignError || !squareCampaign) {
      console.log("[DELETE-DONATION] Campaign not found for square");
      return NextResponse.json(
        { error: "Campaign not found" },
        { status: 404 },
      );
    }

    // Verify ownership for square
    if (squareCampaign.user_id !== user.id) {
      console.log("[DELETE-DONATION] User does not own this campaign (square)");
      return NextResponse.json(
        { error: "Unauthorized - you don't own this campaign" },
        { status: 403 },
      );
    }

    // Delete the square claim by resetting it
    console.log(
      "[DELETE-DONATION] Resetting square claim for square ID:",
      transactionId,
    );
    const { error: squareUpdateError, data: updatedSquare } = await supabase
      .from("squares")
      .update({
        claimed_by: null,
        donor_name: null,
        payment_status: "pending",
        payment_type: "stripe",
        claimed_at: null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", transactionId)
      .select();

    if (squareUpdateError) {
      console.error(
        "[DELETE-DONATION] Error resetting square:",
        squareUpdateError,
      );
      return NextResponse.json(
        {
          error: "Failed to delete donation",
          details: squareUpdateError.message,
        },
        { status: 500 },
      );
    }

    console.log("[DELETE-DONATION] Successfully reset square:", updatedSquare);

    console.log("[DELETE-DONATION] Square reset successfully");
    return NextResponse.json({
      success: true,
      message: "Donation deleted successfully",
    });
  } catch (error) {
    console.error("[DELETE-DONATION] Unexpected error:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
