-- =====================================================
-- ISP POINT - COMPLETE DATABASE SCHEMA
-- =====================================================
-- This SQL is designed to be run on a fresh or existing database
-- It will skip existing tables/columns and add missing ones
-- Run this in Supabase SQL Editor
-- =====================================================

-- =====================================================
-- PART 1: CUSTOM TYPES (ENUMS)
-- =====================================================

DO $$ BEGIN
    CREATE TYPE public.app_role AS ENUM ('admin', 'operator', 'viewer');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE public.alert_severity AS ENUM ('info', 'warning', 'critical');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE public.alert_type AS ENUM ('power_low', 'device_offline', 'high_temperature', 'connection_lost', 'onu_offline', 'onu_power_low');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE public.onu_status AS ENUM ('online', 'offline', 'unknown');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE public.customer_status AS ENUM ('active', 'inactive', 'suspended', 'pending', 'expired');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE public.bill_status AS ENUM ('unpaid', 'paid', 'partial', 'overdue', 'cancelled');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE public.speed_unit AS ENUM ('Mbps', 'Gbps');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- =====================================================
-- PART 2: HELPER FUNCTIONS
-- =====================================================

-- Check if user is authenticated
CREATE OR REPLACE FUNCTION public.is_authenticated()
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT auth.uid() IS NOT NULL
$$;

-- Check if user has specific role
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

-- Check if user is super admin
CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS boolean
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM tenant_users 
    WHERE user_id = auth.uid() 
    AND role = 'super_admin'
  );
END;
$$;

-- Get user's tenant ID (single)
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

-- Get all tenant IDs for user
CREATE OR REPLACE FUNCTION public.get_user_tenant_ids()
RETURNS SETOF uuid
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY 
  SELECT tenant_id FROM tenant_users WHERE user_id = auth.uid();
END;
$$;

-- Check if tenant is active
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

-- Update timestamp trigger function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Handle new user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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

-- =====================================================
-- PART 3: CORE TABLES
-- =====================================================

-- Profiles table
CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text,
  full_name text,
  avatar_url text,
  phone text,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL
);

-- User roles table
CREATE TABLE IF NOT EXISTS public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role DEFAULT 'operator' NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  UNIQUE(user_id, role)
);

-- Tenants table (ISP organizations)
CREATE TABLE IF NOT EXISTS public.tenants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  email text,
  phone text,
  address text,
  logo_url text,
  status text DEFAULT 'active',
  subscription_status text DEFAULT 'trial',
  subscription_ends_at timestamp with time zone,
  max_olts integer DEFAULT 5,
  max_onus integer DEFAULT 500,
  max_customers integer DEFAULT 500,
  max_users integer DEFAULT 10,
  settings jsonb DEFAULT '{}'::jsonb,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL
);

-- Tenant users mapping
CREATE TABLE IF NOT EXISTS public.tenant_users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role text DEFAULT 'user',
  permissions jsonb DEFAULT '{}'::jsonb,
  is_primary boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  UNIQUE(tenant_id, user_id)
);

-- System settings
CREATE TABLE IF NOT EXISTS public.system_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text UNIQUE NOT NULL,
  value jsonb NOT NULL,
  description text,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL
);

-- =====================================================
-- PART 4: OLT & ONU TABLES
-- =====================================================

-- OLTs table
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
  last_polled_at timestamp with time zone,
  polling_enabled boolean DEFAULT true,
  polling_interval integer DEFAULT 300,
  notes text,
  uptime_seconds bigint,
  cpu_usage numeric,
  memory_usage numeric,
  temperature numeric,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL
);

-- ONUs table
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
  last_online timestamp with time zone,
  last_offline timestamp with time zone,
  vlan_id integer,
  profile text,
  firmware_version text,
  hardware_version text,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL,
  UNIQUE(olt_id, onu_index)
);

-- Power readings history
CREATE TABLE IF NOT EXISTS public.power_readings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  onu_id uuid REFERENCES public.onus(id) ON DELETE CASCADE NOT NULL,
  rx_power numeric,
  tx_power numeric,
  recorded_at timestamp with time zone DEFAULT now() NOT NULL
);

-- ONU status history
CREATE TABLE IF NOT EXISTS public.onu_status_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  onu_id uuid REFERENCES public.onus(id) ON DELETE CASCADE NOT NULL,
  status onu_status NOT NULL,
  changed_at timestamp with time zone DEFAULT now() NOT NULL,
  reason text
);

-- ONU edit history
CREATE TABLE IF NOT EXISTS public.onu_edit_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  onu_id uuid REFERENCES public.onus(id) ON DELETE CASCADE NOT NULL,
  field_name text NOT NULL,
  old_value text,
  new_value text,
  edited_by uuid,
  edited_at timestamp with time zone DEFAULT now() NOT NULL
);

-- Device health history
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
  recorded_at timestamp with time zone DEFAULT now() NOT NULL
);

-- OLT debug logs
CREATE TABLE IF NOT EXISTS public.olt_debug_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  olt_id uuid REFERENCES public.olts(id) ON DELETE CASCADE,
  log_type text DEFAULT 'info',
  message text NOT NULL,
  raw_data jsonb,
  created_at timestamp with time zone DEFAULT now() NOT NULL
);

-- Alerts
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
  created_at timestamp with time zone DEFAULT now() NOT NULL
);

-- =====================================================
-- PART 5: ISP CUSTOMER MANAGEMENT TABLES
-- =====================================================

-- Divisions
CREATE TABLE IF NOT EXISTS public.divisions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  bn_name text,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL
);

-- Districts
CREATE TABLE IF NOT EXISTS public.districts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE NOT NULL,
  division_id uuid REFERENCES public.divisions(id) ON DELETE CASCADE,
  name text NOT NULL,
  bn_name text,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL
);

-- Upazilas
CREATE TABLE IF NOT EXISTS public.upazilas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE NOT NULL,
  district_id uuid REFERENCES public.districts(id) ON DELETE CASCADE,
  name text NOT NULL,
  bn_name text,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL
);

-- Unions
CREATE TABLE IF NOT EXISTS public.unions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE NOT NULL,
  upazila_id uuid REFERENCES public.upazilas(id) ON DELETE CASCADE,
  name text NOT NULL,
  bn_name text,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL
);

-- Villages
CREATE TABLE IF NOT EXISTS public.villages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE NOT NULL,
  union_id uuid REFERENCES public.unions(id) ON DELETE CASCADE,
  name text NOT NULL,
  bn_name text,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL
);

-- Areas
CREATE TABLE IF NOT EXISTS public.areas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  description text,
  olt_id uuid REFERENCES public.olts(id) ON DELETE SET NULL,
  district text,
  district_id uuid REFERENCES public.districts(id) ON DELETE SET NULL,
  upazila text,
  upazila_id uuid REFERENCES public.upazilas(id) ON DELETE SET NULL,
  union_name text,
  union_id uuid REFERENCES public.unions(id) ON DELETE SET NULL,
  village text,
  village_id uuid REFERENCES public.villages(id) ON DELETE SET NULL,
  section_block text,
  road_no text,
  house_no text,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL
);

-- ISP Packages
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
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL
);

-- MikroTik Routers
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
  last_synced timestamp with time zone,
  is_primary boolean DEFAULT false,
  sync_pppoe boolean DEFAULT true,
  sync_queues boolean DEFAULT true,
  auto_disable_expired boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL
);

-- PPPoE Profiles
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
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL
);

