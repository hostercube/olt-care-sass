-- Fix referral base URL generation to match actual public access.
-- Priority:
-- 1) Verified custom domain (tenant_custom_domains) => https://{domain or subdomain.domain}/?ref=CODE
-- 2) Landing page enabled => https://oltapp.isppoint.com/p/{tenant_slug}/?ref=CODE
-- 3) Fallback => https://oltapp.isppoint.com/p/{tenant_slug}/?ref=CODE

CREATE OR REPLACE FUNCTION public.get_tenant_referral_domain(p_tenant_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tenant_slug TEXT;
  v_landing_enabled BOOLEAN;
  v_domain_root TEXT;
  v_domain_sub TEXT;
BEGIN
  SELECT slug, COALESCE(landing_page_enabled, false)
  INTO v_tenant_slug, v_landing_enabled
  FROM public.tenants
  WHERE id = p_tenant_id;

  -- 1) Custom domain: pick most recently updated verified domain
  SELECT tcd.domain, tcd.subdomain
  INTO v_domain_root, v_domain_sub
  FROM public.tenant_custom_domains tcd
  WHERE tcd.tenant_id = p_tenant_id
    AND tcd.is_verified = true
  ORDER BY tcd.updated_at DESC NULLS LAST, tcd.created_at DESC
  LIMIT 1;

  IF v_domain_root IS NOT NULL AND TRIM(v_domain_root) <> '' THEN
    IF v_domain_sub IS NOT NULL AND TRIM(v_domain_sub) <> '' THEN
      RETURN TRIM(v_domain_sub) || '.' || TRIM(v_domain_root);
    END IF;
    RETURN TRIM(v_domain_root);
  END IF;

  -- 2) Landing page enabled (or even if disabled, the /p/{slug} route still works as a fallback public entry)
  IF v_tenant_slug IS NOT NULL AND TRIM(v_tenant_slug) <> '' THEN
    -- NOTE: In this deployment, the publicly served platform host is oltapp.isppoint.com (root isppoint.com is NOT serving the SPA)
    RETURN 'oltapp.isppoint.com/p/' || TRIM(v_tenant_slug);
  END IF;

  -- Final fallback
  RETURN 'oltapp.isppoint.com';
END;
$$;