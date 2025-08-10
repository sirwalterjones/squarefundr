require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function fixGraciesFinal() {
  console.log('🔧 Creating missing squares for Gracies campaign...');
  
  const campaignId = 'aa63f2ff-f2fa-48b8-979c-d6c0b1c91028';
  
  // Get existing squares  
  const { data: existing } = await supabase
    .from('squares')
    .select('number, row, col')
    .eq('campaign_id', campaignId);
    
  console.log(`Found ${existing?.length || 0} existing squares`);
  
  const existingNumbers = new Set(existing?.map(s => s.number) || []);
  
  // Create squares 1-50 that don't exist, using unique positions
  const squaresToCreate = [];
  let usedPositions = new Set();
  
  // Record existing positions
  existing?.forEach(sq => {
    usedPositions.add(`${sq.row},${sq.col}`);
  });
  
  for (let number = 1; number <= 50; number++) {
    if (!existingNumbers.has(number)) {
      // Find next available position
      let row = Math.floor((number - 1) / 8);
      let col = (number - 1) % 8;
      
      // Adjust if position is taken
      while (usedPositions.has(`${row},${col}`)) {
        col++;
        if (col >= 8) {
          col = 0;
          row++;
        }
      }
      
      squaresToCreate.push({
        campaign_id: campaignId,
        row: row,
        col: col,
        row_num: row,
        col_num: col,
        number: number,
        value: 5,
        price: 5,
        payment_status: 'pending',
        payment_type: 'cash',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });
      
      usedPositions.add(`${row},${col}`);
    }
  }
  
  console.log(`Creating ${squaresToCreate.length} missing squares...`);
  
  if (squaresToCreate.length > 0) {
    const { error } = await supabase
      .from('squares')
      .insert(squaresToCreate);
      
    if (error) {
      console.log('❌ Error:', error.message);
      return;
    }
    
    console.log(`✅ Created ${squaresToCreate.length} squares`);
  }
  
  // Now assign squares to Christopher Liga's transactions
  console.log('\n💰 Assigning squares to Christopher Liga...');
  
  const { data: availableSquares } = await supabase
    .from('squares')
    .select('*')
    .eq('campaign_id', campaignId)
    .is('claimed_by', null)
    .order('number')
    .limit(15); // 3 transactions × 5 squares each
    
  console.log(`Found ${availableSquares?.length || 0} available squares`);
  
  if (availableSquares && availableSquares.length >= 15) {
    const transactions = [
      { id: '13440556-ef4c-4430-8122-0e31d22cc5fa', email: 'Christopherliga68@gmail.com' },
      { id: 'b6114eec-376a-4dbc-95fc-2f979ed87541', email: 'lakevillagedeli@gmail.com' },
      { id: '347f733a-90ab-4ea8-82d9-868828fcfe5e', email: 'Christopherliga68@gmail.com' }
    ];
    
    for (let i = 0; i < transactions.length; i++) {
      const txn = transactions[i];
      const squares = availableSquares.slice(i * 5, (i + 1) * 5);
      
      if (squares.length === 5) {
        // Update squares
        const { error: updateError } = await supabase
          .from('squares')
          .update({
            claimed_by: txn.email,
            donor_name: 'Christopher Liga',
            payment_status: 'completed',
            payment_type: 'paypal',
            claimed_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .in('id', squares.map(s => s.id));
          
        if (updateError) {
          console.log(`❌ Error updating squares: ${updateError.message}`);
          continue;
        }
        
        // Update transaction
        const { error: txnError } = await supabase
          .from('transactions')
          .update({ 
            square_ids: squares.map(s => s.id),
            status: 'completed'
          })
          .eq('id', txn.id);
          
        if (txnError) {
          console.log(`❌ Error updating transaction: ${txnError.message}`);
        } else {
          console.log(`✅ Assigned squares ${squares.map(s => s.number).join(',')} to ${txn.email}`);
        }
      }
    }
  }
  
  console.log('\n🎉 All done! Paid customers should now have their squares.');
}

fixGraciesFinal();
