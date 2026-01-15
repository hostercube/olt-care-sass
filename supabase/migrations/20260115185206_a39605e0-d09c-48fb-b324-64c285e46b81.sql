-- Fix 1: Update get_referral_config to return all settings including withdraw_enabled and use_wallet_for_recharge
CREATE OR REPLACE FUNCTION public.get_referral_config(p_tenant_id uuid)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_config JSON;
BEGIN
  SELECT json_build_object(
    'id', id,
    'is_enabled', is_enabled,
    'bonus_type', bonus_type,
    'bonus_amount', COALESCE(bonus_amount, 0),
    'bonus_percentage', COALESCE(bonus_percentage, 0),
    'min_referrals_for_bonus', COALESCE(min_referrals_for_bonus, 1),
    'bonus_validity_days', COALESCE(bonus_validity_days, 30),
    'terms_and_conditions', terms_and_conditions,
    'withdraw_enabled', COALESCE(withdraw_enabled, false),
    'use_wallet_for_recharge', COALESCE(use_wallet_for_recharge, true)
  ) INTO v_config
  FROM public.referral_configs
  WHERE tenant_id = p_tenant_id;
  
  -- Return config with is_enabled false if no config exists
  RETURN COALESCE(v_config, '{"is_enabled": false, "withdraw_enabled": false, "use_wallet_for_recharge": true}'::JSON);
END;
$function$;

-- Fix 2: Update process_referral_on_connection_complete to also create wallet transaction record
CREATE OR REPLACE FUNCTION public.process_referral_on_connection_complete()
RETURNS TRIGGER AS $$
DECLARE
  v_referrer_id UUID;
  v_tenant_id UUID;
  v_config RECORD;
  v_bonus NUMERIC;
  v_referred_name TEXT;
  v_referred_phone TEXT;
  v_referral_id UUID;
BEGIN
  -- When request is APPROVED with referral code - Directly activate and credit bonus
  IF NEW.status = 'approved' AND NEW.referral_code IS NOT NULL AND 
     (OLD.status IS NULL OR OLD.status != 'approved') THEN
    
    -- Find the referrer by referral code
    SELECT id, tenant_id INTO v_referrer_id, v_tenant_id 
    FROM public.customers 
    WHERE referral_code = NEW.referral_code;
    
    IF v_referrer_id IS NULL THEN
      -- Update existing pending referral to rejected (invalid code)
      UPDATE public.customer_referrals 
      SET status = 'rejected', 
          notes = 'Invalid referral code',
          updated_at = NOW()
      WHERE tenant_id = NEW.tenant_id 
        AND referral_code = NEW.referral_code 
        AND referred_phone = NEW.phone
        AND status = 'pending';
      RETURN NEW;
    END IF;
    
    -- Get referral config
    SELECT * INTO v_config FROM public.referral_configs 
    WHERE tenant_id = NEW.tenant_id AND is_enabled = true;
    
    IF v_config IS NULL THEN
      -- No config, just mark as active without bonus
      UPDATE public.customer_referrals 
      SET status = 'active', 
          updated_at = NOW()
      WHERE tenant_id = NEW.tenant_id 
        AND referral_code = NEW.referral_code 
        AND referred_phone = NEW.phone
        AND status = 'pending';
      RETURN NEW;
    END IF;
    
    -- Calculate bonus
    IF v_config.bonus_type = 'fixed' THEN
      v_bonus := COALESCE(v_config.bonus_amount, 0);
    ELSE
      v_bonus := 0; -- Percentage will be calculated when customer is created
    END IF;
    
    -- Update existing pending referral entry to active with bonus
    UPDATE public.customer_referrals 
    SET 
      status = 'active',
      bonus_amount = v_bonus,
      bonus_paid_at = NOW(),
      updated_at = NOW()
    WHERE tenant_id = NEW.tenant_id 
      AND referral_code = NEW.referral_code 
      AND referred_phone = NEW.phone
      AND status = 'pending'
    RETURNING id INTO v_referral_id;
    
    -- If no pending entry was updated, create new active one
    IF NOT FOUND THEN
      INSERT INTO public.customer_referrals (
        tenant_id, 
        referrer_customer_id, 
        referral_code, 
        status, 
        bonus_amount,
        bonus_paid_at,
        referred_name,
        referred_phone
      ) VALUES (
        NEW.tenant_id, 
        v_referrer_id, 
        NEW.referral_code, 
        'active', 
        v_bonus,
        NOW(),
        NEW.customer_name,
        NEW.phone
      )
      RETURNING id INTO v_referral_id;
    END IF;
    
    -- Add bonus to referrer's wallet balance AND create transaction record
    IF v_bonus > 0 THEN
      -- Update customer wallet balance
      UPDATE public.customers 
      SET 
        wallet_balance = COALESCE(wallet_balance, 0) + v_bonus,
        referral_bonus_balance = COALESCE(referral_bonus_balance, 0) + v_bonus,
        updated_at = NOW()
      WHERE id = v_referrer_id;
      
      -- Create wallet transaction record for tracking
      INSERT INTO public.customer_wallet_transactions (
        tenant_id,
        customer_id,
        amount,
        transaction_type,
        reference_id,
        reference_type,
        notes,
        status
      ) VALUES (
        NEW.tenant_id,
        v_referrer_id,
        v_bonus,
        'referral_bonus',
        v_referral_id,
        'customer_referral',
        'Referral bonus for code ' || NEW.referral_code,
        'completed'
      );
    END IF;
  
  -- When request is REJECTED with referral code
  ELSIF NEW.status = 'rejected' AND NEW.referral_code IS NOT NULL AND 
        (OLD.status IS NULL OR OLD.status != 'rejected') THEN
    -- Update referral to rejected with reason
    UPDATE public.customer_referrals 
    SET 
      status = 'rejected', 
      notes = COALESCE(NEW.rejection_reason, 'Request rejected'),
      updated_at = NOW()
    WHERE tenant_id = NEW.tenant_id 
      AND referral_code = NEW.referral_code 
      AND referred_phone = NEW.phone
      AND status IN ('pending', 'approved');
  
  -- When request is COMPLETED with referral code (customer created)
  ELSIF NEW.status = 'completed' AND NEW.referral_code IS NOT NULL AND NEW.customer_id IS NOT NULL AND 
        (OLD.status IS NULL OR OLD.status != 'completed') THEN
    
    -- Find the referrer
    SELECT id INTO v_referrer_id 
    FROM public.customers 
    WHERE referral_code = NEW.referral_code;
    
    IF v_referrer_id IS NOT NULL THEN
      -- Update customer with referred_by
      UPDATE public.customers 
      SET referred_by = v_referrer_id 
      WHERE id = NEW.customer_id;
      
      -- Link the referral to the new customer
      UPDATE public.customer_referrals 
      SET 
        referred_customer_id = NEW.customer_id,
        updated_at = NOW()
      WHERE tenant_id = NEW.tenant_id 
        AND referral_code = NEW.referral_code 
        AND referred_phone = NEW.phone;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;