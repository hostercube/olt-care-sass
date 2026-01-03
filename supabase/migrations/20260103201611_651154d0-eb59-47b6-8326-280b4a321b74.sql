-- ============================================
-- FINANCE MODULE TABLES (Missing)
-- ============================================

-- 1. Account Heads (Chart of Accounts)
CREATE TABLE IF NOT EXISTS public.account_heads (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  code TEXT,
  type TEXT NOT NULL DEFAULT 'expense', -- income, expense, asset, liability
  parent_id UUID REFERENCES public.account_heads(id) ON DELETE SET NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.account_heads ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Super admins full access to account_heads" ON public.account_heads;
DROP POLICY IF EXISTS "Tenant users can manage account_heads" ON public.account_heads;
CREATE POLICY "Super admins full access to account_heads" ON public.account_heads FOR ALL USING (is_super_admin());
CREATE POLICY "Tenant users can manage account_heads" ON public.account_heads FOR ALL USING (tenant_id = get_user_tenant_id());

-- 2. Finance Transactions
CREATE TABLE IF NOT EXISTS public.finance_transactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  transaction_type TEXT NOT NULL DEFAULT 'expense', -- income, expense, transfer, investment
  account_head_id UUID REFERENCES public.account_heads(id) ON DELETE SET NULL,
  amount NUMERIC NOT NULL DEFAULT 0,
  transaction_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  reference_no TEXT,
  description TEXT,
  payment_method TEXT DEFAULT 'cash',
  from_account UUID,
  to_account UUID,
  approved_by UUID,
  approved_at TIMESTAMP WITH TIME ZONE,
  status TEXT DEFAULT 'pending',
  attachments JSONB DEFAULT '[]'::jsonb,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.finance_transactions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Super admins full access to finance_transactions" ON public.finance_transactions;
DROP POLICY IF EXISTS "Tenant users can manage finance_transactions" ON public.finance_transactions;
CREATE POLICY "Super admins full access to finance_transactions" ON public.finance_transactions FOR ALL USING (is_super_admin());
CREATE POLICY "Tenant users can manage finance_transactions" ON public.finance_transactions FOR ALL USING (tenant_id = get_user_tenant_id());

-- 3. Cash Book
CREATE TABLE IF NOT EXISTS public.cash_book (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  entry_date DATE NOT NULL DEFAULT CURRENT_DATE,
  voucher_no TEXT,
  particulars TEXT NOT NULL,
  debit NUMERIC DEFAULT 0,
  credit NUMERIC DEFAULT 0,
  balance NUMERIC DEFAULT 0,
  payment_mode TEXT DEFAULT 'cash',
  reference_id UUID,
  reference_type TEXT,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.cash_book ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Super admins full access to cash_book" ON public.cash_book;
DROP POLICY IF EXISTS "Tenant users can manage cash_book" ON public.cash_book;
CREATE POLICY "Super admins full access to cash_book" ON public.cash_book FOR ALL USING (is_super_admin());
CREATE POLICY "Tenant users can manage cash_book" ON public.cash_book FOR ALL USING (tenant_id = get_user_tenant_id());

-- 4. Investments
CREATE TABLE IF NOT EXISTS public.investments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  investor_name TEXT NOT NULL,
  amount NUMERIC NOT NULL DEFAULT 0,
  investment_date DATE NOT NULL DEFAULT CURRENT_DATE,
  expected_return NUMERIC DEFAULT 0,
  return_date DATE,
  status TEXT DEFAULT 'active',
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.investments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Super admins full access to investments" ON public.investments;
DROP POLICY IF EXISTS "Tenant users can manage investments" ON public.investments;
CREATE POLICY "Super admins full access to investments" ON public.investments FOR ALL USING (is_super_admin());
CREATE POLICY "Tenant users can manage investments" ON public.investments FOR ALL USING (tenant_id = get_user_tenant_id());

-- 5. Bank Accounts
CREATE TABLE IF NOT EXISTS public.bank_accounts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  bank_name TEXT NOT NULL,
  account_name TEXT NOT NULL,
  account_number TEXT NOT NULL,
  branch TEXT,
  routing_number TEXT,
  current_balance NUMERIC DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.bank_accounts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Super admins full access to bank_accounts" ON public.bank_accounts;
DROP POLICY IF EXISTS "Tenant users can manage bank_accounts" ON public.bank_accounts;
CREATE POLICY "Super admins full access to bank_accounts" ON public.bank_accounts FOR ALL USING (is_super_admin());
CREATE POLICY "Tenant users can manage bank_accounts" ON public.bank_accounts FOR ALL USING (tenant_id = get_user_tenant_id());