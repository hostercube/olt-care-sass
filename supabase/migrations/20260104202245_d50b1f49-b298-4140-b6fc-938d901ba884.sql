-- Add bkash_mode column to payment_gateway_settings
ALTER TABLE public.payment_gateway_settings 
ADD COLUMN IF NOT EXISTS bkash_mode text DEFAULT 'tokenized';

-- Add bkash_mode column to tenant_payment_gateways  
ALTER TABLE public.tenant_payment_gateways
ADD COLUMN IF NOT EXISTS bkash_mode text DEFAULT 'tokenized';

-- Update existing bkash records to have default mode
UPDATE public.payment_gateway_settings 
SET bkash_mode = COALESCE(config->>'bkash_mode', 'tokenized')
WHERE gateway = 'bkash' AND bkash_mode IS NULL;

UPDATE public.tenant_payment_gateways
SET bkash_mode = COALESCE(config->>'bkash_mode', 'tokenized')
WHERE gateway = 'bkash' AND bkash_mode IS NULL;

-- Add comment explaining the field
COMMENT ON COLUMN public.payment_gateway_settings.bkash_mode IS 'bKash API mode: tokenized (redirect) or checkout_js (popup/redirect fallback)';
COMMENT ON COLUMN public.tenant_payment_gateways.bkash_mode IS 'bKash API mode: tokenized (redirect) or checkout_js (popup/redirect fallback)';