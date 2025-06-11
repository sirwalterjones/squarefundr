import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabaseServer";

export async function PUT(request: NextRequest) {
  try {
    const { transactionId, donorName, donorEmail, status } =
      await request.json();

    if (!transactionId) {
      return NextResponse.json(
        { error: "Transaction ID is required" },
        { status: 400 },
      );
    }

    const supabase = await createServerSupabaseClient();

    // Check authentication
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get the transaction
    const { data: transaction, error: transactionError } = await supabase
      .from("transactions")
      .select("*")
      .eq("id", transactionId)
      .single();

    if (transactionError || !transaction) {
      return NextResponse.json(
        { error: "Transaction not found" },
        { status: 404 },
      );
    }

    // Verify the campaign belongs to the user
    const { data: campaign, error: campaignError } = await supabase
      .from("campaigns")
      .select("user_id")
      .eq("id", transaction.campaign_id)
      .single();

    if (campaignError || !campaign || campaign.user_id !== user.id) {
      return NextResponse.json(
        { error: "Transaction not found" },
        { status: 404 },
      );
    }

    // Update transaction
    const updateData: any = {};
    if (donorName !== undefined) updateData.donor_name = donorName;
    if (donorEmail !== undefined) updateData.donor_email = donorEmail;
    if (status !== undefined) updateData.status = status;

    const { error: updateError } = await supabase
      .from("transactions")
      .update(updateData)
      .eq("id", transactionId);

    if (updateError) {
      console.error("Error updating transaction:", updateError);
      return NextResponse.json(
        { error: "Failed to update transaction" },
        { status: 500 },
      );
    }

    // Also update the squares if donor info changed
    if (
      transaction.square_ids &&
      transaction.square_ids.length > 0 &&
      (donorName !== undefined || donorEmail !== undefined)
    ) {
      const squareUpdateData: any = {};
      if (donorName !== undefined) squareUpdateData.donor_name = donorName;
      if (donorEmail !== undefined) squareUpdateData.claimed_by = donorEmail;
      if (status === "completed") squareUpdateData.payment_status = "completed";

      const { error: squareUpdateError } = await supabase
        .from("squares")
        .update(squareUpdateData)
        .in("id", transaction.square_ids);

      if (squareUpdateError) {
        console.error("Error updating squares:", squareUpdateError);
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Edit donation API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
