-- ================================================================
-- OLT MANAGER - COMPLETE DATABASE SCHEMA (FINAL VERSION)
-- ================================================================
-- 
-- Generated: 2026-01-02
-- 
-- This is the COMPLETE and FINAL database schema for OLT Manager.
-- Copy and paste this entire file into your Supabase SQL Editor.
-- 
-- TABLES INCLUDED:
-- 1. profiles - User profiles linked to auth.users
-- 2. user_roles - Role-based access control (admin/operator/viewer)
-- 3. olts - OLT devices with MikroTik integration
-- 4. onus - ONU devices with full diagnostics
-- 5. alerts - System alerts and notifications
-- 6. power_readings - Historical RX/TX power data
-- 7. onu_status_history - Online/offline history tracking
-- 8. onu_edit_history - Audit log for manual changes
-- 9. device_health_history - CPU/RAM/uptime metrics
-- 10. olt_debug_logs - Raw CLI output for debugging
-- 11. system_settings - Application configuration (SMTP, Telegram, etc.)
--
-- INCLUDES: Enums, Functions, Triggers, RLS Policies, Indexes, Realtime
-- ================================================================


-- =====================================================
-- SECTION 1: DROP EXISTING (Clean Installation)
-- =====================================================
-- Uncomment these lines ONLY if you want a fresh start

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


-- =====================================================
-- SECTION 2: ENUM TYPES
-- =====================================================

-- App Role Enum (admin, operator, viewer)
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'app_role') THEN
    CREATE TYPE public.app_role AS ENUM ('admin', 'operator', 'viewer');
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


-- =====================================================
-- SECTION 3: PROFILES TABLE
-- =====================================================
-- Stores user profile information linked to auth.users

CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid NOT NULL PRIMARY KEY,
  email text,
  full_name text,
  avatar_url text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;


-- =====================================================
-- SECTION 4: USER_ROLES TABLE
-- =====================================================
-- Maps users to roles (admin, operator, viewer)

CREATE TABLE IF NOT EXISTS public.user_roles (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  role public.app_role NOT NULL DEFAULT 'operator'::public.app_role,
  UNIQUE(user_id)
);

-- Enable RLS
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;


-- =====================================================
-- SECTION 5: OLTS TABLE (with MikroTik Integration)
-- =====================================================
-- Stores OLT device configuration

CREATE TABLE IF NOT EXISTS public.olts (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
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
  -- MikroTik Integration Columns
  mikrotik_ip text,
  mikrotik_port integer DEFAULT 8728,
  mikrotik_username text,
  mikrotik_password_encrypted text
);

-- Enable RLS
ALTER TABLE public.olts ENABLE ROW LEVEL SECURITY;


-- =====================================================
-- SECTION 6: ONUS TABLE (Full Diagnostics)
-- =====================================================
-- Stores ONU devices with complete diagnostics

CREATE TABLE IF NOT EXISTS public.onus (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  olt_id uuid NOT NULL REFERENCES public.olts(id) ON DELETE CASCADE,
  name text NOT NULL,
  onu_index integer NOT NULL,
  pon_port text NOT NULL,
  -- Hardware Identification
  serial_number text,
  mac_address text,
  vendor_id text,
  model_id text,
  hardware_version text,
  software_version text,
  -- Status and Power
  status public.connection_status NOT NULL DEFAULT 'unknown'::public.connection_status,
  rx_power numeric,
  tx_power numeric,
  -- Physical Diagnostics
  temperature numeric,
  distance numeric,
  alive_time text,
  offline_reason text,
  -- MikroTik Enrichment Data
  pppoe_username text,
  router_name text,
  router_mac text,
  -- Timestamps
  last_online timestamp with time zone,
  last_offline timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  -- Unique constraint for deduplication
  UNIQUE(olt_id, pon_port, onu_index)
);

-- Enable RLS
ALTER TABLE public.onus ENABLE ROW LEVEL SECURITY;

-- Index for faster queries
CREATE INDEX IF NOT EXISTS idx_onus_olt_id ON public.onus(olt_id);
CREATE INDEX IF NOT EXISTS idx_onus_status ON public.onus(status);
CREATE INDEX IF NOT EXISTS idx_onus_pppoe_username ON public.onus(pppoe_username);
CREATE INDEX IF NOT EXISTS idx_onus_router_mac ON public.onus(router_mac);


-- =====================================================
-- SECTION 7: ALERTS TABLE
-- =====================================================
-- Stores system alerts and notifications

