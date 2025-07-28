import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const transactionId = searchParams.get("transaction_id");

    if (!transactionId) {
      return NextResponse.json({ error: "Transaction ID required" }, { status: 400 });
    }

    const adminSupabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

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