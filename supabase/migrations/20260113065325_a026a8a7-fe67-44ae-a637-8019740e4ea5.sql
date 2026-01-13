-- Fix permissive RLS policy on ticket_categories
-- Drop the "FOR ALL" policy and replace with specific policies

DROP POLICY IF EXISTS "Tenants can manage their ticket categories" ON public.ticket_categories;

CREATE POLICY "Tenants can insert their ticket categories" 
ON public.ticket_categories FOR INSERT 
WITH CHECK (
  tenant_id IN (SELECT tenant_id FROM public.tenant_users WHERE user_id = auth.uid())
  OR public.is_super_admin()
);

CREATE POLICY "Tenants can update their ticket categories" 
ON public.ticket_categories FOR UPDATE 
USING (
  tenant_id IN (SELECT tenant_id FROM public.tenant_users WHERE user_id = auth.uid())
  OR public.is_super_admin()
);

CREATE POLICY "Tenants can delete their ticket categories" 
ON public.ticket_categories FOR DELETE 
USING (
  tenant_id IN (SELECT tenant_id FROM public.tenant_users WHERE user_id = auth.uid())
  OR public.is_super_admin()
);