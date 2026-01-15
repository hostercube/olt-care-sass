-- Add rejection_reason column to customer_recharges
ALTER TABLE public.customer_recharges ADD COLUMN IF NOT EXISTS rejection_reason TEXT;