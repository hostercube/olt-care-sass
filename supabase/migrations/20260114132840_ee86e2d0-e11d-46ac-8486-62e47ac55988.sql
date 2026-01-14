-- Create an RPC function to get customer profile data by ID
-- This bypasses RLS since it's a SECURITY DEFINER function
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
  expiry_date date,
  due_amount numeric,
  monthly_bill numeric,
  connection_date date,
  last_payment_date date,
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
  package_speed text,
  package_price numeric,
  package_validity_days integer,
  download_speed text,
  upload_speed text,
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
    c.id,
    c.tenant_id,
    c.name,
    c.phone,
    c.email,
    c.address,
    c.customer_code,
    c.pppoe_username,
    c.pppoe_password,
    c.status::text,
    c.expiry_date,
    c.due_amount,
    c.monthly_bill,
    c.connection_date,
    c.last_payment_date,
    c.mikrotik_id,
    c.onu_id,
    c.onu_mac,
    c.onu_index,
    c.pon_port,
    c.router_mac,
    c.last_ip_address,
    c.last_caller_id,
    c.nid_number,
    c.notes,
    c.package_id,
    p.name AS package_name,
    p.speed AS package_speed,
    p.price AS package_price,
    p.validity_days AS package_validity_days,
    p.download_speed,
    p.upload_speed,
    p.speed_unit,
    c.area_id,
    a.name AS area_name
  FROM customers c
  LEFT JOIN isp_packages p ON c.package_id = p.id
  LEFT JOIN areas a ON c.area_id = a.id
  WHERE c.id = p_customer_id;
END;
$$;

-- Grant execute permission to anon and authenticated roles
GRANT EXECUTE ON FUNCTION public.get_customer_profile(uuid) TO anon;
GRANT EXECUTE ON FUNCTION public.get_customer_profile(uuid) TO authenticated;