-- Resellers
CREATE TABLE IF NOT EXISTS public.resellers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE NOT NULL,
  parent_id uuid REFERENCES public.resellers(id) ON DELETE SET NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  name text NOT NULL,
  email text,
  phone text,
  address text,
  role text DEFAULT 'reseller',
  level integer DEFAULT 1,
  balance numeric DEFAULT 0,
  credit_limit numeric DEFAULT 0,
  commission_type text DEFAULT 'percentage',
  commission_rate numeric DEFAULT 0,
  max_sub_resellers integer DEFAULT 10,
  max_customers integer DEFAULT 100,
  total_collections numeric DEFAULT 0,
  is_active boolean DEFAULT true,
  permissions jsonb DEFAULT '{}'::jsonb,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL
);

-- Reseller Transactions
CREATE TABLE IF NOT EXISTS public.reseller_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE NOT NULL,
  reseller_id uuid REFERENCES public.resellers(id) ON DELETE CASCADE NOT NULL,
  customer_id uuid,
  from_reseller_id uuid REFERENCES public.resellers(id) ON DELETE SET NULL,
  to_reseller_id uuid REFERENCES public.resellers(id) ON DELETE SET NULL,
  type text NOT NULL,
  amount numeric NOT NULL,
  balance_before numeric DEFAULT 0,
  balance_after numeric DEFAULT 0,
  description text,
  created_at timestamp with time zone DEFAULT now() NOT NULL
);

-- Reseller Branches
CREATE TABLE IF NOT EXISTS public.reseller_branches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE NOT NULL,
  reseller_id uuid REFERENCES public.resellers(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  address text,
  phone text,
  manager_name text,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL
);

-- Reseller Custom Roles
CREATE TABLE IF NOT EXISTS public.reseller_custom_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  description text,
  permissions jsonb DEFAULT '{}'::jsonb,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL
);

-- Customers
CREATE TABLE IF NOT EXISTS public.customers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE NOT NULL,
  customer_code text,
  name text NOT NULL,
  email text,
  phone text,
  address text,
  area_id uuid REFERENCES public.areas(id) ON DELETE SET NULL,
  reseller_id uuid REFERENCES public.resellers(id) ON DELETE SET NULL,
  package_id uuid REFERENCES public.isp_packages(id) ON DELETE SET NULL,
  mikrotik_id uuid REFERENCES public.mikrotik_routers(id) ON DELETE SET NULL,
  onu_id uuid REFERENCES public.onus(id) ON DELETE SET NULL,
  onu_index integer,
  onu_mac text,
  pon_port text,
  router_mac text,
  pppoe_username text,
  pppoe_password text,
  connection_date date DEFAULT CURRENT_DATE,
  expiry_date date,
  monthly_bill numeric DEFAULT 0,
  due_amount numeric DEFAULT 0,
  last_payment_date date,
  status customer_status DEFAULT 'pending',
  is_auto_disable boolean DEFAULT true,
  notes text,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL
);

-- Customer Bills
CREATE TABLE IF NOT EXISTS public.customer_bills (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE NOT NULL,
  customer_id uuid REFERENCES public.customers(id) ON DELETE CASCADE NOT NULL,
  bill_number text NOT NULL,
  billing_month text NOT NULL,
  bill_date date DEFAULT CURRENT_DATE,
  due_date date NOT NULL,
  amount numeric DEFAULT 0,
  discount numeric DEFAULT 0,
  tax numeric DEFAULT 0,
  total_amount numeric DEFAULT 0,
  paid_amount numeric DEFAULT 0,
  paid_date date,
  status bill_status DEFAULT 'unpaid',
  payment_method text,
  payment_reference text,
  collected_by uuid,
  notes text,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL
);

-- Customer Payments
CREATE TABLE IF NOT EXISTS public.customer_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE NOT NULL,
  customer_id uuid REFERENCES public.customers(id) ON DELETE CASCADE NOT NULL,
  bill_id uuid REFERENCES public.customer_bills(id) ON DELETE SET NULL,
  amount numeric NOT NULL,
  payment_date timestamp with time zone DEFAULT now(),
  payment_method text DEFAULT 'cash',
  payment_gateway text,
  transaction_id text,
  gateway_response jsonb,
  collected_by uuid,
  verified_by uuid,
  verified_at timestamp with time zone,
  notes text,
  created_at timestamp with time zone DEFAULT now() NOT NULL
);

-- Customer Recharges
CREATE TABLE IF NOT EXISTS public.customer_recharges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE NOT NULL,
  customer_id uuid REFERENCES public.customers(id) ON DELETE CASCADE NOT NULL,
  reseller_id uuid REFERENCES public.resellers(id) ON DELETE SET NULL,
  amount numeric DEFAULT 0,
  months integer DEFAULT 1,
  discount numeric DEFAULT 0,
  old_expiry date,
  new_expiry date,
  payment_method text DEFAULT 'cash',
  transaction_id text,
  collected_by uuid,
  status text DEFAULT 'completed',
  notes text,
  recharge_date timestamp with time zone DEFAULT now(),
  created_at timestamp with time zone DEFAULT now() NOT NULL
);

-- Customer Imports
CREATE TABLE IF NOT EXISTS public.customer_imports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE NOT NULL,
  file_name text NOT NULL,
  total_rows integer DEFAULT 0,
  imported_count integer DEFAULT 0,
  failed_count integer DEFAULT 0,
  error_log jsonb,
  status text DEFAULT 'pending',
  imported_by uuid,
  started_at timestamp with time zone,
  completed_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now() NOT NULL
);

-- Connection Requests
CREATE TABLE IF NOT EXISTS public.connection_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE NOT NULL,
  request_number text,
  customer_name text NOT NULL,
  phone text NOT NULL,
  email text,
  address text,
  nid_number text,
  area_id uuid REFERENCES public.areas(id) ON DELETE SET NULL,
  package_id uuid REFERENCES public.isp_packages(id) ON DELETE SET NULL,
  preferred_date date,
  status text DEFAULT 'pending',
  assigned_to uuid,
  customer_id uuid REFERENCES public.customers(id) ON DELETE SET NULL,
  rejection_reason text,
  notes text,
  completed_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL
);

-- Billing Rules
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
  last_run timestamp with time zone,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL
);

-- Automation Logs
CREATE TABLE IF NOT EXISTS public.automation_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE NOT NULL,
  rule_id uuid REFERENCES public.billing_rules(id) ON DELETE SET NULL,
  customer_id uuid REFERENCES public.customers(id) ON DELETE SET NULL,
  action text NOT NULL,
  status text NOT NULL,
  details jsonb,
  error_message text,
  executed_at timestamp with time zone DEFAULT now() NOT NULL
);

-- Bill Generations
CREATE TABLE IF NOT EXISTS public.bill_generations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE NOT NULL,
  billing_month text NOT NULL,
  total_bills integer DEFAULT 0,
  total_amount numeric DEFAULT 0,
  status text DEFAULT 'completed',
  generated_by uuid,
  notes text,
  generated_at timestamp with time zone DEFAULT now() NOT NULL
);

-- bKash Payments
CREATE TABLE IF NOT EXISTS public.bkash_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE NOT NULL,
  customer_id uuid REFERENCES public.customers(id) ON DELETE SET NULL,
  trx_id text NOT NULL,
  payment_type text NOT NULL,
  amount numeric NOT NULL,
  currency text DEFAULT 'BDT',
  sender_number text,
  receiver_number text,
  reference text,
  customer_code text,
  payment_id uuid,
  status text DEFAULT 'pending',
  raw_payload jsonb,
  matched_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL
);

-- =====================================================
-- PART 6: FINANCE & HR TABLES
-- =====================================================

-- Expense Categories
CREATE TABLE IF NOT EXISTS public.expense_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  type text DEFAULT 'expense',
  description text,
  created_at timestamp with time zone DEFAULT now() NOT NULL
);

