-- Multi-level Reseller System - Complete Setup

-- Create enums if not exists
DO $$ BEGIN
  CREATE TYPE public.reseller_role AS ENUM ('reseller', 'sub_reseller', 'sub_sub_reseller');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE public.reseller_transaction_type AS ENUM ('recharge', 'deduction', 'commission', 'refund', 'transfer_in', 'transfer_out', 'customer_payment');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Add new columns to resellers table for multi-level support
ALTER TABLE public.resellers 
  ADD COLUMN IF NOT EXISTS parent_id UUID REFERENCES public.resellers(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS level INTEGER DEFAULT 1,
  ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'reseller',
  ADD COLUMN IF NOT EXISTS username TEXT,
  ADD COLUMN IF NOT EXISTS password_hash TEXT,
  ADD COLUMN IF NOT EXISTS can_create_sub_reseller BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS max_sub_resellers INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS max_customers INTEGER,
  ADD COLUMN IF NOT EXISTS customer_rate NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS rate_type TEXT DEFAULT 'per_customer',
  ADD COLUMN IF NOT EXISTS total_customers INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_collections NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS nid_number TEXT,
  ADD COLUMN IF NOT EXISTS profile_photo TEXT,
  ADD COLUMN IF NOT EXISTS last_login TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS branch_name TEXT,
  ADD COLUMN IF NOT EXISTS can_view_sub_customers BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS can_control_sub_customers BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS can_recharge_customers BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS can_add_customers BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS can_edit_customers BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS can_delete_customers BOOLEAN DEFAULT false;

-- Update reseller_transactions table if type column needs update
ALTER TABLE public.reseller_transactions 
  ADD COLUMN IF NOT EXISTS from_reseller_id UUID REFERENCES public.resellers(id),
  ADD COLUMN IF NOT EXISTS to_reseller_id UUID REFERENCES public.resellers(id),
  ADD COLUMN IF NOT EXISTS customer_id UUID REFERENCES public.customers(id);

-- Create reseller permissions table for custom roles
CREATE TABLE IF NOT EXISTS public.reseller_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  reseller_id UUID NOT NULL REFERENCES public.resellers(id) ON DELETE CASCADE,
  permission_name TEXT NOT NULL,
  is_allowed BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(reseller_id, permission_name)
);

-- Create reseller roles table for custom role management per tenant
CREATE TABLE IF NOT EXISTS public.reseller_custom_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  permissions JSONB DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(tenant_id, name)
);

-- Create branches table for branch management
CREATE TABLE IF NOT EXISTS public.reseller_branches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  address TEXT,
  phone TEXT,
  manager_reseller_id UUID REFERENCES public.resellers(id),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Add branch_id to resellers
ALTER TABLE public.resellers 
  ADD COLUMN IF NOT EXISTS branch_id UUID REFERENCES public.reseller_branches(id);

-- Enable RLS
ALTER TABLE public.reseller_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reseller_custom_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reseller_branches ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Super admins full access to reseller_permissions"
  ON public.reseller_permissions FOR ALL
  USING (is_super_admin());

CREATE POLICY "Tenant users can manage reseller_permissions"
  ON public.reseller_permissions FOR ALL
  USING (tenant_id = get_user_tenant_id());

CREATE POLICY "Super admins full access to reseller_custom_roles"
  ON public.reseller_custom_roles FOR ALL
  USING (is_super_admin());

CREATE POLICY "Tenant users can manage reseller_custom_roles"
  ON public.reseller_custom_roles FOR ALL
  USING (tenant_id = get_user_tenant_id());

CREATE POLICY "Super admins full access to reseller_branches"
  ON public.reseller_branches FOR ALL
  USING (is_super_admin());

CREATE POLICY "Tenant users can manage reseller_branches"
  ON public.reseller_branches FOR ALL
  USING (tenant_id = get_user_tenant_id());

-- Function to get reseller hierarchy (all descendants)
CREATE OR REPLACE FUNCTION public.get_reseller_descendants(p_reseller_id UUID)
RETURNS TABLE(id UUID, name TEXT, level INTEGER, parent_id UUID, balance NUMERIC, role TEXT)
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH RECURSIVE descendants AS (
    SELECT r.id, r.name, r.level, r.parent_id, r.balance, r.role
    FROM resellers r
    WHERE r.id = p_reseller_id
    
    UNION ALL
    
    SELECT r.id, r.name, r.level, r.parent_id, r.balance, r.role
    FROM resellers r
    INNER JOIN descendants d ON r.parent_id = d.id
    WHERE r.is_active = true
  )
  SELECT * FROM descendants WHERE id != p_reseller_id;
$$;

-- Function to get all customers under a reseller (including sub-resellers)
CREATE OR REPLACE FUNCTION public.get_reseller_all_customers(p_reseller_id UUID)
RETURNS SETOF public.customers
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH RECURSIVE reseller_tree AS (
    SELECT id FROM resellers WHERE id = p_reseller_id
    UNION ALL
    SELECT r.id FROM resellers r
    INNER JOIN reseller_tree rt ON r.parent_id = rt.id
    WHERE r.is_active = true
  )
  SELECT c.* FROM customers c
  WHERE c.reseller_id IN (SELECT id FROM reseller_tree);
