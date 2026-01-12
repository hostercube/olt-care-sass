-- Insert default SMS templates for existing tenants (tenant-specific)
INSERT INTO public.sms_templates (tenant_id, name, template_type, message, variables, is_active)
SELECT 
  t.id as tenant_id,
  template.name,
  template.template_type,
  template.message,
  template.variables::jsonb,
  true
FROM tenants t
CROSS JOIN (
  VALUES 
    ('Payment Confirmation', 'payment_confirmation', 'প্রিয় {customer_name}, আপনার {amount} টাকা পেমেন্ট সফলভাবে গ্রহণ করা হয়েছে। লেনদেন আইডি: {transaction_id}। ধন্যবাদ - {company_name}', '["customer_name", "amount", "transaction_id", "company_name"]'),
    ('Bill Reminder', 'bill_reminder', 'প্রিয় {customer_name}, আপনার {billing_month} মাসের বিল {amount} টাকা বকেয়া আছে। অনুগ্রহ করে {due_date} তারিখের মধ্যে পরিশোধ করুন। - {company_name}', '["customer_name", "billing_month", "amount", "due_date", "company_name"]'),
    ('Package Expiry Alert', 'expiry_alert', 'প্রিয় {customer_name}, আপনার {package_name} প্যাকেজের মেয়াদ {expiry_date} তারিখে শেষ হবে। রিচার্জ করতে যোগাযোগ করুন। - {company_name}', '["customer_name", "package_name", "expiry_date", "company_name"]'),
    ('Connection Activated', 'connection_activated', 'প্রিয় {customer_name}, আপনার ইন্টারনেট সংযোগ সক্রিয় করা হয়েছে। প্যাকেজ: {package_name}, মেয়াদ: {expiry_date}। ধন্যবাদ - {company_name}', '["customer_name", "package_name", "expiry_date", "company_name"]'),
    ('Connection Suspended', 'connection_suspended', 'প্রিয় {customer_name}, বকেয়া বিলের কারণে আপনার সংযোগ স্থগিত করা হয়েছে। বকেয়া: {due_amount} টাকা। পরিশোধ করতে যোগাযোগ করুন। - {company_name}', '["customer_name", "due_amount", "company_name"]'),
    ('New Connection Welcome', 'welcome', 'স্বাগতম {customer_name}! আপনার ইন্টারনেট সংযোগ সফলভাবে চালু হয়েছে। ইউজারনেম: {username}। যেকোনো সমস্যায় {support_phone} নম্বরে কল করুন। - {company_name}', '["customer_name", "username", "support_phone", "company_name"]'),
    ('Recharge Success', 'recharge_success', 'প্রিয় {customer_name}, {amount} টাকা রিচার্জ সফল! নতুন মেয়াদ: {expiry_date}। ধন্যবাদ - {company_name}', '["customer_name", "amount", "expiry_date", "company_name"]'),
    ('Password Reset', 'password_reset', 'প্রিয় {customer_name}, আপনার নতুন পাসওয়ার্ড: {new_password}। নিরাপত্তার জন্য পাসওয়ার্ড পরিবর্তন করুন। - {company_name}', '["customer_name", "new_password", "company_name"]')
) AS template(name, template_type, message, variables)
ON CONFLICT DO NOTHING;

-- Insert default Email templates for existing tenants
INSERT INTO public.email_templates (tenant_id, template_type, name, subject, body, variables, is_active, is_system)
SELECT 
  t.id as tenant_id,
  template.template_type,
  template.name,
  template.subject,
  template.body,
  template.variables::jsonb,
  true,
  false
