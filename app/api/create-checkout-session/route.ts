import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabaseServer";
import { SelectedSquare } from "@/types";

export async function POST(request: NextRequest) {
  try {
    const { campaignId, squares, donorEmail, donorName, anonymous } =
      await request.json();

    if (!campaignId || !squares || squares.length === 0) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 },
      );
    }

    const supabase = await createServerSupabaseClient();

    // Get campaign details
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

    // Calculate total amount
    const totalAmount = squares.reduce(
      (sum: number, square: SelectedSquare) => sum + square.value,
      0,
    );

    // Check if squares are still available before creating transaction
    const squareKeys = squares.map((s: SelectedSquare) => `${s.row},${s.col}`);
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
        { error: "Error checking square availability" },
        { status: 500 },
      );
    }

    // Check if any squares are already claimed
    const unavailableSquares = existingSquares?.filter(
      (square) =>
        square.claimed_by && squareKeys.includes(`${square.row},${square.col}`),
    );

    if (unavailableSquares && unavailableSquares.length > 0) {
      return NextResponse.json(
        {
          error: "Some squares are no longer available",
        },
        { status: 409 },
      );
    }

    // Create transaction record before creating checkout session
    const transactionId = require("uuid").v4();

    const { error: transactionError } = await supabase
      .from("transactions")
      .insert({
        id: transactionId,
        campaign_id: campaignId,
        square_ids: squareKeys,
        total: totalAmount,
        payment_method: "paypal",
        donor_email: donorEmail || null,
        donor_name: anonymous ? null : donorName,
        status: "pending",
        timestamp: new Date().toISOString(),
      });

    if (transactionError) {
      console.error("Transaction creation error:", transactionError);
      return NextResponse.json(
        { error: "Failed to create transaction record" },
        { status: 500 },
      );
    }

    // Reserve squares temporarily during checkout
    const squareUpdates = squares.map((square: SelectedSquare) => ({
      campaign_id: campaignId,
      row: square.row,
      col: square.col,
      claimed_by: `temp_${transactionId}`,
      donor_name: anonymous ? null : donorName,
      payment_status: "pending" as const,
      payment_type: "paypal" as const,
      claimed_at: new Date().toISOString(),
    }));

    // Update each square with temporary reservation
    for (const update of squareUpdates) {
      const { error: updateError } = await supabase
        .from("squares")
        .update({
          claimed_by: update.claimed_by,
          donor_name: update.donor_name,
          payment_status: update.payment_status,
          payment_type: update.payment_type,
          claimed_at: update.claimed_at,
        })
        .eq("campaign_id", update.campaign_id)
        .eq("row", update.row)
        .eq("col", update.col);

      if (updateError) {
        console.error("Error updating square:", updateError);
      }
    }

    // Return success URL for PayPal or other payment processing
    return NextResponse.json({
      url: `${request.nextUrl.origin}/fundraiser/${campaign.slug}?success=true&transaction_id=${transactionId}`,
      transactionId: transactionId,
      totalAmount: totalAmount,
      squares: squares,
    });
  } catch (error) {
    console.error("Checkout session creation error:", error);
    return NextResponse.json(
      { error: "Failed to create checkout session" },
      { status: 500 },
    );
  }
}
