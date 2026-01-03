
-- Create employee_types first if it doesn't exist
CREATE TABLE IF NOT EXISTS public.employee_types (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.employee_types ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Super admins full access to employee_types" ON public.employee_types;
DROP POLICY IF EXISTS "Tenant users can manage employee_types" ON public.employee_types;
CREATE POLICY "Super admins full access to employee_types" ON public.employee_types FOR ALL USING (is_super_admin());
CREATE POLICY "Tenant users can manage employee_types" ON public.employee_types FOR ALL USING (tenant_id = get_user_tenant_id());
