-- Update get_tenant_enabled_payment_gateways to only return gateways with actual credentials configured
-- This prevents customers from seeing enabled but misconfigured gateways

CREATE OR REPLACE FUNCTION public.get_tenant_enabled_payment_gateways(p_tenant_id uuid)
RETURNS TABLE(
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
DECLARE
  found_count integer := 0;
BEGIN
  -- Helper: check if config has real credentials (excluding bkash_mode which is just a mode selector)
  -- A gateway is "configured" if config has at least one non-empty value other than bkash_mode
  
  -- Prefer tenant-specific gateways that are enabled AND have credentials
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
    AND (
      -- Manual and rocket don't need credentials
      tpg.gateway IN ('manual', 'rocket')
      OR (
        -- For other gateways, check if config has real credentials
        tpg.config IS NOT NULL 
        AND tpg.config != '{}'::jsonb
        AND EXISTS (
          SELECT 1 FROM jsonb_each_text(tpg.config) AS kv
          WHERE kv.key != 'bkash_mode' 
            AND kv.value IS NOT NULL 
            AND trim(kv.value) != ''
        )
      )
    )
  ORDER BY tpg.sort_order ASC;

  GET DIAGNOSTICS found_count = ROW_COUNT;

  -- If no tenant gateways found (or none with credentials), fall back to global
  IF found_count = 0 THEN
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
      AND (
        -- Manual and rocket don't need credentials
        pgs.gateway IN ('manual', 'rocket')
        OR (
          -- For other gateways, check if config has real credentials
          pgs.config IS NOT NULL 
          AND pgs.config != '{}'::jsonb
          AND EXISTS (
            SELECT 1 FROM jsonb_each_text(pgs.config) AS kv
            WHERE kv.key != 'bkash_mode' 
              AND kv.value IS NOT NULL 
              AND trim(kv.value) != ''
          )
        )
      )
    ORDER BY pgs.sort_order ASC;
  END IF;
END;
$$;

-- Also add a helper function to validate gateway credentials (useful for frontend/admin)
CREATE OR REPLACE FUNCTION public.gateway_has_credentials(p_config jsonb)
RETURNS boolean
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM jsonb_each_text(p_config) AS kv
    WHERE kv.key != 'bkash_mode' 
      AND kv.value IS NOT NULL 
      AND trim(kv.value) != ''
  );
$$;