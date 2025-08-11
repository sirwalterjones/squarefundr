require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function finalTest() {
  console.log('🔍 Final test for admin_messages table...');
  
  try {
    // Test 1: Direct select from the table
    console.log('📋 Test 1: Direct select...');
    const { data, error } = await supabase
      .from('admin_messages')
      .select('*')
      .eq('subject', 'Working Test');
    
    if (error) {
      console.error('❌ Direct select failed:', error);
    } else {
      console.log('✅ Direct select worked!', data);
    }
    
    // Test 2: Try insert
    console.log('\n📋 Test 2: Insert test...');
    const { data: insertData, error: insertError } = await supabase
      .from('admin_messages')
      .insert({
        from_admin_id: 'e883b63f-ea21-416b-ac83-c5357aecd4ec',
        to_user_id: 'e883b63f-ea21-416b-ac83-c5357aecd4ec',
        subject: 'JS Client Test',
        message: 'Testing from JavaScript client',
        is_read: false
      })
      .select();
    
    if (insertError) {
      console.error('❌ Insert failed:', insertError);
      console.error('Error details:', JSON.stringify(insertError, null, 2));
    } else {
      console.log('✅ Insert worked!', insertData[0]);
      console.log('🎉 MESSAGING SYSTEM IS NOW WORKING!');
    }
    
  } catch (err) {
    console.error('❌ Exception:', err.message);
  }
}

finalTest();