-- Account Heads
CREATE TABLE IF NOT EXISTS public.account_heads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE NOT NULL,
  parent_id uuid REFERENCES public.account_heads(id) ON DELETE SET NULL,
  name text NOT NULL,
  code text,
  type text DEFAULT 'expense',
  description text,
  is_active boolean DEFAULT true,
  sort_order integer DEFAULT 0,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL
);

-- Bank Accounts
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
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL
);

-- Finance Transactions
CREATE TABLE IF NOT EXISTS public.finance_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE NOT NULL,
  account_head_id uuid REFERENCES public.account_heads(id) ON DELETE SET NULL,
  from_account uuid REFERENCES public.bank_accounts(id) ON DELETE SET NULL,
  to_account uuid REFERENCES public.bank_accounts(id) ON DELETE SET NULL,
  transaction_type text DEFAULT 'expense',
  transaction_date timestamp with time zone DEFAULT now(),
  amount numeric DEFAULT 0,
  description text,
  reference_no text,
  payment_method text DEFAULT 'cash',
  status text DEFAULT 'pending',
  attachments jsonb DEFAULT '[]'::jsonb,
  created_by uuid,
  approved_by uuid,
  approved_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL
);

-- Cash Book
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
  created_at timestamp with time zone DEFAULT now() NOT NULL
);

-- Investments
CREATE TABLE IF NOT EXISTS public.investments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE NOT NULL,
  investor_name text NOT NULL,
  amount numeric DEFAULT 0,
  expected_return numeric DEFAULT 0,
  investment_date date DEFAULT CURRENT_DATE,
  return_date date,
  status text DEFAULT 'active',
  notes text,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL
);

-- Employee Types
CREATE TABLE IF NOT EXISTS public.employee_types (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  description text,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now() NOT NULL
);

-- Employees
CREATE TABLE IF NOT EXISTS public.employees (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE NOT NULL,
  employee_type_id uuid REFERENCES public.employee_types(id) ON DELETE SET NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
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
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL
);

-- Employee Ledger
CREATE TABLE IF NOT EXISTS public.employee_ledger (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE NOT NULL,
  employee_id uuid REFERENCES public.employees(id) ON DELETE CASCADE NOT NULL,
  entry_date date DEFAULT CURRENT_DATE,
  transaction_type text NOT NULL,
  debit numeric DEFAULT 0,
  credit numeric DEFAULT 0,
  balance numeric DEFAULT 0,
  description text,
  reference_id uuid,
  created_by uuid,
  created_at timestamp with time zone DEFAULT now() NOT NULL
);

-- Monthly Salaries
CREATE TABLE IF NOT EXISTS public.monthly_salaries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE NOT NULL,
  employee_id uuid REFERENCES public.employees(id) ON DELETE CASCADE NOT NULL,
  salary_month text NOT NULL,
  basic_salary numeric DEFAULT 0,
  allowances numeric DEFAULT 0,
  deductions numeric DEFAULT 0,
  bonus numeric DEFAULT 0,
  overtime numeric DEFAULT 0,
  net_salary numeric DEFAULT 0,
  working_days integer,
  present_days integer,
  absent_days integer,
  leave_days integer,
  paid_amount numeric DEFAULT 0,
  paid_date date,
  payment_method text,
  payment_reference text,
  status text DEFAULT 'pending',
  notes text,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL
);

-- Salary Payments
CREATE TABLE IF NOT EXISTS public.salary_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE NOT NULL,
  employee_id uuid REFERENCES public.employees(id) ON DELETE CASCADE NOT NULL,
  salary_id uuid REFERENCES public.monthly_salaries(id) ON DELETE SET NULL,
  amount numeric NOT NULL,
  payment_date date DEFAULT CURRENT_DATE,
  payment_method text DEFAULT 'cash',
  transaction_reference text,
  notes text,
  created_by uuid,
  created_at timestamp with time zone DEFAULT now() NOT NULL
);

-- Staff
CREATE TABLE IF NOT EXISTS public.staff (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  employee_id uuid REFERENCES public.employees(id) ON DELETE SET NULL,
  name text NOT NULL,
  email text,
  phone text,
  role text DEFAULT 'collector',
  permissions jsonb DEFAULT '{}'::jsonb,
  assigned_areas jsonb DEFAULT '[]'::jsonb,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL
);

-- =====================================================
-- PART 7: INVENTORY TABLES
-- =====================================================

-- Inventory Categories
CREATE TABLE IF NOT EXISTS public.inventory_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE NOT NULL,
  parent_id uuid REFERENCES public.inventory_categories(id) ON DELETE SET NULL,
  name text NOT NULL,
  description text,
  created_at timestamp with time zone DEFAULT now() NOT NULL
);

-- Inventory Items
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
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL
);

-- Inventory Transactions
CREATE TABLE IF NOT EXISTS public.inventory_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE NOT NULL,
  item_id uuid REFERENCES public.inventory_items(id) ON DELETE CASCADE NOT NULL,
  type text NOT NULL,
  quantity integer NOT NULL,
  unit_price numeric DEFAULT 0,
  total_amount numeric DEFAULT 0,
  reference_type text,
  reference_id uuid,
  notes text,
  created_by uuid,
  created_at timestamp with time zone DEFAULT now() NOT NULL
);

-- Inventory Ledger
CREATE TABLE IF NOT EXISTS public.inventory_ledger (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE NOT NULL,
  item_id uuid REFERENCES public.inventory_items(id) ON DELETE CASCADE NOT NULL,
  entry_date date DEFAULT CURRENT_DATE,
  transaction_type text NOT NULL,
  quantity integer DEFAULT 0,
  unit_price numeric DEFAULT 0,
  total_value numeric DEFAULT 0,
  stock_before integer DEFAULT 0,
  stock_after integer DEFAULT 0,
  reference_type text,
  reference_id uuid,
  notes text,
  created_by uuid,
  created_at timestamp with time zone DEFAULT now() NOT NULL
);

-- Suppliers
CREATE TABLE IF NOT EXISTS public.suppliers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  company text,
  email text,
  phone text,
  address text,
  contact_person text,
  payment_terms text,
  notes text,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL
);

-- Purchase Orders
CREATE TABLE IF NOT EXISTS public.purchase_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE NOT NULL,
  supplier_id uuid REFERENCES public.suppliers(id) ON DELETE SET NULL,
  po_number text NOT NULL,
  order_date date DEFAULT CURRENT_DATE,
  expected_date date,
  status text DEFAULT 'pending',
  subtotal numeric DEFAULT 0,
  tax numeric DEFAULT 0,
  discount numeric DEFAULT 0,
  total_amount numeric DEFAULT 0,
  paid_amount numeric DEFAULT 0,
  notes text,
  created_by uuid,
  approved_by uuid,
  approved_at timestamp with time zone,
  received_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL
);

-- Purchase Order Items
CREATE TABLE IF NOT EXISTS public.purchase_order_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  purchase_order_id uuid REFERENCES public.purchase_orders(id) ON DELETE CASCADE NOT NULL,
  item_id uuid REFERENCES public.inventory_items(id) ON DELETE SET NULL,
  item_name text NOT NULL,
  quantity integer NOT NULL,
  unit_price numeric DEFAULT 0,
  total_price numeric DEFAULT 0,
  received_quantity integer DEFAULT 0,
  created_at timestamp with time zone DEFAULT now() NOT NULL
);

