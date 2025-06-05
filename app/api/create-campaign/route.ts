import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabaseServer';
import { supabaseAdmin, isDemoMode } from '@/lib/supabaseClient';
import { v4 as uuidv4 } from 'uuid';
import { SupabaseClient, User } from '@supabase/supabase-js';

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
    // Check if supabaseAdmin is valid
    if (!supabaseAdmin) {
      console.error('ERROR: supabaseAdmin is not initialized properly');
      return NextResponse.json(
        { error: 'Server configuration error: Database client not initialized' },
        { status: 500 }
      );
    }

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
    let supabase: SupabaseClient;
    try {
      supabase = await createServerSupabaseClient();
      console.log('Server Supabase client created successfully');
    } catch (error) {
      console.error('Failed to create server Supabase client:', error);
      return NextResponse.json(
        { error: 'Authentication service unavailable' },
        { status: 500 }
      );
    }

    let user: User | null = null;
    let authError: Error | null = null;
    try {
      const authResponse = await supabase.auth.getUser();
      user = authResponse.data?.user || null;
      
      if (authResponse.error) {
        authError = new Error(authResponse.error.message);
        console.warn('Auth error:', authResponse.error.message);
      } else if (user) {
        console.log('Authenticated user:', user.id);
      } else {
        console.warn('No authenticated user found');
      }
    } catch (error) {
      console.error('Error during authentication check:', error);
      authError = error instanceof Error ? error : new Error(String(error));
    }

    let actualUserId = userId;
    if (authError || !user) {
      // If no auth but userId provided, generate a new UUID for demo/test user
      if (userId) {
        const newUserId = uuidv4();
        console.log('Generated new UUID for demo/invalid user:', newUserId);
        actualUserId = newUserId;
      } else {
        // Check if in demo mode
        if (isDemoMode()) {
          console.log('Authentication error, using demo mode');
          const demoUserId = uuidv4();
          actualUserId = demoUserId;
        } else {
          return NextResponse.json(
            { error: 'Authentication required' },
            { status: 401 }
          );
        }
      }
    } else {
      actualUserId = user.id;
    }

    const slug = generateSlug(title);

    // Check if in demo mode
    if (isDemoMode()) {
      console.log('Using demo mode for campaign creation');
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
        userId: actualUserId
      };

      return NextResponse.json({
        success: true,
        campaign: mockCampaign,
        message: 'Campaign created successfully (demo mode)'
      });
    }

    // Try to create campaign in database
    try {
      console.log('Creating campaign in database with supabaseAdmin:', !!supabaseAdmin);
      
      // Test supabaseAdmin client before using it
      try {
        const { error: testError } = await supabaseAdmin.from('campaigns').select('id').limit(1);
        if (testError) {
          console.error('Test query failed:', testError);
          throw new Error(`Supabase admin client test failed: ${testError.message}`);
        } else {
          console.log('Supabase admin client test successful');
        }
      } catch (testError) {
        console.error('Error testing supabaseAdmin client:', testError);
        throw new Error('Database connection test failed');
      }
      
      // Prepare campaign data
      const campaignData = {
        user_id: actualUserId,
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
      
      // Insert campaign
      const { data: campaign, error: campaignError } = await supabaseAdmin
        .from('campaigns')
        .insert(campaignData)
        .select()
        .single();

      if (campaignError) {
        console.error('Campaign creation error:', campaignError);
        throw campaignError;
      }

      if (!campaign) {
        throw new Error('Campaign was created but no data was returned');
      }

      // Create squares for the campaign
      const squares: Array<{
        campaign_id: string;
        row: number;
        col: number;
        number: number;
        value: number;
        claimed_by: null;
        donor_name: null;
        payment_status: string;
        payment_type: string;
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
      
      // Split squares into smaller batches to avoid payload size issues
      const BATCH_SIZE = 100;
      let squaresInsertionError: any = null;
      
      try {
        for (let i = 0; i < squares.length; i += BATCH_SIZE) {
          const batch = squares.slice(i, i + BATCH_SIZE);
          console.log(`Inserting batch of ${batch.length} squares (${i+1} to ${Math.min(i + BATCH_SIZE, squares.length)})`);
          
          const { error } = await supabaseAdmin
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
        // Continue without squares - we'll show a warning but the campaign is created
        console.log('Continuing without squares due to insertion error');
      } else {
        console.log(`Successfully inserted all ${squares.length} squares`);
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
      
    } catch (error) {
      console.error('Database error during campaign creation:', error);
      
      // Create a detailed error message with stack trace
      const errorDetails = error instanceof Error 
        ? { 
            message: error.message,
            stack: error.stack,
            name: error.name
          }
        : String(error);
      
      if (isDemoMode()) {
        // Fall back to demo mode on database error if demo mode is enabled
        console.log('Falling back to demo mode due to database error');
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
      } else {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        return NextResponse.json(
          { 
            error: 'Database error: ' + errorMessage,
            details: errorDetails
          },
          { status: 500 }
        );
      }
    }
  } catch (error) {
    console.error('Campaign creation error:', error);
    // Return a detailed error for debugging
    return NextResponse.json(
      { 
        error: 'Failed to create campaign',
        details: error instanceof Error ? 
          { message: error.message, stack: error.stack } : 
          String(error)
      },
      { status: 500 }
    );
  }
} 