-- Update get_customer_wallet_balance to return total wallet balance including referral bonus
CREATE OR REPLACE FUNCTION public.get_customer_wallet_balance(p_customer_id UUID)
RETURNS DECIMAL
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_balance DECIMAL;
BEGIN
  SELECT COALESCE(wallet_balance, 0) + COALESCE(referral_bonus_balance, 0) INTO v_balance
  FROM public.customers
  WHERE id = p_customer_id;
  
  RETURN COALESCE(v_balance, 0);
END;
$$;