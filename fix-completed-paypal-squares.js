require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

console.log('Environment check:', {
  supabaseUrl: supabaseUrl ? 'Set' : 'Missing',
  supabaseServiceKey: supabaseServiceKey ? 'Set' : 'Missing'
});

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing required environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function fixCompletedPayPalSquares() {
  try {
    console.log('🔍 Finding completed PayPal transactions...');
    
    // Find all PayPal transactions that have square_ids (regardless of status for now)
    const { data: transactions, error: transactionError } = await supabase
      .from('transactions')
      .select('*')
      .eq('payment_method', 'paypal')
      .not('square_ids', 'is', null)
      .neq('square_ids', '{}');

    if (transactionError) {
      console.error('❌ Error fetching transactions:', transactionError);
      return;
    }

    console.log(`📊 Found ${transactions?.length || 0} PayPal transactions with square_ids`);

    let fixedCount = 0;
    let alreadyCorrectCount = 0;
    let errorCount = 0;

    for (const transaction of transactions || []) {
      console.log(`\n🔧 Processing transaction ${transaction.id}:`);
      console.log(`   Donor: ${transaction.donor_name} (${transaction.donor_email})`);
      console.log(`   Campaign: ${transaction.campaign_id}`);
      console.log(`   Total: $${transaction.total}`);
      console.log(`   Status: ${transaction.status}`);
      console.log(`   Square IDs: ${JSON.stringify(transaction.square_ids)}`);

      if (!transaction.square_ids || transaction.square_ids.length === 0) {
        console.log('   ⚠️ No square_ids found, skipping...');
        continue;
      }

      // Get the actual squares from the database
      const { data: squares, error: squareError } = await supabase
        .from('squares')
        .select('*')
        .in('id', transaction.square_ids);

      if (squareError) {
        console.log(`   ❌ Error fetching squares: ${squareError.message}`);
        errorCount++;
        continue;
      }

      console.log(`   📦 Found ${squares?.length || 0} squares in database`);

      // Check if squares need to be fixed
      const squaresToFix = squares?.filter(square => 
        square.payment_status !== 'completed' || 
        !square.claimed_by || 
        square.claimed_by.startsWith('temp_')
      ) || [];

      if (squaresToFix.length === 0) {
        console.log('   ✅ All squares already correctly marked as completed');
        alreadyCorrectCount++;
        continue;
      }

      console.log(`   🔧 Need to fix ${squaresToFix.length} squares:`);
      squaresToFix.forEach(square => {
        console.log(`      Square ${square.number}: status=${square.payment_status}, claimed_by=${square.claimed_by}`);
      });

      // Update the squares to completed status
      const { error: updateError } = await supabase
        .from('squares')
        .update({
          payment_status: 'completed',
          claimed_by: transaction.donor_email,
          updated_at: new Date().toISOString()
        })
        .in('id', squaresToFix.map(s => s.id));

      if (updateError) {
        console.log(`   ❌ Error updating squares: ${updateError.message}`);
        errorCount++;
      } else {
        console.log(`   ✅ Successfully updated ${squaresToFix.length} squares to completed status`);
        fixedCount++;
      }
    }

    console.log('\n📈 Summary:');
    console.log(`   ✅ Fixed: ${fixedCount} transactions`);
    console.log(`   ✅ Already correct: ${alreadyCorrectCount} transactions`);
    console.log(`   ❌ Errors: ${errorCount} transactions`);
    console.log(`   📊 Total: ${transactions?.length || 0} transactions processed`);

  } catch (error) {
    console.error('❌ Script error:', error);
  }
}

fixCompletedPayPalSquares();
