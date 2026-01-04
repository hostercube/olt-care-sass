-- Fix RLS policies for Super Admin global tables
-- These tables are managed by Super Admins and don't have tenant_id

-- ============================================
-- 1. FIX sms_templates TABLE RLS
-- ============================================
DROP POLICY IF EXISTS "Super admins can manage sms templates" ON public.sms_templates;
DROP POLICY IF EXISTS "Super admins can manage SMS templates" ON public.sms_templates;
DROP POLICY IF EXISTS "sms_templates_access" ON public.sms_templates;
DROP POLICY IF EXISTS "Tenants can view own sms_templates" ON public.sms_templates;

-- Super admins full access (SELECT, INSERT, UPDATE, DELETE)
CREATE POLICY "Super admins full access sms_templates" 
ON public.sms_templates FOR ALL
USING (is_super_admin())
WITH CHECK (is_super_admin());

-- Tenants can view their own templates (tenant_id based) or global templates (tenant_id IS NULL)
CREATE POLICY "Tenants can view sms_templates" 
ON public.sms_templates FOR SELECT
USING (
  auth.uid() IS NOT NULL 
  AND (tenant_id IS NULL OR tenant_id IN (SELECT get_user_tenant_ids()))
);

-- Tenants can manage their own templates only
CREATE POLICY "Tenants can manage own sms_templates" 
ON public.sms_templates FOR ALL
USING (
  auth.uid() IS NOT NULL 
  AND tenant_id IS NOT NULL 
  AND tenant_id IN (SELECT get_user_tenant_ids())
)
WITH CHECK (
  auth.uid() IS NOT NULL 
  AND tenant_id IS NOT NULL 
  AND tenant_id IN (SELECT get_user_tenant_ids())
);

-- ============================================
-- 2. FIX email_templates TABLE RLS
-- ============================================
DROP POLICY IF EXISTS "Super admins can manage email templates" ON public.email_templates;
DROP POLICY IF EXISTS "email_templates_access" ON public.email_templates;

-- Super admins full access 
CREATE POLICY "Super admins full access email_templates" 
ON public.email_templates FOR ALL
USING (is_super_admin())
WITH CHECK (is_super_admin());

-- Anyone authenticated can read email templates (global templates)
CREATE POLICY "Authenticated can read email_templates" 
ON public.email_templates FOR SELECT
USING (auth.uid() IS NOT NULL);

-- ============================================
-- 3. FIX packages TABLE RLS
-- ============================================
DROP POLICY IF EXISTS "Super admins can manage packages" ON public.packages;
DROP POLICY IF EXISTS "packages_access" ON public.packages;
DROP POLICY IF EXISTS "Public can read packages" ON public.packages;
DROP POLICY IF EXISTS "Anyone can read packages" ON public.packages;

-- Super admins full access 
CREATE POLICY "Super admins full access packages" 
ON public.packages FOR ALL
USING (is_super_admin())
WITH CHECK (is_super_admin());

-- Anyone can read packages (public for pricing pages)
CREATE POLICY "Anyone can read packages" 
ON public.packages FOR SELECT
USING (true);

-- ============================================
-- 4. FIX sms_gateway_settings TABLE RLS
-- ============================================
DROP POLICY IF EXISTS "Super admins can manage sms gateway" ON public.sms_gateway_settings;
DROP POLICY IF EXISTS "sms_gateway_settings_access" ON public.sms_gateway_settings;

-- Super admins full access 
CREATE POLICY "Super admins full access sms_gateway_settings" 
ON public.sms_gateway_settings FOR ALL
USING (is_super_admin())
WITH CHECK (is_super_admin());

-- ============================================
-- 5. FIX payment_gateway_settings TABLE RLS
-- ============================================
DROP POLICY IF EXISTS "Super admins can manage payment gateways" ON public.payment_gateway_settings;
DROP POLICY IF EXISTS "payment_gateway_settings_access" ON public.payment_gateway_settings;

-- Super admins full access 
CREATE POLICY "Super admins full access payment_gateway_settings" 
ON public.payment_gateway_settings FOR ALL
USING (is_super_admin())
WITH CHECK (is_super_admin());

-- ============================================
-- 6. FIX email_gateway_settings TABLE RLS (if needed)
-- ============================================
DROP POLICY IF EXISTS "Super admins can manage email gateway" ON public.email_gateway_settings;
DROP POLICY IF EXISTS "email_gateway_settings_access" ON public.email_gateway_settings;

-- Super admins full access 
CREATE POLICY "Super admins full access email_gateway_settings" 
ON public.email_gateway_settings FOR ALL
USING (is_super_admin())
WITH CHECK (is_super_admin());

-- ============================================
-- 7. FIX sms_logs TABLE RLS (for global SMS)
-- ============================================
DROP POLICY IF EXISTS "Super admins can manage sms_logs" ON public.sms_logs;
DROP POLICY IF EXISTS "sms_logs_tenant_access" ON public.sms_logs;

-- Super admins full access
CREATE POLICY "Super admins full access sms_logs" 
ON public.sms_logs FOR ALL
USING (is_super_admin())
WITH CHECK (is_super_admin());

