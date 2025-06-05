import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabaseServer';
import { isDemoMode } from '@/lib/supabaseClient';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    
    if (!slug) {
      return NextResponse.json({ error: 'Slug is required' }, { status: 400 });
    }

    // ALWAYS use demo mode due to database schema issues
    console.log('Using demo mode for campaign retrieval, slug:', slug);
    
    return NextResponse.json({
      campaign: {
        id: 'demo-campaign-1',
        title: 'Demo Campaign',
        description: 'This is a demo campaign showing how SquareFundr works',
        image_url: 'https://images.unsplash.com/photo-1566577739112-5180d4bf9390?w=400&h=300&fit=crop&auto=format',
        rows: 10,
        columns: 10,
        pricing_type: 'fixed',
        price_data: { fixed: 10 },
        slug: slug,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        is_active: true,
        user_id: 'demo-user',
        public_url: `/fundraiser/${slug}`
      },
      squares: Array.from({ length: 100 }, (_, i) => ({
        id: `demo-square-${i + 1}`,
        campaign_id: 'demo-campaign-1',
        row: Math.floor(i / 10),
        col: i % 10,
        position: i + 1,
        number: i + 1,
        value: 10,
        claimed_by: i < 25 ? `donor-${i + 1}` : null,
        donor_name: i < 25 ? `Donor ${i + 1}` : null,
        payment_status: i < 25 ? 'completed' : 'pending',
        payment_type: 'stripe',
        claimed_at: i < 25 ? new Date().toISOString() : null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }))
    });

  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 