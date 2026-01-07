-- Update Admin role permissions using JSON concatenation
UPDATE public.tenant_roles 
SET permissions = (
  '{"dashboard_view": true, "dashboard_stats": true, "customer_view": true, "customer_create": true, "customer_edit": true, "customer_delete": true, "customer_recharge": true, "customer_status_change": true, "customer_view_balance": true, "customer_send_sms": true}'::jsonb ||
  '{"billing_view": true, "billing_create": true, "billing_edit": true, "billing_delete": true, "payment_collect": true, "payment_view": true, "payment_refund": true, "invoice_create": true, "invoice_view": true}'::jsonb ||
  '{"reseller_view": true, "reseller_create": true, "reseller_edit": true, "reseller_delete": true, "reseller_balance": true, "branch_view": true, "branch_create": true, "branch_edit": true, "branch_delete": true}'::jsonb ||
  '{"staff_view": true, "staff_create": true, "staff_edit": true, "staff_delete": true, "staff_salary": true, "role_view": true, "role_manage": true}'::jsonb ||
  '{"olt_view": true, "olt_manage": true, "onu_view": true, "onu_manage": true, "mikrotik_view": true, "mikrotik_manage": true}'::jsonb ||
  '{"package_view": true, "package_create": true, "package_edit": true, "package_delete": true, "area_view": true, "area_manage": true}'::jsonb ||
  '{"report_view": true, "report_export": true, "analytics_view": true, "activity_logs": true}'::jsonb ||
  '{"inventory_view": true, "inventory_manage": true, "inventory_purchase": true, "inventory_issue": true}'::jsonb ||
  '{"settings_view": true, "settings_manage": true, "sms_gateway": true, "payment_gateway": true, "automation_manage": true}'::jsonb
)
WHERE name = 'Admin';

-- Update Manager role permissions
UPDATE public.tenant_roles 
SET permissions = (
  '{"dashboard_view": true, "dashboard_stats": true, "customer_view": true, "customer_create": true, "customer_edit": true, "customer_delete": false, "customer_recharge": true, "customer_status_change": true, "customer_view_balance": true, "customer_send_sms": true}'::jsonb ||
  '{"billing_view": true, "billing_create": true, "billing_edit": true, "billing_delete": false, "payment_collect": true, "payment_view": true, "payment_refund": false, "invoice_create": true, "invoice_view": true}'::jsonb ||
  '{"reseller_view": true, "reseller_create": true, "reseller_edit": true, "reseller_delete": false, "reseller_balance": true, "branch_view": true, "branch_create": true, "branch_edit": true, "branch_delete": false}'::jsonb ||
  '{"staff_view": true, "staff_create": true, "staff_edit": true, "staff_delete": false, "staff_salary": true, "role_view": true, "role_manage": false}'::jsonb ||
  '{"olt_view": true, "olt_manage": false, "onu_view": true, "onu_manage": true, "mikrotik_view": true, "mikrotik_manage": false}'::jsonb ||
  '{"package_view": true, "package_create": true, "package_edit": true, "package_delete": false, "area_view": true, "area_manage": true}'::jsonb ||
  '{"report_view": true, "report_export": true, "analytics_view": true, "activity_logs": true}'::jsonb ||
  '{"inventory_view": true, "inventory_manage": true, "inventory_purchase": true, "inventory_issue": true}'::jsonb ||
  '{"settings_view": true, "settings_manage": false, "sms_gateway": false, "payment_gateway": false, "automation_manage": false}'::jsonb
)
WHERE name = 'Manager';

