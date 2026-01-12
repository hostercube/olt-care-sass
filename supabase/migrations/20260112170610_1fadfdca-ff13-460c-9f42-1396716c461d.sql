-- Add branding fields to tenants table
ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS subtitle TEXT;
ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS favicon_url TEXT;

-- Add comment for documentation
COMMENT ON COLUMN public.tenants.subtitle IS 'Company tagline/subtitle for branding';
COMMENT ON COLUMN public.tenants.favicon_url IS 'Favicon/Icon URL for browser tabs';
COMMENT ON COLUMN public.tenants.logo_url IS 'Company logo URL for invoices and login pages';