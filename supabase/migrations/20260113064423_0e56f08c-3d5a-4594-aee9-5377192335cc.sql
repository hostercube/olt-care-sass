-- Add landing page settings to tenants table
ALTER TABLE public.tenants 
ADD COLUMN IF NOT EXISTS landing_page_enabled BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS landing_page_template VARCHAR(50) DEFAULT 'modern-blue',
ADD COLUMN IF NOT EXISTS landing_page_show_packages BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS landing_page_show_contact BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS landing_page_contact_phone VARCHAR(50),
ADD COLUMN IF NOT EXISTS landing_page_contact_email VARCHAR(100),
ADD COLUMN IF NOT EXISTS landing_page_contact_address TEXT,
ADD COLUMN IF NOT EXISTS landing_page_social_facebook VARCHAR(255),
ADD COLUMN IF NOT EXISTS landing_page_social_youtube VARCHAR(255),
ADD COLUMN IF NOT EXISTS landing_page_hero_title TEXT,
ADD COLUMN IF NOT EXISTS landing_page_hero_subtitle TEXT,
ADD COLUMN IF NOT EXISTS landing_page_about_text TEXT;

-- Add subdomain/slug column if not exists  
ALTER TABLE public.tenants 
ADD COLUMN IF NOT EXISTS slug VARCHAR(100);

-- Create unique index on slug
CREATE UNIQUE INDEX IF NOT EXISTS tenants_slug_unique_idx ON public.tenants(slug) WHERE slug IS NOT NULL;

-- Add comments for clarity
COMMENT ON COLUMN public.tenants.landing_page_enabled IS 'Enable/disable public landing page for this tenant';
COMMENT ON COLUMN public.tenants.landing_page_template IS 'Selected landing page template design';
COMMENT ON COLUMN public.tenants.landing_page_show_packages IS 'Show package pricing on landing page';
COMMENT ON COLUMN public.tenants.landing_page_show_contact IS 'Show contact form on landing page';
COMMENT ON COLUMN public.tenants.slug IS 'URL-friendly unique identifier for tenant subdomain';