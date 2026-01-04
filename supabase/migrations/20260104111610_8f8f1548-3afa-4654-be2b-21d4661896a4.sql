-- Allow new users to create tenants during signup (before they have any tenant association)
CREATE POLICY "Users can create tenant during signup"
ON public.tenants
FOR INSERT
TO authenticated
WITH CHECK (true);

-- Allow tenant owners to update their own tenant
CREATE POLICY "Tenant owners can update own tenant"
ON public.tenants
FOR UPDATE
TO authenticated
USING (owner_user_id = auth.uid() OR id IN (SELECT tenant_id FROM tenant_users WHERE user_id = auth.uid() AND role = 'admin'))
WITH CHECK (owner_user_id = auth.uid() OR id IN (SELECT tenant_id FROM tenant_users WHERE user_id = auth.uid() AND role = 'admin'));