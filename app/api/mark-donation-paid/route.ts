import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// Get environment variables with proper error handling
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl) {
  throw new Error("NEXT_PUBLIC_SUPABASE_URL is required but not set");
}

if (!supabaseServiceKey) {
  throw new Error("SUPABASE_SERVICE_ROLE_KEY is required but not set");
}

// Create admin client
const adminSupabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

export async function POST(request: NextRequest) {
  console.log("[MARK-PAID-NEW] POST request received");

  try {
    const body = await request.json();
    const { transactionId } = body;

    console.log("[MARK-PAID-NEW] Transaction ID:", transactionId);

    if (!transactionId) {
      return NextResponse.json(
        { error: "Transaction ID is required" },
        { status: 400 },
      );
    }

    // Get the transaction first
    const { data: transaction, error: transactionError } = await adminSupabase
      .from("transactions")
      .select("*")
      .eq("id", transactionId)
      .single();

    if (transactionError || !transaction) {
      console.error("[MARK-PAID-NEW] Transaction not found:", transactionError);
      return NextResponse.json(
        { error: "Transaction not found" },
        { status: 404 },
      );
    }

    console.log("[MARK-PAID-NEW] Found transaction:", transaction);

    // Update transaction status to completed
    const { error: updateError } = await adminSupabase
      .from("transactions")
      .update({
        status: "completed",
        timestamp: new Date().toISOString(),
      })
      .eq("id", transactionId);

    if (updateError) {
      console.error("[MARK-PAID-NEW] Error updating transaction:", updateError);
      return NextResponse.json(
        { error: "Failed to update transaction" },
        { status: 500 },
      );
    }

    // Update the squares to mark them as completed
    console.log("[MARK-PAID-NEW] Updating squares for transaction:", transactionId);
    
    const updateData = {
      claimed_by: transaction.donor_email || "anonymous",
      donor_name: transaction.donor_name || "Anonymous",
      payment_status: "completed" as const,
      payment_type: "paypal" as const,
      claimed_at: new Date().toISOString(),
    };

    console.log("[MARK-PAID-NEW] Square update data:", updateData);

    // First, try to find squares with temp prefix
    console.log("[MARK-PAID-NEW] Looking for temp squares with claimed_by: temp_" + transactionId);
    
    const { data: tempSquares, error: tempSquareError } = await adminSupabase
      .from("squares")
      .select("*")
      .eq("claimed_by", `temp_${transactionId}`);

    console.log("[MARK-PAID-NEW] Temp squares query result:", {
      tempSquares: tempSquares?.length || 0,
      tempSquareError,
    });

    let updatedSquares: any[] | null = null;
    let squareUpdateError: any = null;

    // Try updating by temp prefix first
    if (tempSquares && tempSquares.length > 0) {
      console.log("[MARK-PAID-NEW] Updating squares by temp prefix");
      
      const { data: updatedTempSquares, error: tempUpdateError } = await adminSupabase
        .from("squares")
        .update(updateData)
        .eq("claimed_by", `temp_${transactionId}`)
        .select();

      console.log("[MARK-PAID-NEW] Temp squares update result:", {
        updatedTempSquares: updatedTempSquares?.length || 0,
        tempUpdateError,
      });

      if (!tempUpdateError && updatedTempSquares) {
        updatedSquares = updatedTempSquares;
        squareUpdateError = null;
      } else {
        squareUpdateError = tempUpdateError;
      }
    }

    // If no squares were updated by temp prefix, try updating by square IDs from transaction
    if ((!updatedSquares || updatedSquares.length === 0) && transaction.square_ids) {
      console.log("[MARK-PAID-NEW] Trying to update squares by square_ids from transaction");
      
      try {
        let squareIds = transaction.square_ids;

        // Parse if it's a string
        if (typeof squareIds === "string") {
          squareIds = JSON.parse(squareIds);
        }

        console.log("[MARK-PAID-NEW] Square IDs to update:", squareIds);

        if (Array.isArray(squareIds) && squareIds.length > 0) {
          const { data: squaresByIds, error: squaresByIdsError } = await adminSupabase
            .from("squares")
            .update(updateData)
            .in("id", squareIds)
            .select();

          console.log("[MARK-PAID-NEW] Square update by IDs result:", {
            squaresByIds: squaresByIds?.length || 0,
            squaresByIdsError,
            squareIds,
          });

          if (!squaresByIdsError && squaresByIds) {
            updatedSquares = squaresByIds;
            squareUpdateError = null;
          } else {
            squareUpdateError = squaresByIdsError;
          }
        }
      } catch (parseError) {
        console.error("[MARK-PAID-NEW] Error parsing square_ids:", parseError);
        squareUpdateError = parseError;
      }
    }

    // If still no squares updated and this is a PayPal transaction, try to find squares by campaign and payment status
    if ((!updatedSquares || updatedSquares.length === 0) && transaction.payment_method === "paypal") {
      console.log("[MARK-PAID-NEW] PayPal transaction with no square_ids - looking for pending PayPal squares in campaign");
      
      const { data: pendingPayPalSquares, error: pendingPayPalError } = await adminSupabase
        .from("squares")
        .select("*")
        .eq("campaign_id", transaction.campaign_id)
        .eq("payment_type", "paypal")
        .eq("payment_status", "pending");

      console.log("[MARK-PAID-NEW] Pending PayPal squares query result:", {
        pendingPayPalSquares: pendingPayPalSquares?.length || 0,
        pendingPayPalError,
      });

      if (pendingPayPalSquares && pendingPayPalSquares.length > 0) {
        console.log("[MARK-PAID-NEW] Found pending PayPal squares, updating them");
        
        const { data: updatedPendingSquares, error: pendingUpdateError } = await adminSupabase
          .from("squares")
          .update(updateData)
          .eq("campaign_id", transaction.campaign_id)
          .eq("payment_type", "paypal")
          .eq("payment_status", "pending")
          .select();

        console.log("[MARK-PAID-NEW] Pending PayPal squares update result:", {
          updatedPendingSquares: updatedPendingSquares?.length || 0,
          pendingUpdateError,
        });

        if (!pendingUpdateError && updatedPendingSquares) {
          updatedSquares = updatedPendingSquares;
          squareUpdateError = null;
        } else {
          squareUpdateError = pendingUpdateError;
        }
      }
    }

    if (squareUpdateError) {
      console.error("[MARK-PAID-NEW] Error updating squares:", squareUpdateError);
    } else {
      console.log("[MARK-PAID-NEW] Successfully updated squares:", {
        count: updatedSquares?.length || 0,
        squares: updatedSquares?.map(s => `Square ${s.number}: ${s.donor_name} (${s.payment_status})`)
      });
    }

    console.log("[MARK-PAID-NEW] Successfully marked donation as paid");
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[MARK-PAID-NEW] API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

export async function GET() {
  console.log("[MARK-PAID-NEW] GET request received - route is working");
  return NextResponse.json({ message: "Mark donation paid API is working" });
}
