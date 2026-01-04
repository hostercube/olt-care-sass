-- Fix payments RLS policies - add WITH CHECK for super admins
DROP POLICY IF EXISTS "Super admins can manage all payments" ON public.payments;

-- Update the super admins full access policy to have proper WITH CHECK
DROP POLICY IF EXISTS "Super admins full access payments" ON public.payments;
CREATE POLICY "Super admins full access payments" 
ON public.payments
FOR ALL 
USING (public.is_super_admin())
WITH CHECK (public.is_super_admin());

-- Add UPDATE policy for super admins (explicit)
DROP POLICY IF EXISTS "Super admins can update payments" ON public.payments;
CREATE POLICY "Super admins can update payments" 
ON public.payments
FOR UPDATE 
USING (public.is_super_admin())
WITH CHECK (public.is_super_admin());

-- Add DELETE policy for super admins
DROP POLICY IF EXISTS "Super admins can delete payments" ON public.payments;
CREATE POLICY "Super admins can delete payments" 
ON public.payments
FOR DELETE 
USING (public.is_super_admin());