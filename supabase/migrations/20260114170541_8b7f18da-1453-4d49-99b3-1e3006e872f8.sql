-- Add wallet balance columns to customers if not exists
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'customers' AND column_name = 'wallet_balance') THEN
    ALTER TABLE public.customers ADD COLUMN wallet_balance DECIMAL(10,2) DEFAULT 0;
  END IF;
END$$;

-- Create customer wallet transactions table
CREATE TABLE IF NOT EXISTS public.customer_wallet_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  amount DECIMAL(10,2) NOT NULL,
  transaction_type VARCHAR(50) NOT NULL,
  reference_id UUID,
  reference_type VARCHAR(50),
  status VARCHAR(50) DEFAULT 'completed',
  notes TEXT,
  processed_by UUID,
  processed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create customer withdraw requests table
CREATE TABLE IF NOT EXISTS public.customer_withdraw_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  amount DECIMAL(10,2) NOT NULL,
  payment_method VARCHAR(100),
  payment_details JSONB,
  status VARCHAR(50) DEFAULT 'pending',
  rejection_reason TEXT,
  processed_by UUID,
  processed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_wallet_transactions_customer ON public.customer_wallet_transactions(customer_id);
CREATE INDEX IF NOT EXISTS idx_wallet_transactions_tenant ON public.customer_wallet_transactions(tenant_id);
CREATE INDEX IF NOT EXISTS idx_withdraw_requests_customer ON public.customer_withdraw_requests(customer_id);
CREATE INDEX IF NOT EXISTS idx_withdraw_requests_tenant ON public.customer_withdraw_requests(tenant_id);
CREATE INDEX IF NOT EXISTS idx_withdraw_requests_status ON public.customer_withdraw_requests(status);

-- Enable RLS
ALTER TABLE public.customer_wallet_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customer_withdraw_requests ENABLE ROW LEVEL SECURITY;

-- RLS policies for wallet transactions - tenant users access
CREATE POLICY "Tenant staff can manage wallet transactions"
ON public.customer_wallet_transactions FOR ALL
USING (
  tenant_id IN (
    SELECT tenant_id FROM public.tenant_users WHERE user_id = auth.uid()
  )
);

-- RLS policies for withdraw requests
CREATE POLICY "Tenant staff can manage withdraw requests"
ON public.customer_withdraw_requests FOR ALL
USING (
  tenant_id IN (
    SELECT tenant_id FROM public.tenant_users WHERE user_id = auth.uid()
  )
);

-- Function to get customer wallet balance
CREATE OR REPLACE FUNCTION public.get_customer_wallet_balance(p_customer_id UUID)
RETURNS DECIMAL
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_balance DECIMAL;
BEGIN
  SELECT COALESCE(wallet_balance, 0) INTO v_balance
  FROM public.customers
  WHERE id = p_customer_id;
  
  RETURN COALESCE(v_balance, 0);
END;
$$;

