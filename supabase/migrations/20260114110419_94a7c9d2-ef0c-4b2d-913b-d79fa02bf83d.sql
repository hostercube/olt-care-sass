-- Add public SELECT policy for customer authentication (PPPoE login)
-- This allows unauthenticated users to verify credentials during login
CREATE POLICY "Allow public customer authentication lookup"
ON public.customers
FOR SELECT
USING (true);

-- Note: This policy only allows SELECT, not INSERT/UPDATE/DELETE
-- The existing tenant-scoped policies still protect write operations