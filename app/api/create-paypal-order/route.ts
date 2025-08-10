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
    
    console.log("[PAYPAL-ORDER] Checking availability for squares:", squares.map(s => `(${s.row},${s.col})`));
    
    // Get all squares for this campaign and filter client-side for exact matches
    const { data: allCampaignSquares, error: squareError } = await supabase
      .from("squares")
      .select("*")
      .eq("campaign_id", campaignId);

    if (squareError) {
      return NextResponse.json(
        { error: "Error checking square availability" },
        { status: 500 },
      );
    }

    // Filter to get only the exact squares we need
    const existingSquares = allCampaignSquares?.filter(square => 
      squares.some(s => s.row === square.row && s.col === square.col)
    ) || [];

    console.log("[PAYPAL-ORDER] Found existing squares:", existingSquares.map(s => `(${s.row},${s.col}) - claimed_by: ${s.claimed_by}`));

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

    // Create transaction record
    const transactionId = uuidv4();

    console.log("Creating transaction with data:", {
      id: transactionId,
      campaign_id: campaignId,
      total: totalAmount,
      payment_method: "paypal",
      donor_email: donorEmail,
      donor_name: donorName,
      status: "pending",
      timestamp: new Date().toISOString(),
    });

    // First, reserve the squares to ensure they're claimed
    console.log(`[PAYPAL-ORDER] ===== RESERVING SQUARES =====`);
    console.log(`[PAYPAL-ORDER] Reserving ${squares.length} squares for PayPal transaction ${transactionId}`);
    console.log(`[PAYPAL-ORDER] Donor: ${donorName} (${donorEmail})`);
    
    const squareUpdates = squares.map((square: SelectedSquare) => ({
      campaign_id: campaignId,
      row: square.row,
      col: square.col,
      claimed_by: donorEmail, // Use actual email instead of temp prefix
      donor_name: donorName,
      payment_status: "pending" as const,
      payment_type: "paypal" as const,
      claimed_at: new Date().toISOString(),
    }));

    console.log("[PAYPAL-ORDER] Square updates to apply:", squareUpdates);

    // Update each square with permanent reservation
    let successCount = 0;
    for (const update of squareUpdates) {
      console.log(`[PAYPAL-ORDER] Updating square at row ${update.row}, col ${update.col} for campaign ${update.campaign_id}`);
      
      const { data: updatedSquare, error: updateError } = await supabase
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
        .eq("col", update.col)
        .select();

      if (updateError) {
        console.error("[PAYPAL-ORDER] Error reserving square:", updateError);
        console.error("[PAYPAL-ORDER] Square update details:", {
          campaign_id: update.campaign_id,
          row: update.row,
          col: update.col,
          claimed_by: update.claimed_by,
          error: updateError.message,
          details: updateError.details,
          hint: updateError.hint,
        });
        // If we can't reserve squares, we should fail the transaction
        return NextResponse.json(
          {
            error: "Failed to reserve squares",
            details: updateError.message || "Unknown database error",
          },
          { status: 500 },
        );
      } else {
        successCount++;
        console.log(`[PAYPAL-ORDER] Successfully reserved square at row ${update.row}, col ${update.col}:`, updatedSquare);
      }
    }
    
    console.log(`[PAYPAL-ORDER] Successfully reserved ${successCount}/${squares.length} squares for PayPal transaction ${transactionId}`);

    // Now get the square UUIDs after they've been reserved
    const { data: reservedSquares, error: reservedSquareError } = await supabase
      .from("squares")
      .select("id")
      .eq("campaign_id", campaignId)
      .in(
        "row",
        squares.map((s: SelectedSquare) => s.row),
      )
      .in(
        "col",
        squares.map((s: SelectedSquare) => s.col),
      );

    if (reservedSquareError) {
      console.error("Error getting reserved square UUIDs:", reservedSquareError);
      return NextResponse.json(
        {
          error: "Failed to get reserved square UUIDs",
          details: reservedSquareError.message || "Unknown database error",
        },
        { status: 500 },
      );
    }

    const squareUUIDs = reservedSquares?.map((square) => square.id) || [];
    console.log("Reserved square UUIDs:", squareUUIDs);
    console.log("Reserved square UUIDs length:", squareUUIDs.length);
    console.log("Reserved square UUIDs type:", typeof squareUUIDs);

    const transactionData = {
      id: transactionId,
      campaign_id: campaignId,
      square_ids: squareUUIDs,
      total: totalAmount,
      payment_method: "paypal",
      donor_email: donorEmail,
      donor_name: donorName,
      status: "pending",
      timestamp: new Date().toISOString(),
    };
    
    console.log("Creating transaction with data:", JSON.stringify(transactionData, null, 2));

    const { error: transactionError } = await supabase
      .from("transactions")
      .insert(transactionData);

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
    
    // Verify the transaction was created with correct square_ids
    const { data: verifyTransaction, error: verifyError } = await supabase
      .from("transactions")
      .select("*")
      .eq("id", transactionId)
      .single();
      
    if (verifyError) {
      console.error("Error verifying transaction creation:", verifyError);
    } else {
      console.log("Verification - transaction created with:", {
        id: verifyTransaction.id,
        square_ids: verifyTransaction.square_ids,
        square_ids_length: Array.isArray(verifyTransaction.square_ids) ? verifyTransaction.square_ids.length : typeof verifyTransaction.square_ids,
        square_ids_type: typeof verifyTransaction.square_ids,
        campaign_id: verifyTransaction.campaign_id,
        total: verifyTransaction.total,
        payment_method: verifyTransaction.payment_method,
        donor_email: verifyTransaction.donor_email,
      });
    }

    // Create PayPal payment link for personal account
    const baseUrl = request.nextUrl.origin.includes("localhost")
      ? "https://vibrant-lalande2-fd784.view-3.tempo-dev.app"
      : request.nextUrl.origin;
    const returnUrl = `${baseUrl}/api/paypal-success?transaction_id=${transactionId}&donor_name=${encodeURIComponent(donorName)}&donor_email=${encodeURIComponent(donorEmail)}`;
    const cancelUrl = `${baseUrl}/fundraiser/${campaign.slug}?canceled=true&transaction_id=${transactionId}`;

    console.log("Creating PayPal order with data:", {
      amount: totalAmount,
      currency: "USD",
      campaignId,
      squareKeys,
      returnUrl,
      cancelUrl,
      payeeEmail: campaign.paypal_email,
    });

    let approvalUrl: string;
    let paypalOrderId: string;

    try {
      const paypalOrder = await createPayPalOrder(
        totalAmount,
        "USD",
        campaignId,
        squareKeys,
        returnUrl,
        cancelUrl,
        campaign.paypal_email, // Direct payment to campaign owner's PayPal
      );

      console.log("PayPal order created:", paypalOrder);

      // Find approval URL
      const foundApprovalUrl = paypalOrder.links?.find(
        (link: any) => link.rel === "approve",
      )?.href;

      if (!foundApprovalUrl) {
        console.error("No approval URL found in PayPal response:", paypalOrder);
        throw new Error("No approval URL found in PayPal response");
      }

      approvalUrl = foundApprovalUrl;
      paypalOrderId = paypalOrder.id;

      console.log("PayPal approval URL:", approvalUrl);
    } catch (paypalError) {
      console.error("Error creating PayPal order:", paypalError);
      
      // Even if PayPal order creation fails, we should still return the transaction
      // The squares are already reserved, so the admin can manually mark as completed
      return NextResponse.json({
        error: "PayPal order creation failed, but squares are reserved",
        details: paypalError instanceof Error ? paypalError.message : "Unknown error",
        transactionId: transactionId,
        squaresReserved: true,
      }, { status: 200 });
    }

    // Store PayPal order ID in transaction
    await supabase
      .from("transactions")
      .update({ paypal_order_id: paypalOrderId })
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
