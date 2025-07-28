import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createServerSupabaseClient } from "@/lib/supabaseServer";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export async function PUT(request: NextRequest) {
  try {
    console.log("[EDIT-DONATION] Starting edit donation request");

    const { transactionId, donorName, donorEmail, status } =
      await request.json();

    console.log("[EDIT-DONATION] Request data:", {
      transactionId,
      donorName,
      donorEmail,
      status,
    });

    if (!transactionId) {
      console.log("[EDIT-DONATION] Missing transaction ID");
      return NextResponse.json(
        { error: "Transaction ID is required" },
        { status: 400 },
      );
    }

    // Create server supabase client for auth
    const supabase = await createServerSupabaseClient();

    // Check authentication
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    console.log("[EDIT-DONATION] Auth check:", {
      hasUser: !!user,
      userId: user?.id,
      authError: authError?.message || "none",
    });

    if (authError) {
      console.log("[EDIT-DONATION] Auth error:", authError);
      return NextResponse.json(
        { error: "Authentication failed" },
        { status: 401 },
      );
    }

    if (!user) {
      console.log("[EDIT-DONATION] No user found in session");
      return NextResponse.json(
        { error: "Unauthorized - no user session" },
        { status: 401 },
      );
    }

    // Create admin client for database operations
    const adminSupabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    // Get the transaction with enhanced logging
    console.log(
      `[EDIT-DONATION] Looking for transaction with ID: ${transactionId}`,
    );

    const { data: transaction, error: transactionError } = await adminSupabase
      .from("transactions")
      .select("*")
      .eq("id", transactionId)
      .single();

    console.log("[EDIT-DONATION] Transaction lookup result:", {
      found: !!transaction,
      transactionId: transaction?.id,
      campaignId: transaction?.campaign_id,
      currentStatus: transaction?.status,
      error: transactionError?.message || "none",
    });

    if (transactionError || !transaction) {
      console.error("[EDIT-DONATION] Transaction not found:", {
        transactionId,
        error: transactionError,
      });
      return NextResponse.json(
        { error: "Transaction not found" },
        { status: 404 },
      );
    }

    // Verify the campaign belongs to the user
    const { data: campaign, error: campaignError } = await adminSupabase
      .from("campaigns")
      .select("user_id, title")
      .eq("id", transaction.campaign_id)
      .single();

    console.log("[EDIT-DONATION] Campaign ownership check:", {
      campaignFound: !!campaign,
      campaignUserId: campaign?.user_id,
      requestUserId: user.id,
      isOwner: campaign?.user_id === user.id,
      error: campaignError?.message || "none",
    });

    if (campaignError || !campaign || campaign.user_id !== user.id) {
      return NextResponse.json(
        { error: "Transaction not found or access denied" },
        { status: 404 },
      );
    }

    // Update transaction
    const updateData: any = {};
    if (donorName !== undefined) updateData.donor_name = donorName;
    if (donorEmail !== undefined) updateData.donor_email = donorEmail;
    if (status !== undefined) updateData.status = status;

    console.log("[EDIT-DONATION] Updating transaction with:", updateData);

    const { error: updateError } = await adminSupabase
      .from("transactions")
      .update(updateData)
      .eq("id", transactionId);

    if (updateError) {
      console.error("[EDIT-DONATION] Error updating transaction:", updateError);
      return NextResponse.json(
        { error: "Failed to update transaction" },
        { status: 500 },
      );
    }

    console.log("[EDIT-DONATION] Transaction updated successfully");

    // Also update the squares if donor info changed or status changed
    if (
      transaction.square_ids &&
      (donorName !== undefined ||
        donorEmail !== undefined ||
        status !== undefined)
    ) {
      const squareUpdateData: any = {};
      if (donorName !== undefined) squareUpdateData.donor_name = donorName;
      if (donorEmail !== undefined) squareUpdateData.claimed_by = donorEmail;
      if (status === "completed") {
        squareUpdateData.payment_status = "completed";
        squareUpdateData.claimed_at = new Date().toISOString();
      } else if (status === "pending") {
        squareUpdateData.payment_status = "pending";
      } else if (status === "failed") {
        squareUpdateData.payment_status = "failed";
      }

      console.log("[EDIT-DONATION] Updating squares with data:", {
        squareUpdateData,
        square_ids: transaction.square_ids,
      });

      // Parse square_ids if it's a string
      let squareIds: string[] = [];
      try {
        if (typeof transaction.square_ids === "string") {
          // Handle both JSON string and comma-separated string
          if (transaction.square_ids.startsWith("[")) {
            squareIds = JSON.parse(transaction.square_ids);
          } else {
            squareIds = transaction.square_ids
              .split(",")
              .map((id) => id.trim())
              .filter((id) => id);
          }
        } else if (Array.isArray(transaction.square_ids)) {
          squareIds = transaction.square_ids;
        }
      } catch (e) {
        console.error("[EDIT-DONATION] Error parsing square_ids:", e);
        squareIds = [];
      }

      console.log("[EDIT-DONATION] Parsed square IDs:", squareIds);

      if (squareIds.length > 0) {
        console.log("[EDIT-DONATION] Updating squares for transaction:", transactionId);
        
        let updatedSquares: any[] | null = null;
        let squareUpdateError: any = null;

        // First, try to find squares with temp prefix
        console.log("[EDIT-DONATION] Looking for temp squares with claimed_by: temp_" + transactionId);
        
        const { data: tempSquares, error: tempSquareError } = await adminSupabase
          .from("squares")
          .select("*")
          .eq("claimed_by", `temp_${transactionId}`);

        console.log("[EDIT-DONATION] Temp squares query result:", {
          tempSquares: tempSquares?.length || 0,
          tempSquareError: tempSquareError?.message || "none",
        });

        // Try updating by temp prefix first
        if (tempSquares && tempSquares.length > 0) {
          console.log("[EDIT-DONATION] Updating squares by temp prefix");
          
          const { data: updatedTempSquares, error: tempUpdateError } = await adminSupabase
            .from("squares")
            .update(squareUpdateData)
            .eq("claimed_by", `temp_${transactionId}`)
            .select();

          console.log("[EDIT-DONATION] Temp squares update result:", {
            updatedTempSquares: updatedTempSquares?.length || 0,
            tempUpdateError: tempUpdateError?.message || "none",
          });

          if (!tempUpdateError && updatedTempSquares) {
            updatedSquares = updatedTempSquares;
            squareUpdateError = null;
          } else {
            squareUpdateError = tempUpdateError;
          }
        }

        // If no squares were updated by temp prefix, try updating by square IDs
        if (!updatedSquares || updatedSquares.length === 0) {
          console.log("[EDIT-DONATION] Trying to update squares by square_ids from transaction");
          
          const { data: squaresByIds, error: squaresByIdsError } = await adminSupabase
            .from("squares")
            .update(squareUpdateData)
            .in("id", squareIds)
            .select();

          console.log("[EDIT-DONATION] Square update by IDs result:", {
            squaresByIds: squaresByIds?.length || 0,
            squaresByIdsError: squaresByIdsError?.message || "none",
            squareIds,
          });

          if (!squaresByIdsError && squaresByIds) {
            updatedSquares = squaresByIds;
            squareUpdateError = null;
          } else {
            squareUpdateError = squaresByIdsError;
          }
        }

        console.log("[EDIT-DONATION] Final square update result:", {
          updatedCount: updatedSquares?.length || 0,
          squareUpdateError: squareUpdateError?.message || "none",
        });

        if (squareUpdateError) {
          console.error("[EDIT-DONATION] Error updating squares:", squareUpdateError);
        } else {
          console.log("[EDIT-DONATION] Successfully updated squares:", {
            count: updatedSquares?.length || 0,
            squares: updatedSquares?.map(s => `Square ${s.number}: ${s.donor_name} (${s.payment_status})`)
          });
        }
      }
    }

    console.log("[EDIT-DONATION] Edit donation completed successfully");
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[EDIT-DONATION] API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
