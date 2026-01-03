-- =====================================================
-- FULL ISP MANAGEMENT SYSTEM DATABASE SCHEMA
-- =====================================================

-- ============ ENUMS ============

-- Customer status
CREATE TYPE public.customer_status AS ENUM ('active', 'expired', 'suspended', 'pending', 'cancelled');

-- Bill status
CREATE TYPE public.bill_status AS ENUM ('unpaid', 'paid', 'partial', 'overdue', 'cancelled');

-- ISP Package speed units
CREATE TYPE public.speed_unit AS ENUM ('mbps', 'gbps');

-- Staff roles within tenant
CREATE TYPE public.staff_role AS ENUM ('admin', 'staff', 'technician', 'support', 'reseller');

-- ============ ISP PACKAGES (Customer Internet Packages) ============

CREATE TABLE public.isp_packages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  download_speed INTEGER NOT NULL DEFAULT 10,
  upload_speed INTEGER NOT NULL DEFAULT 10,
  speed_unit speed_unit NOT NULL DEFAULT 'mbps',
  price DECIMAL(10,2) NOT NULL DEFAULT 0,
  validity_days INTEGER NOT NULL DEFAULT 30,
  is_active BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============ AREAS / LOCATIONS ============

CREATE TABLE public.areas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  district TEXT,
  upazila TEXT,
  description TEXT,
  olt_id UUID REFERENCES public.olts(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============ RESELLERS ============

CREATE TABLE public.resellers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  phone TEXT,
  email TEXT,
  address TEXT,
  area_id UUID REFERENCES public.areas(id) ON DELETE SET NULL,
  commission_type TEXT DEFAULT 'percentage' CHECK (commission_type IN ('percentage', 'flat')),
  commission_value DECIMAL(10,2) DEFAULT 0,
  balance DECIMAL(10,2) DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============ CUSTOMERS (ISP End Users) ============

CREATE TABLE public.customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  customer_code TEXT,
  name TEXT NOT NULL,
  phone TEXT,
  email TEXT,
  address TEXT,
  area_id UUID REFERENCES public.areas(id) ON DELETE SET NULL,
  reseller_id UUID REFERENCES public.resellers(id) ON DELETE SET NULL,
  
  -- ONU/Network Info (reference to ONU device)
  onu_id UUID REFERENCES public.onus(id) ON DELETE SET NULL,
  onu_mac TEXT,
  pon_port TEXT,
  onu_index INTEGER,
  
  -- Router/PPPoE Info
  router_mac TEXT,
  pppoe_username TEXT,
  pppoe_password TEXT,
  
  -- Package & Billing
  package_id UUID REFERENCES public.isp_packages(id) ON DELETE SET NULL,
  connection_date DATE DEFAULT CURRENT_DATE,
  expiry_date DATE,
  monthly_bill DECIMAL(10,2) DEFAULT 0,
  due_amount DECIMAL(10,2) DEFAULT 0,
  
  -- Status
  status customer_status NOT NULL DEFAULT 'pending',
  is_auto_disable BOOLEAN DEFAULT true,
  last_payment_date DATE,
  
  -- Metadata
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  -- Ensure unique PPPoE username per tenant
  UNIQUE(tenant_id, pppoe_username)
);

-- ============ CUSTOMER BILLS ============

