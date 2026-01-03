-- Create SMS templates table for tenant-specific templates
CREATE TABLE IF NOT EXISTS public.sms_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  template_type TEXT NOT NULL,
  message TEXT NOT NULL,
  variables JSONB DEFAULT '[]'::jsonb,
  is_active BOOLEAN DEFAULT true,
  is_system BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS on sms_templates
ALTER TABLE public.sms_templates ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for sms_templates
CREATE POLICY "Super admins full access to sms_templates"
  ON public.sms_templates FOR ALL
  USING (is_super_admin());

CREATE POLICY "Tenant users can manage own sms_templates"
  ON public.sms_templates FOR ALL
  USING (tenant_id = get_user_tenant_id());

-- Create SMS send queue/history for bulk, single, group SMS
CREATE TABLE IF NOT EXISTS public.sms_queue (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  template_id UUID REFERENCES public.sms_templates(id),
  send_type TEXT NOT NULL DEFAULT 'single',
  recipients JSONB NOT NULL DEFAULT '[]'::jsonb,
  group_filter JSONB,
  message TEXT NOT NULL,
  total_count INTEGER DEFAULT 0,
  sent_count INTEGER DEFAULT 0,
  failed_count INTEGER DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending',
  scheduled_at TIMESTAMPTZ,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS on sms_queue
ALTER TABLE public.sms_queue ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for sms_queue
CREATE POLICY "Super admins full access to sms_queue"
  ON public.sms_queue FOR ALL
  USING (is_super_admin());

CREATE POLICY "Tenant users can manage own sms_queue"
  ON public.sms_queue FOR ALL
  USING (tenant_id = get_user_tenant_id());

-- Add trigger for updated_at on sms_templates
CREATE TRIGGER update_sms_templates_updated_at
  BEFORE UPDATE ON public.sms_templates
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Add provider column to tenant_sms_gateways if needed
ALTER TABLE public.tenant_sms_gateways 
  ADD COLUMN IF NOT EXISTS provider_name TEXT;

-- Update initialize_tenant_gateways function to include new gateways
CREATE OR REPLACE FUNCTION public.initialize_tenant_gateways(_tenant_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Insert default payment gateways (all supported gateways)
  INSERT INTO public.tenant_payment_gateways (tenant_id, gateway, display_name, sort_order)
  VALUES
    (_tenant_id, 'sslcommerz', 'SSLCommerz', 1),
    (_tenant_id, 'bkash', 'bKash', 2),
    (_tenant_id, 'rocket', 'Rocket', 3),
    (_tenant_id, 'nagad', 'Nagad', 4),
    (_tenant_id, 'uddoktapay', 'UddoktaPay', 5),
    (_tenant_id, 'shurjopay', 'ShurjoPay', 6),
    (_tenant_id, 'aamarpay', 'aamarPay', 7),
    (_tenant_id, 'portwallet', 'PortWallet', 8),
    (_tenant_id, 'manual', 'Manual Payment', 9)
  ON CONFLICT (tenant_id, gateway) DO NOTHING;
  
  -- Insert default SMS gateway
  INSERT INTO public.tenant_sms_gateways (tenant_id, provider)
  VALUES (_tenant_id, 'smsnoc')
  ON CONFLICT (tenant_id) DO NOTHING;
  
  -- Insert default email gateway
  INSERT INTO public.tenant_email_gateways (tenant_id, provider)
  VALUES (_tenant_id, 'smtp')
  ON CONFLICT (tenant_id) DO NOTHING;
  
  -- Insert default SMS templates
  INSERT INTO public.sms_templates (tenant_id, name, template_type, message, variables, is_system)
  VALUES
    (_tenant_id, 'Billing Reminder', 'billing_reminder', 'Dear {{customer_name}}, your bill of ৳{{amount}} is due on {{due_date}}. Please pay to avoid service interruption.', '["customer_name", "amount", "due_date"]'::jsonb, true),
    (_tenant_id, 'Payment Received', 'payment_received', 'Dear {{customer_name}}, we received your payment of ৳{{amount}}. Thank you! New expiry: {{expiry_date}}', '["customer_name", "amount", "expiry_date"]'::jsonb, true),
    (_tenant_id, 'Welcome Message', 'welcome', 'Welcome {{customer_name}}! Your internet connection is now active. Package: {{package_name}}. Support: {{support_phone}}', '["customer_name", "package_name", "support_phone"]'::jsonb, true),
    (_tenant_id, 'Expiry Warning', 'expiry_warning', 'Dear {{customer_name}}, your internet expires on {{expiry_date}}. Please renew to continue service.', '["customer_name", "expiry_date"]'::jsonb, true)
  ON CONFLICT DO NOTHING;
END;
$$;