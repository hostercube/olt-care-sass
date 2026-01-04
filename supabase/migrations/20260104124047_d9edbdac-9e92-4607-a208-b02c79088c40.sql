-- Add allowed_payment_gateways column to packages table
-- This controls which gateways are available for each SaaS package tier
ALTER TABLE public.packages
ADD COLUMN IF NOT EXISTS allowed_payment_gateways text[] DEFAULT ARRAY['manual', 'rocket'];

-- Add bkash_mode column to tenant_payment_gateways to select tokenized vs checkout.js
ALTER TABLE public.tenant_payment_gateways
ADD COLUMN IF NOT EXISTS bkash_mode text DEFAULT 'tokenized';

-- Update comment for clarity
COMMENT ON COLUMN public.packages.allowed_payment_gateways IS 'Array of gateway names allowed for this package tier';
COMMENT ON COLUMN public.tenant_payment_gateways.bkash_mode IS 'tokenized or checkout_js';