CREATE TABLE public.customer_bills (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  bill_number TEXT NOT NULL,
  
  -- Bill Details
  billing_month TEXT NOT NULL, -- Format: YYYY-MM
  amount DECIMAL(10,2) NOT NULL DEFAULT 0,
  discount DECIMAL(10,2) DEFAULT 0,
  tax DECIMAL(10,2) DEFAULT 0,
  total_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
  paid_amount DECIMAL(10,2) DEFAULT 0,
  
  -- Dates
  bill_date DATE NOT NULL DEFAULT CURRENT_DATE,
  due_date DATE NOT NULL,
  paid_date DATE,
  
  -- Status
  status bill_status NOT NULL DEFAULT 'unpaid',
  
  -- Payment info
  payment_method TEXT,
  payment_reference TEXT,
  collected_by UUID REFERENCES auth.users(id),
  
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============ CUSTOMER PAYMENTS (Individual Payments) ============

CREATE TABLE public.customer_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  bill_id UUID REFERENCES public.customer_bills(id) ON DELETE SET NULL,
  
  amount DECIMAL(10,2) NOT NULL,
  payment_method TEXT NOT NULL DEFAULT 'cash',
  transaction_id TEXT,
  payment_gateway TEXT,
  gateway_response JSONB,
  
  payment_date TIMESTAMPTZ NOT NULL DEFAULT now(),
  collected_by UUID REFERENCES auth.users(id),
  verified_by UUID REFERENCES auth.users(id),
  verified_at TIMESTAMPTZ,
  
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============ RESELLER TRANSACTIONS ============

CREATE TABLE public.reseller_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  reseller_id UUID NOT NULL REFERENCES public.resellers(id) ON DELETE CASCADE,
  
  type TEXT NOT NULL CHECK (type IN ('recharge', 'deduction', 'commission', 'refund')),
  amount DECIMAL(10,2) NOT NULL,
  balance_before DECIMAL(10,2) NOT NULL,
  balance_after DECIMAL(10,2) NOT NULL,
  
  reference_id UUID,
  reference_type TEXT,
  description TEXT,
  
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============ MIKROTIK ROUTERS ============

CREATE TABLE public.mikrotik_routers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  olt_id UUID REFERENCES public.olts(id) ON DELETE SET NULL,
  
  name TEXT NOT NULL,
  ip_address TEXT NOT NULL,
  port INTEGER DEFAULT 8728,
  username TEXT NOT NULL,
  password_encrypted TEXT NOT NULL,
  
  -- Status
  status TEXT DEFAULT 'unknown' CHECK (status IN ('online', 'offline', 'unknown')),
  last_synced TIMESTAMPTZ,
  
  -- Features
  is_primary BOOLEAN DEFAULT false,
  sync_pppoe BOOLEAN DEFAULT true,
  sync_queues BOOLEAN DEFAULT true,
  auto_disable_expired BOOLEAN DEFAULT true,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============ PPPOE PROFILES (MikroTik Profiles) ============

CREATE TABLE public.pppoe_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  mikrotik_id UUID REFERENCES public.mikrotik_routers(id) ON DELETE CASCADE,
  
  name TEXT NOT NULL,
  local_address TEXT,
  remote_address TEXT,
  rate_limit TEXT,
  parent_queue TEXT,
  address_list TEXT,
  
  is_synced BOOLEAN DEFAULT false,
  mikrotik_profile_id TEXT,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============ STAFF PERMISSIONS ============

CREATE TABLE public.staff_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role staff_role NOT NULL DEFAULT 'staff',
  
  -- Module permissions (JSONB for flexibility)
  permissions JSONB DEFAULT '{
    "dashboard": {"read": true, "write": false},
    "customers": {"read": true, "write": false, "delete": false},
    "billing": {"read": true, "write": false, "delete": false},
    "olt": {"read": true, "write": false},
    "mikrotik": {"read": false, "write": false},
    "reports": {"read": true, "export": false},
    "settings": {"read": false, "write": false}
  }'::jsonb,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  UNIQUE(tenant_id, user_id)
);

-- ============ BILLING AUTOMATION RULES ============

CREATE TABLE public.billing_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  
  name TEXT NOT NULL,
  description TEXT,
  rule_type TEXT NOT NULL CHECK (rule_type IN ('auto_disable', 'auto_enable', 'auto_bill', 'reminder')),
  
  -- Trigger conditions
  trigger_days INTEGER, -- Days before/after expiry
  trigger_condition TEXT, -- 'before_expiry', 'after_expiry', 'on_payment'
  
  -- Actions
  action TEXT NOT NULL, -- 'disable_pppoe', 'enable_pppoe', 'generate_bill', 'send_sms'
  action_params JSONB,
  
  is_active BOOLEAN DEFAULT true,
  last_run TIMESTAMPTZ,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============ AUTOMATION LOGS ============

