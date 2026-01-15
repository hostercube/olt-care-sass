-- Update use_wallet_for_recharge to deduct from both wallet_balance and referral_bonus_balance
CREATE OR REPLACE FUNCTION public.use_wallet_for_recharge(
  p_customer_id UUID,
  p_amount NUMERIC,
  p_notes TEXT DEFAULT NULL,
  p_reference_id UUID DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_customer_record RECORD;
  v_wallet_deduct numeric := 0;
  v_referral_deduct numeric := 0;
  v_total_deducted numeric := 0;
  v_remaining numeric;
BEGIN
  -- Get customer wallet and referral balances
  SELECT id, wallet_balance, referral_bonus_balance, tenant_id INTO v_customer_record
  FROM public.customers
  WHERE id = p_customer_id;

  IF v_customer_record IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Customer not found');
  END IF;

  v_remaining := p_amount;
  
  -- First deduct from wallet_balance
  v_wallet_deduct := LEAST(COALESCE(v_customer_record.wallet_balance, 0), v_remaining);
  v_remaining := v_remaining - v_wallet_deduct;
  
  -- Then deduct from referral_bonus_balance if needed
  IF v_remaining > 0 THEN
    v_referral_deduct := LEAST(COALESCE(v_customer_record.referral_bonus_balance, 0), v_remaining);
    v_remaining := v_remaining - v_referral_deduct;
  END IF;
  
  v_total_deducted := v_wallet_deduct + v_referral_deduct;

  IF v_total_deducted <= 0 THEN
    RETURN json_build_object('success', true, 'deducted', 0, 'remaining', p_amount);
  END IF;

  -- Deduct from wallet and referral balance
  UPDATE public.customers
  SET wallet_balance = COALESCE(wallet_balance, 0) - v_wallet_deduct,
      referral_bonus_balance = COALESCE(referral_bonus_balance, 0) - v_referral_deduct,
      updated_at = now()
  WHERE id = p_customer_id;

  -- Record transaction
  INSERT INTO public.customer_wallet_transactions (
    tenant_id, customer_id, transaction_type, amount, 
    reference_id, reference_type, notes, status
  ) VALUES (
    v_customer_record.tenant_id, p_customer_id, 'recharge_payment', -v_total_deducted,
    p_reference_id, 'customer_recharge', 
    COALESCE(p_notes, 'Used wallet balance for recharge') || 
    CASE WHEN v_referral_deduct > 0 THEN ' (Wallet: ' || v_wallet_deduct || ', Referral: ' || v_referral_deduct || ')' ELSE '' END, 
    'completed'
  );

  RETURN json_build_object(
    'success', true, 
    'deducted', v_total_deducted, 
    'wallet_deducted', v_wallet_deduct,
    'referral_deducted', v_referral_deduct,
    'remaining', v_remaining,
    'new_wallet_balance', COALESCE(v_customer_record.wallet_balance, 0) - v_wallet_deduct,
    'new_referral_balance', COALESCE(v_customer_record.referral_bonus_balance, 0) - v_referral_deduct
  );
END;
$$;