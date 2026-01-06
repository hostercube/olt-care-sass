-- Add is_public column to packages for visibility control (public packages show on website)
ALTER TABLE public.packages ADD COLUMN IF NOT EXISTS is_public BOOLEAN DEFAULT true;

-- Add manual_features and manual_limits columns to tenants for manual permission overrides
ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS manual_features JSONB;
ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS manual_limits JSONB;
ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS manual_features_enabled BOOLEAN DEFAULT false;

-- Add columns for extended limits on tenants that can override package limits  
ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS max_onus INTEGER;
ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS max_mikrotiks INTEGER;
ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS max_customers INTEGER;
ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS max_areas INTEGER;
ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS max_resellers INTEGER;

-- Comment for clarity
COMMENT ON COLUMN public.packages.is_public IS 'If true, package is visible on public website and subscription list. If false, only super admin can assign.';
COMMENT ON COLUMN public.tenants.manual_features IS 'Manual feature overrides for this tenant. When manual_features_enabled is true, these override package features.';
COMMENT ON COLUMN public.tenants.manual_features_enabled IS 'If true, manual_features override the package features.';
COMMENT ON COLUMN public.tenants.manual_limits IS 'Manual resource limit overrides for this tenant.';