-- ============================================
-- PART 2: OLTCARE SaaS Multi-Tenant Database Schema
-- ============================================

-- Add new enums for SaaS
CREATE TYPE public.tenant_status AS ENUM ('active', 'suspended', 'trial', 'cancelled');
CREATE TYPE public.subscription_status AS ENUM ('active', 'expired', 'cancelled', 'pending');
CREATE TYPE public.billing_cycle AS ENUM ('monthly', 'yearly');
CREATE TYPE public.payment_status AS ENUM ('pending', 'completed', 'failed', 'refunded');
CREATE TYPE public.payment_method AS ENUM ('sslcommerz', 'bkash', 'rocket', 'nagad', 'manual');

-- ============================================
-- 1. TENANTS TABLE (ISP Owners)
-- ============================================
CREATE TABLE public.tenants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  company_name TEXT,
  email TEXT NOT NULL UNIQUE,
  phone TEXT,
  address TEXT,
  logo_url TEXT,
  custom_domain TEXT UNIQUE,
  subdomain TEXT UNIQUE,
  status tenant_status NOT NULL DEFAULT 'trial',
  owner_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  max_olts INTEGER DEFAULT 1,
  max_users INTEGER DEFAULT 1,
  features JSONB DEFAULT '{}',
  notes TEXT,
  trial_ends_at TIMESTAMP WITH TIME ZONE,
  suspended_at TIMESTAMP WITH TIME ZONE,
  suspended_reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- ============================================
-- 2. PACKAGES TABLE
-- ============================================
CREATE TABLE public.packages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  price_monthly DECIMAL(10,2) NOT NULL DEFAULT 0,
  price_yearly DECIMAL(10,2) NOT NULL DEFAULT 0,
  max_olts INTEGER NOT NULL DEFAULT 1,
  max_users INTEGER NOT NULL DEFAULT 1,
  max_onus INTEGER DEFAULT NULL,
  features JSONB DEFAULT '{"custom_domain": false, "sms_alerts": false, "email_alerts": false, "api_access": false, "white_label": false}',
  is_active BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- ============================================
-- 3. SUBSCRIPTIONS TABLE
-- ============================================
CREATE TABLE public.subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  package_id UUID NOT NULL REFERENCES public.packages(id) ON DELETE RESTRICT,
  billing_cycle billing_cycle NOT NULL DEFAULT 'monthly',
  status subscription_status NOT NULL DEFAULT 'pending',
  amount DECIMAL(10,2) NOT NULL,
  starts_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  ends_at TIMESTAMP WITH TIME ZONE NOT NULL,
  auto_renew BOOLEAN DEFAULT true,
  cancelled_at TIMESTAMP WITH TIME ZONE,
  cancelled_reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- ============================================
-- 4. PAYMENTS TABLE
-- ============================================
CREATE TABLE public.payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  subscription_id UUID REFERENCES public.subscriptions(id) ON DELETE SET NULL,
  amount DECIMAL(10,2) NOT NULL,
  currency TEXT DEFAULT 'BDT',
  payment_method payment_method NOT NULL,
  status payment_status NOT NULL DEFAULT 'pending',
  transaction_id TEXT,
  gateway_response JSONB,
  invoice_number TEXT UNIQUE,
  description TEXT,
  paid_at TIMESTAMP WITH TIME ZONE,
  verified_by UUID REFERENCES auth.users(id),
  verified_at TIMESTAMP WITH TIME ZONE,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- ============================================
-- 5. INVOICES TABLE
-- ============================================
CREATE TABLE public.invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  subscription_id UUID REFERENCES public.subscriptions(id) ON DELETE SET NULL,
  payment_id UUID REFERENCES public.payments(id) ON DELETE SET NULL,
  invoice_number TEXT NOT NULL UNIQUE,
  amount DECIMAL(10,2) NOT NULL,
  tax_amount DECIMAL(10,2) DEFAULT 0,
  total_amount DECIMAL(10,2) NOT NULL,
  status TEXT NOT NULL DEFAULT 'unpaid',
  due_date TIMESTAMP WITH TIME ZONE NOT NULL,
  paid_at TIMESTAMP WITH TIME ZONE,
  line_items JSONB DEFAULT '[]',
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- ============================================
-- 6. PAYMENT GATEWAY SETTINGS TABLE
-- ============================================
CREATE TABLE public.payment_gateway_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  gateway payment_method NOT NULL UNIQUE,
  is_enabled BOOLEAN DEFAULT false,
  display_name TEXT NOT NULL,
  config JSONB DEFAULT '{}',
  sandbox_mode BOOLEAN DEFAULT true,
  instructions TEXT,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Insert default payment gateways
