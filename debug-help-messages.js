require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function debugHelpMessages() {
  console.log('🔍 Debugging help messages API...');
  
  try {
    // Check if help_messages table exists
    console.log('\n1. Checking if help_messages table exists...');
    const { data: tables, error: tablesError } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_schema', 'public')
      .eq('table_name', 'help_messages');
      
    if (tablesError) {
      console.error('Error checking tables:', tablesError);
      return;
    }
    
    if (tables && tables.length > 0) {
      console.log('✅ help_messages table exists');
    } else {
      console.log('❌ help_messages table does NOT exist - need to create it');
      
      // Create the table manually
      console.log('\n2. Creating help_messages table...');
      const { error: createError } = await supabase.rpc('exec', {
        sql: `
          CREATE TABLE IF NOT EXISTS help_messages (
              id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
              help_request_id UUID NOT NULL REFERENCES help_requests(id) ON DELETE CASCADE,
              sender_type TEXT NOT NULL CHECK (sender_type IN ('user', 'admin')),
              sender_user_id UUID REFERENCES auth.users(id),
              sender_name TEXT NOT NULL,
              sender_email TEXT NOT NULL,
              message TEXT NOT NULL,
              created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
              updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
              is_read BOOLEAN DEFAULT false,
              CONSTRAINT valid_sender CHECK (
                  (sender_type = 'admin' AND sender_user_id IS NOT NULL) OR
                  (sender_type = 'user' AND sender_user_id IS NULL)
              )
          );
        `
      });
      
      if (createError) {
        console.error('Error creating table:', createError);
        return;
      }
      
      console.log('✅ Created help_messages table');
    }
    
    // Test a simple query
    console.log('\n3. Testing simple query...');
    const { data: testData, error: testError } = await supabase
      .from('help_messages')
      .select('*')
      .limit(1);
      
    if (testError) {
      console.error('❌ Error querying help_messages:', testError);
    } else {
      console.log('✅ Successfully queried help_messages table');
      console.log(`Found ${testData?.length || 0} messages`);
    }
    
    // Check if help_requests table has any data
    console.log('\n4. Checking help_requests...');
    const { data: helpRequests, error: helpRequestsError } = await supabase
      .from('help_requests')
      .select('id, subject, email')
      .limit(5);
      
    if (helpRequestsError) {
      console.error('❌ Error querying help_requests:', helpRequestsError);
    } else {
      console.log('✅ Help requests found:', helpRequests?.length || 0);
      for (const req of helpRequests || []) {
        console.log(`   - ${req.id}: ${req.subject} (${req.email})`);
      }
    }
    
  } catch (error) {
    console.error('Debug error:', error);
  }
}

debugHelpMessages().catch(console.error);
