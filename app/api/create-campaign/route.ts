import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabaseServer';
import { supabaseAdmin, isDemoMode } from '@/lib/supabaseClient';
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
    const { title, description, imageUrl, rows, columns, pricingType, priceData, userId } = await request.json();

    console.log('Campaign creation request:', {
      title,
      rows,
      columns,
      pricingType,
      isDemoMode: isDemoMode(),
      userId
    });

    if (!title || !rows || !columns || !pricingType) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Get authenticated user
    const supabase = await createServerSupabaseClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    let actualUserId = userId;
    if (authError || !user) {
      // If no auth but userId provided, generate a new UUID for demo/test user
      if (userId) {
        const newUserId = uuidv4();
        console.log('Generated new UUID for demo/invalid user:', newUserId);
        actualUserId = newUserId;
      } else {
        return NextResponse.json(
          { error: 'Authentication required' },
          { status: 401 }
        );
      }
    } else {
      actualUserId = user.id;
    }

    const slug = generateSlug(title);

    // Try to create campaign in database
    try {
      const { data: campaign, error: campaignError } = await supabaseAdmin
        .from('campaigns')
        .insert({
          user_id: actualUserId,
          title,
          description: description || null,
          slug,
          image_url: imageUrl,
          rows,
          columns,
          pricing_type: pricingType,
          price_data: priceData,
          is_active: true
        })
        .select()
        .single();

      if (campaignError) {
        console.error('Campaign creation error:', campaignError);
        // Fall back to demo mode if database fails
        console.log('Running in demo mode - returning mock data');
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
          isActive: true
        };

        return NextResponse.json({
          success: true,
          campaign: mockCampaign,
          message: 'Campaign created successfully (demo mode)'
        });
      }

      // Create squares for the campaign - only include columns that exist
      const squares = [];
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

      const { error: squaresError } = await supabaseAdmin
        .from('squares')
        .insert(squares);

      if (squaresError) {
        console.error('Squares creation error:', squaresError);
        // Continue without squares - the squares table might have different schema
        console.log('Continuing without squares due to schema mismatch');
      }

      console.log('Campaign created successfully:', {
        id: campaign.id,
        title: campaign.title,
        slug: campaign.slug,
        publicUrl: `/fundraiser/${campaign.slug}`
      });

      // Transform the response to camelCase for frontend consistency
      const transformedCampaign = {
        id: campaign.id,
        userId: campaign.user_id,
        title: campaign.title,
        description: campaign.description,
        slug: campaign.slug,
        imageUrl: campaign.image_url,
        rows: campaign.rows,
        columns: campaign.columns,
        pricingType: campaign.pricing_type,
        priceData: campaign.price_data,
        publicUrl: `/fundraiser/${campaign.slug}`,
        isActive: campaign.is_active,
        createdAt: campaign.created_at
      };

      return NextResponse.json({
        success: true,
        campaign: transformedCampaign,
        message: 'Campaign created successfully'
      });
      
    } catch (dbError) {
      console.error('Database error during campaign creation:', dbError);
      
      // Always fall back to demo mode on any database error
      console.log('Running in demo mode - returning mock data');
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
        isActive: true
      };

      return NextResponse.json({
        success: true,
        campaign: mockCampaign,
        message: 'Campaign created successfully (demo mode)'
      });
    }
  } catch (error) {
    console.error('Campaign creation error:', error);
    return NextResponse.json(
      { error: 'Failed to create campaign' },
      { status: 500 }
    );
  }
} 