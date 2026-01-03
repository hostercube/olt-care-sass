
-- Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "Super admins full access to reseller_transactions" ON public.reseller_transactions;
DROP POLICY IF EXISTS "Tenant users can manage reseller_transactions" ON public.reseller_transactions;
DROP POLICY IF EXISTS "Super admins full access to reseller_custom_roles" ON public.reseller_custom_roles;
DROP POLICY IF EXISTS "Tenant users can manage reseller_custom_roles" ON public.reseller_custom_roles;
DROP POLICY IF EXISTS "Super admins full access to reseller_branches" ON public.reseller_branches;
DROP POLICY IF EXISTS "Tenant users can manage reseller_branches" ON public.reseller_branches;

-- Create reseller_permissions table if not exists
CREATE TABLE IF NOT EXISTS public.reseller_permissions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  reseller_id UUID NOT NULL REFERENCES public.resellers(id) ON DELETE CASCADE,
  permission_name TEXT NOT NULL,
  is_allowed BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(reseller_id, permission_name)
);

-- Enable RLS on reseller_permissions
ALTER TABLE public.reseller_permissions ENABLE ROW LEVEL SECURITY;

-- Create policies for reseller_permissions
DROP POLICY IF EXISTS "Super admins full access to reseller_permissions" ON public.reseller_permissions;
CREATE POLICY "Super admins full access to reseller_permissions"
  ON public.reseller_permissions FOR ALL
  USING (is_super_admin());

DROP POLICY IF EXISTS "Tenant users can manage reseller_permissions" ON public.reseller_permissions;
CREATE POLICY "Tenant users can manage reseller_permissions"
  ON public.reseller_permissions FOR ALL
  USING (tenant_id = get_user_tenant_id());

-- Recreate policies for reseller_transactions
CREATE POLICY "Super admins full access to reseller_transactions"
  ON public.reseller_transactions FOR ALL
  USING (is_super_admin());

CREATE POLICY "Tenant users can manage reseller_transactions"
  ON public.reseller_transactions FOR ALL
  USING (tenant_id = get_user_tenant_id());

-- Recreate policies for reseller_custom_roles
CREATE POLICY "Super admins full access to reseller_custom_roles"
  ON public.reseller_custom_roles FOR ALL
  USING (is_super_admin());

CREATE POLICY "Tenant users can manage reseller_custom_roles"
  ON public.reseller_custom_roles FOR ALL
  USING (tenant_id = get_user_tenant_id());

-- Recreate policies for reseller_branches
CREATE POLICY "Super admins full access to reseller_branches"
  ON public.reseller_branches FOR ALL
  USING (is_super_admin());

CREATE POLICY "Tenant users can manage reseller_branches"
  ON public.reseller_branches FOR ALL
  USING (tenant_id = get_user_tenant_id());
