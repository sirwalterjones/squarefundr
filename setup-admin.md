# Admin Setup Guide for SquareFundr

Follow these steps to set up your admin account for **walterjonesjr@gmail.com**:

## Step 1: Run the Basic Setup SQL

1. Go to your Supabase project dashboard
2. Navigate to **SQL Editor**
3. Copy and paste the contents of `admin-setup.sql` and run it
4. This will create the system user and role management tables

## Step 2: Create Your Admin Account

1. Make sure your dev server is running: `npx next dev --port 3000`
2. Go to **http://localhost:3000/auth**
3. Click **"Don't have an account? Sign up"**
4. Fill in:
   - **Email**: `walterjonesjr@gmail.com`
   - **Password**: (choose a secure password)
   - **Full Name**: `Walter Jones Jr`
5. Click **"Create Account"**
6. You should see a success message and be redirected

## Step 3: Get Your User ID and Grant Admin Rights

1. Go back to Supabase SQL Editor
2. Run this query to find your user ID:

```sql
SELECT id, email, created_at 
FROM auth.users 
WHERE email = 'walterjonesjr@gmail.com';
```

3. Copy the `id` value (it will be a UUID like `123e4567-e89b-12d3-a456-426614174000`)

4. Run this SQL to grant admin rights (replace `YOUR_ACTUAL_USER_ID` with the ID from step 3):

```sql
-- First, create your user profile in public.users (if not already created by signup)
INSERT INTO public.users (id, email, full_name, created_at, updated_at)
SELECT id, email, raw_user_meta_data->>'full_name', created_at, NOW()
FROM auth.users 
WHERE email = 'walterjonesjr@gmail.com'
ON CONFLICT (id) DO UPDATE SET
  email = EXCLUDED.email,
  full_name = EXCLUDED.full_name,
  updated_at = NOW();

-- Grant admin role
INSERT INTO public.user_roles (user_id, role) 
SELECT id, 'admin'
FROM auth.users 
WHERE email = 'walterjonesjr@gmail.com'
ON CONFLICT (user_id) DO UPDATE SET role = 'admin';
```

## Step 4: Test Your Setup

1. Go to **http://localhost:3000/auth** and log in with your credentials
2. Go to **http://localhost:3000/create** to create a campaign
3. The campaign should now create successfully in the database!

## Troubleshooting

### If you get "Authentication required" errors:
- Make sure you're logged in at `/auth`
- Check that your `.env.local` file has the correct Supabase credentials

### If you get foreign key constraint errors:
- Make sure you ran the `admin-setup.sql` first
- Ensure your user account was created successfully via the signup form

### If you get "Could not find column" errors:
- Make sure you ran the complete `supabase-schema.sql` to create all tables
- Check that your database schema matches what the API expects

## Current Status
- ✅ System user created (for API operations)
- ✅ Role management system in place  
- ✅ Authentication APIs working
- ✅ Campaign creation API ready
- 🔄 Admin account setup (follow steps above)

After completing these steps, you'll be able to create real campaigns that are stored in your Supabase database! 