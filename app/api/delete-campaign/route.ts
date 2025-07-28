import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabaseServer";
import { supabaseAdmin } from "@/lib/supabaseClient";

export async function DELETE(request: NextRequest) {
  try {
    const { campaignId } = await request.json();

    if (!campaignId) {
      return NextResponse.json(
        { error: "Campaign ID required" },
        { status: 400 },
      );
    }

    // Get authenticated user using regular supabase client
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 },
      );
    }

    console.log("Delete campaign request:", {
      campaignId,
      userId: user.id,
    });

    // First check if campaign exists and user owns it
    const { data: existingCampaign, error: fetchError } = await supabaseAdmin
      .from("campaigns")
      .select("*")
      .eq("id", campaignId)
      .eq("user_id", user.id)
      .single();

    if (fetchError || !existingCampaign) {
      console.error("Campaign not found or access denied:", fetchError);
      return NextResponse.json(
        { error: "Campaign not found or access denied" },
        { status: 404 },
      );
    }

    console.log("Found campaign to delete:", existingCampaign.title);

    // Delete all squares for this campaign first
    const { error: squaresDeleteError } = await supabaseAdmin
      .from("squares")
      .delete()
      .eq("campaign_id", campaignId);

    if (squaresDeleteError) {
      console.error("Error deleting squares:", squaresDeleteError);
      return NextResponse.json(
        { error: "Failed to delete campaign squares" },
        { status: 500 },
      );
    }

    console.log("Successfully deleted squares for campaign");

    // Delete all transactions for this campaign
    const { error: transactionsDeleteError } = await supabaseAdmin
      .from("transactions")
      .delete()
      .eq("campaign_id", campaignId);

    if (transactionsDeleteError) {
      console.error("Error deleting transactions:", transactionsDeleteError);
      return NextResponse.json(
        { error: "Failed to delete campaign transactions" },
        { status: 500 },
      );
    }

    console.log("Successfully deleted transactions for campaign");

    // Finally delete the campaign itself
    const { error: campaignDeleteError } = await supabaseAdmin
      .from("campaigns")
      .delete()
      .eq("id", campaignId)
      .eq("user_id", user.id);

    if (campaignDeleteError) {
      console.error("Error deleting campaign:", campaignDeleteError);
      return NextResponse.json(
        { error: "Failed to delete campaign" },
        { status: 500 },
      );
    }

    console.log("Successfully deleted campaign:", existingCampaign.title);

    return NextResponse.json({
      success: true,
      message: "Campaign deleted successfully",
    });
  } catch (error) {
    console.error("API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
