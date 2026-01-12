-- Insert default billing automation rules for all tenants (with correct rule_type values)
INSERT INTO billing_rules (tenant_id, name, description, rule_type, trigger_days, trigger_condition, action, is_active)
SELECT 
  t.id as tenant_id,
  rules.name,
  rules.description,
  rules.rule_type,
  rules.trigger_days,
  rules.trigger_condition,
  rules.action,
  rules.is_active
FROM tenants t
CROSS JOIN (
  VALUES 
    ('মেয়াদ উত্তীর্ণ অটো ডিজেবল', 'মেয়াদ শেষ হলে স্বয়ংক্রিয়ভাবে কাস্টমার ডিজেবল করে', 'auto_disable', 0, 'expiry_date < CURRENT_DATE', 'disable_pppoe', true),
    ('মেয়াদ উত্তীর্ণ SMS সতর্কতা', 'মেয়াদ শেষ হওয়ার ৩ দিন আগে SMS পাঠায়', 'reminder', 3, 'expiry_date <= CURRENT_DATE + 3', 'send_sms', true),
    ('মেয়াদ উত্তীর্ণ Email সতর্কতা', 'মেয়াদ শেষ হওয়ার ৫ দিন আগে Email পাঠায়', 'reminder', 5, 'expiry_date <= CURRENT_DATE + 5', 'send_email', false),
    ('পেমেন্ট পরে অটো এনাবল', 'পেমেন্ট পাওয়ার পর স্বয়ংক্রিয়ভাবে কাস্টমার এনাবল করে', 'auto_enable', 0, 'payment_received = true', 'enable_pppoe', true),
    ('বিল বাকি রিমাইন্ডার', 'বিল বাকি থাকলে রিমাইন্ডার SMS পাঠায়', 'reminder', 0, 'due_amount > 0', 'send_sms', true),
    ('অতিরিক্ত বাকি ব্লক', 'অতিরিক্ত বাকি থাকলে কানেকশন ব্লক করে', 'auto_disable', 7, 'due_amount > monthly_bill * 2', 'disable_pppoe', false),
    ('মেয়াদ উত্তীর্ণ স্ট্যাটাস আপডেট', 'মেয়াদ উত্তীর্ণ হলে স্ট্যাটাস expired করে', 'auto_disable', 0, 'expiry_date < CURRENT_DATE', 'update_status', true),
    ('সাপ্তাহিক বিল রিমাইন্ডার', 'প্রতি সপ্তাহে বাকি বিলের রিমাইন্ডার', 'reminder', 7, 'due_amount > 0 AND last_reminder > 7 days', 'send_sms', false),
    ('মাসিক বিল অটো জেনারেট', 'প্রতি মাসে স্বয়ংক্রিয়ভাবে বিল তৈরি করে', 'auto_bill', 1, 'day_of_month = billing_day', 'generate_bill', false)
) AS rules(name, description, rule_type, trigger_days, trigger_condition, action, is_active)
WHERE NOT EXISTS (
  SELECT 1 FROM billing_rules br 
  WHERE br.tenant_id = t.id AND br.name = rules.name
);