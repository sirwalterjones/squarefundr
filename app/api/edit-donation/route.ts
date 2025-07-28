import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createServerSupabaseClient } from "@/lib/supabaseServer";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export async function PUT(request: NextRequest) {
  try {
    console.log("[EDIT-DONATION] Starting edit donation request");

    const { transactionId, donorName, donorEmail, status } = await request.json();

    if (!transactionId) {
      return NextResponse.json({ error: "Transaction ID is required" }, { status: 400 });
    }

    const supabase = await createServerSupabaseClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const adminSupabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // Get transaction
    const { data: transaction, error: transactionError } = await adminSupabase
      .from("transactions")
      .select("*")
      .eq("id", transactionId)
      .single();

    if (transactionError || !transaction) {
      return NextResponse.json({ error: "Transaction not found" }, { status: 404 });
    }

    // Verify campaign ownership
    const { data: campaign, error: campaignError } = await adminSupabase
      .from("campaigns")
      .select("user_id")
      .eq("id", transaction.campaign_id)
      .single();

    if (campaignError || !campaign || campaign.user_id !== user.id) {
      return NextResponse.json({ error: "Access denied" }, { status: 404 });
    }

    // Update transaction
    const updateData: any = {};
    if (donorName !== undefined) updateData.donor_name = donorName;
    if (donorEmail !== undefined) updateData.donor_email = donorEmail;
    if (status !== undefined) updateData.status = status;

    const { error: updateError } = await adminSupabase
      .from("transactions")
      .update(updateData)
      .eq("id", transactionId);

    if (updateError) {
      return NextResponse.json({ error: "Failed to update transaction" }, { status: 500 });
    }

    // Update squares for PayPal transactions
    let updatedSquares: any[] | null = null;
    if (transaction.payment_method === "paypal" && status === "completed") {
      // Try to find and update squares by donor email
      const { data: squares, error: squareError } = await adminSupabase
        .from("squares")
        .update({
          payment_status: "completed",
          claimed_at: new Date().toISOString(),
          donor_name: donorName || transaction.donor_name,
          claimed_by: donorEmail || transaction.donor_email,
        })
        .eq("claimed_by", transaction.donor_email)
        .eq("campaign_id", transaction.campaign_id)
        .eq("payment_type", "paypal")
        .eq("payment_status", "pending")
        .select();

      updatedSquares = squares;
    }

    console.log("[EDIT-DONATION] Edit donation completed successfully", {
      transactionId,
      paymentMethod: transaction.payment_method,
      status,
      squaresUpdated: updatedSquares?.length || 0
    });

    return NextResponse.json({ 
      success: true,
      squaresReserved: updatedSquares?.length || 0
    });
  } catch (error) {
    console.error("[EDIT-DONATION] API error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