CREATE TABLE IF NOT EXISTS public.alerts (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title text NOT NULL,
  message text NOT NULL,
  severity public.alert_severity NOT NULL,
  type public.alert_type NOT NULL,
  device_id uuid,
  device_name text,
  is_read boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.alerts ENABLE ROW LEVEL SECURITY;

-- Index for faster queries
CREATE INDEX IF NOT EXISTS idx_alerts_is_read ON public.alerts(is_read);
CREATE INDEX IF NOT EXISTS idx_alerts_created_at ON public.alerts(created_at DESC);


-- =====================================================
-- SECTION 8: POWER_READINGS TABLE
-- =====================================================
-- Stores historical RX/TX power data

CREATE TABLE IF NOT EXISTS public.power_readings (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  onu_id uuid NOT NULL REFERENCES public.onus(id) ON DELETE CASCADE,
  rx_power numeric NOT NULL,
  tx_power numeric NOT NULL,
  recorded_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.power_readings ENABLE ROW LEVEL SECURITY;

-- Index for faster queries
CREATE INDEX IF NOT EXISTS idx_power_readings_onu_id ON public.power_readings(onu_id);
CREATE INDEX IF NOT EXISTS idx_power_readings_recorded_at ON public.power_readings(recorded_at DESC);


-- =====================================================
-- SECTION 9: ONU_STATUS_HISTORY TABLE
-- =====================================================
-- Tracks online/offline status changes for uptime calculation

CREATE TABLE IF NOT EXISTS public.onu_status_history (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  onu_id uuid NOT NULL REFERENCES public.onus(id) ON DELETE CASCADE,
  status text NOT NULL,
  changed_at timestamp with time zone NOT NULL DEFAULT now(),
  duration_seconds integer DEFAULT 0
);

-- Enable RLS
ALTER TABLE public.onu_status_history ENABLE ROW LEVEL SECURITY;

-- Index for faster queries
CREATE INDEX IF NOT EXISTS idx_onu_status_history_onu_id ON public.onu_status_history(onu_id);
CREATE INDEX IF NOT EXISTS idx_onu_status_history_changed_at ON public.onu_status_history(changed_at DESC);


-- =====================================================
-- SECTION 10: ONU_EDIT_HISTORY TABLE
-- =====================================================
-- Audit log for manual ONU field changes

CREATE TABLE IF NOT EXISTS public.onu_edit_history (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  onu_id uuid NOT NULL REFERENCES public.onus(id) ON DELETE CASCADE,
  field_name text NOT NULL,
  old_value text,
  new_value text,
  edited_by uuid,
  edited_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.onu_edit_history ENABLE ROW LEVEL SECURITY;

-- Index for faster queries
CREATE INDEX IF NOT EXISTS idx_onu_edit_history_onu_id ON public.onu_edit_history(onu_id);


-- =====================================================
-- SECTION 11: DEVICE_HEALTH_HISTORY TABLE
-- =====================================================
-- Tracks CPU, RAM, uptime metrics for OLTs and MikroTik

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

-- Enable RLS
ALTER TABLE public.device_health_history ENABLE ROW LEVEL SECURITY;

-- Index for faster queries
CREATE INDEX IF NOT EXISTS idx_device_health_history_device_id ON public.device_health_history(device_id);
CREATE INDEX IF NOT EXISTS idx_device_health_history_recorded_at ON public.device_health_history(recorded_at DESC);


-- =====================================================
-- SECTION 12: OLT_DEBUG_LOGS TABLE
-- =====================================================
-- Stores raw CLI output for debugging polling sessions

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

-- Enable RLS
ALTER TABLE public.olt_debug_logs ENABLE ROW LEVEL SECURITY;

-- Index for faster queries
CREATE INDEX IF NOT EXISTS idx_olt_debug_logs_olt_id ON public.olt_debug_logs(olt_id);
CREATE INDEX IF NOT EXISTS idx_olt_debug_logs_created_at ON public.olt_debug_logs(created_at DESC);


-- =====================================================
-- SECTION 13: SYSTEM_SETTINGS TABLE
-- =====================================================
-- Stores application configuration (SMTP, Telegram, WhatsApp, polling modes)

CREATE TABLE IF NOT EXISTS public.system_settings (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  key text NOT NULL UNIQUE,
  value jsonb NOT NULL,
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;


-- =====================================================
-- SECTION 14: DATABASE FUNCTIONS
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

-- Function to handle new user creation (auto-create profile and assign role)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  -- Create profile for new user
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', 'User')
  )
  ON CONFLICT (id) DO NOTHING;
  
  -- Assign default 'operator' role to new users
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


-- =====================================================
-- SECTION 15: TRIGGERS
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


-- =====================================================
-- SECTION 16: RLS POLICIES - PROFILES
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
-- SECTION 17: RLS POLICIES - USER_ROLES
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
-- SECTION 18: RLS POLICIES - OLTS
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
-- SECTION 19: RLS POLICIES - ONUS
-- =====================================================

DROP POLICY IF EXISTS "Authenticated users can view ONUs" ON public.onus;
CREATE POLICY "Authenticated users can view ONUs" ON public.onus
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Operators and admins can manage ONUs" ON public.onus;
CREATE POLICY "Operators and admins can manage ONUs" ON public.onus
  FOR ALL USING (has_role(auth.uid(), 'admin'::public.app_role) OR has_role(auth.uid(), 'operator'::public.app_role));


-- =====================================================
-- SECTION 20: RLS POLICIES - ALERTS
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
-- SECTION 21: RLS POLICIES - POWER_READINGS
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
-- SECTION 22: RLS POLICIES - ONU_STATUS_HISTORY
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


-- =====================================================
-- SECTION 23: RLS POLICIES - ONU_EDIT_HISTORY
-- =====================================================

DROP POLICY IF EXISTS "Authenticated users can view edit history" ON public.onu_edit_history;
CREATE POLICY "Authenticated users can view edit history" ON public.onu_edit_history
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Operators and admins can insert edit history" ON public.onu_edit_history;
CREATE POLICY "Operators and admins can insert edit history" ON public.onu_edit_history
  FOR INSERT WITH CHECK (has_role(auth.uid(), 'admin'::public.app_role) OR has_role(auth.uid(), 'operator'::public.app_role));


-- =====================================================
-- SECTION 24: RLS POLICIES - DEVICE_HEALTH_HISTORY
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


-- =====================================================
-- SECTION 25: RLS POLICIES - OLT_DEBUG_LOGS
-- =====================================================

DROP POLICY IF EXISTS "Authenticated users can view debug logs" ON public.olt_debug_logs;
CREATE POLICY "Authenticated users can view debug logs" ON public.olt_debug_logs
  FOR SELECT USING (true);


-- =====================================================
-- SECTION 26: RLS POLICIES - SYSTEM_SETTINGS
-- =====================================================

DROP POLICY IF EXISTS "Authenticated users can view settings" ON public.system_settings;
CREATE POLICY "Authenticated users can view settings" ON public.system_settings
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Admins can manage settings" ON public.system_settings;
CREATE POLICY "Admins can manage settings" ON public.system_settings
  FOR ALL USING (has_role(auth.uid(), 'admin'::public.app_role));


-- =====================================================
-- SECTION 27: REALTIME SUBSCRIPTIONS
-- =====================================================

-- Enable realtime for live data updates
DO $$
BEGIN
  -- Add tables to realtime publication
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
-- SECTION 28: DEFAULT DATA (Optional)
-- =====================================================

-- Insert default system settings
INSERT INTO public.system_settings (key, value) VALUES
  ('polling_interval', '60'::jsonb),
  ('alert_notifications', '{"email": false, "telegram": false, "whatsapp": false}'::jsonb),
  ('power_threshold', '{"warning": -25, "critical": -28}'::jsonb)
ON CONFLICT (key) DO NOTHING;


-- ================================================================
-- SETUP COMPLETE!
-- ================================================================
--
-- Your database is now ready for OLT Manager.
--
-- TABLES CREATED (11 total):
-- ✓ profiles
-- ✓ user_roles
-- ✓ olts (with MikroTik columns)
-- ✓ onus (with full diagnostics: temperature, distance, router_mac, etc.)
-- ✓ alerts
-- ✓ power_readings
-- ✓ onu_status_history
-- ✓ onu_edit_history
-- ✓ device_health_history
-- ✓ olt_debug_logs
-- ✓ system_settings
--
-- ENUMS CREATED (6 total):
-- ✓ app_role (admin, operator, viewer)
-- ✓ connection_status (online, offline, warning, unknown)
-- ✓ olt_brand (ZTE, Huawei, Fiberhome, Nokia, BDCOM, VSOL, DBC, CDATA, ECOM, Other)
-- ✓ olt_mode (EPON, GPON)
-- ✓ alert_severity (critical, warning, info)
-- ✓ alert_type (onu_offline, power_drop, olt_unreachable, high_latency)
--
-- FUNCTIONS CREATED (4 total):
-- ✓ is_authenticated()
-- ✓ has_role()
-- ✓ handle_new_user()
-- ✓ update_updated_at_column()
--
-- TRIGGERS CREATED (5 total):
-- ✓ on_auth_user_created
-- ✓ update_profiles_updated_at
-- ✓ update_olts_updated_at
-- ✓ update_onus_updated_at
-- ✓ update_system_settings_updated_at
--
-- RLS POLICIES: Configured for all tables
-- REALTIME: Enabled for olts, onus, alerts
-- INDEXES: Optimized for common queries
--
-- NEXT STEPS:
-- 1. Create your first admin user via Supabase Auth
-- 2. Update the user_roles table to set role = 'admin' for that user
-- 3. Configure the polling server environment variables
-- 4. Start using OLT Manager!
--
-- ================================================================
