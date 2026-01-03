-- =====================================================
-- ISP POINT - COMPLETE DATABASE SCHEMA (FIXED)
-- =====================================================
-- This SQL handles existing database structures
-- Run this in Supabase SQL Editor
-- =====================================================

-- =====================================================
-- PART 1: CUSTOM TYPES (ENUMS)
-- =====================================================

DO $$ BEGIN CREATE TYPE public.app_role AS ENUM ('admin', 'operator', 'viewer'); EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN CREATE TYPE public.alert_severity AS ENUM ('info', 'warning', 'critical'); EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN CREATE TYPE public.alert_type AS ENUM ('power_low', 'device_offline', 'high_temperature', 'connection_lost', 'onu_offline', 'onu_power_low'); EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN CREATE TYPE public.onu_status AS ENUM ('online', 'offline', 'unknown'); EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN CREATE TYPE public.customer_status AS ENUM ('active', 'inactive', 'suspended', 'pending', 'expired'); EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN CREATE TYPE public.bill_status AS ENUM ('unpaid', 'paid', 'partial', 'overdue', 'cancelled'); EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN CREATE TYPE public.speed_unit AS ENUM ('Mbps', 'Gbps'); EXCEPTION WHEN duplicate_object THEN null; END $$;

-- =====================================================
-- PART 2: HELPER FUNCTIONS
-- =====================================================

CREATE OR REPLACE FUNCTION public.is_authenticated() RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$ SELECT auth.uid() IS NOT NULL $$;

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$ SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role) $$;

CREATE OR REPLACE FUNCTION public.is_super_admin() RETURNS boolean LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$ BEGIN RETURN EXISTS (SELECT 1 FROM tenant_users WHERE user_id = auth.uid() AND role = 'super_admin'); END; $$;

CREATE OR REPLACE FUNCTION public.get_user_tenant_id() RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$ SELECT tenant_id FROM public.tenant_users WHERE user_id = auth.uid() LIMIT 1 $$;

CREATE OR REPLACE FUNCTION public.get_user_tenant_ids() RETURNS SETOF uuid LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$ BEGIN RETURN QUERY SELECT tenant_id FROM tenant_users WHERE user_id = auth.uid(); END; $$;

CREATE OR REPLACE FUNCTION public.is_tenant_active(_tenant_id uuid) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$ SELECT EXISTS (SELECT 1 FROM public.tenants WHERE id = _tenant_id AND status = 'active') $$;

CREATE OR REPLACE FUNCTION public.update_updated_at_column() RETURNS TRIGGER AS $$ BEGIN NEW.updated_at = now(); RETURN NEW; END; $$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION public.handle_new_user() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$ BEGIN INSERT INTO public.profiles (id, email, full_name) VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'full_name', 'User')) ON CONFLICT (id) DO NOTHING; INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'operator') ON CONFLICT DO NOTHING; RETURN NEW; END; $$;

CREATE OR REPLACE FUNCTION public.tenant_access_check(row_tenant_id uuid) RETURNS boolean AS $$ BEGIN RETURN (auth.uid() IS NOT NULL) AND (row_tenant_id IN (SELECT get_user_tenant_ids()) OR is_super_admin()); END; $$ LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public;

-- =====================================================
-- PART 3: CORE TABLES
-- =====================================================

CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text,
  full_name text,
  avatar_url text,
  phone text,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role DEFAULT 'operator' NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  UNIQUE(user_id, role)
);

CREATE TABLE IF NOT EXISTS public.tenants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  email text,
  phone text,
  address text,
  logo_url text,
  status text DEFAULT 'active',
  subscription_status text DEFAULT 'trial',
  subscription_ends_at timestamptz,
  max_olts integer DEFAULT 5,
  max_onus integer DEFAULT 500,
  max_customers integer DEFAULT 500,
  max_users integer DEFAULT 10,
  settings jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS public.tenant_users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role text DEFAULT 'user',
  permissions jsonb DEFAULT '{}'::jsonb,
  is_primary boolean DEFAULT false,
  created_at timestamptz DEFAULT now() NOT NULL,
  UNIQUE(tenant_id, user_id)
);

CREATE TABLE IF NOT EXISTS public.system_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text UNIQUE NOT NULL,
  value jsonb NOT NULL,
  description text,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

-- =====================================================
-- PART 4: OLT & ONU TABLES
-- =====================================================

CREATE TABLE IF NOT EXISTS public.olts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  ip_address text NOT NULL,
  port integer DEFAULT 23,
  username text,
  password_encrypted text,
  brand text DEFAULT 'huawei',
  model text,
  protocol text DEFAULT 'telnet',
  location text,
  status text DEFAULT 'offline',
  total_ports integer DEFAULT 8,
  active_onus integer DEFAULT 0,
  last_polled_at timestamptz,
  polling_enabled boolean DEFAULT true,
  polling_interval integer DEFAULT 300,
  notes text,
  uptime_seconds bigint,
  cpu_usage numeric,
  memory_usage numeric,
  temperature numeric,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS public.onus (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE,
  olt_id uuid REFERENCES public.olts(id) ON DELETE CASCADE NOT NULL,
  onu_index integer NOT NULL,
  serial_number text,
  mac_address text,
  name text,
  description text,
  pon_port text,
  status onu_status DEFAULT 'unknown',
  rx_power numeric,
  tx_power numeric,
  distance numeric,
  online_duration text,
  last_online timestamptz,
  last_offline timestamptz,
  vlan_id integer,
  profile text,
  firmware_version text,
  hardware_version text,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL,
  UNIQUE(olt_id, onu_index)
);

CREATE TABLE IF NOT EXISTS public.power_readings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  onu_id uuid REFERENCES public.onus(id) ON DELETE CASCADE NOT NULL,
  rx_power numeric,
  tx_power numeric,
  recorded_at timestamptz DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS public.onu_status_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  onu_id uuid REFERENCES public.onus(id) ON DELETE CASCADE NOT NULL,
  status onu_status NOT NULL,
  changed_at timestamptz DEFAULT now() NOT NULL,
  reason text
);

CREATE TABLE IF NOT EXISTS public.onu_edit_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  onu_id uuid REFERENCES public.onus(id) ON DELETE CASCADE NOT NULL,
  field_name text NOT NULL,
  old_value text,
  new_value text,
  edited_by uuid,
  edited_at timestamptz DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS public.device_health_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  device_id uuid NOT NULL,
  device_type text NOT NULL,
  device_name text NOT NULL,
  cpu_percent numeric,
  memory_percent numeric,
  total_memory_bytes bigint,
  free_memory_bytes bigint,
  uptime_seconds bigint,
  recorded_at timestamptz DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS public.olt_debug_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  olt_id uuid REFERENCES public.olts(id) ON DELETE CASCADE,
  log_type text DEFAULT 'info',
  message text NOT NULL,
  raw_data jsonb,
  created_at timestamptz DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS public.alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE,
  device_id uuid,
  device_name text,
  type alert_type NOT NULL,
  severity alert_severity NOT NULL,
  title text NOT NULL,
  message text NOT NULL,
  is_read boolean DEFAULT false,
  created_at timestamptz DEFAULT now() NOT NULL
);

-- =====================================================
-- PART 5: ISP CUSTOMER MANAGEMENT TABLES
-- =====================================================

