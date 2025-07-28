// Simple script to test Supabase connection
// Run with: node test-supabase.js

require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

async function testSupabaseConnection() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase URL or key. Check your .env.local file.');
    process.exit(1);
  }

  console.log('Testing Supabase connection with:');
  console.log(`URL: ${supabaseUrl}`);
  console.log(`Key length: ${supabaseKey.length} chars`);

  try {
    const supabase = createClient(supabaseUrl, supabaseKey);
    console.log('Supabase client created successfully');

    // Test query to campaigns table
    console.log('Testing query to campaigns table...');
    const { data: campaigns, error: campaignsError } = await supabase
      .from('campaigns')
      .select('id, title')
      .limit(5);

    if (campaignsError) {
      throw campaignsError;
    }

    console.log('✅ CAMPAIGNS TEST SUCCESSFUL');
    console.log(`Found ${campaigns.length} campaigns:`);
    console.log(campaigns);

    // Test query to squares table
    console.log('\nTesting query to squares table...');
    const { data: squares, error: squaresError } = await supabase
      .from('squares')
      .select('id, campaign_id')
      .limit(5);

    if (squaresError) {
      throw squaresError;
    }

    console.log('✅ SQUARES TEST SUCCESSFUL');
    console.log(`Found ${squares.length} squares:`);
    console.log(squares);

    console.log('\n🎉 ALL TESTS PASSED - Supabase connection is working!');
  } catch (error) {
    console.error('❌ ERROR connecting to Supabase:', error.message);
    console.error(error);
    process.exit(1);
  }
}

testSupabaseConnection(); 