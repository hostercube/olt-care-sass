-- =====================================================
-- TENANT-SPECIFIC GATEWAYS & MODULE PERMISSIONS MIGRATION
-- =====================================================

-- 1. Create tenant_payment_gateways table for tenant-specific payment configs
CREATE TABLE public.tenant_payment_gateways (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  gateway public.payment_method NOT NULL,
  display_name TEXT NOT NULL,
  is_enabled BOOLEAN DEFAULT false,
  sandbox_mode BOOLEAN DEFAULT true,
  config JSONB DEFAULT '{}',
  instructions TEXT,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(tenant_id, gateway)
);

-- Enable RLS
ALTER TABLE public.tenant_payment_gateways ENABLE ROW LEVEL SECURITY;

-- RLS policies for tenant_payment_gateways
CREATE POLICY "Super admins full access to tenant_payment_gateways"
  ON public.tenant_payment_gateways FOR ALL
  USING (is_super_admin());

CREATE POLICY "Tenant users can manage own payment gateways"
  ON public.tenant_payment_gateways FOR ALL
  USING (tenant_id = get_user_tenant_id());

-- 2. Create tenant_sms_gateways table for tenant-specific SMS configs
CREATE TABLE public.tenant_sms_gateways (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE UNIQUE,
  provider TEXT NOT NULL DEFAULT 'smsnoc',
  api_key TEXT,
  api_url TEXT DEFAULT 'https://app.smsnoc.com/api/v3/sms/send',
  sender_id TEXT,
  is_enabled BOOLEAN DEFAULT false,
  config JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.tenant_sms_gateways ENABLE ROW LEVEL SECURITY;

-- RLS policies for tenant_sms_gateways
CREATE POLICY "Super admins full access to tenant_sms_gateways"
  ON public.tenant_sms_gateways FOR ALL
  USING (is_super_admin());

CREATE POLICY "Tenant users can manage own SMS gateways"
  ON public.tenant_sms_gateways FOR ALL
  USING (tenant_id = get_user_tenant_id());

-- 3. Create tenant_email_gateways table for tenant-specific email configs
CREATE TABLE public.tenant_email_gateways (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE UNIQUE,
  provider TEXT NOT NULL DEFAULT 'smtp',
  smtp_host TEXT,
  smtp_port INTEGER DEFAULT 587,
  smtp_username TEXT,
  smtp_password TEXT,
  use_tls BOOLEAN DEFAULT true,
  sender_name TEXT DEFAULT 'ISP Management',
  sender_email TEXT,
  is_enabled BOOLEAN DEFAULT false,
  config JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.tenant_email_gateways ENABLE ROW LEVEL SECURITY;

-- RLS policies for tenant_email_gateways
CREATE POLICY "Super admins full access to tenant_email_gateways"
  ON public.tenant_email_gateways FOR ALL
  USING (is_super_admin());

CREATE POLICY "Tenant users can manage own email gateways"
  ON public.tenant_email_gateways FOR ALL
  USING (tenant_id = get_user_tenant_id());

-- 4. Create tenant_backups table for backup metadata
CREATE TABLE public.tenant_backups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  backup_type TEXT NOT NULL DEFAULT 'full',
  file_name TEXT NOT NULL,
  file_size BIGINT,
  status TEXT NOT NULL DEFAULT 'pending',
  error_message TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT now(),
  completed_at TIMESTAMPTZ
);

-- Enable RLS
ALTER TABLE public.tenant_backups ENABLE ROW LEVEL SECURITY;

-- RLS policies for tenant_backups
CREATE POLICY "Super admins full access to tenant_backups"
  ON public.tenant_backups FOR ALL
  USING (is_super_admin());

CREATE POLICY "Tenant admins can view own backups"
  ON public.tenant_backups FOR SELECT
  USING (tenant_id = get_user_tenant_id());

CREATE POLICY "Tenant admins can create backups"
  ON public.tenant_backups FOR INSERT
  WITH CHECK (tenant_id = get_user_tenant_id() AND has_role(auth.uid(), 'admin'));

-- 5. Add updated_at triggers
CREATE TRIGGER update_tenant_payment_gateways_updated_at
  BEFORE UPDATE ON public.tenant_payment_gateways
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_tenant_sms_gateways_updated_at
  BEFORE UPDATE ON public.tenant_sms_gateways
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_tenant_email_gateways_updated_at
  BEFORE UPDATE ON public.tenant_email_gateways
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 6. Create function to initialize default payment gateways for new tenant
CREATE OR REPLACE FUNCTION public.initialize_tenant_gateways(_tenant_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Insert default payment gateways
  INSERT INTO public.tenant_payment_gateways (tenant_id, gateway, display_name, sort_order)
  VALUES
    (_tenant_id, 'sslcommerz', 'SSLCommerz', 1),
    (_tenant_id, 'bkash', 'bKash', 2),
    (_tenant_id, 'rocket', 'Rocket', 3),
    (_tenant_id, 'nagad', 'Nagad', 4),
    (_tenant_id, 'manual', 'Manual Payment', 5)
  ON CONFLICT (tenant_id, gateway) DO NOTHING;
  
  -- Insert default SMS gateway
  INSERT INTO public.tenant_sms_gateways (tenant_id, provider)
  VALUES (_tenant_id, 'smsnoc')
  ON CONFLICT (tenant_id) DO NOTHING;
  
  -- Insert default email gateway
  INSERT INTO public.tenant_email_gateways (tenant_id, provider)
  VALUES (_tenant_id, 'smtp')
  ON CONFLICT (tenant_id) DO NOTHING;
END;
$$;

-- 7. Create function to export tenant data (for backup)
CREATE OR REPLACE FUNCTION public.export_tenant_data(_tenant_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _result JSONB;
BEGIN
  SELECT jsonb_build_object(
    'tenant', (SELECT row_to_json(t) FROM tenants t WHERE id = _tenant_id),
    'customers', (SELECT COALESCE(jsonb_agg(row_to_json(c)), '[]'::jsonb) FROM customers c WHERE tenant_id = _tenant_id),
    'areas', (SELECT COALESCE(jsonb_agg(row_to_json(a)), '[]'::jsonb) FROM areas a WHERE tenant_id = _tenant_id),
    'resellers', (SELECT COALESCE(jsonb_agg(row_to_json(r)), '[]'::jsonb) FROM resellers r WHERE tenant_id = _tenant_id),
    'isp_packages', (SELECT COALESCE(jsonb_agg(row_to_json(p)), '[]'::jsonb) FROM isp_packages p WHERE tenant_id = _tenant_id),
    'mikrotik_routers', (SELECT COALESCE(jsonb_agg(row_to_json(m)), '[]'::jsonb) FROM mikrotik_routers m WHERE tenant_id = _tenant_id),
    'customer_bills', (SELECT COALESCE(jsonb_agg(row_to_json(cb)), '[]'::jsonb) FROM customer_bills cb WHERE tenant_id = _tenant_id),
    'customer_payments', (SELECT COALESCE(jsonb_agg(row_to_json(cp)), '[]'::jsonb) FROM customer_payments cp WHERE tenant_id = _tenant_id),
    'billing_rules', (SELECT COALESCE(jsonb_agg(row_to_json(br)), '[]'::jsonb) FROM billing_rules br WHERE tenant_id = _tenant_id),
    'exported_at', now()
  ) INTO _result;
  
  RETURN _result;
END;
$$;