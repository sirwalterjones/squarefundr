#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

async function testStorageSetup() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    console.error('❌ Missing Supabase environment variables');
    console.log('Required: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY');
    process.exit(1);
  }

  console.log('🔧 Testing Supabase Storage setup...');
  console.log(`URL: ${supabaseUrl}`);

  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Test 1: Check if images bucket exists
    console.log('\n📁 Checking storage buckets...');
    const { data: buckets, error: bucketsError } = await supabase.storage.listBuckets();
    
    if (bucketsError) {
      throw bucketsError;
    }

    console.log('Available buckets:', buckets.map(b => `${b.name} (public: ${b.public})`));
    
    const imagesBucket = buckets.find(b => b.name === 'images');
    if (!imagesBucket) {
      console.log('⚠️  Images bucket not found. Creating it...');
      
      const { data: newBucket, error: createError } = await supabase.storage.createBucket('images', {
        public: true,
        allowedMimeTypes: ['image/png', 'image/jpeg', 'image/gif', 'image/webp'],
        fileSizeLimit: 10485760 // 10MB
      });

      if (createError) {
        throw createError;
      }

      console.log('✅ Created images bucket successfully');
    } else {
      console.log(`✅ Images bucket exists (public: ${imagesBucket.public})`);
    }

    // Test 2: Test file upload (create a small test file)
    console.log('\n📤 Testing file upload...');
    const testFileName = `test-${Date.now()}.png`;
    
    // Create a minimal 1x1 PNG image (base64 encoded)
    const pngBase64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChAI9jU77kQAAAABJRU5ErkJggg==';
    const pngBuffer = Buffer.from(pngBase64, 'base64');
    const testFileContent = new Blob([pngBuffer], { type: 'image/png' });

    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('images')
      .upload(testFileName, testFileContent);

    if (uploadError) {
      throw uploadError;
    }

    console.log('✅ Test file uploaded successfully:', uploadData.path);

    // Test 3: Get public URL
    console.log('\n🔗 Testing public URL generation...');
    const { data: { publicUrl } } = supabase.storage
      .from('images')
      .getPublicUrl(testFileName);

    console.log('✅ Public URL generated:', publicUrl);

    // Test 4: Clean up test file
    console.log('\n🧹 Cleaning up test file...');
    const { error: deleteError } = await supabase.storage
      .from('images')
      .remove([testFileName]);

    if (deleteError) {
      console.warn('⚠️  Failed to delete test file:', deleteError.message);
    } else {
      console.log('✅ Test file cleaned up successfully');
    }

    console.log('\n🎉 All storage tests passed!');
    console.log('\n📋 Setup Instructions:');
    console.log('1. Run this SQL in your Supabase SQL Editor:');
    console.log('   - See setup-storage.sql file');
    console.log('2. Storage bucket is ready for image uploads');
    console.log('3. Update your app to use storage URLs instead of data URLs');

  } catch (error) {
    console.error('❌ Storage test failed:', error.message);
    console.log('\n🔧 Troubleshooting:');
    console.log('1. Check your Supabase project settings');
    console.log('2. Verify your environment variables are correct');
    console.log('3. Ensure your Supabase project has storage enabled');
    console.log('4. Run the setup-storage.sql script in your Supabase SQL Editor');
    process.exit(1);
  }
}

testStorageSetup(); 