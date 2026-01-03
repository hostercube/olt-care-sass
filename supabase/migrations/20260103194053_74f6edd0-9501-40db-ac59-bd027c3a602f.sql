
-- Create remaining HR/Employee tables

-- Employees (depends on employee_types)
CREATE TABLE IF NOT EXISTS public.employees (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  employee_code TEXT,
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  nid_number TEXT,
  address TEXT,
  employee_type_id UUID REFERENCES public.employee_types(id),
  department TEXT,
  designation TEXT,
  joining_date DATE DEFAULT CURRENT_DATE,
  basic_salary NUMERIC DEFAULT 0,
  house_rent NUMERIC DEFAULT 0,
  medical_allowance NUMERIC DEFAULT 0,
  transport_allowance NUMERIC DEFAULT 0,
  other_allowances NUMERIC DEFAULT 0,
  bank_account TEXT,
  emergency_contact TEXT,
  emergency_phone TEXT,
  photo_url TEXT,
  documents JSONB DEFAULT '[]'::jsonb,
  status TEXT DEFAULT 'active',
  user_id UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.employees ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Super admins full access to employees" ON public.employees;
DROP POLICY IF EXISTS "Tenant users can manage employees" ON public.employees;
CREATE POLICY "Super admins full access to employees" ON public.employees FOR ALL USING (is_super_admin());
CREATE POLICY "Tenant users can manage employees" ON public.employees FOR ALL USING (tenant_id = get_user_tenant_id());

-- Monthly Salaries
CREATE TABLE IF NOT EXISTS public.monthly_salaries (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  salary_month TEXT NOT NULL,
  basic_salary NUMERIC DEFAULT 0,
  allowances NUMERIC DEFAULT 0,
  deductions NUMERIC DEFAULT 0,
  bonus NUMERIC DEFAULT 0,
  overtime NUMERIC DEFAULT 0,
  net_salary NUMERIC DEFAULT 0,
  working_days INTEGER DEFAULT 0,
  present_days INTEGER DEFAULT 0,
  absent_days INTEGER DEFAULT 0,
  leave_days INTEGER DEFAULT 0,
  status TEXT DEFAULT 'pending',
  paid_amount NUMERIC DEFAULT 0,
  paid_date DATE,
  payment_method TEXT,
  payment_reference TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(employee_id, salary_month)
);
ALTER TABLE public.monthly_salaries ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Super admins full access to monthly_salaries" ON public.monthly_salaries;
DROP POLICY IF EXISTS "Tenant users can manage monthly_salaries" ON public.monthly_salaries;
CREATE POLICY "Super admins full access to monthly_salaries" ON public.monthly_salaries FOR ALL USING (is_super_admin());
CREATE POLICY "Tenant users can manage monthly_salaries" ON public.monthly_salaries FOR ALL USING (tenant_id = get_user_tenant_id());

-- Salary Payments
CREATE TABLE IF NOT EXISTS public.salary_payments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  monthly_salary_id UUID REFERENCES public.monthly_salaries(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  amount NUMERIC NOT NULL DEFAULT 0,
  payment_date DATE NOT NULL DEFAULT CURRENT_DATE,
  payment_method TEXT DEFAULT 'cash',
  reference_no TEXT,
  notes TEXT,
  paid_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.salary_payments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Super admins full access to salary_payments" ON public.salary_payments;
DROP POLICY IF EXISTS "Tenant users can manage salary_payments" ON public.salary_payments;
CREATE POLICY "Super admins full access to salary_payments" ON public.salary_payments FOR ALL USING (is_super_admin());
CREATE POLICY "Tenant users can manage salary_payments" ON public.salary_payments FOR ALL USING (tenant_id = get_user_tenant_id());

-- Employee Ledger
CREATE TABLE IF NOT EXISTS public.employee_ledger (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  entry_date DATE NOT NULL DEFAULT CURRENT_DATE,
  transaction_type TEXT NOT NULL,
  debit NUMERIC DEFAULT 0,
  credit NUMERIC DEFAULT 0,
  balance NUMERIC DEFAULT 0,
  description TEXT,
  reference_id UUID,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.employee_ledger ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Super admins full access to employee_ledger" ON public.employee_ledger;
DROP POLICY IF EXISTS "Tenant users can manage employee_ledger" ON public.employee_ledger;
CREATE POLICY "Super admins full access to employee_ledger" ON public.employee_ledger FOR ALL USING (is_super_admin());
CREATE POLICY "Tenant users can manage employee_ledger" ON public.employee_ledger FOR ALL USING (tenant_id = get_user_tenant_id());

-- Connection Requests
CREATE TABLE IF NOT EXISTS public.connection_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  request_number TEXT,
  customer_name TEXT NOT NULL,
  phone TEXT NOT NULL,
  email TEXT,
  address TEXT,
  area_id UUID REFERENCES public.areas(id),
  package_id UUID REFERENCES public.isp_packages(id),
  nid_number TEXT,
  preferred_date DATE,
  notes TEXT,
  assigned_to UUID,
  status TEXT DEFAULT 'pending',
  rejection_reason TEXT,
  completed_at TIMESTAMP WITH TIME ZONE,
  customer_id UUID REFERENCES public.customers(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.connection_requests ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Super admins full access to connection_requests" ON public.connection_requests;
DROP POLICY IF EXISTS "Tenant users can manage connection_requests" ON public.connection_requests;
CREATE POLICY "Super admins full access to connection_requests" ON public.connection_requests FOR ALL USING (is_super_admin());
CREATE POLICY "Tenant users can manage connection_requests" ON public.connection_requests FOR ALL USING (tenant_id = get_user_tenant_id());

-- Customer Recharges
CREATE TABLE IF NOT EXISTS public.customer_recharges (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  amount NUMERIC NOT NULL DEFAULT 0,
  months INTEGER DEFAULT 1,
  recharge_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  payment_method TEXT DEFAULT 'cash',
  transaction_id TEXT,
  collected_by UUID,
  reseller_id UUID REFERENCES public.resellers(id),
  old_expiry DATE,
  new_expiry DATE,
  discount NUMERIC DEFAULT 0,
  status TEXT DEFAULT 'completed',
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.customer_recharges ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Super admins full access to customer_recharges" ON public.customer_recharges;
DROP POLICY IF EXISTS "Tenant users can manage customer_recharges" ON public.customer_recharges;
CREATE POLICY "Super admins full access to customer_recharges" ON public.customer_recharges FOR ALL USING (is_super_admin());
CREATE POLICY "Tenant users can manage customer_recharges" ON public.customer_recharges FOR ALL USING (tenant_id = get_user_tenant_id());

-- Multi Collections
CREATE TABLE IF NOT EXISTS public.multi_collections (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  collection_date DATE NOT NULL DEFAULT CURRENT_DATE,
  collected_by UUID,
  total_amount NUMERIC DEFAULT 0,
  total_customers INTEGER DEFAULT 0,
  payment_method TEXT DEFAULT 'cash',
  notes TEXT,
  status TEXT DEFAULT 'completed',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.multi_collections ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Super admins full access to multi_collections" ON public.multi_collections;
DROP POLICY IF EXISTS "Tenant users can manage multi_collections" ON public.multi_collections;
CREATE POLICY "Super admins full access to multi_collections" ON public.multi_collections FOR ALL USING (is_super_admin());
CREATE POLICY "Tenant users can manage multi_collections" ON public.multi_collections FOR ALL USING (tenant_id = get_user_tenant_id());

-- Multi Collection Items
CREATE TABLE IF NOT EXISTS public.multi_collection_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  multi_collection_id UUID NOT NULL REFERENCES public.multi_collections(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  amount NUMERIC NOT NULL DEFAULT 0,
  months INTEGER DEFAULT 1,
  old_expiry DATE,
  new_expiry DATE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.multi_collection_items ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Super admins full access to multi_collection_items" ON public.multi_collection_items;
DROP POLICY IF EXISTS "Tenant users can manage multi_collection_items" ON public.multi_collection_items;
CREATE POLICY "Super admins full access to multi_collection_items" ON public.multi_collection_items FOR ALL USING (is_super_admin());
CREATE POLICY "Tenant users can manage multi_collection_items" ON public.multi_collection_items FOR ALL 
  USING (EXISTS (SELECT 1 FROM public.multi_collections mc WHERE mc.id = multi_collection_id AND mc.tenant_id = get_user_tenant_id()));

-- Bill Generations
CREATE TABLE IF NOT EXISTS public.bill_generations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  billing_month TEXT NOT NULL,
  generated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  generated_by UUID,
  total_bills INTEGER DEFAULT 0,
  total_amount NUMERIC DEFAULT 0,
  status TEXT DEFAULT 'completed',
  notes TEXT
);
ALTER TABLE public.bill_generations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Super admins full access to bill_generations" ON public.bill_generations;
DROP POLICY IF EXISTS "Tenant users can manage bill_generations" ON public.bill_generations;
CREATE POLICY "Super admins full access to bill_generations" ON public.bill_generations FOR ALL USING (is_super_admin());
CREATE POLICY "Tenant users can manage bill_generations" ON public.bill_generations FOR ALL USING (tenant_id = get_user_tenant_id());

-- Suppliers
CREATE TABLE IF NOT EXISTS public.suppliers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  company_name TEXT,
  phone TEXT,
  email TEXT,
  address TEXT,
  contact_person TEXT,
  current_balance NUMERIC DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Super admins full access to suppliers" ON public.suppliers;
DROP POLICY IF EXISTS "Tenant users can manage suppliers" ON public.suppliers;
CREATE POLICY "Super admins full access to suppliers" ON public.suppliers FOR ALL USING (is_super_admin());
CREATE POLICY "Tenant users can manage suppliers" ON public.suppliers FOR ALL USING (tenant_id = get_user_tenant_id());

-- Purchase Orders
CREATE TABLE IF NOT EXISTS public.purchase_orders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  order_number TEXT,
  supplier_id UUID REFERENCES public.suppliers(id),
  order_date DATE NOT NULL DEFAULT CURRENT_DATE,
  expected_date DATE,
  subtotal NUMERIC DEFAULT 0,
  tax NUMERIC DEFAULT 0,
  discount NUMERIC DEFAULT 0,
  total NUMERIC DEFAULT 0,
  paid_amount NUMERIC DEFAULT 0,
  status TEXT DEFAULT 'pending',
  notes TEXT,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.purchase_orders ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Super admins full access to purchase_orders" ON public.purchase_orders;
DROP POLICY IF EXISTS "Tenant users can manage purchase_orders" ON public.purchase_orders;
CREATE POLICY "Super admins full access to purchase_orders" ON public.purchase_orders FOR ALL USING (is_super_admin());
CREATE POLICY "Tenant users can manage purchase_orders" ON public.purchase_orders FOR ALL USING (tenant_id = get_user_tenant_id());

-- Purchase Order Items
CREATE TABLE IF NOT EXISTS public.purchase_order_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  purchase_order_id UUID NOT NULL REFERENCES public.purchase_orders(id) ON DELETE CASCADE,
  item_id UUID NOT NULL REFERENCES public.inventory_items(id),
  quantity INTEGER NOT NULL DEFAULT 1,
  unit_price NUMERIC NOT NULL DEFAULT 0,
  received_quantity INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.purchase_order_items ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Super admins full access to purchase_order_items" ON public.purchase_order_items;
DROP POLICY IF EXISTS "Tenant users can manage purchase_order_items" ON public.purchase_order_items;
CREATE POLICY "Super admins full access to purchase_order_items" ON public.purchase_order_items FOR ALL USING (is_super_admin());
CREATE POLICY "Tenant users can manage purchase_order_items" ON public.purchase_order_items FOR ALL 
  USING (EXISTS (SELECT 1 FROM public.purchase_orders po WHERE po.id = purchase_order_id AND po.tenant_id = get_user_tenant_id()));

-- Sales Orders
CREATE TABLE IF NOT EXISTS public.sales_orders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  order_number TEXT,
  customer_id UUID REFERENCES public.customers(id),
  customer_name TEXT,
  order_date DATE NOT NULL DEFAULT CURRENT_DATE,
  subtotal NUMERIC DEFAULT 0,
  tax NUMERIC DEFAULT 0,
  discount NUMERIC DEFAULT 0,
  total NUMERIC DEFAULT 0,
  paid_amount NUMERIC DEFAULT 0,
  status TEXT DEFAULT 'pending',
  notes TEXT,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.sales_orders ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Super admins full access to sales_orders" ON public.sales_orders;
DROP POLICY IF EXISTS "Tenant users can manage sales_orders" ON public.sales_orders;
CREATE POLICY "Super admins full access to sales_orders" ON public.sales_orders FOR ALL USING (is_super_admin());
CREATE POLICY "Tenant users can manage sales_orders" ON public.sales_orders FOR ALL USING (tenant_id = get_user_tenant_id());

-- Sales Order Items
CREATE TABLE IF NOT EXISTS public.sales_order_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  sales_order_id UUID NOT NULL REFERENCES public.sales_orders(id) ON DELETE CASCADE,
  item_id UUID NOT NULL REFERENCES public.inventory_items(id),
  quantity INTEGER NOT NULL DEFAULT 1,
  unit_price NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.sales_order_items ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Super admins full access to sales_order_items" ON public.sales_order_items;
DROP POLICY IF EXISTS "Tenant users can manage sales_order_items" ON public.sales_order_items;
CREATE POLICY "Super admins full access to sales_order_items" ON public.sales_order_items FOR ALL USING (is_super_admin());
CREATE POLICY "Tenant users can manage sales_order_items" ON public.sales_order_items FOR ALL 
  USING (EXISTS (SELECT 1 FROM public.sales_orders so WHERE so.id = sales_order_id AND so.tenant_id = get_user_tenant_id()));

-- Inventory Ledger
CREATE TABLE IF NOT EXISTS public.inventory_ledger (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  item_id UUID NOT NULL REFERENCES public.inventory_items(id),
  entry_date DATE NOT NULL DEFAULT CURRENT_DATE,
  transaction_type TEXT NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 0,
  unit_price NUMERIC DEFAULT 0,
  total_value NUMERIC DEFAULT 0,
  stock_before INTEGER DEFAULT 0,
  stock_after INTEGER DEFAULT 0,
  reference_id UUID,
  reference_type TEXT,
  notes TEXT,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.inventory_ledger ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Super admins full access to inventory_ledger" ON public.inventory_ledger;
DROP POLICY IF EXISTS "Tenant users can manage inventory_ledger" ON public.inventory_ledger;
CREATE POLICY "Super admins full access to inventory_ledger" ON public.inventory_ledger FOR ALL USING (is_super_admin());
CREATE POLICY "Tenant users can manage inventory_ledger" ON public.inventory_ledger FOR ALL USING (tenant_id = get_user_tenant_id());

-- Helper functions
CREATE OR REPLACE FUNCTION public.generate_request_number(_tenant_id uuid)
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _count INTEGER; _number TEXT;
BEGIN
  SELECT COUNT(*) + 1 INTO _count FROM public.connection_requests WHERE tenant_id = _tenant_id;
  _number := 'REQ' || LPAD(_count::TEXT, 6, '0');
  RETURN _number;
END;
$$;

CREATE OR REPLACE FUNCTION public.generate_employee_code(_tenant_id uuid)
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _count INTEGER; _code TEXT;
BEGIN
  SELECT COUNT(*) + 1 INTO _count FROM public.employees WHERE tenant_id = _tenant_id;
  _code := 'EMP' || LPAD(_count::TEXT, 4, '0');
  RETURN _code;
END;
$$;

CREATE OR REPLACE FUNCTION public.generate_po_number(_tenant_id uuid)
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _year TEXT; _count INTEGER; _number TEXT;
BEGIN
  _year := TO_CHAR(NOW(), 'YY');
  SELECT COUNT(*) + 1 INTO _count FROM public.purchase_orders WHERE tenant_id = _tenant_id;
  _number := 'PO' || _year || LPAD(_count::TEXT, 5, '0');
  RETURN _number;
END;
$$;

CREATE OR REPLACE FUNCTION public.generate_so_number(_tenant_id uuid)
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _year TEXT; _count INTEGER; _number TEXT;
BEGIN
  _year := TO_CHAR(NOW(), 'YY');
  SELECT COUNT(*) + 1 INTO _count FROM public.sales_orders WHERE tenant_id = _tenant_id;
  _number := 'SO' || _year || LPAD(_count::TEXT, 5, '0');
  RETURN _number;
END;
$$;
