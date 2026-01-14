-- =============================================
-- REFERRAL SYSTEM TABLES
-- =============================================

-- Referral configuration per tenant
CREATE TABLE IF NOT EXISTS public.referral_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  is_enabled BOOLEAN DEFAULT false,
  bonus_type TEXT DEFAULT 'fixed', -- 'fixed' or 'percentage'
  bonus_amount NUMERIC(10,2) DEFAULT 0,
  bonus_percentage NUMERIC(5,2) DEFAULT 0,
  min_referrals_for_bonus INTEGER DEFAULT 1,
  bonus_validity_days INTEGER DEFAULT 30,
  referral_link_prefix TEXT,
  terms_and_conditions TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(tenant_id)
);

-- Customer referrals tracking
CREATE TABLE IF NOT EXISTS public.customer_referrals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  referrer_customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  referred_customer_id UUID REFERENCES public.customers(id) ON DELETE SET NULL,
  referral_code TEXT NOT NULL,
  status TEXT DEFAULT 'pending', -- 'pending', 'signed_up', 'active', 'bonus_paid'
  bonus_amount NUMERIC(10,2) DEFAULT 0,
  bonus_paid_at TIMESTAMPTZ,
  referred_name TEXT,
  referred_phone TEXT,
  referred_email TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create index for referral code lookups
CREATE INDEX IF NOT EXISTS idx_customer_referrals_code ON public.customer_referrals(referral_code);
CREATE INDEX IF NOT EXISTS idx_customer_referrals_referrer ON public.customer_referrals(referrer_customer_id);
CREATE INDEX IF NOT EXISTS idx_customer_referrals_tenant ON public.customer_referrals(tenant_id);

-- =============================================
-- CUSTOMER APPS MODULE TABLES
-- =============================================

-- Apps configuration per tenant
CREATE TABLE IF NOT EXISTS public.customer_apps_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  -- App Branding
  app_name TEXT,
  app_icon_url TEXT,
  splash_screen_url TEXT,
  -- Dashboard
  dashboard_banner_url TEXT,
  dashboard_banner_link TEXT,
  dashboard_announcement TEXT,
  dashboard_announcement_enabled BOOLEAN DEFAULT false,
  -- Feature Toggles
  live_tv_enabled BOOLEAN DEFAULT false,
  ftp_enabled BOOLEAN DEFAULT false,
  news_enabled BOOLEAN DEFAULT false,
  referral_enabled BOOLEAN DEFAULT false,
  speed_test_enabled BOOLEAN DEFAULT true,
  -- Primary Color for App
  primary_color TEXT DEFAULT '#3B82F6',
  secondary_color TEXT DEFAULT '#10B981',
  -- Play Store / App Store Links
  android_app_url TEXT,
  ios_app_url TEXT,
  -- Additional Settings
  force_update_enabled BOOLEAN DEFAULT false,
  min_app_version TEXT,
  maintenance_mode BOOLEAN DEFAULT false,
  maintenance_message TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(tenant_id)
);

-- App links (Live TV, FTP, News, Custom Links)
CREATE TABLE IF NOT EXISTS public.customer_apps_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  category TEXT NOT NULL, -- 'live_tv', 'ftp', 'news', 'custom'
  title TEXT NOT NULL,
  url TEXT NOT NULL,
  icon_url TEXT,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  requires_login BOOLEAN DEFAULT false,
  open_in_browser BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_apps_links_tenant ON public.customer_apps_links(tenant_id);
CREATE INDEX IF NOT EXISTS idx_apps_links_category ON public.customer_apps_links(category);

-- =============================================
-- ADD REFERRAL MODULE TO FEATURES
-- =============================================

-- Add referral_code to customers table if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'customers' AND column_name = 'referral_code'
  ) THEN
    ALTER TABLE public.customers ADD COLUMN referral_code TEXT;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'customers' AND column_name = 'referred_by'
  ) THEN
    ALTER TABLE public.customers ADD COLUMN referred_by UUID REFERENCES public.customers(id);
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'customers' AND column_name = 'referral_bonus_balance'
  ) THEN
    ALTER TABLE public.customers ADD COLUMN referral_bonus_balance NUMERIC(10,2) DEFAULT 0;
  END IF;
END$$;

-- Create unique index on referral_code
CREATE UNIQUE INDEX IF NOT EXISTS idx_customers_referral_code ON public.customers(referral_code) WHERE referral_code IS NOT NULL;

-- =============================================
-- ENABLE RLS
-- =============================================

ALTER TABLE public.referral_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customer_referrals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customer_apps_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customer_apps_links ENABLE ROW LEVEL SECURITY;

