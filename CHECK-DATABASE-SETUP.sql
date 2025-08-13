-- =====================================================
-- DATABASE SETUP DIAGNOSTIC SCRIPT
-- Run this in your Supabase SQL Editor to check what exists
-- =====================================================

-- Check if tables exist
SELECT 'TABLE CHECK:' as info;

SELECT 
    schemaname, 
    tablename,
    CASE 
        WHEN tablename = 'user_roles' THEN '✅ Admin permissions table'
        WHEN tablename = 'help_requests' THEN '✅ Help requests table'
        WHEN tablename = 'help_messages' THEN '✅ Help messages table'
        ELSE '📋 Other table'
    END as description
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN ('user_roles', 'help_requests', 'help_messages')
ORDER BY tablename;

-- Check if you have admin access
SELECT 'ADMIN CHECK:' as info;

SELECT 
    u.email,
    ur.role,
    'You have admin access! 🎉' as status
FROM user_roles ur 
JOIN auth.users u ON ur.user_id = u.id 
WHERE ur.role = 'admin'
AND u.email = 'walterjonesjr@gmail.com';

-- Check RLS policies
SELECT 'RLS POLICIES CHECK:' as info;

SELECT 
    schemaname,
    tablename,
    policyname,
    cmd as command_type
FROM pg_policies 
WHERE schemaname = 'public' 
AND tablename IN ('user_roles', 'help_requests', 'help_messages')
ORDER BY tablename, policyname;

-- Count existing data
SELECT 'DATA COUNT:' as info;

-- Only run these if tables exist
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'user_roles') THEN
        PERFORM 1;
        RAISE NOTICE 'user_roles table exists with % rows', (SELECT COUNT(*) FROM user_roles);
    ELSE
        RAISE NOTICE '❌ user_roles table does NOT exist';
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'help_requests') THEN
        PERFORM 1;
        RAISE NOTICE 'help_requests table exists with % rows', (SELECT COUNT(*) FROM help_requests);
    ELSE
        RAISE NOTICE '❌ help_requests table does NOT exist';
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'help_messages') THEN
        PERFORM 1;
        RAISE NOTICE 'help_messages table exists with % rows', (SELECT COUNT(*) FROM help_messages);
    ELSE
        RAISE NOTICE '❌ help_messages table does NOT exist';
    END IF;
END $$;

-- Final status
SELECT 
    CASE 
        WHEN (
            EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'user_roles') AND
            EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'help_requests') AND
            EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'help_messages')
        ) THEN '🎉 ALL TABLES EXIST - Setup is complete!'
        ELSE '❌ MISSING TABLES - Need to run setup script'
    END as overall_status;
