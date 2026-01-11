-- Add collected_by_type and collected_by_name columns to track who performed the recharge
ALTER TABLE public.customer_recharges 
ADD COLUMN IF NOT EXISTS collected_by_type TEXT DEFAULT 'manual',
ADD COLUMN IF NOT EXISTS collected_by_name TEXT;

-- Add comment for collected_by_type values
COMMENT ON COLUMN public.customer_recharges.collected_by_type IS 'Type of collector: tenant_admin, staff, reseller, sub_reseller, online_payment, auto';
COMMENT ON COLUMN public.customer_recharges.collected_by_name IS 'Display name of the collector (e.g., reseller username, staff name, or payment method)';

-- Add index for filtering by collected_by_type
CREATE INDEX IF NOT EXISTS idx_customer_recharges_collected_by_type ON public.customer_recharges(collected_by_type);
CREATE INDEX IF NOT EXISTS idx_customer_recharges_reseller_id ON public.customer_recharges(reseller_id);