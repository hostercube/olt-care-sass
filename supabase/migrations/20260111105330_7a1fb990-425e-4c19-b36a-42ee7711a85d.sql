
-- Add allowed MikroTik routers and OLTs to resellers table
-- These will restrict which devices a reseller can create customers for

ALTER TABLE public.resellers
ADD COLUMN IF NOT EXISTS allowed_mikrotik_ids TEXT[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS allowed_olt_ids TEXT[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS can_transfer_balance BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS can_view_reports BOOLEAN DEFAULT FALSE;

-- Add comment for documentation
COMMENT ON COLUMN public.resellers.allowed_mikrotik_ids IS 'Array of MikroTik router IDs this reseller can create customers for';
COMMENT ON COLUMN public.resellers.allowed_olt_ids IS 'Array of OLT IDs this reseller can create customers for';
