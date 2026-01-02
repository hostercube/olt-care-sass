-- Email Gateway Settings Table for SMTP configuration
CREATE TABLE IF NOT EXISTS public.email_gateway_settings (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  provider text NOT NULL DEFAULT 'smtp',
  smtp_host text,
  smtp_port integer DEFAULT 587,
  smtp_username text,
  smtp_password text,
  sender_email text,
  sender_name text DEFAULT 'OLT Care',
  use_tls boolean DEFAULT true,
  is_enabled boolean DEFAULT false,
  config jsonb DEFAULT '{}'::jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.email_gateway_settings ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Only super admins can manage email gateway settings
CREATE POLICY "Super admins can manage email gateway" ON public.email_gateway_settings
  FOR ALL USING (is_super_admin());

-- Email Logs Table
CREATE TABLE IF NOT EXISTS public.email_logs (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id uuid REFERENCES public.tenants(id) ON DELETE SET NULL,
  recipient_email text NOT NULL,
  subject text NOT NULL,
  message text NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  error_message text,
  sent_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.email_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies for email_logs
CREATE POLICY "Super admins can view all email logs" ON public.email_logs
  FOR ALL USING (is_super_admin());

CREATE POLICY "Tenants can view own email logs" ON public.email_logs
  FOR SELECT USING (tenant_id = get_user_tenant_id());

-- Trigger for updated_at
CREATE TRIGGER update_email_gateway_settings_updated_at
  BEFORE UPDATE ON public.email_gateway_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();