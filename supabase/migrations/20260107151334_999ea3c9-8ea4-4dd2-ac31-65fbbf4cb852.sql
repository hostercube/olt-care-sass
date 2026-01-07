-- Insert default roles for existing tenants that don't have roles yet
INSERT INTO public.tenant_roles (tenant_id, name, description, permissions, is_system)
SELECT 
  t.id,
  role_def.name,
  role_def.description,
  role_def.permissions,
  true
FROM public.tenants t
CROSS JOIN (
  VALUES 
    ('Admin', 'Full system access with all permissions', '{
      "can_view_dashboard": true,
      "can_manage_customers": true,
      "can_manage_staff": true,
      "can_manage_resellers": true,
      "can_manage_billing": true,
      "can_manage_settings": true,
      "can_view_reports": true,
      "can_manage_roles": true
    }'::jsonb),
    ('Manager', 'Management access with limited settings', '{
      "can_view_dashboard": true,
      "can_manage_customers": true,
      "can_manage_staff": true,
      "can_manage_resellers": true,
      "can_manage_billing": true,
      "can_manage_settings": false,
      "can_view_reports": true,
      "can_manage_roles": false
    }'::jsonb),
    ('Staff', 'Basic staff access', '{
      "can_view_dashboard": true,
      "can_manage_customers": true,
      "can_manage_staff": false,
      "can_manage_resellers": false,
      "can_manage_billing": false,
      "can_manage_settings": false,
      "can_view_reports": false,
      "can_manage_roles": false
    }'::jsonb),
    ('Technician', 'Technical support access', '{
      "can_view_dashboard": true,
      "can_manage_customers": true,
      "can_manage_staff": false,
      "can_manage_resellers": false,
      "can_manage_billing": false,
      "can_manage_settings": false,
      "can_view_reports": false,
      "can_manage_roles": false
    }'::jsonb),
    ('Bill Collector', 'Payment collection access', '{
      "can_view_dashboard": true,
      "can_manage_customers": true,
      "can_manage_staff": false,
      "can_manage_resellers": false,
      "can_manage_billing": true,
      "can_manage_settings": false,
      "can_view_reports": false,
      "can_manage_roles": false
    }'::jsonb)
) AS role_def(name, description, permissions)
WHERE NOT EXISTS (
  SELECT 1 FROM public.tenant_roles tr WHERE tr.tenant_id = t.id AND tr.name = role_def.name
);