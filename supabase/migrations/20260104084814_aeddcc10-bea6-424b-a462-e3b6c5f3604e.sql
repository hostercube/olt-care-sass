-- Drop existing policies on system_settings
DROP POLICY IF EXISTS "Admins can manage settings" ON public.system_settings;
DROP POLICY IF EXISTS "Authenticated users can view settings" ON public.system_settings;

-- Create proper policies for system_settings
-- Super admins can do anything
CREATE POLICY "Super admins can manage system_settings" 
ON public.system_settings
FOR ALL 
USING (public.is_super_admin())
WITH CHECK (public.is_super_admin());

-- Authenticated users can read settings
CREATE POLICY "Authenticated can read system_settings" 
ON public.system_settings
FOR SELECT 
USING (auth.uid() IS NOT NULL);