-- Function to add wallet transaction and update balance
CREATE OR REPLACE FUNCTION public.add_wallet_transaction(
  p_customer_id UUID,
  p_amount DECIMAL,
  p_type VARCHAR,
  p_reference_id UUID DEFAULT NULL,
  p_reference_type VARCHAR DEFAULT NULL,
  p_notes TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tenant_id UUID;
  v_transaction_id UUID;
BEGIN
  SELECT tenant_id INTO v_tenant_id FROM public.customers WHERE id = p_customer_id;
  
  IF v_tenant_id IS NULL THEN
    RAISE EXCEPTION 'Customer not found';
  END IF;
  
  INSERT INTO public.customer_wallet_transactions (
    tenant_id, customer_id, amount, transaction_type, reference_id, reference_type, notes, status
  ) VALUES (
    v_tenant_id, p_customer_id, p_amount, p_type, p_reference_id, p_reference_type, p_notes, 'completed'
  ) RETURNING id INTO v_transaction_id;
  
  UPDATE public.customers
  SET wallet_balance = COALESCE(wallet_balance, 0) + p_amount,
      updated_at = now()
  WHERE id = p_customer_id;
  
  RETURN v_transaction_id;
END;
$$;

-- Function to create withdraw request
CREATE OR REPLACE FUNCTION public.create_withdraw_request(
  p_customer_id UUID,
  p_amount DECIMAL,
  p_payment_method VARCHAR,
  p_payment_details JSONB DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tenant_id UUID;
  v_balance DECIMAL;
  v_request_id UUID;
BEGIN
  SELECT tenant_id, COALESCE(wallet_balance, 0) INTO v_tenant_id, v_balance
  FROM public.customers WHERE id = p_customer_id;
  
  IF v_tenant_id IS NULL THEN
    RAISE EXCEPTION 'Customer not found';
  END IF;
  
  IF v_balance < p_amount THEN
    RAISE EXCEPTION 'Insufficient wallet balance';
  END IF;
  
  INSERT INTO public.customer_withdraw_requests (
    tenant_id, customer_id, amount, payment_method, payment_details, status
  ) VALUES (
    v_tenant_id, p_customer_id, p_amount, p_payment_method, p_payment_details, 'pending'
  ) RETURNING id INTO v_request_id;
  
  UPDATE public.customers
  SET wallet_balance = wallet_balance - p_amount,
      updated_at = now()
  WHERE id = p_customer_id;
  
  INSERT INTO public.customer_wallet_transactions (
    tenant_id, customer_id, amount, transaction_type, reference_id, reference_type, status, notes
  ) VALUES (
    v_tenant_id, p_customer_id, -p_amount, 'withdraw_request', v_request_id, 'withdraw', 'pending', 'Withdraw request submitted'
  );
  
  RETURN v_request_id;
END;
$$;

-- Function to process withdraw request
CREATE OR REPLACE FUNCTION public.process_withdraw_request(
  p_request_id UUID,
  p_action VARCHAR,
  p_rejection_reason TEXT DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_request RECORD;
BEGIN
  SELECT * INTO v_request FROM public.customer_withdraw_requests WHERE id = p_request_id;
  
  IF v_request IS NULL THEN
    RAISE EXCEPTION 'Withdraw request not found';
  END IF;
  
  IF v_request.status != 'pending' THEN
    RAISE EXCEPTION 'Request already processed';
  END IF;
  
  IF p_action = 'approve' THEN
    UPDATE public.customer_withdraw_requests
    SET status = 'approved', processed_at = now(), processed_by = auth.uid()
    WHERE id = p_request_id;
    
    UPDATE public.customer_wallet_transactions
    SET status = 'completed', transaction_type = 'withdraw_approved', notes = 'Withdraw approved and processed'
    WHERE reference_id = p_request_id AND reference_type = 'withdraw';
    
  ELSIF p_action = 'reject' THEN
    UPDATE public.customer_withdraw_requests
    SET status = 'rejected', rejection_reason = p_rejection_reason, processed_at = now(), processed_by = auth.uid()
    WHERE id = p_request_id;
    
    UPDATE public.customers
    SET wallet_balance = wallet_balance + v_request.amount,
        updated_at = now()
    WHERE id = v_request.customer_id;
    
    UPDATE public.customer_wallet_transactions
    SET status = 'completed', transaction_type = 'withdraw_rejected', notes = COALESCE(p_rejection_reason, 'Withdraw request rejected')
    WHERE reference_id = p_request_id AND reference_type = 'withdraw';
  END IF;
  
  RETURN TRUE;
END;
$$;

-- Function to get customer wallet transactions
CREATE OR REPLACE FUNCTION public.get_customer_wallet_transactions(p_customer_id UUID, p_limit INT DEFAULT 50)
RETURNS SETOF public.customer_wallet_transactions
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT * FROM public.customer_wallet_transactions
  WHERE customer_id = p_customer_id
  ORDER BY created_at DESC
  LIMIT p_limit;
END;
$$;

-- Function to get customer withdraw requests
CREATE OR REPLACE FUNCTION public.get_customer_withdraw_requests(p_customer_id UUID)
RETURNS SETOF public.customer_withdraw_requests
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT * FROM public.customer_withdraw_requests
  WHERE customer_id = p_customer_id
  ORDER BY created_at DESC;
END;
$$;

-- Function to get tenant's referral domain
CREATE OR REPLACE FUNCTION public.get_tenant_referral_domain(p_tenant_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_custom_domain TEXT;
  v_subdomain TEXT;
  v_slug TEXT;
  v_landing_enabled BOOLEAN;
BEGIN
  -- Get tenant details
  SELECT custom_domain, subdomain, slug, landing_page_enabled
  INTO v_custom_domain, v_subdomain, v_slug, v_landing_enabled
  FROM public.tenants
  WHERE id = p_tenant_id;
  
  -- Priority: custom_domain > subdomain > slug
  IF v_custom_domain IS NOT NULL AND v_custom_domain != '' THEN
    RETURN v_custom_domain;
  ELSIF v_subdomain IS NOT NULL AND v_subdomain != '' THEN
    RETURN v_subdomain || '.isppoint.com';
  ELSIF v_slug IS NOT NULL AND v_slug != '' THEN
    RETURN 'isppoint.com/' || v_slug;
  ELSE
    RETURN 'isppoint.com';
  END IF;
END;
$$;