$$;

-- Function to count sub-resellers
CREATE OR REPLACE FUNCTION public.count_sub_resellers(p_reseller_id UUID)
RETURNS INTEGER
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COUNT(*)::INTEGER
  FROM resellers
  WHERE parent_id = p_reseller_id AND is_active = true;
$$;

-- Function to transfer balance between resellers
CREATE OR REPLACE FUNCTION public.transfer_reseller_balance(
  p_from_reseller_id UUID,
  p_to_reseller_id UUID,
  p_amount NUMERIC,
  p_description TEXT DEFAULT 'Balance transfer'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_from_balance NUMERIC;
  v_to_balance NUMERIC;
  v_tenant_id UUID;
BEGIN
  SELECT balance, tenant_id INTO v_from_balance, v_tenant_id
  FROM resellers WHERE id = p_from_reseller_id;
  
  IF v_from_balance < p_amount THEN
    RETURN jsonb_build_object('success', false, 'error', 'Insufficient balance');
  END IF;
  
  SELECT balance INTO v_to_balance FROM resellers WHERE id = p_to_reseller_id;
  
  UPDATE resellers SET balance = balance - p_amount WHERE id = p_from_reseller_id;
  UPDATE resellers SET balance = balance + p_amount WHERE id = p_to_reseller_id;
  
  INSERT INTO reseller_transactions (tenant_id, reseller_id, type, amount, balance_before, balance_after, from_reseller_id, to_reseller_id, description)
  VALUES 
    (v_tenant_id, p_from_reseller_id, 'transfer_out', p_amount, v_from_balance, v_from_balance - p_amount, p_from_reseller_id, p_to_reseller_id, p_description),
    (v_tenant_id, p_to_reseller_id, 'transfer_in', p_amount, v_to_balance, v_to_balance + p_amount, p_from_reseller_id, p_to_reseller_id, p_description);
  
  RETURN jsonb_build_object('success', true, 'new_balance', v_from_balance - p_amount);
END;
$$;

-- Function for reseller to pay customer bill
CREATE OR REPLACE FUNCTION public.reseller_pay_customer(
  p_reseller_id UUID,
  p_customer_id UUID,
  p_amount NUMERIC,
  p_months INTEGER DEFAULT 1
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_reseller RECORD;
  v_customer RECORD;
  v_new_expiry DATE;
  v_package_validity INTEGER;
BEGIN
  SELECT * INTO v_reseller FROM resellers WHERE id = p_reseller_id AND is_active = true;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Reseller not found');
  END IF;
  
  IF v_reseller.balance < p_amount THEN
    RETURN jsonb_build_object('success', false, 'error', 'Insufficient balance');
  END IF;
  
  SELECT c.*, p.validity_days INTO v_customer
  FROM customers c
  LEFT JOIN isp_packages p ON c.package_id = p.id
  WHERE c.id = p_customer_id;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Customer not found');
  END IF;
  
  v_package_validity := COALESCE(v_customer.validity_days, 30);
  
  IF v_customer.expiry_date IS NULL OR v_customer.expiry_date < CURRENT_DATE THEN
    v_new_expiry := CURRENT_DATE + (v_package_validity * p_months);
  ELSE
    v_new_expiry := v_customer.expiry_date + (v_package_validity * p_months);
  END IF;
  
  UPDATE resellers 
  SET balance = balance - p_amount,
      total_collections = COALESCE(total_collections, 0) + p_amount
  WHERE id = p_reseller_id;
  
  UPDATE customers 
  SET 
    due_amount = GREATEST(0, COALESCE(due_amount, 0) - p_amount),
    expiry_date = v_new_expiry,
    last_payment_date = CURRENT_DATE,
    status = 'active'
  WHERE id = p_customer_id;
  
  INSERT INTO reseller_transactions (tenant_id, reseller_id, type, amount, balance_before, balance_after, customer_id, description)
  VALUES (v_reseller.tenant_id, p_reseller_id, 'customer_payment', p_amount, v_reseller.balance, v_reseller.balance - p_amount, p_customer_id, 'Customer recharge for ' || p_months || ' month(s)');
  
  INSERT INTO customer_payments (tenant_id, customer_id, amount, payment_method, notes)
  VALUES (v_reseller.tenant_id, p_customer_id, p_amount, 'reseller_wallet', 'Paid by reseller: ' || v_reseller.name);
  
  RETURN jsonb_build_object('success', true, 'new_expiry', v_new_expiry, 'new_balance', v_reseller.balance - p_amount);
END;
$$;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_resellers_parent_id ON public.resellers(parent_id);
CREATE INDEX IF NOT EXISTS idx_resellers_tenant_level ON public.resellers(tenant_id, level);
CREATE INDEX IF NOT EXISTS idx_resellers_branch_id ON public.resellers(branch_id);
CREATE INDEX IF NOT EXISTS idx_reseller_transactions_reseller ON public.reseller_transactions(reseller_id);
CREATE INDEX IF NOT EXISTS idx_reseller_transactions_tenant ON public.reseller_transactions(tenant_id);