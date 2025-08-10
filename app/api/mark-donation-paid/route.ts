import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// Get environment variables with proper error handling
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl) {
  throw new Error("NEXT_PUBLIC_SUPABASE_URL is required but not set");
}

if (!supabaseServiceKey) {
  throw new Error("SUPABASE_SERVICE_ROLE_KEY is required but not set");
}

// Create admin client
const adminSupabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

export async function POST(request: NextRequest) {
  console.log("[MARK-PAID-NEW] POST request received");

  try {
    const body = await request.json();
    const { transactionId } = body;

    console.log("[MARK-PAID-NEW] ===== DEBUGGING COMPLETE SQUARES =====");
    console.log("[MARK-PAID-NEW] Transaction ID:", transactionId);
    console.log("[MARK-PAID-NEW] Request body:", body);

    if (!transactionId) {
      return NextResponse.json(
        { error: "Transaction ID is required" },
        { status: 400 },
      );
    }

    // Get the transaction first
    const { data: transaction, error: transactionError } = await adminSupabase
      .from("transactions")
      .select("*")
      .eq("id", transactionId)
      .single();

    if (transactionError || !transaction) {
      console.error("[MARK-PAID-NEW] Transaction not found:", transactionError);
      return NextResponse.json(
        { error: "Transaction not found" },
        { status: 404 },
      );
    }

    console.log("[MARK-PAID-NEW] Found transaction:", {
      id: transaction.id,
      payment_method: transaction.payment_method,
      campaign_id: transaction.campaign_id,
      donor_email: transaction.donor_email,
      total: transaction.total,
      square_ids: transaction.square_ids,
      square_ids_type: typeof transaction.square_ids,
      square_ids_length: Array.isArray(transaction.square_ids) ? transaction.square_ids.length : 'not_array',
      status: transaction.status
    });

    // Check what squares exist in the campaign for this donor
    console.log("[MARK-PAID-NEW] Checking existing squares for donor email:", transaction.donor_email);
    const { data: existingSquares, error: existingSquareError } = await adminSupabase
      .from("squares")
      .select("id, number, claimed_by, payment_status, payment_type")
      .eq("campaign_id", transaction.campaign_id)
      .ilike("claimed_by", transaction.donor_email || "");
    
    console.log("[MARK-PAID-NEW] Existing squares for donor:", {
      count: existingSquares?.length || 0,
      squares: existingSquares?.slice(0, 5),
      error: existingSquareError?.message || null
    });

    // Update transaction status to completed
    const { error: updateError } = await adminSupabase
      .from("transactions")
      .update({
        status: "completed",
        timestamp: new Date().toISOString(),
      })
      .eq("id", transactionId);

    if (updateError) {
      console.error("[MARK-PAID-NEW] Error updating transaction:", updateError);
      return NextResponse.json(
        { error: "Failed to update transaction" },
        { status: 500 },
      );
    }

    // Update the squares to mark them as completed
    console.log("[MARK-PAID-NEW] Updating squares for transaction:", transactionId);
    
    const updateData = {
      claimed_by: transaction.donor_email || "anonymous",
      donor_name: transaction.donor_name || "Anonymous",
      payment_status: "completed" as const,
      payment_type: "paypal" as const,
      claimed_at: new Date().toISOString(),
    };

    console.log("[MARK-PAID-NEW] Square update data:", updateData);

    // First, try to find squares by donor email (permanent reservation)
    console.log("[MARK-PAID-NEW] Looking for squares with claimed_by:", transaction.donor_email);

    let updatedSquares: any[] | null = null;
    let squareUpdateError: any = null;

    if (transaction.donor_email) {
      // Stage 1: claimed_by + pending
      const { data: reservedPending, error: reservedPendingErr } = await adminSupabase
        .from("squares")
        .select("id")
        .ilike("claimed_by", transaction.donor_email)
        .eq("campaign_id", transaction.campaign_id)
        .eq("payment_status", "pending");

      console.log("[MARK-PAID-NEW] claimed_by + pending count:", reservedPending?.length || 0, reservedPendingErr);

      if (reservedPending && reservedPending.length > 0) {
        const { data: updatedReservedSquares, error: reservedUpdateError } = await adminSupabase
          .from("squares")
          .update(updateData)
          .ilike("claimed_by", transaction.donor_email)
          .eq("campaign_id", transaction.campaign_id)
          .eq("payment_status", "pending")
          .select();

        console.log("[MARK-PAID-NEW] Updated claimed_by + pending:", updatedReservedSquares?.length || 0, reservedUpdateError);

        if (!reservedUpdateError && updatedReservedSquares) {
          updatedSquares = updatedReservedSquares;
        } else {
          squareUpdateError = reservedUpdateError;
        }
      }

      // Stage 2: claimed_by + any status not completed (handles null/"reserved")
      if (!updatedSquares || updatedSquares.length === 0) {
        const { data: reservedAny, error: reservedAnyErr } = await adminSupabase
          .from("squares")
          .select("id")
          .ilike("claimed_by", transaction.donor_email)
          .eq("campaign_id", transaction.campaign_id)
          .neq("payment_status", "completed");

        console.log("[MARK-PAID-NEW] claimed_by + !completed count:", reservedAny?.length || 0, reservedAnyErr);

        if (reservedAny && reservedAny.length > 0) {
          const { data: updatedReservedAny, error: reservedAnyUpdateErr } = await adminSupabase
            .from("squares")
            .update(updateData)
            .ilike("claimed_by", transaction.donor_email)
            .eq("campaign_id", transaction.campaign_id)
            .neq("payment_status", "completed")
            .select();

          console.log("[MARK-PAID-NEW] Updated claimed_by + !completed:", updatedReservedAny?.length || 0, reservedAnyUpdateErr);

          if (!reservedAnyUpdateErr && updatedReservedAny) {
            updatedSquares = updatedReservedAny;
          } else {
            squareUpdateError = reservedAnyUpdateErr;
          }
        }
      }

      // Stage 3: buyer_email + any status not completed (older schema flows)
      if (!updatedSquares || updatedSquares.length === 0) {
        const { data: buyerAny, error: buyerAnyErr } = await adminSupabase
          .from("squares")
          .select("id")
          .ilike("buyer_email", transaction.donor_email)
          .eq("campaign_id", transaction.campaign_id)
          .neq("payment_status", "completed");

        console.log("[MARK-PAID-NEW] buyer_email + !completed count:", buyerAny?.length || 0, buyerAnyErr);

        if (buyerAny && buyerAny.length > 0) {
          const { data: updatedBuyerAny, error: buyerAnyUpdateErr } = await adminSupabase
            .from("squares")
            .update(updateData)
            .ilike("buyer_email", transaction.donor_email)
            .eq("campaign_id", transaction.campaign_id)
            .neq("payment_status", "completed")
            .select();

          console.log("[MARK-PAID-NEW] Updated buyer_email + !completed:", updatedBuyerAny?.length || 0, buyerAnyUpdateErr);

          if (!buyerAnyUpdateErr && updatedBuyerAny) {
            updatedSquares = updatedBuyerAny;
          } else {
            squareUpdateError = buyerAnyUpdateErr;
          }
        }
      }

      // Stage 4: claimed_by + any status (no payment_status filter), no payment_type filter
      if (!updatedSquares || updatedSquares.length === 0) {
        const { data: claimedAny, error: claimedAnyErr } = await adminSupabase
          .from("squares")
          .select("id")
          .ilike("claimed_by", transaction.donor_email)
          .eq("campaign_id", transaction.campaign_id);

        console.log("[MARK-PAID-NEW] claimed_by (any status/type) count:", claimedAny?.length || 0, claimedAnyErr);

        if (claimedAny && claimedAny.length > 0) {
          const { data: updatedClaimedAny, error: claimedAnyUpdateErr } = await adminSupabase
            .from("squares")
            .update(updateData)
            .ilike("claimed_by", transaction.donor_email)
            .eq("campaign_id", transaction.campaign_id)
            .select();

          console.log("[MARK-PAID-NEW] Updated claimed_by (any status/type):", updatedClaimedAny?.length || 0, claimedAnyUpdateErr);

          if (!claimedAnyUpdateErr && updatedClaimedAny) {
            updatedSquares = updatedClaimedAny;
          } else {
            squareUpdateError = claimedAnyUpdateErr;
          }
        }
      }

      // Stage 5: legacy temp_ reservation (older flows)
      if (!updatedSquares || updatedSquares.length === 0) {
        const tempKey = `temp_${transaction.id}`;
        const { data: tempSquares, error: tempSquaresErr } = await adminSupabase
          .from("squares")
          .select("id")
          .eq("claimed_by", tempKey)
          .eq("campaign_id", transaction.campaign_id)
          .neq("payment_status", "completed");

        console.log("[MARK-PAID-NEW] temp_ reservation count:", tempSquares?.length || 0, tempSquaresErr);

        if (tempSquares && tempSquares.length > 0) {
          const { data: updatedTempSquares, error: tempUpdateErr } = await adminSupabase
            .from("squares")
            .update(updateData)
            .eq("claimed_by", tempKey)
            .eq("campaign_id", transaction.campaign_id)
            .neq("payment_status", "completed")
            .select();

          console.log("[MARK-PAID-NEW] Updated temp_ reservations:", updatedTempSquares?.length || 0, tempUpdateErr);

          if (!tempUpdateErr && updatedTempSquares) {
            updatedSquares = updatedTempSquares;
          } else {
            squareUpdateError = tempUpdateErr;
          }
        }
      }
    }

    // If no squares were updated by temp prefix, try updating by square IDs from transaction
    if ((!updatedSquares || updatedSquares.length === 0) && transaction.square_ids) {
      console.log("[MARK-PAID-NEW] Trying to update squares by square_ids from transaction");
      
      try {
        let squareIds = transaction.square_ids;

        // Parse if it's a string
        if (typeof squareIds === "string") {
          squareIds = JSON.parse(squareIds);
        }

        console.log("[MARK-PAID-NEW] Square IDs to update:", squareIds);
        console.log("[MARK-PAID-NEW] Square IDs type:", typeof squareIds);
        console.log("[MARK-PAID-NEW] Square IDs is array:", Array.isArray(squareIds));

        if (Array.isArray(squareIds) && squareIds.length > 0) {
          // First, let's see what these squares look like currently
          const { data: currentSquares, error: currentSquaresError } = await adminSupabase
            .from("squares")
            .select("*")
            .in("id", squareIds);
          
          console.log("[MARK-PAID-NEW] Current state of squares to update:", {
            count: currentSquares?.length || 0,
            squares: currentSquares?.map(s => ({
              id: s.id,
              number: s.number,
              claimed_by: s.claimed_by,
              payment_status: s.payment_status,
              payment_type: s.payment_type
            })),
            error: currentSquaresError?.message || null
          });

          const { data: squaresByIds, error: squaresByIdsError } = await adminSupabase
            .from("squares")
            .update(updateData)
            .in("id", squareIds)
            .select();

          console.log("[MARK-PAID-NEW] Square update by IDs result:", {
            squaresByIds: squaresByIds?.length || 0,
            squaresByIdsError,
            squareIds,
          });

          if (!squaresByIdsError && squaresByIds) {
            updatedSquares = squaresByIds;
            squareUpdateError = null;
          } else {
            squareUpdateError = squaresByIdsError;
          }
        }
      } catch (parseError) {
        console.error("[MARK-PAID-NEW] Error parsing square_ids:", parseError);
        squareUpdateError = parseError;
      }
    }

    console.log("[MARK-PAID-NEW] Before fallback logic check:", {
      updatedSquaresCount: updatedSquares?.length || 0,
      paymentMethod: transaction.payment_method,
      isPayPal: transaction.payment_method === "paypal",
      shouldRunFallback: (!updatedSquares || updatedSquares.length === 0) && transaction.payment_method === "paypal"
    });

    // If still no squares updated and this is a PayPal transaction, try to find squares by campaign and payment status
    if ((!updatedSquares || updatedSquares.length === 0) && transaction.payment_method === "paypal") {
      console.log("[MARK-PAID-NEW] PayPal transaction with no square_ids - looking for pending PayPal squares in campaign");
      
      const { data: pendingPayPalSquares, error: pendingPayPalError } = await adminSupabase
        .from("squares")
        .select("*")
        .eq("campaign_id", transaction.campaign_id)
        .eq("payment_type", "paypal")
        .eq("payment_status", "pending");

      console.log("[MARK-PAID-NEW] Pending PayPal squares query result:", {
        pendingPayPalSquares: pendingPayPalSquares?.length || 0,
        pendingPayPalError,
      });

      if (pendingPayPalSquares && pendingPayPalSquares.length > 0) {
        console.log("[MARK-PAID-NEW] Found pending PayPal squares, updating them");
        
        const { data: updatedPendingSquares, error: pendingUpdateError } = await adminSupabase
          .from("squares")
          .update(updateData)
          .eq("campaign_id", transaction.campaign_id)
          .eq("payment_type", "paypal")
          .eq("payment_status", "pending")
          .select();

        console.log("[MARK-PAID-NEW] Pending PayPal squares update result:", {
          updatedPendingSquares: updatedPendingSquares?.length || 0,
          pendingUpdateError,
        });

        if (!pendingUpdateError && updatedPendingSquares) {
          updatedSquares = updatedPendingSquares;
          squareUpdateError = null;
        } else {
          squareUpdateError = pendingUpdateError;
        }
      } else {
        // If no pending PayPal squares found, try to reserve and complete available squares 
        // based on the transaction total
        console.log("[MARK-PAID-NEW] No pending PayPal squares found - looking for available squares to reserve based on transaction total");
        
        const { data: availableSquares, error: availableSquaresError } = await adminSupabase
          .from("squares")
          .select("*")
          .eq("campaign_id", transaction.campaign_id)
          .is("claimed_by", null)
          .order("number", { ascending: true });

        console.log("[MARK-PAID-NEW] Available squares query result:", {
          availableSquares: availableSquares?.length || 0,
          availableSquaresError,
          transactionTotal: transaction.total,
        });

        if (availableSquares && availableSquares.length > 0) {
          // Find squares that match the transaction total
          let selectedSquares: any[] = [];
          let currentTotal = 0;
          
          for (const square of availableSquares) {
            if (currentTotal < transaction.total) {
              selectedSquares.push(square);
              currentTotal += square.value;
              
              if (currentTotal >= transaction.total) {
                break;
              }
            }
          }

          console.log("[MARK-PAID-NEW] Selected squares for reservation:", {
            selectedSquares: selectedSquares.length,
            selectedTotal: currentTotal,
            targetTotal: transaction.total,
            squareNumbers: selectedSquares.map(s => s.number),
          });

          if (selectedSquares.length > 0 && currentTotal >= transaction.total) {
            // Reserve and complete these squares
            const squareIds = selectedSquares.map(s => s.id);
            
            const { data: reservedSquares, error: reservationError } = await adminSupabase
              .from("squares")
              .update({
                claimed_by: transaction.donor_email || "anonymous",
                donor_name: transaction.donor_name || "Anonymous", 
                payment_status: "completed" as const,
                payment_type: "paypal" as const,
                claimed_at: new Date().toISOString(),
              })
              .in("id", squareIds)
              .is("claimed_by", null) // Only update if still available
              .select();

            console.log("[MARK-PAID-NEW] Square reservation and completion result:", {
              reservedSquares: reservedSquares?.length || 0,
              reservationError,
              squareIds,
            });

            if (!reservationError && reservedSquares && reservedSquares.length > 0) {
              updatedSquares = reservedSquares;
              squareUpdateError = null;
              
              // Update transaction with the square IDs
              await adminSupabase
                .from("transactions")
                .update({ square_ids: squareIds })
                .eq("id", transactionId);
                
              console.log("[MARK-PAID-NEW] Successfully reserved and completed squares for transaction:", {
                transactionId,
                squareCount: reservedSquares.length,
                totalValue: reservedSquares.reduce((sum, s) => sum + s.value, 0),
              });
            } else {
              squareUpdateError = reservationError || new Error("No squares were reserved");
            }
          } else {
            console.log("[MARK-PAID-NEW] Could not find enough available squares to match transaction total");
            squareUpdateError = new Error("Insufficient available squares to match transaction total");
          }
        } else {
          console.log("[MARK-PAID-NEW] No available squares found in campaign");
          squareUpdateError = availableSquaresError || new Error("No available squares found");
        }
      }
    }

    if (squareUpdateError) {
      console.error("[MARK-PAID-NEW] Error updating squares:", squareUpdateError);
      
      // Check if the error is due to no available squares
      const isNoSquaresError = squareUpdateError.message?.includes("No available squares found") || 
                               squareUpdateError.message?.includes("Insufficient available squares");
      
      if (isNoSquaresError) {
        console.log("[MARK-PAID-NEW] Transaction marked as completed despite no squares being reserved");
        return NextResponse.json({ 
          success: true,
          warning: "Transaction completed but no squares were available to reserve",
          squaresReserved: 0
        });
      }
    } else {
      console.log("[MARK-PAID-NEW] Successfully updated squares:", {
        count: updatedSquares?.length || 0,
        squares: updatedSquares?.map(s => `Square ${s.number}: ${s.donor_name} (${s.payment_status})`)
      });
    }

    console.log("[MARK-PAID-NEW] Successfully marked donation as paid", {
      transactionId,
      squaresReserved: updatedSquares?.length || 0,
      updatedSquareDetails: updatedSquares?.map(s => ({
        id: s.id,
        number: s.number,
        claimed_by: s.claimed_by,
        payment_status: s.payment_status
      }))
    });
    
    return NextResponse.json({ 
      success: true,
      squaresReserved: updatedSquares?.length || 0,
      debug: {
        transactionId,
        paymentMethod: transaction.payment_method,
        squareDetails: updatedSquares?.map(s => ({
          id: s.id,
          number: s.number,
          value: s.value
        }))
      }
    });
  } catch (error) {
    console.error("[MARK-PAID-NEW] API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

export async function GET() {
  console.log("[MARK-PAID-NEW] GET request received - route is working");
  return NextResponse.json({ message: "Mark donation paid API is working" });
}
