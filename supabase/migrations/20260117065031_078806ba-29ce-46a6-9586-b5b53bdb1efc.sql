
-- Drop existing function and recreate with new return type
DROP FUNCTION IF EXISTS public.get_customer_profile(uuid);

-- Recreate with wallet balances included
CREATE OR REPLACE FUNCTION public.get_customer_profile(p_customer_id uuid)
 RETURNS TABLE(
   id uuid, 
   name text, 
   email text, 
   phone text, 
   address text, 
   customer_code text, 
   status text, 
   expiry_date date, 
   connection_date date, 
   last_payment_date date, 
   due_amount numeric, 
   monthly_bill numeric, 
   package_name text, 
   package_price numeric, 
   download_speed integer, 
   upload_speed integer, 
   onu_mac text, 
   pppoe_username text, 
   tenant_id uuid, 
   tenant_name text, 
   tenant_logo_url text, 
   tenant_primary_color text,
   wallet_balance numeric,
   referral_bonus_balance numeric,
   referral_code text
 )
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
 SET row_security TO 'off'
AS $function$
BEGIN
  RETURN QUERY
  SELECT 
    cust.id,
    cust.name::text,
    cust.email::text,
    cust.phone::text,
    cust.address::text,
    cust.customer_code::text,
    cust.status::text,
    cust.expiry_date,
    cust.connection_date,
    cust.last_payment_date,
    cust.due_amount,
    cust.monthly_bill,
    pkg.name::text as package_name,
    pkg.price as package_price,
    pkg.download_speed,
    pkg.upload_speed,
    cust.onu_mac::text,
    cust.pppoe_username::text,
    t.id as tenant_id,
    t.name::text as tenant_name,
    t.logo_url::text as tenant_logo_url,
    t.primary_color::text as tenant_primary_color,
    COALESCE(cust.wallet_balance, 0) as wallet_balance,
    COALESCE(cust.referral_bonus_balance, 0) as referral_bonus_balance,
    cust.referral_code::text
  FROM customers cust
  LEFT JOIN isp_packages pkg ON cust.package_id = pkg.id
  LEFT JOIN tenants t ON cust.tenant_id = t.id
  WHERE cust.id = p_customer_id;
END;
$function$;
