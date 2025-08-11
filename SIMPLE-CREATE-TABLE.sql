-- SIMPLE SQL TO CREATE admin_messages TABLE
-- Copy and paste EXACTLY this into Supabase SQL Editor and click RUN

CREATE TABLE admin_messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  from_admin_id UUID NOT NULL,
  to_user_id UUID NOT NULL, 
  subject TEXT NOT NULL,
  message TEXT NOT NULL,
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- This will show success message if it worked
SELECT 'Table created successfully!' as result;
