-- Email/SMS Campaign table
CREATE TABLE IF NOT EXISTS public.email_campaigns (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  subject TEXT,
  message TEXT NOT NULL,
  channel TEXT NOT NULL DEFAULT 'email', -- 'email', 'sms', 'both'
  recipient_type TEXT NOT NULL DEFAULT 'all', -- 'all', 'selected', 'filter'
  recipient_filter JSONB DEFAULT '{}',
  recipients JSONB DEFAULT '[]',
  status TEXT NOT NULL DEFAULT 'draft', -- 'draft', 'scheduled', 'sending', 'sent', 'cancelled'
  scheduled_at TIMESTAMPTZ,
  sent_at TIMESTAMPTZ,
  total_recipients INTEGER DEFAULT 0,
  sent_count INTEGER DEFAULT 0,
  failed_count INTEGER DEFAULT 0,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Platform notification settings (Super Admin controls)
CREATE TABLE IF NOT EXISTS public.platform_notification_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  notification_type TEXT NOT NULL UNIQUE, -- 'new_signup', 'subscription_expiry', 'payment_reminder', etc.
  name TEXT NOT NULL,
  description TEXT,
  email_enabled BOOLEAN DEFAULT false,
  sms_enabled BOOLEAN DEFAULT false,
  email_template TEXT,
  sms_template TEXT,
  days_before INTEGER, -- For reminders
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.email_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.platform_notification_settings ENABLE ROW LEVEL SECURITY;

-- RLS policies for email_campaigns
CREATE POLICY "Super admins can manage email campaigns"
  ON public.email_campaigns
  FOR ALL
  USING (public.is_super_admin());

-- RLS policies for platform_notification_settings
CREATE POLICY "Super admins can manage platform notification settings"
  ON public.platform_notification_settings
  FOR ALL
  USING (public.is_super_admin());

CREATE POLICY "Anyone can read platform notification settings"
  ON public.platform_notification_settings
  FOR SELECT
  USING (true);

-- Insert default notification types
INSERT INTO public.platform_notification_settings (notification_type, name, description, email_enabled, sms_enabled, email_template, sms_template)
VALUES
  ('new_signup', 'New Tenant Signup', 'Notification when a new tenant signs up', true, false, 
   'Welcome to {{platform_name}}! Your account has been created successfully.', 
   'Welcome to {{platform_name}}! Your account is ready.'),
  ('subscription_expiry', 'Subscription Expiry Reminder', 'Reminder before subscription expires', true, true, 
   'Your subscription expires on {{expiry_date}}. Please renew to continue using our services.', 
   'Your subscription expires on {{expiry_date}}. Renew now!'),
  ('payment_reminder', 'Payment Reminder', 'Reminder for pending payments', true, true, 
   'You have a pending payment of {{amount}}. Please make the payment before {{due_date}}.', 
   'Payment reminder: {{amount}} due by {{due_date}}.'),
  ('account_verification', 'Account Verification', 'Email/SMS for account verification', true, true, 
   'Please verify your account by clicking this link: {{verification_link}}', 
   'Your verification code is: {{code}}'),
  ('password_reset', 'Password Reset', 'Password reset notification', true, false, 
   'Click here to reset your password: {{reset_link}}', 
   'Your password reset code is: {{code}}'),
  ('subscription_activated', 'Subscription Activated', 'Notification when subscription is activated', true, true, 
   'Your subscription has been activated! Package: {{package_name}}, Valid until: {{expiry_date}}', 
   'Subscription activated! Package: {{package_name}}, Valid until: {{expiry_date}}'),
  ('subscription_cancelled', 'Subscription Cancelled', 'Notification when subscription is cancelled', true, true, 
   'Your subscription has been cancelled. Please contact support if you have any questions.', 
   'Your subscription has been cancelled.')
ON CONFLICT (notification_type) DO NOTHING;

-- Add trigger for updated_at
CREATE TRIGGER update_email_campaigns_updated_at
  BEFORE UPDATE ON public.email_campaigns
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_platform_notification_settings_updated_at
  BEFORE UPDATE ON public.platform_notification_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();