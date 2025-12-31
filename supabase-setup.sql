-- ========================================
-- OLT Manager - Complete Supabase Setup
-- Run this in your Supabase SQL Editor
-- URL: https://supabase.com/dashboard/project/srofhdgdraihxgpmpdye/sql
-- ========================================

-- =====================
-- 1. ENUMS (Types)
-- =====================

DO $$ 
BEGIN
  -- Create app_role enum if not exists
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'app_role') THEN
    CREATE TYPE public.app_role AS ENUM ('admin', 'operator', 'viewer');
  END IF;
  
  -- Create connection_status enum if not exists
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'connection_status') THEN
    CREATE TYPE public.connection_status AS ENUM ('online', 'offline', 'warning', 'unknown');
  END IF;
  
  -- Create olt_brand enum if not exists
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'olt_brand') THEN
    CREATE TYPE public.olt_brand AS ENUM ('ZTE', 'Huawei', 'Fiberhome', 'Nokia', 'BDCOM', 'VSOL', 'Other', 'DBC', 'CDATA', 'ECOM');
  END IF;
  
  -- Create olt_mode enum if not exists
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'olt_mode') THEN
    CREATE TYPE public.olt_mode AS ENUM ('EPON', 'GPON');
  END IF;
  
  -- Create alert_severity enum if not exists
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'alert_severity') THEN
    CREATE TYPE public.alert_severity AS ENUM ('critical', 'warning', 'info');
  END IF;
  
  -- Create alert_type enum if not exists
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'alert_type') THEN
    CREATE TYPE public.alert_type AS ENUM ('onu_offline', 'power_drop', 'olt_unreachable', 'high_latency');
  END IF;
END $$;

-- =====================
-- 2. PROFILES TABLE
-- =====================

CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid NOT NULL PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
  email text,
  full_name text,
  avatar_url text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Profiles RLS Policies
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
CREATE POLICY "Users can view own profile" ON public.profiles
  FOR SELECT USING (id = auth.uid());

DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
CREATE POLICY "Users can insert own profile" ON public.profiles
  FOR INSERT WITH CHECK (id = auth.uid());

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE USING (id = auth.uid());

-- =====================
-- 3. USER_ROLES TABLE
-- =====================

CREATE TABLE IF NOT EXISTS public.user_roles (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  role app_role NOT NULL DEFAULT 'operator'::app_role,
  UNIQUE(user_id)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- =====================
-- 4. OLTS TABLE (with MikroTik columns)
-- =====================

CREATE TABLE IF NOT EXISTS public.olts (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  brand olt_brand NOT NULL,
  olt_mode olt_mode DEFAULT 'GPON'::olt_mode,
  ip_address text NOT NULL,
  port integer NOT NULL DEFAULT 22,
  username text NOT NULL,
  password_encrypted text NOT NULL,
  status connection_status NOT NULL DEFAULT 'unknown'::connection_status,
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

-- Add MikroTik columns if they don't exist (for existing tables)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'olts' AND column_name = 'mikrotik_ip') THEN
    ALTER TABLE public.olts ADD COLUMN mikrotik_ip text;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'olts' AND column_name = 'mikrotik_port') THEN
    ALTER TABLE public.olts ADD COLUMN mikrotik_port integer DEFAULT 8728;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'olts' AND column_name = 'mikrotik_username') THEN
    ALTER TABLE public.olts ADD COLUMN mikrotik_username text;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'olts' AND column_name = 'mikrotik_password_encrypted') THEN
    ALTER TABLE public.olts ADD COLUMN mikrotik_password_encrypted text;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'olts' AND column_name = 'olt_mode') THEN
    ALTER TABLE public.olts ADD COLUMN olt_mode olt_mode DEFAULT 'GPON'::olt_mode;
  END IF;
END $$;

ALTER TABLE public.olts ENABLE ROW LEVEL SECURITY;

-- =====================
-- 5. ONUS TABLE
-- =====================

CREATE TABLE IF NOT EXISTS public.onus (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  olt_id uuid NOT NULL REFERENCES public.olts ON DELETE CASCADE,
  name text NOT NULL,
  onu_index integer NOT NULL,
  pon_port text NOT NULL,
  serial_number text,
  mac_address text,
  status connection_status NOT NULL DEFAULT 'unknown'::connection_status,
  rx_power numeric,
  tx_power numeric,
  pppoe_username text,
  router_name text,
  last_online timestamp with time zone,
  last_offline timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(olt_id, pon_port, onu_index)
);

-- Add columns if they don't exist
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'onus' AND column_name = 'pppoe_username') THEN
    ALTER TABLE public.onus ADD COLUMN pppoe_username text;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'onus' AND column_name = 'router_name') THEN
    ALTER TABLE public.onus ADD COLUMN router_name text;
  END IF;
END $$;

ALTER TABLE public.onus ENABLE ROW LEVEL SECURITY;

-- =====================
-- 6. ALERTS TABLE
-- =====================

