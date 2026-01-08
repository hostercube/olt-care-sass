-- Drop existing broken RLS policies
DROP POLICY IF EXISTS "Users can view supplier payments for their tenant" ON public.supplier_payments;
DROP POLICY IF EXISTS "Users can create supplier payments for their tenant" ON public.supplier_payments;
DROP POLICY IF EXISTS "Users can update supplier payments for their tenant" ON public.supplier_payments;
DROP POLICY IF EXISTS "Users can delete supplier payments for their tenant" ON public.supplier_payments;

-- Create correct RLS policies using tenant_users table
CREATE POLICY "Users can view supplier payments for their tenant" 
ON public.supplier_payments 
FOR SELECT 
USING (tenant_id IN (SELECT tenant_id FROM public.tenant_users WHERE user_id = auth.uid()));

CREATE POLICY "Users can create supplier payments for their tenant" 
ON public.supplier_payments 
FOR INSERT 
WITH CHECK (tenant_id IN (SELECT tenant_id FROM public.tenant_users WHERE user_id = auth.uid()));

CREATE POLICY "Users can update supplier payments for their tenant" 
ON public.supplier_payments 
FOR UPDATE 
USING (tenant_id IN (SELECT tenant_id FROM public.tenant_users WHERE user_id = auth.uid()));

CREATE POLICY "Users can delete supplier payments for their tenant" 
ON public.supplier_payments 
FOR DELETE 
USING (tenant_id IN (SELECT tenant_id FROM public.tenant_users WHERE user_id = auth.uid()));