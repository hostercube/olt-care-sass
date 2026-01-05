-- Add expired profile settings to mikrotik_routers table
ALTER TABLE public.mikrotik_routers 
ADD COLUMN IF NOT EXISTS use_expired_profile boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS expired_profile_name text DEFAULT 'expired';

-- Add comment for documentation
COMMENT ON COLUMN public.mikrotik_routers.use_expired_profile IS 'If true, expired customers switch to expired_profile instead of being disabled';
COMMENT ON COLUMN public.mikrotik_routers.expired_profile_name IS 'MikroTik profile name to use for expired customers (e.g., expired, restricted)';