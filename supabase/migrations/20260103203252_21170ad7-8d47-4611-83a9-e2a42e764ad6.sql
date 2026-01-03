-- Critical Tables RLS Policies - Part 3 (Remaining)

-- 31. Invoices - Tenant isolated
DROP POLICY IF EXISTS "invoices_tenant_access" ON invoices;

CREATE POLICY "invoices_tenant_access" ON invoices
  FOR ALL USING (
    auth.uid() IS NOT NULL AND (
      tenant_id IN (SELECT public.get_user_tenant_ids())
      OR public.is_super_admin()
    )
  );

-- 32. Subscriptions - Tenant isolated
DROP POLICY IF EXISTS "subscriptions_tenant_access" ON subscriptions;

CREATE POLICY "subscriptions_tenant_access" ON subscriptions
  FOR ALL USING (
    auth.uid() IS NOT NULL AND (
      tenant_id IN (SELECT public.get_user_tenant_ids())
      OR public.is_super_admin()
    )
  );

-- 33. Inventory Items - Tenant isolated
DROP POLICY IF EXISTS "inventory_items_tenant_access" ON inventory_items;

CREATE POLICY "inventory_items_tenant_access" ON inventory_items
  FOR ALL USING (
    auth.uid() IS NOT NULL AND (
      tenant_id IN (SELECT public.get_user_tenant_ids())
      OR public.is_super_admin()
    )
  );

-- 34. Inventory Categories - Tenant isolated
DROP POLICY IF EXISTS "inventory_categories_tenant_access" ON inventory_categories;

CREATE POLICY "inventory_categories_tenant_access" ON inventory_categories
  FOR ALL USING (
    auth.uid() IS NOT NULL AND (
      tenant_id IN (SELECT public.get_user_tenant_ids())
      OR public.is_super_admin()
    )
  );

-- 35. Inventory Transactions - Tenant isolated
DROP POLICY IF EXISTS "inventory_transactions_tenant_access" ON inventory_transactions;

CREATE POLICY "inventory_transactions_tenant_access" ON inventory_transactions
  FOR ALL USING (
    auth.uid() IS NOT NULL AND (
      tenant_id IN (SELECT public.get_user_tenant_ids())
      OR public.is_super_admin()
    )
  );

-- 36. Inventory Ledger - Tenant isolated
DROP POLICY IF EXISTS "inventory_ledger_tenant_access" ON inventory_ledger;

CREATE POLICY "inventory_ledger_tenant_access" ON inventory_ledger
  FOR ALL USING (
    auth.uid() IS NOT NULL AND (
      tenant_id IN (SELECT public.get_user_tenant_ids())
      OR public.is_super_admin()
    )
  );

-- 37. Account Heads - Tenant isolated
DROP POLICY IF EXISTS "account_heads_tenant_access" ON account_heads;

CREATE POLICY "account_heads_tenant_access" ON account_heads
  FOR ALL USING (
    auth.uid() IS NOT NULL AND (
      tenant_id IN (SELECT public.get_user_tenant_ids())
      OR public.is_super_admin()
    )
  );

-- 38. Cash Book - Tenant isolated
DROP POLICY IF EXISTS "cash_book_tenant_access" ON cash_book;

CREATE POLICY "cash_book_tenant_access" ON cash_book
  FOR ALL USING (
    auth.uid() IS NOT NULL AND (
      tenant_id IN (SELECT public.get_user_tenant_ids())
      OR public.is_super_admin()
    )
  );

-- 39. Employee Types - Tenant isolated
DROP POLICY IF EXISTS "employee_types_tenant_access" ON employee_types;

CREATE POLICY "employee_types_tenant_access" ON employee_types
  FOR ALL USING (
    auth.uid() IS NOT NULL AND (
      tenant_id IN (SELECT public.get_user_tenant_ids())
      OR public.is_super_admin()
    )
  );

-- 40. Employee Ledger - Tenant isolated
DROP POLICY IF EXISTS "employee_ledger_tenant_access" ON employee_ledger;

CREATE POLICY "employee_ledger_tenant_access" ON employee_ledger
  FOR ALL USING (
    auth.uid() IS NOT NULL AND (
      tenant_id IN (SELECT public.get_user_tenant_ids())
      OR public.is_super_admin()
    )
  );

-- 41. Expense Categories - Tenant isolated
DROP POLICY IF EXISTS "expense_categories_tenant_access" ON expense_categories;

CREATE POLICY "expense_categories_tenant_access" ON expense_categories
  FOR ALL USING (
    auth.uid() IS NOT NULL AND (
      tenant_id IN (SELECT public.get_user_tenant_ids())
      OR public.is_super_admin()
    )
  );

