
-- Create salary_payments table if not exists
CREATE TABLE IF NOT EXISTS public.salary_payments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  monthly_salary_id UUID REFERENCES public.monthly_salaries(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  amount NUMERIC NOT NULL DEFAULT 0,
  payment_method TEXT DEFAULT 'cash',
  payment_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.salary_payments ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any
DROP POLICY IF EXISTS "Super admins full access to salary_payments" ON public.salary_payments;
DROP POLICY IF EXISTS "Tenant users can manage salary_payments" ON public.salary_payments;

-- Create RLS policies
CREATE POLICY "Super admins full access to salary_payments" ON public.salary_payments FOR ALL USING (is_super_admin());
CREATE POLICY "Tenant users can manage salary_payments" ON public.salary_payments FOR ALL USING (tenant_id = get_user_tenant_id());
