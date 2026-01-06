-- Add more notification types
INSERT INTO platform_notification_settings (notification_type, name, description, email_enabled, sms_enabled, email_template, sms_template, is_active)
VALUES 
  ('account_activated', 'Account Activated', 'Sent when a tenant account is activated/approved', true, true, 
   'Dear {{tenant_name}},\n\nYour account has been activated! You can now access all features of {{platform_name}}.\n\nLogin: {{login_url}}\n\nThank you for choosing {{platform_name}}!', 
   'Your {{platform_name}} account is now active! Login at {{login_url}}', true),
  
  ('account_suspended', 'Account Suspended', 'Sent when a tenant account is suspended', true, true, 
   'Dear {{tenant_name}},\n\nYour {{platform_name}} account has been suspended. Please contact support for assistance.\n\nReason: {{reason}}', 
   'Your {{platform_name}} account has been suspended. Contact support.', true),
  
  ('password_reset', 'Password Reset', 'Password reset notification', true, true, 
   'Dear {{tenant_name}},\n\nA password reset was requested for your account.\n\nReset Link: {{reset_link}}\n\nIf you did not request this, please ignore this email.', 
   'Your {{platform_name}} password reset code: {{reset_code}}', true),
  
  ('payment_received', 'Payment Received', 'Sent when a payment is received', true, true, 
   'Dear {{tenant_name}},\n\nWe have received your payment of {{amount}}.\n\nTransaction ID: {{transaction_id}}\nDate: {{payment_date}}\n\nThank you!', 
   'Payment of {{amount}} received. TxID: {{transaction_id}}. Thank you!', true),
  
  ('invoice_generated', 'Invoice Generated', 'Sent when a new invoice is generated', true, false, 
   'Dear {{tenant_name}},\n\nA new invoice has been generated for your account.\n\nInvoice #: {{invoice_number}}\nAmount: {{amount}}\nDue Date: {{due_date}}\n\nPlease make payment before the due date to avoid service interruption.', 
   NULL, true),
  
  ('subscription_renewed', 'Subscription Renewed', 'Sent when subscription is renewed', true, true, 
   'Dear {{tenant_name}},\n\nYour subscription has been renewed successfully!\n\nPlan: {{plan_name}}\nNew Expiry: {{new_expiry}}\n\nThank you for your continued trust in {{platform_name}}!', 
   'Subscription renewed! Plan: {{plan_name}}, Expires: {{new_expiry}}. Thank you!', true),
  
  ('subscription_downgraded', 'Subscription Downgraded', 'Sent when subscription is downgraded', true, false, 
   'Dear {{tenant_name}},\n\nYour subscription has been changed.\n\nOld Plan: {{old_plan}}\nNew Plan: {{new_plan}}\n\nThis change takes effect immediately.', 
   NULL, true),
  
  ('trial_ending', 'Trial Ending Soon', 'Sent before trial ends', true, true, 
   'Dear {{tenant_name}},\n\nYour trial period ends in {{days_remaining}} days.\n\nUpgrade now to keep accessing all features!\n\nUpgrade: {{upgrade_url}}', 
   'Your {{platform_name}} trial ends in {{days_remaining}} days. Upgrade now!', true),
  
  ('welcome_onboarding', 'Welcome & Onboarding', 'Welcome message for new tenants', true, true, 
   'Welcome to {{platform_name}}, {{tenant_name}}!\n\nWe''re excited to have you on board. Here''s how to get started:\n\n1. Complete your profile setup\n2. Add your first OLT device\n3. Import your customers\n\nNeed help? Contact us at {{support_email}}', 
   'Welcome to {{platform_name}}! Complete your setup at {{login_url}}', true),
  
  ('maintenance_scheduled', 'Scheduled Maintenance', 'Notify tenants about scheduled maintenance', true, true, 
   'Dear {{tenant_name}},\n\nScheduled maintenance on {{maintenance_date}} from {{start_time}} to {{end_time}}.\n\nService may be briefly unavailable during this period.\n\nThank you for your understanding.', 
   'Maintenance on {{maintenance_date}}: {{start_time}} - {{end_time}}. Brief disruption expected.', true)
ON CONFLICT (notification_type) DO NOTHING;

-- Add tenant campaigns table
CREATE TABLE IF NOT EXISTS tenant_campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  subject TEXT,
  message TEXT NOT NULL,
  channel TEXT NOT NULL DEFAULT 'sms',
  recipient_type TEXT NOT NULL DEFAULT 'all_customers',
  recipient_filter JSONB,
  custom_recipients TEXT[],
  email_template_id UUID REFERENCES email_templates(id),
  sms_template_id UUID,
  status TEXT NOT NULL DEFAULT 'draft',
  scheduled_at TIMESTAMPTZ,
  sent_at TIMESTAMPTZ,
  total_recipients INT DEFAULT 0,
  sent_count INT DEFAULT 0,
  failed_count INT DEFAULT 0,
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE tenant_campaigns ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Tenants can manage their campaigns"
  ON tenant_campaigns FOR ALL
  USING (tenant_id IN (SELECT tenant_id FROM user_roles WHERE user_id = auth.uid()));

-- Add campaigns_allowed to saas packages concept
ALTER TABLE email_campaigns ADD COLUMN IF NOT EXISTS recipient_filter JSONB;
ALTER TABLE email_campaigns ADD COLUMN IF NOT EXISTS custom_recipients TEXT[];
ALTER TABLE email_campaigns ADD COLUMN IF NOT EXISTS email_template_id UUID;
ALTER TABLE email_campaigns ADD COLUMN IF NOT EXISTS sms_template_id UUID;