CREATE TABLE public.automation_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  
  rule_id UUID REFERENCES public.billing_rules(id) ON DELETE SET NULL,
  customer_id UUID REFERENCES public.customers(id) ON DELETE SET NULL,
  
  action TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('success', 'failed', 'pending')),
  details JSONB,
  error_message TEXT,
  
  executed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============ INDEXES ============

CREATE INDEX idx_customers_tenant_id ON public.customers(tenant_id);
CREATE INDEX idx_customers_status ON public.customers(status);
CREATE INDEX idx_customers_pppoe ON public.customers(pppoe_username);
CREATE INDEX idx_customers_onu_id ON public.customers(onu_id);
CREATE INDEX idx_customers_expiry ON public.customers(expiry_date);

CREATE INDEX idx_customer_bills_tenant ON public.customer_bills(tenant_id);
CREATE INDEX idx_customer_bills_customer ON public.customer_bills(customer_id);
CREATE INDEX idx_customer_bills_status ON public.customer_bills(status);
CREATE INDEX idx_customer_bills_month ON public.customer_bills(billing_month);

CREATE INDEX idx_resellers_tenant ON public.resellers(tenant_id);
CREATE INDEX idx_areas_tenant ON public.areas(tenant_id);
CREATE INDEX idx_isp_packages_tenant ON public.isp_packages(tenant_id);

CREATE INDEX idx_mikrotik_tenant ON public.mikrotik_routers(tenant_id);
CREATE INDEX idx_pppoe_profiles_tenant ON public.pppoe_profiles(tenant_id);

CREATE INDEX idx_automation_logs_tenant ON public.automation_logs(tenant_id);
CREATE INDEX idx_automation_logs_customer ON public.automation_logs(customer_id);

-- ============ ROW LEVEL SECURITY ============

ALTER TABLE public.isp_packages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.areas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.resellers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customer_bills ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customer_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reseller_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mikrotik_routers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pppoe_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.staff_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.billing_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.automation_logs ENABLE ROW LEVEL SECURITY;

-- ============ RLS POLICIES ============

-- Super admins can manage all
CREATE POLICY "Super admins full access to isp_packages" ON public.isp_packages FOR ALL USING (is_super_admin());
CREATE POLICY "Super admins full access to areas" ON public.areas FOR ALL USING (is_super_admin());
CREATE POLICY "Super admins full access to resellers" ON public.resellers FOR ALL USING (is_super_admin());
CREATE POLICY "Super admins full access to customers" ON public.customers FOR ALL USING (is_super_admin());
CREATE POLICY "Super admins full access to customer_bills" ON public.customer_bills FOR ALL USING (is_super_admin());
CREATE POLICY "Super admins full access to customer_payments" ON public.customer_payments FOR ALL USING (is_super_admin());
CREATE POLICY "Super admins full access to reseller_transactions" ON public.reseller_transactions FOR ALL USING (is_super_admin());
CREATE POLICY "Super admins full access to mikrotik_routers" ON public.mikrotik_routers FOR ALL USING (is_super_admin());
CREATE POLICY "Super admins full access to pppoe_profiles" ON public.pppoe_profiles FOR ALL USING (is_super_admin());
CREATE POLICY "Super admins full access to staff_permissions" ON public.staff_permissions FOR ALL USING (is_super_admin());
CREATE POLICY "Super admins full access to billing_rules" ON public.billing_rules FOR ALL USING (is_super_admin());
CREATE POLICY "Super admins full access to automation_logs" ON public.automation_logs FOR ALL USING (is_super_admin());

