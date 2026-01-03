-- Critical Tables RLS Policies - Part 1

-- 1. Payment Gateway Settings - Super Admin only
DROP POLICY IF EXISTS "payment_gateway_settings_select" ON payment_gateway_settings;
DROP POLICY IF EXISTS "payment_gateway_settings_insert" ON payment_gateway_settings;
DROP POLICY IF EXISTS "payment_gateway_settings_update" ON payment_gateway_settings;
DROP POLICY IF EXISTS "payment_gateway_settings_delete" ON payment_gateway_settings;
DROP POLICY IF EXISTS "payment_gateway_settings_all" ON payment_gateway_settings;
DROP POLICY IF EXISTS "payment_gateway_settings_admin" ON payment_gateway_settings;

CREATE POLICY "payment_gateway_settings_admin" ON payment_gateway_settings
  FOR ALL USING (public.is_super_admin());

-- 2. Tenants - Users can see their own tenant
DROP POLICY IF EXISTS "tenants_select_own" ON tenants;
DROP POLICY IF EXISTS "Users can view their own tenant" ON tenants;

CREATE POLICY "tenants_access" ON tenants
  FOR SELECT USING (
    auth.uid() IS NOT NULL AND (
      id IN (SELECT public.get_user_tenant_ids())
      OR public.is_super_admin()
    )
  );

-- 3. Customers - Tenant isolated
DROP POLICY IF EXISTS "customers_tenant_select" ON customers;
DROP POLICY IF EXISTS "customers_tenant_insert" ON customers;
DROP POLICY IF EXISTS "customers_tenant_update" ON customers;
DROP POLICY IF EXISTS "customers_tenant_delete" ON customers;
DROP POLICY IF EXISTS "Tenant users can view customers" ON customers;
DROP POLICY IF EXISTS "customers_tenant_all" ON customers;

CREATE POLICY "customers_tenant_all" ON customers
  FOR ALL USING (
    auth.uid() IS NOT NULL AND (
      tenant_id IN (SELECT public.get_user_tenant_ids())
      OR public.is_super_admin()
    )
  );

-- 4. Connection Requests
DROP POLICY IF EXISTS "connection_requests_tenant_access" ON connection_requests;

CREATE POLICY "connection_requests_tenant_access" ON connection_requests
  FOR ALL USING (
    auth.uid() IS NOT NULL AND (
      tenant_id IN (SELECT public.get_user_tenant_ids())
      OR public.is_super_admin()
    )
  );

-- 5. Employees
DROP POLICY IF EXISTS "employees_tenant_access" ON employees;

CREATE POLICY "employees_tenant_access" ON employees
  FOR ALL USING (
    auth.uid() IS NOT NULL AND (
      tenant_id IN (SELECT public.get_user_tenant_ids())
      OR public.is_super_admin()
    )
  );

-- 6. Staff
DROP POLICY IF EXISTS "staff_tenant_access" ON staff;

CREATE POLICY "staff_tenant_access" ON staff
  FOR ALL USING (
    auth.uid() IS NOT NULL AND (
      tenant_id IN (SELECT public.get_user_tenant_ids())
      OR public.is_super_admin()
    )
  );

-- 7. Resellers
DROP POLICY IF EXISTS "resellers_tenant_access" ON resellers;

CREATE POLICY "resellers_tenant_access" ON resellers
  FOR ALL USING (
    auth.uid() IS NOT NULL AND (
      tenant_id IN (SELECT public.get_user_tenant_ids())
      OR public.is_super_admin()
    )
  );

-- 8. Finance Transactions
DROP POLICY IF EXISTS "finance_transactions_tenant_access" ON finance_transactions;

CREATE POLICY "finance_transactions_tenant_access" ON finance_transactions
  FOR ALL USING (
    auth.uid() IS NOT NULL AND (
      tenant_id IN (SELECT public.get_user_tenant_ids())
      OR public.is_super_admin()
    )
  );

-- 9. Bank Accounts
DROP POLICY IF EXISTS "bank_accounts_tenant_access" ON bank_accounts;

CREATE POLICY "bank_accounts_tenant_access" ON bank_accounts
  FOR ALL USING (
    auth.uid() IS NOT NULL AND (
      tenant_id IN (SELECT public.get_user_tenant_ids())
      OR public.is_super_admin()
    )
  );

-- 10. Customer Payments
DROP POLICY IF EXISTS "customer_payments_tenant_access" ON customer_payments;

CREATE POLICY "customer_payments_tenant_access" ON customer_payments
  FOR ALL USING (
    auth.uid() IS NOT NULL AND (
      tenant_id IN (SELECT public.get_user_tenant_ids())
      OR public.is_super_admin()
    )
  );

-- 11. bKash Payments
DROP POLICY IF EXISTS "bkash_payments_tenant_access" ON bkash_payments;

CREATE POLICY "bkash_payments_tenant_access" ON bkash_payments
  FOR ALL USING (
    auth.uid() IS NOT NULL AND (
      tenant_id IN (SELECT public.get_user_tenant_ids())
      OR public.is_super_admin()
    )
  );

-- 12. Salary Payments
DROP POLICY IF EXISTS "salary_payments_tenant_access" ON salary_payments;

CREATE POLICY "salary_payments_tenant_access" ON salary_payments
  FOR ALL USING (
    auth.uid() IS NOT NULL AND (
      tenant_id IN (SELECT public.get_user_tenant_ids())
      OR public.is_super_admin()
    )
  );

-- 13. Monthly Salaries
DROP POLICY IF EXISTS "monthly_salaries_tenant_access" ON monthly_salaries;

CREATE POLICY "monthly_salaries_tenant_access" ON monthly_salaries
  FOR ALL USING (
    auth.uid() IS NOT NULL AND (
      tenant_id IN (SELECT public.get_user_tenant_ids())
      OR public.is_super_admin()
    )
  );

-- 14. Investments
DROP POLICY IF EXISTS "investments_tenant_access" ON investments;

CREATE POLICY "investments_tenant_access" ON investments
  FOR ALL USING (
    auth.uid() IS NOT NULL AND (
      tenant_id IN (SELECT public.get_user_tenant_ids())
      OR public.is_super_admin()
    )
  );

-- 15. Suppliers
DROP POLICY IF EXISTS "suppliers_tenant_access" ON suppliers;

CREATE POLICY "suppliers_tenant_access" ON suppliers
  FOR ALL USING (
    auth.uid() IS NOT NULL AND (
      tenant_id IN (SELECT public.get_user_tenant_ids())
      OR public.is_super_admin()
    )
  );