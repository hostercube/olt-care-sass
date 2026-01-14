-- Make ticket number generation robust + bypass RLS reliably
DROP FUNCTION IF EXISTS public.generate_ticket_number(uuid);

CREATE OR REPLACE FUNCTION public.generate_ticket_number(_tenant_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _next INTEGER;
BEGIN
  SELECT COALESCE(
    MAX(
      CASE
        WHEN ticket_number ~ '^TKT[0-9]{6}$' THEN (substring(ticket_number from 4))::int
        ELSE NULL
      END
    ),
    0
  ) + 1
  INTO _next
  FROM public.support_tickets
  WHERE tenant_id = _tenant_id;

  RETURN 'TKT' || LPAD(_next::text, 6, '0');
END;
$$;

GRANT EXECUTE ON FUNCTION public.generate_ticket_number(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.generate_ticket_number(uuid) TO anon;
