import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export async function POST(request: NextRequest) {
  try {
    const { transaction_id } = await request.json();

    if (!transaction_id) {
      return NextResponse.json(
        { error: "transaction_id is required" },
        { status: 400 }
      );
    }

    console.log(`[ADMIN-CLEAR-SQUARES] Clearing invalid square_ids for transaction: ${transaction_id}`);

    const adminSupabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    // Clear the square_ids array from the transaction since they point to unclaimed squares
    const { data: updatedTransaction, error: updateError } = await adminSupabase
      .from("transactions")
      .update({
        square_ids: [],
        updated_at: new Date().toISOString(),
      })
      .eq("id", transaction_id)
      .select()
      .single();

    if (updateError) {
      console.error("[ADMIN-CLEAR-SQUARES] Error updating transaction:", updateError);
      return NextResponse.json(
        { error: "Failed to update transaction", details: updateError.message },
        { status: 500 }
      );
    }

    console.log("[ADMIN-CLEAR-SQUARES] Transaction updated successfully:", updatedTransaction);

    return NextResponse.json({
      success: true,
      transaction: updatedTransaction,
      message: "Invalid square_ids cleared from transaction"
    });

  } catch (error) {
    console.error("[ADMIN-CLEAR-SQUARES] Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
