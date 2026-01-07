-- Create customer_types table for custom user types (Home, Office, Shop, Factory, etc.)
CREATE TABLE IF NOT EXISTS public.customer_types (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add unique constraint for name per tenant
ALTER TABLE public.customer_types ADD CONSTRAINT customer_types_tenant_name_unique UNIQUE (tenant_id, name);

-- Enable RLS
ALTER TABLE public.customer_types ENABLE ROW LEVEL SECURITY;

-- RLS policies for customer_types
CREATE POLICY "Users can view customer types for their tenant" 
ON public.customer_types 
FOR SELECT 
USING (
  tenant_id IN (
    SELECT tu.tenant_id FROM public.tenant_users tu WHERE tu.user_id = auth.uid()
  )
);

CREATE POLICY "Users can manage customer types for their tenant" 
ON public.customer_types 
FOR ALL 
USING (
  tenant_id IN (
    SELECT tu.tenant_id FROM public.tenant_users tu WHERE tu.user_id = auth.uid()
  )
);

-- Add customer_type_id column to customers table
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS customer_type_id UUID REFERENCES public.customer_types(id) ON DELETE SET NULL;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_customers_customer_type_id ON public.customers(customer_type_id);
CREATE INDEX IF NOT EXISTS idx_customer_types_tenant_id ON public.customer_types(tenant_id);

-- Add trigger for updated_at
CREATE OR REPLACE TRIGGER update_customer_types_updated_at
BEFORE UPDATE ON public.customer_types
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();