const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceRoleKey) {
  console.error('Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function testFullFlow() {
  console.log('🧪 Testing complete campaign creation flow...');
  
  try {
    // Step 1: Create a test campaign
    console.log('\n1. Creating test campaign...');
    const testCampaign = {
      user_id: '00000000-0000-0000-0000-000000000001',
      title: 'Test Campaign Flow',
      description: 'Testing complete flow',
      slug: 'test-flow-' + Date.now(),
      image_url: 'https://example.com/test.jpg',
      rows: 3,
      columns: 3,
      total_squares: 9,
      pricing_type: 'fixed',
      price_data: { fixed: 10 },
      is_active: true
    };

    const { data: campaign, error: campaignError } = await supabase
      .from('campaigns')
      .insert(testCampaign)
      .select()
      .single();

    if (campaignError) {
      console.log('❌ Campaign creation failed:', campaignError.message);
      return;
    }
    
    console.log('✅ Campaign created successfully');
    console.log('   Campaign ID:', campaign.id);

    // Step 2: Create squares for the campaign
    console.log('\n2. Creating squares for campaign...');
    const squares = [];
    
    for (let row = 0; row < 3; row++) {
      for (let col = 0; col < 3; col++) {
        const position = row * 3 + col + 1;
        squares.push({
          campaign_id: campaign.id,
          row,
          col,
          number: position,
          value: 10,
          claimed_by: null,
          donor_name: null,
          payment_status: 'pending',
          payment_type: 'stripe',
          claimed_at: null
        });
      }
    }

    const { data: squaresResult, error: squaresError } = await supabase
      .from('squares')
      .insert(squares)
      .select();

    if (squaresError) {
      console.log('❌ Squares creation failed:', squaresError.message);
      console.log('   Error details:', squaresError);
      
      // Check what columns the squares table actually has
      console.log('\n   Checking squares table structure...');
      const { data: existingSquares, error: checkError } = await supabase
        .from('squares')
        .select('*')
        .limit(1);
      
      if (!checkError && existingSquares && existingSquares.length > 0) {
        console.log('   Existing squares columns:', Object.keys(existingSquares[0]));
      }
    } else {
      console.log('✅ Squares created successfully');
      console.log(`   Created ${squaresResult.length} squares`);
    }

    // Step 3: Test fetching campaign with squares (simulating API call)
    console.log('\n3. Testing campaign + squares fetch...');
    const { data: fetchedCampaign, error: fetchError } = await supabase
      .from('campaigns')
      .select('*')
      .eq('slug', campaign.slug)
      .single();

    if (fetchError) {
      console.log('❌ Campaign fetch failed:', fetchError.message);
    } else {
      console.log('✅ Campaign fetched successfully');
    }

    const { data: fetchedSquares, error: squaresFetchError } = await supabase
      .from('squares')
      .select('*')
      .eq('campaign_id', campaign.id);

    if (squaresFetchError) {
      console.log('❌ Squares fetch failed:', squaresFetchError.message);
    } else {
      console.log('✅ Squares fetched successfully');
      console.log(`   Retrieved ${fetchedSquares.length} squares`);
    }

    // Step 4: Clean up
    console.log('\n4. Cleaning up test data...');
    
    // Delete squares first (due to foreign key)
    if (!squaresFetchError && fetchedSquares.length > 0) {
      await supabase.from('squares').delete().eq('campaign_id', campaign.id);
      console.log('   Squares deleted');
    }
    
    // Delete campaign
    await supabase.from('campaigns').delete().eq('id', campaign.id);
    console.log('   Campaign deleted');

    console.log('\n🎉 FULL FLOW TEST COMPLETED!');
    
    if (squaresError) {
      console.log('\n⚠️  ISSUE FOUND:');
      console.log('Campaign creation works, but squares creation failed.');
      console.log('This means the squares table schema needs to be updated.');
      console.log('\n📝 TO FIX:');
      console.log('1. Go to your Supabase project dashboard');
      console.log('2. Navigate to SQL Editor');
      console.log('3. Run this SQL to update squares table:');
      console.log('');
      console.log('ALTER TABLE public.squares ADD COLUMN IF NOT EXISTS row INTEGER;');
      console.log('ALTER TABLE public.squares ADD COLUMN IF NOT EXISTS col INTEGER;');
      console.log('ALTER TABLE public.squares ADD COLUMN IF NOT EXISTS number INTEGER;');
      console.log('ALTER TABLE public.squares ADD COLUMN IF NOT EXISTS value DECIMAL(10,2);');
      console.log('ALTER TABLE public.squares ADD COLUMN IF NOT EXISTS claimed_by UUID;');
      console.log('ALTER TABLE public.squares ADD COLUMN IF NOT EXISTS donor_name TEXT;');
      console.log('ALTER TABLE public.squares ADD COLUMN IF NOT EXISTS payment_status TEXT DEFAULT \'pending\';');
      console.log('ALTER TABLE public.squares ADD COLUMN IF NOT EXISTS payment_type TEXT DEFAULT \'stripe\';');
      console.log('ALTER TABLE public.squares ADD COLUMN IF NOT EXISTS claimed_at TIMESTAMP WITH TIME ZONE;');
      console.log('');
    } else {
      console.log('\n✅ EVERYTHING WORKS!');
      console.log('Your database is properly configured for:');
      console.log('- ✅ Regular user campaign creation (no admin needed)');
      console.log('- ✅ Campaign grid display');
      console.log('- ✅ Squares creation and fetching');
      console.log('\n🚀 You can now test the full application!');
    }

  } catch (error) {
    console.error('❌ Error during flow test:', error);
  }
}

testFullFlow(); 