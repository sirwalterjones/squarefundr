import { redirect } from 'next/navigation';
import { createServerSupabaseClient } from '@/lib/supabaseServer';
import EditCampaignClient from './EditCampaignClient';

interface EditCampaignPageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function EditCampaignPage({ params }: EditCampaignPageProps) {
  const resolvedParams = await params;
  const supabase = await createServerSupabaseClient();

  // Check authentication
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  
  if (authError || !user) {
    redirect('/auth');
  }

  // Fetch the campaign
  const { data: campaign, error: campaignError } = await supabase
    .from('campaigns')
    .select('*')
    .eq('id', resolvedParams.id)
    .eq('user_id', user.id) // Ensure user owns this campaign
    .single();

  if (campaignError || !campaign) {
    redirect('/dashboard');
  }

  return <EditCampaignClient campaign={campaign} user={user} />;
} 