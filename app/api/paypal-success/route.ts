import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabaseServer";
import { capturePayPalOrder } from "@/lib/paypal";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const transactionId = searchParams.get("transaction_id");
    const paypalOrderId = searchParams.get("token"); // PayPal sends order ID as 'token'

    console.log("PayPal success handler called with:", {
      transactionId,
      paypalOrderId,
      fullUrl: request.url,
      searchParams: Object.fromEntries(searchParams.entries()),
    });

    if (!transactionId || !paypalOrderId) {
      console.error("Missing required parameters:", {
        transactionId,
        paypalOrderId,
      });
      return NextResponse.redirect(
        new URL("/", request.url).toString() + "?error=missing_params",
      );
    }

    const supabase = await createServerSupabaseClient();

    // Get transaction details with enhanced logging
    console.log(`Looking for transaction with ID: ${transactionId}`);

    const { data: transaction, error: transactionError } = await supabase
      .from("transactions")
      .select("*, campaigns(slug)")
      .eq("id", transactionId)
      .single();

    console.log("Transaction query result:", {
      transaction,
      transactionError,
      transactionId,
    });

    if (transactionError || !transaction) {
      console.error("Transaction not found:", {
        transactionId,
        error: transactionError,
      });
      return NextResponse.redirect(
        new URL("/", request.url).toString() + "?error=transaction_not_found",
      );
    }

    // Capture the PayPal payment
    console.log(`Attempting to capture PayPal order: ${paypalOrderId}`);
    const captureResult = await capturePayPalOrder(paypalOrderId);

    console.log("PayPal capture result:", {
      status: captureResult.status,
      orderId: paypalOrderId,
      transactionId,
    });

    if (captureResult.status === "COMPLETED") {
      console.log(
        `PayPal payment captured successfully for transaction ${transactionId}`,
      );

      // Update transaction status to completed immediately for PayPal
      console.log(`Updating transaction ${transactionId} to completed status`);

      const { data: updatedTransaction, error: transactionUpdateError } =
        await supabase
          .from("transactions")
          .update({
            status: "completed",
            paypal_order_id: paypalOrderId,
            timestamp: new Date().toISOString(),
          })
          .eq("id", transactionId)
          .select()
          .single();

      if (transactionUpdateError) {
        console.error(
          "CRITICAL ERROR: Failed to update transaction status to completed:",
          {
            error: transactionUpdateError,
            transactionId,
            paypalOrderId,
          },
        );
        // This is critical - if we can't mark the transaction as completed,
        // we should not proceed with square updates
        return NextResponse.redirect(
          new URL("/", request.url).toString() +
            "?error=transaction_update_failed",
        );
      } else {
        console.log(
          `SUCCESS: Transaction ${transactionId} marked as COMPLETED:`,
          updatedTransaction,
        );
      }

      // Find squares with temp prefix - try multiple approaches
      console.log(
        `Looking for temp squares with claimed_by: temp_${transactionId}`,
      );

      const { data: tempSquares, error: tempSquareError } = await supabase
        .from("squares")
        .select("*")
        .eq("claimed_by", `temp_${transactionId}`);

      console.log("Temp squares query result:", {
        tempSquares,
        tempSquareError,
        searchPattern: `temp_${transactionId}`,
      });

      // Also try to find squares by campaign_id if temp squares not found
      let squaresToUpdate = tempSquares;
      if (!tempSquares || tempSquares.length === 0) {
        console.log(
          `No temp squares found, checking for squares in campaign ${transaction.campaign_id}`,
        );

        const { data: campaignSquares, error: campaignSquareError } =
          await supabase
            .from("squares")
            .select("*")
            .eq("campaign_id", transaction.campaign_id)
            .or(`claimed_by.like.temp_%,payment_status.eq.pending`);

        console.log("Campaign squares query result:", {
          campaignSquares: campaignSquares?.length || 0,
          campaignSquareError,
        });

        squaresToUpdate = campaignSquares;
      }

      console.log(
        `Found ${squaresToUpdate?.length || 0} squares to update for transaction ${transactionId}`,
        squaresToUpdate?.map(
          (s) =>
            `Square ${s.number} (${s.row},${s.col}) - claimed_by: ${s.claimed_by}`,
        ),
      );

      if (tempSquareError) {
        console.error("Error finding temp squares:", tempSquareError);
      }

      if (squaresToUpdate && squaresToUpdate.length > 0) {
        // Update squares to mark as completed and remove temp prefix
        console.log(`Updating squares for transaction ${transactionId}`);

        const updateData = {
          claimed_by: transaction.donor_email || "anonymous",
          donor_name: transaction.donor_name || "Anonymous",
          payment_status: "completed" as const,
          payment_type: "paypal" as const,
          claimed_at: new Date().toISOString(),
        };

        console.log(
          `PayPal payment completed immediately for transaction ${transactionId} - updating squares to completed status`,
        );

        console.log("Square update data:", updateData);

        // Try updating by temp prefix first
        let { data: updatedSquares, error: squareUpdateError } = await supabase
          .from("squares")
          .update(updateData)
          .eq("claimed_by", `temp_${transactionId}`)
          .select();

        console.log("First square update attempt:", {
          updatedSquares: updatedSquares?.length || 0,
          squareUpdateError,
        });

        // If no squares were updated, try updating by square IDs from transaction
        if (
          (!updatedSquares || updatedSquares.length === 0) &&
          transaction.square_ids
        ) {
          console.log(
            "Trying to update squares by square_ids from transaction",
          );

          let squareIds: string[] = [];
          try {
            if (typeof transaction.square_ids === "string") {
              squareIds = JSON.parse(transaction.square_ids);
            } else if (Array.isArray(transaction.square_ids)) {
              squareIds = transaction.square_ids;
            }
          } catch (e) {
            console.error("Error parsing square_ids:", e);
          }

          if (squareIds.length > 0) {
            const { data: squaresByIds, error: squaresByIdsError } =
              await supabase
                .from("squares")
                .update(updateData)
                .in("id", squareIds)
                .select();

            console.log("Square update by IDs result:", {
              squaresByIds: squaresByIds?.length || 0,
              squaresByIdsError,
              squareIds,
            });

            if (!squaresByIdsError && squaresByIds) {
              updatedSquares = squaresByIds;
              squareUpdateError = null;
            }
          }
        }

        if (squareUpdateError) {
          console.error(
            "CRITICAL ERROR: Failed to update squares to completed status:",
            squareUpdateError,
          );
        } else {
          console.log(
            `SUCCESS: Updated ${updatedSquares?.length || 0} squares to COMPLETED status for PayPal transaction ${transactionId}`,
            updatedSquares?.map(
              (s) =>
                `Square ${s.number}: ${s.donor_name} (${s.payment_status})`,
            ),
          );
        }

        // Verify that the transaction is actually marked as completed
        const { data: finalTransaction, error: verifyTransactionError } =
          await supabase
            .from("transactions")
            .select("status")
            .eq("id", transactionId)
            .single();

        if (verifyTransactionError) {
          console.error(
            "Error verifying transaction status:",
            verifyTransactionError,
          );
        } else {
          console.log(
            `VERIFICATION: Transaction ${transactionId} final status: ${finalTransaction.status}`,
          );
          if (finalTransaction.status !== "completed") {
            console.error(
              `CRITICAL: Transaction ${transactionId} is NOT marked as completed! Status: ${finalTransaction.status}`,
            );
          }
        }

        // Double-check the update worked by querying the updated squares
        const { data: verificationSquares, error: verifyError } = await supabase
          .from("squares")
          .select("*")
          .eq("campaign_id", transaction.campaign_id)
          .eq("payment_status", "completed")
          .eq("payment_type", "paypal")
          .not("claimed_by", "is", null);

        console.log(
          `Verification: Found ${verificationSquares?.length || 0} completed PayPal squares in campaign`,
          verificationSquares?.map(
            (s) => `Square ${s.number}: ${s.donor_name}`,
          ),
        );

        if (verifyError) {
          console.error("Error verifying square updates:", verifyError);
        }
      } else {
        console.warn(
          `No temp squares found for transaction ${transactionId}. This might indicate an issue with the payment flow.`,
        );
      }

      // Redirect to success page with additional parameters for receipt
      const campaignSlug = transaction.campaigns?.slug || "unknown";
      const redirectUrl = new URL(`/fundraiser/${campaignSlug}`, request.url);
      redirectUrl.searchParams.set("success", "true");
      redirectUrl.searchParams.set("transaction_id", transactionId);
      redirectUrl.searchParams.set(
        "donor_name",
        transaction.donor_name || "Anonymous",
      );
      redirectUrl.searchParams.set(
        "donor_email",
        transaction.donor_email || "",
      );
      redirectUrl.searchParams.set("payment_method", "paypal");

      console.log(`Redirecting to success page: ${redirectUrl.toString()}`);

      return NextResponse.redirect(redirectUrl);
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
      console.log(
        `Releasing temp squares for failed transaction ${transactionId}`,
      );

      const { error: releaseSquareError } = await supabase
        .from("squares")
        .update({
          claimed_by: null,
          donor_name: null,
          payment_status: "pending",
          payment_type: "stripe",
          claimed_at: null,
        })
        .eq("claimed_by", `temp_${transactionId}`);

      if (releaseSquareError) {
        console.error("Error releasing squares:", releaseSquareError);
      } else {
        console.log(
          `Successfully released temp squares for failed transaction ${transactionId}`,
        );
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
