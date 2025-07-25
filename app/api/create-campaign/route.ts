import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabaseServer';
import { isDemoMode } from '@/lib/supabaseClient';
import { v4 as uuidv4 } from 'uuid';

// Add timeout configuration
export const maxDuration = 30; // 30 seconds timeout

function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9 -]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim();
}

function calculateSquarePrice(position: number, pricingType: string, priceData: any): number {
  switch (pricingType) {
    case 'fixed':
      return priceData.fixed || 10;
    case 'sequential':
      return (priceData.start || 1) + (position - 1) * (priceData.increment || 1);
    case 'manual':
      return priceData.prices?.[position - 1] || 10;
    default:
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

  // For large grids, use SQL bulk insert
  const values: string[] = [];
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < columns; col++) {
      const position = row * columns + col + 1;
      const price = calculateSquarePrice(position, pricingType, priceData);
      
      values.push(`(
        '${campaignId}',
        ${row},
        ${col},
        ${row},
        ${col},
        ${position},
        ${position},
        ${price},
        NULL,
        NULL,
        'pending',
        'stripe',
        NULL
      )`);
    }
  }

  // Insert all squares at once using raw SQL
  const sql = `
    INSERT INTO squares (
      campaign_id, row, col, row_num, col_num, number, position, 
      value, claimed_by, donor_name, payment_status, payment_type, claimed_at
    ) VALUES ${values.join(', ')}
  `;

  try {
    const { error } = await supabase.rpc('exec_sql', { sql_query: sql });
    if (error) throw error;
    return { success: true };
  } catch (error) {
    console.error('Bulk insert failed, falling back to batch method:', error);
    return await createSquaresLegacy(supabase, campaignId, rows, columns, pricingType, priceData);
  }
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

  console.log(`Created ${squares.length} squares, now inserting into database in batches`);

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
    const { title, description, imageUrl, rows, columns, pricingType, priceData } = await request.json();

    console.log('Campaign creation request:', {
      title,
      rows,
      columns,
      pricingType,
      totalSquares: rows * columns,
      isDemoMode: isDemoMode()
    });

    if (!title || !rows || !columns || !pricingType) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
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
      console.log('Using demo mode for campaign creation');
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
        publicUrl: `/fundraiser/${slug}`,
        paidToAdmin: false,
        isActive: true,
        userId: 'demo-user'
      };

      return NextResponse.json({
        success: true,
        campaign: mockCampaign,
        message: 'Campaign created successfully (demo mode)'
      });
    }

    // Get authenticated user using regular supabase client
    const supabase = await createServerSupabaseClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Authentication required. Please log in to create a campaign.' },
        { status: 401 }
      );
    }

    console.log('Authenticated user:', user.id);

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
      total_squares: rows * columns
    };

    console.log('Campaign data prepared:', campaignData);

    // Insert campaign using regular user permissions
    const { data: campaign, error: campaignError } = await supabase
      .from('campaigns')
      .insert(campaignData)
      .select()
      .single();

    if (campaignError) {
      console.error('Campaign creation error:', campaignError);
      return NextResponse.json(
        { error: `Failed to create campaign: ${campaignError.message}` },
        { status: 500 }
      );
    }

    if (!campaign) {
      return NextResponse.json(
        { error: 'Campaign was created but no data was returned' },
        { status: 500 }
      );
    }

    console.log('Campaign created successfully:', campaign.id);

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
      publicUrl: `/fundraiser/${campaign.slug}`,
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
    console.error('API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 