-- Add withdraw_enabled column to referral_configs
ALTER TABLE public.referral_configs 
ADD COLUMN IF NOT EXISTS withdraw_enabled BOOLEAN DEFAULT true;

-- Add use_wallet_for_recharge column to referral_configs
ALTER TABLE public.referral_configs 
ADD COLUMN IF NOT EXISTS use_wallet_for_recharge BOOLEAN DEFAULT true;

-- Update the trigger to also handle 'approved' status update to customer_referrals
CREATE OR REPLACE FUNCTION public.process_referral_on_connection_complete()
RETURNS TRIGGER AS $$
DECLARE
  v_referrer_id UUID;
  v_tenant_id UUID;
  v_config RECORD;
  v_bonus NUMERIC;
  v_referred_name TEXT;
  v_referred_phone TEXT;
BEGIN
  -- Only process when status changes to 'completed' and there's a referral code and customer_id
  IF NEW.status = 'completed' AND NEW.referral_code IS NOT NULL AND NEW.customer_id IS NOT NULL THEN
    -- Find the referrer by referral code
    SELECT id, tenant_id INTO v_referrer_id, v_tenant_id 
    FROM public.customers 
    WHERE referral_code = NEW.referral_code;
    
    IF v_referrer_id IS NULL THEN
      -- Update existing pending referral to rejected (invalid code)
      UPDATE public.customer_referrals 
      SET status = 'rejected', updated_at = NOW()
      WHERE tenant_id = NEW.tenant_id 
        AND referral_code = NEW.referral_code 
        AND referred_customer_id IS NULL
        AND referred_phone = NEW.phone;
      RETURN NEW;
    END IF;
    
    -- Get referral config
    SELECT * INTO v_config FROM public.referral_configs 
    WHERE tenant_id = v_tenant_id AND is_enabled = true;
    
    IF v_config IS NULL THEN
      RETURN NEW;
    END IF;
    
    -- Calculate bonus
    IF v_config.bonus_type = 'fixed' THEN
      v_bonus := v_config.bonus_amount;
    ELSE
      SELECT COALESCE(monthly_bill * v_config.bonus_percentage / 100, 0) INTO v_bonus
      FROM public.customers WHERE id = NEW.customer_id;
    END IF;
    
    -- Update customer with referred_by
    UPDATE public.customers 
    SET referred_by = v_referrer_id 
    WHERE id = NEW.customer_id;
    
    -- Check if there's a pending referral entry to update
    UPDATE public.customer_referrals 
    SET 
      referred_customer_id = NEW.customer_id,
      status = 'active',
      bonus_amount = v_bonus,
      updated_at = NOW()
    WHERE tenant_id = NEW.tenant_id 
      AND referral_code = NEW.referral_code 
      AND referred_customer_id IS NULL
      AND referred_phone = NEW.phone;
    
    -- If no pending entry was updated, create new one
    IF NOT FOUND THEN
      INSERT INTO public.customer_referrals (
        tenant_id, 
        referrer_customer_id, 
        referred_customer_id, 
        referral_code, 
        status, 
        bonus_amount,
        referred_name,
        referred_phone
      ) VALUES (
        v_tenant_id, 
        v_referrer_id, 
        NEW.customer_id, 
        NEW.referral_code, 
        'active', 
        v_bonus,
        NEW.customer_name,
        NEW.phone
      );
    END IF;
    
    -- Add bonus to referrer's wallet balance
    UPDATE public.customers 
    SET 
      wallet_balance = COALESCE(wallet_balance, 0) + v_bonus,
      referral_bonus_balance = COALESCE(referral_bonus_balance, 0) + v_bonus
    WHERE id = v_referrer_id;
  
  -- When request is approved with referral code, update referral to approved status
  ELSIF NEW.status = 'approved' AND NEW.referral_code IS NOT NULL THEN
    -- Find the referrer
    SELECT id, tenant_id INTO v_referrer_id, v_tenant_id 
    FROM public.customers 
    WHERE referral_code = NEW.referral_code;
    
    IF v_referrer_id IS NOT NULL THEN
      -- Update existing pending entry to approved
      UPDATE public.customer_referrals 
      SET status = 'approved', updated_at = NOW()
      WHERE tenant_id = NEW.tenant_id 
        AND referral_code = NEW.referral_code 
        AND referred_phone = NEW.phone
        AND status = 'pending';
        
      -- If no entry exists, create approved entry
      IF NOT FOUND THEN
        INSERT INTO public.customer_referrals (
          tenant_id, 
          referrer_customer_id, 
          referral_code, 
          status, 
          bonus_amount,
          referred_name,
          referred_phone
        ) VALUES (
          NEW.tenant_id, 
          v_referrer_id, 
          NEW.referral_code, 
          'approved', 
          0,
          NEW.customer_name,
          NEW.phone
        );
      END IF;
    END IF;
  
  -- When request is rejected with referral code
  ELSIF NEW.status = 'rejected' AND NEW.referral_code IS NOT NULL THEN
    -- Update referral to rejected
    UPDATE public.customer_referrals 
    SET status = 'rejected', updated_at = NOW()
    WHERE tenant_id = NEW.tenant_id 
      AND referral_code = NEW.referral_code 
      AND referred_phone = NEW.phone
      AND referred_customer_id IS NULL;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;