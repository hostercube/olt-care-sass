-- Add password field for reseller login
ALTER TABLE public.resellers ADD COLUMN IF NOT EXISTS password TEXT;

-- Add connection_type to customers for PPPoE/Static/Hotspot
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS connection_type TEXT DEFAULT 'pppoe';

-- Add login credentials to staff table (for staff/user login)
ALTER TABLE public.staff ADD COLUMN IF NOT EXISTS username TEXT UNIQUE;
ALTER TABLE public.staff ADD COLUMN IF NOT EXISTS password TEXT;
ALTER TABLE public.staff ADD COLUMN IF NOT EXISTS can_login BOOLEAN DEFAULT false;

-- Create tenant_roles table for dynamic role management with permissions
CREATE TABLE IF NOT EXISTS public.tenant_roles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  permissions JSONB DEFAULT '{}'::jsonb,
  is_system BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(tenant_id, name)
);

-- Enable RLS
ALTER TABLE public.tenant_roles ENABLE ROW LEVEL SECURITY;

-- RLS Policies for tenant_roles
CREATE POLICY "Users can view roles from their tenant" 
ON public.tenant_roles 
FOR SELECT 
USING (
  tenant_id IN (SELECT tenant_id FROM public.tenant_users WHERE user_id = auth.uid())
  OR public.is_super_admin()
);

CREATE POLICY "Admins can manage roles in their tenant" 
ON public.tenant_roles 
FOR ALL 
USING (
  tenant_id IN (SELECT tenant_id FROM public.tenant_users WHERE user_id = auth.uid())
  OR public.is_super_admin()
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_tenant_roles_tenant_id ON public.tenant_roles(tenant_id);

-- Insert default roles for each tenant (trigger for new tenants)
CREATE OR REPLACE FUNCTION public.initialize_tenant_roles()
RETURNS TRIGGER AS $$
BEGIN
  -- Insert default system roles
  INSERT INTO public.tenant_roles (tenant_id, name, description, permissions, is_system) VALUES
    (NEW.id, 'Admin', 'Full system access with all permissions', '{
      "can_view_dashboard": true,
      "can_manage_customers": true,
      "can_manage_staff": true,
      "can_manage_resellers": true,
      "can_manage_billing": true,
      "can_manage_settings": true,
      "can_view_reports": true,
      "can_manage_roles": true
    }'::jsonb, true),
    (NEW.id, 'Manager', 'Management access with limited settings', '{
      "can_view_dashboard": true,
      "can_manage_customers": true,
      "can_manage_staff": true,
      "can_manage_resellers": true,
      "can_manage_billing": true,
      "can_manage_settings": false,
      "can_view_reports": true,
      "can_manage_roles": false
    }'::jsonb, true),
    (NEW.id, 'Staff', 'Basic staff access', '{
      "can_view_dashboard": true,
      "can_manage_customers": true,
      "can_manage_staff": false,
      "can_manage_resellers": false,
      "can_manage_billing": false,
      "can_manage_settings": false,
      "can_view_reports": false,
      "can_manage_roles": false
    }'::jsonb, true),
    (NEW.id, 'Technician', 'Technical support access', '{
      "can_view_dashboard": true,
      "can_manage_customers": true,
      "can_manage_staff": false,
      "can_manage_resellers": false,
      "can_manage_billing": false,
      "can_manage_settings": false,
      "can_view_reports": false,
      "can_manage_roles": false
    }'::jsonb, true),
    (NEW.id, 'Bill Collector', 'Payment collection access', '{
      "can_view_dashboard": true,
      "can_manage_customers": true,
      "can_manage_staff": false,
      "can_manage_resellers": false,
      "can_manage_billing": true,
      "can_manage_settings": false,
      "can_view_reports": false,
      "can_manage_roles": false
    }'::jsonb, true);
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger for new tenants
DROP TRIGGER IF EXISTS trigger_initialize_tenant_roles ON public.tenants;
CREATE TRIGGER trigger_initialize_tenant_roles
  AFTER INSERT ON public.tenants
  FOR EACH ROW
  EXECUTE FUNCTION public.initialize_tenant_roles();

-- Add role_id reference to staff table
ALTER TABLE public.staff ADD COLUMN IF NOT EXISTS role_id UUID REFERENCES public.tenant_roles(id);

-- Update timestamp trigger for tenant_roles
DROP TRIGGER IF EXISTS update_tenant_roles_updated_at ON public.tenant_roles;
CREATE TRIGGER update_tenant_roles_updated_at
  BEFORE UPDATE ON public.tenant_roles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();