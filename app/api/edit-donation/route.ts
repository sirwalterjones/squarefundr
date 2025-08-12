import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createServerSupabaseClient } from "@/lib/supabaseServer";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export async function PUT(request: NextRequest) {
  try {
    console.log("[EDIT-DONATION] Starting edit donation request");

    const { transactionId, donorName, donorEmail, status, total } = await request.json();

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

    console.log("[EDIT-DONATION] Transaction details:", {
      id: transaction.id,
      payment_method: transaction.payment_method,
      donor_email: transaction.donor_email,
      total: transaction.total,
      square_ids: transaction.square_ids,
      square_ids_length: Array.isArray(transaction.square_ids) ? transaction.square_ids.length : typeof transaction.square_ids,
      campaign_id: transaction.campaign_id
    });

    // Check if requester is a global admin
    let isGlobalAdmin = false;
    try {
      const { data: roleRow } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .eq("role", "admin")
        .single();
      isGlobalAdmin = !!roleRow;
    } catch (e) {
      isGlobalAdmin = false;
    }

    // Verify campaign ownership unless global admin
    if (!isGlobalAdmin) {
      const { data: campaign, error: campaignError } = await adminSupabase
        .from("campaigns")
        .select("user_id")
        .eq("id", transaction.campaign_id)
        .single();

      if (campaignError || !campaign || campaign.user_id !== user.id) {
        return NextResponse.json({ error: "Access denied" }, { status: 403 });
      }
    }

    // Update transaction
    const updateData: any = {};
    if (donorName !== undefined) updateData.donor_name = donorName;
    if (donorEmail !== undefined) updateData.donor_email = donorEmail;
    if (status !== undefined) updateData.status = status;
    if (typeof total === 'number' && !Number.isNaN(total)) updateData.total = total;

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
      console.log("[EDIT-DONATION] Processing PayPal transaction completion");
      
      // Try to find and update existing squares by donor email
      const { data: existingSquares, error: existingSquareError } = await adminSupabase
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

      console.log("[EDIT-DONATION] Existing squares update result:", {
        squares: existingSquares?.length || 0,
        error: existingSquareError?.message || "none"
      });

      updatedSquares = existingSquares;

      // If no existing squares found, this might be a transaction created before our fix
      // Try to reserve available squares based on transaction total
      if ((!updatedSquares || updatedSquares.length === 0) && transaction.total > 0) {
        console.log("[EDIT-DONATION] No existing squares found, attempting to reserve available squares");
        
        // Find available squares to reserve
        const { data: availableSquares, error: availableError } = await adminSupabase
          .from("squares")
          .select("*")
          .eq("campaign_id", transaction.campaign_id)
          .or("claimed_by.is.null,claimed_by.eq.")
          .order("number", { ascending: true });

        console.log("[EDIT-DONATION] Available squares query result:", {
          available: availableSquares?.length || 0,
          error: availableError?.message || "none",
          transactionTotal: transaction.total
        });

        if (availableSquares && availableSquares.length > 0) {
          // Calculate how many squares we need - use proper logic that accumulates square values
          // instead of assuming all squares have the same price
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
          
          console.log("[EDIT-DONATION] Square calculation:", {
            transactionTotal: transaction.total,
            selectedSquares: selectedSquares.length,
            selectedTotal: currentTotal,
            availableCount: availableSquares.length
          });

          if (selectedSquares.length > 0 && currentTotal >= transaction.total) {
            // Use the selected squares that match the transaction total
            const squareIds = selectedSquares.map(s => s.id);

            console.log("[EDIT-DONATION] Reserving squares:", {
              squareIds,
              squareNumbers: selectedSquares.map(s => s.number)
            });

            // Reserve the squares
            const { data: reservedSquares, error: reserveError } = await adminSupabase
              .from("squares")
              .update({
                claimed_by: donorEmail || transaction.donor_email,
                donor_name: donorName || transaction.donor_name,
                payment_status: "completed",
                payment_type: "paypal",
                claimed_at: new Date().toISOString(),
              })
              .in("id", squareIds)
              .or("claimed_by.is.null,claimed_by.eq.") // Only update if still available (null or empty string)
              .select();

            console.log("[EDIT-DONATION] Square reservation result:", {
              reserved: reservedSquares?.length || 0,
              error: reserveError?.message || "none"
            });

            if (!reserveError && reservedSquares && reservedSquares.length > 0) {
              updatedSquares = reservedSquares;
              
              // Update the transaction with the square IDs
              await adminSupabase
                .from("transactions")
                .update({ square_ids: squareIds })
                .eq("id", transactionId);

              console.log("[EDIT-DONATION] Successfully reserved and updated transaction with square IDs");
            }
          } else {
            console.log("[EDIT-DONATION] Not enough available squares to fulfill transaction");
          }
        }
      }
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
