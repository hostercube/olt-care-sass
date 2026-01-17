
-- Create function to add referral bonus to customer (credits to referral_bonus_balance)
CREATE OR REPLACE FUNCTION public.add_referral_bonus(
  p_customer_id UUID,
  p_amount NUMERIC,
  p_reference_id UUID DEFAULT NULL,
  p_notes TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_tenant_id UUID;
  v_transaction_id UUID;
BEGIN
  SELECT tenant_id INTO v_tenant_id FROM public.customers WHERE id = p_customer_id;
  
  IF v_tenant_id IS NULL THEN
    RAISE EXCEPTION 'Customer not found';
  END IF;
  
  -- Insert wallet transaction record
  INSERT INTO public.customer_wallet_transactions (
    tenant_id, customer_id, amount, transaction_type, reference_id, reference_type, notes, status
  ) VALUES (
    v_tenant_id, p_customer_id, p_amount, 'referral_bonus', p_reference_id, 'customer_referral', p_notes, 'completed'
  ) RETURNING id INTO v_transaction_id;
  
  -- Update referral_bonus_balance (not wallet_balance)
  UPDATE public.customers
  SET referral_bonus_balance = COALESCE(referral_bonus_balance, 0) + p_amount,
      updated_at = now()
  WHERE id = p_customer_id;
  
  RETURN v_transaction_id;
END;
$$;

-- Create function to handle customer online recharge (auto-recharge on payment success)
CREATE OR REPLACE FUNCTION public.process_customer_online_recharge(
  p_customer_id UUID,
  p_tenant_id UUID,
  p_amount NUMERIC,
  p_months INTEGER,
  p_payment_method TEXT,
  p_transaction_id TEXT DEFAULT NULL,
  p_notes TEXT DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_customer RECORD;
  v_validity_days INTEGER;
  v_old_expiry DATE;
  v_new_expiry DATE;
  v_base_date DATE;
  v_recharge_id UUID;
BEGIN
  -- Get customer with package info
  SELECT c.*, 
         COALESCE(p.validity_days, 30) as pkg_validity_days,
         COALESCE(p.price, c.monthly_bill) as pkg_price
  INTO v_customer
  FROM public.customers c
  LEFT JOIN public.isp_packages p ON c.package_id = p.id
  WHERE c.id = p_customer_id;
  
  IF v_customer IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Customer not found');
  END IF;
  
  v_validity_days := v_customer.pkg_validity_days;
  v_old_expiry := v_customer.expiry_date;
  
  -- Calculate new expiry date
  IF v_old_expiry IS NOT NULL AND v_old_expiry > CURRENT_DATE THEN
    v_base_date := v_old_expiry;
  ELSE
    v_base_date := CURRENT_DATE;
  END IF;
  v_new_expiry := v_base_date + (v_validity_days * p_months);
  
  -- Create recharge record
  INSERT INTO public.customer_recharges (
    tenant_id, customer_id, amount, months, payment_method, 
    old_expiry, new_expiry, notes, status, 
    collected_by_type, collected_by_name, recharge_date
  ) VALUES (
    p_tenant_id, p_customer_id, p_amount, p_months, p_payment_method,
    v_old_expiry, v_new_expiry, COALESCE(p_notes, 'Online payment recharge'),
    'completed', 'customer_self', v_customer.name, CURRENT_DATE
  ) RETURNING id INTO v_recharge_id;
  
  -- Update customer
  UPDATE public.customers
  SET expiry_date = v_new_expiry,
      last_payment_date = CURRENT_DATE,
      due_amount = 0,
      status = 'active',
      updated_at = now()
  WHERE id = p_customer_id;
  
  -- Create payment record
  INSERT INTO public.customer_payments (
    tenant_id, customer_id, amount, payment_method, 
    transaction_id, notes, payment_date
  ) VALUES (
    p_tenant_id, p_customer_id, p_amount, p_payment_method,
    p_transaction_id, 'Online payment - ' || p_months || ' month(s)', CURRENT_DATE
  );
  
  RETURN json_build_object(
    'success', true,
    'recharge_id', v_recharge_id,
    'old_expiry', v_old_expiry,
    'new_expiry', v_new_expiry,
    'amount', p_amount,
    'months', p_months
  );
END;
$$;
