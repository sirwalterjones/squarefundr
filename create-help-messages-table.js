require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function createHelpMessagesTable() {
  console.log('🔧 Creating help_messages table and policies...');
  
  try {
    // Create the table
    console.log('\n1. Creating help_messages table...');
    const { error: createTableError } = await supabase.rpc('exec_sql', {
      sql: `
        -- Create help_messages table for threaded conversations
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
                (sender_type = 'user')
            )
        );
      `
    });
    
    if (createTableError) {
      console.error('❌ Error creating table:', createTableError);
    } else {
      console.log('✅ Table created successfully');
    }
    
    // Enable RLS
    console.log('\n2. Enabling Row Level Security...');
    const { error: rlsError } = await supabase.rpc('exec_sql', {
      sql: 'ALTER TABLE help_messages ENABLE ROW LEVEL SECURITY;'
    });
    
    if (rlsError) {
      console.error('❌ Error enabling RLS:', rlsError);
    } else {
      console.log('✅ RLS enabled');
    }
    
    // Create policies
    console.log('\n3. Creating RLS policies...');
    
    const policies = [
      {
        name: "Users can view messages in their help requests",
        sql: `
          CREATE POLICY "Users can view messages in their help requests" ON help_messages
              FOR SELECT 
              USING (
                  EXISTS (
                      SELECT 1 FROM help_requests 
                      WHERE help_requests.id = help_messages.help_request_id 
                      AND help_requests.email = (
                          SELECT email FROM auth.users WHERE auth.users.id = auth.uid()
                      )
                  )
              );
        `
      },
      {
        name: "Users can send messages in their help requests", 
        sql: `
          CREATE POLICY "Users can send messages in their help requests" ON help_messages
              FOR INSERT 
              WITH CHECK (
                  sender_type = 'user' AND
                  EXISTS (
                      SELECT 1 FROM help_requests 
                      WHERE help_requests.id = help_request_id 
                      AND help_requests.email = (
                          SELECT email FROM auth.users WHERE auth.users.id = auth.uid()
                      )
                  )
              );
        `
      },
      {
        name: "Admins can view all help messages",
        sql: `
          CREATE POLICY "Admins can view all help messages" ON help_messages
              FOR SELECT 
              USING (
                  EXISTS (
                      SELECT 1 FROM user_roles 
                      WHERE user_roles.user_id = auth.uid() 
                      AND user_roles.role = 'admin'
                  )
              );
        `
      },
      {
        name: "Admins can send messages to any help request",
        sql: `
          CREATE POLICY "Admins can send messages to any help request" ON help_messages
              FOR INSERT 
              WITH CHECK (
                  sender_type = 'admin' AND
                  EXISTS (
                      SELECT 1 FROM user_roles 
                      WHERE user_roles.user_id = auth.uid() 
                      AND user_roles.role = 'admin'
                  )
              );
        `
      }
    ];
    
    for (const policy of policies) {
      const { error: policyError } = await supabase.rpc('exec_sql', {
        sql: policy.sql
      });
      
      if (policyError && !policyError.message.includes('already exists')) {
        console.error(`❌ Error creating policy "${policy.name}":`, policyError);
      } else {
        console.log(`✅ Policy "${policy.name}" created`);
      }
    }
    
    // Create indexes
    console.log('\n4. Creating indexes...');
    const indexes = [
      'CREATE INDEX IF NOT EXISTS idx_help_messages_help_request_id ON help_messages(help_request_id);',
      'CREATE INDEX IF NOT EXISTS idx_help_messages_created_at ON help_messages(created_at DESC);',
      'CREATE INDEX IF NOT EXISTS idx_help_messages_sender_type ON help_messages(sender_type);'
    ];
    
    for (const indexSql of indexes) {
      const { error: indexError } = await supabase.rpc('exec_sql', { sql: indexSql });
      if (indexError) {
        console.error('❌ Error creating index:', indexError);
      } else {
        console.log('✅ Index created');
      }
    }
    
    // Test the table
    console.log('\n5. Testing table access...');
    const { data: testData, error: testError } = await supabase
      .from('help_messages')
      .select('*')
      .limit(1);
      
    if (testError) {
      console.error('❌ Error testing table:', testError);
    } else {
      console.log('✅ Table is working correctly');
    }
    
    console.log('\n🎉 help_messages table setup complete!');
    
  } catch (error) {
    console.error('Setup error:', error);
  }
}

createHelpMessagesTable().catch(console.error);
