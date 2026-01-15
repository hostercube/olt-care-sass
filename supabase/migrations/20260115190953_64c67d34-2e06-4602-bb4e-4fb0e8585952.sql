-- Add minimum withdraw limit to referral_configs
ALTER TABLE public.referral_configs 
ADD COLUMN IF NOT EXISTS min_withdraw_amount numeric DEFAULT 100;

-- Update RPC function to return the new field
CREATE OR REPLACE FUNCTION public.get_referral_config(p_tenant_id uuid)
RETURNS json AS $$
DECLARE
  v_config json;
BEGIN
  SELECT json_build_object(
    'id', rc.id,
    'tenant_id', rc.tenant_id,
    'is_enabled', rc.is_enabled,
    'bonus_type', rc.bonus_type,
    'bonus_amount', rc.bonus_amount,
    'bonus_percentage', rc.bonus_percentage,
    'min_referrals_for_bonus', rc.min_referrals_for_bonus,
    'bonus_validity_days', rc.bonus_validity_days,
    'terms_and_conditions', rc.terms_and_conditions,
    'withdraw_enabled', COALESCE(rc.withdraw_enabled, false),
    'use_wallet_for_recharge', COALESCE(rc.use_wallet_for_recharge, true),
    'min_withdraw_amount', COALESCE(rc.min_withdraw_amount, 100)
  ) INTO v_config
  FROM public.referral_configs rc
  WHERE rc.tenant_id = p_tenant_id
  LIMIT 1;

  -- Return defaults if no config exists
  IF v_config IS NULL THEN
    RETURN json_build_object(
      'is_enabled', false,
      'withdraw_enabled', false,
      'use_wallet_for_recharge', true,
      'min_withdraw_amount', 100,
      'bonus_amount', 0
    );
  END IF;

  RETURN v_config;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create RPC function to use wallet balance during recharge
CREATE OR REPLACE FUNCTION public.use_wallet_for_recharge(
  p_customer_id uuid,
  p_amount numeric,
  p_reference_id uuid DEFAULT NULL,
  p_notes text DEFAULT NULL
)
RETURNS json AS $$
DECLARE
  v_customer_record RECORD;
  v_deducted numeric;
  v_remaining numeric;
BEGIN
  -- Get customer wallet balance
  SELECT id, wallet_balance, tenant_id INTO v_customer_record
  FROM public.customers
  WHERE id = p_customer_id;

  IF v_customer_record IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Customer not found');
  END IF;

  -- Calculate how much to deduct (min of wallet balance and requested amount)
  v_deducted := LEAST(COALESCE(v_customer_record.wallet_balance, 0), p_amount);
  v_remaining := p_amount - v_deducted;

  IF v_deducted <= 0 THEN
    RETURN json_build_object('success', true, 'deducted', 0, 'remaining', p_amount);
  END IF;

  -- Deduct from wallet
  UPDATE public.customers
  SET wallet_balance = COALESCE(wallet_balance, 0) - v_deducted,
      updated_at = now()
  WHERE id = p_customer_id;

  -- Record transaction
  INSERT INTO public.customer_wallet_transactions (
    tenant_id, customer_id, transaction_type, amount, 
    reference_id, reference_type, notes, status
  ) VALUES (
    v_customer_record.tenant_id, p_customer_id, 'recharge_payment', -v_deducted,
    p_reference_id, 'customer_recharge', COALESCE(p_notes, 'Used wallet balance for recharge'), 'completed'
  );

  RETURN json_build_object(
    'success', true, 
    'deducted', v_deducted, 
    'remaining', v_remaining,
    'new_wallet_balance', COALESCE(v_customer_record.wallet_balance, 0) - v_deducted
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;