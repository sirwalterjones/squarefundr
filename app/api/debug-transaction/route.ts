import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const transactionId = searchParams.get("transaction_id");
    const listPayPal = searchParams.get("list_paypal");
    const checkPendingPayPal = searchParams.get("check_pending_paypal");

    const adminSupabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    // If check_pending_paypal is requested, return pending PayPal squares for a campaign
    if (checkPendingPayPal) {
      const { data: pendingPayPalSquares, error: pendingPayPalError } = await adminSupabase
        .from("squares")
        .select("*")
        .eq("payment_type", "paypal")
        .eq("payment_status", "pending")
        .order("created_at", { ascending: false })
        .limit(20);

      return NextResponse.json({
        pendingPayPalSquares: pendingPayPalSquares || [],
        pendingPayPalError: pendingPayPalError?.message || null,
      });
    }

    // If list_paypal is requested, return recent PayPal transactions
    if (listPayPal === "true") {
      const { data: paypalTransactions, error: paypalError } = await adminSupabase
        .from("transactions")
        .select("*")
        .eq("payment_method", "paypal")
        .order("timestamp", { ascending: false })
        .limit(10);

      return NextResponse.json({
        paypalTransactions: paypalTransactions || [],
        paypalError: paypalError?.message || null,
      });
    }

    if (!transactionId && !listPayPal && !checkPendingPayPal) {
      return NextResponse.json({ error: "Transaction ID required" }, { status: 400 });
    }

    // Get transaction details
    const { data: transaction, error: transactionError } = await adminSupabase
      .from("transactions")
      .select("*")
      .eq("id", transactionId)
      .single();

    if (transactionError || !transaction) {
      return NextResponse.json({ error: "Transaction not found" }, { status: 404 });
    }

    // Get squares with temp prefix
    const { data: tempSquares, error: tempSquareError } = await adminSupabase
      .from("squares")
      .select("*")
      .eq("claimed_by", `temp_${transactionId}`);

    // Get squares by square IDs
    let squareIds: string[] = [];
    if (transaction.square_ids) {
      try {
        if (typeof transaction.square_ids === "string") {
          squareIds = JSON.parse(transaction.square_ids);
        } else if (Array.isArray(transaction.square_ids)) {
          squareIds = transaction.square_ids;
        }
      } catch (e) {
        console.error("Error parsing square_ids:", e);
      }
    }

    const { data: squaresByIds, error: squaresByIdsError } = await adminSupabase
      .from("squares")
      .select("*")
      .in("id", squareIds);

    return NextResponse.json({
      transaction,
      tempSquares: tempSquares || [],
      squaresByIds: squaresByIds || [],
      squareIds,
      tempSquareError: tempSquareError?.message || null,
      squaresByIdsError: squaresByIdsError?.message || null,
    });
  } catch (error) {
    console.error("Debug endpoint error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
} 