-- Shorter ticket numbers for customer portal tickets

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
  v_customer record;
  v_ticket_no text;
  v_priority public.ticket_priority;
BEGIN
  SELECT c.id, c.tenant_id, c.name, c.phone, c.email
  INTO v_customer
  FROM public.customers c
  WHERE c.id = p_customer_id;

  IF v_customer.id IS NULL THEN
    RAISE EXCEPTION 'Customer not found';
  END IF;

  IF p_subject IS NULL OR length(trim(p_subject)) = 0 THEN
    RAISE EXCEPTION 'Subject is required';
  END IF;

  BEGIN
    v_priority := lower(trim(coalesce(p_priority, 'medium')))::public.ticket_priority;
  EXCEPTION WHEN others THEN
    v_priority := 'medium'::public.ticket_priority;
  END;

  -- Use the shared sequential generator (short like: TKT000123)
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
    category,
    priority,
    status
  ) VALUES (
    v_customer.tenant_id,
    v_ticket_no,
    v_customer.id,
    v_customer.name,
    v_customer.phone,
    v_customer.email,
    p_subject,
    NULLIF(p_description, ''),
    NULLIF(p_category, ''),
    v_priority,
    'open'::public.ticket_status
  )
  RETURNING support_tickets.id, support_tickets.ticket_number
  INTO id, ticket_number;

  RETURN NEXT;
END;
$$;

-- Ensure customer portal can call it
GRANT EXECUTE ON FUNCTION public.create_customer_support_ticket(uuid, text, text, text, text) TO anon;
GRANT EXECUTE ON FUNCTION public.create_customer_support_ticket(uuid, text, text, text, text) TO authenticated;
