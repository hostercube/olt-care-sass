-- Fix generate_ticket_number function with SECURITY INVOKER and proper permissions
DROP FUNCTION IF EXISTS public.generate_ticket_number(uuid);

CREATE OR REPLACE FUNCTION public.generate_ticket_number(_tenant_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  _count INTEGER;
  _number TEXT;
BEGIN
  SELECT COUNT(*) + 1 INTO _count FROM public.support_tickets WHERE tenant_id = _tenant_id;
  _number := 'TKT' || LPAD(_count::TEXT, 6, '0');
  RETURN _number;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.generate_ticket_number(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.generate_ticket_number(uuid) TO anon;