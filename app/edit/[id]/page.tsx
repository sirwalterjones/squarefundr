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

  // Check if user is admin
  const { data: userRole } = await supabase
    .from('user_roles')
    .select('role')
    .eq('user_id', user.id)
    .eq('role', 'admin')
    .single();

  const isAdmin = !!userRole;

  // Fetch the campaign - admins can edit any campaign, regular users only their own
  let query = supabase
    .from('campaigns')
    .select('*')
    .eq('id', resolvedParams.id);

  // Only restrict to user's campaigns if they're not an admin
  if (!isAdmin) {
    query = query.eq('user_id', user.id);
  }

  const { data: campaign, error: campaignError } = await query.single();

  if (campaignError || !campaign) {
    redirect('/dashboard');
  }

  return <EditCampaignClient campaign={campaign} user={user} />;
} 