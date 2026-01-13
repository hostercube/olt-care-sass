-- Add customer portal registration settings to tenants table
ALTER TABLE public.tenants 
ADD COLUMN IF NOT EXISTS customer_portal_enabled BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS customer_registration_enabled BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS customer_registration_auto_approve BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS customer_registration_auto_pppoe BOOLEAN DEFAULT false;

-- Add comments for clarity
COMMENT ON COLUMN public.tenants.customer_portal_enabled IS 'Enable/disable customer portal access';
COMMENT ON COLUMN public.tenants.customer_registration_enabled IS 'Allow public customer registration';
COMMENT ON COLUMN public.tenants.customer_registration_auto_approve IS 'Auto-approve registrations (no pending status)';
COMMENT ON COLUMN public.tenants.customer_registration_auto_pppoe IS 'Auto-create PPPoE credentials on registration';