INSERT INTO public.payment_gateway_settings (gateway, display_name, is_enabled, sort_order, instructions) VALUES
('sslcommerz', 'SSLCommerz', false, 1, NULL),
('bkash', 'bKash', false, 2, NULL),
('rocket', 'Rocket', false, 3, NULL),
('nagad', 'Nagad', false, 4, NULL),
('manual', 'Manual Payment', true, 5, 'Please transfer to: Bank Account - XXXXXX, bKash - 01XXXXXXXXX');

-- ============================================
-- 7. SMS GATEWAY SETTINGS TABLE
-- ============================================
CREATE TABLE public.sms_gateway_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider TEXT NOT NULL DEFAULT 'smsnoc',
  is_enabled BOOLEAN DEFAULT false,
  api_url TEXT,
  api_key TEXT,
  sender_id TEXT,
  config JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

INSERT INTO public.sms_gateway_settings (provider, is_enabled) VALUES ('smsnoc', false);

-- ============================================
-- 8. SMS LOG TABLE
-- ============================================
CREATE TABLE public.sms_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE SET NULL,
  phone_number TEXT NOT NULL,
  message TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  provider_response JSONB,
  error_message TEXT,
  sent_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- ============================================
-- 9. TENANT USERS TABLE
-- ============================================
CREATE TABLE public.tenant_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL DEFAULT 'operator',
  is_owner BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(tenant_id, user_id)
);

-- ============================================
-- 10. ADD TENANT_ID TO EXISTING TABLES
-- ============================================
ALTER TABLE public.olts ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE;
ALTER TABLE public.alerts ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE;

-- ============================================
-- 11. ACTIVITY LOG TABLE
-- ============================================
CREATE TABLE public.activity_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  entity_type TEXT,
  entity_id TEXT,
  details JSONB DEFAULT '{}',
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- ============================================
-- 12. ENABLE ROW LEVEL SECURITY
-- ============================================
ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.packages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_gateway_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sms_gateway_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sms_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tenant_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;

-- ============================================
-- 13. CREATE HELPER FUNCTIONS
-- ============================================
CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid()
    AND role = 'super_admin'
  )
$$;

CREATE OR REPLACE FUNCTION public.get_user_tenant_id()
RETURNS UUID
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT tenant_id FROM public.tenant_users
  WHERE user_id = auth.uid()
  LIMIT 1
$$;

CREATE OR REPLACE FUNCTION public.is_tenant_active(_tenant_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.tenants
    WHERE id = _tenant_id
    AND status = 'active'
  )
$$;

-- ============================================
-- 14. RLS POLICIES FOR NEW TABLES
-- ============================================

-- TENANTS
CREATE POLICY "Super admins can manage all tenants" ON public.tenants FOR ALL USING (is_super_admin());
CREATE POLICY "Tenant owners can view own tenant" ON public.tenants FOR SELECT USING (owner_user_id = auth.uid());
CREATE POLICY "Tenant users can view their tenant" ON public.tenants FOR SELECT USING (id IN (SELECT tenant_id FROM public.tenant_users WHERE user_id = auth.uid()));

-- PACKAGES
CREATE POLICY "Anyone can view active packages" ON public.packages FOR SELECT USING (is_active = true);
CREATE POLICY "Super admins can manage packages" ON public.packages FOR ALL USING (is_super_admin());

-- SUBSCRIPTIONS
CREATE POLICY "Super admins can manage all subscriptions" ON public.subscriptions FOR ALL USING (is_super_admin());
CREATE POLICY "Tenants can view own subscriptions" ON public.subscriptions FOR SELECT USING (tenant_id = get_user_tenant_id());

