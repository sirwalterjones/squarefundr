require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

console.log('🔍 Environment check:');
console.log('NEXT_PUBLIC_SUPABASE_URL:', process.env.NEXT_PUBLIC_SUPABASE_URL ? 'exists' : 'missing');
console.log('SUPABASE_SERVICE_ROLE_KEY:', process.env.SUPABASE_SERVICE_ROLE_KEY ? 'exists' : 'missing');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function debugConnection() {
  console.log('\n🔍 Testing basic connection...');
  
  try {
    // Test 1: Try to access a table we know exists
    console.log('📋 Test 1: Checking known table (campaigns)...');
    const { data: campaigns, error: campaignsError } = await supabase
      .from('campaigns')
      .select('id')
      .limit(1);
    
    if (campaignsError) {
      console.error('❌ Campaigns table access failed:', campaignsError.message);
    } else {
      console.log('✅ Campaigns table accessible');
    }
    
    // Test 2: Try admin_messages with explicit schema
    console.log('\n📋 Test 2: Trying admin_messages...');
    const { data: messages, error: messagesError } = await supabase
      .from('admin_messages')
      .select('count')
      .limit(1);
    
    if (messagesError) {
      console.error('❌ admin_messages access failed:', messagesError);
      console.error('Error details:', JSON.stringify(messagesError, null, 2));
    } else {
      console.log('✅ admin_messages accessible');
    }
    
    // Test 3: Check what tables are actually accessible
    console.log('\n📋 Test 3: Checking accessible tables via RPC...');
    try {
      const { data: rpcData, error: rpcError } = await supabase
        .rpc('exec_sql', { query: "SELECT tablename FROM pg_tables WHERE schemaname = 'public' LIMIT 5" });
      
      if (rpcError) {
        console.log('⚠️ RPC not available or failed:', rpcError.message);
      } else {
        console.log('✅ RPC works, tables:', rpcData);
      }
    } catch (rpcErr) {
      console.log('⚠️ RPC exception:', rpcErr.message);
    }
    
  } catch (err) {
    console.error('❌ Connection test failed:', err.message);
    console.error('Stack:', err.stack);
  }
}

debugConnection();
