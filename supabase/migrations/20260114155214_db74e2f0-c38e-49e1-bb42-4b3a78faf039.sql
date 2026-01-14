-- Fix function search paths for security

CREATE OR REPLACE FUNCTION public.get_customer_referral_stats(p_customer_id UUID)
RETURNS TABLE (
  referral_code TEXT,
  total_referrals BIGINT,
  successful_referrals BIGINT,
  bonus_earned NUMERIC,
  bonus_balance NUMERIC
) LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
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

CREATE OR REPLACE FUNCTION public.generate_customer_referral_code(p_customer_id UUID)
RETURNS TEXT LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_code TEXT;
  v_customer_code TEXT;
BEGIN
  SELECT customer_code INTO v_customer_code FROM public.customers WHERE id = p_customer_id;
  v_code := UPPER(COALESCE(v_customer_code, 'REF')) || '-' || UPPER(SUBSTRING(md5(random()::text) FROM 1 FOR 6));
  UPDATE public.customers SET referral_code = v_code WHERE id = p_customer_id AND referral_code IS NULL;
  SELECT referral_code INTO v_code FROM public.customers WHERE id = p_customer_id;
  RETURN v_code;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_customer_apps_config(p_tenant_id UUID)
RETURNS JSON LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
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

CREATE OR REPLACE FUNCTION public.get_customer_apps_links(p_tenant_id UUID, p_category TEXT DEFAULT NULL)
RETURNS SETOF public.customer_apps_links LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  RETURN QUERY
  SELECT * FROM public.customer_apps_links
  WHERE tenant_id = p_tenant_id 
    AND is_active = true
    AND (p_category IS NULL OR category = p_category)
  ORDER BY sort_order, title;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_referral_config(p_tenant_id UUID)
RETURNS JSON LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
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

CREATE OR REPLACE FUNCTION public.track_referral_signup(
  p_referral_code TEXT,
  p_referred_customer_id UUID
)
RETURNS BOOLEAN LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_referrer_id UUID;
  v_tenant_id UUID;
  v_config RECORD;
  v_bonus NUMERIC;
BEGIN
  SELECT id, tenant_id INTO v_referrer_id, v_tenant_id 
  FROM public.customers 
  WHERE referral_code = p_referral_code;
  
  IF v_referrer_id IS NULL THEN
    RETURN FALSE;
  END IF;
  
  SELECT * INTO v_config FROM public.referral_configs WHERE tenant_id = v_tenant_id AND is_enabled = true;
  
  IF v_config IS NULL THEN
    RETURN FALSE;
  END IF;
  
  IF v_config.bonus_type = 'fixed' THEN
    v_bonus := v_config.bonus_amount;
  ELSE
    SELECT COALESCE(monthly_bill * v_config.bonus_percentage / 100, 0) INTO v_bonus
    FROM public.customers WHERE id = p_referred_customer_id;
  END IF;
  
  UPDATE public.customers SET referred_by = v_referrer_id WHERE id = p_referred_customer_id;
  
  INSERT INTO public.customer_referrals (
    tenant_id, referrer_customer_id, referred_customer_id, referral_code, status, bonus_amount
  ) VALUES (
    v_tenant_id, v_referrer_id, p_referred_customer_id, p_referral_code, 'active', v_bonus
  );
  
  UPDATE public.customers SET referral_bonus_balance = COALESCE(referral_bonus_balance, 0) + v_bonus
  WHERE id = v_referrer_id;
  
  RETURN TRUE;
END;
$$;