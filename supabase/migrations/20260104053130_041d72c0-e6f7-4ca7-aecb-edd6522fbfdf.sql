-- Create email_templates table if not exists
CREATE TABLE IF NOT EXISTS public.email_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_type TEXT NOT NULL,
  name TEXT NOT NULL,
  subject TEXT NOT NULL,
  body TEXT NOT NULL,
  variables JSONB DEFAULT '[]'::jsonb,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.email_templates ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for email_templates
DROP POLICY IF EXISTS "Super admins full access email_templates" ON public.email_templates;
CREATE POLICY "Super admins full access email_templates"
ON public.email_templates FOR ALL
USING (is_super_admin())
WITH CHECK (is_super_admin());

DROP POLICY IF EXISTS "Anyone can view active email_templates" ON public.email_templates;
CREATE POLICY "Anyone can view active email_templates"
ON public.email_templates FOR SELECT
USING (is_active = true);

-- Insert default email templates
INSERT INTO public.email_templates (template_type, name, subject, body, variables) VALUES
  ('welcome', 'Welcome Email', 'Welcome to {{company_name}}!', '<h1>Welcome {{customer_name}}!</h1><p>Your account has been created successfully.</p>', '["customer_name", "company_name"]'),
  ('payment_received', 'Payment Received', 'Payment Confirmation - {{amount}}', '<h1>Payment Received</h1><p>Dear {{customer_name}}, we received your payment of ৳{{amount}}. Thank you!</p>', '["customer_name", "amount", "date"]'),
  ('billing_reminder', 'Billing Reminder', 'Payment Due Reminder', '<p>Dear {{customer_name}}, your bill of ৳{{amount}} is due on {{due_date}}.</p>', '["customer_name", "amount", "due_date"]'),
  ('subscription_expiry', 'Subscription Expiry', 'Your subscription is expiring soon', '<p>Dear {{tenant_name}}, your {{package_name}} subscription expires on {{expiry_date}}.</p>', '["tenant_name", "package_name", "expiry_date"]')
ON CONFLICT DO NOTHING;