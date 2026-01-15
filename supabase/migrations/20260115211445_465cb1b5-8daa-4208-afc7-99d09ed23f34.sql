-- Create RPC for customer self-service recharge (bypasses RLS)
CREATE OR REPLACE FUNCTION public.create_customer_self_recharge(
  p_customer_id UUID,
  p_tenant_id UUID,
  p_amount NUMERIC,
  p_months INTEGER,
  p_payment_method TEXT,
  p_old_expiry DATE,
  p_new_expiry DATE,
  p_discount NUMERIC DEFAULT 0,
  p_notes TEXT DEFAULT NULL,
  p_status TEXT DEFAULT 'completed',
  p_collected_by_type TEXT DEFAULT 'customer_self',
  p_collected_by_name TEXT DEFAULT 'Customer'
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_recharge_id UUID;
BEGIN
  -- Validate customer belongs to tenant
  IF NOT EXISTS (
    SELECT 1 FROM customers 
    WHERE id = p_customer_id AND tenant_id = p_tenant_id
  ) THEN
    RAISE EXCEPTION 'Invalid customer or tenant';
  END IF;

  -- Insert recharge record
  INSERT INTO customer_recharges (
    tenant_id,
    customer_id,
    amount,
    months,
    payment_method,
    old_expiry,
    new_expiry,
    discount,
    notes,
    status,
    collected_by_type,
    collected_by_name,
    recharge_date
  ) VALUES (
    p_tenant_id,
    p_customer_id,
    p_amount,
    p_months,
    p_payment_method,
    p_old_expiry,
    p_new_expiry,
    p_discount,
    p_notes,
    p_status,
    p_collected_by_type,
    p_collected_by_name,
    NOW()
  )
  RETURNING id INTO v_recharge_id;

  RETURN v_recharge_id;
END;
$$;

-- Create RPC for customer wallet top-up request (bypasses RLS)
CREATE OR REPLACE FUNCTION public.create_customer_wallet_topup_request(
  p_customer_id UUID,
  p_tenant_id UUID,
  p_amount NUMERIC,
  p_payment_method TEXT,
  p_transaction_id TEXT
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tx_id UUID;
BEGIN
  -- Validate customer belongs to tenant
  IF NOT EXISTS (
    SELECT 1 FROM customers 
    WHERE id = p_customer_id AND tenant_id = p_tenant_id
  ) THEN
    RAISE EXCEPTION 'Invalid customer or tenant';
  END IF;

  -- Insert wallet transaction
  INSERT INTO customer_wallet_transactions (
    customer_id,
    tenant_id,
    transaction_type,
    amount,
    notes,
    status
  ) VALUES (
    p_customer_id,
    p_tenant_id,
    'topup_pending',
    p_amount,
    'Manual top up via ' || p_payment_method || ' | TxID: ' || p_transaction_id,
    'pending'
  )
  RETURNING id INTO v_tx_id;

  RETURN v_tx_id;
END;
$$;

-- Update get_customer_wallet_balance to ensure it returns combined balance
CREATE OR REPLACE FUNCTION public.get_customer_wallet_balance(p_customer_id UUID)
RETURNS NUMERIC
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_balance NUMERIC;
BEGIN
  SELECT COALESCE(wallet_balance, 0) + COALESCE(referral_bonus_balance, 0)
  INTO v_balance
  FROM customers
  WHERE id = p_customer_id;
  
  RETURN COALESCE(v_balance, 0);
END;
$$;