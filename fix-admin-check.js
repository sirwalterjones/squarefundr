#!/usr/bin/env node

// Direct admin fix script
// This script will test and potentially fix admin detection issues

const { createClient } = require('@supabase/supabase-js');

// Load environment variables from .env.local
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing environment variables');
  process.exit(1);
}

async function fixAdminCheck() {
  console.log('🔧 Testing admin setup for walterjonesjr@gmail.com...\n');
  
  try {
    // Create admin client
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    // 1. Find Walter's user
    console.log('1️⃣ Looking for user in auth.users...');
    const { data: users, error: usersError } = await supabase.auth.admin.listUsers();
    
    if (usersError) {
      console.error('❌ Error listing users:', usersError);
      return;
    }

    const walter = users.users.find(u => u.email === 'walterjonesjr@gmail.com');
    if (!walter) {
      console.error('❌ Walter not found in auth.users');
      return;
    }
    
    console.log('✅ Found Walter:', walter.id, walter.email);

    // 2. Check user_roles table
    console.log('\n2️⃣ Checking user_roles table...');
    const { data: roles, error: rolesError } = await supabase
      .from('user_roles')
      .select('*')
      .eq('user_id', walter.id);

    if (rolesError) {
      console.error('❌ Error checking user_roles:', rolesError);
      return;
    }

    console.log('📋 Current roles for Walter:', roles);

    // 3. Ensure admin role
    if (!roles || roles.length === 0) {
      console.log('\n3️⃣ No roles found, inserting admin role...');
      const { data: insertData, error: insertError } = await supabase
        .from('user_roles')
        .insert([{ user_id: walter.id, role: 'admin' }])
        .select();
      
      if (insertError) {
        console.error('❌ Error inserting admin role:', insertError);
        return;
      }
      console.log('✅ Inserted admin role:', insertData);
    } else if (!roles.some(r => r.role === 'admin')) {
      console.log('\n3️⃣ User has role but not admin, updating...');
      const { data: updateData, error: updateError } = await supabase
        .from('user_roles')
        .update({ role: 'admin' })
        .eq('user_id', walter.id)
        .select();
      
      if (updateError) {
        console.error('❌ Error updating to admin role:', updateError);
        return;
      }
      console.log('✅ Updated to admin role:', updateData);
    } else {
      console.log('✅ Walter already has admin role');
    }

    // 4. Test the API logic
    console.log('\n4️⃣ Testing API logic...');
    const { data: testRole, error: testError } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", walter.id)
      .eq("role", "admin")
      .single();

    if (testError) {
      console.error('❌ API test failed:', testError);
    } else {
      console.log('✅ API test successful:', testRole);
    }

    console.log('\n🎉 Admin check fixed! Try refreshing your browser.');

  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

fixAdminCheck();