CREATE TABLE IF NOT EXISTS public.alerts (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title text NOT NULL,
  message text NOT NULL,
  severity alert_severity NOT NULL,
  type alert_type NOT NULL,
  device_id uuid,
  device_name text,
  is_read boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.alerts ENABLE ROW LEVEL SECURITY;

-- =====================
-- 7. POWER_READINGS TABLE
-- =====================

CREATE TABLE IF NOT EXISTS public.power_readings (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  onu_id uuid NOT NULL REFERENCES public.onus ON DELETE CASCADE,
  rx_power numeric NOT NULL,
  tx_power numeric NOT NULL,
  recorded_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.power_readings ENABLE ROW LEVEL SECURITY;

-- =====================
-- 8. SYSTEM_SETTINGS TABLE
-- =====================

CREATE TABLE IF NOT EXISTS public.system_settings (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  key text NOT NULL UNIQUE,
  value jsonb NOT NULL,
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;

-- =====================
-- 9. DATABASE FUNCTIONS
-- =====================

-- Function to check if user is authenticated
CREATE OR REPLACE FUNCTION public.is_authenticated()
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT auth.uid() IS NOT NULL
$$;

-- Function to check user role
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
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

-- Function to handle new user creation
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

-- Function to update updated_at column
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

-- =====================
-- 10. TRIGGERS
-- =====================

-- Trigger for new user
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Update triggers for updated_at
DROP TRIGGER IF EXISTS update_olts_updated_at ON public.olts;
CREATE TRIGGER update_olts_updated_at
  BEFORE UPDATE ON public.olts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_onus_updated_at ON public.onus;
CREATE TRIGGER update_onus_updated_at
  BEFORE UPDATE ON public.onus
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_profiles_updated_at ON public.profiles;
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =====================
-- 11. RLS POLICIES
-- =====================

-- User Roles Policies
DROP POLICY IF EXISTS "Admins can manage roles" ON public.user_roles;
CREATE POLICY "Admins can manage roles" ON public.user_roles
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "Users can view own roles" ON public.user_roles;
CREATE POLICY "Users can view own roles" ON public.user_roles
  FOR SELECT USING ((user_id = auth.uid()) OR has_role(auth.uid(), 'admin'::app_role));

-- OLTs Policies
DROP POLICY IF EXISTS "Authenticated users can view OLTs" ON public.olts;
CREATE POLICY "Authenticated users can view OLTs" ON public.olts
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Operators and admins can insert OLTs" ON public.olts;
CREATE POLICY "Operators and admins can insert OLTs" ON public.olts
  FOR INSERT WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'operator'::app_role));

DROP POLICY IF EXISTS "Operators and admins can update OLTs" ON public.olts;
CREATE POLICY "Operators and admins can update OLTs" ON public.olts
  FOR UPDATE USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'operator'::app_role));

DROP POLICY IF EXISTS "Admins can delete OLTs" ON public.olts;
CREATE POLICY "Admins can delete OLTs" ON public.olts
  FOR DELETE USING (has_role(auth.uid(), 'admin'::app_role));

-- ONUs Policies
DROP POLICY IF EXISTS "Authenticated users can view ONUs" ON public.onus;
CREATE POLICY "Authenticated users can view ONUs" ON public.onus
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Operators and admins can manage ONUs" ON public.onus;
CREATE POLICY "Operators and admins can manage ONUs" ON public.onus
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'operator'::app_role));

-- Alerts Policies
DROP POLICY IF EXISTS "Authenticated users can view alerts" ON public.alerts;
CREATE POLICY "Authenticated users can view alerts" ON public.alerts
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "System can insert alerts" ON public.alerts;
CREATE POLICY "System can insert alerts" ON public.alerts
  FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Authenticated users can update alerts" ON public.alerts;
CREATE POLICY "Authenticated users can update alerts" ON public.alerts
  FOR UPDATE USING (true);

-- Power Readings Policies
DROP POLICY IF EXISTS "Authenticated users can view power readings" ON public.power_readings;
CREATE POLICY "Authenticated users can view power readings" ON public.power_readings
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "System can insert power readings" ON public.power_readings;
CREATE POLICY "System can insert power readings" ON public.power_readings
  FOR INSERT WITH CHECK (true);

-- System Settings Policies
DROP POLICY IF EXISTS "Authenticated users can view settings" ON public.system_settings;
CREATE POLICY "Authenticated users can view settings" ON public.system_settings
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Admins can manage settings" ON public.system_settings;
CREATE POLICY "Admins can manage settings" ON public.system_settings
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

-- =====================
-- 12. REALTIME
-- =====================

-- Enable realtime for tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.olts;
ALTER PUBLICATION supabase_realtime ADD TABLE public.onus;
ALTER PUBLICATION supabase_realtime ADD TABLE public.alerts;

-- =====================
-- SETUP COMPLETE!
-- =====================
-- Your Supabase is now ready for OLT Manager
-- 
-- Tables created:
-- - profiles (user profiles)
-- - user_roles (admin/operator/viewer)
-- - olts (with MikroTik integration columns)
-- - onus (with PPPoE and router_name)
-- - alerts
-- - power_readings
-- - system_settings
--
-- All RLS policies are configured.
-- Real-time is enabled.
-- =====================