-- Sales Orders
CREATE TABLE IF NOT EXISTS public.sales_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE NOT NULL,
  customer_id uuid REFERENCES public.customers(id) ON DELETE SET NULL,
  so_number text NOT NULL,
  order_date date DEFAULT CURRENT_DATE,
  status text DEFAULT 'pending',
  subtotal numeric DEFAULT 0,
  tax numeric DEFAULT 0,
  discount numeric DEFAULT 0,
  total_amount numeric DEFAULT 0,
  paid_amount numeric DEFAULT 0,
  notes text,
  created_by uuid,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL
);

-- Sales Order Items
CREATE TABLE IF NOT EXISTS public.sales_order_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sales_order_id uuid REFERENCES public.sales_orders(id) ON DELETE CASCADE NOT NULL,
  item_id uuid REFERENCES public.inventory_items(id) ON DELETE SET NULL,
  item_name text NOT NULL,
  quantity integer NOT NULL,
  unit_price numeric DEFAULT 0,
  total_price numeric DEFAULT 0,
  created_at timestamp with time zone DEFAULT now() NOT NULL
);

-- =====================================================
-- PART 8: SUBSCRIPTION & BILLING (SaaS)
-- =====================================================

-- Packages (SaaS subscription plans)
CREATE TABLE IF NOT EXISTS public.packages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  price_monthly numeric DEFAULT 0,
  price_yearly numeric DEFAULT 0,
  max_olts integer DEFAULT 5,
  max_onus integer DEFAULT 500,
  max_customers integer DEFAULT 500,
  max_users integer DEFAULT 5,
  features jsonb DEFAULT '[]'::jsonb,
  is_active boolean DEFAULT true,
  sort_order integer DEFAULT 0,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL
);

-- Subscriptions
CREATE TABLE IF NOT EXISTS public.subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE NOT NULL,
  package_id uuid REFERENCES public.packages(id) ON DELETE RESTRICT NOT NULL,
  billing_cycle text DEFAULT 'monthly',
  amount numeric DEFAULT 0,
  status text DEFAULT 'active',
  starts_at timestamp with time zone DEFAULT now(),
  ends_at timestamp with time zone,
  cancelled_at timestamp with time zone,
  auto_renew boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL
);

-- Payments (SaaS)
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
  paid_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL
);

-- Invoices (SaaS)
CREATE TABLE IF NOT EXISTS public.invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE NOT NULL,
  subscription_id uuid REFERENCES public.subscriptions(id) ON DELETE SET NULL,
  payment_id uuid REFERENCES public.payments(id) ON DELETE SET NULL,
  invoice_number text NOT NULL,
  amount numeric NOT NULL,
  tax_amount numeric DEFAULT 0,
  total_amount numeric NOT NULL,
  due_date date NOT NULL,
  status text DEFAULT 'pending',
  line_items jsonb,
  notes text,
  paid_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL
);

-- Payment Gateway Settings (Global)
CREATE TABLE IF NOT EXISTS public.payment_gateway_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  gateway text NOT NULL,
  display_name text NOT NULL,
  config jsonb DEFAULT '{}'::jsonb,
  is_enabled boolean DEFAULT false,
  is_test_mode boolean DEFAULT true,
  sort_order integer DEFAULT 0,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL,
  UNIQUE(gateway)
);

-- Tenant Payment Gateways
CREATE TABLE IF NOT EXISTS public.tenant_payment_gateways (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE NOT NULL,
  gateway text NOT NULL,
  display_name text NOT NULL,
  config jsonb DEFAULT '{}'::jsonb,
  is_enabled boolean DEFAULT false,
  is_test_mode boolean DEFAULT true,
  sort_order integer DEFAULT 0,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL,
  UNIQUE(tenant_id, gateway)
);

-- =====================================================
-- PART 9: NOTIFICATION SYSTEM
-- =====================================================

-- Notification Preferences
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
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL
);

-- Notification Queue
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
  last_attempt timestamp with time zone,
  sent_at timestamp with time zone,
  error_message text,
  scheduled_at timestamp with time zone DEFAULT now(),
  created_at timestamp with time zone DEFAULT now() NOT NULL
);

-- SMS Gateway Settings (Global)
CREATE TABLE IF NOT EXISTS public.sms_gateway_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider text DEFAULT 'smsnoc',
  api_key text,
  api_secret text,
  sender_id text,
  base_url text,
  config jsonb DEFAULT '{}'::jsonb,
  is_enabled boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL
);

-- Tenant SMS Gateways
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
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL
);

-- SMS Templates
CREATE TABLE IF NOT EXISTS public.sms_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  template_type text NOT NULL,
  message text NOT NULL,
  variables jsonb DEFAULT '[]'::jsonb,
  is_active boolean DEFAULT true,
  is_system boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL
);

-- SMS Logs
CREATE TABLE IF NOT EXISTS public.sms_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE,
  recipient_phone text NOT NULL,
  message text NOT NULL,
  status text DEFAULT 'pending',
  provider_response jsonb,
  sent_at timestamp with time zone,
  error_message text,
  created_at timestamp with time zone DEFAULT now() NOT NULL
);

-- Email Gateway Settings (Global)
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
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL
);

-- Tenant Email Gateways
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
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL
);

-- Email Templates
CREATE TABLE IF NOT EXISTS public.email_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  template_type text NOT NULL,
  subject text NOT NULL,
  body text NOT NULL,
  variables jsonb DEFAULT '[]'::jsonb,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL
);

-- Email Logs
CREATE TABLE IF NOT EXISTS public.email_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE,
  recipient_email text NOT NULL,
  subject text NOT NULL,
  message text NOT NULL,
  status text DEFAULT 'pending',
  sent_at timestamp with time zone,
  error_message text,
  created_at timestamp with time zone DEFAULT now() NOT NULL
);

-- =====================================================
-- PART 10: ACTIVITY & REPORTS
-- =====================================================

-- Activity Logs
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
  created_at timestamp with time zone DEFAULT now() NOT NULL
);

-- Tenant Backups
CREATE TABLE IF NOT EXISTS public.tenant_backups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE NOT NULL,
  backup_type text DEFAULT 'full',
  file_path text,
  file_size bigint,
  status text DEFAULT 'pending',
  started_at timestamp with time zone,
  completed_at timestamp with time zone,
  error_message text,
  created_by uuid,
  created_at timestamp with time zone DEFAULT now() NOT NULL
);

-- BTRC Reports
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
  generated_at timestamp with time zone DEFAULT now(),
  submitted_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now() NOT NULL
);

-- =====================================================
-- PART 11: LANGUAGE & CURRENCY
-- =====================================================

-- System Languages
CREATE TABLE IF NOT EXISTS public.system_languages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text UNIQUE NOT NULL,
  name text NOT NULL,
  native_name text,
  is_rtl boolean DEFAULT false,
  is_active boolean DEFAULT true,
  sort_order integer DEFAULT 0,
  created_at timestamp with time zone DEFAULT now() NOT NULL
);

-- System Currencies
CREATE TABLE IF NOT EXISTS public.system_currencies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text UNIQUE NOT NULL,
  name text NOT NULL,
  symbol text NOT NULL,
  decimal_places integer DEFAULT 2,
  is_active boolean DEFAULT true,
  sort_order integer DEFAULT 0,
  created_at timestamp with time zone DEFAULT now() NOT NULL
);

