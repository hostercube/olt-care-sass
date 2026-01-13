
-- Fix security warning: Update function search_path
CREATE OR REPLACE FUNCTION public.generate_location_token()
RETURNS TEXT AS $$
DECLARE
  chars TEXT := 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  result TEXT := '';
  i INTEGER;
BEGIN
  FOR i IN 1..32 LOOP
    result := result || substr(chars, floor(random() * length(chars) + 1)::integer, 1);
  END LOOP;
  RETURN result;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Fix security warning: Make insert policy more restrictive
-- Drop the overly permissive policy
DROP POLICY IF EXISTS "Public can insert location visits" ON public.location_visits;

-- Create a more restrictive policy that validates token exists
CREATE POLICY "Public can insert location visits with valid token"
ON public.location_visits FOR INSERT
WITH CHECK (
  token IN (
    SELECT unique_token FROM public.tenant_location_settings WHERE is_active = true
  )
  AND tenant_id IN (
    SELECT tenant_id FROM public.tenant_location_settings WHERE unique_token = token AND is_active = true
  )
);
