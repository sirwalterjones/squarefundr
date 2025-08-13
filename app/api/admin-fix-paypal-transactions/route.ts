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

    console.log(`[ADMIN-FIX-PAYPAL] Fixing PayPal transaction: ${transaction_id}`);

    const adminSupabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    // Get transaction details
    const { data: transaction, error: txError } = await adminSupabase
      .from("transactions")
      .select("*")
      .eq("id", transaction_id)
      .single();

    if (txError || !transaction) {
      return NextResponse.json(
        { error: "Transaction not found" },
        { status: 404 }
      );
    }

    if (transaction.payment_method !== "paypal") {
      return NextResponse.json(
        { error: "Not a PayPal transaction" },
        { status: 400 }
      );
    }

    console.log(`[ADMIN-FIX-PAYPAL] Transaction: $${transaction.total} by ${transaction.donor_email}`);

    // Check if squares are already claimed by this donor
    const { data: existingSquares } = await adminSupabase
      .from("squares")
      .select("*")
      .eq("claimed_by", transaction.donor_email)
      .eq("campaign_id", transaction.campaign_id);

    if (existingSquares && existingSquares.length > 0) {
      const existingTotal = existingSquares.reduce((sum, sq) => sum + sq.value, 0);
      console.log(`[ADMIN-FIX-PAYPAL] Already has ${existingSquares.length} squares worth $${existingTotal}`);
      
      if (existingTotal >= transaction.total) {
        return NextResponse.json({
          success: true,
          message: "Transaction already has proper squares claimed",
          existing_squares: existingSquares.length,
          existing_total: existingTotal
        });
      }
    }

    // Get all available squares for this campaign
    const { data: availableSquares, error: availableSquareError } = await adminSupabase
      .from("squares")
      .select("*")
      .eq("campaign_id", transaction.campaign_id)
      .is("claimed_by", null)
      .order("number");

    if (availableSquareError || !availableSquares || availableSquares.length === 0) {
      return NextResponse.json(
        { error: "No available squares found" },
        { status: 400 }
      );
    }

    console.log(`[ADMIN-FIX-PAYPAL] Found ${availableSquares.length} available squares`);

    // Select squares that match the paid amount
    let currentTotal = existingSquares ? existingSquares.reduce((sum, sq) => sum + sq.value, 0) : 0;
    const selectedSquares = [];

    for (const square of availableSquares) {
      if (currentTotal < transaction.total) {
        selectedSquares.push(square);
        currentTotal += square.value;

        if (currentTotal >= transaction.total) {
          break;
        }
      }
    }

    console.log(`[ADMIN-FIX-PAYPAL] Selected ${selectedSquares.length} additional squares totaling $${currentTotal - (existingSquares?.reduce((sum, sq) => sum + sq.value, 0) || 0)}`);

    if (selectedSquares.length === 0) {
      return NextResponse.json(
        { error: "No additional squares needed or available" },
        { status: 400 }
      );
    }

    // Claim the selected squares
    const squareIds = selectedSquares.map(s => s.id);
    const { data: updatedSquares, error: updateError } = await adminSupabase
      .from("squares")
      .update({
        claimed_by: transaction.donor_email || "anonymous",
        donor_name: transaction.donor_name || "Anonymous",
        payment_status: "completed",
        payment_type: "paypal",
        claimed_at: new Date().toISOString(),
      })
      .in("id", squareIds)
      .is("claimed_by", null) // Only update if still available
      .select();

    if (updateError) {
      console.error("[ADMIN-FIX-PAYPAL] Error claiming squares:", updateError);
      return NextResponse.json(
        { error: "Failed to claim squares", details: updateError.message },
        { status: 500 }
      );
    }

    // Update transaction with the square IDs
    const allSquareIds = [
      ...(existingSquares?.map(s => s.id) || []),
      ...(updatedSquares?.map(s => s.id) || [])
    ];

    await adminSupabase
      .from("transactions")
      .update({ 
        square_ids: allSquareIds,
        updated_at: new Date().toISOString()
      })
      .eq("id", transaction_id);

    console.log(`[ADMIN-FIX-PAYPAL] Successfully fixed transaction ${transaction_id}`);

    return NextResponse.json({
      success: true,
      transaction_id: transaction_id,
      squares_claimed: updatedSquares?.length || 0,
      total_squares: allSquareIds.length,
      total_value: currentTotal,
      claimed_squares: updatedSquares?.map(sq => ({
        number: sq.number,
        row: sq.row,
        col: sq.col,
        value: sq.value
      }))
    });

  } catch (error) {
    console.error("[ADMIN-FIX-PAYPAL] Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
