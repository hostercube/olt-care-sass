-- ================================================================
-- OLT CARE SAAS - COMPLETE DATABASE SCHEMA (FINAL VERSION)
-- ================================================================
-- 
-- Project: OLT Care SaaS (oltcaresass)
-- Generated: 2026-01-02
-- Supabase Project URL: https://koodidvsmjfwjcgnmqox.supabase.co
-- 
-- Copy and paste this entire file into your Supabase SQL Editor.
-- 
-- TABLES INCLUDED (27 total):
-- Core Tables:
-- 1. profiles - User profiles linked to auth.users
-- 2. user_roles - Role-based access control (admin/operator/viewer/super_admin)
-- 3. olts - OLT devices with MikroTik integration
-- 4. onus - ONU devices with full diagnostics
-- 5. alerts - System alerts and notifications
-- 6. power_readings - Historical RX/TX power data
-- 7. onu_status_history - Online/offline history tracking
-- 8. onu_edit_history - Audit log for manual changes
-- 9. device_health_history - CPU/RAM/uptime metrics
-- 10. olt_debug_logs - Raw CLI output for debugging
-- 11. system_settings - Application configuration
--
-- Multi-Tenancy Tables:
-- 12. tenants - ISP tenant organizations
-- 13. tenant_users - User to tenant mapping
--
-- Billing Tables:
-- 14. packages - Subscription packages
-- 15. subscriptions - Tenant subscriptions
-- 16. payments - Payment records
-- 17. invoices - Invoice records
-- 18. payment_gateway_settings - Payment gateway configuration
--
-- Notification Tables:
-- 19. notification_preferences - Tenant notification settings
-- 20. notification_queue - Queued notifications
-- 21. sms_gateway_settings - SMS provider configuration
-- 22. sms_logs - SMS delivery logs
-- 23. email_gateway_settings - Email/SMTP configuration
-- 24. email_logs - Email delivery logs
--
-- Activity Tables:
-- 25. activity_logs - User activity audit trail
--
-- INCLUDES: Enums, Functions, Triggers, RLS Policies, Indexes, Realtime
-- ================================================================


-- =====================================================
-- SECTION 1: DROP EXISTING (Clean Installation)
-- =====================================================
-- Uncomment these lines ONLY if you want a fresh start

-- DROP TABLE IF EXISTS public.email_logs CASCADE;
-- DROP TABLE IF EXISTS public.email_gateway_settings CASCADE;
-- DROP TABLE IF EXISTS public.sms_logs CASCADE;
-- DROP TABLE IF EXISTS public.sms_gateway_settings CASCADE;
-- DROP TABLE IF EXISTS public.notification_queue CASCADE;
-- DROP TABLE IF EXISTS public.notification_preferences CASCADE;
-- DROP TABLE IF EXISTS public.activity_logs CASCADE;
-- DROP TABLE IF EXISTS public.invoices CASCADE;
-- DROP TABLE IF EXISTS public.payments CASCADE;
-- DROP TABLE IF EXISTS public.subscriptions CASCADE;
-- DROP TABLE IF EXISTS public.payment_gateway_settings CASCADE;
-- DROP TABLE IF EXISTS public.packages CASCADE;
-- DROP TABLE IF EXISTS public.tenant_users CASCADE;
-- DROP TABLE IF EXISTS public.tenants CASCADE;
-- DROP TABLE IF EXISTS public.power_readings CASCADE;
-- DROP TABLE IF EXISTS public.onu_status_history CASCADE;
-- DROP TABLE IF EXISTS public.onu_edit_history CASCADE;
-- DROP TABLE IF EXISTS public.olt_debug_logs CASCADE;
-- DROP TABLE IF EXISTS public.device_health_history CASCADE;
-- DROP TABLE IF EXISTS public.alerts CASCADE;
-- DROP TABLE IF EXISTS public.onus CASCADE;
-- DROP TABLE IF EXISTS public.olts CASCADE;
-- DROP TABLE IF EXISTS public.system_settings CASCADE;
-- DROP TABLE IF EXISTS public.user_roles CASCADE;
-- DROP TABLE IF EXISTS public.profiles CASCADE;
-- DROP TYPE IF EXISTS public.app_role CASCADE;
-- DROP TYPE IF EXISTS public.connection_status CASCADE;
-- DROP TYPE IF EXISTS public.olt_brand CASCADE;
-- DROP TYPE IF EXISTS public.olt_mode CASCADE;
-- DROP TYPE IF EXISTS public.alert_severity CASCADE;
-- DROP TYPE IF EXISTS public.alert_type CASCADE;
-- DROP TYPE IF EXISTS public.tenant_status CASCADE;
-- DROP TYPE IF EXISTS public.subscription_status CASCADE;
-- DROP TYPE IF EXISTS public.billing_cycle CASCADE;
-- DROP TYPE IF EXISTS public.payment_status CASCADE;
-- DROP TYPE IF EXISTS public.payment_method CASCADE;


-- =====================================================
-- SECTION 2: ENUM TYPES
-- =====================================================

-- App Role Enum (admin, operator, viewer, super_admin)
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'app_role') THEN
    CREATE TYPE public.app_role AS ENUM ('admin', 'operator', 'viewer', 'super_admin');
  END IF;
END $$;

-- Connection Status Enum
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'connection_status') THEN
    CREATE TYPE public.connection_status AS ENUM ('online', 'offline', 'warning', 'unknown');
  END IF;
END $$;

