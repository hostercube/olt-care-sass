-- Fix overly permissive RLS policies - step by step

-- 1. Fix reseller_roles - require tenant access
DROP POLICY IF EXISTS "Tenant users can manage reseller roles" ON public.reseller_roles;
DROP POLICY IF EXISTS "Tenant users can view reseller roles" ON public.reseller_roles;

CREATE POLICY "Tenant users can manage reseller roles" ON public.reseller_roles
  FOR ALL USING (
    auth.uid() IS NOT NULL AND (
      reseller_roles.tenant_id IN (SELECT get_user_tenant_ids()) OR is_super_admin()
    )
  );

-- 2. Fix connection_requests public insert - require tenant_id
DROP POLICY IF EXISTS "Public can create connection_requests for landing page" ON public.connection_requests;

CREATE POLICY "Public can create connection_requests for landing page" ON public.connection_requests
  FOR INSERT WITH CHECK (
    connection_requests.tenant_id IS NOT NULL AND 
    connection_requests.customer_name IS NOT NULL AND 
    connection_requests.phone IS NOT NULL
  );

-- 3. Secure payment_gateway_settings - only super admins (no tenant_id column)
DROP POLICY IF EXISTS "Anyone can read payment gateways" ON public.payment_gateway_settings;
DROP POLICY IF EXISTS "payment_gateway_settings_public_read" ON public.payment_gateway_settings;

CREATE POLICY "Only super admins can view payment gateways" ON public.payment_gateway_settings
  FOR SELECT USING (is_super_admin());

-- 4. Secure email_gateway_settings (no tenant_id - super admin only)
DROP POLICY IF EXISTS "Anyone can read email gateways" ON public.email_gateway_settings;
DROP POLICY IF EXISTS "email_gateway_settings_public_read" ON public.email_gateway_settings;
DROP POLICY IF EXISTS "Authenticated admins can view email gateways" ON public.email_gateway_settings;

CREATE POLICY "Only super admins can view email gateways" ON public.email_gateway_settings
  FOR SELECT USING (is_super_admin());

-- 5. Secure sms_gateway_settings (no tenant_id - super admin only)
DROP POLICY IF EXISTS "Anyone can read sms gateways" ON public.sms_gateway_settings;
DROP POLICY IF EXISTS "sms_gateway_settings_public_read" ON public.sms_gateway_settings;
DROP POLICY IF EXISTS "Authenticated admins can view sms gateways" ON public.sms_gateway_settings;

CREATE POLICY "Only super admins can view sms gateways" ON public.sms_gateway_settings
  FOR SELECT USING (is_super_admin());