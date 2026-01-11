-- Create reseller_roles table for managing reseller permissions
CREATE TABLE public.reseller_roles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  role_type TEXT NOT NULL DEFAULT 'custom', -- 'reseller', 'sub_reseller', 'sub_sub_reseller', 'custom'
  level INTEGER NOT NULL DEFAULT 1, -- 1 = Reseller, 2 = Sub-Reseller, 3 = Sub-Sub-Reseller
  permissions JSONB NOT NULL DEFAULT '{}'::jsonb,
  is_system BOOLEAN NOT NULL DEFAULT false,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.reseller_roles ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Tenant users can view reseller roles"
ON public.reseller_roles
FOR SELECT
USING (true);

CREATE POLICY "Tenant users can manage reseller roles"
ON public.reseller_roles
FOR ALL
USING (true);

-- Add role_id to resellers table
ALTER TABLE public.resellers ADD COLUMN IF NOT EXISTS role_id UUID REFERENCES public.reseller_roles(id);

-- Create index
CREATE INDEX idx_reseller_roles_tenant_id ON public.reseller_roles(tenant_id);
CREATE INDEX idx_resellers_role_id ON public.resellers(role_id);

-- Create trigger for updated_at
CREATE TRIGGER update_reseller_roles_updated_at
BEFORE UPDATE ON public.reseller_roles
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();