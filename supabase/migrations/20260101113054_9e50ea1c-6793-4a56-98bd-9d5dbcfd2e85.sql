-- Add router_mac column to onus table for storing the CPE/router MAC address
-- This is different from ONU MAC - router MAC comes from PPPoE session caller-id
ALTER TABLE public.onus ADD COLUMN IF NOT EXISTS router_mac text;

-- Add comment for clarity
COMMENT ON COLUMN public.onus.router_mac IS 'MAC address of the CPE/router behind the ONU (from PPPoE session caller-id)';