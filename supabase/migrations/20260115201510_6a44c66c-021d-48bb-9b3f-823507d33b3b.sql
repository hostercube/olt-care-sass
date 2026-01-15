-- Fix return type mismatch in get_tenant_enabled_payment_gateways (gateway enum -> text)
CREATE OR REPLACE FUNCTION public.get_tenant_enabled_payment_gateways(p_tenant_id uuid)
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
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Prefer tenant-specific gateways (if any enabled)
  RETURN QUERY
  SELECT
    tpg.id,
    tpg.gateway::text,
    tpg.display_name,
    tpg.is_enabled,
    tpg.sandbox_mode,
    tpg.instructions,
    tpg.sort_order,
    COALESCE(tpg.bkash_mode::text, 'tokenized')
  FROM public.tenant_payment_gateways tpg
  WHERE tpg.tenant_id = p_tenant_id
    AND tpg.is_enabled = true
  ORDER BY tpg.sort_order ASC;

  -- If none found, fall back to globally enabled gateways
  IF NOT FOUND THEN
    RETURN QUERY
    SELECT
      pgs.id,
      pgs.gateway::text,
      pgs.display_name,
      pgs.is_enabled,
      pgs.sandbox_mode,
      pgs.instructions,
      pgs.sort_order,
      COALESCE(pgs.bkash_mode::text, 'tokenized')
    FROM public.payment_gateway_settings pgs
    WHERE pgs.is_enabled = true
    ORDER BY pgs.sort_order ASC;
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_tenant_enabled_payment_gateways(uuid) TO anon, authenticated;