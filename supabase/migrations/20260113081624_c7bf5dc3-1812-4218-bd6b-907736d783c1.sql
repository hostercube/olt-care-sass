-- Add website settings columns to tenants table for custom menus and extra features
ALTER TABLE public.tenants 
ADD COLUMN IF NOT EXISTS landing_page_ftp_enabled BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS landing_page_ftp_url TEXT,
ADD COLUMN IF NOT EXISTS landing_page_livetv_enabled BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS landing_page_livetv_url TEXT,
ADD COLUMN IF NOT EXISTS landing_page_custom_menus JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS landing_page_section_order JSONB DEFAULT '["hero","features","packages","stats","whyus","coverage","contact","footer"]'::jsonb,
ADD COLUMN IF NOT EXISTS landing_page_social_instagram TEXT,
ADD COLUMN IF NOT EXISTS landing_page_social_twitter TEXT,
ADD COLUMN IF NOT EXISTS landing_page_whatsapp TEXT;

-- Add RLS policy for public access to connection_requests (for landing page submissions)
DROP POLICY IF EXISTS "Public can create connection_requests for landing page" ON public.connection_requests;
CREATE POLICY "Public can create connection_requests for landing page" ON public.connection_requests 
FOR INSERT WITH CHECK (true);

-- Add policy for public to read tenant landing page settings
DROP POLICY IF EXISTS "Public can view tenant landing pages" ON public.tenants;
CREATE POLICY "Public can view tenant landing pages" ON public.tenants
FOR SELECT USING (landing_page_enabled = true OR is_super_admin() OR id = get_user_tenant_id());