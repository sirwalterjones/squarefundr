require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function fixBrokenPendingPayPal() {
  try {
    console.log('🔍 Finding broken pending PayPal transactions...');
    
    // Find pending PayPal transactions with empty square_ids
    const { data: brokenTransactions } = await supabase
      .from('transactions')
      .select('*')
      .eq('payment_method', 'paypal')
      .eq('status', 'pending')
      .or('square_ids.is.null,square_ids.eq.{}');

    console.log(`📊 Found ${brokenTransactions?.length || 0} broken pending PayPal transactions`);

    for (const txn of brokenTransactions || []) {
      console.log(`\n🔧 Processing broken transaction ${txn.id}:`);
      console.log(`   Donor: ${txn.donor_name} (${txn.donor_email})`);
      console.log(`   Campaign: ${txn.campaign_id}`);
      console.log(`   Total: $${txn.total}`);
      console.log(`   Created: ${new Date(txn.timestamp).toLocaleDateString()}`);

      // Calculate how many squares they should have based on total amount
      const { data: campaign } = await supabase
        .from('campaigns')
        .select('*')
        .eq('id', txn.campaign_id)
        .single();

      if (!campaign) {
        console.log('   ❌ Campaign not found, deleting transaction...');
        await supabase.from('transactions').delete().eq('id', txn.id);
        continue;
      }

      console.log(`   Campaign: ${campaign.title}`);

      // Check if campaign has available squares
      const { data: availableSquares } = await supabase
        .from('squares')
        .select('*')
        .eq('campaign_id', txn.campaign_id)
        .or('claimed_by.is.null,claimed_by.eq.')
        .order('number');

      console.log(`   Available squares: ${availableSquares?.length || 0}`);

      if (!availableSquares || availableSquares.length === 0) {
        console.log('   ❌ Campaign is sold out, deleting broken transaction...');
        const { error } = await supabase.from('transactions').delete().eq('id', txn.id);
        if (error) {
          console.log(`   ❌ Error deleting: ${error.message}`);
        } else {
          console.log('   ✅ Deleted broken transaction from sold-out campaign');
        }
        continue;
      }

      // For now, just delete these broken transactions since they're incomplete
      // The user would need to try the payment again properly
      console.log('   🗑️ Deleting incomplete PayPal transaction (user needs to retry)...');
      const { error } = await supabase.from('transactions').delete().eq('id', txn.id);
      if (error) {
        console.log(`   ❌ Error deleting: ${error.message}`);
      } else {
        console.log('   ✅ Deleted incomplete transaction');
      }
    }

    console.log('\n📈 Summary: Cleaned up broken pending PayPal transactions');
    console.log('   Users with deleted transactions will need to retry their payments');

  } catch (error) {
    console.error('❌ Script error:', error);
  }
}

fixBrokenPendingPayPal();