-- OLT Brand Enum (includes Chinese brands: VSOL, DBC, CDATA, ECOM)
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'olt_brand') THEN
    CREATE TYPE public.olt_brand AS ENUM ('ZTE', 'Huawei', 'Fiberhome', 'Nokia', 'BDCOM', 'VSOL', 'DBC', 'CDATA', 'ECOM', 'Other');
  END IF;
END $$;

-- OLT Mode Enum (EPON or GPON)
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'olt_mode') THEN
    CREATE TYPE public.olt_mode AS ENUM ('EPON', 'GPON');
  END IF;
END $$;

-- Alert Severity Enum
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'alert_severity') THEN
    CREATE TYPE public.alert_severity AS ENUM ('critical', 'warning', 'info');
  END IF;
END $$;

-- Alert Type Enum
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'alert_type') THEN
    CREATE TYPE public.alert_type AS ENUM ('onu_offline', 'power_drop', 'olt_unreachable', 'high_latency');
  END IF;
END $$;

-- Tenant Status Enum
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'tenant_status') THEN
    CREATE TYPE public.tenant_status AS ENUM ('active', 'suspended', 'trial', 'cancelled');
  END IF;
END $$;

-- Subscription Status Enum
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'subscription_status') THEN
    CREATE TYPE public.subscription_status AS ENUM ('active', 'expired', 'cancelled', 'pending');
  END IF;
END $$;

-- Billing Cycle Enum
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'billing_cycle') THEN
    CREATE TYPE public.billing_cycle AS ENUM ('monthly', 'yearly');
  END IF;
END $$;

-- Payment Status Enum
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'payment_status') THEN
    CREATE TYPE public.payment_status AS ENUM ('pending', 'completed', 'failed', 'refunded');
  END IF;
END $$;

-- Payment Method Enum
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'payment_method') THEN
    CREATE TYPE public.payment_method AS ENUM ('sslcommerz', 'bkash', 'rocket', 'nagad', 'manual');
  END IF;
END $$;


-- =====================================================
-- SECTION 3: PROFILES TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid NOT NULL PRIMARY KEY,
  email text,
  full_name text,
  avatar_url text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;


