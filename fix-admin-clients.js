#!/usr/bin/env node

const fs = require('fs');

// Files that need comprehensive fixing
const files = [
  'app/api/master-admin/users/route.ts',
  'app/api/master-admin/donations/route.ts'
];

function fixAdminClients(content) {
  // First, find the first adminSupabase declaration and keep it
  const lines = content.split('\n');
  const fixedLines = [];
  let firstDeclarationFound = false;
  let firstDeclarationLines = [];
  
  // Find the first complete declaration
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    if (line.includes('const adminSupabase = createClient') && !firstDeclarationFound) {
      firstDeclarationFound = true;
      firstDeclarationLines = [line];
      
      // Collect the complete declaration block
      let j = i + 1;
      while (j < lines.length && !lines[j].includes('});')) {
        firstDeclarationLines.push(lines[j]);
        j++;
      }
      if (j < lines.length) {
        firstDeclarationLines.push(lines[j]); // Add the closing });
      }
      
      // Add the complete first declaration
      fixedLines.push(...firstDeclarationLines);
      i = j; // Skip to after the declaration
    } else if (line.includes('const adminSupabase = createClient')) {
      // Skip duplicate declarations
      let j = i + 1;
      while (j < lines.length && !lines[j].includes('});')) {
        j++;
      }
      i = j; // Skip to after the duplicate declaration
      
      // Add a comment instead
      fixedLines.push('    // Use existing admin client');
    } else if (line.includes('auth:') && !firstDeclarationFound) {
      // Skip orphaned auth blocks
      continue;
    } else if (line.includes('autoRefreshToken:') && !firstDeclarationFound) {
      // Skip orphaned config
      continue;
    } else if (line.includes('persistSession:') && !firstDeclarationFound) {
      // Skip orphaned config
      continue;
    } else if (line.includes('},') && !firstDeclarationFound) {
      // Skip orphaned closing
      continue;
    } else if (line.includes('});') && !firstDeclarationFound) {
      // Skip orphaned closing
      continue;
    } else {
      fixedLines.push(line);
    }
  }
  
  return fixedLines.join('\n');
}

console.log('🔧 Comprehensive admin client fix...\n');

files.forEach(filePath => {
  if (fs.existsSync(filePath)) {
    console.log(`📝 Fixing ${filePath}...`);
    
    const content = fs.readFileSync(filePath, 'utf8');
    const fixed = fixAdminClients(content);
    
    if (content !== fixed) {
      fs.writeFileSync(filePath, fixed);
      console.log(`✅ Fixed ${filePath}`);
    } else {
      console.log(`ℹ️  ${filePath} already correct`);
    }
  } else {
    console.log(`❌ File not found: ${filePath}`);
  }
});

console.log('\n🎉 All admin client issues fixed!');
