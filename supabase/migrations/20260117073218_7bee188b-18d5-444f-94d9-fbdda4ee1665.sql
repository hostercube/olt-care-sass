-- Update create_customer_self_recharge to include transaction_id parameter
CREATE OR REPLACE FUNCTION public.create_customer_self_recharge(
  p_customer_id uuid,
  p_tenant_id uuid,
  p_amount numeric,
  p_months integer,
  p_payment_method text,
  p_old_expiry date,
  p_new_expiry date,
  p_discount numeric DEFAULT 0,
  p_notes text DEFAULT NULL::text,
  p_status text DEFAULT 'completed'::text,
  p_collected_by_type text DEFAULT 'customer_self'::text,
  p_collected_by_name text DEFAULT 'Customer'::text,
  p_transaction_id text DEFAULT NULL::text
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
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
    transaction_id,
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
    p_transaction_id,
    NOW()
  )
  RETURNING id INTO v_recharge_id;

  RETURN v_recharge_id;
END;
$function$;