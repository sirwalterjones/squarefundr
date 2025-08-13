#!/usr/bin/env node

const fs = require('fs');

// Fix the users file by removing all duplicate adminSupabase declarations
const usersFile = 'app/api/master-admin/users/route.ts';

if (fs.existsSync(usersFile)) {
  console.log('🔧 Fixing duplicate adminSupabase declarations in users route...');
  
  let content = fs.readFileSync(usersFile, 'utf8');
  
  // Remove all duplicate adminSupabase declarations after the first one
  const lines = content.split('\n');
  const fixedLines = [];
  let firstDeclarationFound = false;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    // Check if this is an adminSupabase declaration
    if (line.includes('const adminSupabase = createClient')) {
      if (!firstDeclarationFound) {
        // Keep the first one
        fixedLines.push(line);
        firstDeclarationFound = true;
        
        // Also keep the next few lines (auth config)
        if (i + 1 < lines.length && lines[i + 1].includes('auth:')) {
          fixedLines.push(lines[i + 1]);
          i++;
        }
        if (i + 1 < lines.length && lines[i + 1].includes('autoRefreshToken:')) {
          fixedLines.push(lines[i + 1]);
          i++;
        }
        if (i + 1 < lines.length && lines[i + 1].includes('persistSession:')) {
          fixedLines.push(lines[i + 1]);
          i++;
        }
        if (i + 1 < lines.length && lines[i + 1].includes('},')) {
          fixedLines.push(lines[i + 1]);
          i++;
        }
        if (i + 1 < lines.length && lines[i + 1].includes('});')) {
          fixedLines.push(lines[i + 1]);
          i++;
        }
      } else {
        // Skip duplicate declarations and their config
        console.log(`Removing duplicate declaration at line ${i + 1}`);
        // Skip the next few lines too
        if (i + 1 < lines.length && lines[i + 1].includes('auth:')) i++;
        if (i + 1 < lines.length && lines[i + 1].includes('autoRefreshToken:')) i++;
        if (i + 1 < lines.length && lines[i + 1].includes('persistSession:')) i++;
        if (i + 1 < lines.length && lines[i + 1].includes('},')) i++;
        if (i + 1 < lines.length && lines[i + 1].includes('});')) i++;
        
        // Add a comment instead
        fixedLines.push('    // Use existing admin client');
      }
    } else {
      fixedLines.push(line);
    }
  }
  
  const fixedContent = fixedLines.join('\n');
  fs.writeFileSync(usersFile, fixedContent);
  console.log('✅ Fixed users route file');
} else {
  console.log('❌ Users file not found');
}

console.log('\n🎉 Duplicate fix complete!');
