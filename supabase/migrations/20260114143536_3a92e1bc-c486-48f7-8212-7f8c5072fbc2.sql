-- Fix list_customer_support_tickets to properly cast enum comparison
CREATE OR REPLACE FUNCTION public.list_customer_support_tickets(
  p_customer_id uuid,
  p_status text DEFAULT 'all'
)
RETURNS SETOF public.support_tickets
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tenant_id uuid;
BEGIN
  SELECT tenant_id INTO v_tenant_id
  FROM public.customers
  WHERE id = p_customer_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Customer not found';
  END IF;

  RETURN QUERY
  SELECT st.*
  FROM public.support_tickets st
  WHERE st.customer_id = p_customer_id
    AND st.tenant_id = v_tenant_id
    AND (
      p_status IS NULL
      OR p_status = ''
      OR p_status = 'all'
      OR st.status::text = p_status
    )
  ORDER BY st.created_at DESC;
END;
$$;

GRANT EXECUTE ON FUNCTION public.list_customer_support_tickets(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.list_customer_support_tickets(uuid, text) TO anon;

-- Fix get_customer_profile to alias properly
DROP FUNCTION IF EXISTS public.get_customer_profile(uuid);

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
    pkg.speed AS package_speed,
    pkg.price AS package_price,
    pkg.validity_days AS package_validity_days,
    pkg.download_speed,
    pkg.upload_speed,
    pkg.speed_unit,
    cust.area_id,
    ar.name AS area_name
  FROM customers cust
  LEFT JOIN isp_packages pkg ON cust.package_id = pkg.id
  LEFT JOIN areas ar ON cust.area_id = ar.id
  WHERE cust.id = p_customer_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_customer_profile(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_customer_profile(uuid) TO anon;