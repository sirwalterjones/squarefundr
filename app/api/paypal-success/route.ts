import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabaseServer";
import { capturePayPalOrder } from "@/lib/paypal";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const transactionId = searchParams.get("transaction_id");
    const paypalOrderId = searchParams.get("token"); // PayPal sends order ID as 'token'

    if (!transactionId || !paypalOrderId) {
      return NextResponse.redirect(
        new URL("/", request.url).toString() + "?error=missing_params",
      );
    }

    const supabase = await createServerSupabaseClient();

    // Get transaction details
    const { data: transaction, error: transactionError } = await supabase
      .from("transactions")
      .select("*, campaigns(slug)")
      .eq("id", transactionId)
      .single();

    if (transactionError || !transaction) {
      return NextResponse.redirect(
        new URL("/", request.url).toString() + "?error=transaction_not_found",
      );
    }

    // Capture the PayPal payment
    const captureResult = await capturePayPalOrder(paypalOrderId);

    if (captureResult.status === "COMPLETED") {
      // Update transaction status
      await supabase
        .from("transactions")
        .update({
          status: "completed",
          paypal_order_id: paypalOrderId,
          timestamp: new Date().toISOString(),
        })
        .eq("id", transactionId);

      // Update squares to mark as completed and remove temp prefix
      const { error: squareUpdateError } = await supabase
        .from("squares")
        .update({
          claimed_by: transaction.donor_email || "anonymous",
          donor_name: transaction.donor_name,
          payment_status: "completed",
          claimed_at: new Date().toISOString(),
        })
        .eq("claimed_by", `temp_${transactionId}`);

      if (squareUpdateError) {
        console.error("Error updating squares:", squareUpdateError);
      }

      // Redirect to success page
      const campaignSlug = transaction.campaigns?.slug || "unknown";
      return NextResponse.redirect(
        new URL(
          `/fundraiser/${campaignSlug}?success=true&transaction_id=${transactionId}`,
          request.url,
        ),
      );
    } else {
      // Payment failed
      await supabase
        .from("transactions")
        .update({
          status: "failed",
          timestamp: new Date().toISOString(),
        })
        .eq("id", transactionId);

      // Release temporarily reserved squares
      const { error: releaseSquareError } = await supabase
        .from("squares")
        .update({
          claimed_by: null,
          donor_name: null,
          payment_status: "pending",
          payment_type: "paypal",
          claimed_at: null,
        })
        .eq("claimed_by", `temp_${transactionId}`);

      if (releaseSquareError) {
        console.error("Error releasing squares:", releaseSquareError);
      }

      const campaignSlug = transaction.campaigns?.slug || "unknown";
      return NextResponse.redirect(
        new URL(
          `/fundraiser/${campaignSlug}?error=payment_failed`,
          request.url,
        ),
      );
    }
  } catch (error) {
    console.error("PayPal success handler error:", error);
    return NextResponse.redirect(
      new URL("/", request.url).toString() + "?error=processing_failed",
    );
  }
}
