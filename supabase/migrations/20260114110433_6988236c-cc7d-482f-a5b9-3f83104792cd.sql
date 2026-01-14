-- Drop the overly permissive policy we just created
DROP POLICY IF EXISTS "Allow public customer authentication lookup" ON public.customers;

-- Create a secure RPC function for customer authentication
-- This only returns minimal data needed for login, not sensitive fields
CREATE OR REPLACE FUNCTION public.authenticate_customer(
  p_tenant_id UUID,
  p_username TEXT,
  p_password TEXT
)
RETURNS TABLE (
  id UUID,
  name TEXT,
  phone TEXT,
  email TEXT,
  address TEXT,
  status TEXT,
  expiry_date TIMESTAMPTZ,
  due_amount NUMERIC,
  monthly_bill NUMERIC,
  pppoe_username TEXT,
  tenant_id UUID,
  package_id UUID,
  area_id UUID,
  customer_code TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    c.id,
    c.name,
    c.phone,
    c.email,
    c.address,
    c.status::TEXT,
    c.expiry_date,
    c.due_amount,
    c.monthly_bill,
    c.pppoe_username,
    c.tenant_id,
    c.package_id,
    c.area_id,
    c.customer_code
  FROM public.customers c
  WHERE c.tenant_id = p_tenant_id
    AND LOWER(c.pppoe_username) = LOWER(p_username)
    AND c.pppoe_password = p_password
  LIMIT 1;
END;
$$;

-- Grant execute permission to anonymous/public users
GRANT EXECUTE ON FUNCTION public.authenticate_customer TO anon, authenticated;