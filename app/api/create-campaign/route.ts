import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabaseServer';
import { isDemoMode } from '@/lib/supabaseClient';
import { v4 as uuidv4 } from 'uuid';

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

export async function POST(request: NextRequest) {
  try {
    const { title, description, imageUrl, rows, columns, pricingType, priceData } = await request.json();

    console.log('Campaign creation request:', {
      title,
      rows,
      columns,
      pricingType,
      isDemoMode: isDemoMode()
    });

    if (!title || !rows || !columns || !pricingType) {
      return NextResponse.json(
        { error: 'Missing required fields' },
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

    // Create squares for the campaign
    const squares: Array<{
      campaign_id: string;
      row: number;
      col: number;
      number: number;
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
          campaign_id: campaign.id,
          row,
          col,
          number: position,
          value: price,
          claimed_by: null,
          donor_name: null,
          payment_status: 'pending',
          payment_type: 'stripe',
          claimed_at: null
        });
      }
    }

    console.log(`Created ${squares.length} squares, now inserting into database`);

    // Insert squares using regular user permissions
    const BATCH_SIZE = 100;
    let squaresInsertionError: any = null;

    try {
      for (let i = 0; i < squares.length; i += BATCH_SIZE) {
        const batch = squares.slice(i, i + BATCH_SIZE);
        console.log(`Inserting batch of ${batch.length} squares (${i+1} to ${Math.min(i + BATCH_SIZE, squares.length)})`);

        const { error } = await supabase
          .from('squares')
          .insert(batch);

        if (error) {
          console.error(`Error inserting squares batch ${i/BATCH_SIZE + 1}:`, error);
          squaresInsertionError = error;
          break;
        }
      }
    } catch (error) {
      console.error('Unexpected error during squares insertion:', error);
      squaresInsertionError = error;
    }

    if (squaresInsertionError) {
      console.error('Squares creation error:', squaresInsertionError);
      // Return success but with warning about squares
      return NextResponse.json({
        success: true,
        campaign: {
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
        },
        warning: 'Campaign created but squares could not be generated. You may need to refresh the page.',
        message: 'Campaign created successfully'
      });
    }

    console.log(`Successfully inserted all ${squares.length} squares`);

    // Return success response
    return NextResponse.json({
      success: true,
      campaign: {
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
      },
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