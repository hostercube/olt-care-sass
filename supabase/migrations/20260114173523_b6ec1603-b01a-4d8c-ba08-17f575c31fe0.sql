-- Fix referral link base path for tenant slug fallback
-- Previously returned: isppoint.com/{slug}
-- Correct is: isppoint.com/p/{slug}

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
BEGIN
  SELECT custom_domain, subdomain, slug
  INTO v_custom_domain, v_subdomain, v_slug
  FROM public.tenants
  WHERE id = p_tenant_id;

  IF v_custom_domain IS NOT NULL AND v_custom_domain != '' THEN
    RETURN v_custom_domain;
  ELSIF v_subdomain IS NOT NULL AND v_subdomain != '' THEN
    RETURN v_subdomain || '.isppoint.com';
  ELSIF v_slug IS NOT NULL AND v_slug != '' THEN
    RETURN 'isppoint.com/p/' || v_slug;
  ELSE
    RETURN 'isppoint.com';
  END IF;
END;
$$;