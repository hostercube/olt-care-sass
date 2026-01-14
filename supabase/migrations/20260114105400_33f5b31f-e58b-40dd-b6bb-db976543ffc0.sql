-- Add DELETE policy for location_visits table
CREATE POLICY "Tenants can delete own location visits"
ON public.location_visits
FOR DELETE
USING (tenant_id IN (
  SELECT tenant_users.tenant_id
  FROM tenant_users
  WHERE tenant_users.user_id = auth.uid()
));