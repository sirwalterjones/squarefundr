require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function fixChristopherToSquare18() {
  console.log('🔧 Fixing Christopher Liga to square #18...');
  
  const campaignId = 'aa63f2ff-f2fa-48b8-979c-d6c0b1c91028';
  
  // Get square #18
  const { data: square18 } = await supabase
    .from('squares')
    .select('*')
    .eq('campaign_id', campaignId)
    .eq('number', 18)
    .single();
    
  if (!square18) {
    console.log('❌ Square #18 not found');
    return;
  }
  
  console.log(`Found square #18, current claimed_by: ${square18.claimed_by}`);
  
  // Release square #23 (incorrectly assigned)
  const { data: square23 } = await supabase
    .from('squares')
    .select('*')
    .eq('campaign_id', campaignId)
    .eq('number', 23)
    .single();
    
  if (square23?.claimed_by === 'Christopherliga68@gmail.com') {
    console.log('Releasing square #23...');
    await supabase
      .from('squares')
      .update({
        claimed_by: null,
        donor_name: null,
        payment_status: 'pending',
        payment_type: 'cash',
        claimed_at: null,
        updated_at: new Date().toISOString()
      })
      .eq('id', square23.id);
  }
  
  // Assign square #18 to Christopher
  console.log('Assigning square #18 to Christopher Liga...');
  await supabase
    .from('squares')
    .update({
      claimed_by: 'Christopherliga68@gmail.com',
      donor_name: 'Christopher Liga',
      payment_status: 'completed',
      payment_type: 'paypal',
      value: 27,
      price: 27,
      claimed_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    })
    .eq('id', square18.id);
    
  // Update transaction to point to square #18
  await supabase
    .from('transactions')
    .update({
      square_ids: [square18.id],
      total: 27
    })
    .eq('id', '13440556-ef4c-4430-8122-0e31d22cc5fa');
    
  console.log('✅ Christopher Liga now has square #18 for $27');
  
  // Verify the fix
  const { data: updatedSquare } = await supabase
    .from('squares')
    .select('number, claimed_by, value')
    .eq('id', square18.id)
    .single();
    
  console.log(`Verification: Square #${updatedSquare?.number} claimed by ${updatedSquare?.claimed_by} for $${updatedSquare?.value}`);
}

fixChristopherToSquare18();
