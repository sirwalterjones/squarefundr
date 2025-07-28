// This is a simple script to test the Supabase connection from the server
// Run with: node test-supabase-connection.js

require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const { v4: uuidv4 } = require('uuid');

// Get the environment variables
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Check if the required environment variables are set
if (!supabaseUrl) {
  console.error('ERROR: NEXT_PUBLIC_SUPABASE_URL is not set');
  process.exit(1);
}

if (!supabaseServiceRoleKey) {
  console.error('ERROR: SUPABASE_SERVICE_ROLE_KEY is not set');
  process.exit(1);
}

console.log('Environment variables:');
console.log('- NEXT_PUBLIC_SUPABASE_URL:', supabaseUrl);
console.log('- NEXT_PUBLIC_SUPABASE_ANON_KEY exists:', !!supabaseAnonKey);
console.log('- SUPABASE_SERVICE_ROLE_KEY exists:', !!supabaseServiceRoleKey);

// Create the Supabase admin client
console.log('\nCreating Supabase admin client...');
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

// Test the connection
async function testConnection() {
  try {
    console.log('\nTesting connection to Supabase...');
    
    // Test query to the campaigns table
    console.log('\nFetching campaigns table data...');
    const { data: campaigns, error: campaignsError } = await supabaseAdmin
      .from('campaigns')
      .select('*')
      .limit(5);
    
    if (campaignsError) {
      console.error('Error fetching campaigns:', campaignsError);
    } else {
      console.log(`Successfully fetched ${campaigns.length} campaigns`);
      if (campaigns.length > 0) {
        console.log('Sample campaign:', campaigns[0]);
      } else {
        console.log('No campaigns found in the database');
      }
    }

    // Test query to the squares table
    console.log('\nFetching squares table data...');
    const { data: squares, error: squaresError } = await supabaseAdmin
      .from('squares')
      .select('*')
      .limit(5);
    
    if (squaresError) {
      console.error('Error fetching squares:', squaresError);
    } else {
      console.log(`Successfully fetched ${squares.length} squares`);
      if (squares.length > 0) {
        console.log('Sample square:', squares[0]);
      } else {
        console.log('No squares found in the database');
      }
    }

    // List tables in the database
    console.log('\nListing database tables...');
    try {
      // Using raw SQL to get tables since RPC didn't work
      const { data: tables, error: tablesError } = await supabaseAdmin
        .from('_tables')
        .select('*')
        .limit(20);
      
      if (tablesError) {
        console.error('Error listing tables:', tablesError);
        console.log('Trying alternative approach to list tables...');
        // Alternative approach to list tables
        const { data: schemaInfo, error: schemaError } = await supabaseAdmin.rpc('get_schema_info');
        if (schemaError) {
          console.error('Error getting schema info:', schemaError);
        } else {
          console.log('Schema info:', schemaInfo);
        }
      } else {
        console.log('Tables in the database:');
        console.log(tables);
      }
    } catch (tableError) {
      console.error('Error listing tables:', tableError);
    }

    // Test inserting a dummy campaign
    console.log('\nTesting campaign creation...');
    const testCampaign = {
      user_id: uuidv4(), // Using UUID instead of string
      title: 'Test Campaign ' + Date.now(),
      description: 'Test campaign created by test script',
      slug: 'test-campaign-' + Date.now(),
      image_url: 'https://via.placeholder.com/300',
      rows: 10,
      columns: 10,
      pricing_type: 'fixed',
      price_data: { fixed: 10 },
      is_active: true,
      total_squares: 100 // Add the total_squares field (rows * columns)
    };
    
    console.log('Test campaign data:', testCampaign);
    
    const { data: campaign, error: campaignError } = await supabaseAdmin
      .from('campaigns')
      .insert(testCampaign)
      .select()
      .single();
    
    if (campaignError) {
      console.error('Error creating test campaign:', campaignError);
      
      // Try with simplified data
      console.log('\nTrying with minimal data...');
      const minimalCampaign = {
        user_id: uuidv4(),
        title: 'Test Campaign Minimal',
        slug: 'test-minimal',
        rows: 5,
        columns: 5,
        pricing_type: 'fixed',
        price_data: { fixed: 5 },
        image_url: 'https://example.com/image.jpg',
        total_squares: 25 // Add the total_squares field (rows * columns)
      };
      
      const { data: minCampaign, error: minError } = await supabaseAdmin
        .from('campaigns')
        .insert(minimalCampaign)
        .select()
        .single();
      
      if (minError) {
        console.error('Error creating minimal test campaign:', minError);
      } else {
        console.log('Successfully created minimal test campaign:', minCampaign);
      }
    } else {
      console.log('Successfully created test campaign:');
      console.log(campaign);
      
      // Clean up the test campaign
      console.log('\nCleaning up test campaign...');
      const { error: deleteError } = await supabaseAdmin
        .from('campaigns')
        .delete()
        .eq('id', campaign.id);
      
      if (deleteError) {
        console.error('Error deleting test campaign:', deleteError);
      } else {
        console.log('Successfully deleted test campaign');
      }
    }
    
    console.log('\nConnection test completed!');
    process.exit(0);
  } catch (error) {
    console.error('Unexpected error during test:', error);
    process.exit(1);
  }
}

// Run the test
testConnection(); 