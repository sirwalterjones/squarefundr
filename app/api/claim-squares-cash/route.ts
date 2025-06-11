import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { SelectedSquare } from "@/types";
import { v4 as uuidv4 } from "uuid";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export async function POST(request: NextRequest) {
  try {
    const { campaignId, squares, donorName, donorEmail } = await request.json();

    if (
      !campaignId ||
      !squares ||
      squares.length === 0 ||
      !donorName ||
      !donorEmail
    ) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 },
      );
    }

    // Create admin client directly
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
      return NextResponse.json(
        { error: "Campaign not found" },
        { status: 404 },
      );
    }

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
      return NextResponse.json(
        { error: "Error checking squares" },
        { status: 500 },
      );
    }

    // Check if any are already claimed
    const claimedSquares = existingSquares?.filter(
      (square) => square.claimed_by,
    );
    if (claimedSquares && claimedSquares.length > 0) {
      return NextResponse.json(
        { error: "Some squares are already claimed" },
        { status: 409 },
      );
    }

    const totalAmount = squares.reduce(
      (sum: number, square: SelectedSquare) => sum + square.value,
      0,
    );

    // Create/update squares
    const squareUpdates = squares.map((square: SelectedSquare) => {
      const existing = existingSquares?.find(
        (s) => s.row === square.row && s.col === square.col,
      );
      return {
        ...(existing ? { id: existing.id } : {}),
        campaign_id: campaignId,
        row: square.row,
        col: square.col,
        number: square.number,
        value: square.value,
        claimed_by: donorEmail,
        donor_name: donorName,
        payment_status: "completed" as const,
        payment_type: "cash" as const,
        claimed_at: new Date().toISOString(),
      };
    });

    const { data: upsertedSquares, error: upsertError } = await supabase
      .from("squares")
      .upsert(squareUpdates, { onConflict: "campaign_id,row,col" })
      .select("id, number");

    if (upsertError) {
      return NextResponse.json(
        { error: "Failed to update squares" },
        { status: 500 },
      );
    }

    // Create transaction
    const transactionId = uuidv4();
    const squareNumbers = upsertedSquares?.map((s) => s.number) || [];

    const { error: transactionError } = await supabase
      .from("transactions")
      .insert({
        id: transactionId,
        campaign_id: campaignId,
        square_ids: JSON.stringify(squareNumbers),
        total: totalAmount,
        payment_method: "cash",
        donor_email: donorEmail,
        donor_name: donorName,
        status: "completed",
        timestamp: new Date().toISOString(),
      });

    if (transactionError) {
      console.error("Transaction error:", transactionError);
      return NextResponse.json(
        { error: "Failed to create transaction" },
        { status: 500 },
      );
    }

    return NextResponse.json({
      success: true,
      transactionId,
      message: "Squares claimed successfully",
    });
  } catch (error) {
    console.error("Cash claim error:", error);
    return NextResponse.json(
      { error: "Failed to claim squares" },
      { status: 500 },
    );
  }
}
