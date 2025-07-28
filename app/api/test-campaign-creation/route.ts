import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabaseServer';
import { supabaseAdmin } from '@/lib/supabaseClient';
import { v4 as uuidv4 } from 'uuid';

interface Square {
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
}

export async function GET(request: NextRequest) {
  try {
    console.log('Testing campaign creation API endpoint');
    
    // Check if supabaseAdmin is valid
    if (!supabaseAdmin) {
      console.error('ERROR: supabaseAdmin is not initialized properly');
      return NextResponse.json(
        { error: 'Server configuration error: Database client not initialized' },
        { status: 500 }
      );
    }

    // Create a test campaign
    const testCampaign = {
      user_id: uuidv4(),
      title: 'Test Campaign ' + Date.now(),
      description: 'Test campaign created by API test',
      slug: 'test-campaign-api-' + Date.now(),
      image_url: 'https://via.placeholder.com/300',
      rows: 5,
      columns: 5,
      pricing_type: 'fixed' as const,
      price_data: { fixed: 10 },
      is_active: true,
      total_squares: 25 // rows * columns
    };
    
    console.log('Test campaign data:', testCampaign);
    
    // Insert the campaign
    const { data: campaign, error: campaignError } = await supabaseAdmin
      .from('campaigns')
      .insert(testCampaign)
      .select()
      .single();
    
    if (campaignError) {
      console.error('Error creating test campaign:', campaignError);
      return NextResponse.json(
        { 
          success: false, 
          error: campaignError.message, 
          details: campaignError 
        },
        { status: 500 }
      );
    }

    // Create squares for the campaign
    const squares: Square[] = [];
    for (let row = 0; row < testCampaign.rows; row++) {
      for (let col = 0; col < testCampaign.columns; col++) {
        const position = row * testCampaign.columns + col + 1;
        squares.push({
          campaign_id: campaign.id,
          row,
          col,
          number: position,
          value: testCampaign.price_data.fixed,
          claimed_by: null,
          donor_name: null,
          payment_status: 'pending',
          payment_type: 'stripe',
          claimed_at: null
        });
      }
    }
    
    // Insert squares in batches
    const BATCH_SIZE = 25;
    let squaresInsertionError: any = null;
    
    try {
      for (let i = 0; i < squares.length; i += BATCH_SIZE) {
        const batch = squares.slice(i, i + BATCH_SIZE);
        console.log(`Inserting batch of ${batch.length} squares`);
        
        const { error } = await supabaseAdmin
          .from('squares')
          .insert(batch);
          
        if (error) {
          console.error('Error inserting squares batch:', error);
          squaresInsertionError = error;
          break;
        }
      }
    } catch (error) {
      console.error('Unexpected error during squares insertion:', error);
      squaresInsertionError = error;
    }

    // Clean up the test campaign (delete it after creation)
    console.log('Cleaning up test campaign...');
    const { error: deleteError } = await supabaseAdmin
      .from('campaigns')
      .delete()
      .eq('id', campaign.id);
    
    if (deleteError) {
      console.error('Error deleting test campaign:', deleteError);
    } else {
      console.log('Successfully deleted test campaign');
    }

    // Return the test results
    return NextResponse.json({
      success: true,
      campaignCreated: !!campaign,
      squaresCreated: !squaresInsertionError,
      campaign,
      squaresError: squaresInsertionError ? 
        (squaresInsertionError.message || 'Unknown error') : null,
      message: 'Test completed successfully'
    });
  } catch (error) {
    console.error('Unexpected error during test:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error',
        details: error instanceof Error ? 
          { message: error.message, stack: error.stack } : 
          String(error)
      },
      { status: 500 }
    );
  }
} 