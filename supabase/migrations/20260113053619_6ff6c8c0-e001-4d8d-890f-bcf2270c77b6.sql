-- Add dashboard_theme column to tenants table for storing prebuilt theme selection
ALTER TABLE public.tenants 
ADD COLUMN IF NOT EXISTS dashboard_theme TEXT DEFAULT 'dark-default';

-- Add comment for clarity
COMMENT ON COLUMN public.tenants.dashboard_theme IS 'Selected dashboard theme: dark-default, light-default, admin-lte, dark-fixed, light-fixed, etc.';