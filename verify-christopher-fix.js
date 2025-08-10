require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function verifyChristopherFix() {
  console.log('✅ Verifying Christopher Liga fix...');
  
  const campaignId = 'aa63f2ff-f2fa-48b8-979c-d6c0b1c91028';
  
  // Check remaining Christopher transactions
  const { data: transactions } = await supabase
    .from('transactions')
    .select('*')
    .eq('campaign_id', campaignId)
    .or('donor_email.eq.Christopherliga68@gmail.com,donor_email.eq.lakevillagedeli@gmail.com');
    
  console.log(`Christopher Liga transactions: ${transactions?.length || 0}`);
  
  for (const txn of transactions || []) {
    console.log(`\n💳 Transaction: ${txn.id}`);
    console.log(`   Email: ${txn.donor_email}`);
    console.log(`   Total: $${txn.total}`);
    console.log(`   Status: ${txn.status}`);
    console.log(`   Square IDs: ${JSON.stringify(txn.square_ids)}`);
    
    if (txn.square_ids && txn.square_ids.length > 0) {
      const { data: squares } = await supabase
        .from('squares')
        .select('number, value, claimed_by')
        .in('id', txn.square_ids);
        
      console.log(`   Squares: ${squares?.map(s => `#${s.number}($${s.value})`).join(', ')}`);
    }
  }
  
  // Check total claimed squares in campaign
  const { data: claimedSquares } = await supabase
    .from('squares')
    .select('number, claimed_by')
    .eq('campaign_id', campaignId)
    .not('claimed_by', 'is', null)
    .neq('claimed_by', '')
    .order('number');
    
  console.log(`\n📊 Total claimed squares: ${claimedSquares?.length || 0}`);
  console.log(`Claimed square numbers: ${claimedSquares?.map(s => s.number).join(', ')}`);
  
  // This should match the 22 squares shown on the live site
  if (claimedSquares?.length === 22) {
    console.log('✅ PERFECT! Matches the 22 squares shown on live site');
  } else {
    console.log(`❌ Mismatch: Live site shows 22, database shows ${claimedSquares?.length || 0}`);
  }
}

verifyChristopherFix();
