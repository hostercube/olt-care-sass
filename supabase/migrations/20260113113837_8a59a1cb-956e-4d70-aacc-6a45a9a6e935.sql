-- Landing page: richer hero editor fields
ALTER TABLE public.tenants
  ADD COLUMN IF NOT EXISTS landing_page_hero_slides jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS landing_page_hero_badge_text text,
  ADD COLUMN IF NOT EXISTS landing_page_hero_primary_button_text text,
  ADD COLUMN IF NOT EXISTS landing_page_hero_primary_button_url text,
  ADD COLUMN IF NOT EXISTS landing_page_hero_secondary_button_text text,
  ADD COLUMN IF NOT EXISTS landing_page_hero_secondary_button_url text,
  ADD COLUMN IF NOT EXISTS landing_page_hero_background_url text;

-- Slug availability check (safe for client usage)
CREATE OR REPLACE FUNCTION public.is_tenant_landing_slug_available(p_slug text, p_current_tenant_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_slug text;
  v_exists boolean;
BEGIN
  v_slug := lower(trim(p_slug));
  IF v_slug IS NULL OR v_slug = '' THEN
    RETURN false;
  END IF;

  SELECT EXISTS(
    SELECT 1
    FROM public.tenants t
    WHERE t.id <> p_current_tenant_id
      AND (
        lower(coalesce(t.slug, '')) = v_slug
        OR lower(coalesce(t.subdomain, '')) = v_slug
      )
  ) INTO v_exists;

  RETURN NOT v_exists;
END;
$$;

REVOKE ALL ON FUNCTION public.is_tenant_landing_slug_available(text, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_tenant_landing_slug_available(text, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_tenant_landing_slug_available(text, uuid) TO anon;
