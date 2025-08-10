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
  focusPoint?: { x: number; y: number };
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
      focusPoint,
    } = body;

    console.log('Campaign update request:', {
      id: id,
      title,
      rows,
      columns,
      pricingType,
      isActive,
      focusPoint,
    });

    // Validate input
    if (!title || !imageUrl || !rows || !columns || !pricingType) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Check if user is admin
    const { data: userRole } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('role', 'admin')
      .single();

    const isAdmin = !!userRole;

    // Check if campaign exists - admins can edit any campaign, regular users only their own
    let campaignQuery = supabase
      .from('campaigns')
      .select('*')
      .eq('id', id);

    if (!isAdmin) {
      campaignQuery = campaignQuery.eq('user_id', user.id);
    }

    const { data: existingCampaign, error: fetchError } = await campaignQuery.single();

    if (fetchError || !existingCampaign) {
      console.error('Campaign not found or access denied:', fetchError);
      return NextResponse.json(
        { error: 'Campaign not found or access denied' },
        { status: 404 }
      );
    }

    // Update the campaign - admins can update any campaign, regular users only their own
    let updateQuery = supabase
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
        og_focus_point: focusPoint,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id);

    if (!isAdmin) {
      updateQuery = updateQuery.eq('user_id', user.id);
    }

    const { data: updatedCampaign, error: updateError } = await updateQuery
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
        publicUrl: `${request.nextUrl.origin}/fundraiser/${updatedCampaign.slug}`,
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