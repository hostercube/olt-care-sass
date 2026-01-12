-- Add tenant_id column to email_templates table for tenant-specific templates
ALTER TABLE public.email_templates 
ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE;

-- Add is_system column to email_templates for system templates
ALTER TABLE public.email_templates 
ADD COLUMN IF NOT EXISTS is_system boolean DEFAULT false;

-- Create index for tenant_id
CREATE INDEX IF NOT EXISTS idx_email_templates_tenant_id ON public.email_templates(tenant_id);