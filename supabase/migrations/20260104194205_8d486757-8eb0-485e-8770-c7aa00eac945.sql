-- Add new fields to mikrotik_routers for delete permissions
ALTER TABLE public.mikrotik_routers
ADD COLUMN IF NOT EXISTS allow_customer_delete boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS allow_queue_delete boolean DEFAULT true;

-- Update isp_packages to support billing cycle type instead of just validity_days
-- Add billing_cycle column ('monthly', '3-monthly', '6-monthly', 'yearly')
ALTER TABLE public.isp_packages
ADD COLUMN IF NOT EXISTS billing_cycle text DEFAULT 'monthly';

-- Add comment for clarity
COMMENT ON COLUMN public.mikrotik_routers.allow_customer_delete IS 'Whether deleting customer from software also deletes PPPoE secret from MikroTik';
COMMENT ON COLUMN public.mikrotik_routers.allow_queue_delete IS 'Whether deleting customer from software also deletes queue from MikroTik';
COMMENT ON COLUMN public.isp_packages.billing_cycle IS 'Billing cycle: monthly, 3-monthly, 6-monthly, yearly';