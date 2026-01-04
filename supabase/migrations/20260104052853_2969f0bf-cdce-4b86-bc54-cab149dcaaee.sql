-- Drop remaining policies that weren't dropped before
DROP POLICY IF EXISTS "Tenants can manage own sms_templates" ON public.sms_templates;
DROP POLICY IF EXISTS "Public can view active tenants" ON public.tenants;

-- SMS Templates: Super admins can manage, tenants can view their own or global
CREATE POLICY "Tenants can manage own sms_templates"
ON public.sms_templates FOR ALL
USING (
  auth.uid() IS NOT NULL 
  AND (tenant_id IN (SELECT get_user_tenant_ids()) OR tenant_id IS NULL)
)
WITH CHECK (
  auth.uid() IS NOT NULL 
  AND tenant_id IN (SELECT get_user_tenant_ids())
);

-- Public view for active tenants
CREATE POLICY "Public can view active tenants"
ON public.tenants FOR SELECT
USING (status = 'active');