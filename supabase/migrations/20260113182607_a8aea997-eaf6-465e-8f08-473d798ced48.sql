-- Add public SELECT policy for isp_packages (landing page visitors)
-- Allow anonymous users to read active packages for tenants with landing pages enabled
CREATE POLICY "Public can view active packages for landing pages"
ON public.isp_packages
FOR SELECT
USING (
  is_active = true 
  AND tenant_id IN (
    SELECT id FROM public.tenants 
    WHERE landing_page_enabled = true 
    AND landing_page_show_packages = true
  )
);

-- Add public SELECT policy for areas (landing page coverage section)
-- Allow anonymous users to read areas for tenants with landing pages enabled
CREATE POLICY "Public can view areas for landing pages"
ON public.areas
FOR SELECT
USING (
  tenant_id IN (
    SELECT id FROM public.tenants 
    WHERE landing_page_enabled = true
  )
);