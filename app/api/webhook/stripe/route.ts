import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabaseServer";
import { stripe } from "@/lib/stripe";
import { headers } from "next/headers";

export async function POST(request: NextRequest) {
  const body = await request.text();
  const headersList = await headers();
  const signature = headersList.get("stripe-signature");

  if (!signature) {
    return NextResponse.json(
      { error: "No signature provided" },
      { status: 400 },
    );
  }

  let event;

  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!,
    );
  } catch (err) {
    console.error("Webhook signature verification failed:", err);
    return NextResponse.json(
      { error: "Webhook signature verification failed" },
      { status: 400 },
    );
  }

  const supabase = await createServerSupabaseClient();

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object;
        const transactionId = session.metadata?.transaction_id;
        const donorName = session.metadata?.donor_name;
        const anonymous = session.metadata?.anonymous === "true";
        const donorEmail = session.customer_email;

        if (!transactionId) {
          console.error("No transaction ID in webhook metadata");
          break;
        }

        // Update transaction status
        const { error: transactionError } = await supabase
          .from("transactions")
          .update({
            status: "completed",
            stripe_payment_intent_id: session.payment_intent,
            timestamp: new Date().toISOString(),
          })
          .eq("id", transactionId);

        if (transactionError) {
          console.error("Error updating transaction:", transactionError);
          break;
        }

        // Update squares to mark as completed and remove temp prefix
        const { error: squareError } = await supabase
          .from("squares")
          .update({
            claimed_by: donorEmail || "anonymous",
            donor_name: anonymous ? null : donorName,
            payment_status: "completed",
            claimed_at: new Date().toISOString(),
          })
          .eq("claimed_by", `temp_${transactionId}`);

        if (squareError) {
          console.error("Error updating squares:", squareError);
        }

        console.log(`Payment completed for transaction ${transactionId}`);
        break;
      }

      case "checkout.session.expired":
      case "payment_intent.payment_failed": {
        const session = event.data.object;
        const transactionId = session.metadata?.transaction_id;

        if (!transactionId) {
          console.error("No transaction ID in webhook metadata");
          break;
        }

        // Update transaction status to failed
        const { error: transactionError } = await supabase
          .from("transactions")
          .update({
            status: "failed",
            timestamp: new Date().toISOString(),
          })
          .eq("id", transactionId);

        if (transactionError) {
          console.error("Error updating failed transaction:", transactionError);
        }

        // Release temporarily reserved squares
        const { error: squareError } = await supabase
          .from("squares")
          .update({
            claimed_by: null,
            donor_name: null,
            payment_status: "pending",
            payment_type: "stripe",
            claimed_at: null,
          })
          .eq("claimed_by", `temp_${transactionId}`);

        if (squareError) {
          console.error("Error releasing squares:", squareError);
        }

        console.log(`Payment failed for transaction ${transactionId}`);
        break;
      }

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }
  } catch (error) {
    console.error("Error processing webhook:", error);
    return NextResponse.json(
      { error: "Webhook processing failed" },
      { status: 500 },
    );
  }

  return NextResponse.json({ received: true });
}
