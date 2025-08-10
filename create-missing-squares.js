require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function createMissingSquares() {
  console.log('🔧 Creating missing squares for campaigns...');
  
  const campaigns = [
    { id: 'aa63f2ff-f2fa-48b8-979c-d6c0b1c91028', expected: 50 }, // Gracie's
    { id: 'a0949e86-c38e-467e-ad6a-1a27d62291ae', expected: 42 }  // Ava and Ella
  ];
  
  for (const { id: campaignId, expected } of campaigns) {
    const { data: campaign } = await supabase
      .from('campaigns')
      .select('*')
      .eq('id', campaignId)
      .single();
      
    console.log(`\n📋 Campaign: ${campaign?.title}`);
    console.log(`Expected squares: ${expected}`);
    
    // Check existing squares
    const { data: existingSquares } = await supabase
      .from('squares')
      .select('number')
      .eq('campaign_id', campaignId)
      .order('number');
      
    const existingNumbers = new Set(existingSquares?.map(s => s.number) || []);
    console.log(`Existing squares: ${existingNumbers.size}`);
    
    // Calculate grid dimensions
    const gridSize = Math.ceil(Math.sqrt(expected));
    const squaresToCreate = [];
    
    let number = 1;
    for (let row = 0; row < gridSize; row++) {
      for (let col = 0; col < gridSize; col++) {
        if (number <= expected && !existingNumbers.has(number)) {
          squaresToCreate.push({
            campaign_id: campaignId,
            row: row,
            col: col,
            row_num: row,
            col_num: col,
            number: number,
            value: campaign?.price_data?.fixed || 5, // Default $5
            price: campaign?.price_data?.fixed || 5, // Default $5
            payment_status: 'pending', // Use existing valid status
            payment_type: 'cash', // Default, will be updated when claimed
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          });
        }
        number++;
      }
    }
    
    console.log(`Creating ${squaresToCreate.length} missing squares...`);
    
    if (squaresToCreate.length > 0) {
      const { error } = await supabase
        .from('squares')
        .insert(squaresToCreate);
        
      if (error) {
        console.log(`❌ Error creating squares: ${error.message}`);
      } else {
        console.log(`✅ Created ${squaresToCreate.length} squares`);
        
        // Now assign squares to the paid customers
        console.log(`\n💰 Assigning squares to paid customers...`);
        
        const { data: paidTransactions } = await supabase
          .from('transactions')
          .select('*')
          .eq('campaign_id', campaignId)
          .eq('payment_method', 'paypal')
          .eq('status', 'completed')
          .or('square_ids.is.null,square_ids.eq.{}');
          
        for (const txn of paidTransactions || []) {
          console.log(`Assigning squares to ${txn.donor_name} ($${txn.total})`);
          
          // Get available squares for this campaign
          const { data: availableSquares } = await supabase
            .from('squares')
            .select('*')
            .eq('campaign_id', campaignId)
            .or('claimed_by.is.null,claimed_by.eq.')
            .order('number')
            .limit(10); // Max 10 squares per transaction
            
          if (availableSquares && availableSquares.length > 0) {
            const squarePrice = campaign?.price_data?.fixed || 5;
            const squaresNeeded = Math.min(
              Math.floor(txn.total / squarePrice),
              availableSquares.length
            );
            
            const squaresToAssign = availableSquares.slice(0, squaresNeeded);
            
            // Update squares
            const { error: updateError } = await supabase
              .from('squares')
              .update({
                claimed_by: txn.donor_email,
                donor_name: txn.donor_name,
                payment_status: 'completed',
                payment_type: 'paypal',
                claimed_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
              })
              .in('id', squaresToAssign.map(s => s.id));
              
            if (updateError) {
              console.log(`  ❌ Error updating squares: ${updateError.message}`);
            } else {
              // Update transaction with square IDs
              const { error: txnError } = await supabase
                .from('transactions')
                .update({ square_ids: squaresToAssign.map(s => s.id) })
                .eq('id', txn.id);
                
              if (txnError) {
                console.log(`  ❌ Error updating transaction: ${txnError.message}`);
              } else {
                console.log(`  ✅ Assigned ${squaresToAssign.length} squares (${squaresToAssign.map(s => s.number).join(', ')})`);
              }
            }
          }
        }
      }
    }
  }
}

createMissingSquares();
