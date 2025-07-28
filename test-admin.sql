-- Test Admin Setup
-- Run this to verify your admin setup is working correctly

-- Check if system user exists
SELECT 'System user check:' as test, 
       CASE WHEN EXISTS (SELECT 1 FROM public.users WHERE id = '00000000-0000-0000-0000-000000000001') 
            THEN '✅ System user exists' 
            ELSE '❌ System user missing' 
       END as result;

-- Check if user_roles table exists and has correct structure
SELECT 'Role table check:' as test,
       CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'user_roles') 
            THEN '✅ user_roles table exists' 
            ELSE '❌ user_roles table missing' 
       END as result;

-- Check if your admin account exists in auth.users
SELECT 'Admin auth check:' as test,
       CASE WHEN EXISTS (SELECT 1 FROM auth.users WHERE email = 'walterjonesjr@gmail.com') 
            THEN '✅ Admin found in auth.users' 
            ELSE '❌ Admin not found - run signup first' 
       END as result;

-- Check if your admin account exists in public.users
SELECT 'Admin profile check:' as test,
       CASE WHEN EXISTS (SELECT 1 FROM public.users WHERE email = 'walterjonesjr@gmail.com') 
            THEN '✅ Admin profile exists' 
            ELSE '❌ Admin profile missing' 
       END as result;

-- Check if admin role is assigned
SELECT 'Admin role check:' as test,
       CASE WHEN EXISTS (
         SELECT 1 FROM public.user_roles ur 
         JOIN public.users u ON ur.user_id = u.id 
         WHERE u.email = 'walterjonesjr@gmail.com' AND ur.role = 'admin'
       ) 
       THEN '✅ Admin role assigned' 
       ELSE '❌ Admin role not assigned' 
       END as result;

-- Show all users and their roles for debugging
SELECT 'All users and roles:' as section;
SELECT u.email, u.full_name, ur.role, u.created_at
FROM public.users u
LEFT JOIN public.user_roles ur ON u.id = ur.user_id
ORDER BY u.created_at; 