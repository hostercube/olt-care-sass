-- Update payment_gateway_settings RLS to allow super admins to see all gateways (not just enabled ones)
DROP POLICY IF EXISTS "Anyone can view enabled payment gateways" ON public.payment_gateway_settings;

CREATE POLICY "Super admins can view all payment gateways" 
ON public.payment_gateway_settings 
FOR SELECT 
USING (is_super_admin() OR is_enabled = true);

-- Update sms_gateway_settings RLS similarly  
DROP POLICY IF EXISTS "Super admins can manage SMS gateway" ON public.sms_gateway_settings;

CREATE POLICY "Super admins can view all SMS gateways" 
ON public.sms_gateway_settings 
FOR SELECT 
USING (is_super_admin());

CREATE POLICY "Super admins can manage SMS gateways" 
ON public.sms_gateway_settings 
FOR ALL 
USING (is_super_admin());