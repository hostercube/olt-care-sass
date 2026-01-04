-- Fix tenants INSERT policy - allow authenticated users to insert during signup
DROP POLICY IF EXISTS "Users can create tenant during signup" ON public.tenants;

CREATE POLICY "Users can create tenant during signup"
ON public.tenants
FOR INSERT
TO authenticated
WITH CHECK (owner_user_id = auth.uid());

-- Also allow public insert for signup flow (before user is fully authenticated)
CREATE POLICY "Allow tenant creation during signup"
ON public.tenants
FOR INSERT
TO anon, authenticated
WITH CHECK (true);