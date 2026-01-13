-- Add new columns for advanced landing page features
ALTER TABLE public.tenants 
ADD COLUMN IF NOT EXISTS landing_page_ftp_servers JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS landing_page_livetv_channels JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS landing_page_custom_sections JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS landing_page_social_linkedin TEXT DEFAULT '',
ADD COLUMN IF NOT EXISTS landing_page_social_tiktok TEXT DEFAULT '',
ADD COLUMN IF NOT EXISTS landing_page_telegram TEXT DEFAULT '';

-- Add comments for documentation
COMMENT ON COLUMN public.tenants.landing_page_ftp_servers IS 'Array of FTP servers with name and url';
COMMENT ON COLUMN public.tenants.landing_page_livetv_channels IS 'Array of Live TV channels with name and url';
COMMENT ON COLUMN public.tenants.landing_page_custom_sections IS 'Array of custom sections for landing page builder';
COMMENT ON COLUMN public.tenants.landing_page_social_linkedin IS 'LinkedIn profile URL';
COMMENT ON COLUMN public.tenants.landing_page_social_tiktok IS 'TikTok profile URL';
COMMENT ON COLUMN public.tenants.landing_page_telegram IS 'Telegram username or link';