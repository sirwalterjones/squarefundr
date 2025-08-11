require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

console.log('🔍 Connection details:');
console.log('URL:', supabaseUrl);
console.log('Service key prefix:', supabaseServiceKey ? supabaseServiceKey.substring(0, 20) + '...' : 'missing');

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkDatabase() {
  console.log('\n🔍 Checking database identity...');
  
  try {
    // Get some campaign data to verify we're in the right database
    const { data: campaigns, error: campaignsError } = await supabase
      .from('campaigns')
      .select('title, slug')
      .limit(3);
    
    if (campaignsError) {
      console.error('❌ Campaigns error:', campaignsError);
      return;
    }
    
    console.log('✅ Connected to database with campaigns:');
    campaigns.forEach(campaign => {
      console.log(`  - ${campaign.title} (${campaign.slug})`);
    });
    
    // Check what tables are actually visible to this connection
    console.log('\n📋 Checking visible tables by trying known ones...');
    const knownTables = ['campaigns', 'squares', 'transactions', 'admin_messages', 'help_requests'];
    
    for (const tableName of knownTables) {
      try {
        const { data, error } = await supabase
          .from(tableName)
          .select('count')
          .limit(1);
        
        if (error) {
          console.log(`❌ ${tableName}: ${error.message}`);
        } else {
          console.log(`✅ ${tableName}: accessible`);
        }
      } catch (err) {
        console.log(`❌ ${tableName}: exception - ${err.message}`);
      }
    }
    
  } catch (err) {
    console.error('❌ Database check failed:', err.message);
  }
}

checkDatabase();
