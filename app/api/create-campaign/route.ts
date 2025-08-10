import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabaseServer";
import { isDemoMode } from "@/lib/supabaseClient";
import { v4 as uuidv4 } from "uuid";

// Add timeout configuration
export const maxDuration = 30; // 30 seconds timeout

function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9 -]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .trim();
}

function calculateSquarePrice(
  position: number,
  pricingType: string,
  priceData: any,
): number {
  try {
    switch (pricingType) {
      case "fixed":
        return priceData.fixed || 10;
      case "sequential":
        const start = priceData.sequential?.start || priceData.start || 1;
        const increment =
          priceData.sequential?.increment || priceData.increment || 1;
        return start + (position - 1) * increment;
      case "manual":
        const key = `${Math.floor((position - 1) / 10)},${(position - 1) % 10}`;
        return (
          priceData.manual?.[key] || priceData.prices?.[position - 1] || 10
        );
      default:
        return 10;
    }
  } catch (error) {
    console.error("Error calculating square price:", error);
    return 10;
  }
}

// Optimized function to create squares in bulk
async function createSquaresBulk(supabase: any, campaignId: string, rows: number, columns: number, pricingType: string, priceData: any): Promise<{ success: boolean; error?: any }> {
  const totalSquares = rows * columns;
  
  // If it's a small grid, use the existing method
  if (totalSquares <= 100) {
    return await createSquaresLegacy(supabase, campaignId, rows, columns, pricingType, priceData);
  }

  // For large grids, use proper Supabase bulk insert
  const squares: Array<{
    campaign_id: string;
    row: number;
    col: number;
    row_num: number;
    col_num: number;
    number: number;
    position: number;
    value: number;
    claimed_by: null;
    donor_name: null;
    payment_status: 'pending';
    payment_type: 'stripe';
    claimed_at: null;
  }> = [];

  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < columns; col++) {
      const position = row * columns + col + 1;
      const price = calculateSquarePrice(position, pricingType, priceData);
      
      squares.push({
        campaign_id: campaignId,
        row: row,
        col: col,
        row_num: row,
        col_num: col,
        number: position,
        position: position,
        value: price,
        claimed_by: null,
        donor_name: null,
        payment_status: 'pending',
        payment_type: 'stripe',
        claimed_at: null
      });
    }
  }

  console.log(`🎯 Creating ${squares.length} squares with calculated prices. First 3 examples:`);
  squares.slice(0, 3).forEach(square => {
    console.log(`   Square ${square.position}: $${square.value}`);
  });

  // Insert squares in batches to avoid payload limits
  const batchSize = 100;
  for (let i = 0; i < squares.length; i += batchSize) {
    const batch = squares.slice(i, i + batchSize);
    const { error } = await supabase
      .from('squares')
      .insert(batch);
    
    if (error) {
      console.error(`❌ Batch insert failed for squares ${i + 1}-${i + batch.length}:`, error);
      throw error;
    }
    console.log(`✅ Inserted squares ${i + 1}-${i + batch.length}`);
  }

  return { success: true };
}

// Legacy method for smaller grids or fallback
async function createSquaresLegacy(supabase: any, campaignId: string, rows: number, columns: number, pricingType: string, priceData: any): Promise<{ success: boolean; error?: any }> {
  const squares: Array<{
    campaign_id: string;
    row: number;
    col: number;
    row_num: number;
    col_num: number;
    number: number;
    position: number;
    value: number;
    claimed_by: null;
    donor_name: null;
    payment_status: 'pending';
    payment_type: 'stripe';
    claimed_at: null;
  }> = [];

  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < columns; col++) {
      const position = row * columns + col + 1;
      const price = calculateSquarePrice(position, pricingType, priceData);
      
      squares.push({
        campaign_id: campaignId,
        row: row,
        col: col,
        row_num: row,
        col_num: col,
        number: position,
        position: position,
        value: price,
        claimed_by: null,
        donor_name: null,
        payment_status: 'pending',
        payment_type: 'stripe',
        claimed_at: null
      });
    }
  }

  console.log(`🎯 Created ${squares.length} squares with calculated prices. First 3 examples:`);
  squares.slice(0, 3).forEach(square => {
    console.log(`   Square ${square.position}: $${square.value}`);
  });
  console.log(`Now inserting into database in batches`);

  // Use smaller batch sizes to avoid timeouts
  const BATCH_SIZE = 50;
  let squaresInsertionError: any = null;

  try {
    for (let i = 0; i < squares.length; i += BATCH_SIZE) {
      const batch = squares.slice(i, i + BATCH_SIZE);
      console.log(`Inserting batch ${Math.floor(i/BATCH_SIZE) + 1}/${Math.ceil(squares.length/BATCH_SIZE)}: ${batch.length} squares`);

      const { error } = await supabase
        .from('squares')
        .insert(batch);

      if (error) {
        console.error(`Error inserting squares batch ${Math.floor(i/BATCH_SIZE) + 1}:`, error);
        squaresInsertionError = error;
        break;
      }
    }
  } catch (error) {
    console.error('Unexpected error during squares insertion:', error);
    squaresInsertionError = error;
  }

  return { success: !squaresInsertionError, error: squaresInsertionError };
}