FROM tenants t
CROSS JOIN (
  VALUES 
    ('payment_confirmation', 'Payment Confirmation', 'পেমেন্ট নিশ্চিতকরণ - {company_name}', '<h2>পেমেন্ট সফল!</h2><p>প্রিয় {customer_name},</p><p>আপনার <strong>{amount}</strong> টাকা পেমেন্ট সফলভাবে গ্রহণ করা হয়েছে।</p><p><strong>লেনদেন আইডি:</strong> {transaction_id}</p><p><strong>তারিখ:</strong> {date}</p><p>ধন্যবাদ,<br>{company_name}</p>', '["customer_name", "amount", "transaction_id", "date", "company_name"]'),
    ('bill_reminder', 'Bill Reminder', 'বিল পরিশোধের অনুস্মারক - {company_name}', '<h2>বিল পরিশোধের অনুস্মারক</h2><p>প্রিয় {customer_name},</p><p>আপনার <strong>{billing_month}</strong> মাসের বিল <strong>{amount}</strong> টাকা বকেয়া আছে।</p><p>অনুগ্রহ করে <strong>{due_date}</strong> তারিখের মধ্যে পরিশোধ করুন।</p><p>ধন্যবাদ,<br>{company_name}</p>', '["customer_name", "billing_month", "amount", "due_date", "company_name"]'),
    ('expiry_alert', 'Package Expiry Alert', 'প্যাকেজ মেয়াদ শেষ হবে - {company_name}', '<h2>প্যাকেজ মেয়াদ সতর্কতা</h2><p>প্রিয় {customer_name},</p><p>আপনার <strong>{package_name}</strong> প্যাকেজের মেয়াদ <strong>{expiry_date}</strong> তারিখে শেষ হবে।</p><p>রিচার্জ করতে আমাদের সাথে যোগাযোগ করুন।</p><p>ধন্যবাদ,<br>{company_name}</p>', '["customer_name", "package_name", "expiry_date", "company_name"]'),
    ('welcome', 'Welcome Email', 'স্বাগতম - {company_name}', '<h2>স্বাগতম!</h2><p>প্রিয় {customer_name},</p><p>আমাদের পরিষেবায় যোগ দেওয়ার জন্য ধন্যবাদ!</p><p><strong>আপনার তথ্য:</strong></p><ul><li>ইউজারনেম: {username}</li><li>প্যাকেজ: {package_name}</li><li>মেয়াদ: {expiry_date}</li></ul><p>যেকোনো সমস্যায় {support_phone} নম্বরে যোগাযোগ করুন।</p><p>ধন্যবাদ,<br>{company_name}</p>', '["customer_name", "username", "package_name", "expiry_date", "support_phone", "company_name"]'),
    ('invoice', 'Invoice Email', 'চালান - {invoice_number} - {company_name}', '<h2>চালান</h2><p>প্রিয় {customer_name},</p><p>আপনার চালান নং <strong>{invoice_number}</strong> এর বিবরণ:</p><p><strong>পরিমাণ:</strong> {amount} টাকা</p><p><strong>বিলিং মাস:</strong> {billing_month}</p><p><strong>পরিশোধের শেষ তারিখ:</strong> {due_date}</p><p>ধন্যবাদ,<br>{company_name}</p>', '["customer_name", "invoice_number", "amount", "billing_month", "due_date", "company_name"]'),
    ('connection_activated', 'Connection Activated', 'সংযোগ সক্রিয় - {company_name}', '<h2>সংযোগ সক্রিয়!</h2><p>প্রিয় {customer_name},</p><p>আপনার ইন্টারনেট সংযোগ সফলভাবে সক্রিয় করা হয়েছে।</p><p><strong>প্যাকেজ:</strong> {package_name}</p><p><strong>মেয়াদ:</strong> {expiry_date}</p><p>ধন্যবাদ,<br>{company_name}</p>', '["customer_name", "package_name", "expiry_date", "company_name"]'),
    ('connection_suspended', 'Connection Suspended', 'সংযোগ স্থগিত - {company_name}', '<h2>সংযোগ স্থগিত</h2><p>প্রিয় {customer_name},</p><p>বকেয়া বিলের কারণে আপনার সংযোগ স্থগিত করা হয়েছে।</p><p><strong>বকেয়া:</strong> {due_amount} টাকা</p><p>পরিশোধ করতে আমাদের সাথে যোগাযোগ করুন।</p><p>ধন্যবাদ,<br>{company_name}</p>', '["customer_name", "due_amount", "company_name"]'),
    ('password_reset', 'Password Reset', 'পাসওয়ার্ড রিসেট - {company_name}', '<h2>পাসওয়ার্ড রিসেট</h2><p>প্রিয় {customer_name},</p><p>আপনার নতুন পাসওয়ার্ড: <strong>{new_password}</strong></p><p>নিরাপত্তার জন্য দ্রুত পাসওয়ার্ড পরিবর্তন করুন।</p><p>ধন্যবাদ,<br>{company_name}</p>', '["customer_name", "new_password", "company_name"]')
) AS template(template_type, name, subject, body, variables)
WHERE NOT EXISTS (
  SELECT 1 FROM email_templates et 
  WHERE et.tenant_id = t.id AND et.template_type = template.template_type
);