-- 42. Bill Generations - Tenant isolated
DROP POLICY IF EXISTS "bill_generations_tenant_access" ON bill_generations;

CREATE POLICY "bill_generations_tenant_access" ON bill_generations
  FOR ALL USING (
    auth.uid() IS NOT NULL AND (
      tenant_id IN (SELECT public.get_user_tenant_ids())
      OR public.is_super_admin()
    )
  );

-- 43. Billing Rules - Tenant isolated
DROP POLICY IF EXISTS "billing_rules_tenant_access" ON billing_rules;

CREATE POLICY "billing_rules_tenant_access" ON billing_rules
  FOR ALL USING (
    auth.uid() IS NOT NULL AND (
      tenant_id IN (SELECT public.get_user_tenant_ids())
      OR public.is_super_admin()
    )
  );

-- 44. Automation Logs - Tenant isolated
DROP POLICY IF EXISTS "automation_logs_tenant_access" ON automation_logs;

CREATE POLICY "automation_logs_tenant_access" ON automation_logs
  FOR ALL USING (
    auth.uid() IS NOT NULL AND (
      tenant_id IN (SELECT public.get_user_tenant_ids())
      OR public.is_super_admin()
    )
  );

-- 45. BTRC Reports - Tenant isolated
DROP POLICY IF EXISTS "btrc_reports_tenant_access" ON btrc_reports;

CREATE POLICY "btrc_reports_tenant_access" ON btrc_reports
  FOR ALL USING (
    auth.uid() IS NOT NULL AND (
      tenant_id IN (SELECT public.get_user_tenant_ids())
      OR public.is_super_admin()
    )
  );

-- 46. Customer Imports - Tenant isolated
DROP POLICY IF EXISTS "customer_imports_tenant_access" ON customer_imports;

CREATE POLICY "customer_imports_tenant_access" ON customer_imports
  FOR ALL USING (
    auth.uid() IS NOT NULL AND (
      tenant_id IN (SELECT public.get_user_tenant_ids())
      OR public.is_super_admin()
    )
  );

-- 47. Divisions - Tenant isolated
DROP POLICY IF EXISTS "divisions_tenant_access" ON divisions;

CREATE POLICY "divisions_tenant_access" ON divisions
  FOR ALL USING (
    auth.uid() IS NOT NULL AND (
      tenant_id IN (SELECT public.get_user_tenant_ids())
      OR public.is_super_admin()
    )
  );

-- 48. Districts - Tenant isolated
DROP POLICY IF EXISTS "districts_tenant_access" ON districts;

CREATE POLICY "districts_tenant_access" ON districts
  FOR ALL USING (
    auth.uid() IS NOT NULL AND (
      tenant_id IN (SELECT public.get_user_tenant_ids())
      OR public.is_super_admin()
    )
  );

-- 49. Email Logs - Tenant isolated
DROP POLICY IF EXISTS "email_logs_tenant_access" ON email_logs;

CREATE POLICY "email_logs_tenant_access" ON email_logs
  FOR ALL USING (
    auth.uid() IS NOT NULL AND (
      tenant_id IN (SELECT public.get_user_tenant_ids())
      OR public.is_super_admin()
    )
  );

-- 50. SMS Logs - Tenant isolated
DROP POLICY IF EXISTS "sms_logs_tenant_access" ON sms_logs;

CREATE POLICY "sms_logs_tenant_access" ON sms_logs
  FOR ALL USING (
    auth.uid() IS NOT NULL AND (
      tenant_id IN (SELECT public.get_user_tenant_ids())
      OR public.is_super_admin()
    )
  );

-- 51. SMS Templates - Tenant isolated
DROP POLICY IF EXISTS "sms_templates_tenant_access" ON sms_templates;

CREATE POLICY "sms_templates_tenant_access" ON sms_templates
  FOR ALL USING (
    auth.uid() IS NOT NULL AND (
      tenant_id IN (SELECT public.get_user_tenant_ids())
      OR public.is_super_admin()
    )
  );

-- Public read-only tables (for landing page)
DROP POLICY IF EXISTS "packages_public_read" ON packages;
CREATE POLICY "packages_public_read" ON packages
  FOR SELECT USING (is_active = true);

CREATE POLICY "packages_admin_all" ON packages
  FOR ALL USING (public.is_super_admin());

DROP POLICY IF EXISTS "system_languages_public_read" ON system_languages;
CREATE POLICY "system_languages_public_read" ON system_languages
  FOR SELECT USING (is_active = true);

DROP POLICY IF EXISTS "system_currencies_public_read" ON system_currencies;
CREATE POLICY "system_currencies_public_read" ON system_currencies
  FOR SELECT USING (is_active = true);