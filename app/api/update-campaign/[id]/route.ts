import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabaseServer';

interface UpdateCampaignData {
  title: string;
  description?: string;
  imageUrl: string;
  rows: number;
  columns: number;
  pricingType: 'fixed' | 'sequential' | 'manual';
  priceData: any;
  isActive: boolean;
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params;
    const { id } = resolvedParams;
    const supabase = await createServerSupabaseClient();

    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body: UpdateCampaignData = await request.json();
    const {
      title,
      description,
      imageUrl,
      rows,
      columns,
      pricingType,
      priceData,
      isActive,
    } = body;

    console.log('Campaign update request:', {
      id: id,
      title,
      rows,
      columns,
      pricingType,
      isActive,
    });

    // Validate input
    if (!title || !imageUrl || !rows || !columns || !pricingType) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // First check if campaign exists and user owns it
    const { data: existingCampaign, error: fetchError } = await supabase
      .from('campaigns')
      .select('*')
      .eq('id', id)
      .eq('user_id', user.id)
      .single();

    if (fetchError || !existingCampaign) {
      console.error('Campaign not found or access denied:', fetchError);
      return NextResponse.json(
        { error: 'Campaign not found or access denied' },
        { status: 404 }
      );
    }

    // Update the campaign
    const { data: updatedCampaign, error: updateError } = await supabase
      .from('campaigns')
      .update({
        title,
        description,
        image_url: imageUrl,
        rows,
        columns,
        total_squares: rows * columns,
        pricing_type: pricingType,
        price_data: priceData,
        is_active: isActive,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .eq('user_id', user.id)
      .select()
      .single();

    if (updateError) {
      console.error('Campaign update error:', updateError);
      return NextResponse.json(
        { error: 'Failed to update campaign' },
        { status: 500 }
      );
    }

    console.log('Campaign updated successfully:', updatedCampaign.id);

    return NextResponse.json({
      success: true,
      campaign: {
        id: updatedCampaign.id,
        title: updatedCampaign.title,
        slug: updatedCampaign.slug,
        publicUrl: `/fundraiser/${updatedCampaign.slug}`,
      },
    });

  } catch (error) {
    console.error('Campaign update error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 