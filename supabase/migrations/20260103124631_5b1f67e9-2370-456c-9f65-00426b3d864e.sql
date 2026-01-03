-- Add new columns to areas table for full address hierarchy
ALTER TABLE public.areas 
ADD COLUMN IF NOT EXISTS union_name text,
ADD COLUMN IF NOT EXISTS village text,
ADD COLUMN IF NOT EXISTS road_no text,
ADD COLUMN IF NOT EXISTS house_no text;

-- Add mikrotik_id to customers for MikroTik router selection
ALTER TABLE public.customers 
ADD COLUMN IF NOT EXISTS mikrotik_id uuid REFERENCES public.mikrotik_routers(id) ON DELETE SET NULL;

-- Create index for mikrotik_id
CREATE INDEX IF NOT EXISTS idx_customers_mikrotik_id ON public.customers(mikrotik_id);

-- Create function to auto-generate unique customer code if not provided
CREATE OR REPLACE FUNCTION public.auto_generate_customer_code()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.customer_code IS NULL OR NEW.customer_code = '' THEN
    NEW.customer_code := 'C' || LPAD(
      (SELECT COALESCE(MAX(CAST(SUBSTRING(customer_code FROM 2) AS INTEGER)), 0) + 1 
       FROM public.customers 
       WHERE tenant_id = NEW.tenant_id AND customer_code ~ '^C[0-9]+$')::TEXT, 
      6, '0'
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger for auto customer code
DROP TRIGGER IF EXISTS trigger_auto_customer_code ON public.customers;
CREATE TRIGGER trigger_auto_customer_code
  BEFORE INSERT ON public.customers
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_generate_customer_code();

-- Create bkash_payments table for webhook tracking
CREATE TABLE IF NOT EXISTS public.bkash_payments (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  customer_id uuid REFERENCES public.customers(id) ON DELETE SET NULL,
  customer_code text,
  trx_id text NOT NULL,
  payment_id text,
  amount numeric NOT NULL,
  currency text DEFAULT 'BDT',
  sender_number text,
  receiver_number text,
  reference text,
  payment_type text NOT NULL, -- 'tokenized', 'checkout', 'webhook_personal', 'webhook_merchant'
  status text NOT NULL DEFAULT 'pending', -- 'pending', 'completed', 'failed', 'refunded'
  raw_payload jsonb,
  matched_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS on bkash_payments
ALTER TABLE public.bkash_payments ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for bkash_payments
CREATE POLICY "Super admins full access to bkash_payments" ON public.bkash_payments
  FOR ALL USING (is_super_admin());

CREATE POLICY "Tenant users can manage bkash_payments" ON public.bkash_payments
  FOR ALL USING (tenant_id = get_user_tenant_id());

-- Create index for quick customer matching
CREATE INDEX IF NOT EXISTS idx_bkash_payments_customer_code ON public.bkash_payments(customer_code);
CREATE INDEX IF NOT EXISTS idx_bkash_payments_trx_id ON public.bkash_payments(trx_id);

-- Create customer_imports table for tracking import batches
CREATE TABLE IF NOT EXISTS public.customer_imports (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  file_name text NOT NULL,
  total_rows integer DEFAULT 0,
  imported_count integer DEFAULT 0,
  failed_count integer DEFAULT 0,
  status text NOT NULL DEFAULT 'pending', -- 'pending', 'processing', 'completed', 'failed'
  error_log jsonb,
  imported_by uuid,
  started_at timestamp with time zone,
  completed_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS on customer_imports
ALTER TABLE public.customer_imports ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for customer_imports
CREATE POLICY "Super admins full access to customer_imports" ON public.customer_imports
  FOR ALL USING (is_super_admin());

CREATE POLICY "Tenant users can manage customer_imports" ON public.customer_imports
  FOR ALL USING (tenant_id = get_user_tenant_id());

-- Update trigger
CREATE TRIGGER update_bkash_payments_updated_at
  BEFORE UPDATE ON public.bkash_payments
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Function to match bkash payment with customer
CREATE OR REPLACE FUNCTION public.match_bkash_payment(
  _trx_id text,
  _amount numeric,
  _customer_code text,
  _tenant_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _customer RECORD;
  _result jsonb;
BEGIN
  -- Find customer by code
  SELECT id, name, due_amount, expiry_date, package_id INTO _customer
  FROM public.customers
  WHERE customer_code = _customer_code AND tenant_id = _tenant_id;
  
  IF _customer.id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Customer not found');
  END IF;
  
  -- Update customer payment
  UPDATE public.customers
  SET 
    due_amount = GREATEST(0, due_amount - _amount),
    last_payment_date = CURRENT_DATE,
    status = CASE 
      WHEN due_amount - _amount <= 0 AND expiry_date >= CURRENT_DATE THEN 'active'
      ELSE status 
    END,
    expiry_date = CASE
      WHEN due_amount - _amount <= 0 THEN 
        COALESCE(expiry_date, CURRENT_DATE) + COALESCE(
          (SELECT validity_days FROM isp_packages WHERE id = _customer.package_id),
          30
        )
      ELSE expiry_date
    END
  WHERE id = _customer.id;
  
  -- Record payment
  INSERT INTO public.customer_payments (
    tenant_id, customer_id, amount, payment_method, transaction_id, payment_gateway
  ) VALUES (
    _tenant_id, _customer.id, _amount, 'bkash', _trx_id, 'bkash_webhook'
  );
  
  RETURN jsonb_build_object(
    'success', true, 
    'customer_id', _customer.id, 
    'customer_name', _customer.name,
    'new_due', GREATEST(0, _customer.due_amount - _amount)
  );
END;
$$;