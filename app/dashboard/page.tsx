import { redirect } from 'next/navigation';
import { createServerSupabaseClient } from '@/lib/supabaseServer';
import { isDemoMode } from '@/lib/supabaseClient';
import DashboardClient from './DashboardClient';

export default async function DashboardPage() {
  const supabase = await createServerSupabaseClient();

  // Handle demo mode
  if (isDemoMode()) {
    // In demo mode, create a mock user and campaigns
    const mockUser = {
      id: 'demo-user-' + Date.now(),
      email: 'demo@example.com',
      created_at: new Date().toISOString(),
    };

    const mockCampaigns = [
      {
        id: 'demo-campaign-1',
        user_id: mockUser.id,
        title: 'Demo Animal Shelter Fundraiser',
        description: 'Help us raise funds for our local animal shelter',
        image_url: 'https://images.unsplash.com/photo-1601758228041-f3b2795255f1?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&q=80',
        slug: 'demo-animal-shelter',
        rows: 10,
        columns: 10,
        total_squares: 100,
        pricing_type: 'fixed' as const,
        price_data: { fixed: 10 },
        public_url: '/fundraiser/demo-animal-shelter',
        paid_to_admin: false,
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        stats: {
          totalSquares: 100,
          claimedSquares: 25,
          completedSquares: 20,
          totalRaised: 200,
          progressPercentage: 25,
        }
      },
      {
        id: 'demo-campaign-2',
        user_id: mockUser.id,
        title: 'Team Championship Fund',
        description: 'Support our team on the road to championships',
        image_url: 'https://images.unsplash.com/photo-1579952363873-27d3bfad9c0d?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&q=80',
        slug: 'team-championship-fund',
        rows: 5,
        columns: 10,
        total_squares: 50,
        pricing_type: 'sequential' as const,
        price_data: { sequential: { start: 5, increment: 2 } },
        public_url: '/fundraiser/team-championship-fund',
        paid_to_admin: false,
        is_active: true,
        created_at: new Date(Date.now() - 86400000).toISOString(), // 1 day ago
        updated_at: new Date(Date.now() - 86400000).toISOString(),
        stats: {
          totalSquares: 50,
          claimedSquares: 12,
          completedSquares: 10,
          totalRaised: 150,
          progressPercentage: 24,
        }
      }
    ];

    return <DashboardClient campaigns={mockCampaigns} user={mockUser as any} />;
  }

  // Check authentication
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  
  if (authError || !user) {
    redirect('/auth');
  }

  // Fetch user's campaigns
  const { data: campaigns, error: campaignError } = await supabase
    .from('campaigns')
    .select(`
      *,
      squares:squares(count)
    `)
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  if (campaignError) {
    console.error('Error fetching campaigns:', campaignError);
  }

  // Fetch campaign statistics
  const campaignStats = await Promise.all(
    (campaigns || []).map(async (campaign) => {
      const { data: squares } = await supabase
        .from('squares')
        .select('*')
        .eq('campaign_id', campaign.id);

      const totalSquares = squares?.length || 0;
      const claimedSquares = squares?.filter(s => s.claimed_by).length || 0;
      const completedSquares = squares?.filter(s => s.payment_status === 'completed').length || 0;
      const totalRaised = squares
        ?.filter(s => s.payment_status === 'completed')
        .reduce((sum, s) => sum + s.value, 0) || 0;

      return {
        ...campaign,
        stats: {
          totalSquares,
          claimedSquares,
          completedSquares,
          totalRaised,
          progressPercentage: totalSquares > 0 ? (claimedSquares / totalSquares) * 100 : 0,
        }
      };
    })
  );

  return <DashboardClient campaigns={campaignStats} user={user} />;
} 