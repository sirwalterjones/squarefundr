import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabaseServer';
import { stripe } from '@/lib/stripe';
import { SelectedSquare } from '@/types';

export async function POST(request: NextRequest) {
  try {
    const { campaignId, squares, donorEmail, donorName, anonymous } = await request.json();

    if (!campaignId || !squares || squares.length === 0) {
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

    // Calculate total amount
    const totalAmount = squares.reduce((sum: number, square: SelectedSquare) => sum + square.value, 0);

    // Create checkout session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: `${campaign.title} - Square Donation`,
              description: `Donation for ${squares.length} square(s)`,
            },
            unit_amount: Math.round(totalAmount * 100), // Convert to cents
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: `${request.nextUrl.origin}/fundraiser/${campaign.slug}?success=true`,
      cancel_url: `${request.nextUrl.origin}/fundraiser/${campaign.slug}?canceled=true`,
      customer_email: donorEmail,
      metadata: {
        campaign_id: campaignId,
        square_ids: JSON.stringify(squares.map((s: SelectedSquare) => `${s.row},${s.column}`)),
        donor_name: donorName || '',
        anonymous: anonymous ? 'true' : 'false',
      },
    });

    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error('Checkout session creation error:', error);
    return NextResponse.json(
      { error: 'Failed to create checkout session' },
      { status: 500 }
    );
  }
} 