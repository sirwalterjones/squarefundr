import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabaseServer";
import { createClient } from "@supabase/supabase-js";

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
    console.log("[DELETE-DONATION] Campaign IDs to search in:", campaignIds);

    // Use admin client for better access
    const adminSupabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      },
    );

    // First, let's check if the transaction exists at all (without campaign filter)
    const { data: globalTransaction, error: globalError } = await adminSupabase
      .from("transactions")
      .select("*")
      .eq("id", transactionId)
      .maybeSingle();

    console.log("[DELETE-DONATION] Global transaction lookup:", {
      found: !!globalTransaction,
      error: globalError,
      transaction: globalTransaction
        ? {
            id: globalTransaction.id,
            campaign_id: globalTransaction.campaign_id,
            donor_name: globalTransaction.donor_name,
            total: globalTransaction.total,
          }
        : null,
    });

    // Now check with campaign filter
    const { data: transaction, error: transactionError } = await adminSupabase
      .from("transactions")
      .select("*")
      .eq("id", transactionId)
      .in("campaign_id", campaignIds)
      .maybeSingle();

    console.log("[DELETE-DONATION] Filtered transaction lookup:", {
      found: !!transaction,
      error: transactionError,
      transaction: transaction
        ? {
            id: transaction.id,
            campaign_id: transaction.campaign_id,
            donor_name: transaction.donor_name,
            total: transaction.total,
          }
        : null,
    });

    if (transaction) {
      console.log("[DELETE-DONATION] Found transaction, deleting...");
      console.log("[DELETE-DONATION] Transaction details:", {
        id: transaction.id,
        campaign_id: transaction.campaign_id,
        square_ids: transaction.square_ids,
        donor_name: transaction.donor_name,
        total: transaction.total,
      });

      // Parse square_ids and reset the squares - match the logic from donations route
      let squareIds = transaction.square_ids;
      console.log(
        "[DELETE-DONATION] Original square_ids:",
        squareIds,
        "(type:",
        typeof squareIds,
        ")",
      );

      if (typeof squareIds === "string") {
        try {
          squareIds = JSON.parse(squareIds);
          console.log(
            "[DELETE-DONATION] Parsed square_ids from JSON:",
            squareIds,
          );
        } catch (e) {
          console.log(
            "[DELETE-DONATION] Failed to parse JSON, splitting by comma:",
            e instanceof Error ? e.message : String(e),
          );
          squareIds = squareIds
            .split(",")
            .map((id) => id.trim())
            .filter((id) => id !== "");
          console.log("[DELETE-DONATION] Split square_ids:", squareIds);
        }
      }

      if (!Array.isArray(squareIds)) {
        squareIds = squareIds ? [squareIds] : [];
      }

      if (Array.isArray(squareIds) && squareIds.length > 0) {
        console.log(
          "[DELETE-DONATION] Resetting squares:",
          squareIds,
          "for campaign:",
          transaction.campaign_id,
        );

        // Reset squares by their IDs (not numbers) since square_ids contains UUIDs
        const { data: resetData, error: resetError } = await adminSupabase
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
          .in("id", squareIds)
          .select();

        console.log("[DELETE-DONATION] Square reset result:", {
          data: resetData,
          error: resetError,
          affectedRows: resetData?.length || 0,
        });

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
      } else {
        console.log(
          "[DELETE-DONATION] No squares to reset or invalid square_ids:",
          squareIds,
        );
        
        // Fallback: Look for squares claimed by the donor email (for PayPal transactions)
        if (transaction.donor_email) {
          console.log(
            "[DELETE-DONATION] Looking for squares claimed by donor email:",
            transaction.donor_email,
          );
          
          const { data: emailSquares, error: emailSquareError } = await adminSupabase
            .from("squares")
            .select("id, number, claimed_by")
            .eq("campaign_id", transaction.campaign_id)
            .eq("claimed_by", transaction.donor_email);
          
          if (emailSquares && emailSquares.length > 0) {
            console.log(
              "[DELETE-DONATION] Found squares claimed by email, resetting:",
              emailSquares.map(s => ({ id: s.id, number: s.number })),
            );
            
            const { data: resetEmailData, error: resetEmailError } = await adminSupabase
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
              .eq("claimed_by", transaction.donor_email)
              .select();
              
            console.log("[DELETE-DONATION] Email squares reset result:", {
              data: resetEmailData,
              error: resetEmailError,
              affectedRows: resetEmailData?.length || 0,
            });
            
            if (resetEmailError) {
              console.error(
                "[DELETE-DONATION] Error resetting email squares:",
                resetEmailError,
              );
              return NextResponse.json(
                {
                  error: "Failed to reset squares",
                  details: resetEmailError.message || "Database error while resetting email squares",
                },
                { status: 500 },
              );
            }
          } else {
            console.log(
              "[DELETE-DONATION] No squares found claimed by email:",
              transaction.donor_email,
            );
          }
          
          if (emailSquareError) {
            console.error(
              "[DELETE-DONATION] Error looking up email squares:",
              emailSquareError,
            );
          }
        }
      }

      // Delete the transaction
      console.log(
        "[DELETE-DONATION] Deleting transaction with ID:",
        transactionId,
      );
      const { data: deleteData, error: deleteError } = await adminSupabase
        .from("transactions")
        .delete()
        .eq("id", transactionId)
        .select();

      console.log("[DELETE-DONATION] Transaction deletion result:", {
        data: deleteData,
        error: deleteError,
        deletedRows: deleteData?.length || 0,
      });

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

    if (transactionError && transactionError.code !== "PGRST116") {
      console.error(
        "[DELETE-DONATION] Transaction lookup error:",
        transactionError,
      );
    }

    // If transaction not found, let's check why
    if (globalTransaction && !transaction) {
      console.log(
        "[DELETE-DONATION] Transaction exists globally but not in user's campaigns",
      );
      console.log(
        "[DELETE-DONATION] Transaction campaign_id:",
        globalTransaction.campaign_id,
      );
      console.log("[DELETE-DONATION] User campaign_ids:", campaignIds);
      console.log(
        "[DELETE-DONATION] Campaign ID match:",
        campaignIds.includes(globalTransaction.campaign_id),
      );

      return NextResponse.json(
        {
          error: "Access denied",
          details: "This donation belongs to a different user's campaign",
          debug: {
            transactionCampaignId: globalTransaction.campaign_id,
            userCampaignIds: campaignIds,
            belongsToUser: campaignIds.includes(globalTransaction.campaign_id),
          },
        },
        { status: 403 },
      );
    }

    // If not found as transaction, check if it's a square that was claimed directly
    console.log("[DELETE-DONATION] Checking for squares claimed by this ID...");

    const { data: claimedSquares, error: squareError } = await adminSupabase
      .from("squares")
      .select("*")
      .eq("claimed_by", transactionId)
      .in("campaign_id", campaignIds);

    console.log("[DELETE-DONATION] Claimed squares lookup:", {
      found: claimedSquares?.length || 0,
      error: squareError,
      squares:
        claimedSquares?.map((s) => ({
          id: s.id,
          number: s.number,
          campaign_id: s.campaign_id,
        })) || [],
    });

    if (claimedSquares && claimedSquares.length > 0) {
      console.log(
        "[DELETE-DONATION] Found squares claimed by this ID, resetting...",
      );

      const { error: resetError } = await adminSupabase
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

    // Get recent transactions for debugging
    const { data: allTransactions } = await adminSupabase
      .from("transactions")
      .select("id, donor_name, campaign_id, timestamp")
      .in("campaign_id", campaignIds)
      .order("timestamp", { ascending: false })
      .limit(10);

    // Check if the transaction exists anywhere (not just user's campaigns)
    const { data: globalTransactionDebug } = await adminSupabase
      .from("transactions")
      .select("id, donor_name, total, campaign_id")
      .eq("id", transactionId)
      .maybeSingle();

    console.log("[DELETE-DONATION] Debug info:", {
      searchedTransactionId: transactionId,
      userCampaignIds: campaignIds,
      recentTransactions: allTransactions?.map((t) => ({
        id: t.id,
        donor: t.donor_name,
      })),
      globalMatch: globalTransactionDebug
        ? {
            id: globalTransactionDebug.id,
            campaign_id: globalTransactionDebug.campaign_id,
            belongsToUser: campaignIds.includes(
              globalTransactionDebug.campaign_id,
            ),
          }
        : null,
    });

    return NextResponse.json(
      {
        error: "Donation not found",
        details: `No donation found with ID: ${transactionId}`,
        debug: {
          searchedId: transactionId,
          searchedIdType: typeof transactionId,
          userCampaigns: campaignIds.length,
          campaignIds: campaignIds,
          recentTransactions:
            allTransactions?.map((t) => ({
              id: t.id,
              donor_name: t.donor_name,
              campaign_id: t.campaign_id,
              timestamp: t.timestamp,
            })) || [],
          globalMatch: globalTransactionDebug
            ? {
                id: globalTransactionDebug.id,
                campaign_id: globalTransactionDebug.campaign_id,
                belongsToUser: campaignIds.includes(
                  globalTransactionDebug.campaign_id,
                ),
              }
            : null,
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
