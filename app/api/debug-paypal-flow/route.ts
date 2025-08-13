import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export async function GET(request: NextRequest) {
  try {
    const adminSupabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    console.log("[DEBUG-PAYPAL] Analyzing PayPal transaction flow issues");

    // Get recent PayPal transactions
    const { data: paypalTransactions, error: txError } = await adminSupabase
      .from("transactions")
      .select("*")
      .eq("payment_method", "paypal")
      .order("timestamp", { ascending: false })
      .limit(10);

    if (txError) {
      return NextResponse.json({ error: txError.message }, { status: 500 });
    }

    const results = [];

    for (const tx of paypalTransactions || []) {
      console.log(`[DEBUG-PAYPAL] Analyzing transaction: ${tx.id}`);

      // Check for squares claimed by donor email
      const { data: claimedSquares } = await adminSupabase
        .from("squares")
        .select("*")
        .eq("claimed_by", tx.donor_email)
        .eq("campaign_id", tx.campaign_id);

      // Check for temp squares
      const { data: tempSquares } = await adminSupabase
        .from("squares")
        .select("*")
        .eq("claimed_by", `temp_${tx.id}`)
        .eq("campaign_id", tx.campaign_id);

      // Check squares by IDs if they exist
      let squaresByIds = [];
      if (tx.square_ids && tx.square_ids.length > 0) {
        const { data: idsSquares } = await adminSupabase
          .from("squares")
          .select("*")
          .in("id", tx.square_ids);
        squaresByIds = idsSquares || [];
      }

      // Calculate totals
      const claimedTotal = claimedSquares?.reduce((sum, sq) => sum + sq.value, 0) || 0;
      const tempTotal = tempSquares?.reduce((sum, sq) => sum + sq.value, 0) || 0;
      const idsTotal = squaresByIds.reduce((sum, sq) => sum + sq.value, 0) || 0;

      results.push({
        transaction_id: tx.id,
        donor_email: tx.donor_email,
        donor_name: tx.donor_name,
        transaction_total: tx.total,
        transaction_status: tx.status,
        transaction_square_ids: tx.square_ids?.length || 0,
        
        claimed_squares_count: claimedSquares?.length || 0,
        claimed_squares_total: claimedTotal,
        claimed_squares_match: claimedTotal === tx.total,
        
        temp_squares_count: tempSquares?.length || 0,
        temp_squares_total: tempTotal,
        temp_squares_match: tempTotal === tx.total,
        
        ids_squares_count: squaresByIds.length,
        ids_squares_total: idsTotal,
        ids_squares_match: idsTotal === tx.total,
        
        issue_detected: claimedSquares?.length === 0 && tx.status === "completed",
        
        squares_claimed_details: claimedSquares?.map(sq => ({
          id: sq.id,
          number: sq.number,
          row: sq.row,
          col: sq.col,
          value: sq.value,
          claimed_by: sq.claimed_by,
          payment_status: sq.payment_status
        })) || [],
        
        squares_temp_details: tempSquares?.map(sq => ({
          id: sq.id,
          number: sq.number,
          row: sq.row,
          col: sq.col,
          value: sq.value,
          claimed_by: sq.claimed_by,
          payment_status: sq.payment_status
        })) || [],
        
        squares_ids_details: squaresByIds.map(sq => ({
          id: sq.id,
          number: sq.number,
          row: sq.row,
          col: sq.col,
          value: sq.value,
          claimed_by: sq.claimed_by,
          payment_status: sq.payment_status
        }))
      });
    }

    return NextResponse.json({
      analysis_summary: {
        total_transactions_analyzed: results.length,
        issues_detected: results.filter(r => r.issue_detected).length,
        transactions_with_proper_claiming: results.filter(r => r.claimed_squares_match).length,
        transactions_with_temp_squares: results.filter(r => r.temp_squares_count > 0).length,
      },
      transactions: results
    });

  } catch (error) {
    console.error("[DEBUG-PAYPAL] Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
