-- First drop the existing function to fix return type error
DROP FUNCTION IF EXISTS public.get_customer_referral_stats(UUID);

-- Recreate with correct return type including rejected_referrals
CREATE OR REPLACE FUNCTION public.get_customer_referral_stats(p_customer_id UUID)
RETURNS TABLE (
  total_referrals BIGINT,
  successful_referrals BIGINT,
  pending_referrals BIGINT,
  rejected_referrals BIGINT,
  total_bonus_earned NUMERIC,
  bonus_balance NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(*)::BIGINT as total_referrals,
    COUNT(*) FILTER (WHERE cr.status IN ('active', 'completed', 'bonus_paid'))::BIGINT as successful_referrals,
    COUNT(*) FILTER (WHERE cr.status = 'pending')::BIGINT as pending_referrals,
    COUNT(*) FILTER (WHERE cr.status = 'rejected')::BIGINT as rejected_referrals,
    COALESCE(SUM(cr.bonus_amount) FILTER (WHERE cr.status IN ('active', 'completed', 'bonus_paid')), 0)::NUMERIC as total_bonus_earned,
    COALESCE((SELECT wallet_balance FROM public.customers WHERE id = p_customer_id), 0)::NUMERIC as bonus_balance
  FROM public.customer_referrals cr
  WHERE cr.referrer_customer_id = p_customer_id;
END;
$$;