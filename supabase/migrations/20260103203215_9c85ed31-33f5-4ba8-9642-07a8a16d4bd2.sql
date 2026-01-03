-- Critical Tables RLS Policies - Part 2 (Network and Gateway - Fixed)

-- 16. OLTs - Tenant isolated (CRITICAL - network credentials)
DROP POLICY IF EXISTS "olts_tenant_access" ON olts;
DROP POLICY IF EXISTS "Tenant users can view OLTs" ON olts;

CREATE POLICY "olts_tenant_access" ON olts
  FOR ALL USING (
    auth.uid() IS NOT NULL AND (
      tenant_id IN (SELECT public.get_user_tenant_ids())
      OR public.is_super_admin()
    )
  );

-- 17. MikroTik Routers - Tenant isolated (CRITICAL - router credentials)
DROP POLICY IF EXISTS "mikrotik_routers_tenant_access" ON mikrotik_routers;

CREATE POLICY "mikrotik_routers_tenant_access" ON mikrotik_routers
  FOR ALL USING (
    auth.uid() IS NOT NULL AND (
      tenant_id IN (SELECT public.get_user_tenant_ids())
      OR public.is_super_admin()
    )
  );

-- 18. PPPoE Profiles - Tenant isolated
DROP POLICY IF EXISTS "pppoe_profiles_tenant_access" ON pppoe_profiles;

CREATE POLICY "pppoe_profiles_tenant_access" ON pppoe_profiles
  FOR ALL USING (
    auth.uid() IS NOT NULL AND (
      tenant_id IN (SELECT public.get_user_tenant_ids())
      OR public.is_super_admin()
    )
  );

-- 19. Activity Logs - Tenant isolated
DROP POLICY IF EXISTS "activity_logs_tenant_access" ON activity_logs;

CREATE POLICY "activity_logs_tenant_access" ON activity_logs
  FOR ALL USING (
    auth.uid() IS NOT NULL AND (
      tenant_id IN (SELECT public.get_user_tenant_ids())
      OR public.is_super_admin()
    )
  );

-- 20. Email Gateway Settings - Super Admin only
DROP POLICY IF EXISTS "email_gateway_settings_access" ON email_gateway_settings;

CREATE POLICY "email_gateway_settings_access" ON email_gateway_settings
  FOR ALL USING (public.is_super_admin());

-- 21. Tenant Email Gateways - Tenant isolated
DROP POLICY IF EXISTS "tenant_email_gateways_access" ON tenant_email_gateways;

CREATE POLICY "tenant_email_gateways_access" ON tenant_email_gateways
  FOR ALL USING (
    auth.uid() IS NOT NULL AND (
      tenant_id IN (SELECT public.get_user_tenant_ids())
      OR public.is_super_admin()
    )
  );

-- 22. SMS Gateway Settings - Super Admin only
DROP POLICY IF EXISTS "sms_gateway_settings_access" ON sms_gateway_settings;

CREATE POLICY "sms_gateway_settings_access" ON sms_gateway_settings
  FOR ALL USING (public.is_super_admin());

-- 23. Tenant SMS Gateways - Tenant isolated
DROP POLICY IF EXISTS "tenant_sms_gateways_access" ON tenant_sms_gateways;

CREATE POLICY "tenant_sms_gateways_access" ON tenant_sms_gateways
  FOR ALL USING (
    auth.uid() IS NOT NULL AND (
      tenant_id IN (SELECT public.get_user_tenant_ids())
      OR public.is_super_admin()
    )
  );

-- 24. Tenant Payment Gateways - Tenant isolated
DROP POLICY IF EXISTS "tenant_payment_gateways_access" ON tenant_payment_gateways;

CREATE POLICY "tenant_payment_gateways_access" ON tenant_payment_gateways
  FOR ALL USING (
    auth.uid() IS NOT NULL AND (
      tenant_id IN (SELECT public.get_user_tenant_ids())
      OR public.is_super_admin()
    )
  );

-- 25. ONUs - Access via OLT tenant (olt_id -> olts.tenant_id)
DROP POLICY IF EXISTS "onus_tenant_access" ON onus;

CREATE POLICY "onus_tenant_access" ON onus
  FOR ALL USING (
    auth.uid() IS NOT NULL AND (
      olt_id IN (SELECT id FROM olts WHERE tenant_id IN (SELECT public.get_user_tenant_ids()))
      OR public.is_super_admin()
    )
  );

-- 26. Alerts - Tenant isolated
DROP POLICY IF EXISTS "alerts_tenant_access" ON alerts;

CREATE POLICY "alerts_tenant_access" ON alerts
  FOR ALL USING (
    auth.uid() IS NOT NULL AND (
      tenant_id IN (SELECT public.get_user_tenant_ids())
      OR public.is_super_admin()
    )
  );

-- 27. Areas - Tenant isolated
DROP POLICY IF EXISTS "areas_tenant_access" ON areas;

CREATE POLICY "areas_tenant_access" ON areas
  FOR ALL USING (
    auth.uid() IS NOT NULL AND (
      tenant_id IN (SELECT public.get_user_tenant_ids())
      OR public.is_super_admin()
    )
  );

-- 28. ISP Packages - Tenant isolated
DROP POLICY IF EXISTS "isp_packages_tenant_access" ON isp_packages;

CREATE POLICY "isp_packages_tenant_access" ON isp_packages
  FOR ALL USING (
    auth.uid() IS NOT NULL AND (
      tenant_id IN (SELECT public.get_user_tenant_ids())
      OR public.is_super_admin()
    )
  );

-- 29. Customer Bills - Tenant isolated
DROP POLICY IF EXISTS "customer_bills_tenant_access" ON customer_bills;

CREATE POLICY "customer_bills_tenant_access" ON customer_bills
  FOR ALL USING (
    auth.uid() IS NOT NULL AND (
      tenant_id IN (SELECT public.get_user_tenant_ids())
      OR public.is_super_admin()
    )
  );

-- 30. Customer Recharges - Tenant isolated
DROP POLICY IF EXISTS "customer_recharges_tenant_access" ON customer_recharges;

CREATE POLICY "customer_recharges_tenant_access" ON customer_recharges
  FOR ALL USING (
    auth.uid() IS NOT NULL AND (
      tenant_id IN (SELECT public.get_user_tenant_ids())
      OR public.is_super_admin()
    )
  );