-- Tenants can manage their own logs
CREATE POLICY "Tenants can manage sms_logs" 
ON public.sms_logs FOR ALL
USING (
  auth.uid() IS NOT NULL 
  AND (tenant_id IS NULL OR tenant_id IN (SELECT get_user_tenant_ids()))
)
WITH CHECK (
  auth.uid() IS NOT NULL
);

-- ============================================
-- 8. FIX email_logs TABLE RLS (for global emails)
-- ============================================
DROP POLICY IF EXISTS "Super admins can view all email logs" ON public.email_logs;
DROP POLICY IF EXISTS "Tenants can view own email logs" ON public.email_logs;
DROP POLICY IF EXISTS "email_logs_tenant_access" ON public.email_logs;

-- Super admins full access
CREATE POLICY "Super admins full access email_logs" 
ON public.email_logs FOR ALL
USING (is_super_admin())
WITH CHECK (is_super_admin());

-- Tenants can manage their own logs
CREATE POLICY "Tenants can manage email_logs" 
ON public.email_logs FOR ALL
USING (
  auth.uid() IS NOT NULL 
  AND (tenant_id IS NULL OR tenant_id IN (SELECT get_user_tenant_ids()))
)
WITH CHECK (
  auth.uid() IS NOT NULL
);

-- ============================================
-- 9. FIX tenants TABLE RLS
-- ============================================
DROP POLICY IF EXISTS "Super admins can manage tenants" ON public.tenants;
DROP POLICY IF EXISTS "tenants_access" ON public.tenants;
DROP POLICY IF EXISTS "Super admins full access tenants" ON public.tenants;
DROP POLICY IF EXISTS "Tenant users can view own tenant" ON public.tenants;

-- Super admins full access
CREATE POLICY "Super admins full access tenants" 
ON public.tenants FOR ALL
USING (is_super_admin())
WITH CHECK (is_super_admin());

-- Tenant members can view their own tenant
CREATE POLICY "Tenant users can view own tenant" 
ON public.tenants FOR SELECT
USING (
  auth.uid() IS NOT NULL 
  AND id IN (SELECT get_user_tenant_ids())
);

-- ============================================
-- 10. FIX subscriptions TABLE RLS
-- ============================================
DROP POLICY IF EXISTS "Super admins can manage subscriptions" ON public.subscriptions;
DROP POLICY IF EXISTS "subscriptions_access" ON public.subscriptions;
DROP POLICY IF EXISTS "Super admins full access subscriptions" ON public.subscriptions;
DROP POLICY IF EXISTS "Tenants can view own subscriptions" ON public.subscriptions;

-- Super admins full access
CREATE POLICY "Super admins full access subscriptions" 
ON public.subscriptions FOR ALL
USING (is_super_admin())
WITH CHECK (is_super_admin());

-- Tenant users can view their own subscriptions
CREATE POLICY "Tenants can view own subscriptions" 
ON public.subscriptions FOR SELECT
USING (
  auth.uid() IS NOT NULL 
  AND tenant_id IN (SELECT get_user_tenant_ids())
);

-- ============================================
-- 11. FIX payments TABLE RLS (SaaS payments)
-- ============================================
DROP POLICY IF EXISTS "Super admins can manage payments" ON public.payments;
DROP POLICY IF EXISTS "payments_access" ON public.payments;
DROP POLICY IF EXISTS "Super admins full access payments" ON public.payments;
DROP POLICY IF EXISTS "Tenants can view own payments" ON public.payments;

-- Super admins full access
CREATE POLICY "Super admins full access payments" 
ON public.payments FOR ALL
USING (is_super_admin())
WITH CHECK (is_super_admin());

-- Tenant users can view their own payments
CREATE POLICY "Tenants can view own payments" 
ON public.payments FOR SELECT
USING (
  auth.uid() IS NOT NULL 
  AND tenant_id IN (SELECT get_user_tenant_ids())
);

-- Tenants can insert their own payments
CREATE POLICY "Tenants can insert own payments" 
ON public.payments FOR INSERT
WITH CHECK (
  auth.uid() IS NOT NULL 
  AND tenant_id IN (SELECT get_user_tenant_ids())
);

-- ============================================
-- 12. FIX invoices TABLE RLS
-- ============================================
DROP POLICY IF EXISTS "Super admins can manage invoices" ON public.invoices;
DROP POLICY IF EXISTS "invoices_access" ON public.invoices;
DROP POLICY IF EXISTS "Super admins full access invoices" ON public.invoices;
DROP POLICY IF EXISTS "Tenants can view own invoices" ON public.invoices;
DROP POLICY IF EXISTS "invoices_tenant_access" ON public.invoices;

-- Super admins full access
CREATE POLICY "Super admins full access invoices" 
ON public.invoices FOR ALL
USING (is_super_admin())
WITH CHECK (is_super_admin());

-- Tenant users can view their own invoices
CREATE POLICY "Tenants can view own invoices" 
ON public.invoices FOR SELECT
USING (
  auth.uid() IS NOT NULL 
  AND tenant_id IN (SELECT get_user_tenant_ids())
);