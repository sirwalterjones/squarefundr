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
    if (transaction.square_ids) {
      try {
        let squareIds = transaction.square_ids;

        // Parse if it's a string
        if (typeof squareIds === "string") {
          squareIds = JSON.parse(squareIds);
        }

        console.log("[MARK-PAID-NEW] Square IDs to update:", squareIds);

        if (Array.isArray(squareIds) && squareIds.length > 0) {
          const { error: squareUpdateError } = await adminSupabase
            .from("squares")
            .update({ payment_status: "completed" })
            .in("id", squareIds);

          if (squareUpdateError) {
            console.error(
              "[MARK-PAID-NEW] Error updating squares:",
              squareUpdateError,
            );
          } else {
            console.log("[MARK-PAID-NEW] Successfully updated squares");
          }
        }
      } catch (parseError) {
        console.error("[MARK-PAID-NEW] Error parsing square_ids:", parseError);
      }
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
