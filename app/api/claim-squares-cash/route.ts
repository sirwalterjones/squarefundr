import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { SelectedSquare } from "@/types";
import { v4 as uuidv4 } from "uuid";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export async function POST(request: NextRequest) {
  console.log("[CASH-CLAIM] Starting cash claim request");

  try {
    const { campaignId, squares, donorName, donorEmail, paymentType = "cash" } = await request.json();

    console.log("[CASH-CLAIM] Request data:", {
      campaignId,
      squareCount: squares?.length,
      donorName,
      donorEmail,
    });

    if (
      !campaignId ||
      !squares ||
      squares.length === 0 ||
      !donorName ||
      !donorEmail
    ) {
      console.log("[CASH-CLAIM] Missing required fields");
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 },
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    // Get campaign
    const { data: campaign, error: campaignError } = await supabase
      .from("campaigns")
      .select("*")
      .eq("id", campaignId)
      .single();

    if (campaignError || !campaign) {
      console.log("[CASH-CLAIM] Campaign not found:", campaignError);
      return NextResponse.json(
        { error: "Campaign not found" },
        { status: 404 },
      );
    }

    console.log("[CASH-CLAIM] Found campaign:", campaign.title);

    // Check if squares are available
    const { data: existingSquares, error: squareError } = await supabase
      .from("squares")
      .select("*")
      .eq("campaign_id", campaignId)
      .in(
        "row",
        squares.map((s: SelectedSquare) => s.row),
      )
      .in(
        "col",
        squares.map((s: SelectedSquare) => s.col),
      );

    if (squareError) {
      console.log("[CASH-CLAIM] Error checking squares:", squareError);
      return NextResponse.json(
        { error: "Error checking squares" },
        { status: 500 },
      );
    }

    console.log(
      "[CASH-CLAIM] Existing squares found:",
      existingSquares?.length || 0,
    );

    // Check if any are already claimed
    const claimedSquares = existingSquares?.filter(
      (square) => square.claimed_by && square.claimed_by !== null,
    );

    if (claimedSquares && claimedSquares.length > 0) {
      console.log(
        "[CASH-CLAIM] Some squares already claimed:",
        claimedSquares.length,
      );
      return NextResponse.json(
        { error: "Some squares are already claimed" },
        { status: 409 },
      );
    }

    const totalAmount = squares.reduce(
      (sum: number, square: SelectedSquare) => sum + square.value,
      0,
    );

    console.log("[CASH-CLAIM] Total amount:", totalAmount);

    // Create/update squares first
    const squareUpdates = squares.map((square: SelectedSquare) => {
      const existing = existingSquares?.find(
        (s) => s.row === square.row && s.col === square.col,
      );
      return {
        ...(existing ? { id: existing.id } : {}),
        campaign_id: campaignId,
        row: square.row,
        col: square.col,
        row_num: square.row,
        col_num: square.col,
        number: square.number,
        value: square.value,
        claimed_by: donorEmail,
        donor_name: donorName,
        payment_status: "completed" as const,
        payment_type: paymentType,
        claimed_at: new Date().toISOString(),
      };
    });

    console.log("[CASH-CLAIM] Upserting squares:", squareUpdates.length);

    const { data: upsertedSquares, error: upsertError } = await supabase
      .from("squares")
      .upsert(squareUpdates, { onConflict: "campaign_id,row,col" })
      .select("id, number, row, col");

    if (upsertError) {
      console.log("[CASH-CLAIM] Error upserting squares:", upsertError);
      return NextResponse.json(
        { error: `Failed to update squares: ${upsertError.message}` },
        { status: 500 },
      );
    }

    if (!upsertedSquares || upsertedSquares.length === 0) {
      console.log("[CASH-CLAIM] No squares were upserted");
      return NextResponse.json(
        { error: "Failed to claim squares - no squares were updated" },
        { status: 500 },
      );
    }

    console.log(
      "[CASH-CLAIM] Successfully upserted squares:",
      upsertedSquares.length,
    );
    console.log("[CASH-CLAIM] Upserted squares data:", upsertedSquares);
    console.log(
      "[CASH-CLAIM] Square IDs from upsert:",
      upsertedSquares.map((s) => s.id),
    );

    // Create transaction with square IDs
    const transactionId = uuidv4();
    const squareIds = upsertedSquares.map((s) => s.id);

    console.log("[CASH-CLAIM] Creating transaction with ID:", transactionId);
    console.log("[CASH-CLAIM] Square IDs:", squareIds);
    console.log(
      "[CASH-CLAIM] Square IDs types:",
      squareIds.map((id) => typeof id),
    );

    // Ensure all square IDs are valid
    const validSquareIds = squareIds.filter(
      (id) => id != null && id !== undefined,
    );
    console.log("[CASH-CLAIM] Valid square IDs:", validSquareIds);

    if (validSquareIds.length === 0) {
      console.log("[CASH-CLAIM] No valid square IDs found!");
      return NextResponse.json(
        { error: "No valid square IDs found" },
        { status: 500 },
      );
    }

    const transactionData = {
      id: transactionId,
      campaign_id: campaignId,
      square_ids: validSquareIds, // Store as array of valid IDs
      total: totalAmount,
              payment_method: paymentType,
      donor_email: donorEmail,
      donor_name: donorName,
      status: "completed",
      timestamp: new Date().toISOString(),
    };

    console.log("[CASH-CLAIM] Transaction data to insert:", transactionData);
    console.log("[CASH-CLAIM] Transaction data types:", {
      id: typeof transactionData.id,
      campaign_id: typeof transactionData.campaign_id,
      square_ids: typeof transactionData.square_ids,
      square_ids_array: Array.isArray(transactionData.square_ids),
      total: typeof transactionData.total,
      payment_method: typeof transactionData.payment_method,
      donor_email: typeof transactionData.donor_email,
      donor_name: typeof transactionData.donor_name,
      status: typeof transactionData.status,
      timestamp: typeof transactionData.timestamp,
    });

    const { data: insertedTransaction, error: transactionError } =
      await supabase
        .from("transactions")
        .insert(transactionData)
        .select()
        .single();

    console.log("[CASH-CLAIM] Transaction insert result:", {
      data: insertedTransaction,
      error: transactionError,
      hasData: !!insertedTransaction,
      hasError: !!transactionError,
    });

    if (transactionError) {
      console.log("[CASH-CLAIM] Error creating transaction:", transactionError);
      console.log("[CASH-CLAIM] Transaction error details:", {
        code: transactionError.code,
        message: transactionError.message,
        details: transactionError.details,
        hint: transactionError.hint,
      });

      // Rollback squares if transaction fails
      console.log("[CASH-CLAIM] Rolling back squares...");
      await supabase
        .from("squares")
        .update({
          claimed_by: null,
          donor_name: null,
          payment_status: "pending",
          claimed_at: null,
        })
        .in("id", squareIds);

      return NextResponse.json(
        {
          error: `Failed to create transaction: ${transactionError.message || "Unknown error"}`,
        },
        { status: 500 },
      );
    }

    if (!insertedTransaction) {
      console.log("[CASH-CLAIM] No transaction data returned after insert");

      // Try to insert without .single() to see if that helps
      console.log("[CASH-CLAIM] Attempting insert without .single()...");
      const { data: bulkInsert, error: bulkError } = await supabase
        .from("transactions")
        .insert(transactionData)
        .select();

      console.log("[CASH-CLAIM] Bulk insert result:", {
        data: bulkInsert,
        error: bulkError,
      });

      if (bulkError) {
        console.log("[CASH-CLAIM] Bulk insert also failed:", bulkError);
        return NextResponse.json(
          { error: `Failed to create transaction: ${bulkError.message}` },
          { status: 500 },
        );
      }

      if (bulkInsert && bulkInsert.length > 0) {
        console.log("[CASH-CLAIM] Bulk insert succeeded, using first result");
        const insertedTransaction = bulkInsert[0];
      } else {
        return NextResponse.json(
          { error: "Transaction was not created properly" },
          { status: 500 },
        );
      }
    }

    // Get the final transaction object (either from single or bulk insert)
    const finalTransaction = insertedTransaction;

    console.log(
      "[CASH-CLAIM] Transaction created successfully:",
      finalTransaction.id,
    );
    console.log("[CASH-CLAIM] Full transaction data:", finalTransaction);

    // Verify the transaction was created by querying it back
    const { data: verifyTransaction, error: verifyError } = await supabase
      .from("transactions")
      .select("*")
      .eq("id", transactionId)
      .single();

    console.log("[CASH-CLAIM] Transaction verification:", {
      found: !!verifyTransaction,
      error: verifyError,
      data: verifyTransaction,
    });

    return NextResponse.json({
      success: true,
      transactionId: finalTransaction.id,
      message: "Squares claimed successfully",
      squareCount: upsertedSquares.length,
      totalAmount,
      debug: {
        squareIds,
        transactionCreated: !!finalTransaction,
        transactionVerified: !!verifyTransaction,
      },
    });
  } catch (error) {
    console.error("[CASH-CLAIM] Unexpected error:", error);
    return NextResponse.json(
      {
        error: "Failed to claim squares",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
