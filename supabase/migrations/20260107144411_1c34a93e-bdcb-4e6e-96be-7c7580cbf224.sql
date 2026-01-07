-- Add manager_employee_id column to reseller_branches
ALTER TABLE public.reseller_branches 
ADD COLUMN IF NOT EXISTS manager_employee_id UUID REFERENCES public.employees(id);

-- Create index for manager_employee_id
CREATE INDEX IF NOT EXISTS idx_reseller_branches_manager_employee 
ON public.reseller_branches(manager_employee_id) 
WHERE manager_employee_id IS NOT NULL;