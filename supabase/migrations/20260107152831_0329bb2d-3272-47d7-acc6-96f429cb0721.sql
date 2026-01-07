-- Fix overly permissive RLS policies (no USING/WITH CHECK true)

-- alerts: restrict writes to the current user's tenant
DROP POLICY IF EXISTS "Authenticated users can update alerts" ON public.alerts;
DROP POLICY IF EXISTS "Authenticated users can delete alerts" ON public.alerts;
DROP POLICY IF EXISTS "System can insert alerts" ON public.alerts;

CREATE POLICY "Tenant members can insert alerts"
ON public.alerts
FOR INSERT
TO authenticated
WITH CHECK (tenant_id = public.get_user_tenant_id());

CREATE POLICY "Tenant members can update alerts"
ON public.alerts
FOR UPDATE
TO authenticated
USING (tenant_id = public.get_user_tenant_id())
WITH CHECK (tenant_id = public.get_user_tenant_id());

CREATE POLICY "Tenant members can delete alerts"
ON public.alerts
FOR DELETE
TO authenticated
USING (tenant_id = public.get_user_tenant_id());

-- Internal telemetry tables should not accept client inserts; service role bypasses RLS anyway.
DROP POLICY IF EXISTS "System can insert device health history" ON public.device_health_history;
DROP POLICY IF EXISTS "System can insert status history" ON public.onu_status_history;
DROP POLICY IF EXISTS "System can insert power readings" ON public.power_readings;

-- tenants: allow insert only for authenticated users (during signup/tenant creation)
DROP POLICY IF EXISTS "Allow tenant creation during signup" ON public.tenants;

CREATE POLICY "Authenticated users can create tenant"
ON public.tenants
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() IS NOT NULL);
