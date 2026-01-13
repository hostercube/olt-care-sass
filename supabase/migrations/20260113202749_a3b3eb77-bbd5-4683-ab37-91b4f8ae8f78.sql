-- Add separate switch to show the details popup independently of required flags
ALTER TABLE public.tenant_location_settings
ADD COLUMN IF NOT EXISTS popup_enabled boolean NOT NULL DEFAULT false;

-- Keep existing behavior: if previously name/phone were required, popup should be enabled
UPDATE public.tenant_location_settings
SET popup_enabled = true
WHERE (COALESCE(require_name,false) = true OR COALESCE(require_phone,false) = true)
  AND popup_enabled = false;