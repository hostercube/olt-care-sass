CREATE EXTENSION IF NOT EXISTS "pg_graphql";
CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";
CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";
CREATE EXTENSION IF NOT EXISTS "plpgsql";
CREATE EXTENSION IF NOT EXISTS "supabase_vault";
CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";
BEGIN;

--
-- PostgreSQL database dump
--


-- Dumped from database version 17.6
-- Dumped by pg_dump version 18.1

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: public; Type: SCHEMA; Schema: -; Owner: -
--



--
-- Name: alert_severity; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.alert_severity AS ENUM (
    'critical',
    'warning',
    'info'
);


--
-- Name: alert_type; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.alert_type AS ENUM (
    'onu_offline',
    'power_drop',
    'olt_unreachable',
    'high_latency'
);


--
-- Name: app_role; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.app_role AS ENUM (
    'admin',
    'operator',
    'viewer'
);


--
-- Name: connection_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.connection_status AS ENUM (
    'online',
    'offline',
    'warning',
    'unknown'
);


--
-- Name: olt_brand; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.olt_brand AS ENUM (
    'ZTE',
    'Huawei',
    'Fiberhome',
    'Nokia',
    'BDCOM',
    'VSOL',
    'Other',
    'DBC',
    'CDATA',
    'ECOM'
);


--
-- Name: olt_mode; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.olt_mode AS ENUM (
    'EPON',
    'GPON'
);