-- =====================================================
-- PART 12: ENABLE RLS ON ALL TABLES
-- =====================================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tenant_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.olts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.onus ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.power_readings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.onu_status_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.onu_edit_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.device_health_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.olt_debug_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.divisions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.districts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.upazilas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.unions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.villages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.areas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.isp_packages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mikrotik_routers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pppoe_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.resellers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reseller_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reseller_branches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reseller_custom_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customer_bills ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customer_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customer_recharges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customer_imports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.connection_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.billing_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.automation_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bill_generations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bkash_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expense_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.account_heads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bank_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.finance_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cash_book ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.investments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employee_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employee_ledger ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.monthly_salaries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.salary_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.staff ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_ledger ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchase_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchase_order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales_order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.packages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_gateway_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tenant_payment_gateways ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sms_gateway_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tenant_sms_gateways ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sms_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sms_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_gateway_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tenant_email_gateways ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tenant_backups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.btrc_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_languages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_currencies ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- PART 13: DROP ALL EXISTING POLICIES (Clean slate)
-- =====================================================

DO $$ 
DECLARE
    r RECORD;
BEGIN
    FOR r IN (
        SELECT schemaname, tablename, policyname 
        FROM pg_policies 
        WHERE schemaname = 'public'
    ) LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', r.policyname, r.schemaname, r.tablename);
    END LOOP;
END $$;

-- =====================================================
-- PART 14: CREATE RLS POLICIES
-- =====================================================

-- Profiles policies
CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Super admins can manage all profiles" ON public.profiles FOR ALL USING (is_super_admin());

-- User roles policies
CREATE POLICY "Users can view own roles" ON public.user_roles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Super admins can manage all roles" ON public.user_roles FOR ALL USING (is_super_admin());

-- Tenants policies
CREATE POLICY "Users can view own tenants" ON public.tenants FOR SELECT USING (id IN (SELECT get_user_tenant_ids()));
CREATE POLICY "Super admins can manage all tenants" ON public.tenants FOR ALL USING (is_super_admin());

-- Tenant users policies
CREATE POLICY "Users can view tenant memberships" ON public.tenant_users FOR SELECT USING (user_id = auth.uid() OR tenant_id IN (SELECT get_user_tenant_ids()));
CREATE POLICY "Super admins can manage tenant users" ON public.tenant_users FOR ALL USING (is_super_admin());

-- System settings policies
CREATE POLICY "Authenticated can view settings" ON public.system_settings FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Super admins can manage settings" ON public.system_settings FOR ALL USING (is_super_admin());

-- Helper function for tenant access
CREATE OR REPLACE FUNCTION public.tenant_access_check(row_tenant_id uuid)
RETURNS boolean AS $$
BEGIN
  RETURN (auth.uid() IS NOT NULL) AND (row_tenant_id IN (SELECT get_user_tenant_ids()) OR is_super_admin());
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public;

-- OLTs policies
CREATE POLICY "olts_tenant_access" ON public.olts FOR ALL USING (tenant_access_check(tenant_id));

-- ONUs policies
CREATE POLICY "onus_tenant_access" ON public.onus FOR ALL USING (tenant_id IN (SELECT get_user_tenant_ids()) OR is_super_admin() OR tenant_id IS NULL);

-- Power readings policies
CREATE POLICY "power_readings_access" ON public.power_readings FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "power_readings_insert" ON public.power_readings FOR INSERT WITH CHECK (true);

-- ONU status history policies
CREATE POLICY "onu_status_history_access" ON public.onu_status_history FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "onu_status_history_insert" ON public.onu_status_history FOR INSERT WITH CHECK (true);

-- ONU edit history policies
CREATE POLICY "onu_edit_history_access" ON public.onu_edit_history FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "onu_edit_history_insert" ON public.onu_edit_history FOR INSERT WITH CHECK (true);

-- Device health history policies
CREATE POLICY "device_health_history_select" ON public.device_health_history FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "device_health_history_insert" ON public.device_health_history FOR INSERT WITH CHECK (true);
CREATE POLICY "device_health_history_delete" ON public.device_health_history FOR DELETE USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'operator'));

-- OLT debug logs policies
CREATE POLICY "olt_debug_logs_access" ON public.olt_debug_logs FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "olt_debug_logs_insert" ON public.olt_debug_logs FOR INSERT WITH CHECK (true);

-- Alerts policies
CREATE POLICY "alerts_tenant_access" ON public.alerts FOR ALL USING (tenant_id IN (SELECT get_user_tenant_ids()) OR is_super_admin() OR tenant_id IS NULL);

-- Location tables policies (divisions, districts, upazilas, unions, villages)
CREATE POLICY "divisions_tenant_access" ON public.divisions FOR ALL USING (tenant_access_check(tenant_id));
CREATE POLICY "districts_tenant_access" ON public.districts FOR ALL USING (tenant_access_check(tenant_id));
CREATE POLICY "upazilas_tenant_access" ON public.upazilas FOR ALL USING (tenant_access_check(tenant_id));
CREATE POLICY "unions_tenant_access" ON public.unions FOR ALL USING (tenant_access_check(tenant_id));
CREATE POLICY "villages_tenant_access" ON public.villages FOR ALL USING (tenant_access_check(tenant_id));
CREATE POLICY "areas_tenant_access" ON public.areas FOR ALL USING (tenant_access_check(tenant_id));

-- ISP packages policies
CREATE POLICY "isp_packages_tenant_access" ON public.isp_packages FOR ALL USING (tenant_access_check(tenant_id));

-- MikroTik routers policies
CREATE POLICY "mikrotik_routers_tenant_access" ON public.mikrotik_routers FOR ALL USING (tenant_access_check(tenant_id));

-- PPPoE profiles policies
CREATE POLICY "pppoe_profiles_tenant_access" ON public.pppoe_profiles FOR ALL USING (tenant_access_check(tenant_id));

-- Resellers policies
CREATE POLICY "resellers_tenant_access" ON public.resellers FOR ALL USING (tenant_access_check(tenant_id));
CREATE POLICY "reseller_transactions_tenant_access" ON public.reseller_transactions FOR ALL USING (tenant_access_check(tenant_id));
CREATE POLICY "reseller_branches_tenant_access" ON public.reseller_branches FOR ALL USING (tenant_access_check(tenant_id));
CREATE POLICY "reseller_custom_roles_tenant_access" ON public.reseller_custom_roles FOR ALL USING (tenant_access_check(tenant_id));

-- Customers policies
CREATE POLICY "customers_tenant_access" ON public.customers FOR ALL USING (tenant_access_check(tenant_id));
CREATE POLICY "customer_bills_tenant_access" ON public.customer_bills FOR ALL USING (tenant_access_check(tenant_id));
CREATE POLICY "customer_payments_tenant_access" ON public.customer_payments FOR ALL USING (tenant_access_check(tenant_id));
CREATE POLICY "customer_recharges_tenant_access" ON public.customer_recharges FOR ALL USING (tenant_access_check(tenant_id));
CREATE POLICY "customer_imports_tenant_access" ON public.customer_imports FOR ALL USING (tenant_access_check(tenant_id));
CREATE POLICY "connection_requests_tenant_access" ON public.connection_requests FOR ALL USING (tenant_access_check(tenant_id));

-- Billing policies
CREATE POLICY "billing_rules_tenant_access" ON public.billing_rules FOR ALL USING (tenant_access_check(tenant_id));
CREATE POLICY "automation_logs_tenant_access" ON public.automation_logs FOR ALL USING (tenant_access_check(tenant_id));
CREATE POLICY "bill_generations_tenant_access" ON public.bill_generations FOR ALL USING (tenant_access_check(tenant_id));
CREATE POLICY "bkash_payments_tenant_access" ON public.bkash_payments FOR ALL USING (tenant_access_check(tenant_id));