-- PAYMENTS
CREATE POLICY "Super admins can manage all payments" ON public.payments FOR ALL USING (is_super_admin());
CREATE POLICY "Tenants can view own payments" ON public.payments FOR SELECT USING (tenant_id = get_user_tenant_id());
CREATE POLICY "Tenants can create payments" ON public.payments FOR INSERT WITH CHECK (tenant_id = get_user_tenant_id());

-- INVOICES
CREATE POLICY "Super admins can manage all invoices" ON public.invoices FOR ALL USING (is_super_admin());
CREATE POLICY "Tenants can view own invoices" ON public.invoices FOR SELECT USING (tenant_id = get_user_tenant_id());

-- PAYMENT GATEWAY SETTINGS
CREATE POLICY "Super admins can manage payment gateways" ON public.payment_gateway_settings FOR ALL USING (is_super_admin());
CREATE POLICY "Anyone can view enabled payment gateways" ON public.payment_gateway_settings FOR SELECT USING (is_enabled = true);

-- SMS GATEWAY SETTINGS
CREATE POLICY "Super admins can manage SMS gateway" ON public.sms_gateway_settings FOR ALL USING (is_super_admin());

-- SMS LOGS
CREATE POLICY "Super admins can view all SMS logs" ON public.sms_logs FOR ALL USING (is_super_admin());
CREATE POLICY "Tenants can view own SMS logs" ON public.sms_logs FOR SELECT USING (tenant_id = get_user_tenant_id());

-- TENANT USERS
CREATE POLICY "Super admins can manage all tenant users" ON public.tenant_users FOR ALL USING (is_super_admin());
CREATE POLICY "Tenant admins can manage own tenant users" ON public.tenant_users FOR ALL USING (tenant_id = get_user_tenant_id() AND has_role(auth.uid(), 'admin'));
CREATE POLICY "Users can view own tenant membership" ON public.tenant_users FOR SELECT USING (user_id = auth.uid());

-- ACTIVITY LOGS
CREATE POLICY "Super admins can view all activity" ON public.activity_logs FOR ALL USING (is_super_admin());
CREATE POLICY "Tenants can view own activity" ON public.activity_logs FOR SELECT USING (tenant_id = get_user_tenant_id());

-- ============================================
-- 15. TRIGGERS
-- ============================================
CREATE TRIGGER update_tenants_updated_at BEFORE UPDATE ON public.tenants FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_packages_updated_at BEFORE UPDATE ON public.packages FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_subscriptions_updated_at BEFORE UPDATE ON public.subscriptions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_payments_updated_at BEFORE UPDATE ON public.payments FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_invoices_updated_at BEFORE UPDATE ON public.invoices FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_tenant_users_updated_at BEFORE UPDATE ON public.tenant_users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- 16. INDEXES
-- ============================================
CREATE INDEX idx_tenants_owner ON public.tenants(owner_user_id);
CREATE INDEX idx_tenants_status ON public.tenants(status);
CREATE INDEX idx_tenants_subdomain ON public.tenants(subdomain);
CREATE INDEX idx_tenants_custom_domain ON public.tenants(custom_domain);
CREATE INDEX idx_subscriptions_tenant ON public.subscriptions(tenant_id);
CREATE INDEX idx_subscriptions_status ON public.subscriptions(status);
CREATE INDEX idx_payments_tenant ON public.payments(tenant_id);
CREATE INDEX idx_payments_status ON public.payments(status);
CREATE INDEX idx_invoices_tenant ON public.invoices(tenant_id);
CREATE INDEX idx_tenant_users_user ON public.tenant_users(user_id);
CREATE INDEX idx_tenant_users_tenant ON public.tenant_users(tenant_id);
CREATE INDEX idx_olts_tenant ON public.olts(tenant_id);
CREATE INDEX idx_activity_logs_tenant ON public.activity_logs(tenant_id);
CREATE INDEX idx_activity_logs_user ON public.activity_logs(user_id);

-- ============================================
-- 17. ENABLE REALTIME
-- ============================================
ALTER PUBLICATION supabase_realtime ADD TABLE public.tenants;
ALTER PUBLICATION supabase_realtime ADD TABLE public.subscriptions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.payments;