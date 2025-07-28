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

async function setupDatabase() {
  console.log('🚀 Setting up SquareFundr database...');
  
  try {
    // Check current campaigns table structure
    console.log('\n1. Checking campaigns table...');
    const { data: campaigns, error: campaignsError } = await supabase
      .from('campaigns')
      .select('*')
      .limit(1);
    
    if (campaignsError) {
      console.log('❌ Campaigns table error:', campaignsError.message);
      if (campaignsError.message.includes('does not exist')) {
        console.log('   → Table needs to be created');
      } else {
        console.log('   → Table exists but has issues (probably wrong schema)');
      }
    } else {
      console.log('✅ Campaigns table exists and accessible');
      if (campaigns && campaigns.length > 0) {
        console.log('   Columns:', Object.keys(campaigns[0]));
      } else {
        console.log('   (Table is empty)');
      }
    }

    // Check squares table structure
    console.log('\n2. Checking squares table...');
    const { data: squares, error: squaresError } = await supabase
      .from('squares')
      .select('*')
      .limit(1);
    
    if (squaresError) {
      console.log('❌ Squares table error:', squaresError.message);
      if (squaresError.message.includes('does not exist')) {
        console.log('   → Table needs to be created');
      } else {
        console.log('   → Table exists but has issues (probably wrong schema)');
      }
    } else {
      console.log('✅ Squares table exists and accessible');
      if (squares && squares.length > 0) {
        console.log('   Columns:', Object.keys(squares[0]));
      } else {
        console.log('   (Table is empty)');
      }
    }

    // Try to create a test campaign to see what errors we get
    console.log('\n3. Testing campaign creation with current schema...');
    const testCampaign = {
      user_id: '00000000-0000-0000-0000-000000000001',
      title: 'Test Campaign',
      description: 'Test',
      slug: 'test-' + Date.now(),
      image_url: 'https://example.com/test.jpg',
      rows: 5,
      columns: 5,
      total_squares: 25,
      pricing_type: 'fixed',
      price_data: { fixed: 10 },
      is_active: true
    };

    const { data: campaignResult, error: campaignCreateError } = await supabase
      .from('campaigns')
      .insert(testCampaign)
      .select()
      .single();

    if (campaignCreateError) {
      console.log('❌ Campaign creation test failed:', campaignCreateError.message);
      console.log('   This confirms the schema needs to be updated');
    } else {
      console.log('✅ Campaign creation test successful!');
      console.log('   Campaign ID:', campaignResult.id);
      
      // Clean up test campaign
      await supabase.from('campaigns').delete().eq('id', campaignResult.id);
      console.log('   (Test campaign cleaned up)');
    }

    console.log('\n🔧 Database analysis completed!');
    console.log('\n📋 SUMMARY:');
    if (campaignsError || squaresError || campaignCreateError) {
      console.log('❌ Database schema needs to be updated');
      console.log('\n📝 NEXT STEPS:');
      console.log('1. Go to your Supabase project dashboard: https://app.supabase.com/project/vumctangyedgcbzmhbkl');
      console.log('2. Navigate to SQL Editor');
      console.log('3. Copy and paste the contents of simple-setup.sql');
      console.log('4. Run the script to create/update the database schema');
      console.log('\n🎯 After running the SQL script:');
      console.log('1. Run this script again to verify: node setup-database.js');
      console.log('2. Go to http://localhost:3000/auth and create an account');
      console.log('3. Go to http://localhost:3000/create and test campaign creation');
    } else {
      console.log('✅ Database schema looks good!');
      console.log('\n🎯 You can now:');
      console.log('1. Go to http://localhost:3000/auth and create an account');
      console.log('2. Go to http://localhost:3000/create and test campaign creation');
      console.log('3. The grid should display properly on campaign pages');
    }

  } catch (error) {
    console.error('❌ Error checking database:', error);
  }
}

setupDatabase(); 