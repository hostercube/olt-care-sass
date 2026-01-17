-- Drop and recreate the initialize_tenant_gateways function
-- Now it copies credentials from global payment_gateway_settings if available

CREATE OR REPLACE FUNCTION public.initialize_tenant_gateways(_tenant_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  global_gw RECORD;
BEGIN
  -- Insert payment gateways by copying from global settings if they exist
  -- Otherwise insert with defaults
  FOR global_gw IN 
    SELECT gateway, display_name, is_enabled, sandbox_mode, config, instructions, 
           transaction_fee_percent, bkash_mode, sort_order
    FROM payment_gateway_settings
    ORDER BY sort_order
  LOOP
    INSERT INTO public.tenant_payment_gateways (
      tenant_id, gateway, display_name, is_enabled, sandbox_mode, 
      config, instructions, transaction_fee_percent, bkash_mode, sort_order
    )
    VALUES (
      _tenant_id, 
      global_gw.gateway, 
      global_gw.display_name,
      global_gw.is_enabled, -- Copy enabled status from global
      global_gw.sandbox_mode,
      global_gw.config, -- Copy credentials from global
      global_gw.instructions,
      COALESCE(global_gw.transaction_fee_percent, 0),
      global_gw.bkash_mode,
      global_gw.sort_order
    )
    ON CONFLICT (tenant_id, gateway) DO UPDATE SET
      -- Update config if tenant's config is empty but global has credentials
      config = CASE 
        WHEN tenant_payment_gateways.config IS NULL OR tenant_payment_gateways.config = '{}'::jsonb 
        THEN EXCLUDED.config 
        ELSE tenant_payment_gateways.config 
      END,
      sandbox_mode = COALESCE(tenant_payment_gateways.sandbox_mode, EXCLUDED.sandbox_mode),
      instructions = COALESCE(tenant_payment_gateways.instructions, EXCLUDED.instructions),
      transaction_fee_percent = COALESCE(tenant_payment_gateways.transaction_fee_percent, EXCLUDED.transaction_fee_percent);
  END LOOP;
  
  -- Insert any missing default gateways that don't exist in global settings
  INSERT INTO public.tenant_payment_gateways (tenant_id, gateway, display_name, sort_order)
  VALUES
    (_tenant_id, 'sslcommerz', 'SSLCommerz', 1),
    (_tenant_id, 'bkash', 'bKash', 2),
    (_tenant_id, 'rocket', 'Rocket', 3),
    (_tenant_id, 'nagad', 'Nagad', 4),
    (_tenant_id, 'uddoktapay', 'UddoktaPay', 5),
    (_tenant_id, 'shurjopay', 'ShurjoPay', 6),
    (_tenant_id, 'aamarpay', 'aamarPay', 7),
    (_tenant_id, 'portwallet', 'PortWallet', 8),
    (_tenant_id, 'piprapay', 'PipraPay', 9),
    (_tenant_id, 'manual', 'Manual Payment', 10)
  ON CONFLICT (tenant_id, gateway) DO NOTHING;

  -- Initialize SMS gateway if not exists
  INSERT INTO public.tenant_sms_gateways (tenant_id, provider, api_url, is_enabled)
  VALUES (_tenant_id, 'smsnoc', 'https://smsnoc.com/api/sms', false)
  ON CONFLICT (tenant_id) DO NOTHING;

  -- Initialize Email gateway if not exists
  INSERT INTO public.tenant_email_gateways (tenant_id, smtp_host, smtp_port, is_enabled)
  VALUES (_tenant_id, 'smtp.gmail.com', 587, false)
  ON CONFLICT (tenant_id) DO NOTHING;
END;
$$;

-- Create a function to sync global gateway credentials to all tenants
CREATE OR REPLACE FUNCTION public.sync_global_gateway_to_tenants(_gateway text)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  global_config RECORD;
  updated_count integer := 0;
BEGIN
  -- Get global gateway config
  SELECT * INTO global_config FROM payment_gateway_settings WHERE gateway = _gateway;
  
  IF NOT FOUND THEN
    RETURN 0;
  END IF;
  
  -- Update all tenant gateways that have empty config
  UPDATE tenant_payment_gateways 
  SET 
    config = global_config.config,
    sandbox_mode = COALESCE(sandbox_mode, global_config.sandbox_mode),
    instructions = COALESCE(instructions, global_config.instructions)
  WHERE gateway = _gateway 
    AND (config IS NULL OR config = '{}'::jsonb)
    AND global_config.config IS NOT NULL 
    AND global_config.config != '{}'::jsonb;
  
  GET DIAGNOSTICS updated_count = ROW_COUNT;
  RETURN updated_count;
END;
$$;