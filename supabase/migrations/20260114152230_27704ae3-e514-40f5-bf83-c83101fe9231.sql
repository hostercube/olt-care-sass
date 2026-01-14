-- Fix create_customer_support_ticket: cast priority to enum type
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
SET row_security = off
AS $$
DECLARE
  v_customer public.customers%ROWTYPE;
  v_ticket_no text;
  v_ticket_id uuid;
  v_priority public.ticket_priority;
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

  -- Safely cast priority to enum with fallback
  BEGIN
    v_priority := lower(trim(coalesce(p_priority, 'medium')))::public.ticket_priority;
  EXCEPTION WHEN others THEN
    v_priority := 'medium'::public.ticket_priority;
  END;

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
    v_priority,
    p_category,
    'open'::public.ticket_status
  )
  RETURNING support_tickets.id INTO v_ticket_id;

  RETURN QUERY SELECT v_ticket_id, v_ticket_no;
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_customer_support_ticket(uuid, text, text, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_customer_support_ticket(uuid, text, text, text, text) TO anon;