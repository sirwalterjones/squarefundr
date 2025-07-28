import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const transactionId = searchParams.get("transaction_id");
  const listPayPal = searchParams.get("list_paypal");
  const checkPendingPayPal = searchParams.get("check_pending_paypal");
  const checkDonorEmail = searchParams.get("check_donor_email");
  const checkCampaign = searchParams.get("check_campaign");
  const checkAvailableSquares = searchParams.get("check_available_squares");

  const adminSupabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  // If check_available_squares is requested, return available squares for that campaign
  if (checkAvailableSquares) {
    const { data: availableSquares, error: availableError } = await adminSupabase
      .from("squares")
      .select("*")
      .eq("campaign_id", checkAvailableSquares)
      .is("claimed_by", null)
      .order("number", { ascending: true })
      .limit(10);

    // Also check what squares exist with different claimed_by values
    const { data: allSquares, error: allSquaresError } = await adminSupabase
      .from("squares")
      .select("id, number, claimed_by, payment_status, payment_type")
      .eq("campaign_id", checkAvailableSquares)
      .order("number", { ascending: true })
      .limit(10);

    return NextResponse.json({
      availableSquares: availableSquares || [],
      availableError: availableError?.message || null,
      allSquares: allSquares || [],
      allSquaresError: allSquaresError?.message || null,
      campaignId: checkAvailableSquares,
    });
  }

  // If check_campaign is requested, return campaign details
  if (checkCampaign) {
    const { data: campaign, error: campaignError } = await adminSupabase
      .from("campaigns")
      .select("*")
      .eq("id", checkCampaign)
      .single();

    return NextResponse.json({
      campaign: campaign || null,
      campaignError: campaignError?.message || null,
    });
  }

  // If check_donor_email is requested, return squares for that donor email
  if (checkDonorEmail) {
    const { data: donorSquares, error: donorSquareError } = await adminSupabase
      .from("squares")
      .select("*")
      .eq("claimed_by", checkDonorEmail);

    return NextResponse.json({
      donorSquares: donorSquares || [],
      donorSquareError: donorSquareError?.message || null,
    });
  }

  // If check_pending_paypal is requested, return pending PayPal squares
  if (checkPendingPayPal === "true") {
    const { data: pendingSquares, error: pendingError } = await adminSupabase
      .from("squares")
      .select("*")
      .eq("payment_type", "paypal")
      .eq("payment_status", "pending");

    return NextResponse.json({
      pendingPayPalSquares: pendingSquares || [],
      pendingPayPalError: pendingError?.message || null,
    });
  }

  // If list_paypal is requested, return recent PayPal transactions
  if (listPayPal === "true") {
    const { data: paypalTransactions, error: paypalError } = await adminSupabase
      .from("transactions")
      .select("*")
      .eq("payment_method", "paypal")
      .order("timestamp", { ascending: false })
      .limit(10);

    return NextResponse.json({
      paypalTransactions: paypalTransactions || [],
      paypalError: paypalError?.message || null,
    });
  }

  if (!transactionId && listPayPal !== "true" && checkPendingPayPal !== "true" && !checkDonorEmail && !checkCampaign && !checkAvailableSquares) {
    return NextResponse.json({ error: "Transaction ID required" }, { status: 400 });
  }

  // Get transaction details
  const { data: transaction, error: transactionError } = await adminSupabase
    .from("transactions")
    .select("*")
    .eq("id", transactionId)
    .single();

  if (transactionError || !transaction) {
    return NextResponse.json({
      error: "Transaction not found",
      transactionError: transactionError?.message || null,
    });
  }

  // Get squares associated with this transaction
  let squares: any[] = [];
  let squareError: string | null = null;

  // Try multiple approaches to find squares
  if (transaction.square_ids && Array.isArray(transaction.square_ids) && transaction.square_ids.length > 0) {
    const { data: squaresByIds, error: squaresByIdsError } = await adminSupabase
      .from("squares")
      .select("*")
      .in("id", transaction.square_ids);

    squares = squaresByIds || [];
    squareError = squaresByIdsError?.message || null;
  }

  // Also try to find by donor email
  const { data: squaresByEmail, error: squaresByEmailError } = await adminSupabase
    .from("squares")
    .select("*")
    .eq("claimed_by", transaction.donor_email)
    .eq("campaign_id", transaction.campaign_id);

  // Try to find by temp prefix
  const { data: squaresByTemp, error: squaresByTempError } = await adminSupabase
    .from("squares")
    .select("*")
    .eq("claimed_by", `temp_${transaction.id}`);

  return NextResponse.json({
    transaction,
    squares,
    squareError,
    squaresByEmail: squaresByEmail || [],
    squaresByEmailError: squaresByEmailError?.message || null,
    squaresByTemp: squaresByTemp || [],
    squaresByTempError: squaresByTempError?.message || null,
  });
} 