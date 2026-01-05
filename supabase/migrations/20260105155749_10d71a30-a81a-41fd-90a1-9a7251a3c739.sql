-- Drop the old function first
DROP FUNCTION IF EXISTS public.get_enabled_payment_methods();

-- Create the function with correct return type
CREATE OR REPLACE FUNCTION public.get_enabled_payment_methods()
RETURNS TABLE (
  id uuid,
  gateway text,
  display_name text,
  is_enabled boolean,
  sandbox_mode boolean,
  instructions text,
  sort_order integer,
  bkash_mode text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    id,
    gateway,
    display_name,
    is_enabled,
    sandbox_mode,
    instructions,
    sort_order,
    bkash_mode
  FROM public.payment_gateway_settings
  WHERE is_enabled = true
  ORDER BY sort_order;
$$;