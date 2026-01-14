-- Fix create_customer_support_ticket: avoid ambiguity with output column name "id"
CREATE OR REPLACE FUNCTION public.create_customer_support_ticket(
  p_customer_id uuid,
  p_subject text,
  p_description text DEFAULT NULL,
  p_category text DEFAULT NULL,
  p_priority text DEFAULT 'medium'
)
RETURNS TABLE (
  id uuid,
  ticket_number text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_customer public.customers%ROWTYPE;
  v_ticket_no text;
  v_ticket_id uuid;
BEGIN
  SELECT * INTO v_customer
  FROM public.customers c
  WHERE c.id = p_customer_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Customer not found';
  END IF;

  IF p_subject IS NULL OR btrim(p_subject) = '' THEN
    RAISE EXCEPTION 'Subject is required';
  END IF;

  -- tenant-wise sequential ticket no
  v_ticket_no := public.generate_ticket_number(v_customer.tenant_id);

  INSERT INTO public.support_tickets (
    tenant_id,
    ticket_number,
    customer_id,
    customer_name,
    customer_phone,
    customer_email,
    subject,
    description,
    priority,
    category,
    status
  )
  VALUES (
    v_customer.tenant_id,
    v_ticket_no,
    v_customer.id,
    v_customer.name,
    v_customer.phone,
    v_customer.email,
    p_subject,
    p_description,
    COALESCE(NULLIF(p_priority, ''), 'medium'),
    p_category,
    'open'
  )
  RETURNING support_tickets.id INTO v_ticket_id;

  RETURN QUERY SELECT v_ticket_id, v_ticket_no;
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_customer_support_ticket(uuid, text, text, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_customer_support_ticket(uuid, text, text, text, text) TO anon;

-- Fix get_customer_profile: isp_packages has no "speed" column
CREATE OR REPLACE FUNCTION public.get_customer_profile(p_customer_id uuid)
RETURNS TABLE (
  id uuid,
  tenant_id uuid,
  name text,
  phone text,
  email text,
  address text,
  customer_code text,
  pppoe_username text,
  pppoe_password text,
  status text,
  expiry_date timestamp with time zone,
  due_amount numeric,
  monthly_bill numeric,
  connection_date timestamp with time zone,
  last_payment_date timestamp with time zone,
  mikrotik_id uuid,
  onu_id uuid,
  onu_mac text,
  onu_index integer,
  pon_port text,
  router_mac text,
  last_ip_address text,
  last_caller_id text,
  nid_number text,
  notes text,
  package_id uuid,
  package_name text,
  package_speed integer,
  package_price numeric,
  package_validity_days integer,
  download_speed integer,
  upload_speed integer,
  speed_unit text,
  area_id uuid,
  area_name text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    cust.id,
    cust.tenant_id,
    cust.name,
    cust.phone,
    cust.email,
    cust.address,
    cust.customer_code,
    cust.pppoe_username,
    cust.pppoe_password,
    cust.status::text,
    cust.expiry_date,
    cust.due_amount,
    cust.monthly_bill,
    cust.connection_date,
    cust.last_payment_date,
    cust.mikrotik_id,
    cust.onu_id,
    cust.onu_mac,
    cust.onu_index,
    cust.pon_port,
    cust.router_mac,
    cust.last_ip_address,
    cust.last_caller_id,
    cust.nid_number,
    cust.notes,
    cust.package_id,
    pkg.name AS package_name,
    pkg.download_speed AS package_speed,
    pkg.price AS package_price,
    pkg.validity_days AS package_validity_days,
    pkg.download_speed,
    pkg.upload_speed,
    pkg.speed_unit::text,
    cust.area_id,
    ar.name AS area_name
  FROM public.customers cust
  LEFT JOIN public.isp_packages pkg ON cust.package_id = pkg.id
  LEFT JOIN public.areas ar ON cust.area_id = ar.id
  WHERE cust.id = p_customer_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_customer_profile(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_customer_profile(uuid) TO anon;
