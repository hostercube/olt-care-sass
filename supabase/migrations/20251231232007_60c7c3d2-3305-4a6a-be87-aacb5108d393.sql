-- Fix profiles SELECT policies - change from RESTRICTIVE to PERMISSIVE
-- Currently both 'Admins can view all profiles' and 'Users can view own profile' 
-- are RESTRICTIVE which means BOTH conditions must match (AND logic)
-- We need PERMISSIVE so ANY condition can match (OR logic)

-- Drop existing policies
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;

-- Create new PERMISSIVE policies (default is PERMISSIVE)
CREATE POLICY "Users can view own profile"
ON public.profiles
FOR SELECT
USING (id = auth.uid());

CREATE POLICY "Admins can view all profiles"
ON public.profiles
FOR SELECT
USING (has_role(auth.uid(), 'admin'));

-- Also fix user_roles SELECT policy similarly
DROP POLICY IF EXISTS "Users can view own roles" ON public.user_roles;

CREATE POLICY "Users can view own roles"
ON public.user_roles
FOR SELECT
USING (user_id = auth.uid());

CREATE POLICY "Admins can view all roles"
ON public.user_roles
FOR SELECT
USING (has_role(auth.uid(), 'admin'));