-- Tenant users can manage their own tenant's data
CREATE POLICY "Tenant users can manage isp_packages" ON public.isp_packages FOR ALL USING (tenant_id = get_user_tenant_id());
CREATE POLICY "Tenant users can manage areas" ON public.areas FOR ALL USING (tenant_id = get_user_tenant_id());
CREATE POLICY "Tenant users can manage resellers" ON public.resellers FOR ALL USING (tenant_id = get_user_tenant_id());
CREATE POLICY "Tenant users can manage customers" ON public.customers FOR ALL USING (tenant_id = get_user_tenant_id());
CREATE POLICY "Tenant users can manage customer_bills" ON public.customer_bills FOR ALL USING (tenant_id = get_user_tenant_id());
CREATE POLICY "Tenant users can manage customer_payments" ON public.customer_payments FOR ALL USING (tenant_id = get_user_tenant_id());
CREATE POLICY "Tenant users can view reseller_transactions" ON public.reseller_transactions FOR SELECT USING (tenant_id = get_user_tenant_id());
CREATE POLICY "Tenant admins can insert reseller_transactions" ON public.reseller_transactions FOR INSERT WITH CHECK (tenant_id = get_user_tenant_id() AND has_role(auth.uid(), 'admin'));
CREATE POLICY "Tenant users can manage mikrotik_routers" ON public.mikrotik_routers FOR ALL USING (tenant_id = get_user_tenant_id());
CREATE POLICY "Tenant users can manage pppoe_profiles" ON public.pppoe_profiles FOR ALL USING (tenant_id = get_user_tenant_id());
CREATE POLICY "Tenant admins can manage staff_permissions" ON public.staff_permissions FOR ALL USING (tenant_id = get_user_tenant_id() AND has_role(auth.uid(), 'admin'));
CREATE POLICY "Tenant users can view staff_permissions" ON public.staff_permissions FOR SELECT USING (tenant_id = get_user_tenant_id());
CREATE POLICY "Tenant users can manage billing_rules" ON public.billing_rules FOR ALL USING (tenant_id = get_user_tenant_id());
CREATE POLICY "Tenant users can view automation_logs" ON public.automation_logs FOR SELECT USING (tenant_id = get_user_tenant_id());

-- ============ TRIGGERS ============

CREATE TRIGGER update_isp_packages_updated_at BEFORE UPDATE ON public.isp_packages FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_areas_updated_at BEFORE UPDATE ON public.areas FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_resellers_updated_at BEFORE UPDATE ON public.resellers FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_customers_updated_at BEFORE UPDATE ON public.customers FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_customer_bills_updated_at BEFORE UPDATE ON public.customer_bills FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_mikrotik_routers_updated_at BEFORE UPDATE ON public.mikrotik_routers FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_pppoe_profiles_updated_at BEFORE UPDATE ON public.pppoe_profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_staff_permissions_updated_at BEFORE UPDATE ON public.staff_permissions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_billing_rules_updated_at BEFORE UPDATE ON public.billing_rules FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============ ENABLE REALTIME ============

ALTER PUBLICATION supabase_realtime ADD TABLE public.customers;
ALTER PUBLICATION supabase_realtime ADD TABLE public.customer_bills;
ALTER PUBLICATION supabase_realtime ADD TABLE public.mikrotik_routers;

-- ============ FUNCTION: Generate Customer Code ============

CREATE OR REPLACE FUNCTION public.generate_customer_code(_tenant_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _count INTEGER;
  _code TEXT;
BEGIN
  SELECT COUNT(*) + 1 INTO _count FROM public.customers WHERE tenant_id = _tenant_id;
  _code := 'C' || LPAD(_count::TEXT, 6, '0');
  RETURN _code;
END;
$$;

-- ============ FUNCTION: Generate Bill Number ============

CREATE OR REPLACE FUNCTION public.generate_bill_number(_tenant_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _year TEXT;
  _month TEXT;
  _count INTEGER;
  _number TEXT;
BEGIN
  _year := TO_CHAR(NOW(), 'YY');
  _month := TO_CHAR(NOW(), 'MM');
  
  SELECT COUNT(*) + 1 INTO _count 
  FROM public.customer_bills 
  WHERE tenant_id = _tenant_id 
    AND billing_month = TO_CHAR(NOW(), 'YYYY-MM');
  
  _number := 'INV' || _year || _month || LPAD(_count::TEXT, 4, '0');
  RETURN _number;
END;
$$;