#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Files that need fixing
const files = [
  'app/api/master-admin/donations/route.ts',
  'app/api/master-admin/users/route.ts',
  'app/api/help-messages/route.ts'
];

function fixAdminCheck(content) {
  // Pattern 1: Basic admin check
  const pattern1 = /(\s+)\/\/ Check if user is admin\s*\n(\s+)const \{ data: userRole,? error: roleError \} = await supabase\s*\n(\s+)\.from\("user_roles"\)\s*\n(\s+)\.select\("role"\)\s*\n(\s+)\.eq\("user_id", user\.id\)\s*\n(\s+)\.eq\("role", "admin"\)\s*\n(\s+)\.single\(\);/g;
  
  content = content.replace(pattern1, (match, indent) => {
    return `${indent}// Create admin client for role check
${indent}const adminSupabase = createClient(supabaseUrl, supabaseServiceKey, {
${indent}  auth: {
${indent}    autoRefreshToken: false,
${indent}    persistSession: false,
${indent}  },
${indent}});

${indent}// Check if user is admin using admin client
${indent}const { data: userRole, error: roleError } = await adminSupabase
${indent}  .from("user_roles")
${indent}  .select("role")
${indent}  .eq("user_id", user.id)
${indent}  .eq("role", "admin")
${indent}  .single();`;
  });

  // Pattern 2: Admin check without error destructuring
  const pattern2 = /(\s+)\/\/ Check if user is admin\s*\n(\s+)const \{ data: userRole \} = await supabase\s*\n(\s+)\.from\("user_roles"\)\s*\n(\s+)\.select\("role"\)\s*\n(\s+)\.eq\("user_id", user\.id\)\s*\n(\s+)\.eq\("role", "admin"\)\s*\n(\s+)\.single\(\);/g;
  
  content = content.replace(pattern2, (match, indent) => {
    return `${indent}// Create admin client for role check
${indent}const adminSupabase = createClient(supabaseUrl, supabaseServiceKey, {
${indent}  auth: {
${indent}    autoRefreshToken: false,
${indent}    persistSession: false,
${indent}  },
${indent}});

${indent}// Check if user is admin using admin client
${indent}const { data: userRole } = await adminSupabase
${indent}  .from("user_roles")
${indent}  .select("role")
${indent}  .eq("user_id", user.id)
${indent}  .eq("role", "admin")
${indent}  .single();`;
  });

  return content;
}

console.log('🔧 Fixing admin endpoints...\n');

files.forEach(filePath => {
  if (fs.existsSync(filePath)) {
    console.log(`📝 Fixing ${filePath}...`);
    
    const content = fs.readFileSync(filePath, 'utf8');
    const fixed = fixAdminCheck(content);
    
    if (content !== fixed) {
      fs.writeFileSync(filePath, fixed);
      console.log(`✅ Fixed ${filePath}`);
    } else {
      console.log(`ℹ️  ${filePath} already correct or pattern not found`);
    }
  } else {
    console.log(`❌ File not found: ${filePath}`);
  }
});

console.log('\n🎉 All files processed!');