-- RLS Policies for referral_configs
CREATE POLICY "Tenants can view their referral config"
  ON public.referral_configs FOR SELECT
  USING (
    tenant_id IN (SELECT tenant_id FROM public.tenant_users WHERE user_id = auth.uid())
    OR EXISTS (SELECT 1 FROM public.tenant_users WHERE user_id = auth.uid() AND role = 'super_admin')
  );

CREATE POLICY "Tenants can manage their referral config"
  ON public.referral_configs FOR ALL
  USING (
    tenant_id IN (SELECT tenant_id FROM public.tenant_users WHERE user_id = auth.uid() AND role IN ('admin', 'super_admin'))
    OR EXISTS (SELECT 1 FROM public.tenant_users WHERE user_id = auth.uid() AND role = 'super_admin')
  );

-- RLS Policies for customer_referrals
CREATE POLICY "Tenants can view their referrals"
  ON public.customer_referrals FOR SELECT
  USING (
    tenant_id IN (SELECT tenant_id FROM public.tenant_users WHERE user_id = auth.uid())
    OR EXISTS (SELECT 1 FROM public.tenant_users WHERE user_id = auth.uid() AND role = 'super_admin')
  );

CREATE POLICY "Tenants can manage their referrals"
  ON public.customer_referrals FOR ALL
  USING (
    tenant_id IN (SELECT tenant_id FROM public.tenant_users WHERE user_id = auth.uid() AND role IN ('admin', 'super_admin'))
    OR EXISTS (SELECT 1 FROM public.tenant_users WHERE user_id = auth.uid() AND role = 'super_admin')
  );

-- RLS Policies for customer_apps_config
CREATE POLICY "Tenants can view their apps config"
  ON public.customer_apps_config FOR SELECT
  USING (
    tenant_id IN (SELECT tenant_id FROM public.tenant_users WHERE user_id = auth.uid())
    OR EXISTS (SELECT 1 FROM public.tenant_users WHERE user_id = auth.uid() AND role = 'super_admin')
  );

CREATE POLICY "Tenants can manage their apps config"
  ON public.customer_apps_config FOR ALL
  USING (
    tenant_id IN (SELECT tenant_id FROM public.tenant_users WHERE user_id = auth.uid() AND role IN ('admin', 'super_admin'))
    OR EXISTS (SELECT 1 FROM public.tenant_users WHERE user_id = auth.uid() AND role = 'super_admin')
  );

-- RLS Policies for customer_apps_links
CREATE POLICY "Tenants can view their apps links"
  ON public.customer_apps_links FOR SELECT
  USING (
    tenant_id IN (SELECT tenant_id FROM public.tenant_users WHERE user_id = auth.uid())
    OR EXISTS (SELECT 1 FROM public.tenant_users WHERE user_id = auth.uid() AND role = 'super_admin')
  );

CREATE POLICY "Tenants can manage their apps links"
  ON public.customer_apps_links FOR ALL
  USING (
    tenant_id IN (SELECT tenant_id FROM public.tenant_users WHERE user_id = auth.uid() AND role IN ('admin', 'super_admin'))
    OR EXISTS (SELECT 1 FROM public.tenant_users WHERE user_id = auth.uid() AND role = 'super_admin')
  );

-- =============================================
-- RPC FUNCTIONS FOR CUSTOMER APP
-- =============================================

-- Get customer referral stats
CREATE OR REPLACE FUNCTION public.get_customer_referral_stats(p_customer_id UUID)
RETURNS TABLE (
  referral_code TEXT,
  total_referrals BIGINT,
  successful_referrals BIGINT,
  bonus_earned NUMERIC,
  bonus_balance NUMERIC
) LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  RETURN QUERY
  SELECT 
    c.referral_code,
    COUNT(cr.id)::BIGINT as total_referrals,
    COUNT(CASE WHEN cr.status IN ('active', 'bonus_paid') THEN 1 END)::BIGINT as successful_referrals,
    COALESCE(SUM(CASE WHEN cr.status = 'bonus_paid' THEN cr.bonus_amount END), 0) as bonus_earned,
    COALESCE(c.referral_bonus_balance, 0) as bonus_balance
  FROM public.customers c
  LEFT JOIN public.customer_referrals cr ON cr.referrer_customer_id = c.id
  WHERE c.id = p_customer_id
  GROUP BY c.id, c.referral_code, c.referral_bonus_balance;
END;
$$;

-- Generate referral code for customer
CREATE OR REPLACE FUNCTION public.generate_customer_referral_code(p_customer_id UUID)
RETURNS TEXT LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_code TEXT;
  v_customer_code TEXT;
BEGIN
  -- Get customer code
  SELECT customer_code INTO v_customer_code FROM public.customers WHERE id = p_customer_id;
  
  -- Generate code based on customer code + random
  v_code := UPPER(COALESCE(v_customer_code, 'REF')) || '-' || UPPER(SUBSTRING(md5(random()::text) FROM 1 FOR 6));
  
  -- Update customer
  UPDATE public.customers SET referral_code = v_code WHERE id = p_customer_id AND referral_code IS NULL;
  
  -- Return the code
  SELECT referral_code INTO v_code FROM public.customers WHERE id = p_customer_id;
  RETURN v_code;
