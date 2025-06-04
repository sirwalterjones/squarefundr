import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabaseServer';
import { SelectedSquare } from '@/types';
import { v4 as uuidv4 } from 'uuid';

export async function POST(request: NextRequest) {
  try {
    const { campaignId, squares, donorName, donorEmail, anonymous } = await request.json();

    if (!campaignId || !squares || squares.length === 0 || !donorName) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const supabase = await createServerSupabaseClient();

    // Get campaign details
    const { data: campaign, error: campaignError } = await supabase
      .from('campaigns')
      .select('*')
      .eq('id', campaignId)
      .single();

    if (campaignError || !campaign) {
      return NextResponse.json({ error: 'Campaign not found' }, { status: 404 });
    }

    // Check if squares are still available
    const squareKeys = squares.map((s: SelectedSquare) => `${s.row},${s.column}`);
    const { data: existingSquares, error: squareError } = await supabase
      .from('squares')
      .select('*')
      .eq('campaign_id', campaignId)
      .in('row', squares.map((s: SelectedSquare) => s.row))
      .in('column', squares.map((s: SelectedSquare) => s.column));

    if (squareError) {
      return NextResponse.json({ error: 'Error checking square availability' }, { status: 500 });
    }

    // Check if any squares are already claimed
    const unavailableSquares = existingSquares?.filter(square => 
      square.claimed_by && squareKeys.includes(`${square.row},${square.column}`)
    );

    if (unavailableSquares && unavailableSquares.length > 0) {
      return NextResponse.json({ 
        error: 'Some squares are no longer available' 
      }, { status: 409 });
    }

    // Calculate total amount
    const totalAmount = squares.reduce((sum: number, square: SelectedSquare) => sum + square.value, 0);

    // Create transaction record
    const transactionId = uuidv4();
    const { error: transactionError } = await supabase
      .from('transactions')
      .insert({
        id: transactionId,
        campaign_id: campaignId,
        square_ids: squareKeys,
        total: totalAmount,
        payment_method: 'cash',
        donor_email: donorEmail || null,
        donor_name: anonymous ? null : donorName,
        status: 'pending',
        timestamp: new Date().toISOString(),
      });

    if (transactionError) {
      return NextResponse.json({ error: 'Failed to create transaction' }, { status: 500 });
    }

    // Update squares to mark them as claimed
    const squareUpdates = squares.map((square: SelectedSquare) => ({
      campaign_id: campaignId,
      row: square.row,
      column: square.column,
      claimed_by: donorEmail || 'anonymous',
      donor_name: anonymous ? null : donorName,
      payment_status: 'pending' as const,
      payment_type: 'cash' as const,
      claimed_at: new Date().toISOString(),
    }));

    for (const update of squareUpdates) {
      const { error: updateError } = await supabase
        .from('squares')
        .update({
          claimed_by: update.claimed_by,
          donor_name: update.donor_name,
          payment_status: update.payment_status,
          payment_type: update.payment_type,
          claimed_at: update.claimed_at,
        })
        .eq('campaign_id', update.campaign_id)
        .eq('row', update.row)
        .eq('column', update.column);

      if (updateError) {
        console.error('Error updating square:', updateError);
        // Continue with other squares even if one fails
      }
    }

    return NextResponse.json({ 
      success: true, 
      transactionId,
      message: 'Squares claimed successfully. Please arrange payment with the campaign organizer.' 
    });
  } catch (error) {
    console.error('Cash claim error:', error);
    return NextResponse.json(
      { error: 'Failed to claim squares' },
      { status: 500 }
    );
  }
} 