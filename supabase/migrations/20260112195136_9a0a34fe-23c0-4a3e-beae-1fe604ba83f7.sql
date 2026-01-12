-- Add tracking fields for due payment status changes
ALTER TABLE public.customer_recharges 
ADD COLUMN IF NOT EXISTS paid_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS paid_by TEXT,
ADD COLUMN IF NOT EXISTS paid_by_name TEXT,
ADD COLUMN IF NOT EXISTS original_payment_method TEXT;

-- Add comment
COMMENT ON COLUMN public.customer_recharges.paid_at IS 'Timestamp when due payment was marked as paid';
COMMENT ON COLUMN public.customer_recharges.paid_by IS 'User ID who marked the due as paid';
COMMENT ON COLUMN public.customer_recharges.paid_by_name IS 'Name of who collected the due payment';
COMMENT ON COLUMN public.customer_recharges.original_payment_method IS 'Original payment method before status change';