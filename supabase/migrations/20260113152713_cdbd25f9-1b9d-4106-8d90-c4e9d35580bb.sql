-- Add SSL provisioning columns to tenant_custom_domains
ALTER TABLE public.tenant_custom_domains 
ADD COLUMN IF NOT EXISTS ssl_issued_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS ssl_expires_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS ssl_error text,
ADD COLUMN IF NOT EXISTS nginx_config_path text,
ADD COLUMN IF NOT EXISTS ssl_provisioning_status text DEFAULT 'pending';

-- Add comment for documentation
COMMENT ON COLUMN public.tenant_custom_domains.ssl_provisioning_status IS 'Status: pending, dns_verified, issuing, active, failed, expired';
COMMENT ON COLUMN public.tenant_custom_domains.ssl_issued_at IS 'Timestamp when SSL certificate was issued';
COMMENT ON COLUMN public.tenant_custom_domains.ssl_expires_at IS 'Timestamp when SSL certificate expires';
COMMENT ON COLUMN public.tenant_custom_domains.ssl_error IS 'Error message if SSL issuance failed';
COMMENT ON COLUMN public.tenant_custom_domains.nginx_config_path IS 'Path to the generated Nginx config file';