-- Finance policies
CREATE POLICY "expense_categories_tenant_access" ON public.expense_categories FOR ALL USING (tenant_access_check(tenant_id));
CREATE POLICY "account_heads_tenant_access" ON public.account_heads FOR ALL USING (tenant_access_check(tenant_id));
CREATE POLICY "bank_accounts_tenant_access" ON public.bank_accounts FOR ALL USING (tenant_access_check(tenant_id));
CREATE POLICY "finance_transactions_tenant_access" ON public.finance_transactions FOR ALL USING (tenant_access_check(tenant_id));
CREATE POLICY "cash_book_tenant_access" ON public.cash_book FOR ALL USING (tenant_access_check(tenant_id));
CREATE POLICY "investments_tenant_access" ON public.investments FOR ALL USING (tenant_access_check(tenant_id));

-- HR policies
CREATE POLICY "employee_types_tenant_access" ON public.employee_types FOR ALL USING (tenant_access_check(tenant_id));
CREATE POLICY "employees_tenant_access" ON public.employees FOR ALL USING (tenant_access_check(tenant_id));
CREATE POLICY "employee_ledger_tenant_access" ON public.employee_ledger FOR ALL USING (tenant_access_check(tenant_id));
CREATE POLICY "monthly_salaries_tenant_access" ON public.monthly_salaries FOR ALL USING (tenant_access_check(tenant_id));
CREATE POLICY "salary_payments_tenant_access" ON public.salary_payments FOR ALL USING (tenant_access_check(tenant_id));
CREATE POLICY "staff_tenant_access" ON public.staff FOR ALL USING (tenant_access_check(tenant_id));

-- Inventory policies
CREATE POLICY "inventory_categories_tenant_access" ON public.inventory_categories FOR ALL USING (tenant_access_check(tenant_id));
CREATE POLICY "inventory_items_tenant_access" ON public.inventory_items FOR ALL USING (tenant_access_check(tenant_id));
CREATE POLICY "inventory_transactions_tenant_access" ON public.inventory_transactions FOR ALL USING (tenant_access_check(tenant_id));
CREATE POLICY "inventory_ledger_tenant_access" ON public.inventory_ledger FOR ALL USING (tenant_access_check(tenant_id));
CREATE POLICY "suppliers_tenant_access" ON public.suppliers FOR ALL USING (tenant_access_check(tenant_id));
CREATE POLICY "purchase_orders_tenant_access" ON public.purchase_orders FOR ALL USING (tenant_access_check(tenant_id));
CREATE POLICY "purchase_order_items_access" ON public.purchase_order_items FOR ALL USING (auth.uid() IS NOT NULL);
CREATE POLICY "sales_orders_tenant_access" ON public.sales_orders FOR ALL USING (tenant_access_check(tenant_id));
CREATE POLICY "sales_order_items_access" ON public.sales_order_items FOR ALL USING (auth.uid() IS NOT NULL);

-- Packages policies (public read, admin write)
CREATE POLICY "packages_public_read" ON public.packages FOR SELECT USING (true);
CREATE POLICY "packages_admin_write" ON public.packages FOR ALL USING (is_super_admin());

-- Subscriptions policies
CREATE POLICY "subscriptions_tenant_access" ON public.subscriptions FOR ALL USING (tenant_access_check(tenant_id));

-- Payments policies
CREATE POLICY "payments_tenant_access" ON public.payments FOR ALL USING (tenant_access_check(tenant_id));

-- Invoices policies
CREATE POLICY "invoices_tenant_access" ON public.invoices FOR ALL USING (tenant_access_check(tenant_id));

-- Payment gateway policies
CREATE POLICY "payment_gateway_settings_admin" ON public.payment_gateway_settings FOR ALL USING (is_super_admin());
CREATE POLICY "tenant_payment_gateways_access" ON public.tenant_payment_gateways FOR ALL USING (tenant_access_check(tenant_id));

-- Notification policies
CREATE POLICY "notification_preferences_tenant_access" ON public.notification_preferences FOR ALL USING (tenant_access_check(tenant_id));
CREATE POLICY "notification_queue_tenant_access" ON public.notification_queue FOR ALL USING (tenant_id IN (SELECT get_user_tenant_ids()) OR is_super_admin() OR tenant_id IS NULL);

-- SMS policies
CREATE POLICY "sms_gateway_settings_admin" ON public.sms_gateway_settings FOR ALL USING (is_super_admin());
CREATE POLICY "tenant_sms_gateways_access" ON public.tenant_sms_gateways FOR ALL USING (tenant_access_check(tenant_id));
CREATE POLICY "sms_templates_tenant_access" ON public.sms_templates FOR ALL USING (tenant_access_check(tenant_id));
CREATE POLICY "sms_logs_tenant_access" ON public.sms_logs FOR ALL USING (tenant_id IN (SELECT get_user_tenant_ids()) OR is_super_admin() OR tenant_id IS NULL);

-- Email policies
CREATE POLICY "email_gateway_settings_admin" ON public.email_gateway_settings FOR ALL USING (is_super_admin());
CREATE POLICY "tenant_email_gateways_access" ON public.tenant_email_gateways FOR ALL USING (tenant_access_check(tenant_id));
CREATE POLICY "email_templates_admin" ON public.email_templates FOR ALL USING (is_super_admin());
CREATE POLICY "email_logs_tenant_access" ON public.email_logs FOR ALL USING (tenant_id IN (SELECT get_user_tenant_ids()) OR is_super_admin() OR tenant_id IS NULL);

-- Activity logs policies
CREATE POLICY "activity_logs_tenant_access" ON public.activity_logs FOR ALL USING (tenant_id IN (SELECT get_user_tenant_ids()) OR is_super_admin() OR tenant_id IS NULL);

-- Tenant backups policies
CREATE POLICY "tenant_backups_tenant_access" ON public.tenant_backups FOR ALL USING (tenant_access_check(tenant_id));

-- BTRC reports policies
CREATE POLICY "btrc_reports_tenant_access" ON public.btrc_reports FOR ALL USING (tenant_access_check(tenant_id));

-- System languages policies (public read)
CREATE POLICY "system_languages_public_read" ON public.system_languages FOR SELECT USING (true);
CREATE POLICY "system_languages_admin_write" ON public.system_languages FOR ALL USING (is_super_admin());

-- System currencies policies (public read)
CREATE POLICY "system_currencies_public_read" ON public.system_currencies FOR SELECT USING (true);
CREATE POLICY "system_currencies_admin_write" ON public.system_currencies FOR ALL USING (is_super_admin());

-- =====================================================
-- PART 15: ADDITIONAL HELPER FUNCTIONS
-- =====================================================

