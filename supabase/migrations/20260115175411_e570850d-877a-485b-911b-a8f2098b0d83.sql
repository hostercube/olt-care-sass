-- Update the referral processing trigger to handle approved status with bonus credit
-- Remove intermediate approved status - directly activate and credit bonus on approval

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
      AND status = 'pending';
    
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
      );
    END IF;
    
    -- Add bonus to referrer's wallet balance
    IF v_bonus > 0 THEN
      UPDATE public.customers 
      SET 
        wallet_balance = COALESCE(wallet_balance, 0) + v_bonus,
        referral_bonus_balance = COALESCE(referral_bonus_balance, 0) + v_bonus
      WHERE id = v_referrer_id;
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

-- Recreate trigger
DROP TRIGGER IF EXISTS trigger_process_referral_on_connection ON public.connection_requests;

CREATE TRIGGER trigger_process_referral_on_connection
AFTER UPDATE ON public.connection_requests
FOR EACH ROW
EXECUTE FUNCTION public.process_referral_on_connection_complete();

-- Add rejection_reason column to customer_referrals if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'customer_referrals' AND column_name = 'rejection_reason'
  ) THEN
    ALTER TABLE public.customer_referrals ADD COLUMN rejection_reason TEXT;
  END IF;
END $$;