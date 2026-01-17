-- Create reseller_topup_requests table for balance top-up requests
CREATE TABLE IF NOT EXISTS public.reseller_topup_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  reseller_id UUID NOT NULL REFERENCES public.resellers(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  amount NUMERIC NOT NULL,
  payment_method TEXT,
  transaction_id TEXT,
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  rejection_reason TEXT,
  processed_by UUID,
  processed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.reseller_topup_requests ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for reseller_topup_requests (using tenant_users table)
CREATE POLICY "Tenant users can view topup requests" ON public.reseller_topup_requests
  FOR SELECT USING (
    tenant_id IN (
      SELECT tu.tenant_id FROM public.tenant_users tu WHERE tu.user_id = auth.uid()
    )
  );

CREATE POLICY "Tenant users can manage topup requests" ON public.reseller_topup_requests
  FOR ALL USING (
    tenant_id IN (
      SELECT tu.tenant_id FROM public.tenant_users tu WHERE tu.user_id = auth.uid()
    )
  );

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_reseller_topup_requests_reseller ON public.reseller_topup_requests(reseller_id);
CREATE INDEX IF NOT EXISTS idx_reseller_topup_requests_tenant ON public.reseller_topup_requests(tenant_id);
CREATE INDEX IF NOT EXISTS idx_reseller_topup_requests_status ON public.reseller_topup_requests(status);

-- Add trigger for updated_at (use DO block to conditionally create)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'update_reseller_topup_requests_updated_at'
  ) THEN
    CREATE TRIGGER update_reseller_topup_requests_updated_at
      BEFORE UPDATE ON public.reseller_topup_requests
      FOR EACH ROW
      EXECUTE FUNCTION public.update_updated_at_column();
  END IF;
END$$;