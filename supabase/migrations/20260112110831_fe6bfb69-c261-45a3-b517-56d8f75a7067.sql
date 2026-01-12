-- Create table for client-specific rates
CREATE TABLE IF NOT EXISTS public.bandwidth_client_rates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES public.bandwidth_clients(id) ON DELETE CASCADE,
  item_id UUID NOT NULL REFERENCES public.bandwidth_items(id) ON DELETE CASCADE,
  rate NUMERIC(10, 2) NOT NULL DEFAULT 0,
  effective_from DATE,
  effective_to DATE,
  notes TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(tenant_id, client_id, item_id)
);

-- Enable RLS
ALTER TABLE public.bandwidth_client_rates ENABLE ROW LEVEL SECURITY;

-- Create RLS policies (same pattern as bandwidth_clients)
CREATE POLICY "Tenant users can view client rates" 
ON public.bandwidth_client_rates 
FOR SELECT 
USING (
  (tenant_id IN (SELECT tenant_id FROM tenant_users WHERE user_id = auth.uid()))
  OR (EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'super_admin'))
);

CREATE POLICY "Tenant users can insert client rates" 
ON public.bandwidth_client_rates 
FOR INSERT 
WITH CHECK (
  (tenant_id IN (SELECT tenant_id FROM tenant_users WHERE user_id = auth.uid()))
  OR (EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'super_admin'))
);

CREATE POLICY "Tenant users can update client rates" 
ON public.bandwidth_client_rates 
FOR UPDATE 
USING (
  (tenant_id IN (SELECT tenant_id FROM tenant_users WHERE user_id = auth.uid()))
  OR (EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'super_admin'))
);

CREATE POLICY "Tenant users can delete client rates" 
ON public.bandwidth_client_rates 
FOR DELETE 
USING (
  (tenant_id IN (SELECT tenant_id FROM tenant_users WHERE user_id = auth.uid()))
  OR (EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'super_admin'))
);

-- Create indexes
CREATE INDEX idx_bandwidth_client_rates_client ON public.bandwidth_client_rates(client_id);
CREATE INDEX idx_bandwidth_client_rates_item ON public.bandwidth_client_rates(item_id);
CREATE INDEX idx_bandwidth_client_rates_tenant ON public.bandwidth_client_rates(tenant_id);