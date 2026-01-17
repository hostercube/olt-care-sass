-- Fix the linter warning: set search_path for gateway_has_credentials function
CREATE OR REPLACE FUNCTION public.gateway_has_credentials(p_config jsonb)
RETURNS boolean
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM jsonb_each_text(p_config) AS kv
    WHERE kv.key != 'bkash_mode' 
      AND kv.value IS NOT NULL 
      AND trim(kv.value) != ''
  );
$$;