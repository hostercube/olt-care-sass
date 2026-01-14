-- Customer-portal friendly RPCs for support tickets (bypass RLS)

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

  v_ticket_no := 'TKT' || upper(replace(gen_random_uuid()::text, '-', ''));

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


CREATE OR REPLACE FUNCTION public.list_customer_support_tickets(
  p_customer_id uuid,
  p_status text DEFAULT NULL
)
RETURNS SETOF public.support_tickets
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_customer_id uuid;
BEGIN
  SELECT c.id INTO v_customer_id
  FROM public.customers c
  WHERE c.id = p_customer_id;

  IF v_customer_id IS NULL THEN
    RETURN;
  END IF;

  IF p_status IS NULL OR trim(p_status) = '' OR lower(trim(p_status)) = 'all' THEN
    RETURN QUERY
      SELECT *
      FROM public.support_tickets st
      WHERE st.customer_id = p_customer_id
      ORDER BY st.created_at DESC;
  ELSE
    RETURN QUERY
      SELECT *
      FROM public.support_tickets st
      WHERE st.customer_id = p_customer_id
        AND st.status::text = lower(trim(p_status))
      ORDER BY st.created_at DESC;
  END IF;
END;
$$;


CREATE OR REPLACE FUNCTION public.list_customer_ticket_comments(
  p_customer_id uuid,
  p_ticket_id uuid
)
RETURNS SETOF public.ticket_comments
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_ok boolean;
BEGIN
  SELECT EXISTS(
    SELECT 1
    FROM public.support_tickets st
    WHERE st.id = p_ticket_id
      AND st.customer_id = p_customer_id
  ) INTO v_ok;

  IF NOT v_ok THEN
    RETURN;
  END IF;

  RETURN QUERY
    SELECT *
    FROM public.ticket_comments tc
    WHERE tc.ticket_id = p_ticket_id
      AND tc.is_internal = false
    ORDER BY tc.created_at ASC;
END;
$$;


CREATE OR REPLACE FUNCTION public.add_customer_ticket_comment(
  p_customer_id uuid,
  p_ticket_id uuid,
  p_comment text,
  p_created_by_name text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_ticket record;
BEGIN
  SELECT st.id, st.tenant_id, st.status
  INTO v_ticket
  FROM public.support_tickets st
  WHERE st.id = p_ticket_id
    AND st.customer_id = p_customer_id;

  IF v_ticket.id IS NULL THEN
    RAISE EXCEPTION 'Ticket not found';
  END IF;

  IF v_ticket.status = 'closed'::public.ticket_status THEN
    RAISE EXCEPTION 'Ticket is closed';
  END IF;

  IF p_comment IS NULL OR length(trim(p_comment)) = 0 THEN
    RAISE EXCEPTION 'Comment is required';
  END IF;

  INSERT INTO public.ticket_comments (
    ticket_id,
    tenant_id,
    comment,
    is_internal,
    created_by_name
  ) VALUES (
    v_ticket.id,
    v_ticket.tenant_id,
    p_comment,
    false,
    NULLIF(p_created_by_name, '')
  );
END;
$$;