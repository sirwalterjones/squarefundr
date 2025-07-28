import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseClient';

export async function POST(request: NextRequest) {
  try {
    const { campaignId } = await request.json();

    if (!campaignId) {
      return NextResponse.json({ error: 'Campaign ID required' }, { status: 400 });
    }

    // Delete all squares for this campaign
    const { error } = await supabaseAdmin
      .from('squares')
      .delete()
      .eq('campaign_id', campaignId);

    if (error) {
      console.error('Error deleting squares:', error);
      return NextResponse.json({ error: 'Failed to delete squares' }, { status: 500 });
    }

    return NextResponse.json({ 
      success: true,
      message: 'Squares deleted successfully'
    });

  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 