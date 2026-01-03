-- Add Divisions table (top level of hierarchy: Division → District → Upazila → Union → Village)
CREATE TABLE IF NOT EXISTS public.divisions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  bn_name TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(tenant_id, name)
);

-- Add division_id to districts
ALTER TABLE public.districts ADD COLUMN IF NOT EXISTS division_id UUID REFERENCES public.divisions(id) ON DELETE CASCADE;
ALTER TABLE public.districts ADD COLUMN IF NOT EXISTS bn_name TEXT;

-- Add bn_name to other location tables
ALTER TABLE public.upazilas ADD COLUMN IF NOT EXISTS bn_name TEXT;
ALTER TABLE public.unions ADD COLUMN IF NOT EXISTS bn_name TEXT;
ALTER TABLE public.villages ADD COLUMN IF NOT EXISTS bn_name TEXT;
ALTER TABLE public.villages ADD COLUMN IF NOT EXISTS road_no TEXT;
ALTER TABLE public.villages ADD COLUMN IF NOT EXISTS house_no TEXT;

-- Enable RLS on divisions
ALTER TABLE public.divisions ENABLE ROW LEVEL SECURITY;

-- RLS policies for divisions
CREATE POLICY "Super admins full access to divisions" ON public.divisions FOR ALL USING (is_super_admin());
CREATE POLICY "Tenant users can manage divisions" ON public.divisions FOR ALL USING (tenant_id = get_user_tenant_id());

-- Add custom_domains table for ISP whitelist domains
CREATE TABLE IF NOT EXISTS public.tenant_custom_domains (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  domain TEXT NOT NULL,
  subdomain TEXT,
  is_verified BOOLEAN DEFAULT false,
  verified_at TIMESTAMP WITH TIME ZONE,
  dns_txt_record TEXT,
  ssl_status TEXT DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(domain)
);

ALTER TABLE public.tenant_custom_domains ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Super admins full access to custom_domains" ON public.tenant_custom_domains FOR ALL USING (is_super_admin());
CREATE POLICY "Tenant users can manage custom_domains" ON public.tenant_custom_domains FOR ALL USING (tenant_id = get_user_tenant_id());

-- Add more fields to tenants for enhanced signup
ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS owner_name TEXT;
ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS division TEXT;
ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS district TEXT;
ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS upazila TEXT;
ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS logo_url TEXT;
ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS website TEXT;
ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS currency TEXT DEFAULT 'BDT';
ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS language TEXT DEFAULT 'en';
ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS timezone TEXT DEFAULT 'Asia/Dhaka';

