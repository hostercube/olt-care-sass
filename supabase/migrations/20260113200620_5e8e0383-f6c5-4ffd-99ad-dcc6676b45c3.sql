-- Normalize tenant location settings so popup/form logic works reliably

UPDATE public.tenant_location_settings
SET
  require_name = COALESCE(require_name, false),
  require_phone = COALESCE(require_phone, false),
  popup_title = COALESCE(NULLIF(popup_title, ''), 'Please provide your details'),
  popup_description = COALESCE(NULLIF(popup_description, ''), 'Enter your name and phone number for verification')
WHERE
  require_name IS NULL
  OR require_phone IS NULL
  OR popup_title IS NULL OR popup_title = ''
  OR popup_description IS NULL OR popup_description = '';

ALTER TABLE public.tenant_location_settings
  ALTER COLUMN require_name SET DEFAULT false,
  ALTER COLUMN require_phone SET DEFAULT false,
  ALTER COLUMN require_name SET NOT NULL,
  ALTER COLUMN require_phone SET NOT NULL,
  ALTER COLUMN popup_title SET NOT NULL,
  ALTER COLUMN popup_description SET NOT NULL;
