import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabaseServer";
import { createPayPalOrder, isPayPalDemo } from "@/lib/paypal";
import { SelectedSquare } from "@/types";
import { v4 as uuidv4 } from "uuid";

export async function POST(request: NextRequest) {
  try {
    const { campaignId, squares, donorEmail, donorName } = await request.json();

    if (
      !campaignId ||
      !squares ||
      squares.length === 0 ||
      !donorEmail ||
      !donorName
    ) {
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

    // Check if campaign has PayPal email configured
    if (!campaign.paypal_email) {
      return NextResponse.json(
        { error: "Campaign owner has not set up PayPal payments yet" },
        { status: 400 },
      );
    }

    // Calculate total amount
    const totalAmount = squares.reduce(
      (sum: number, square: SelectedSquare) => sum + square.value,
      0,
    );

    // Check if squares are still available and get their UUIDs
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

    // Get the actual square UUIDs for the transaction
    const squareUUIDs = existingSquares?.map((square) => square.id) || [];

    // Create transaction record
    const transactionId = uuidv4();

    console.log("Creating transaction with data:", {
      id: transactionId,
      campaign_id: campaignId,
      square_ids: squareUUIDs,
      total: totalAmount,
      payment_method: "paypal",
      donor_email: donorEmail,
      donor_name: donorName,
      status: "pending",
      timestamp: new Date().toISOString(),
    });

    const { error: transactionError } = await supabase
      .from("transactions")
      .insert({
        id: transactionId,
        campaign_id: campaignId,
        square_ids: squareUUIDs,
        total: totalAmount,
        payment_method: "paypal",
        donor_email: donorEmail,
        donor_name: donorName,
        status: "pending",
        timestamp: new Date().toISOString(),
      });

    if (transactionError) {
      console.error("Transaction creation error details:", {
        error: transactionError,
        message: transactionError.message,
        details: transactionError.details,
        hint: transactionError.hint,
        code: transactionError.code,
      });
      return NextResponse.json(
        {
          error: "Failed to create transaction record",
          details: transactionError.message || "Unknown database error",
        },
        { status: 500 },
      );
    }

    console.log("Transaction created successfully with ID:", transactionId);

    // Reserve squares temporarily during checkout
    const squareUpdates = squares.map((square: SelectedSquare) => ({
      campaign_id: campaignId,
      row: square.row,
      col: square.col,
      claimed_by: `temp_${transactionId}`,
      donor_name: donorName,
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

    // Create PayPal payment link for personal account
    const returnUrl = `${request.nextUrl.origin}/api/paypal-success?transaction_id=${transactionId}`;
    const cancelUrl = `${request.nextUrl.origin}/fundraiser/${campaign.slug}?canceled=true&transaction_id=${transactionId}`;

    const paypalOrder = await createPayPalOrder(
      totalAmount,
      "USD",
      campaignId,
      squareKeys,
      returnUrl,
      cancelUrl,
      campaign.paypal_email, // Direct payment to campaign owner's PayPal
    );

    // Find approval URL
    const approvalUrl = paypalOrder.links?.find(
      (link: any) => link.rel === "approve",
    )?.href;

    if (!approvalUrl) {
      throw new Error("No approval URL found in PayPal response");
    }

    // Store PayPal order ID in transaction
    await supabase
      .from("transactions")
      .update({ paypal_order_id: paypalOrder.id })
      .eq("id", transactionId);

    return NextResponse.json({ approvalUrl });
  } catch (error) {
    console.error("PayPal order creation error:", error);
    return NextResponse.json(
      { error: "Failed to create PayPal order" },
      { status: 500 },
    );
  }
}