END;
$$;

-- Get apps config for customer portal (public access)
CREATE OR REPLACE FUNCTION public.get_customer_apps_config(p_tenant_id UUID)
RETURNS JSON LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_config JSON;
BEGIN
  SELECT json_build_object(
    'app_name', app_name,
    'app_icon_url', app_icon_url,
    'splash_screen_url', splash_screen_url,
    'dashboard_banner_url', dashboard_banner_url,
    'dashboard_banner_link', dashboard_banner_link,
    'dashboard_announcement', dashboard_announcement,
    'dashboard_announcement_enabled', dashboard_announcement_enabled,
    'live_tv_enabled', live_tv_enabled,
    'ftp_enabled', ftp_enabled,
    'news_enabled', news_enabled,
    'referral_enabled', referral_enabled,
    'speed_test_enabled', speed_test_enabled,
    'primary_color', primary_color,
    'secondary_color', secondary_color,
    'android_app_url', android_app_url,
    'ios_app_url', ios_app_url,
    'force_update_enabled', force_update_enabled,
    'min_app_version', min_app_version,
    'maintenance_mode', maintenance_mode,
    'maintenance_message', maintenance_message
  ) INTO v_config
  FROM public.customer_apps_config
  WHERE tenant_id = p_tenant_id;
  
  RETURN COALESCE(v_config, '{}'::JSON);
END;
$$;

-- Get apps links for customer portal (public access)
CREATE OR REPLACE FUNCTION public.get_customer_apps_links(p_tenant_id UUID, p_category TEXT DEFAULT NULL)
RETURNS SETOF public.customer_apps_links LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  RETURN QUERY
  SELECT * FROM public.customer_apps_links
  WHERE tenant_id = p_tenant_id 
    AND is_active = true
    AND (p_category IS NULL OR category = p_category)
  ORDER BY sort_order, title;
END;
$$;

-- Get referral config for customer portal
CREATE OR REPLACE FUNCTION public.get_referral_config(p_tenant_id UUID)
RETURNS JSON LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_config JSON;
BEGIN
  SELECT json_build_object(
    'is_enabled', is_enabled,
    'bonus_type', bonus_type,
    'bonus_amount', bonus_amount,
    'bonus_percentage', bonus_percentage,
    'terms_and_conditions', terms_and_conditions
  ) INTO v_config
  FROM public.referral_configs
  WHERE tenant_id = p_tenant_id AND is_enabled = true;
  
  RETURN COALESCE(v_config, '{"is_enabled": false}'::JSON);
END;
$$;

-- Track referral signup
CREATE OR REPLACE FUNCTION public.track_referral_signup(
  p_referral_code TEXT,
  p_referred_customer_id UUID
)
RETURNS BOOLEAN LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_referrer_id UUID;
  v_tenant_id UUID;
  v_config RECORD;
  v_bonus NUMERIC;
BEGIN
  -- Find referrer
  SELECT id, tenant_id INTO v_referrer_id, v_tenant_id 
  FROM public.customers 
  WHERE referral_code = p_referral_code;
  
  IF v_referrer_id IS NULL THEN
    RETURN FALSE;
  END IF;
  
  -- Get referral config
  SELECT * INTO v_config FROM public.referral_configs WHERE tenant_id = v_tenant_id AND is_enabled = true;
  
  IF v_config IS NULL THEN
    RETURN FALSE;
  END IF;
  
  -- Calculate bonus
  IF v_config.bonus_type = 'fixed' THEN
    v_bonus := v_config.bonus_amount;
  ELSE
    -- For percentage, we'll need the customer's monthly bill
    SELECT COALESCE(monthly_bill * v_config.bonus_percentage / 100, 0) INTO v_bonus
    FROM public.customers WHERE id = p_referred_customer_id;
  END IF;
  
  -- Update referred customer's referred_by
  UPDATE public.customers SET referred_by = v_referrer_id WHERE id = p_referred_customer_id;
  
  -- Create referral record
  INSERT INTO public.customer_referrals (
    tenant_id, referrer_customer_id, referred_customer_id, referral_code, status, bonus_amount
  ) VALUES (
    v_tenant_id, v_referrer_id, p_referred_customer_id, p_referral_code, 'active', v_bonus
  );
  
  -- Add bonus to referrer's balance
  UPDATE public.customers SET referral_bonus_balance = COALESCE(referral_bonus_balance, 0) + v_bonus
  WHERE id = v_referrer_id;
  
  RETURN TRUE;
END;
$$;