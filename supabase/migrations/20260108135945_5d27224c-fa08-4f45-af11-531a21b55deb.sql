-- Create supplier_payments table for tracking payments to suppliers
CREATE TABLE public.supplier_payments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  supplier_id UUID NOT NULL REFERENCES public.suppliers(id) ON DELETE CASCADE,
  purchase_order_id UUID REFERENCES public.purchase_orders(id) ON DELETE SET NULL,
  amount NUMERIC NOT NULL DEFAULT 0,
  payment_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  payment_method TEXT NOT NULL DEFAULT 'cash',
  reference TEXT,
  notes TEXT,
  paid_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.supplier_payments ENABLE ROW LEVEL SECURITY;

-- Create RLS policies using profiles table
CREATE POLICY "Users can view supplier payments for their tenant" 
ON public.supplier_payments 
FOR SELECT 
USING (tenant_id IN (
  SELECT tenant_id FROM public.profiles WHERE id = auth.uid()
));

CREATE POLICY "Users can insert supplier payments for their tenant" 
ON public.supplier_payments 
FOR INSERT 
WITH CHECK (tenant_id IN (
  SELECT tenant_id FROM public.profiles WHERE id = auth.uid()
));

CREATE POLICY "Users can update supplier payments for their tenant" 
ON public.supplier_payments 
FOR UPDATE 
USING (tenant_id IN (
  SELECT tenant_id FROM public.profiles WHERE id = auth.uid()
));

CREATE POLICY "Users can delete supplier payments for their tenant" 
ON public.supplier_payments 
FOR DELETE 
USING (tenant_id IN (
  SELECT tenant_id FROM public.profiles WHERE id = auth.uid()
));

-- Create index for better performance
CREATE INDEX idx_supplier_payments_tenant_id ON public.supplier_payments(tenant_id);
CREATE INDEX idx_supplier_payments_supplier_id ON public.supplier_payments(supplier_id);
CREATE INDEX idx_supplier_payments_payment_date ON public.supplier_payments(payment_date DESC);

-- Enable realtime for supplier_payments
ALTER PUBLICATION supabase_realtime ADD TABLE public.supplier_payments;