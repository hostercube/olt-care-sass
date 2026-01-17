-- Add transaction fee percent column to payment gateway settings tables
ALTER TABLE public.payment_gateway_settings 
ADD COLUMN IF NOT EXISTS transaction_fee_percent numeric DEFAULT 0;

ALTER TABLE public.tenant_payment_gateways 
ADD COLUMN IF NOT EXISTS transaction_fee_percent numeric DEFAULT 0;

-- Add fee columns to payments table to track gateway fees
ALTER TABLE public.payments 
ADD COLUMN IF NOT EXISTS gateway_fee numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS net_amount numeric,
ADD COLUMN IF NOT EXISTS fee_percent numeric DEFAULT 0;

-- Add comment explaining the fee columns
COMMENT ON COLUMN public.payment_gateway_settings.transaction_fee_percent IS 'Transaction fee percentage charged by gateway (e.g., 2 = 2%)';
COMMENT ON COLUMN public.tenant_payment_gateways.transaction_fee_percent IS 'Tenant-specific transaction fee percentage (optional, overrides global if set)';
COMMENT ON COLUMN public.payments.gateway_fee IS 'Gateway fee amount deducted from payment';
COMMENT ON COLUMN public.payments.net_amount IS 'Net amount after gateway fee deduction';
COMMENT ON COLUMN public.payments.fee_percent IS 'Fee percentage applied to this payment';