-- =====================================================
-- SECTION 4: USER_ROLES TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS public.user_roles (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  role public.app_role NOT NULL DEFAULT 'operator'::public.app_role,
  UNIQUE(user_id)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;


-- =====================================================
-- SECTION 5: TENANTS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS public.tenants (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  company_name text,
  email text NOT NULL,
  phone text,
  address text,
  logo_url text,
  custom_domain text,
  subdomain text,
  owner_user_id uuid,
  status public.tenant_status NOT NULL DEFAULT 'trial'::public.tenant_status,
  max_olts integer DEFAULT 1,
  max_users integer DEFAULT 1,
  features jsonb DEFAULT '{}'::jsonb,
  trial_ends_at timestamp with time zone,
  suspended_at timestamp with time zone,
  suspended_reason text,
  notes text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;


-- =====================================================
-- SECTION 6: TENANT_USERS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS public.tenant_users (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  role public.app_role NOT NULL DEFAULT 'operator'::public.app_role,
  is_owner boolean DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(tenant_id, user_id)
);

ALTER TABLE public.tenant_users ENABLE ROW LEVEL SECURITY;


-- =====================================================
-- SECTION 7: OLTS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS public.olts (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id uuid REFERENCES public.tenants(id) ON DELETE SET NULL,
  name text NOT NULL,
  brand public.olt_brand NOT NULL,
  olt_mode public.olt_mode DEFAULT 'GPON'::public.olt_mode,
  ip_address text NOT NULL,
  port integer NOT NULL DEFAULT 22,
  username text NOT NULL,
  password_encrypted text NOT NULL,
  status public.connection_status NOT NULL DEFAULT 'unknown'::public.connection_status,
  total_ports integer NOT NULL DEFAULT 8,
  active_ports integer NOT NULL DEFAULT 0,
  last_polled timestamp with time zone,
  created_by uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  mikrotik_ip text,
  mikrotik_port integer DEFAULT 8728,
  mikrotik_username text,
  mikrotik_password_encrypted text
);

ALTER TABLE public.olts ENABLE ROW LEVEL SECURITY;


-- =====================================================
-- SECTION 8: ONUS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS public.onus (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  olt_id uuid NOT NULL REFERENCES public.olts(id) ON DELETE CASCADE,
  name text NOT NULL,
  onu_index integer NOT NULL,
  pon_port text NOT NULL,
  serial_number text,
  mac_address text,
  vendor_id text,
  model_id text,
  hardware_version text,
  software_version text,
  status public.connection_status NOT NULL DEFAULT 'unknown'::public.connection_status,
  rx_power numeric,
  tx_power numeric,
  temperature numeric,
  distance numeric,
  alive_time text,
  offline_reason text,
  pppoe_username text,
  router_name text,
  router_mac text,
  last_online timestamp with time zone,
  last_offline timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(olt_id, pon_port, onu_index)
);

ALTER TABLE public.onus ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_onus_olt_id ON public.onus(olt_id);
CREATE INDEX IF NOT EXISTS idx_onus_status ON public.onus(status);
CREATE INDEX IF NOT EXISTS idx_onus_pppoe_username ON public.onus(pppoe_username);
CREATE INDEX IF NOT EXISTS idx_onus_router_mac ON public.onus(router_mac);


-- =====================================================
-- SECTION 9: ALERTS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS public.alerts (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id uuid REFERENCES public.tenants(id) ON DELETE SET NULL,
  title text NOT NULL,
  message text NOT NULL,
  severity public.alert_severity NOT NULL,
  type public.alert_type NOT NULL,
  device_id uuid,
  device_name text,
  is_read boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.alerts ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_alerts_is_read ON public.alerts(is_read);
CREATE INDEX IF NOT EXISTS idx_alerts_created_at ON public.alerts(created_at DESC);


-- =====================================================
-- SECTION 10: POWER_READINGS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS public.power_readings (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  onu_id uuid NOT NULL REFERENCES public.onus(id) ON DELETE CASCADE,
  rx_power numeric NOT NULL,
  tx_power numeric NOT NULL,
  recorded_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.power_readings ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_power_readings_onu_id ON public.power_readings(onu_id);
CREATE INDEX IF NOT EXISTS idx_power_readings_recorded_at ON public.power_readings(recorded_at DESC);


-- =====================================================
-- SECTION 11: ONU_STATUS_HISTORY TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS public.onu_status_history (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  onu_id uuid NOT NULL REFERENCES public.onus(id) ON DELETE CASCADE,
  status text NOT NULL,
  changed_at timestamp with time zone NOT NULL DEFAULT now(),
  duration_seconds integer DEFAULT 0
);

ALTER TABLE public.onu_status_history ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_onu_status_history_onu_id ON public.onu_status_history(onu_id);
CREATE INDEX IF NOT EXISTS idx_onu_status_history_changed_at ON public.onu_status_history(changed_at DESC);


-- =====================================================
-- SECTION 12: ONU_EDIT_HISTORY TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS public.onu_edit_history (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  onu_id uuid NOT NULL REFERENCES public.onus(id) ON DELETE CASCADE,
  field_name text NOT NULL,
  old_value text,
  new_value text,
  edited_by uuid,
  edited_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.onu_edit_history ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_onu_edit_history_onu_id ON public.onu_edit_history(onu_id);


-- =====================================================
-- SECTION 13: DEVICE_HEALTH_HISTORY TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS public.device_health_history (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  device_id uuid NOT NULL,
  device_type text NOT NULL,
  device_name text NOT NULL,
  cpu_percent numeric,
  memory_percent numeric,
  total_memory_bytes bigint,
  free_memory_bytes bigint,
  uptime_seconds bigint,
  recorded_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.device_health_history ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_device_health_history_device_id ON public.device_health_history(device_id);
CREATE INDEX IF NOT EXISTS idx_device_health_history_recorded_at ON public.device_health_history(recorded_at DESC);


-- =====================================================
-- SECTION 14: OLT_DEBUG_LOGS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS public.olt_debug_logs (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  olt_id uuid REFERENCES public.olts(id) ON DELETE CASCADE,
  olt_name text NOT NULL,
  connection_method text,
  commands_sent text[],
  raw_output text,
  parsed_count integer DEFAULT 0,
  duration_ms integer,
  error_message text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.olt_debug_logs ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_olt_debug_logs_olt_id ON public.olt_debug_logs(olt_id);
CREATE INDEX IF NOT EXISTS idx_olt_debug_logs_created_at ON public.olt_debug_logs(created_at DESC);


-- =====================================================
-- SECTION 15: SYSTEM_SETTINGS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS public.system_settings (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  key text NOT NULL UNIQUE,
  value jsonb NOT NULL,
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;


-- =====================================================
-- SECTION 16: PACKAGES TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS public.packages (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  description text,
  price_monthly numeric NOT NULL DEFAULT 0,
  price_yearly numeric NOT NULL DEFAULT 0,
  max_olts integer NOT NULL DEFAULT 1,
  max_users integer NOT NULL DEFAULT 1,
  max_onus integer,
  features jsonb DEFAULT '{"api_access": false, "sms_alerts": false, "white_label": false, "email_alerts": false, "custom_domain": false}'::jsonb,
  is_active boolean DEFAULT true,
  sort_order integer DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.packages ENABLE ROW LEVEL SECURITY;


-- =====================================================
-- SECTION 17: SUBSCRIPTIONS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS public.subscriptions (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  package_id uuid NOT NULL REFERENCES public.packages(id) ON DELETE RESTRICT,
  status public.subscription_status NOT NULL DEFAULT 'pending'::public.subscription_status,
  billing_cycle public.billing_cycle NOT NULL DEFAULT 'monthly'::public.billing_cycle,
  amount numeric NOT NULL,
  starts_at timestamp with time zone NOT NULL DEFAULT now(),
  ends_at timestamp with time zone NOT NULL,
  auto_renew boolean DEFAULT true,
  cancelled_at timestamp with time zone,
  cancelled_reason text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;


-- =====================================================
-- SECTION 18: PAYMENTS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS public.payments (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  subscription_id uuid REFERENCES public.subscriptions(id) ON DELETE SET NULL,
  amount numeric NOT NULL,
  currency text DEFAULT 'BDT',
  payment_method public.payment_method NOT NULL,
  status public.payment_status NOT NULL DEFAULT 'pending'::public.payment_status,
  transaction_id text,
  invoice_number text,
  description text,
  notes text,
  gateway_response jsonb,
  paid_at timestamp with time zone,
  verified_by uuid,
  verified_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;


-- =====================================================
-- SECTION 19: INVOICES TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS public.invoices (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  subscription_id uuid REFERENCES public.subscriptions(id) ON DELETE SET NULL,
  payment_id uuid REFERENCES public.payments(id) ON DELETE SET NULL,
  invoice_number text NOT NULL,
  amount numeric NOT NULL,
  tax_amount numeric DEFAULT 0,
  total_amount numeric NOT NULL,
  status text NOT NULL DEFAULT 'unpaid',
  due_date timestamp with time zone NOT NULL,
  paid_at timestamp with time zone,
  line_items jsonb DEFAULT '[]'::jsonb,
  notes text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;


-- =====================================================
-- SECTION 20: PAYMENT_GATEWAY_SETTINGS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS public.payment_gateway_settings (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  gateway public.payment_method NOT NULL,
  display_name text NOT NULL,
  is_enabled boolean DEFAULT false,
  sandbox_mode boolean DEFAULT true,
  config jsonb DEFAULT '{}'::jsonb,
  instructions text,
  sort_order integer DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.payment_gateway_settings ENABLE ROW LEVEL SECURITY;


-- =====================================================
-- SECTION 21: NOTIFICATION_PREFERENCES TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS public.notification_preferences (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE UNIQUE,
  email_enabled boolean NOT NULL DEFAULT true,
  sms_enabled boolean NOT NULL DEFAULT false,
  email_address text,
  phone_number text,
  alert_notifications boolean NOT NULL DEFAULT true,
  subscription_reminders boolean NOT NULL DEFAULT true,
  reminder_days_before integer NOT NULL DEFAULT 7,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.notification_preferences ENABLE ROW LEVEL SECURITY;


-- =====================================================
-- SECTION 22: NOTIFICATION_QUEUE TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS public.notification_queue (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id uuid REFERENCES public.tenants(id) ON DELETE SET NULL,
  notification_type text NOT NULL,
  channel text NOT NULL,
  recipient text NOT NULL,
  subject text,
  message text NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  error_message text,
  scheduled_at timestamp with time zone NOT NULL DEFAULT now(),
  sent_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.notification_queue ENABLE ROW LEVEL SECURITY;


-- =====================================================
-- SECTION 23: SMS_GATEWAY_SETTINGS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS public.sms_gateway_settings (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  provider text NOT NULL DEFAULT 'smsnoc',
  api_key text,
  api_url text,
  sender_id text,
  is_enabled boolean DEFAULT false,
  config jsonb DEFAULT '{}'::jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.sms_gateway_settings ENABLE ROW LEVEL SECURITY;


-- =====================================================
-- SECTION 24: SMS_LOGS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS public.sms_logs (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id uuid REFERENCES public.tenants(id) ON DELETE SET NULL,
  phone_number text NOT NULL,
  message text NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  error_message text,
  provider_response jsonb,
  sent_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.sms_logs ENABLE ROW LEVEL SECURITY;


-- =====================================================
-- SECTION 25: EMAIL_GATEWAY_SETTINGS TABLE
-- =====================================================

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

ALTER TABLE public.email_gateway_settings ENABLE ROW LEVEL SECURITY;


-- =====================================================
-- SECTION 26: EMAIL_LOGS TABLE
-- =====================================================

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

ALTER TABLE public.email_logs ENABLE ROW LEVEL SECURITY;


-- =====================================================
-- SECTION 27: ACTIVITY_LOGS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS public.activity_logs (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id uuid REFERENCES public.tenants(id) ON DELETE SET NULL,
  user_id uuid,
  action text NOT NULL,
  entity_type text,
  entity_id text,
  details jsonb DEFAULT '{}'::jsonb,
  ip_address text,
  user_agent text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;


-- =====================================================
-- SECTION 28: DATABASE FUNCTIONS
-- =====================================================

-- Function to check if user is authenticated
CREATE OR REPLACE FUNCTION public.is_authenticated()
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT auth.uid() IS NOT NULL
$$;

-- Function to check user role (prevents infinite recursion in RLS)
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- Function to check if user is super admin
CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid()
    AND role = 'super_admin'
  )
$$;

-- Function to get user's tenant ID
CREATE OR REPLACE FUNCTION public.get_user_tenant_id()
RETURNS uuid
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT tenant_id FROM public.tenant_users
  WHERE user_id = auth.uid()
  LIMIT 1
$$;

-- Function to check if tenant is active
CREATE OR REPLACE FUNCTION public.is_tenant_active(_tenant_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.tenants
    WHERE id = _tenant_id
    AND status = 'active'
  )
$$;

-- Function to handle new user creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', 'User')
  )
  ON CONFLICT (id) DO NOTHING;
  
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'operator')
  ON CONFLICT DO NOTHING;
  
  RETURN NEW;
END;
$$;

-- Function to auto-update updated_at column
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Function to queue subscription reminders
CREATE OR REPLACE FUNCTION public.queue_subscription_reminders()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _subscription RECORD;
  _prefs RECORD;
  _days_until_expiry INTEGER;
  _message TEXT;
BEGIN
  FOR _subscription IN
    SELECT 
      s.id,
      s.tenant_id,
      s.ends_at,
      s.amount,
      s.billing_cycle,
      t.name as tenant_name,
      t.email as tenant_email,
      t.phone as tenant_phone,
      p.name as package_name
    FROM subscriptions s
    JOIN tenants t ON s.tenant_id = t.id
    JOIN packages p ON s.package_id = p.id
    WHERE s.status = 'active'
      AND s.ends_at > now()
      AND s.ends_at <= now() + INTERVAL '30 days'
  LOOP
    SELECT * INTO _prefs 
    FROM notification_preferences 
    WHERE tenant_id = _subscription.tenant_id;
    
    _days_until_expiry := EXTRACT(DAY FROM (_subscription.ends_at - now()))::INTEGER;
    
    IF _prefs IS NULL OR _days_until_expiry <= COALESCE(_prefs.reminder_days_before, 7) THEN
      _message := format(
        'Your %s subscription expires in %s days on %s. Amount due: ৳%s. Please renew to continue service.',
        _subscription.package_name,
        _days_until_expiry,
        to_char(_subscription.ends_at, 'Mon DD, YYYY'),
        _subscription.amount
      );
      
      IF _prefs IS NULL OR (_prefs.email_enabled AND _prefs.subscription_reminders) THEN
        INSERT INTO notification_queue (
          tenant_id,
          notification_type,
          channel,
          recipient,
          subject,
          message,
          status,
          scheduled_at
        ) 
        SELECT 
          _subscription.tenant_id,
          'subscription_reminder',
          'email',
          COALESCE(_prefs.email_address, _subscription.tenant_email),
          'Subscription Renewal Reminder - ' || _subscription.package_name,
          _message,
          'pending',
          now()
        WHERE NOT EXISTS (
          SELECT 1 FROM notification_queue 
          WHERE tenant_id = _subscription.tenant_id
            AND notification_type = 'subscription_reminder'
            AND channel = 'email'
            AND created_at > now() - INTERVAL '1 day'
        );
      END IF;
      
      IF _prefs IS NOT NULL AND _prefs.sms_enabled AND _prefs.subscription_reminders AND _prefs.phone_number IS NOT NULL THEN
        INSERT INTO notification_queue (
          tenant_id,
          notification_type,
          channel,
          recipient,
          message,
          status,
          scheduled_at
        )
        SELECT 
          _subscription.tenant_id,
          'subscription_reminder',
          'sms',
          _prefs.phone_number,
          _message,
          'pending',
          now()
        WHERE NOT EXISTS (
          SELECT 1 FROM notification_queue 
          WHERE tenant_id = _subscription.tenant_id
            AND notification_type = 'subscription_reminder'
            AND channel = 'sms'
            AND created_at > now() - INTERVAL '1 day'
        );
      END IF;
    END IF;
  END LOOP;
END;
$$;


-- =====================================================
-- SECTION 29: TRIGGERS
-- =====================================================

-- Trigger for new user signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Triggers for updated_at column
DROP TRIGGER IF EXISTS update_profiles_updated_at ON public.profiles;
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_olts_updated_at ON public.olts;
CREATE TRIGGER update_olts_updated_at
  BEFORE UPDATE ON public.olts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_onus_updated_at ON public.onus;
CREATE TRIGGER update_onus_updated_at
  BEFORE UPDATE ON public.onus
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_system_settings_updated_at ON public.system_settings;
CREATE TRIGGER update_system_settings_updated_at
  BEFORE UPDATE ON public.system_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_tenants_updated_at ON public.tenants;
CREATE TRIGGER update_tenants_updated_at
  BEFORE UPDATE ON public.tenants
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_subscriptions_updated_at ON public.subscriptions;
CREATE TRIGGER update_subscriptions_updated_at
  BEFORE UPDATE ON public.subscriptions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_payments_updated_at ON public.payments;
CREATE TRIGGER update_payments_updated_at
  BEFORE UPDATE ON public.payments
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_invoices_updated_at ON public.invoices;
CREATE TRIGGER update_invoices_updated_at
  BEFORE UPDATE ON public.invoices
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_notification_preferences_updated_at ON public.notification_preferences;
CREATE TRIGGER update_notification_preferences_updated_at
  BEFORE UPDATE ON public.notification_preferences
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_sms_gateway_settings_updated_at ON public.sms_gateway_settings;
CREATE TRIGGER update_sms_gateway_settings_updated_at
  BEFORE UPDATE ON public.sms_gateway_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_email_gateway_settings_updated_at ON public.email_gateway_settings;
CREATE TRIGGER update_email_gateway_settings_updated_at
  BEFORE UPDATE ON public.email_gateway_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


-- =====================================================
-- SECTION 30: RLS POLICIES - PROFILES
-- =====================================================

DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
CREATE POLICY "Users can view own profile" ON public.profiles
  FOR SELECT USING (id = auth.uid());

DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
CREATE POLICY "Users can insert own profile" ON public.profiles
  FOR INSERT WITH CHECK (id = auth.uid());

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE USING (id = auth.uid());

DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
CREATE POLICY "Admins can view all profiles" ON public.profiles
  FOR SELECT USING (has_role(auth.uid(), 'admin'::public.app_role));

DROP POLICY IF EXISTS "Admins can update all profiles" ON public.profiles;
CREATE POLICY "Admins can update all profiles" ON public.profiles
  FOR UPDATE USING (has_role(auth.uid(), 'admin'::public.app_role));


-- =====================================================
-- SECTION 31: RLS POLICIES - USER_ROLES
-- =====================================================

DROP POLICY IF EXISTS "Users can view own roles" ON public.user_roles;
CREATE POLICY "Users can view own roles" ON public.user_roles
  FOR SELECT USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Admins can view all roles" ON public.user_roles;
CREATE POLICY "Admins can view all roles" ON public.user_roles
  FOR SELECT USING (has_role(auth.uid(), 'admin'::public.app_role));

DROP POLICY IF EXISTS "Admins can manage roles" ON public.user_roles;
CREATE POLICY "Admins can manage roles" ON public.user_roles
  FOR ALL USING (has_role(auth.uid(), 'admin'::public.app_role));


-- =====================================================
-- SECTION 32: RLS POLICIES - TENANTS
-- =====================================================

DROP POLICY IF EXISTS "Super admins can manage all tenants" ON public.tenants;
CREATE POLICY "Super admins can manage all tenants" ON public.tenants
  FOR ALL USING (is_super_admin());

DROP POLICY IF EXISTS "Tenant owners can view own tenant" ON public.tenants;
CREATE POLICY "Tenant owners can view own tenant" ON public.tenants
  FOR SELECT USING (owner_user_id = auth.uid());

DROP POLICY IF EXISTS "Tenant users can view their tenant" ON public.tenants;
CREATE POLICY "Tenant users can view their tenant" ON public.tenants
  FOR SELECT USING (id IN (SELECT tenant_id FROM tenant_users WHERE user_id = auth.uid()));


-- =====================================================
-- SECTION 33: RLS POLICIES - TENANT_USERS
-- =====================================================

DROP POLICY IF EXISTS "Super admins can manage all tenant users" ON public.tenant_users;
CREATE POLICY "Super admins can manage all tenant users" ON public.tenant_users
  FOR ALL USING (is_super_admin());

DROP POLICY IF EXISTS "Tenant admins can manage own tenant users" ON public.tenant_users;
CREATE POLICY "Tenant admins can manage own tenant users" ON public.tenant_users
  FOR ALL USING (tenant_id = get_user_tenant_id() AND has_role(auth.uid(), 'admin'::public.app_role));

DROP POLICY IF EXISTS "Users can view own tenant membership" ON public.tenant_users;
CREATE POLICY "Users can view own tenant membership" ON public.tenant_users
  FOR SELECT USING (user_id = auth.uid());


-- =====================================================
-- SECTION 34: RLS POLICIES - OLTS
-- =====================================================

DROP POLICY IF EXISTS "Authenticated users can view OLTs" ON public.olts;
CREATE POLICY "Authenticated users can view OLTs" ON public.olts
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Operators and admins can insert OLTs" ON public.olts;
CREATE POLICY "Operators and admins can insert OLTs" ON public.olts
  FOR INSERT WITH CHECK (has_role(auth.uid(), 'admin'::public.app_role) OR has_role(auth.uid(), 'operator'::public.app_role));

DROP POLICY IF EXISTS "Operators and admins can update OLTs" ON public.olts;
CREATE POLICY "Operators and admins can update OLTs" ON public.olts
  FOR UPDATE USING (has_role(auth.uid(), 'admin'::public.app_role) OR has_role(auth.uid(), 'operator'::public.app_role));

DROP POLICY IF EXISTS "Admins can delete OLTs" ON public.olts;
CREATE POLICY "Admins can delete OLTs" ON public.olts
  FOR DELETE USING (has_role(auth.uid(), 'admin'::public.app_role));


-- =====================================================
-- SECTION 35: RLS POLICIES - ONUS
-- =====================================================

DROP POLICY IF EXISTS "Authenticated users can view ONUs" ON public.onus;
CREATE POLICY "Authenticated users can view ONUs" ON public.onus
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Operators and admins can manage ONUs" ON public.onus;
CREATE POLICY "Operators and admins can manage ONUs" ON public.onus
  FOR ALL USING (has_role(auth.uid(), 'admin'::public.app_role) OR has_role(auth.uid(), 'operator'::public.app_role));


-- =====================================================
-- SECTION 36: RLS POLICIES - ALERTS
-- =====================================================

DROP POLICY IF EXISTS "Authenticated users can view alerts" ON public.alerts;
CREATE POLICY "Authenticated users can view alerts" ON public.alerts
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "System can insert alerts" ON public.alerts;
CREATE POLICY "System can insert alerts" ON public.alerts
  FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Authenticated users can update alerts" ON public.alerts;
CREATE POLICY "Authenticated users can update alerts" ON public.alerts
  FOR UPDATE USING (true);

DROP POLICY IF EXISTS "Authenticated users can delete alerts" ON public.alerts;
CREATE POLICY "Authenticated users can delete alerts" ON public.alerts
  FOR DELETE USING (true);


-- =====================================================
-- SECTION 37: RLS POLICIES - POWER_READINGS
-- =====================================================

DROP POLICY IF EXISTS "Authenticated users can view power readings" ON public.power_readings;
CREATE POLICY "Authenticated users can view power readings" ON public.power_readings
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "System can insert power readings" ON public.power_readings;
CREATE POLICY "System can insert power readings" ON public.power_readings
  FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Operators and admins can delete power readings" ON public.power_readings;
CREATE POLICY "Operators and admins can delete power readings" ON public.power_readings
  FOR DELETE USING (has_role(auth.uid(), 'admin'::public.app_role) OR has_role(auth.uid(), 'operator'::public.app_role));


-- =====================================================
-- SECTION 38: RLS POLICIES - STATUS & EDIT HISTORY
-- =====================================================

DROP POLICY IF EXISTS "Authenticated users can view status history" ON public.onu_status_history;
CREATE POLICY "Authenticated users can view status history" ON public.onu_status_history
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "System can insert status history" ON public.onu_status_history;
CREATE POLICY "System can insert status history" ON public.onu_status_history
  FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Operators and admins can delete status history" ON public.onu_status_history;
CREATE POLICY "Operators and admins can delete status history" ON public.onu_status_history
  FOR DELETE USING (has_role(auth.uid(), 'admin'::public.app_role) OR has_role(auth.uid(), 'operator'::public.app_role));

DROP POLICY IF EXISTS "Authenticated users can view edit history" ON public.onu_edit_history;
CREATE POLICY "Authenticated users can view edit history" ON public.onu_edit_history
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Operators and admins can insert edit history" ON public.onu_edit_history;
CREATE POLICY "Operators and admins can insert edit history" ON public.onu_edit_history
  FOR INSERT WITH CHECK (has_role(auth.uid(), 'admin'::public.app_role) OR has_role(auth.uid(), 'operator'::public.app_role));


-- =====================================================
-- SECTION 39: RLS POLICIES - DEVICE HEALTH & DEBUG
-- =====================================================

DROP POLICY IF EXISTS "Authenticated users can view device health history" ON public.device_health_history;
CREATE POLICY "Authenticated users can view device health history" ON public.device_health_history
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "System can insert device health history" ON public.device_health_history;
CREATE POLICY "System can insert device health history" ON public.device_health_history
  FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Operators and admins can delete device health history" ON public.device_health_history;
CREATE POLICY "Operators and admins can delete device health history" ON public.device_health_history
  FOR DELETE USING (has_role(auth.uid(), 'admin'::public.app_role) OR has_role(auth.uid(), 'operator'::public.app_role));

DROP POLICY IF EXISTS "Authenticated users can view debug logs" ON public.olt_debug_logs;
CREATE POLICY "Authenticated users can view debug logs" ON public.olt_debug_logs
  FOR SELECT USING (true);


-- =====================================================
-- SECTION 40: RLS POLICIES - SYSTEM_SETTINGS
-- =====================================================

DROP POLICY IF EXISTS "Authenticated users can view settings" ON public.system_settings;
CREATE POLICY "Authenticated users can view settings" ON public.system_settings
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Admins can manage settings" ON public.system_settings;
CREATE POLICY "Admins can manage settings" ON public.system_settings
  FOR ALL USING (has_role(auth.uid(), 'admin'::public.app_role));


-- =====================================================
-- SECTION 41: RLS POLICIES - PACKAGES
-- =====================================================

DROP POLICY IF EXISTS "Anyone can view active packages" ON public.packages;
CREATE POLICY "Anyone can view active packages" ON public.packages
  FOR SELECT USING (is_active = true);

DROP POLICY IF EXISTS "Super admins can manage packages" ON public.packages;
CREATE POLICY "Super admins can manage packages" ON public.packages
  FOR ALL USING (is_super_admin());


-- =====================================================
-- SECTION 42: RLS POLICIES - SUBSCRIPTIONS
-- =====================================================

DROP POLICY IF EXISTS "Super admins can manage all subscriptions" ON public.subscriptions;
CREATE POLICY "Super admins can manage all subscriptions" ON public.subscriptions
  FOR ALL USING (is_super_admin());

DROP POLICY IF EXISTS "Tenants can view own subscriptions" ON public.subscriptions;
CREATE POLICY "Tenants can view own subscriptions" ON public.subscriptions
  FOR SELECT USING (tenant_id = get_user_tenant_id());


-- =====================================================
-- SECTION 43: RLS POLICIES - PAYMENTS
-- =====================================================

DROP POLICY IF EXISTS "Super admins can manage all payments" ON public.payments;
CREATE POLICY "Super admins can manage all payments" ON public.payments
  FOR ALL USING (is_super_admin());

DROP POLICY IF EXISTS "Tenants can view own payments" ON public.payments;
CREATE POLICY "Tenants can view own payments" ON public.payments
  FOR SELECT USING (tenant_id = get_user_tenant_id());

DROP POLICY IF EXISTS "Tenants can create payments" ON public.payments;
CREATE POLICY "Tenants can create payments" ON public.payments
  FOR INSERT WITH CHECK (tenant_id = get_user_tenant_id());


-- =====================================================
-- SECTION 44: RLS POLICIES - INVOICES
-- =====================================================

DROP POLICY IF EXISTS "Super admins can manage all invoices" ON public.invoices;
CREATE POLICY "Super admins can manage all invoices" ON public.invoices
  FOR ALL USING (is_super_admin());

DROP POLICY IF EXISTS "Tenants can view own invoices" ON public.invoices;
CREATE POLICY "Tenants can view own invoices" ON public.invoices
  FOR SELECT USING (tenant_id = get_user_tenant_id());


-- =====================================================
-- SECTION 45: RLS POLICIES - PAYMENT_GATEWAY_SETTINGS
-- =====================================================

DROP POLICY IF EXISTS "Super admins can manage payment gateways" ON public.payment_gateway_settings;
CREATE POLICY "Super admins can manage payment gateways" ON public.payment_gateway_settings
  FOR ALL USING (is_super_admin());

DROP POLICY IF EXISTS "Anyone can view enabled payment gateways" ON public.payment_gateway_settings;
CREATE POLICY "Anyone can view enabled payment gateways" ON public.payment_gateway_settings
  FOR SELECT USING (is_enabled = true);


-- =====================================================
-- SECTION 46: RLS POLICIES - NOTIFICATION_PREFERENCES
-- =====================================================

DROP POLICY IF EXISTS "Super admins can manage all preferences" ON public.notification_preferences;
CREATE POLICY "Super admins can manage all preferences" ON public.notification_preferences
  FOR ALL USING (is_super_admin());

DROP POLICY IF EXISTS "Tenants can manage own preferences" ON public.notification_preferences;
CREATE POLICY "Tenants can manage own preferences" ON public.notification_preferences
  FOR ALL USING (tenant_id = get_user_tenant_id());


-- =====================================================
-- SECTION 47: RLS POLICIES - NOTIFICATION_QUEUE
-- =====================================================

DROP POLICY IF EXISTS "Super admins can view all notifications" ON public.notification_queue;
CREATE POLICY "Super admins can view all notifications" ON public.notification_queue
  FOR ALL USING (is_super_admin());

DROP POLICY IF EXISTS "Tenants can view own notifications" ON public.notification_queue;
CREATE POLICY "Tenants can view own notifications" ON public.notification_queue
  FOR SELECT USING (tenant_id = get_user_tenant_id());


-- =====================================================
-- SECTION 48: RLS POLICIES - SMS_GATEWAY_SETTINGS
-- =====================================================

DROP POLICY IF EXISTS "Super admins can manage SMS gateway" ON public.sms_gateway_settings;
CREATE POLICY "Super admins can manage SMS gateway" ON public.sms_gateway_settings
  FOR ALL USING (is_super_admin());


-- =====================================================
-- SECTION 49: RLS POLICIES - SMS_LOGS
-- =====================================================

DROP POLICY IF EXISTS "Super admins can view all SMS logs" ON public.sms_logs;
CREATE POLICY "Super admins can view all SMS logs" ON public.sms_logs
  FOR ALL USING (is_super_admin());

DROP POLICY IF EXISTS "Tenants can view own SMS logs" ON public.sms_logs;
CREATE POLICY "Tenants can view own SMS logs" ON public.sms_logs
  FOR SELECT USING (tenant_id = get_user_tenant_id());


-- =====================================================
-- SECTION 50: RLS POLICIES - EMAIL_GATEWAY_SETTINGS
-- =====================================================

DROP POLICY IF EXISTS "Super admins can manage email gateway" ON public.email_gateway_settings;
CREATE POLICY "Super admins can manage email gateway" ON public.email_gateway_settings
  FOR ALL USING (is_super_admin());


-- =====================================================
-- SECTION 51: RLS POLICIES - EMAIL_LOGS
-- =====================================================

DROP POLICY IF EXISTS "Super admins can view all email logs" ON public.email_logs;
CREATE POLICY "Super admins can view all email logs" ON public.email_logs
  FOR ALL USING (is_super_admin());

DROP POLICY IF EXISTS "Tenants can view own email logs" ON public.email_logs;
CREATE POLICY "Tenants can view own email logs" ON public.email_logs
  FOR SELECT USING (tenant_id = get_user_tenant_id());


-- =====================================================
-- SECTION 52: RLS POLICIES - ACTIVITY_LOGS
-- =====================================================

DROP POLICY IF EXISTS "Super admins can view all activity" ON public.activity_logs;
CREATE POLICY "Super admins can view all activity" ON public.activity_logs
  FOR ALL USING (is_super_admin());

DROP POLICY IF EXISTS "Tenants can view own activity" ON public.activity_logs;
CREATE POLICY "Tenants can view own activity" ON public.activity_logs
  FOR SELECT USING (tenant_id = get_user_tenant_id());


-- =====================================================
-- SECTION 53: REALTIME SUBSCRIPTIONS
-- =====================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'olts'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.olts;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'onus'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.onus;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'alerts'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.alerts;
  END IF;
END $$;


-- =====================================================
-- SECTION 54: DEFAULT DATA
-- =====================================================

INSERT INTO public.system_settings (key, value) VALUES
  ('polling_interval', '60'::jsonb),
  ('alert_notifications', '{"email": false, "telegram": false, "whatsapp": false}'::jsonb),
  ('power_threshold', '{"warning": -25, "critical": -28}'::jsonb),
  ('allowUserRegistration', 'true'::jsonb)
ON CONFLICT (key) DO NOTHING;


-- ================================================================
-- SETUP COMPLETE!
-- ================================================================
--
-- Your database is now ready for OLT Care SaaS.
--
-- TABLES CREATED (25 total):
-- ✓ profiles
-- ✓ user_roles
-- ✓ tenants
-- ✓ tenant_users
-- ✓ olts (with MikroTik columns)
-- ✓ onus (with full diagnostics)
-- ✓ alerts
-- ✓ power_readings
-- ✓ onu_status_history
-- ✓ onu_edit_history
-- ✓ device_health_history
-- ✓ olt_debug_logs
-- ✓ system_settings
-- ✓ packages
-- ✓ subscriptions
-- ✓ payments
-- ✓ invoices
-- ✓ payment_gateway_settings
-- ✓ notification_preferences
-- ✓ notification_queue
-- ✓ sms_gateway_settings
-- ✓ sms_logs
-- ✓ email_gateway_settings
-- ✓ email_logs
-- ✓ activity_logs
--
-- ENUMS CREATED (11 total):
-- ✓ app_role (admin, operator, viewer, super_admin)
-- ✓ connection_status (online, offline, warning, unknown)
-- ✓ olt_brand (ZTE, Huawei, Fiberhome, Nokia, BDCOM, VSOL, DBC, CDATA, ECOM, Other)
-- ✓ olt_mode (EPON, GPON)
-- ✓ alert_severity (critical, warning, info)
-- ✓ alert_type (onu_offline, power_drop, olt_unreachable, high_latency)
-- ✓ tenant_status (active, suspended, trial, cancelled)
-- ✓ subscription_status (active, expired, cancelled, pending)
-- ✓ billing_cycle (monthly, yearly)
-- ✓ payment_status (pending, completed, failed, refunded)
-- ✓ payment_method (sslcommerz, bkash, rocket, nagad, manual)
--
-- FUNCTIONS CREATED (7 total):
-- ✓ is_authenticated()
-- ✓ has_role()
-- ✓ is_super_admin()
-- ✓ get_user_tenant_id()
-- ✓ is_tenant_active()
-- ✓ handle_new_user()
-- ✓ update_updated_at_column()
-- ✓ queue_subscription_reminders()
--
-- RLS POLICIES: Configured for all tables
-- REALTIME: Enabled for olts, onus, alerts
-- INDEXES: Optimized for common queries
--
-- NEXT STEPS:
-- 1. Create your first admin user via Supabase Auth
-- 2. Run this SQL to make them super_admin:
--    INSERT INTO public.user_roles (user_id, role)
--    SELECT id, 'super_admin' FROM auth.users WHERE email = 'your-email@example.com';
-- 3. Configure the polling server environment variables
-- 4. Start using OLT Care SaaS!
--
-- ================================================================
