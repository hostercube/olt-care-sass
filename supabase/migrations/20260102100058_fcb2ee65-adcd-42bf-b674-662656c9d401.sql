-- Add new columns to onus table for ONU vendor information from OLT
ALTER TABLE public.onus 
ADD COLUMN IF NOT EXISTS vendor_id text,
ADD COLUMN IF NOT EXISTS model_id text,
ADD COLUMN IF NOT EXISTS hardware_version text,
ADD COLUMN IF NOT EXISTS software_version text,
ADD COLUMN IF NOT EXISTS alive_time text;

-- Add comment for documentation
COMMENT ON COLUMN public.onus.vendor_id IS 'ONU Vendor ID from OLT (e.g., XPON, VSOL, HWTC, DBCE)';
COMMENT ON COLUMN public.onus.model_id IS 'ONU Model ID from OLT (e.g., ONU, V711, V601)';
COMMENT ON COLUMN public.onus.hardware_version IS 'ONU hardware version from OLT';
COMMENT ON COLUMN public.onus.software_version IS 'ONU software/firmware version from OLT';
COMMENT ON COLUMN public.onus.alive_time IS 'ONU uptime/alive time from OLT';