-- Add SEO fields for tenant landing page
ALTER TABLE public.tenants
  ADD COLUMN IF NOT EXISTS landing_page_meta_title text,
  ADD COLUMN IF NOT EXISTS landing_page_meta_description text,
  ADD COLUMN IF NOT EXISTS landing_page_og_image_url text,
  ADD COLUMN IF NOT EXISTS landing_page_canonical_url text;

-- Optional: basic length guidance via comments
COMMENT ON COLUMN public.tenants.landing_page_meta_title IS 'SEO title for public landing page (recommended < 60 chars)';
COMMENT ON COLUMN public.tenants.landing_page_meta_description IS 'SEO meta description for public landing page (recommended < 160 chars)';
COMMENT ON COLUMN public.tenants.landing_page_og_image_url IS 'OpenGraph image URL for sharing';
COMMENT ON COLUMN public.tenants.landing_page_canonical_url IS 'Canonical URL override for public landing page';