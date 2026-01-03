-- Add more limit columns to packages table
ALTER TABLE public.packages 
ADD COLUMN IF NOT EXISTS max_mikrotiks integer DEFAULT 1,
ADD COLUMN IF NOT EXISTS max_customers integer DEFAULT NULL,
ADD COLUMN IF NOT EXISTS max_areas integer DEFAULT NULL,
ADD COLUMN IF NOT EXISTS max_resellers integer DEFAULT NULL;

-- Update features JSONB default to include all new module/gateway permissions
ALTER TABLE public.packages 
ALTER COLUMN features SET DEFAULT '{
  "olt_care": true,
  "isp_billing": false,
  "isp_customers": false,
  "isp_resellers": false,
  "isp_mikrotik": false,
  "isp_areas": false,
  "isp_crm": false,
  "isp_inventory": false,
  "sms_alerts": false,
  "email_alerts": false,
  "api_access": false,
  "custom_domain": false,
  "white_label": false,
  "advanced_monitoring": false,
  "multi_user": false,
  "payment_gateways": {
    "sslcommerz": false,
    "bkash": false,
    "rocket": false,
    "nagad": false,
    "manual": true
  },
  "sms_gateways": {
    "smsnoc": false,
    "custom": false
  },
  "reports_export": false,
  "backup_restore": false
}'::jsonb;

-- Add comment for documentation
COMMENT ON COLUMN public.packages.max_mikrotiks IS 'Maximum number of MikroTik routers allowed';
COMMENT ON COLUMN public.packages.max_customers IS 'Maximum number of customers allowed (NULL = unlimited)';
COMMENT ON COLUMN public.packages.max_areas IS 'Maximum number of areas allowed (NULL = unlimited)';
COMMENT ON COLUMN public.packages.max_resellers IS 'Maximum number of resellers allowed (NULL = unlimited)';