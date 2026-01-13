-- Add slug locking and dark mode columns to tenants table
ALTER TABLE public.tenants 
ADD COLUMN IF NOT EXISTS landing_page_slug_locked boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS landing_page_dark_mode boolean DEFAULT true;

-- Add comment for clarity
COMMENT ON COLUMN public.tenants.landing_page_slug_locked IS 'When true, tenant cannot edit their URL slug. Only super admin can unlock.';
COMMENT ON COLUMN public.tenants.landing_page_dark_mode IS 'Controls dark/light mode for the public landing page. True = dark mode.';