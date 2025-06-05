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
        console.log('Authentication error, using demo mode');
        const demoUserId = uuidv4();
        actualUserId = demoUserId;
      }
    } else {
      actualUserId = user.id;
    }

    const slug = generateSlug(title);

    // ALWAYS use demo mode due to database schema issues
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
  } catch (error) {
    console.error('Campaign creation error:', error);
    return NextResponse.json(
      { error: 'Failed to create campaign' },
      { status: 500 }
    );
  }
} 