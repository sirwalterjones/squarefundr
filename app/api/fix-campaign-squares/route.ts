import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseClient';

function calculateSquarePrice(position: number, pricingType: string, priceData: any): number {
  switch (pricingType) {
    case 'fixed':
      return priceData.fixed || 0;
    
    case 'sequential':
      if (priceData.sequential) {
        return priceData.sequential.start + (position - 1) * priceData.sequential.increment;
      }
      return 0;
    
    case 'manual':
      if (priceData.manual) {
        const key = `${Math.floor((position - 1) / 10)},${(position - 1) % 10}`;
        return priceData.manual[key] || 0;
      }
      return 0;
    
    default:
      return 0;
  }
}

export async function POST(request: NextRequest) {
  try {
    const { campaignId } = await request.json();

    if (!campaignId) {
      return NextResponse.json({ error: 'Campaign ID required' }, { status: 400 });
    }

    // Get the campaign
    const { data: campaign, error: campaignError } = await supabaseAdmin
      .from('campaigns')
      .select('*')
      .eq('id', campaignId)
      .single();

    if (campaignError || !campaign) {
      return NextResponse.json({ error: 'Campaign not found' }, { status: 404 });
    }

    console.log('Found campaign:', campaign.title, `(${campaign.rows}x${campaign.columns})`);

    // Check existing squares
    const { data: existingSquares, error: existingError } = await supabaseAdmin
      .from('squares')
      .select('*')
      .eq('campaign_id', campaign.id);

    if (existingError) {
      console.error('Error checking squares:', existingError);
      return NextResponse.json({ error: 'Error checking squares' }, { status: 500 });
    }

    console.log('Existing squares:', existingSquares?.length || 0);

    if (existingSquares && existingSquares.length > 0) {
      return NextResponse.json({ 
        success: true, 
        message: 'Squares already exist',
        squareCount: existingSquares.length 
      });
    }

    // Create squares for the campaign
    const squares = [];
    for (let row = 0; row < campaign.rows; row++) {
      for (let col = 0; col < campaign.columns; col++) {
        const position = row * campaign.columns + col + 1;
        const price = calculateSquarePrice(position, campaign.pricing_type, campaign.price_data);
        
        squares.push({
          campaign_id: campaign.id,
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

    console.log(`Creating ${squares.length} squares...`);

    // Insert squares in batches using admin client
    const BATCH_SIZE = 100;
    let successCount = 0;
    let errorDetails = null;

    for (let i = 0; i < squares.length; i += BATCH_SIZE) {
      const batch = squares.slice(i, i + BATCH_SIZE);
      console.log(`Inserting batch ${Math.floor(i/BATCH_SIZE) + 1}/${Math.ceil(squares.length/BATCH_SIZE)}...`);

      const { data, error } = await supabaseAdmin
        .from('squares')
        .insert(batch)
        .select();

      if (error) {
        console.error('Error inserting squares:', error);
        errorDetails = error;
        break;
      } else {
        successCount += data?.length || 0;
      }
    }

    if (errorDetails) {
      return NextResponse.json({ 
        success: false,
        error: 'Failed to create squares',
        details: errorDetails,
        partialSuccess: successCount > 0,
        successCount
      }, { status: 500 });
    }

    console.log(`Successfully created ${successCount} squares`);

    return NextResponse.json({ 
      success: true,
      message: 'Squares created successfully',
      squareCount: successCount
    });

  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error },
      { status: 500 }
    );
  }
} 