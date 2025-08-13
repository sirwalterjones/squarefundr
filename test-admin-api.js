#!/usr/bin/env node

// Quick test script to check admin API
// Run with: node test-admin-api.js

const https = require('https');

async function testAdminAPI() {
  console.log('🔍 Testing admin API...\n');
  
  try {
    const response = await fetch('https://www.squarefundr.com/api/is-admin', {
      method: 'GET',
      headers: {
        'User-Agent': 'Admin-Test-Script',
        // Note: This won't have auth cookies, so should return false
      }
    });
    
    const data = await response.json();
    console.log('📡 API Response:', {
      status: response.status,
      headers: Object.fromEntries(response.headers.entries()),
      data: data
    });
    
    console.log('\n✅ API is responding');
    console.log('ℹ️  Note: Should return false since we have no auth cookies');
    
  } catch (error) {
    console.error('❌ API Test failed:', error);
  }
}

testAdminAPI();
