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
    // 1. Check transactions table with multiple ID formats
    // 2. Check squares table for direct square claims
    // 3. Check if this is actually a square ID that needs to be looked up differently

    console.log("[DELETE-DONATION] Looking up transaction:", transactionId);
    console.log("[DELETE-DONATION] Transaction ID type:", typeof transactionId);

    // First, let's check if this ID exists in squares table as a claimed square
    // The donation might be showing a square ID instead of a transaction ID
    const { data: squareByClaimedBy, error: squareByClaimedByError } =
      await supabase
        .from("squares")
        .select("*")
        .eq("claimed_by", transactionId)
        .maybeSingle();

    if (squareByClaimedBy) {
      console.log(
        "[DELETE-DONATION] Found square by claimed_by field:",
        squareByClaimedBy.id,
      );
      // This is a square that was claimed, reset it
      const { error: resetError } = await supabase
        .from("squares")
        .update({
          claimed_by: null,
          donor_name: null,
          payment_status: "pending",
          payment_type: "stripe",
          claimed_at: null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", squareByClaimedBy.id);

      if (resetError) {
        console.error("[DELETE-DONATION] Error resetting square:", resetError);
        return NextResponse.json(
          {
            error: "Failed to delete donation",
            details: resetError.message,
          },
          { status: 500 },
        );
      }

      console.log("[DELETE-DONATION] Successfully reset square by claimed_by");
      return NextResponse.json({
        success: true,
        message: "Donation deleted successfully",
      });
    }

    if (squareByClaimedByError && squareByClaimedByError.code !== "PGRST116") {
      console.error(
        "[DELETE-DONATION] Error checking claimed_by:",
        squareByClaimedByError,
      );
    }

    // Try multiple approaches to find the transaction
    let transaction: any = null;
    let transactionError: any = null;

    // First try: Direct UUID lookup
    const { data: directTransaction, error: directError } = await supabase
      .from("transactions")
      .select("*")
      .eq("id", transactionId)
      .maybeSingle();

    if (directTransaction) {
      transaction = directTransaction;
      console.log("[DELETE-DONATION] Found transaction via direct UUID lookup");
    } else if (directError && directError.code !== "PGRST116") {
      transactionError = directError;
      console.log("[DELETE-DONATION] Direct lookup error:", directError);
    } else {
      console.log("[DELETE-DONATION] Direct UUID lookup returned no results");

      // Second try: If it looks like a number, try numeric lookup
      if (!isNaN(Number(transactionId))) {
        console.log(
          "[DELETE-DONATION] Trying numeric ID:",
          Number(transactionId),
        );
        const { data: numericTransaction, error: numericError } = await supabase
          .from("transactions")
          .select("*")
          .eq("id", Number(transactionId))
          .maybeSingle();

        if (numericTransaction) {
          transaction = numericTransaction;
          console.log("[DELETE-DONATION] Found transaction via numeric lookup");
        } else if (numericError && numericError.code !== "PGRST116") {
          transactionError = numericError;
          console.log("[DELETE-DONATION] Numeric lookup error:", numericError);
        }
      }

      // Third try: Search by string representation in case of type mismatch
      if (!transaction && !transactionError) {
        console.log("[DELETE-DONATION] Trying string conversion lookup");
        const { data: stringTransaction, error: stringError } = await supabase
          .from("transactions")
          .select("*")
          .eq("id", String(transactionId))
          .maybeSingle();

        if (stringTransaction) {
          transaction = stringTransaction;
          console.log("[DELETE-DONATION] Found transaction via string lookup");
        } else if (stringError && stringError.code !== "PGRST116") {
          transactionError = stringError;
          console.log("[DELETE-DONATION] String lookup error:", stringError);
        }
      }
    }

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
        const { error: squareUpdateError, data: updatedSquare } = await supabase
          .from("squares")
          .update({
            claimed_by: null,
            donor_name: null,
            payment_status: "pending",
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

    // Try multiple approaches to find the square
    let square: any = null;
    let squareError: any = null;

    // First try: Direct lookup
    const { data: directSquare, error: directSquareError } = await supabase
      .from("squares")
      .select("*")
      .eq("id", transactionId)
      .maybeSingle();

    if (directSquare) {
      square = directSquare;
      console.log("[DELETE-DONATION] Found square via direct lookup");
    } else if (directSquareError && directSquareError.code !== "PGRST116") {
      squareError = directSquareError;
      console.log(
        "[DELETE-DONATION] Direct square lookup error:",
        directSquareError,
      );
    } else {
      console.log("[DELETE-DONATION] Direct square lookup returned no results");

      // Second try: Numeric lookup
      if (!isNaN(Number(transactionId))) {
        console.log(
          "[DELETE-DONATION] Trying numeric square ID:",
          Number(transactionId),
        );
        const { data: numericSquare, error: numericSquareError } =
          await supabase
            .from("squares")
            .select("*")
            .eq("id", Number(transactionId))
            .maybeSingle();

        if (numericSquare) {
          square = numericSquare;
          console.log("[DELETE-DONATION] Found square via numeric lookup");
        } else if (
          numericSquareError &&
          numericSquareError.code !== "PGRST116"
        ) {
          squareError = numericSquareError;
          console.log(
            "[DELETE-DONATION] Numeric square lookup error:",
            numericSquareError,
          );
        }
      }

      // Third try: String conversion lookup
      if (!square && !squareError) {
        console.log("[DELETE-DONATION] Trying string square lookup");
        const { data: stringSquare, error: stringSquareError } = await supabase
          .from("squares")
          .select("*")
          .eq("id", String(transactionId))
          .maybeSingle();

        if (stringSquare) {
          square = stringSquare;
          console.log("[DELETE-DONATION] Found square via string lookup");
        } else if (stringSquareError && stringSquareError.code !== "PGRST116") {
          squareError = stringSquareError;
          console.log(
            "[DELETE-DONATION] String square lookup error:",
            stringSquareError,
          );
        }
      }
    }

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
        foundTransaction: !!transaction,
        foundSquare: !!square,
        transactionError: transactionError?.message,
        squareError: squareError?.message,
      });

      // Let's also try a broader search to see what data exists
      const { data: sampleTransactions, error: sampleTransError } =
        await supabase
          .from("transactions")
          .select("id, campaign_id, donor_name, stripe_payment_intent_id")
          .limit(5);

      const { data: sampleSquares, error: sampleSquareError } = await supabase
        .from("squares")
        .select("id, campaign_id, claimed_by, donor_name, payment_status")
        .limit(5);

      console.log("[DELETE-DONATION] Sample data in database:", {
        sampleTransactions: sampleTransactions?.map((t) => ({
          id: t.id,
          type: typeof t.id,
        })),
        sampleSquares: sampleSquares?.map((s) => ({
          id: s.id,
          type: typeof s.id,
        })),
        sampleTransError: sampleTransError?.message,
        sampleSquareError: sampleSquareError?.message,
      });

      return NextResponse.json(
        {
          error: "Donation not found",
          details: `No donation found with ID: ${transactionId} (type: ${typeof transactionId})`,
          debug: {
            searchedTransactions: true,
            searchedInSquares: true,
            transactionId,
            transactionIdType: typeof transactionId,
            foundTransaction: !!transaction,
            foundSquare: !!square,
            sampleTransactionIds: sampleTransactions?.map((t) => ({
              id: t.id,
              type: typeof t.id,
            })),
            sampleSquareIds: sampleSquares?.map((s) => ({
              id: s.id,
              type: typeof s.id,
              claimed_by: s.claimed_by,
              donor_name: s.donor_name,
            })),
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
      square.id,
    );
    const { error: squareUpdateError, data: updatedSquare } = await supabase
      .from("squares")
      .update({
        claimed_by: null,
        donor_name: null,
        payment_status: "pending",
        claimed_at: null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", square.id)
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
