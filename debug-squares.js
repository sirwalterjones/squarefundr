require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function debugSquares() {
  const campaigns = [
    'aa63f2ff-f2fa-48b8-979c-d6c0b1c91028', // Gracie's
    'a0949e86-c38e-467e-ad6a-1a27d62291ae'  // Ava and Ella
  ];
  
  for (const campaignId of campaigns) {
    console.log('\n='.repeat(60));
    
    const { data: campaign } = await supabase
      .from('campaigns')
      .select('*')
      .eq('id', campaignId)
      .single();
      
    console.log(`Campaign: ${campaign?.title}`);
    console.log(`Expected total squares: ${campaign?.total_squares || 100}`);
    
    const { data: allSquares } = await supabase
      .from('squares')
      .select('*')
      .eq('campaign_id', campaignId)
      .order('number');
      
    console.log(`Actual squares in database: ${allSquares?.length || 0}`);
    
    // Analyze square statuses
    const nullClaimed = allSquares?.filter(s => s.claimed_by === null) || [];
    const emptyClaimed = allSquares?.filter(s => s.claimed_by === '') || [];
    const realClaimed = allSquares?.filter(s => s.claimed_by && s.claimed_by !== '') || [];
    const tempClaimed = allSquares?.filter(s => s.claimed_by && s.claimed_by.startsWith('temp_')) || [];
    
    console.log(`\nSquare breakdown:`);
    console.log(`  NULL claimed_by: ${nullClaimed.length}`);
    console.log(`  Empty claimed_by: ${emptyClaimed.length}`);
    console.log(`  Real claimed_by: ${realClaimed.length}`);
    console.log(`  Temp claimed_by: ${tempClaimed.length}`);
    
    const totalAvailable = nullClaimed.length + emptyClaimed.length;
    console.log(`\nTOTAL AVAILABLE: ${totalAvailable}`);
    
    if (totalAvailable > 0) {
      const availableNumbers = [...nullClaimed, ...emptyClaimed]
        .map(s => s.number)
        .sort((a,b) => a-b)
        .slice(0, 10);
      console.log(`First 10 available squares: ${availableNumbers.join(', ')}`);
    }
    
    // Show some examples of claimed squares
    if (realClaimed.length > 0) {
      console.log(`\nSample claimed squares:`);
      realClaimed.slice(0, 5).forEach(s => {
        console.log(`  Square ${s.number}: claimed_by="${s.claimed_by}", payment_status="${s.payment_status}"`);
      });
    }
  }
}

debugSquares();
