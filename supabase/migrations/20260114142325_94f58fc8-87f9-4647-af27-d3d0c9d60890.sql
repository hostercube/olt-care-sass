-- Fix customer-portal support ticket numbering (per-tenant, short) + backfill old long numbers

-- 1) Backfill existing long ticket numbers to short sequential numbers per tenant
WITH tenant_max AS (
  SELECT
    tenant_id,
    COALESCE(
      MAX(
        CASE
          WHEN ticket_number ~ '^TKT[0-9]{6}$' THEN (substring(ticket_number from 4))::int
          ELSE NULL
        END
      ),
      0
    ) AS max_num
  FROM public.support_tickets
  GROUP BY tenant_id
),
long_tickets AS (
  SELECT
    st.id,
    st.tenant_id,
    tm.max_num,
    ROW_NUMBER() OVER (PARTITION BY st.tenant_id ORDER BY st.created_at, st.id) AS rn
  FROM public.support_tickets st
  JOIN tenant_max tm ON tm.tenant_id = st.tenant_id
  WHERE st.ticket_number IS NULL
     OR st.ticket_number = ''
     OR st.ticket_number !~ '^TKT[0-9]{6}$'
)
UPDATE public.support_tickets st
SET ticket_number = 'TKT' || LPAD((lt.max_num + lt.rn)::text, 6, '0')
FROM long_tickets lt
WHERE st.id = lt.id;

-- 2) RPC for customer portal: create ticket (SECURITY DEFINER so anon can call)
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
  v_customer public.customers%ROWTYPE;
  v_ticket_no text;
  v_ticket_id uuid;
BEGIN
  SELECT * INTO v_customer
  FROM public.customers
  WHERE id = p_customer_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Customer not found';
  END IF;

  IF p_subject IS NULL OR btrim(p_subject) = '' THEN
    RAISE EXCEPTION 'Subject is required';
  END IF;

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
    COALESCE(NULLIF(p_priority, ''), 'medium'),
    p_category,
    'open'
  )
  RETURNING support_tickets.id INTO v_ticket_id;

  RETURN QUERY SELECT v_ticket_id, v_ticket_no;
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_customer_support_ticket(uuid, text, text, text, text) TO anon;
GRANT EXECUTE ON FUNCTION public.create_customer_support_ticket(uuid, text, text, text, text) TO authenticated;

-- 3) RPC: list tickets for a customer (tenant safe)
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
      OR st.status = p_status
    )
  ORDER BY st.created_at DESC;
END;
$$;

GRANT EXECUTE ON FUNCTION public.list_customer_support_tickets(uuid, text) TO anon;
GRANT EXECUTE ON FUNCTION public.list_customer_support_tickets(uuid, text) TO authenticated;

-- 4) RPC: list comments for a customer ticket (tenant safe)
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
  v_tenant_id uuid;
  v_ticket public.support_tickets%ROWTYPE;
BEGIN
  SELECT tenant_id INTO v_tenant_id
  FROM public.customers
  WHERE id = p_customer_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Customer not found';
  END IF;

  SELECT * INTO v_ticket
  FROM public.support_tickets
  WHERE id = p_ticket_id
    AND customer_id = p_customer_id
    AND tenant_id = v_tenant_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Ticket not found';
  END IF;

  RETURN QUERY
  SELECT tc.*
  FROM public.ticket_comments tc
  WHERE tc.ticket_id = p_ticket_id
    AND tc.tenant_id = v_tenant_id
    AND tc.is_internal = false
  ORDER BY tc.created_at ASC;
END;
$$;

GRANT EXECUTE ON FUNCTION public.list_customer_ticket_comments(uuid, uuid) TO anon;
GRANT EXECUTE ON FUNCTION public.list_customer_ticket_comments(uuid, uuid) TO authenticated;

-- 5) RPC: add customer comment (tenant safe)
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
  v_tenant_id uuid;
  v_ticket public.support_tickets%ROWTYPE;
BEGIN
  IF p_comment IS NULL OR btrim(p_comment) = '' THEN
    RAISE EXCEPTION 'Comment is required';
  END IF;

  SELECT tenant_id INTO v_tenant_id
  FROM public.customers
  WHERE id = p_customer_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Customer not found';
  END IF;

  SELECT * INTO v_ticket
  FROM public.support_tickets
  WHERE id = p_ticket_id
    AND customer_id = p_customer_id
    AND tenant_id = v_tenant_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Ticket not found';
  END IF;

  INSERT INTO public.ticket_comments (
    ticket_id,
    tenant_id,
    comment,
    is_internal,
    created_by_name
  )
  VALUES (
    p_ticket_id,
    v_tenant_id,
    p_comment,
    false,
    p_created_by_name
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.add_customer_ticket_comment(uuid, uuid, text, text) TO anon;
GRANT EXECUTE ON FUNCTION public.add_customer_ticket_comment(uuid, uuid, text, text) TO authenticated;
