require('dotenv').config({ path: '.env.local' });

/**
 * Fix existing PayPal donations that have empty square_ids
 * This script will find PayPal transactions with empty square_ids and try to:
 * 1. Find squares claimed by the donor email
 * 2. Update the transaction with the correct square_ids
 * 3. Mark squares as completed if they're still pending
 */

const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

console.log('Environment check:', {
  supabaseUrl: supabaseUrl ? 'Set' : 'Missing',
  supabaseServiceKey: supabaseServiceKey ? 'Set' : 'Missing'
});

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing required environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

async function fixPayPalDonations() {
  console.log('🔍 Finding PayPal transactions with empty square_ids...');

  // Get all PayPal transactions with empty or null square_ids
  const { data: brokenTransactions, error: transactionError } = await supabase
    .from('transactions')
    .select('*')
    .eq('payment_method', 'paypal')
    .or('square_ids.is.null,square_ids.eq.{}');

  if (transactionError) {
    console.error('❌ Error fetching transactions:', transactionError);
    return;
  }

  console.log(`📊 Found ${brokenTransactions?.length || 0} PayPal transactions with empty square_ids`);

  if (!brokenTransactions || brokenTransactions.length === 0) {
    console.log('✅ No broken transactions found!');
    return;
  }

  let fixedCount = 0;
  let failedCount = 0;

  for (const transaction of brokenTransactions) {
    console.log(`\n🔧 Processing transaction ${transaction.id}:`);
    console.log(`   Donor: ${transaction.donor_name} (${transaction.donor_email})`);
    console.log(`   Campaign: ${transaction.campaign_id}`);
    console.log(`   Total: $${transaction.total}`);
    console.log(`   Status: ${transaction.status}`);

    try {
      // Find squares claimed by this donor email in this campaign
      const { data: donorSquares, error: squareError } = await supabase
        .from('squares')
        .select('*')
        .eq('campaign_id', transaction.campaign_id)
        .ilike('claimed_by', transaction.donor_email)
        .eq('payment_type', 'paypal');

      if (squareError) {
        console.error(`   ❌ Error finding squares: ${squareError.message}`);
        failedCount++;
        continue;
      }

      console.log(`   📦 Found ${donorSquares?.length || 0} squares for this donor`);

      if (!donorSquares || donorSquares.length === 0) {
        // Try to find and assign available squares based on transaction total
        console.log(`   🔍 No squares found for donor, looking for available squares...`);
        
        const { data: availableSquares, error: availableError } = await supabase
          .from('squares')
          .select('*')
          .eq('campaign_id', transaction.campaign_id)
          .is('claimed_by', null)
          .order('number', { ascending: true });

        if (availableError) {
          console.error(`   ❌ Error finding available squares: ${availableError.message}`);
          failedCount++;
          continue;
        }

        if (!availableSquares || availableSquares.length === 0) {
          console.log(`   ❌ No available squares found in campaign`);
          failedCount++;
          continue;
        }

        // Select squares to match transaction total
        let selectedSquares = [];
        let currentTotal = 0;
        
        for (const square of availableSquares) {
          if (currentTotal < transaction.total) {
            selectedSquares.push(square);
            currentTotal += square.value;
            
            if (currentTotal >= transaction.total) {
              break;
            }
          }
        }

        if (selectedSquares.length === 0 || currentTotal < transaction.total) {
          console.log(`   ❌ Could not find enough squares to match transaction total`);
          failedCount++;
          continue;
        }

        console.log(`   ✅ Selected ${selectedSquares.length} squares (total: $${currentTotal})`);

        // Reserve these squares for the donor
        const squareIds = selectedSquares.map(s => s.id);
        
        const { error: reserveError } = await supabase
          .from('squares')
          .update({
            claimed_by: transaction.donor_email,
            donor_name: transaction.donor_name,
            payment_status: transaction.status === 'completed' ? 'completed' : 'pending',
            payment_type: 'paypal',
            claimed_at: new Date().toISOString(),
          })
          .in('id', squareIds)
          .is('claimed_by', null); // Only update if still available

        if (reserveError) {
          console.error(`   ❌ Error reserving squares: ${reserveError.message}`);
          failedCount++;
          continue;
        }

        // Update transaction with square_ids
        const { error: updateError } = await supabase
          .from('transactions')
          .update({ square_ids: squareIds })
          .eq('id', transaction.id);

        if (updateError) {
          console.error(`   ❌ Error updating transaction: ${updateError.message}`);
          failedCount++;
          continue;
        }

        console.log(`   ✅ Successfully fixed transaction by reserving ${selectedSquares.length} new squares`);
        fixedCount++;
        
      } else {
        // Update transaction with existing square_ids
        const squareIds = donorSquares.map(s => s.id);
        
        const { error: updateError } = await supabase
          .from('transactions')
          .update({ square_ids: squareIds })
          .eq('id', transaction.id);

        if (updateError) {
          console.error(`   ❌ Error updating transaction: ${updateError.message}`);
          failedCount++;
          continue;
        }

        // If transaction is completed but squares are still pending, mark them as completed
        if (transaction.status === 'completed') {
          const pendingSquares = donorSquares.filter(s => s.payment_status === 'pending');
          
          if (pendingSquares.length > 0) {
            console.log(`   🔄 Marking ${pendingSquares.length} squares as completed`);
            
            const { error: completeError } = await supabase
              .from('squares')
              .update({ 
                payment_status: 'completed',
                claimed_at: new Date().toISOString()
              })
              .in('id', pendingSquares.map(s => s.id));

            if (completeError) {
              console.error(`   ⚠️  Warning: Error completing squares: ${completeError.message}`);
            }
          }
        }

        console.log(`   ✅ Successfully fixed transaction with ${donorSquares.length} existing squares`);
        fixedCount++;
      }

    } catch (error) {
      console.error(`   ❌ Unexpected error: ${error.message}`);
      failedCount++;
    }
  }

  console.log(`\n📈 Summary:`);
  console.log(`   ✅ Fixed: ${fixedCount} transactions`);
  console.log(`   ❌ Failed: ${failedCount} transactions`);
  console.log(`   📊 Total: ${brokenTransactions.length} transactions processed`);
}

// Run the fix
fixPayPalDonations().catch(console.error);