-- Update Staff role permissions
UPDATE public.tenant_roles 
SET permissions = (
  '{"dashboard_view": true, "dashboard_stats": false, "customer_view": true, "customer_create": true, "customer_edit": true, "customer_delete": false, "customer_recharge": true, "customer_status_change": false, "customer_view_balance": true, "customer_send_sms": false}'::jsonb ||
  '{"billing_view": true, "billing_create": false, "billing_edit": false, "billing_delete": false, "payment_collect": true, "payment_view": true, "payment_refund": false, "invoice_create": false, "invoice_view": true}'::jsonb ||
  '{"reseller_view": false, "reseller_create": false, "reseller_edit": false, "reseller_delete": false, "reseller_balance": false, "branch_view": false, "branch_create": false, "branch_edit": false, "branch_delete": false}'::jsonb ||
  '{"staff_view": false, "staff_create": false, "staff_edit": false, "staff_delete": false, "staff_salary": false, "role_view": false, "role_manage": false}'::jsonb ||
  '{"olt_view": false, "olt_manage": false, "onu_view": true, "onu_manage": false, "mikrotik_view": false, "mikrotik_manage": false}'::jsonb ||
  '{"package_view": true, "package_create": false, "package_edit": false, "package_delete": false, "area_view": true, "area_manage": false}'::jsonb ||
  '{"report_view": false, "report_export": false, "analytics_view": false, "activity_logs": false}'::jsonb ||
  '{"inventory_view": true, "inventory_manage": false, "inventory_purchase": false, "inventory_issue": false}'::jsonb ||
  '{"settings_view": false, "settings_manage": false, "sms_gateway": false, "payment_gateway": false, "automation_manage": false}'::jsonb
)
WHERE name = 'Staff';

-- Update Technician role permissions
UPDATE public.tenant_roles 
SET permissions = (
  '{"dashboard_view": true, "dashboard_stats": false, "customer_view": true, "customer_create": false, "customer_edit": true, "customer_delete": false, "customer_recharge": false, "customer_status_change": true, "customer_view_balance": false, "customer_send_sms": false}'::jsonb ||
  '{"billing_view": false, "billing_create": false, "billing_edit": false, "billing_delete": false, "payment_collect": false, "payment_view": false, "payment_refund": false, "invoice_create": false, "invoice_view": false}'::jsonb ||
  '{"reseller_view": false, "reseller_create": false, "reseller_edit": false, "reseller_delete": false, "reseller_balance": false, "branch_view": false, "branch_create": false, "branch_edit": false, "branch_delete": false}'::jsonb ||
  '{"staff_view": false, "staff_create": false, "staff_edit": false, "staff_delete": false, "staff_salary": false, "role_view": false, "role_manage": false}'::jsonb ||
  '{"olt_view": true, "olt_manage": true, "onu_view": true, "onu_manage": true, "mikrotik_view": true, "mikrotik_manage": true}'::jsonb ||
  '{"package_view": true, "package_create": false, "package_edit": false, "package_delete": false, "area_view": true, "area_manage": true}'::jsonb ||
  '{"report_view": false, "report_export": false, "analytics_view": false, "activity_logs": false}'::jsonb ||
  '{"inventory_view": true, "inventory_manage": true, "inventory_purchase": false, "inventory_issue": true}'::jsonb ||
  '{"settings_view": false, "settings_manage": false, "sms_gateway": false, "payment_gateway": false, "automation_manage": false}'::jsonb
)
WHERE name = 'Technician';

-- Update Bill Collector role permissions
UPDATE public.tenant_roles 
SET permissions = (
  '{"dashboard_view": true, "dashboard_stats": false, "customer_view": true, "customer_create": false, "customer_edit": false, "customer_delete": false, "customer_recharge": true, "customer_status_change": false, "customer_view_balance": true, "customer_send_sms": true}'::jsonb ||
  '{"billing_view": true, "billing_create": false, "billing_edit": false, "billing_delete": false, "payment_collect": true, "payment_view": true, "payment_refund": false, "invoice_create": true, "invoice_view": true}'::jsonb ||
  '{"reseller_view": false, "reseller_create": false, "reseller_edit": false, "reseller_delete": false, "reseller_balance": false, "branch_view": false, "branch_create": false, "branch_edit": false, "branch_delete": false}'::jsonb ||
  '{"staff_view": false, "staff_create": false, "staff_edit": false, "staff_delete": false, "staff_salary": false, "role_view": false, "role_manage": false}'::jsonb ||
  '{"olt_view": false, "olt_manage": false, "onu_view": false, "onu_manage": false, "mikrotik_view": false, "mikrotik_manage": false}'::jsonb ||
  '{"package_view": true, "package_create": false, "package_edit": false, "package_delete": false, "area_view": true, "area_manage": false}'::jsonb ||
  '{"report_view": true, "report_export": false, "analytics_view": false, "activity_logs": false}'::jsonb ||
  '{"inventory_view": false, "inventory_manage": false, "inventory_purchase": false, "inventory_issue": false}'::jsonb ||
  '{"settings_view": false, "settings_manage": false, "sms_gateway": false, "payment_gateway": false, "automation_manage": false}'::jsonb
)
WHERE name = 'Bill Collector';