-- Inventory System Tables
CREATE TABLE IF NOT EXISTS public.inventory_categories (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  parent_id UUID REFERENCES public.inventory_categories(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.inventory_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  category_id UUID REFERENCES public.inventory_categories(id),
  name TEXT NOT NULL,
  sku TEXT,
  description TEXT,
  quantity INTEGER DEFAULT 0,
  min_quantity INTEGER DEFAULT 0,
  unit_price NUMERIC DEFAULT 0,
  sale_price NUMERIC DEFAULT 0,
  location TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.inventory_transactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  item_id UUID NOT NULL REFERENCES public.inventory_items(id) ON DELETE CASCADE,
  type TEXT NOT NULL, -- 'in', 'out', 'adjustment'
  quantity INTEGER NOT NULL,
  unit_price NUMERIC,
  total_amount NUMERIC,
  reference_type TEXT, -- 'purchase', 'sale', 'customer_install', 'return'
  reference_id UUID,
  notes TEXT,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on inventory tables
ALTER TABLE public.inventory_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Super admins full access to inventory_categories" ON public.inventory_categories FOR ALL USING (is_super_admin());
CREATE POLICY "Tenant users can manage inventory_categories" ON public.inventory_categories FOR ALL USING (tenant_id = get_user_tenant_id());

CREATE POLICY "Super admins full access to inventory_items" ON public.inventory_items FOR ALL USING (is_super_admin());
CREATE POLICY "Tenant users can manage inventory_items" ON public.inventory_items FOR ALL USING (tenant_id = get_user_tenant_id());

CREATE POLICY "Super admins full access to inventory_transactions" ON public.inventory_transactions FOR ALL USING (is_super_admin());
CREATE POLICY "Tenant users can manage inventory_transactions" ON public.inventory_transactions FOR ALL USING (tenant_id = get_user_tenant_id());

-- Staff/Employee & Salary System
CREATE TABLE IF NOT EXISTS public.staff (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  user_id UUID,
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  role TEXT DEFAULT 'staff',
  department TEXT,
  designation TEXT,
  join_date DATE,
  salary NUMERIC DEFAULT 0,
  salary_type TEXT DEFAULT 'monthly', -- 'monthly', 'hourly', 'commission'
  commission_rate NUMERIC DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  address TEXT,
  nid TEXT,
  bank_account TEXT,
  bank_name TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.salary_payments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  staff_id UUID NOT NULL REFERENCES public.staff(id) ON DELETE CASCADE,
  month TEXT NOT NULL, -- 'YYYY-MM'
  basic_salary NUMERIC DEFAULT 0,
  bonus NUMERIC DEFAULT 0,
  deductions NUMERIC DEFAULT 0,
  commission NUMERIC DEFAULT 0,
  net_salary NUMERIC DEFAULT 0,
  payment_date DATE,
  payment_method TEXT,
  status TEXT DEFAULT 'pending', -- 'pending', 'paid', 'partial'
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on staff tables
ALTER TABLE public.staff ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.salary_payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Super admins full access to staff" ON public.staff FOR ALL USING (is_super_admin());
CREATE POLICY "Tenant users can manage staff" ON public.staff FOR ALL USING (tenant_id = get_user_tenant_id());

CREATE POLICY "Super admins full access to salary_payments" ON public.salary_payments FOR ALL USING (is_super_admin());
CREATE POLICY "Tenant users can manage salary_payments" ON public.salary_payments FOR ALL USING (tenant_id = get_user_tenant_id());

-- Income/Expense System
CREATE TABLE IF NOT EXISTS public.expense_categories (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'expense', -- 'income', 'expense'
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.transactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  category_id UUID REFERENCES public.expense_categories(id),
  type TEXT NOT NULL, -- 'income', 'expense'
  amount NUMERIC NOT NULL,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  description TEXT,
  reference_type TEXT, -- 'customer_payment', 'salary', 'purchase', 'other'
  reference_id UUID,
  payment_method TEXT,
  receipt_url TEXT,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on transaction tables
ALTER TABLE public.expense_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Super admins full access to expense_categories" ON public.expense_categories FOR ALL USING (is_super_admin());
CREATE POLICY "Tenant users can manage expense_categories" ON public.expense_categories FOR ALL USING (tenant_id = get_user_tenant_id());

CREATE POLICY "Super admins full access to transactions" ON public.transactions FOR ALL USING (is_super_admin());
CREATE POLICY "Tenant users can manage transactions" ON public.transactions FOR ALL USING (tenant_id = get_user_tenant_id());

-- BTRC Reports table
CREATE TABLE IF NOT EXISTS public.btrc_reports (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  report_type TEXT NOT NULL, -- 'monthly', 'quarterly', 'annual'
  report_period TEXT NOT NULL, -- 'YYYY-MM' or 'YYYY-Q1' etc
  total_customers INTEGER DEFAULT 0,
  active_customers INTEGER DEFAULT 0,
  new_customers INTEGER DEFAULT 0,
  disconnected_customers INTEGER DEFAULT 0,
  total_bandwidth TEXT,
  total_revenue NUMERIC DEFAULT 0,
  report_data JSONB,
  generated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  submitted_at TIMESTAMP WITH TIME ZONE,
  status TEXT DEFAULT 'draft', -- 'draft', 'submitted', 'approved'
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.btrc_reports ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Super admins full access to btrc_reports" ON public.btrc_reports FOR ALL USING (is_super_admin());
CREATE POLICY "Tenant users can manage btrc_reports" ON public.btrc_reports FOR ALL USING (tenant_id = get_user_tenant_id());

-- System settings for language/currency
CREATE TABLE IF NOT EXISTS public.system_languages (
  code TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  native_name TEXT,
  is_rtl BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true
);

CREATE TABLE IF NOT EXISTS public.system_currencies (
  code TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  symbol TEXT NOT NULL,
  decimal_places INTEGER DEFAULT 2,
  is_active BOOLEAN DEFAULT true
);

-- Insert default languages
INSERT INTO public.system_languages (code, name, native_name) VALUES 
  ('en', 'English', 'English'),
  ('bn', 'Bengali', 'বাংলা')
ON CONFLICT (code) DO NOTHING;

-- Insert default currencies
INSERT INTO public.system_currencies (code, name, symbol) VALUES 
  ('BDT', 'Bangladeshi Taka', '৳'),
  ('USD', 'US Dollar', '$'),
  ('INR', 'Indian Rupee', '₹')
ON CONFLICT (code) DO NOTHING;

-- Add updated_at trigger for new tables
CREATE TRIGGER update_divisions_updated_at BEFORE UPDATE ON public.divisions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_inventory_items_updated_at BEFORE UPDATE ON public.inventory_items FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_staff_updated_at BEFORE UPDATE ON public.staff FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_tenant_custom_domains_updated_at BEFORE UPDATE ON public.tenant_custom_domains FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();