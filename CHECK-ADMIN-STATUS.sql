-- DIAGNOSTIC SCRIPT: Check Admin Status for walterjonesjr@gmail.com
-- Run this in Supabase SQL Editor to see what's happening

-- 1. Check if user exists in auth.users
SELECT 'AUTH USER CHECK' as check_type;
SELECT id, email, created_at 
FROM auth.users 
WHERE email = 'walterjonesjr@gmail.com';

-- 2. Check user_roles table structure
SELECT 'USER_ROLES TABLE STRUCTURE' as check_type;
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'user_roles'
ORDER BY ordinal_position;

-- 3. Check constraints on user_roles
SELECT 'USER_ROLES CONSTRAINTS' as check_type;
SELECT conname, contype, pg_get_constraintdef(oid) as definition
FROM pg_constraint 
WHERE conrelid = 'public.user_roles'::regclass;

-- 4. Check all rows in user_roles table
SELECT 'ALL USER_ROLES ROWS' as check_type;
SELECT ur.*, u.email 
FROM public.user_roles ur
LEFT JOIN auth.users u ON ur.user_id = u.id;

-- 5. Check specifically for Walter's admin status
SELECT 'WALTER ADMIN CHECK' as check_type;
SELECT ur.*, u.email 
FROM public.user_roles ur
JOIN auth.users u ON ur.user_id = u.id
WHERE u.email = 'walterjonesjr@gmail.com';

-- 6. Try to insert/update Walter as admin (safe approach)
DO $$
DECLARE
    walter_id UUID;
    existing_role TEXT;
BEGIN
    -- Get Walter's user ID
    SELECT id INTO walter_id 
    FROM auth.users 
    WHERE email = 'walterjonesjr@gmail.com';
    
    IF walter_id IS NOT NULL THEN
        RAISE NOTICE 'Found Walter with ID: %', walter_id;
        
        -- Check if he already has a role
        SELECT role INTO existing_role 
        FROM public.user_roles 
        WHERE user_id = walter_id;
        
        IF existing_role IS NOT NULL THEN
            RAISE NOTICE 'Walter current role: %', existing_role;
            -- Update to admin
            UPDATE public.user_roles 
            SET role = 'admin', updated_at = NOW()
            WHERE user_id = walter_id;
            RAISE NOTICE 'Updated Walter to admin role';
        ELSE
            RAISE NOTICE 'Walter has no role, inserting admin';
            -- Insert as admin
            INSERT INTO public.user_roles (user_id, role)
            VALUES (walter_id, 'admin');
            RAISE NOTICE 'Inserted Walter as admin';
        END IF;
    ELSE
        RAISE NOTICE 'Walter not found in auth.users!';
    END IF;
END $$;

-- 7. Final verification
SELECT 'FINAL VERIFICATION' as check_type;
SELECT ur.*, u.email 
FROM public.user_roles ur
JOIN auth.users u ON ur.user_id = u.id
WHERE u.email = 'walterjonesjr@gmail.com';