-- Generate customer code
CREATE OR REPLACE FUNCTION public.generate_customer_code(_tenant_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _count INTEGER;
  _code TEXT;
BEGIN
  SELECT COUNT(*) + 1 INTO _count FROM public.customers WHERE tenant_id = _tenant_id;
  _code := 'C' || LPAD(_count::TEXT, 6, '0');
  RETURN _code;
END;
$$;

-- Auto generate customer code trigger
CREATE OR REPLACE FUNCTION public.auto_generate_customer_code()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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

-- Generate bill number
CREATE OR REPLACE FUNCTION public.generate_bill_number(_tenant_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _year TEXT;
  _month TEXT;
  _count INTEGER;
  _number TEXT;
BEGIN
  _year := TO_CHAR(NOW(), 'YY');
  _month := TO_CHAR(NOW(), 'MM');
  
  SELECT COUNT(*) + 1 INTO _count 
  FROM public.customer_bills 
  WHERE tenant_id = _tenant_id 
    AND billing_month = TO_CHAR(NOW(), 'YYYY-MM');
  
  _number := 'INV' || _year || _month || LPAD(_count::TEXT, 4, '0');
  RETURN _number;
END;
$$;

-- Generate request number
CREATE OR REPLACE FUNCTION public.generate_request_number(_tenant_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE _count INTEGER; _number TEXT;
BEGIN
  SELECT COUNT(*) + 1 INTO _count FROM public.connection_requests WHERE tenant_id = _tenant_id;
  _number := 'REQ' || LPAD(_count::TEXT, 6, '0');
  RETURN _number;
END;
$$;

-- Generate employee code
CREATE OR REPLACE FUNCTION public.generate_employee_code(_tenant_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE _count INTEGER; _code TEXT;
BEGIN
  SELECT COUNT(*) + 1 INTO _count FROM public.employees WHERE tenant_id = _tenant_id;
  _code := 'EMP' || LPAD(_count::TEXT, 4, '0');
  RETURN _code;
END;
$$;

-- Generate PO number
CREATE OR REPLACE FUNCTION public.generate_po_number(_tenant_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE _year TEXT; _count INTEGER; _number TEXT;
BEGIN
  _year := TO_CHAR(NOW(), 'YY');
  SELECT COUNT(*) + 1 INTO _count FROM public.purchase_orders WHERE tenant_id = _tenant_id;
  _number := 'PO' || _year || LPAD(_count::TEXT, 5, '0');
  RETURN _number;
END;
$$;

-- Generate SO number
CREATE OR REPLACE FUNCTION public.generate_so_number(_tenant_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE _year TEXT; _count INTEGER; _number TEXT;
BEGIN
  _year := TO_CHAR(NOW(), 'YY');
  SELECT COUNT(*) + 1 INTO _count FROM public.sales_orders WHERE tenant_id = _tenant_id;
  _number := 'SO' || _year || LPAD(_count::TEXT, 5, '0');
  RETURN _number;
END;
$$;

-- Get reseller descendants
CREATE OR REPLACE FUNCTION public.get_reseller_descendants(p_reseller_id uuid)
RETURNS TABLE(id uuid, name text, level integer, parent_id uuid, balance numeric, role text)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  WITH RECURSIVE descendants AS (
    SELECT r.id, r.name, r.level, r.parent_id, r.balance, r.role
    FROM resellers r
    WHERE r.id = p_reseller_id
    
    UNION ALL
    
    SELECT r.id, r.name, r.level, r.parent_id, r.balance, r.role
    FROM resellers r
    INNER JOIN descendants d ON r.parent_id = d.id
    WHERE r.is_active = true
  )
  SELECT * FROM descendants WHERE id != p_reseller_id;
$$;

-- Get reseller all customers
CREATE OR REPLACE FUNCTION public.get_reseller_all_customers(p_reseller_id uuid)
RETURNS SETOF customers
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  WITH RECURSIVE reseller_tree AS (
    SELECT id FROM resellers WHERE id = p_reseller_id
    UNION ALL
    SELECT r.id FROM resellers r
    INNER JOIN reseller_tree rt ON r.parent_id = rt.id
    WHERE r.is_active = true
  )
  SELECT c.* FROM customers c
  WHERE c.reseller_id IN (SELECT id FROM reseller_tree);
$$;

-- Count sub resellers
CREATE OR REPLACE FUNCTION public.count_sub_resellers(p_reseller_id uuid)
RETURNS integer
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COUNT(*)::INTEGER
  FROM resellers
  WHERE parent_id = p_reseller_id AND is_active = true;
$$;

-- Transfer reseller balance
CREATE OR REPLACE FUNCTION public.transfer_reseller_balance(p_from_reseller_id uuid, p_to_reseller_id uuid, p_amount numeric, p_description text DEFAULT 'Balance transfer')
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_from_balance NUMERIC;
  v_to_balance NUMERIC;
  v_tenant_id UUID;
BEGIN
  SELECT balance, tenant_id INTO v_from_balance, v_tenant_id
  FROM resellers WHERE id = p_from_reseller_id;
  
  IF v_from_balance < p_amount THEN
    RETURN jsonb_build_object('success', false, 'error', 'Insufficient balance');
  END IF;
  
  SELECT balance INTO v_to_balance FROM resellers WHERE id = p_to_reseller_id;
  
  UPDATE resellers SET balance = balance - p_amount WHERE id = p_from_reseller_id;
  UPDATE resellers SET balance = balance + p_amount WHERE id = p_to_reseller_id;
  
  INSERT INTO reseller_transactions (tenant_id, reseller_id, type, amount, balance_before, balance_after, from_reseller_id, to_reseller_id, description)
  VALUES 
    (v_tenant_id, p_from_reseller_id, 'transfer_out', p_amount, v_from_balance, v_from_balance - p_amount, p_from_reseller_id, p_to_reseller_id, p_description),
    (v_tenant_id, p_to_reseller_id, 'transfer_in', p_amount, v_to_balance, v_to_balance + p_amount, p_from_reseller_id, p_to_reseller_id, p_description);
  
  RETURN jsonb_build_object('success', true, 'new_balance', v_from_balance - p_amount);
END;
$$;

-- Reseller pay customer
CREATE OR REPLACE FUNCTION public.reseller_pay_customer(p_reseller_id uuid, p_customer_id uuid, p_amount numeric, p_months integer DEFAULT 1)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_reseller RECORD;
  v_customer RECORD;
  v_new_expiry DATE;
  v_package_validity INTEGER;
BEGIN
  SELECT * INTO v_reseller FROM resellers WHERE id = p_reseller_id AND is_active = true;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Reseller not found');
  END IF;
  
  IF v_reseller.balance < p_amount THEN
    RETURN jsonb_build_object('success', false, 'error', 'Insufficient balance');
  END IF;
  
  SELECT c.*, p.validity_days INTO v_customer
  FROM customers c
  LEFT JOIN isp_packages p ON c.package_id = p.id
  WHERE c.id = p_customer_id;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Customer not found');
  END IF;
  
  v_package_validity := COALESCE(v_customer.validity_days, 30);
  
  IF v_customer.expiry_date IS NULL OR v_customer.expiry_date < CURRENT_DATE THEN
    v_new_expiry := CURRENT_DATE + (v_package_validity * p_months);
  ELSE
    v_new_expiry := v_customer.expiry_date + (v_package_validity * p_months);
  END IF;
  
  UPDATE resellers 
  SET balance = balance - p_amount,
      total_collections = COALESCE(total_collections, 0) + p_amount
  WHERE id = p_reseller_id;
  
  UPDATE customers 
  SET 
    due_amount = GREATEST(0, COALESCE(due_amount, 0) - p_amount),
    expiry_date = v_new_expiry,
    last_payment_date = CURRENT_DATE,
    status = 'active'
  WHERE id = p_customer_id;
  
  INSERT INTO reseller_transactions (tenant_id, reseller_id, type, amount, balance_before, balance_after, customer_id, description)
  VALUES (v_reseller.tenant_id, p_reseller_id, 'customer_payment', p_amount, v_reseller.balance, v_reseller.balance - p_amount, p_customer_id, 'Customer recharge for ' || p_months || ' month(s)');
  
  INSERT INTO customer_payments (tenant_id, customer_id, amount, payment_method, notes)
  VALUES (v_reseller.tenant_id, p_customer_id, p_amount, 'reseller_wallet', 'Paid by reseller: ' || v_reseller.name);
  
  RETURN jsonb_build_object('success', true, 'new_expiry', v_new_expiry, 'new_balance', v_reseller.balance - p_amount);
END;
$$;

-- Match bKash payment
CREATE OR REPLACE FUNCTION public.match_bkash_payment(_trx_id text, _amount numeric, _customer_code text, _tenant_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _customer RECORD;
  _result jsonb;
BEGIN
  SELECT id, name, due_amount, expiry_date, package_id INTO _customer
  FROM public.customers
  WHERE customer_code = _customer_code AND tenant_id = _tenant_id;
  
  IF _customer.id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Customer not found');
  END IF;
  
  UPDATE public.customers
  SET 
    due_amount = GREATEST(0, due_amount - _amount),
    last_payment_date = CURRENT_DATE,
    status = CASE 
      WHEN due_amount - _amount <= 0 AND expiry_date >= CURRENT_DATE THEN 'active'
      ELSE status 
    END,
    expiry_date = CASE
      WHEN due_amount - _amount <= 0 THEN 
        COALESCE(expiry_date, CURRENT_DATE) + COALESCE(
          (SELECT validity_days FROM isp_packages WHERE id = _customer.package_id),
          30
        )
      ELSE expiry_date
    END
  WHERE id = _customer.id;
  
  INSERT INTO public.customer_payments (
    tenant_id, customer_id, amount, payment_method, transaction_id, payment_gateway
  ) VALUES (
    _tenant_id, _customer.id, _amount, 'bkash', _trx_id, 'bkash_webhook'
  );
  
  RETURN jsonb_build_object(
    'success', true, 
    'customer_id', _customer.id, 
    'customer_name', _customer.name,
    'new_due', GREATEST(0, _customer.due_amount - _amount)
  );
END;
$$;

-- Initialize tenant gateways
CREATE OR REPLACE FUNCTION public.initialize_tenant_gateways(_tenant_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
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
  
  INSERT INTO public.tenant_sms_gateways (tenant_id, provider)
  VALUES (_tenant_id, 'smsnoc')
  ON CONFLICT (tenant_id) DO NOTHING;
  
  INSERT INTO public.tenant_email_gateways (tenant_id, provider)
  VALUES (_tenant_id, 'smtp')
  ON CONFLICT (tenant_id) DO NOTHING;
  
  INSERT INTO public.sms_templates (tenant_id, name, template_type, message, variables, is_system)
  VALUES
    (_tenant_id, 'Billing Reminder', 'billing_reminder', 'Dear {{customer_name}}, your bill of ৳{{amount}} is due on {{due_date}}. Please pay to avoid service interruption.', '["customer_name", "amount", "due_date"]'::jsonb, true),
    (_tenant_id, 'Payment Received', 'payment_received', 'Dear {{customer_name}}, we received your payment of ৳{{amount}}. Thank you! New expiry: {{expiry_date}}', '["customer_name", "amount", "expiry_date"]'::jsonb, true),
    (_tenant_id, 'Welcome Message', 'welcome', 'Welcome {{customer_name}}! Your internet connection is now active. Package: {{package_name}}. Support: {{support_phone}}', '["customer_name", "package_name", "support_phone"]'::jsonb, true),
    (_tenant_id, 'Expiry Warning', 'expiry_warning', 'Dear {{customer_name}}, your internet expires on {{expiry_date}}. Please renew to continue service.', '["customer_name", "expiry_date"]'::jsonb, true)
  ON CONFLICT DO NOTHING;
END;
$$;

-- Export tenant data
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

-- Queue subscription reminders
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
-- PART 16: TRIGGERS
-- =====================================================

-- Drop existing triggers first
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP TRIGGER IF EXISTS auto_customer_code ON public.customers;

-- Create auth trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Create customer code trigger
CREATE TRIGGER auto_customer_code
  BEFORE INSERT ON public.customers
  FOR EACH ROW EXECUTE FUNCTION public.auto_generate_customer_code();

-- Create updated_at triggers for all relevant tables
DO $$
DECLARE
  tbl TEXT;
  tables TEXT[] := ARRAY[
    'profiles', 'tenants', 'olts', 'onus', 'areas', 'isp_packages', 'mikrotik_routers', 
    'pppoe_profiles', 'resellers', 'customers', 'customer_bills', 'billing_rules', 
    'bkash_payments', 'connection_requests', 'account_heads', 'bank_accounts', 
    'finance_transactions', 'investments', 'employees', 'monthly_salaries', 'staff',
    'inventory_items', 'suppliers', 'purchase_orders', 'sales_orders', 'subscriptions', 
    'payments', 'invoices', 'payment_gateway_settings', 'tenant_payment_gateways',
    'notification_preferences', 'sms_gateway_settings', 'tenant_sms_gateways', 
    'sms_templates', 'email_gateway_settings', 'tenant_email_gateways', 'email_templates',
    'reseller_branches', 'reseller_custom_roles', 'divisions', 'districts', 'upazilas', 
    'unions', 'villages', 'system_settings'
  ];
BEGIN
  FOREACH tbl IN ARRAY tables LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS update_%s_updated_at ON public.%s', tbl, tbl);
    EXECUTE format('
      CREATE TRIGGER update_%s_updated_at
        BEFORE UPDATE ON public.%s
        FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column()
    ', tbl, tbl);
  END LOOP;
END $$;

-- =====================================================
-- PART 17: DEFAULT DATA
-- =====================================================

-- Insert default system languages
INSERT INTO public.system_languages (code, name, native_name, is_rtl, is_active, sort_order)
VALUES 
  ('en', 'English', 'English', false, true, 1),
  ('bn', 'Bengali', 'বাংলা', false, true, 2)
ON CONFLICT (code) DO NOTHING;

-- Insert default system currencies
INSERT INTO public.system_currencies (code, name, symbol, decimal_places, is_active, sort_order)
VALUES 
  ('BDT', 'Bangladeshi Taka', '৳', 2, true, 1),
  ('USD', 'US Dollar', '$', 2, true, 2)
ON CONFLICT (code) DO NOTHING;

-- Insert default packages
INSERT INTO public.packages (name, description, price_monthly, price_yearly, max_olts, max_onus, max_customers, max_users, features, is_active, sort_order)
VALUES 
  ('Starter', 'Perfect for small ISPs', 999, 9990, 2, 100, 100, 3, '["OLT Monitoring", "Customer Management", "Basic Reports"]'::jsonb, true, 1),
  ('Professional', 'For growing businesses', 2499, 24990, 10, 500, 500, 10, '["All Starter Features", "MikroTik Integration", "SMS Notifications", "Advanced Reports"]'::jsonb, true, 2),
  ('Enterprise', 'For large ISP operations', 4999, 49990, 50, 2000, 2000, 50, '["All Pro Features", "Multi-tenant", "API Access", "Priority Support", "Custom Integrations"]'::jsonb, true, 3)
ON CONFLICT DO NOTHING;

-- Insert default system settings
INSERT INTO public.system_settings (key, value, description)
VALUES 
  ('app_name', '"ISP Point"'::jsonb, 'Application name'),
  ('app_version', '"1.0.0"'::jsonb, 'Application version'),
  ('default_language', '"en"'::jsonb, 'Default language'),
  ('default_currency', '"BDT"'::jsonb, 'Default currency'),
  ('maintenance_mode', 'false'::jsonb, 'Maintenance mode flag')
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;

-- =====================================================
-- PART 18: ENABLE REALTIME
-- =====================================================

ALTER PUBLICATION supabase_realtime ADD TABLE public.olts;
ALTER PUBLICATION supabase_realtime ADD TABLE public.onus;
ALTER PUBLICATION supabase_realtime ADD TABLE public.alerts;
ALTER PUBLICATION supabase_realtime ADD TABLE public.customers;
ALTER PUBLICATION supabase_realtime ADD TABLE public.customer_bills;

-- =====================================================
-- COMPLETE! Your ISP Point database is ready.
-- =====================================================