export async function POST(request: NextRequest) {
  try {
    console.log("=== CAMPAIGN CREATION START ===");

    const body = await request.json();
    const {
      title,
      description,
      imageUrl,
      rows,
      columns,
      pricingType,
      priceData,
      focusPoint,
    } = body;

    console.log("Campaign creation request:", {
      title,
      rows,
      columns,
      pricingType,
      totalSquares: rows * columns,
      isDemoMode: isDemoMode()
    });

    if (!title || !rows || !columns || !pricingType) {
      console.error("Missing required fields:", {
        title: !!title,
        rows: !!rows,
        columns: !!columns,
        pricingType: !!pricingType,
      });
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 },
      );
    }

    if (rows < 2 || rows > 50 || columns < 2 || columns > 50) {
      console.error("Invalid grid dimensions:", { rows, columns });
      return NextResponse.json(
        { error: "Grid dimensions must be between 2 and 50" },
        { status: 400 },
      );
    }

    // Validate grid size to prevent extremely large grids
    if (rows > 100 || columns > 100 || rows * columns > 2500) {
      return NextResponse.json(
        { error: 'Grid size too large. Maximum 100x100 or 2500 total squares allowed.' },
        { status: 400 }
      );
    }

    // Check if in demo mode
    if (isDemoMode()) {
      console.log("Using demo mode for campaign creation");
      const slug = generateSlug(title);
      const mockCampaign = {
        id: uuidv4(),
        slug,
        title,
        description: description || null,
        imageUrl: imageUrl,
        rows,
        columns,
        pricingType: pricingType,
        priceData: priceData,
        totalSquares: rows * columns,
        createdAt: new Date().toISOString(),
        publicUrl: `${request.nextUrl.origin}/fundraiser/${slug}`,
        paidToAdmin: false,
        isActive: true,
        userId: "demo-user",
      };

      return NextResponse.json({
        success: true,
        campaign: mockCampaign,
        message: "Campaign created successfully (demo mode)",
      });
    }

    // Get authenticated user using regular supabase client
    console.log("Creating Supabase client...");
    const supabase = await createServerSupabaseClient();

    console.log("Getting authenticated user...");
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError) {
      console.error("Authentication error:", authError);
      return NextResponse.json(
        { error: "Authentication error. Please log in again." },
        { status: 401 },
      );
    }

    if (!user) {
      console.error("No authenticated user found");
      return NextResponse.json(
        {
          error: "Authentication required. Please log in to create a campaign.",
        },
        { status: 401 },
      );
    }

    console.log("Authenticated user:", user.id);

    const slug = generateSlug(title);

    // Prepare campaign data
    const campaignData = {
      user_id: user.id,
      title,
      description: description || null,
      slug,
      image_url: imageUrl,
      rows,
      columns,
      pricing_type: pricingType,
      price_data: priceData,
      is_active: true,
      total_squares: rows * columns,
      og_focus_point: focusPoint || { x: 0.5, y: 0.3 },
    };

    console.log("Campaign data prepared:", campaignData);

    // Insert campaign using regular user permissions
    console.log("Inserting campaign into database...");
    const { data: campaign, error: campaignError } = await supabase
      .from("campaigns")
      .insert(campaignData)
      .select()
      .single();

    if (campaignError) {
      console.error("Campaign creation error:", campaignError);
      console.error("Campaign data that failed:", campaignData);
      return NextResponse.json(
        { error: `Failed to create campaign: ${campaignError.message}` },
        { status: 500 },
      );
    }

    if (!campaign) {
      return NextResponse.json(
        { error: "Campaign was created but no data was returned" },
        { status: 500 },
      );
    }

    console.log("Campaign created successfully:", campaign.id);

    // Create squares for the campaign using optimized method
    const squaresResult = await createSquaresBulk(
      supabase, 
      campaign.id, 
      rows, 
      columns, 
      pricingType, 
      priceData
    );

    const campaignResponse = {
      id: campaign.id,
      slug: campaign.slug,
      title: campaign.title,
      description: campaign.description,
      imageUrl: campaign.image_url,
      rows: campaign.rows,
      columns: campaign.columns,
      pricingType: campaign.pricing_type,
      priceData: campaign.price_data,
      totalSquares: campaign.total_squares,
      createdAt: campaign.created_at,
      publicUrl: `${request.nextUrl.origin}/fundraiser/${campaign.slug}`,
      paidToAdmin: false,
      isActive: campaign.is_active,
      userId: campaign.user_id
    };

    if (!squaresResult.success) {
      console.error('Squares creation error:', squaresResult.error);
      // Return success but with warning about squares
      return NextResponse.json({
        success: true,
        campaign: campaignResponse,
        warning: 'Campaign created but squares could not be generated. You may need to refresh the page.',
        message: 'Campaign created successfully'
      });
    }

    console.log(`Successfully created campaign with ${rows * columns} squares`);

    // Return success response
    return NextResponse.json({
      success: true,
      campaign: campaignResponse,
      message: 'Campaign created successfully'
    });
  } catch (error) {
    console.error("=== CAMPAIGN CREATION ERROR ===");
    console.error("API error:", error);
    console.error(
      "Error stack:",
      error instanceof Error ? error.stack : "No stack trace",
    );
    return NextResponse.json(
      { error: "Internal server error. Please try again." },
      { status: 500 },
    );
  }
}
