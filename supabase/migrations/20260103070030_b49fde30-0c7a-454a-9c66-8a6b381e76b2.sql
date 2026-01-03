-- Create email templates table for customizable notifications
CREATE TABLE public.email_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  template_type TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  subject TEXT NOT NULL,
  body TEXT NOT NULL,
  variables JSONB DEFAULT '[]'::jsonb,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.email_templates ENABLE ROW LEVEL SECURITY;

-- Only super admins can manage email templates
CREATE POLICY "Super admins can manage email templates"
  ON public.email_templates
  FOR ALL
  USING (is_super_admin());

-- Insert default email templates
INSERT INTO public.email_templates (template_type, name, subject, body, variables) VALUES
('subscription_reminder', 'Subscription Reminder', 'Your {{package_name}} subscription expires in {{days_remaining}} days', 
'Dear {{tenant_name}},

Your {{package_name}} subscription will expire on {{expiry_date}}.

Subscription Details:
- Package: {{package_name}}
- Amount Due: ৳{{amount}}
- Expiry Date: {{expiry_date}}

Please renew your subscription to continue enjoying uninterrupted service.

Best regards,
OLT Care Team', 
'["tenant_name", "package_name", "days_remaining", "expiry_date", "amount"]'),

('payment_confirmation', 'Payment Confirmation', 'Payment Received - Invoice #{{invoice_number}}',
'Dear {{tenant_name}},

We have received your payment of ৳{{amount}} for Invoice #{{invoice_number}}.

Payment Details:
- Invoice Number: {{invoice_number}}
- Amount: ৳{{amount}}
- Payment Method: {{payment_method}}
- Transaction ID: {{transaction_id}}
- Date: {{payment_date}}

Thank you for your payment!

Best regards,
OLT Care Team',
'["tenant_name", "amount", "invoice_number", "payment_method", "transaction_id", "payment_date"]'),

('account_suspended', 'Account Suspended', 'Your account has been suspended',
'Dear {{tenant_name}},

Your account has been suspended due to: {{suspension_reason}}

Please contact support or make a payment to restore your access.

Best regards,
OLT Care Team',
'["tenant_name", "suspension_reason"]'),

('onu_offline_alert', 'ONU Offline Alert', 'Alert: ONU {{onu_name}} is offline',
'Alert Notification

Device: {{onu_name}}
Status: Offline
OLT: {{olt_name}}
PON Port: {{pon_port}}
Time: {{alert_time}}

Please investigate this issue.

- OLT Care Monitoring',
'["onu_name", "olt_name", "pon_port", "alert_time"]'),

('welcome_email', 'Welcome Email', 'Welcome to OLT Care - {{tenant_name}}',
'Dear {{tenant_name}},

Welcome to OLT Care! Your account has been successfully created.

Login Details:
- Email: {{email}}
- Dashboard URL: {{dashboard_url}}

Getting Started:
1. Log in to your dashboard
2. Add your first OLT device
3. Start monitoring your network

If you have any questions, please contact our support team.

Best regards,
OLT Care Team',
'["tenant_name", "email", "dashboard_url"]');

-- Add updated_at trigger
CREATE TRIGGER update_email_templates_updated_at
  BEFORE UPDATE ON public.email_templates
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();