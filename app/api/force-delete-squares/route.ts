import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseClient';

export async function POST(request: NextRequest) {
  try {
    const { campaignId } = await request.json();

    if (!campaignId) {
      return NextResponse.json({ error: 'Campaign ID required' }, { status: 400 });
    }

    // First, try to get all squares for this campaign to see what exists
    const { data: existingSquares, error: fetchError } = await supabaseAdmin
      .from('squares')
      .select('*')
      .eq('campaign_id', campaignId);

    console.log('Existing squares before delete:', existingSquares?.length || 0);
    if (existingSquares && existingSquares.length > 0) {
      console.log('Sample square:', existingSquares[0]);
    }

    // Delete all squares for this campaign using multiple approaches
    const { error: deleteError } = await supabaseAdmin
      .from('squares')
      .delete()
      .eq('campaign_id', campaignId);

    if (deleteError) {
      console.error('Error deleting squares:', deleteError);
      return NextResponse.json({ 
        error: 'Failed to delete squares',
        details: deleteError,
        existingCount: existingSquares?.length || 0
      }, { status: 500 });
    }

    // Verify deletion
    const { data: remainingSquares, error: verifyError } = await supabaseAdmin
      .from('squares')
      .select('*')
      .eq('campaign_id', campaignId);

    console.log('Remaining squares after delete:', remainingSquares?.length || 0);

    return NextResponse.json({ 
      success: true,
      message: 'Squares deleted successfully',
      deletedCount: existingSquares?.length || 0,
      remainingCount: remainingSquares?.length || 0
    });

  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error },
      { status: 500 }
    );
  }
} 