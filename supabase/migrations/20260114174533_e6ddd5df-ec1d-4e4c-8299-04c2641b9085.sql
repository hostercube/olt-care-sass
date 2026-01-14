-- Enhanced referral domain function: 
-- 1. Custom domain (if set) -> use it directly
-- 2. Landing page enabled with slug -> isppoint.com/p/{slug}
-- 3. Fallback -> isppoint.com

CREATE OR REPLACE FUNCTION public.get_tenant_referral_domain(p_tenant_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_custom_domain TEXT;
  v_subdomain TEXT;
  v_slug TEXT;
  v_landing_enabled BOOLEAN;
BEGIN
  -- Get tenant details
  SELECT 
    custom_domain, 
    subdomain, 
    slug,
    COALESCE(landing_page_enabled, false)
  INTO v_custom_domain, v_subdomain, v_slug, v_landing_enabled
  FROM public.tenants
  WHERE id = p_tenant_id;

  -- Priority 1: Custom domain (if exists and not empty)
  IF v_custom_domain IS NOT NULL AND TRIM(v_custom_domain) != '' THEN
    RETURN v_custom_domain;
  END IF;
  
  -- Priority 2: Landing page with slug (if enabled and slug exists)
  IF v_landing_enabled AND v_slug IS NOT NULL AND TRIM(v_slug) != '' THEN
    RETURN 'isppoint.com/p/' || v_slug;
  END IF;
  
  -- Priority 3: Subdomain (if exists)
  IF v_subdomain IS NOT NULL AND TRIM(v_subdomain) != '' THEN
    RETURN v_subdomain || '.isppoint.com';
  END IF;
  
  -- Priority 4: Just slug without landing page check
  IF v_slug IS NOT NULL AND TRIM(v_slug) != '' THEN
    RETURN 'isppoint.com/p/' || v_slug;
  END IF;
  
  -- Fallback: Main domain
  RETURN 'isppoint.com';
END;
$$;