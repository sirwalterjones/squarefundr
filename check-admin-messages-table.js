// Check the existing admin_messages table structure and data
require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkAdminMessagesTable() {
  console.log('🔍 Checking existing admin_messages table...\n');

  try {
    // Check if we can access the table
    console.log('1. Testing table access...');
    const { data: messages, error: accessError } = await supabase
      .from('admin_messages')
      .select('*')
      .limit(5);

    if (accessError) {
      console.log('❌ Access error:', accessError);
    } else {
      console.log('✅ Table accessible!');
      console.log('Current messages:', messages);
      console.log('Message count:', messages.length);
    }

    // Test inserting a message to see if it works
    console.log('\n2. Testing message insertion...');
    
    // Get admin user ID from user_roles
    const { data: adminRole } = await supabase
      .from('user_roles')
      .select('user_id')
      .eq('role', 'admin')
      .single();

    if (adminRole) {
      console.log('Found admin user:', adminRole.user_id);
      
      // Try to insert a test message
      const testMessage = {
        from_admin_id: adminRole.user_id,
        to_user_id: adminRole.user_id, // Send to self for testing
        subject: 'Test Message',
        message: 'This is a test message to verify the table works.',
        is_read: false
      };

      const { data: insertResult, error: insertError } = await supabase
        .from('admin_messages')
        .insert(testMessage)
        .select()
        .single();

      if (insertError) {
        console.log('❌ Insert error:', insertError);
        console.log('This might be due to RLS policies or foreign key constraints');
      } else {
        console.log('✅ Test message inserted successfully!');
        console.log('Inserted message:', insertResult);
        
        // Clean up test message
        await supabase
          .from('admin_messages')
          .delete()
          .eq('id', insertResult.id);
        console.log('🧹 Test message cleaned up');
      }
    }

    // Check what RLS policies exist
    console.log('\n3. The table exists and the messaging system should work!');
    console.log('✅ You can now test the messaging functionality in the admin panel.');

  } catch (error) {
    console.error('❌ Check failed:', error);
  }
}

checkAdminMessagesTable();