CREATE TABLE IF NOT EXISTS public.divisions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  bn_name text,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS public.districts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE NOT NULL,
  division_id uuid REFERENCES public.divisions(id) ON DELETE CASCADE,
  name text NOT NULL,
  bn_name text,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS public.upazilas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE NOT NULL,
  district_id uuid REFERENCES public.districts(id) ON DELETE CASCADE,
  name text NOT NULL,
  bn_name text,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS public.unions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE NOT NULL,
  upazila_id uuid REFERENCES public.upazilas(id) ON DELETE CASCADE,
  name text NOT NULL,
  bn_name text,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS public.villages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE NOT NULL,
  union_id uuid REFERENCES public.unions(id) ON DELETE CASCADE,
  name text NOT NULL,
  bn_name text,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS public.areas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  description text,
  olt_id uuid REFERENCES public.olts(id) ON DELETE SET NULL,
  district text,
  district_id uuid,
  upazila text,
  upazila_id uuid,
  union_name text,
  union_id uuid,
  village text,
  village_id uuid,
  section_block text,
  road_no text,
  house_no text,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS public.isp_packages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  description text,
  download_speed integer DEFAULT 10,
  upload_speed integer DEFAULT 10,
  speed_unit speed_unit DEFAULT 'Mbps',
  price numeric DEFAULT 0,
  validity_days integer DEFAULT 30,
  is_active boolean DEFAULT true,
  sort_order integer DEFAULT 0,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS public.mikrotik_routers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE NOT NULL,
  olt_id uuid REFERENCES public.olts(id) ON DELETE SET NULL,
  name text NOT NULL,
  ip_address text NOT NULL,
  port integer DEFAULT 8728,
  username text NOT NULL,
  password_encrypted text NOT NULL,
  status text DEFAULT 'offline',
  last_synced timestamptz,
  is_primary boolean DEFAULT false,
  sync_pppoe boolean DEFAULT true,
  sync_queues boolean DEFAULT true,
  auto_disable_expired boolean DEFAULT true,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS public.pppoe_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE NOT NULL,
  mikrotik_id uuid REFERENCES public.mikrotik_routers(id) ON DELETE CASCADE,
  name text NOT NULL,
  local_address text,
  remote_address text,
  rate_limit text,
  parent_queue text,
  address_list text,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS public.resellers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE NOT NULL,
  parent_id uuid REFERENCES public.resellers(id) ON DELETE SET NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  name text NOT NULL,
  email text,
  phone text,
  address text,
  commission_rate numeric DEFAULT 0,
  balance numeric DEFAULT 0,
  credit_limit numeric DEFAULT 0,
  is_active boolean DEFAULT true,
  level integer DEFAULT 1,
  role text DEFAULT 'reseller',
  can_add_sub_resellers boolean DEFAULT false,
  total_collections numeric DEFAULT 0,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS public.reseller_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE NOT NULL,
  reseller_id uuid REFERENCES public.resellers(id) ON DELETE CASCADE NOT NULL,
  type text NOT NULL,
  amount numeric NOT NULL,
  balance_before numeric DEFAULT 0,
  balance_after numeric DEFAULT 0,
  from_reseller_id uuid REFERENCES public.resellers(id) ON DELETE SET NULL,
  to_reseller_id uuid REFERENCES public.resellers(id) ON DELETE SET NULL,
  customer_id uuid,
  description text,
  created_by uuid,
  created_at timestamptz DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS public.reseller_branches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE NOT NULL,
  reseller_id uuid REFERENCES public.resellers(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  address text,
  phone text,
  manager_name text,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS public.reseller_custom_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  permissions jsonb DEFAULT '{}'::jsonb,
  description text,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS public.customers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE NOT NULL,
  customer_code text,
  name text NOT NULL,
  phone text,
  email text,
  address text,
  area_id uuid REFERENCES public.areas(id) ON DELETE SET NULL,
  reseller_id uuid REFERENCES public.resellers(id) ON DELETE SET NULL,
  package_id uuid,
  mikrotik_id uuid,
  onu_id uuid,
  onu_index integer,
  onu_mac text,
  pon_port text,
  pppoe_username text,
  pppoe_password text,
  router_mac text,
  connection_date date DEFAULT CURRENT_DATE,
  expiry_date date,
  monthly_bill numeric DEFAULT 0,
  due_amount numeric DEFAULT 0,
  status customer_status DEFAULT 'pending',
  is_auto_disable boolean DEFAULT true,
  last_payment_date date,
  notes text,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS public.customer_bills (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE NOT NULL,
  customer_id uuid REFERENCES public.customers(id) ON DELETE CASCADE NOT NULL,
  bill_number text NOT NULL,
  billing_month text NOT NULL,
  amount numeric DEFAULT 0,
  discount numeric DEFAULT 0,
  tax numeric DEFAULT 0,
  total_amount numeric DEFAULT 0,
  paid_amount numeric DEFAULT 0,
  bill_date date DEFAULT CURRENT_DATE,
  due_date date NOT NULL,
  paid_date date,
  status bill_status DEFAULT 'unpaid',
  payment_method text,
  payment_reference text,
  collected_by uuid,
  notes text,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS public.customer_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE NOT NULL,
  customer_id uuid REFERENCES public.customers(id) ON DELETE CASCADE NOT NULL,
  bill_id uuid,
  amount numeric NOT NULL,
  payment_method text DEFAULT 'cash',
  payment_gateway text,
  transaction_id text,
  gateway_response jsonb,
  payment_date timestamptz DEFAULT now(),
  collected_by uuid,
  verified_by uuid,
  verified_at timestamptz,
  notes text,
  created_at timestamptz DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS public.customer_recharges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE NOT NULL,
  customer_id uuid REFERENCES public.customers(id) ON DELETE CASCADE NOT NULL,
  reseller_id uuid REFERENCES public.resellers(id) ON DELETE SET NULL,
  amount numeric DEFAULT 0,
  discount numeric DEFAULT 0,
  months integer DEFAULT 1,
  old_expiry date,
  new_expiry date,
  payment_method text DEFAULT 'cash',
  transaction_id text,
  collected_by uuid,
  notes text,
  status text DEFAULT 'completed',
  recharge_date timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS public.customer_imports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE NOT NULL,
  file_name text NOT NULL,
  status text DEFAULT 'pending',
  total_rows integer DEFAULT 0,
  imported_count integer DEFAULT 0,
  failed_count integer DEFAULT 0,
  error_log jsonb,
  imported_by uuid,
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS public.connection_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE NOT NULL,
  request_number text,
  customer_name text NOT NULL,
  phone text NOT NULL,
  email text,
  address text,
  nid_number text,
  area_id uuid,
  package_id uuid,
  preferred_date date,
  status text DEFAULT 'pending',
  assigned_to uuid,
  customer_id uuid,
  rejection_reason text,
  notes text,
  completed_at timestamptz,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

-- =====================================================
-- PART 6: BILLING & AUTOMATION
-- =====================================================

CREATE TABLE IF NOT EXISTS public.billing_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  description text,
  rule_type text NOT NULL,
  trigger_days integer,
  trigger_condition text,
  action text NOT NULL,
  action_params jsonb,
  is_active boolean DEFAULT true,
  last_run timestamptz,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS public.automation_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE NOT NULL,
  rule_id uuid REFERENCES public.billing_rules(id) ON DELETE SET NULL,
  customer_id uuid,
  action text NOT NULL,
  status text NOT NULL,
  details jsonb,
  error_message text,
  executed_at timestamptz DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS public.bill_generations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE NOT NULL,
  billing_month text NOT NULL,
  total_bills integer DEFAULT 0,
  total_amount numeric DEFAULT 0,
  status text DEFAULT 'completed',
  generated_by uuid,
  notes text,
  generated_at timestamptz DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS public.bkash_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE NOT NULL,
  customer_id uuid,
  customer_code text,
  trx_id text NOT NULL,
  payment_type text NOT NULL,
  amount numeric NOT NULL,
  currency text DEFAULT 'BDT',
  sender_number text,
  receiver_number text,
  reference text,
  payment_id text,
  status text DEFAULT 'pending',
  raw_payload jsonb,
  matched_at timestamptz,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

-- =====================================================
-- PART 7: FINANCE TABLES
-- =====================================================

CREATE TABLE IF NOT EXISTS public.expense_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  type text DEFAULT 'expense',
  description text,
  created_at timestamptz DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS public.account_heads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE NOT NULL,
  parent_id uuid REFERENCES public.account_heads(id) ON DELETE SET NULL,
  code text,
  name text NOT NULL,
  type text DEFAULT 'expense',
  description text,
  sort_order integer DEFAULT 0,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS public.bank_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE NOT NULL,
  bank_name text NOT NULL,
  account_name text NOT NULL,
  account_number text NOT NULL,
  branch text,
  routing_number text,
  current_balance numeric DEFAULT 0,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS public.finance_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE NOT NULL,
  account_head_id uuid,
  from_account uuid,
  to_account uuid,
  transaction_type text DEFAULT 'expense',
  transaction_date timestamptz DEFAULT now(),
  amount numeric DEFAULT 0,
  payment_method text DEFAULT 'cash',
  reference_no text,
  description text,
  status text DEFAULT 'pending',
  attachments jsonb DEFAULT '[]'::jsonb,
  created_by uuid,
  approved_by uuid,
  approved_at timestamptz,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS public.cash_book (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE NOT NULL,
  entry_date date DEFAULT CURRENT_DATE,
  voucher_no text,
  particulars text NOT NULL,
  debit numeric DEFAULT 0,
  credit numeric DEFAULT 0,
  balance numeric DEFAULT 0,
  payment_mode text DEFAULT 'cash',
  reference_type text,
  reference_id uuid,
  created_by uuid,
  created_at timestamptz DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS public.investments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE NOT NULL,
  investor_name text NOT NULL,
  amount numeric DEFAULT 0,
  expected_return numeric,
  investment_date date DEFAULT CURRENT_DATE,
  return_date date,
  status text DEFAULT 'active',
  notes text,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

-- =====================================================
-- PART 8: HR TABLES
-- =====================================================

CREATE TABLE IF NOT EXISTS public.employee_types (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  description text,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS public.employees (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE NOT NULL,
  user_id uuid,
  employee_type_id uuid REFERENCES public.employee_types(id) ON DELETE SET NULL,
  employee_code text,
  name text NOT NULL,
  email text,
  phone text,
  nid_number text,
  address text,
  department text,
  designation text,
  joining_date date DEFAULT CURRENT_DATE,
  basic_salary numeric DEFAULT 0,
  house_rent numeric DEFAULT 0,
  medical_allowance numeric DEFAULT 0,
  transport_allowance numeric DEFAULT 0,
  other_allowances numeric DEFAULT 0,
  bank_account text,
  emergency_contact text,
  emergency_phone text,
  photo_url text,
  documents jsonb DEFAULT '[]'::jsonb,
  status text DEFAULT 'active',
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS public.employee_ledger (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE NOT NULL,
  employee_id uuid REFERENCES public.employees(id) ON DELETE CASCADE NOT NULL,
  transaction_type text NOT NULL,
  entry_date date DEFAULT CURRENT_DATE,
  debit numeric DEFAULT 0,
  credit numeric DEFAULT 0,
  balance numeric DEFAULT 0,
  description text,
  reference_id uuid,
  created_by uuid,
  created_at timestamptz DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS public.monthly_salaries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE NOT NULL,
  employee_id uuid REFERENCES public.employees(id) ON DELETE CASCADE NOT NULL,
  salary_month text NOT NULL,
  basic_salary numeric DEFAULT 0,
  allowances numeric DEFAULT 0,
  overtime numeric DEFAULT 0,
  bonus numeric DEFAULT 0,
  deductions numeric DEFAULT 0,
  net_salary numeric DEFAULT 0,
  working_days integer,
  present_days integer,
  absent_days integer,
  leave_days integer,
  status text DEFAULT 'pending',
  paid_amount numeric DEFAULT 0,
  paid_date date,
  payment_method text,
  payment_reference text,
  notes text,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS public.salary_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE NOT NULL,
  salary_id uuid REFERENCES public.monthly_salaries(id) ON DELETE CASCADE NOT NULL,
  amount numeric NOT NULL,
  payment_method text DEFAULT 'cash',
  payment_date date DEFAULT CURRENT_DATE,
  reference_no text,
  notes text,
  paid_by uuid,
  created_at timestamptz DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS public.staff (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE NOT NULL,
  user_id uuid,
  name text NOT NULL,
  email text,
  phone text,
  role text DEFAULT 'staff',
  permissions jsonb DEFAULT '{}'::jsonb,
  is_active boolean DEFAULT true,
  assigned_areas jsonb DEFAULT '[]'::jsonb,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

-- =====================================================
-- PART 9: INVENTORY TABLES
-- =====================================================

CREATE TABLE IF NOT EXISTS public.inventory_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE NOT NULL,
  parent_id uuid REFERENCES public.inventory_categories(id) ON DELETE SET NULL,
  name text NOT NULL,
  description text,
  created_at timestamptz DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS public.inventory_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE NOT NULL,
  category_id uuid REFERENCES public.inventory_categories(id) ON DELETE SET NULL,
  name text NOT NULL,
  sku text,
  description text,
  quantity integer DEFAULT 0,
  min_quantity integer DEFAULT 0,
  unit_price numeric DEFAULT 0,
  sale_price numeric DEFAULT 0,
  location text,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS public.inventory_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE NOT NULL,
  item_id uuid REFERENCES public.inventory_items(id) ON DELETE CASCADE NOT NULL,
  type text NOT NULL,
  quantity integer NOT NULL,
  unit_price numeric,
  total_amount numeric,
  reference_type text,
  reference_id uuid,
  notes text,
  created_by uuid,
  created_at timestamptz DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS public.inventory_ledger (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE NOT NULL,
  item_id uuid REFERENCES public.inventory_items(id) ON DELETE CASCADE NOT NULL,
  transaction_type text NOT NULL,
  entry_date date DEFAULT CURRENT_DATE,
  quantity integer DEFAULT 0,
  unit_price numeric DEFAULT 0,
  total_value numeric DEFAULT 0,
  stock_before integer DEFAULT 0,
  stock_after integer DEFAULT 0,
  reference_type text,
  reference_id uuid,
  notes text,
  created_by uuid,
  created_at timestamptz DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS public.suppliers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  company_name text,
  email text,
  phone text,
  address text,
  contact_person text,
  tax_id text,
  payment_terms text,
  notes text,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS public.purchase_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE NOT NULL,
  supplier_id uuid REFERENCES public.suppliers(id) ON DELETE SET NULL,
  po_number text,
  order_date date DEFAULT CURRENT_DATE,
  expected_date date,
  received_date date,
  subtotal numeric DEFAULT 0,
  tax numeric DEFAULT 0,
  discount numeric DEFAULT 0,
  total numeric DEFAULT 0,
  paid_amount numeric DEFAULT 0,
  status text DEFAULT 'draft',
  notes text,
  created_by uuid,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS public.purchase_order_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  purchase_order_id uuid REFERENCES public.purchase_orders(id) ON DELETE CASCADE NOT NULL,
  item_id uuid REFERENCES public.inventory_items(id) ON DELETE SET NULL,
  item_name text NOT NULL,
  quantity integer NOT NULL,
  unit_price numeric DEFAULT 0,
  tax numeric DEFAULT 0,
  discount numeric DEFAULT 0,
  total numeric DEFAULT 0,
  received_quantity integer DEFAULT 0,
  created_at timestamptz DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS public.sales_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE NOT NULL,
  customer_id uuid REFERENCES public.customers(id) ON DELETE SET NULL,
  so_number text,
  order_date date DEFAULT CURRENT_DATE,
  delivery_date date,
  subtotal numeric DEFAULT 0,
  tax numeric DEFAULT 0,
  discount numeric DEFAULT 0,
  total numeric DEFAULT 0,
  paid_amount numeric DEFAULT 0,
  status text DEFAULT 'draft',
  notes text,
  created_by uuid,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS public.sales_order_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sales_order_id uuid REFERENCES public.sales_orders(id) ON DELETE CASCADE NOT NULL,
  item_id uuid REFERENCES public.inventory_items(id) ON DELETE SET NULL,
  item_name text NOT NULL,
  quantity integer NOT NULL,
  unit_price numeric DEFAULT 0,
  tax numeric DEFAULT 0,
  discount numeric DEFAULT 0,
  total numeric DEFAULT 0,
  created_at timestamptz DEFAULT now() NOT NULL
);

-- =====================================================
-- PART 10: SAAS SUBSCRIPTION TABLES
-- =====================================================

-- Note: packages table already exists, we'll just ensure columns exist
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'packages' AND column_name = 'id') THEN
    ALTER TABLE public.packages ADD COLUMN id uuid PRIMARY KEY DEFAULT gen_random_uuid();
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.packages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  price_monthly numeric DEFAULT 0,
  price_yearly numeric DEFAULT 0,
  max_olts integer DEFAULT 1,
  max_onus integer DEFAULT 100,
  max_users integer DEFAULT 5,
  max_mikrotiks integer DEFAULT 1,
  max_customers integer DEFAULT 100,
  max_areas integer DEFAULT 10,
  max_resellers integer DEFAULT 5,
  features jsonb DEFAULT '[]'::jsonb,
  is_active boolean DEFAULT true,
  sort_order integer DEFAULT 0,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS public.subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE NOT NULL,
  package_id uuid NOT NULL,
  status text DEFAULT 'active',
  billing_cycle text DEFAULT 'monthly',
  amount numeric DEFAULT 0,
  starts_at timestamptz DEFAULT now(),
  ends_at timestamptz,
  cancelled_at timestamptz,
  notes text,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS public.payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE NOT NULL,
  subscription_id uuid REFERENCES public.subscriptions(id) ON DELETE SET NULL,
  amount numeric NOT NULL,
  currency text DEFAULT 'BDT',
  payment_method text,
  payment_gateway text,
  transaction_id text,
  gateway_response jsonb,
  status text DEFAULT 'pending',
  paid_at timestamptz,
  notes text,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS public.invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE NOT NULL,
  subscription_id uuid,
  payment_id uuid,
  invoice_number text NOT NULL,
  amount numeric NOT NULL,
  tax_amount numeric DEFAULT 0,
  total_amount numeric NOT NULL,
  status text DEFAULT 'pending',
  due_date date NOT NULL,
  paid_at timestamptz,
  line_items jsonb,
  notes text,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS public.payment_gateway_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  gateway text UNIQUE NOT NULL,
  display_name text NOT NULL,
  config jsonb DEFAULT '{}'::jsonb,
  is_enabled boolean DEFAULT false,
  is_test_mode boolean DEFAULT true,
  sort_order integer DEFAULT 0,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS public.tenant_payment_gateways (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE NOT NULL,
  gateway text NOT NULL,
  display_name text NOT NULL,
  config jsonb DEFAULT '{}'::jsonb,
  is_enabled boolean DEFAULT false,
  is_test_mode boolean DEFAULT true,
  sort_order integer DEFAULT 0,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL,
  UNIQUE(tenant_id, gateway)
);

-- =====================================================
-- PART 11: NOTIFICATION SYSTEM
-- =====================================================

CREATE TABLE IF NOT EXISTS public.notification_preferences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE NOT NULL UNIQUE,
  email_enabled boolean DEFAULT true,
  sms_enabled boolean DEFAULT false,
  email_address text,
  phone_number text,
  subscription_reminders boolean DEFAULT true,
  payment_alerts boolean DEFAULT true,
  system_updates boolean DEFAULT true,
  device_alerts boolean DEFAULT true,
  reminder_days_before integer DEFAULT 7,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS public.notification_queue (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE,
  notification_type text NOT NULL,
  channel text NOT NULL,
  recipient text NOT NULL,
  subject text,
  message text NOT NULL,
  status text DEFAULT 'pending',
  attempts integer DEFAULT 0,
  last_attempt timestamptz,
  sent_at timestamptz,
  error_message text,
  scheduled_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS public.sms_gateway_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider text DEFAULT 'smsnoc',
  api_key text,
  api_secret text,
  sender_id text,
  base_url text,
  config jsonb DEFAULT '{}'::jsonb,
  is_enabled boolean DEFAULT false,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS public.tenant_sms_gateways (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE NOT NULL UNIQUE,
  provider text DEFAULT 'smsnoc',
  api_key text,
  api_secret text,
  sender_id text,
  base_url text,
  config jsonb DEFAULT '{}'::jsonb,
  is_enabled boolean DEFAULT false,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS public.sms_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  template_type text NOT NULL,
  message text NOT NULL,
  variables jsonb DEFAULT '[]'::jsonb,
  is_active boolean DEFAULT true,
  is_system boolean DEFAULT false,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS public.sms_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE,
  recipient_phone text NOT NULL,
  message text NOT NULL,
  status text DEFAULT 'pending',
  provider_response jsonb,
  sent_at timestamptz,
  error_message text,
  created_at timestamptz DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS public.email_gateway_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider text DEFAULT 'smtp',
  smtp_host text,
  smtp_port integer DEFAULT 587,
  smtp_username text,
  smtp_password text,
  use_tls boolean DEFAULT true,
  sender_email text,
  sender_name text DEFAULT 'ISP Point',
  config jsonb DEFAULT '{}'::jsonb,
  is_enabled boolean DEFAULT false,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS public.tenant_email_gateways (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE NOT NULL UNIQUE,
  provider text DEFAULT 'smtp',
  smtp_host text,
  smtp_port integer DEFAULT 587,
  smtp_username text,
  smtp_password text,
  use_tls boolean DEFAULT true,
  sender_email text,
  sender_name text,
  config jsonb DEFAULT '{}'::jsonb,
  is_enabled boolean DEFAULT false,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS public.email_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  template_type text NOT NULL,
  subject text NOT NULL,
  body text NOT NULL,
  variables jsonb DEFAULT '[]'::jsonb,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS public.email_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE,
  recipient_email text NOT NULL,
  subject text NOT NULL,
  message text NOT NULL,
  status text DEFAULT 'pending',
  sent_at timestamptz,
  error_message text,
  created_at timestamptz DEFAULT now() NOT NULL
);

-- =====================================================
-- PART 12: ACTIVITY & REPORTS
-- =====================================================

CREATE TABLE IF NOT EXISTS public.activity_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE,
  user_id uuid,
  action text NOT NULL,
  entity_type text,
  entity_id text,
  details jsonb DEFAULT '{}'::jsonb,
  ip_address text,
  user_agent text,
  created_at timestamptz DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS public.tenant_backups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE NOT NULL,
  backup_type text DEFAULT 'full',
  file_path text,
  file_size bigint,
  status text DEFAULT 'pending',
  started_at timestamptz,
  completed_at timestamptz,
  error_message text,
  created_by uuid,
  created_at timestamptz DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS public.btrc_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE NOT NULL,
  report_type text NOT NULL,
  report_period text NOT NULL,
  total_customers integer DEFAULT 0,
  active_customers integer DEFAULT 0,
  new_customers integer DEFAULT 0,
  disconnected_customers integer DEFAULT 0,
  total_bandwidth text,
  total_revenue numeric DEFAULT 0,
  report_data jsonb,
  status text DEFAULT 'draft',
  generated_at timestamptz DEFAULT now(),
  submitted_at timestamptz,
  created_at timestamptz DEFAULT now() NOT NULL
);

-- =====================================================
-- PART 13: ENABLE RLS ON ALL TABLES
-- =====================================================

DO $$ 
DECLARE
  tbl text;
  tables text[] := ARRAY[
    'profiles', 'user_roles', 'tenants', 'tenant_users', 'system_settings',
    'olts', 'onus', 'power_readings', 'onu_status_history', 'onu_edit_history',
    'device_health_history', 'olt_debug_logs', 'alerts',
    'divisions', 'districts', 'upazilas', 'unions', 'villages', 'areas',
    'isp_packages', 'mikrotik_routers', 'pppoe_profiles',
    'resellers', 'reseller_transactions', 'reseller_branches', 'reseller_custom_roles',
    'customers', 'customer_bills', 'customer_payments', 'customer_recharges',
    'customer_imports', 'connection_requests',
    'billing_rules', 'automation_logs', 'bill_generations', 'bkash_payments',
    'expense_categories', 'account_heads', 'bank_accounts', 'finance_transactions',
    'cash_book', 'investments',
    'employee_types', 'employees', 'employee_ledger', 'monthly_salaries',
    'salary_payments', 'staff',
    'inventory_categories', 'inventory_items', 'inventory_transactions', 'inventory_ledger',
    'suppliers', 'purchase_orders', 'purchase_order_items', 'sales_orders', 'sales_order_items',
    'packages', 'subscriptions', 'payments', 'invoices',
    'payment_gateway_settings', 'tenant_payment_gateways',
    'notification_preferences', 'notification_queue',
    'sms_gateway_settings', 'tenant_sms_gateways', 'sms_templates', 'sms_logs',
    'email_gateway_settings', 'tenant_email_gateways', 'email_templates', 'email_logs',
    'activity_logs', 'tenant_backups', 'btrc_reports'
  ];
BEGIN
  FOREACH tbl IN ARRAY tables LOOP
    EXECUTE format('ALTER TABLE IF EXISTS public.%I ENABLE ROW LEVEL SECURITY', tbl);
  END LOOP;
END $$;

-- =====================================================
-- PART 14: DROP ALL EXISTING POLICIES (Clean slate)
-- =====================================================

DO $$ 
DECLARE
  r RECORD;
BEGIN
  FOR r IN (SELECT schemaname, tablename, policyname FROM pg_policies WHERE schemaname = 'public') LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', r.policyname, r.schemaname, r.tablename);
  END LOOP;
END $$;

-- =====================================================
-- PART 15: CREATE RLS POLICIES
-- =====================================================

-- Profiles policies
CREATE POLICY "profiles_own_select" ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "profiles_own_update" ON public.profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "profiles_admin_all" ON public.profiles FOR ALL USING (is_super_admin());

-- User roles policies
CREATE POLICY "user_roles_own_select" ON public.user_roles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "user_roles_admin_all" ON public.user_roles FOR ALL USING (is_super_admin());

-- Tenants policies
CREATE POLICY "tenants_member_select" ON public.tenants FOR SELECT USING (id IN (SELECT get_user_tenant_ids()));
CREATE POLICY "tenants_admin_all" ON public.tenants FOR ALL USING (is_super_admin());

-- Tenant users policies
CREATE POLICY "tenant_users_select" ON public.tenant_users FOR SELECT USING (user_id = auth.uid() OR tenant_id IN (SELECT get_user_tenant_ids()));
CREATE POLICY "tenant_users_admin_all" ON public.tenant_users FOR ALL USING (is_super_admin());

-- System settings policies
CREATE POLICY "system_settings_auth_select" ON public.system_settings FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "system_settings_admin_all" ON public.system_settings FOR ALL USING (is_super_admin());

-- OLTs policies
CREATE POLICY "olts_access" ON public.olts FOR ALL USING (tenant_access_check(tenant_id));

-- ONUs policies
CREATE POLICY "onus_access" ON public.onus FOR ALL USING (tenant_id IN (SELECT get_user_tenant_ids()) OR is_super_admin() OR tenant_id IS NULL);

-- Power readings policies
CREATE POLICY "power_readings_select" ON public.power_readings FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "power_readings_insert" ON public.power_readings FOR INSERT WITH CHECK (true);

-- ONU status history policies
CREATE POLICY "onu_status_history_select" ON public.onu_status_history FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "onu_status_history_insert" ON public.onu_status_history FOR INSERT WITH CHECK (true);

-- ONU edit history policies
CREATE POLICY "onu_edit_history_select" ON public.onu_edit_history FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "onu_edit_history_insert" ON public.onu_edit_history FOR INSERT WITH CHECK (true);

-- Device health history policies
CREATE POLICY "device_health_select" ON public.device_health_history FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "device_health_insert" ON public.device_health_history FOR INSERT WITH CHECK (true);
CREATE POLICY "device_health_delete" ON public.device_health_history FOR DELETE USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'operator'));

-- OLT debug logs policies
CREATE POLICY "olt_debug_logs_select" ON public.olt_debug_logs FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "olt_debug_logs_insert" ON public.olt_debug_logs FOR INSERT WITH CHECK (true);

-- Alerts policies
CREATE POLICY "alerts_access" ON public.alerts FOR ALL USING (tenant_id IN (SELECT get_user_tenant_ids()) OR is_super_admin() OR tenant_id IS NULL);

-- Location tables policies
CREATE POLICY "divisions_access" ON public.divisions FOR ALL USING (tenant_access_check(tenant_id));
CREATE POLICY "districts_access" ON public.districts FOR ALL USING (tenant_access_check(tenant_id));
CREATE POLICY "upazilas_access" ON public.upazilas FOR ALL USING (tenant_access_check(tenant_id));
CREATE POLICY "unions_access" ON public.unions FOR ALL USING (tenant_access_check(tenant_id));
CREATE POLICY "villages_access" ON public.villages FOR ALL USING (tenant_access_check(tenant_id));
CREATE POLICY "areas_access" ON public.areas FOR ALL USING (tenant_access_check(tenant_id));

-- ISP packages policies
CREATE POLICY "isp_packages_access" ON public.isp_packages FOR ALL USING (tenant_access_check(tenant_id));

-- MikroTik routers policies
CREATE POLICY "mikrotik_routers_access" ON public.mikrotik_routers FOR ALL USING (tenant_access_check(tenant_id));

-- PPPoE profiles policies
CREATE POLICY "pppoe_profiles_access" ON public.pppoe_profiles FOR ALL USING (tenant_access_check(tenant_id));

-- Resellers policies
CREATE POLICY "resellers_access" ON public.resellers FOR ALL USING (tenant_access_check(tenant_id));
CREATE POLICY "reseller_transactions_access" ON public.reseller_transactions FOR ALL USING (tenant_access_check(tenant_id));
CREATE POLICY "reseller_branches_access" ON public.reseller_branches FOR ALL USING (tenant_access_check(tenant_id));
CREATE POLICY "reseller_custom_roles_access" ON public.reseller_custom_roles FOR ALL USING (tenant_access_check(tenant_id));

-- Customers policies
CREATE POLICY "customers_access" ON public.customers FOR ALL USING (tenant_access_check(tenant_id));
CREATE POLICY "customer_bills_access" ON public.customer_bills FOR ALL USING (tenant_access_check(tenant_id));
CREATE POLICY "customer_payments_access" ON public.customer_payments FOR ALL USING (tenant_access_check(tenant_id));
CREATE POLICY "customer_recharges_access" ON public.customer_recharges FOR ALL USING (tenant_access_check(tenant_id));
CREATE POLICY "customer_imports_access" ON public.customer_imports FOR ALL USING (tenant_access_check(tenant_id));
CREATE POLICY "connection_requests_access" ON public.connection_requests FOR ALL USING (tenant_access_check(tenant_id));

-- Billing policies
CREATE POLICY "billing_rules_access" ON public.billing_rules FOR ALL USING (tenant_access_check(tenant_id));
CREATE POLICY "automation_logs_access" ON public.automation_logs FOR ALL USING (tenant_access_check(tenant_id));
CREATE POLICY "bill_generations_access" ON public.bill_generations FOR ALL USING (tenant_access_check(tenant_id));
CREATE POLICY "bkash_payments_access" ON public.bkash_payments FOR ALL USING (tenant_access_check(tenant_id));

-- Finance policies
CREATE POLICY "expense_categories_access" ON public.expense_categories FOR ALL USING (tenant_access_check(tenant_id));
CREATE POLICY "account_heads_access" ON public.account_heads FOR ALL USING (tenant_access_check(tenant_id));
CREATE POLICY "bank_accounts_access" ON public.bank_accounts FOR ALL USING (tenant_access_check(tenant_id));
CREATE POLICY "finance_transactions_access" ON public.finance_transactions FOR ALL USING (tenant_access_check(tenant_id));
CREATE POLICY "cash_book_access" ON public.cash_book FOR ALL USING (tenant_access_check(tenant_id));
CREATE POLICY "investments_access" ON public.investments FOR ALL USING (tenant_access_check(tenant_id));

-- HR policies
CREATE POLICY "employee_types_access" ON public.employee_types FOR ALL USING (tenant_access_check(tenant_id));
CREATE POLICY "employees_access" ON public.employees FOR ALL USING (tenant_access_check(tenant_id));
CREATE POLICY "employee_ledger_access" ON public.employee_ledger FOR ALL USING (tenant_access_check(tenant_id));
CREATE POLICY "monthly_salaries_access" ON public.monthly_salaries FOR ALL USING (tenant_access_check(tenant_id));
CREATE POLICY "salary_payments_access" ON public.salary_payments FOR ALL USING (tenant_access_check(tenant_id));
CREATE POLICY "staff_access" ON public.staff FOR ALL USING (tenant_access_check(tenant_id));

-- Inventory policies
CREATE POLICY "inventory_categories_access" ON public.inventory_categories FOR ALL USING (tenant_access_check(tenant_id));
CREATE POLICY "inventory_items_access" ON public.inventory_items FOR ALL USING (tenant_access_check(tenant_id));
CREATE POLICY "inventory_transactions_access" ON public.inventory_transactions FOR ALL USING (tenant_access_check(tenant_id));
CREATE POLICY "inventory_ledger_access" ON public.inventory_ledger FOR ALL USING (tenant_access_check(tenant_id));
CREATE POLICY "suppliers_access" ON public.suppliers FOR ALL USING (tenant_access_check(tenant_id));
CREATE POLICY "purchase_orders_access" ON public.purchase_orders FOR ALL USING (tenant_access_check(tenant_id));
CREATE POLICY "purchase_order_items_access" ON public.purchase_order_items FOR ALL USING (auth.uid() IS NOT NULL);
CREATE POLICY "sales_orders_access" ON public.sales_orders FOR ALL USING (tenant_access_check(tenant_id));
CREATE POLICY "sales_order_items_access" ON public.sales_order_items FOR ALL USING (auth.uid() IS NOT NULL);

-- Packages policies (public read, admin write)
CREATE POLICY "packages_public_read" ON public.packages FOR SELECT USING (true);
CREATE POLICY "packages_admin_write" ON public.packages FOR ALL USING (is_super_admin());

-- Subscriptions policies
CREATE POLICY "subscriptions_access" ON public.subscriptions FOR ALL USING (tenant_access_check(tenant_id));

-- Payments policies
CREATE POLICY "payments_access" ON public.payments FOR ALL USING (tenant_access_check(tenant_id));

-- Invoices policies
CREATE POLICY "invoices_access" ON public.invoices FOR ALL USING (tenant_access_check(tenant_id));

-- Payment gateway policies
CREATE POLICY "payment_gateway_settings_admin" ON public.payment_gateway_settings FOR ALL USING (is_super_admin());
CREATE POLICY "tenant_payment_gateways_access" ON public.tenant_payment_gateways FOR ALL USING (tenant_access_check(tenant_id));

-- Notification policies
CREATE POLICY "notification_preferences_access" ON public.notification_preferences FOR ALL USING (tenant_access_check(tenant_id));
CREATE POLICY "notification_queue_access" ON public.notification_queue FOR ALL USING (tenant_id IN (SELECT get_user_tenant_ids()) OR is_super_admin() OR tenant_id IS NULL);

-- SMS policies
CREATE POLICY "sms_gateway_settings_admin" ON public.sms_gateway_settings FOR ALL USING (is_super_admin());
CREATE POLICY "tenant_sms_gateways_access" ON public.tenant_sms_gateways FOR ALL USING (tenant_access_check(tenant_id));
CREATE POLICY "sms_templates_access" ON public.sms_templates FOR ALL USING (tenant_access_check(tenant_id));
CREATE POLICY "sms_logs_access" ON public.sms_logs FOR ALL USING (tenant_id IN (SELECT get_user_tenant_ids()) OR is_super_admin() OR tenant_id IS NULL);

-- Email policies
CREATE POLICY "email_gateway_settings_admin" ON public.email_gateway_settings FOR ALL USING (is_super_admin());
CREATE POLICY "tenant_email_gateways_access" ON public.tenant_email_gateways FOR ALL USING (tenant_access_check(tenant_id));
CREATE POLICY "email_templates_admin" ON public.email_templates FOR ALL USING (is_super_admin());
CREATE POLICY "email_logs_access" ON public.email_logs FOR ALL USING (tenant_id IN (SELECT get_user_tenant_ids()) OR is_super_admin() OR tenant_id IS NULL);

-- Activity logs policies
CREATE POLICY "activity_logs_access" ON public.activity_logs FOR ALL USING (tenant_id IN (SELECT get_user_tenant_ids()) OR is_super_admin() OR tenant_id IS NULL);

-- Tenant backups policies
CREATE POLICY "tenant_backups_access" ON public.tenant_backups FOR ALL USING (tenant_access_check(tenant_id));

-- BTRC reports policies
CREATE POLICY "btrc_reports_access" ON public.btrc_reports FOR ALL USING (tenant_access_check(tenant_id));

-- =====================================================
-- PART 16: ADDITIONAL HELPER FUNCTIONS
-- =====================================================

CREATE OR REPLACE FUNCTION public.generate_customer_code(_tenant_id uuid) RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _count INTEGER; _code TEXT;
BEGIN
  SELECT COUNT(*) + 1 INTO _count FROM public.customers WHERE tenant_id = _tenant_id;
  _code := 'C' || LPAD(_count::TEXT, 6, '0');
  RETURN _code;
END;
$$;

CREATE OR REPLACE FUNCTION public.auto_generate_customer_code() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.customer_code IS NULL OR NEW.customer_code = '' THEN
    NEW.customer_code := 'C' || LPAD(
      (SELECT COALESCE(MAX(CAST(SUBSTRING(customer_code FROM 2) AS INTEGER)), 0) + 1 
       FROM public.customers 
       WHERE tenant_id = NEW.tenant_id AND customer_code ~ '^C[0-9]+$')::TEXT, 
      6, '0'
    );
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.generate_bill_number(_tenant_id uuid) RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _year TEXT; _month TEXT; _count INTEGER; _number TEXT;
BEGIN
  _year := TO_CHAR(NOW(), 'YY');
  _month := TO_CHAR(NOW(), 'MM');
  SELECT COUNT(*) + 1 INTO _count FROM public.customer_bills WHERE tenant_id = _tenant_id AND billing_month = TO_CHAR(NOW(), 'YYYY-MM');
  _number := 'INV' || _year || _month || LPAD(_count::TEXT, 4, '0');
  RETURN _number;
END;
$$;

CREATE OR REPLACE FUNCTION public.generate_request_number(_tenant_id uuid) RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _count INTEGER; _number TEXT;
BEGIN
  SELECT COUNT(*) + 1 INTO _count FROM public.connection_requests WHERE tenant_id = _tenant_id;
  _number := 'REQ' || LPAD(_count::TEXT, 6, '0');
  RETURN _number;
END;
$$;

CREATE OR REPLACE FUNCTION public.generate_employee_code(_tenant_id uuid) RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _count INTEGER; _code TEXT;
BEGIN
  SELECT COUNT(*) + 1 INTO _count FROM public.employees WHERE tenant_id = _tenant_id;
  _code := 'EMP' || LPAD(_count::TEXT, 4, '0');
  RETURN _code;
END;
$$;

CREATE OR REPLACE FUNCTION public.generate_po_number(_tenant_id uuid) RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _year TEXT; _count INTEGER; _number TEXT;
BEGIN
  _year := TO_CHAR(NOW(), 'YY');
  SELECT COUNT(*) + 1 INTO _count FROM public.purchase_orders WHERE tenant_id = _tenant_id;
  _number := 'PO' || _year || LPAD(_count::TEXT, 5, '0');
  RETURN _number;
END;
$$;

CREATE OR REPLACE FUNCTION public.generate_so_number(_tenant_id uuid) RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _year TEXT; _count INTEGER; _number TEXT;
BEGIN
  _year := TO_CHAR(NOW(), 'YY');
  SELECT COUNT(*) + 1 INTO _count FROM public.sales_orders WHERE tenant_id = _tenant_id;
  _number := 'SO' || _year || LPAD(_count::TEXT, 5, '0');
  RETURN _number;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_reseller_descendants(p_reseller_id uuid) RETURNS TABLE(id uuid, name text, level integer, parent_id uuid, balance numeric, role text) LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  WITH RECURSIVE descendants AS (
    SELECT r.id, r.name, r.level, r.parent_id, r.balance, r.role FROM resellers r WHERE r.id = p_reseller_id
    UNION ALL
    SELECT r.id, r.name, r.level, r.parent_id, r.balance, r.role FROM resellers r INNER JOIN descendants d ON r.parent_id = d.id WHERE r.is_active = true
  )
  SELECT * FROM descendants WHERE id != p_reseller_id;
$$;

CREATE OR REPLACE FUNCTION public.get_reseller_all_customers(p_reseller_id uuid) RETURNS SETOF customers LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  WITH RECURSIVE reseller_tree AS (
    SELECT id FROM resellers WHERE id = p_reseller_id
    UNION ALL
    SELECT r.id FROM resellers r INNER JOIN reseller_tree rt ON r.parent_id = rt.id WHERE r.is_active = true
  )
  SELECT c.* FROM customers c WHERE c.reseller_id IN (SELECT id FROM reseller_tree);
$$;

CREATE OR REPLACE FUNCTION public.count_sub_resellers(p_reseller_id uuid) RETURNS integer LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$ SELECT COUNT(*)::INTEGER FROM resellers WHERE parent_id = p_reseller_id AND is_active = true; $$;

CREATE OR REPLACE FUNCTION public.transfer_reseller_balance(p_from_reseller_id uuid, p_to_reseller_id uuid, p_amount numeric, p_description text DEFAULT 'Balance transfer') RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_from_balance NUMERIC; v_to_balance NUMERIC; v_tenant_id UUID;
BEGIN
  SELECT balance, tenant_id INTO v_from_balance, v_tenant_id FROM resellers WHERE id = p_from_reseller_id;
  IF v_from_balance < p_amount THEN RETURN jsonb_build_object('success', false, 'error', 'Insufficient balance'); END IF;
  SELECT balance INTO v_to_balance FROM resellers WHERE id = p_to_reseller_id;
  UPDATE resellers SET balance = balance - p_amount WHERE id = p_from_reseller_id;
  UPDATE resellers SET balance = balance + p_amount WHERE id = p_to_reseller_id;
  INSERT INTO reseller_transactions (tenant_id, reseller_id, type, amount, balance_before, balance_after, from_reseller_id, to_reseller_id, description) VALUES 
    (v_tenant_id, p_from_reseller_id, 'transfer_out', p_amount, v_from_balance, v_from_balance - p_amount, p_from_reseller_id, p_to_reseller_id, p_description),
    (v_tenant_id, p_to_reseller_id, 'transfer_in', p_amount, v_to_balance, v_to_balance + p_amount, p_from_reseller_id, p_to_reseller_id, p_description);
  RETURN jsonb_build_object('success', true, 'new_balance', v_from_balance - p_amount);
END;
$$;

CREATE OR REPLACE FUNCTION public.reseller_pay_customer(p_reseller_id uuid, p_customer_id uuid, p_amount numeric, p_months integer DEFAULT 1) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_reseller RECORD; v_customer RECORD; v_new_expiry DATE; v_package_validity INTEGER;
BEGIN
  SELECT * INTO v_reseller FROM resellers WHERE id = p_reseller_id AND is_active = true;
  IF NOT FOUND THEN RETURN jsonb_build_object('success', false, 'error', 'Reseller not found'); END IF;
  IF v_reseller.balance < p_amount THEN RETURN jsonb_build_object('success', false, 'error', 'Insufficient balance'); END IF;
  SELECT c.*, p.validity_days INTO v_customer FROM customers c LEFT JOIN isp_packages p ON c.package_id = p.id WHERE c.id = p_customer_id;
  IF NOT FOUND THEN RETURN jsonb_build_object('success', false, 'error', 'Customer not found'); END IF;
  v_package_validity := COALESCE(v_customer.validity_days, 30);
  IF v_customer.expiry_date IS NULL OR v_customer.expiry_date < CURRENT_DATE THEN v_new_expiry := CURRENT_DATE + (v_package_validity * p_months);
  ELSE v_new_expiry := v_customer.expiry_date + (v_package_validity * p_months); END IF;
  UPDATE resellers SET balance = balance - p_amount, total_collections = COALESCE(total_collections, 0) + p_amount WHERE id = p_reseller_id;
  UPDATE customers SET due_amount = GREATEST(0, COALESCE(due_amount, 0) - p_amount), expiry_date = v_new_expiry, last_payment_date = CURRENT_DATE, status = 'active' WHERE id = p_customer_id;
  INSERT INTO reseller_transactions (tenant_id, reseller_id, type, amount, balance_before, balance_after, customer_id, description) VALUES (v_reseller.tenant_id, p_reseller_id, 'customer_payment', p_amount, v_reseller.balance, v_reseller.balance - p_amount, p_customer_id, 'Customer recharge for ' || p_months || ' month(s)');
  INSERT INTO customer_payments (tenant_id, customer_id, amount, payment_method, notes) VALUES (v_reseller.tenant_id, p_customer_id, p_amount, 'reseller_wallet', 'Paid by reseller: ' || v_reseller.name);
  RETURN jsonb_build_object('success', true, 'new_expiry', v_new_expiry, 'new_balance', v_reseller.balance - p_amount);
END;
$$;

CREATE OR REPLACE FUNCTION public.match_bkash_payment(_trx_id text, _amount numeric, _customer_code text, _tenant_id uuid) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _customer RECORD;
BEGIN
  SELECT id, name, due_amount, expiry_date, package_id INTO _customer FROM public.customers WHERE customer_code = _customer_code AND tenant_id = _tenant_id;
  IF _customer.id IS NULL THEN RETURN jsonb_build_object('success', false, 'error', 'Customer not found'); END IF;
  UPDATE public.customers SET due_amount = GREATEST(0, due_amount - _amount), last_payment_date = CURRENT_DATE,
    status = CASE WHEN due_amount - _amount <= 0 AND expiry_date >= CURRENT_DATE THEN 'active' ELSE status END,
    expiry_date = CASE WHEN due_amount - _amount <= 0 THEN COALESCE(expiry_date, CURRENT_DATE) + COALESCE((SELECT validity_days FROM isp_packages WHERE id = _customer.package_id), 30) ELSE expiry_date END
  WHERE id = _customer.id;
  INSERT INTO public.customer_payments (tenant_id, customer_id, amount, payment_method, transaction_id, payment_gateway) VALUES (_tenant_id, _customer.id, _amount, 'bkash', _trx_id, 'bkash_webhook');
  RETURN jsonb_build_object('success', true, 'customer_id', _customer.id, 'customer_name', _customer.name, 'new_due', GREATEST(0, _customer.due_amount - _amount));
END;
$$;

CREATE OR REPLACE FUNCTION public.initialize_tenant_gateways(_tenant_id uuid) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.tenant_payment_gateways (tenant_id, gateway, display_name, sort_order) VALUES
    (_tenant_id, 'sslcommerz', 'SSLCommerz', 1), (_tenant_id, 'bkash', 'bKash', 2), (_tenant_id, 'rocket', 'Rocket', 3),
    (_tenant_id, 'nagad', 'Nagad', 4), (_tenant_id, 'uddoktapay', 'UddoktaPay', 5), (_tenant_id, 'shurjopay', 'ShurjoPay', 6),
    (_tenant_id, 'aamarpay', 'aamarPay', 7), (_tenant_id, 'portwallet', 'PortWallet', 8), (_tenant_id, 'piprapay', 'PipraPay', 9),
    (_tenant_id, 'manual', 'Manual Payment', 10)
  ON CONFLICT (tenant_id, gateway) DO NOTHING;
  INSERT INTO public.tenant_sms_gateways (tenant_id, provider) VALUES (_tenant_id, 'smsnoc') ON CONFLICT (tenant_id) DO NOTHING;
  INSERT INTO public.tenant_email_gateways (tenant_id, provider) VALUES (_tenant_id, 'smtp') ON CONFLICT (tenant_id) DO NOTHING;
  INSERT INTO public.sms_templates (tenant_id, name, template_type, message, variables, is_system) VALUES
    (_tenant_id, 'Billing Reminder', 'billing_reminder', 'Dear {{customer_name}}, your bill of ৳{{amount}} is due on {{due_date}}.', '["customer_name", "amount", "due_date"]'::jsonb, true),
    (_tenant_id, 'Payment Received', 'payment_received', 'Dear {{customer_name}}, payment of ৳{{amount}} received. New expiry: {{expiry_date}}', '["customer_name", "amount", "expiry_date"]'::jsonb, true),
    (_tenant_id, 'Welcome Message', 'welcome', 'Welcome {{customer_name}}! Your internet is active. Package: {{package_name}}', '["customer_name", "package_name"]'::jsonb, true),
    (_tenant_id, 'Expiry Warning', 'expiry_warning', 'Dear {{customer_name}}, your internet expires on {{expiry_date}}.', '["customer_name", "expiry_date"]'::jsonb, true)
  ON CONFLICT DO NOTHING;
END;
$$;

CREATE OR REPLACE FUNCTION public.export_tenant_data(_tenant_id uuid) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _result JSONB;
BEGIN
  SELECT jsonb_build_object(
    'tenant', (SELECT row_to_json(t) FROM tenants t WHERE id = _tenant_id),
    'customers', (SELECT COALESCE(jsonb_agg(row_to_json(c)), '[]'::jsonb) FROM customers c WHERE tenant_id = _tenant_id),
    'areas', (SELECT COALESCE(jsonb_agg(row_to_json(a)), '[]'::jsonb) FROM areas a WHERE tenant_id = _tenant_id),
    'resellers', (SELECT COALESCE(jsonb_agg(row_to_json(r)), '[]'::jsonb) FROM resellers r WHERE tenant_id = _tenant_id),
    'isp_packages', (SELECT COALESCE(jsonb_agg(row_to_json(p)), '[]'::jsonb) FROM isp_packages p WHERE tenant_id = _tenant_id),
    'exported_at', now()
  ) INTO _result;
  RETURN _result;
END;
$$;

-- =====================================================
-- PART 17: TRIGGERS
-- =====================================================

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP TRIGGER IF EXISTS auto_customer_code ON public.customers;

CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
CREATE TRIGGER auto_customer_code BEFORE INSERT ON public.customers FOR EACH ROW EXECUTE FUNCTION public.auto_generate_customer_code();

-- =====================================================
-- PART 18: DEFAULT DATA
-- =====================================================

-- Insert default packages (if not exists)
INSERT INTO public.packages (name, description, price_monthly, price_yearly, max_olts, max_onus, max_users, max_mikrotiks, max_customers, max_areas, max_resellers, features, is_active, sort_order)
VALUES
  ('Free', 'Basic free plan for small ISPs', 0, 0, 1, 50, 2, 1, 50, 5, 2, '["Basic ONU Monitoring", "Manual Billing"]'::jsonb, true, 1),
  ('Starter', 'For growing ISPs', 999, 9990, 3, 200, 5, 2, 200, 15, 5, '["ONU Monitoring", "Auto Billing", "SMS Notifications"]'::jsonb, true, 2),
  ('Professional', 'For established ISPs', 2999, 29990, 10, 1000, 15, 5, 1000, 50, 20, '["Full Monitoring", "Auto Billing", "SMS & Email", "Reseller System", "Reports"]'::jsonb, true, 3),
  ('Enterprise', 'For large ISPs', 9999, 99990, 50, 10000, 50, 20, 10000, 200, 100, '["Unlimited Features", "Priority Support", "Custom Integration", "API Access"]'::jsonb, true, 4)
ON CONFLICT DO NOTHING;

-- Insert default system settings
INSERT INTO public.system_settings (key, value, description)
VALUES 
  ('platform_name', '"ISP Point"', 'Platform name'),
  ('platform_version', '"1.0.0"', 'Platform version'),
  ('maintenance_mode', 'false', 'Maintenance mode toggle'),
  ('default_currency', '"BDT"', 'Default currency'),
  ('default_language', '"bn"', 'Default language')
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;

-- =====================================================
-- PART 19: ENABLE REALTIME
-- =====================================================

DO $$ 
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.olts;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$ 
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.onus;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$ 
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.alerts;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$ 
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.customers;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$ 
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.customer_bills;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- =====================================================
-- COMPLETE! Your ISP Point database is ready.
-- =====================================================
