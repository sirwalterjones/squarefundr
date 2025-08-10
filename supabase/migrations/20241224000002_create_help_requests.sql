-- Create help_requests table for contact/support form submissions
CREATE TABLE help_requests (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    subject TEXT NOT NULL,
    message TEXT NOT NULL,
    status TEXT DEFAULT 'new' CHECK (status IN ('new', 'in_progress', 'resolved', 'closed')),
    priority TEXT DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    resolved_at TIMESTAMP WITH TIME ZONE,
    notes TEXT -- Admin notes/responses
);

-- Enable RLS
ALTER TABLE help_requests ENABLE ROW LEVEL SECURITY;

-- Create policy for inserting help requests (anyone can submit)
CREATE POLICY "Anyone can submit help requests" ON help_requests
    FOR INSERT 
    WITH CHECK (true);

-- Create policy for viewing help requests (only admins)
CREATE POLICY "Admins can view all help requests" ON help_requests
    FOR SELECT 
    USING (
        EXISTS (
            SELECT 1 FROM user_roles 
            WHERE user_roles.user_id = auth.uid() 
            AND user_roles.role = 'admin'
        )
    );

-- Create policy for updating help requests (only admins)
CREATE POLICY "Admins can update help requests" ON help_requests
    FOR UPDATE 
    USING (
        EXISTS (
            SELECT 1 FROM user_roles 
            WHERE user_roles.user_id = auth.uid() 
            AND user_roles.role = 'admin'
        )
    );

-- Create index for performance
CREATE INDEX idx_help_requests_status ON help_requests(status);
CREATE INDEX idx_help_requests_created_at ON help_requests(created_at DESC);
CREATE INDEX idx_help_requests_priority ON help_requests(priority);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_help_requests_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update updated_at
CREATE TRIGGER help_requests_updated_at
    BEFORE UPDATE ON help_requests
    FOR EACH ROW
    EXECUTE FUNCTION update_help_requests_updated_at();