--
-- Name: handle_new_user(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.handle_new_user() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
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


--
-- Name: has_role(uuid, public.app_role); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.has_role(_user_id uuid, _role public.app_role) RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;


--
-- Name: is_authenticated(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.is_authenticated() RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  SELECT auth.uid() IS NOT NULL
$$;


--
-- Name: update_updated_at_column(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_updated_at_column() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;


SET default_table_access_method = heap;

--
-- Name: alerts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.alerts (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    type public.alert_type NOT NULL,
    severity public.alert_severity NOT NULL,
    title text NOT NULL,
    message text NOT NULL,
    device_id uuid,
    device_name text,
    is_read boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: device_health_history; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.device_health_history (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    device_id uuid NOT NULL,
    device_type text NOT NULL,
    device_name text NOT NULL,
    cpu_percent numeric,
    memory_percent numeric,
    uptime_seconds bigint,
    free_memory_bytes bigint,
    total_memory_bytes bigint,
    recorded_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT device_health_history_device_type_check CHECK ((device_type = ANY (ARRAY['olt'::text, 'mikrotik'::text])))
);


--
-- Name: olt_debug_logs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.olt_debug_logs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    olt_id uuid,
    olt_name text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    raw_output text,
    parsed_count integer DEFAULT 0,
    connection_method text,
    commands_sent text[],
    error_message text,
    duration_ms integer
);


--
-- Name: olts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.olts (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    brand public.olt_brand NOT NULL,
    ip_address text NOT NULL,
    port integer DEFAULT 22 NOT NULL,
    username text NOT NULL,
    password_encrypted text NOT NULL,
    status public.connection_status DEFAULT 'unknown'::public.connection_status NOT NULL,
    last_polled timestamp with time zone,
    total_ports integer DEFAULT 8 NOT NULL,
    active_ports integer DEFAULT 0 NOT NULL,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    olt_mode public.olt_mode DEFAULT 'GPON'::public.olt_mode,
    mikrotik_ip text,
    mikrotik_username text,
    mikrotik_password_encrypted text,
    mikrotik_port integer DEFAULT 8728
);


--
-- Name: onu_edit_history; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.onu_edit_history (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    onu_id uuid NOT NULL,
    field_name text NOT NULL,
    old_value text,
    new_value text,
    edited_by uuid,
    edited_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: onu_status_history; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.onu_status_history (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    onu_id uuid NOT NULL,
    status text NOT NULL,
    changed_at timestamp with time zone DEFAULT now() NOT NULL,
    duration_seconds integer DEFAULT 0
);


--
-- Name: onus; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.onus (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    olt_id uuid NOT NULL,
    pon_port text NOT NULL,
    onu_index integer NOT NULL,
    name text NOT NULL,
    router_name text,
    mac_address text,
    serial_number text,
    pppoe_username text,
    rx_power numeric(6,2),
    tx_power numeric(6,2),
    status public.connection_status DEFAULT 'unknown'::public.connection_status NOT NULL,
    last_online timestamp with time zone,
    last_offline timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    temperature numeric,
    distance numeric,
    offline_reason text,
    router_mac text,
    vendor_id text,
    model_id text,
    hardware_version text,
    software_version text,
    alive_time text
);

ALTER TABLE ONLY public.onus REPLICA IDENTITY FULL;


--
-- Name: power_readings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.power_readings (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    onu_id uuid NOT NULL,
    rx_power numeric(6,2) NOT NULL,
    tx_power numeric(6,2) NOT NULL,
    recorded_at timestamp with time zone DEFAULT now() NOT NULL
);

ALTER TABLE ONLY public.power_readings REPLICA IDENTITY FULL;


--
-- Name: profiles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.profiles (
    id uuid NOT NULL,
    email text,
    full_name text,
    avatar_url text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: system_settings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.system_settings (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    key text NOT NULL,
    value jsonb NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: user_roles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_roles (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    role public.app_role DEFAULT 'operator'::public.app_role NOT NULL
);


--
-- Name: alerts alerts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.alerts
    ADD CONSTRAINT alerts_pkey PRIMARY KEY (id);


--
-- Name: device_health_history device_health_history_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.device_health_history
    ADD CONSTRAINT device_health_history_pkey PRIMARY KEY (id);


--
-- Name: olt_debug_logs olt_debug_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.olt_debug_logs
    ADD CONSTRAINT olt_debug_logs_pkey PRIMARY KEY (id);


--
-- Name: olts olts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.olts
    ADD CONSTRAINT olts_pkey PRIMARY KEY (id);


--
-- Name: onu_edit_history onu_edit_history_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.onu_edit_history
    ADD CONSTRAINT onu_edit_history_pkey PRIMARY KEY (id);


--
-- Name: onu_status_history onu_status_history_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.onu_status_history
    ADD CONSTRAINT onu_status_history_pkey PRIMARY KEY (id);


--
-- Name: onus onus_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.onus
    ADD CONSTRAINT onus_pkey PRIMARY KEY (id);


--
-- Name: power_readings power_readings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.power_readings
    ADD CONSTRAINT power_readings_pkey PRIMARY KEY (id);


--
-- Name: profiles profiles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_pkey PRIMARY KEY (id);


--
-- Name: system_settings system_settings_key_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.system_settings
    ADD CONSTRAINT system_settings_key_key UNIQUE (key);


--
-- Name: system_settings system_settings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.system_settings
    ADD CONSTRAINT system_settings_pkey PRIMARY KEY (id);


--
-- Name: user_roles user_roles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT user_roles_pkey PRIMARY KEY (id);


--
-- Name: user_roles user_roles_user_id_role_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT user_roles_user_id_role_key UNIQUE (user_id, role);


--
-- Name: idx_device_health_device_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_device_health_device_id ON public.device_health_history USING btree (device_id);


--
-- Name: idx_device_health_device_time; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_device_health_device_time ON public.device_health_history USING btree (device_id, recorded_at DESC);


--
-- Name: idx_device_health_recorded_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_device_health_recorded_at ON public.device_health_history USING btree (recorded_at DESC);


--
-- Name: idx_olt_debug_logs_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_olt_debug_logs_created_at ON public.olt_debug_logs USING btree (created_at DESC);


--
-- Name: idx_olt_debug_logs_olt_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_olt_debug_logs_olt_id ON public.olt_debug_logs USING btree (olt_id);


--
-- Name: idx_onu_edit_history_edited_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_onu_edit_history_edited_at ON public.onu_edit_history USING btree (edited_at DESC);


--
-- Name: idx_onu_edit_history_onu_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_onu_edit_history_onu_id ON public.onu_edit_history USING btree (onu_id);


--
-- Name: idx_onu_status_history_changed_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_onu_status_history_changed_at ON public.onu_status_history USING btree (changed_at);


--
-- Name: idx_onu_status_history_onu_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_onu_status_history_onu_id ON public.onu_status_history USING btree (onu_id);


--
-- Name: idx_onus_olt_id_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_onus_olt_id_status ON public.onus USING btree (olt_id, status);


--
-- Name: idx_onus_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_onus_status ON public.onus USING btree (status);


--
-- Name: olts update_olts_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_olts_updated_at BEFORE UPDATE ON public.olts FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: onus update_onus_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_onus_updated_at BEFORE UPDATE ON public.onus FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: profiles update_profiles_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: olt_debug_logs olt_debug_logs_olt_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.olt_debug_logs
    ADD CONSTRAINT olt_debug_logs_olt_id_fkey FOREIGN KEY (olt_id) REFERENCES public.olts(id) ON DELETE CASCADE;


--
-- Name: olts olts_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.olts
    ADD CONSTRAINT olts_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id);


--
-- Name: onu_edit_history onu_edit_history_edited_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.onu_edit_history
    ADD CONSTRAINT onu_edit_history_edited_by_fkey FOREIGN KEY (edited_by) REFERENCES auth.users(id);


--
-- Name: onu_edit_history onu_edit_history_onu_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.onu_edit_history
    ADD CONSTRAINT onu_edit_history_onu_id_fkey FOREIGN KEY (onu_id) REFERENCES public.onus(id) ON DELETE CASCADE;


--
-- Name: onu_status_history onu_status_history_onu_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.onu_status_history
    ADD CONSTRAINT onu_status_history_onu_id_fkey FOREIGN KEY (onu_id) REFERENCES public.onus(id) ON DELETE CASCADE;


--
-- Name: onus onus_olt_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.onus
    ADD CONSTRAINT onus_olt_id_fkey FOREIGN KEY (olt_id) REFERENCES public.olts(id) ON DELETE CASCADE;


--
-- Name: power_readings power_readings_onu_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.power_readings
    ADD CONSTRAINT power_readings_onu_id_fkey FOREIGN KEY (onu_id) REFERENCES public.onus(id) ON DELETE CASCADE;


--
-- Name: profiles profiles_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: user_roles user_roles_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT user_roles_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: olts Admins can delete OLTs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can delete OLTs" ON public.olts FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: user_roles Admins can manage roles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage roles" ON public.user_roles TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: system_settings Admins can manage settings; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage settings" ON public.system_settings TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: profiles Admins can update all profiles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can update all profiles" ON public.profiles FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: profiles Admins can view all profiles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can view all profiles" ON public.profiles FOR SELECT USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: user_roles Admins can view all roles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can view all roles" ON public.user_roles FOR SELECT USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: alerts Authenticated users can delete alerts; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Authenticated users can delete alerts" ON public.alerts FOR DELETE TO authenticated USING (true);


--
-- Name: alerts Authenticated users can update alerts; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Authenticated users can update alerts" ON public.alerts FOR UPDATE TO authenticated USING (true) WITH CHECK (true);


--
-- Name: olts Authenticated users can view OLTs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Authenticated users can view OLTs" ON public.olts FOR SELECT TO authenticated USING (true);


--
-- Name: onus Authenticated users can view ONUs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Authenticated users can view ONUs" ON public.onus FOR SELECT TO authenticated USING (true);


--
-- Name: alerts Authenticated users can view alerts; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Authenticated users can view alerts" ON public.alerts FOR SELECT TO authenticated USING (true);


--
-- Name: olt_debug_logs Authenticated users can view debug logs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Authenticated users can view debug logs" ON public.olt_debug_logs FOR SELECT TO authenticated USING (true);


--
-- Name: device_health_history Authenticated users can view device health history; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Authenticated users can view device health history" ON public.device_health_history FOR SELECT USING (true);


--
-- Name: onu_edit_history Authenticated users can view edit history; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Authenticated users can view edit history" ON public.onu_edit_history FOR SELECT USING (true);


--
-- Name: power_readings Authenticated users can view power readings; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Authenticated users can view power readings" ON public.power_readings FOR SELECT TO authenticated USING (true);


--
-- Name: system_settings Authenticated users can view settings; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Authenticated users can view settings" ON public.system_settings FOR SELECT TO authenticated USING (true);


--
-- Name: onu_status_history Authenticated users can view status history; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Authenticated users can view status history" ON public.onu_status_history FOR SELECT USING (true);


--
-- Name: device_health_history Operators and admins can delete device health history; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Operators and admins can delete device health history" ON public.device_health_history FOR DELETE USING ((public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'operator'::public.app_role)));


--
-- Name: power_readings Operators and admins can delete power readings; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Operators and admins can delete power readings" ON public.power_readings FOR DELETE USING ((public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'operator'::public.app_role)));


--
-- Name: onu_status_history Operators and admins can delete status history; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Operators and admins can delete status history" ON public.onu_status_history FOR DELETE USING ((public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'operator'::public.app_role)));


--
-- Name: olts Operators and admins can insert OLTs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Operators and admins can insert OLTs" ON public.olts FOR INSERT TO authenticated WITH CHECK ((public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'operator'::public.app_role)));


--
-- Name: onu_edit_history Operators and admins can insert edit history; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Operators and admins can insert edit history" ON public.onu_edit_history FOR INSERT WITH CHECK ((public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'operator'::public.app_role)));


--
-- Name: onus Operators and admins can manage ONUs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Operators and admins can manage ONUs" ON public.onus TO authenticated USING ((public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'operator'::public.app_role)));


--
-- Name: olts Operators and admins can update OLTs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Operators and admins can update OLTs" ON public.olts FOR UPDATE TO authenticated USING ((public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'operator'::public.app_role)));


--
-- Name: alerts System can insert alerts; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "System can insert alerts" ON public.alerts FOR INSERT TO authenticated WITH CHECK (true);


--
-- Name: device_health_history System can insert device health history; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "System can insert device health history" ON public.device_health_history FOR INSERT WITH CHECK (true);


--
-- Name: power_readings System can insert power readings; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "System can insert power readings" ON public.power_readings FOR INSERT TO authenticated WITH CHECK (true);


--
-- Name: onu_status_history System can insert status history; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "System can insert status history" ON public.onu_status_history FOR INSERT WITH CHECK (true);


--
-- Name: profiles Users can insert own profile; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT TO authenticated WITH CHECK ((id = auth.uid()));


--
-- Name: profiles Users can update own profile; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE TO authenticated USING ((id = auth.uid()));


--
-- Name: profiles Users can view own profile; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT USING ((id = auth.uid()));


--
-- Name: user_roles Users can view own roles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view own roles" ON public.user_roles FOR SELECT USING ((user_id = auth.uid()));


--
-- Name: alerts; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.alerts ENABLE ROW LEVEL SECURITY;

--
-- Name: device_health_history; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.device_health_history ENABLE ROW LEVEL SECURITY;

--
-- Name: olt_debug_logs; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.olt_debug_logs ENABLE ROW LEVEL SECURITY;

--
-- Name: olts; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.olts ENABLE ROW LEVEL SECURITY;

--
-- Name: onu_edit_history; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.onu_edit_history ENABLE ROW LEVEL SECURITY;

--
-- Name: onu_status_history; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.onu_status_history ENABLE ROW LEVEL SECURITY;

--
-- Name: onus; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.onus ENABLE ROW LEVEL SECURITY;

--
-- Name: power_readings; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.power_readings ENABLE ROW LEVEL SECURITY;

--
-- Name: profiles; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

--
-- Name: system_settings; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;

--
-- Name: user_roles; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

--
-- PostgreSQL database dump complete
--




COMMIT;