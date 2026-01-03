-- Add piprapay to payment_method enum
ALTER TYPE payment_method ADD VALUE IF NOT EXISTS 'piprapay';

-- Update initialize_tenant_gateways function to include piprapay
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
    (_tenant_id, 'piprapay', 'PipraPay', 9),
    (_tenant_id, 'manual', 'Manual Payment', 10)
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

-- Create or replace export_tenant_data function for tenant backup
CREATE OR REPLACE FUNCTION public.export_tenant_data(_tenant_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _result JSONB;
BEGIN
  SELECT jsonb_build_object(
    'tenant', (SELECT row_to_json(t) FROM tenants t WHERE id = _tenant_id),
    'customers', (SELECT COALESCE(jsonb_agg(row_to_json(c)), '[]'::jsonb) FROM customers c WHERE tenant_id = _tenant_id),
    'areas', (SELECT COALESCE(jsonb_agg(row_to_json(a)), '[]'::jsonb) FROM areas a WHERE tenant_id = _tenant_id),
    'resellers', (SELECT COALESCE(jsonb_agg(row_to_json(r)), '[]'::jsonb) FROM resellers r WHERE tenant_id = _tenant_id),
    'isp_packages', (SELECT COALESCE(jsonb_agg(row_to_json(p)), '[]'::jsonb) FROM isp_packages p WHERE tenant_id = _tenant_id),
    'mikrotik_routers', (SELECT COALESCE(jsonb_agg(row_to_json(m)), '[]'::jsonb) FROM mikrotik_routers m WHERE tenant_id = _tenant_id),
    'customer_bills', (SELECT COALESCE(jsonb_agg(row_to_json(cb)), '[]'::jsonb) FROM customer_bills cb WHERE tenant_id = _tenant_id),
    'customer_payments', (SELECT COALESCE(jsonb_agg(row_to_json(cp)), '[]'::jsonb) FROM customer_payments cp WHERE tenant_id = _tenant_id),
    'billing_rules', (SELECT COALESCE(jsonb_agg(row_to_json(br)), '[]'::jsonb) FROM billing_rules br WHERE tenant_id = _tenant_id),
    'exported_at', now()
  ) INTO _result;
  
  RETURN _result;
END;
$$;