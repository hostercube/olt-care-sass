-- POS Customers table (separate from ISP customers)
CREATE TABLE IF NOT EXISTS public.pos_customers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  customer_code TEXT,
  name TEXT NOT NULL,
  phone TEXT,
  email TEXT,
  address TEXT,
  company_name TEXT,
  due_amount NUMERIC(12,2) DEFAULT 0,
  total_purchase NUMERIC(12,2) DEFAULT 0,
  notes TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_pos_customers_tenant ON public.pos_customers(tenant_id);
CREATE INDEX IF NOT EXISTS idx_pos_customers_phone ON public.pos_customers(phone);
CREATE UNIQUE INDEX IF NOT EXISTS idx_pos_customers_code ON public.pos_customers(tenant_id, customer_code);

-- Enable RLS
ALTER TABLE public.pos_customers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant users can view their POS customers" ON public.pos_customers
  FOR SELECT USING (tenant_id = public.get_user_tenant_id());

CREATE POLICY "Tenant users can insert their POS customers" ON public.pos_customers
  FOR INSERT WITH CHECK (tenant_id = public.get_user_tenant_id());

CREATE POLICY "Tenant users can update their POS customers" ON public.pos_customers
  FOR UPDATE USING (tenant_id = public.get_user_tenant_id());

CREATE POLICY "Tenant users can delete their POS customers" ON public.pos_customers
  FOR DELETE USING (tenant_id = public.get_user_tenant_id());

-- POS Sales/Invoices table
CREATE TABLE IF NOT EXISTS public.pos_sales (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  invoice_number TEXT NOT NULL,
  customer_id UUID REFERENCES public.pos_customers(id) ON DELETE SET NULL,
  customer_name TEXT,
  customer_phone TEXT,
  sale_date TIMESTAMP WITH TIME ZONE DEFAULT now(),
  subtotal NUMERIC(12,2) DEFAULT 0,
  discount NUMERIC(12,2) DEFAULT 0,
  tax NUMERIC(12,2) DEFAULT 0,
  total_amount NUMERIC(12,2) NOT NULL,
  paid_amount NUMERIC(12,2) DEFAULT 0,
  due_amount NUMERIC(12,2) DEFAULT 0,
  payment_method TEXT DEFAULT 'cash',
  payment_reference TEXT,
  status TEXT DEFAULT 'completed',
  notes TEXT,
  sold_by TEXT,
  send_sms BOOLEAN DEFAULT false,
  sms_sent BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_pos_sales_tenant ON public.pos_sales(tenant_id);
CREATE INDEX IF NOT EXISTS idx_pos_sales_customer ON public.pos_sales(customer_id);
CREATE INDEX IF NOT EXISTS idx_pos_sales_date ON public.pos_sales(sale_date);
CREATE UNIQUE INDEX IF NOT EXISTS idx_pos_sales_invoice ON public.pos_sales(tenant_id, invoice_number);

ALTER TABLE public.pos_sales ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant users can view their POS sales" ON public.pos_sales
  FOR SELECT USING (tenant_id = public.get_user_tenant_id());

CREATE POLICY "Tenant users can insert their POS sales" ON public.pos_sales
  FOR INSERT WITH CHECK (tenant_id = public.get_user_tenant_id());

CREATE POLICY "Tenant users can update their POS sales" ON public.pos_sales
  FOR UPDATE USING (tenant_id = public.get_user_tenant_id());

-- POS Sale Items
CREATE TABLE IF NOT EXISTS public.pos_sale_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  sale_id UUID NOT NULL REFERENCES public.pos_sales(id) ON DELETE CASCADE,
  item_id UUID REFERENCES public.inventory_items(id) ON DELETE SET NULL,
  item_name TEXT NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1,
  unit_price NUMERIC(12,2) NOT NULL,
  discount NUMERIC(12,2) DEFAULT 0,
  total_price NUMERIC(12,2) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_pos_sale_items_sale ON public.pos_sale_items(sale_id);

ALTER TABLE public.pos_sale_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant users can access sale items through sale" ON public.pos_sale_items
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.pos_sales WHERE id = pos_sale_items.sale_id AND tenant_id = public.get_user_tenant_id())
  );

-- POS Customer Payments (for due collection)
CREATE TABLE IF NOT EXISTS public.pos_customer_payments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES public.pos_customers(id) ON DELETE CASCADE,
  sale_id UUID REFERENCES public.pos_sales(id) ON DELETE SET NULL,
  amount NUMERIC(12,2) NOT NULL,
  payment_date TIMESTAMP WITH TIME ZONE DEFAULT now(),
  payment_method TEXT DEFAULT 'cash',
  reference TEXT,
  notes TEXT,
  collected_by TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_pos_payments_tenant ON public.pos_customer_payments(tenant_id);
CREATE INDEX IF NOT EXISTS idx_pos_payments_customer ON public.pos_customer_payments(customer_id);

ALTER TABLE public.pos_customer_payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant users can view their POS payments" ON public.pos_customer_payments
  FOR SELECT USING (tenant_id = public.get_user_tenant_id());

CREATE POLICY "Tenant users can insert their POS payments" ON public.pos_customer_payments
  FOR INSERT WITH CHECK (tenant_id = public.get_user_tenant_id());

-- Suppliers table (if not exists)
CREATE TABLE IF NOT EXISTS public.suppliers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  company_name TEXT,
  phone TEXT,
  email TEXT,
  address TEXT,
  contact_person TEXT,
  current_balance NUMERIC(12,2) DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_suppliers_tenant ON public.suppliers(tenant_id);

ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant users can view their suppliers" ON public.suppliers
  FOR SELECT USING (tenant_id = public.get_user_tenant_id());

CREATE POLICY "Tenant users can insert their suppliers" ON public.suppliers
  FOR INSERT WITH CHECK (tenant_id = public.get_user_tenant_id());

CREATE POLICY "Tenant users can update their suppliers" ON public.suppliers
  FOR UPDATE USING (tenant_id = public.get_user_tenant_id());

CREATE POLICY "Tenant users can delete their suppliers" ON public.suppliers
  FOR DELETE USING (tenant_id = public.get_user_tenant_id());

-- Purchase Orders (if not exists)
CREATE TABLE IF NOT EXISTS public.purchase_orders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  order_number TEXT,
  supplier_id UUID REFERENCES public.suppliers(id) ON DELETE SET NULL,
  order_date TIMESTAMP WITH TIME ZONE DEFAULT now(),
  expected_date TIMESTAMP WITH TIME ZONE,
  subtotal NUMERIC(12,2) DEFAULT 0,
  tax NUMERIC(12,2) DEFAULT 0,
  discount NUMERIC(12,2) DEFAULT 0,
  total NUMERIC(12,2) DEFAULT 0,
  paid_amount NUMERIC(12,2) DEFAULT 0,
  status TEXT DEFAULT 'pending',
  notes TEXT,
  created_by TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_purchase_orders_tenant ON public.purchase_orders(tenant_id);

ALTER TABLE public.purchase_orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant users can view their purchase orders" ON public.purchase_orders
  FOR SELECT USING (tenant_id = public.get_user_tenant_id());

CREATE POLICY "Tenant users can insert their purchase orders" ON public.purchase_orders
  FOR INSERT WITH CHECK (tenant_id = public.get_user_tenant_id());

CREATE POLICY "Tenant users can update their purchase orders" ON public.purchase_orders
  FOR UPDATE USING (tenant_id = public.get_user_tenant_id());

-- Purchase Order Items (if not exists)
CREATE TABLE IF NOT EXISTS public.purchase_order_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  purchase_order_id UUID NOT NULL REFERENCES public.purchase_orders(id) ON DELETE CASCADE,
  item_id UUID REFERENCES public.inventory_items(id) ON DELETE SET NULL,
  quantity INTEGER NOT NULL DEFAULT 1,
  unit_price NUMERIC(12,2) NOT NULL,
  received_quantity INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_po_items_order ON public.purchase_order_items(purchase_order_id);

ALTER TABLE public.purchase_order_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant users can access PO items through PO" ON public.purchase_order_items
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.purchase_orders WHERE id = purchase_order_items.purchase_order_id AND tenant_id = public.get_user_tenant_id())
  );

-- Sales Orders (if not exists)
CREATE TABLE IF NOT EXISTS public.sales_orders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  order_number TEXT,
  customer_id UUID,
  customer_name TEXT,
  order_date TIMESTAMP WITH TIME ZONE DEFAULT now(),
  subtotal NUMERIC(12,2) DEFAULT 0,
  tax NUMERIC(12,2) DEFAULT 0,
  discount NUMERIC(12,2) DEFAULT 0,
  total NUMERIC(12,2) DEFAULT 0,
  paid_amount NUMERIC(12,2) DEFAULT 0,
  status TEXT DEFAULT 'pending',
  notes TEXT,
  created_by TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_sales_orders_tenant ON public.sales_orders(tenant_id);

ALTER TABLE public.sales_orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant users can view their sales orders" ON public.sales_orders
  FOR SELECT USING (tenant_id = public.get_user_tenant_id());

CREATE POLICY "Tenant users can insert their sales orders" ON public.sales_orders
  FOR INSERT WITH CHECK (tenant_id = public.get_user_tenant_id());

CREATE POLICY "Tenant users can update their sales orders" ON public.sales_orders
  FOR UPDATE USING (tenant_id = public.get_user_tenant_id());

-- Sales Order Items (if not exists)
CREATE TABLE IF NOT EXISTS public.sales_order_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  sales_order_id UUID NOT NULL REFERENCES public.sales_orders(id) ON DELETE CASCADE,
  item_id UUID REFERENCES public.inventory_items(id) ON DELETE SET NULL,
  quantity INTEGER NOT NULL DEFAULT 1,
  unit_price NUMERIC(12,2) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_so_items_order ON public.sales_order_items(sales_order_id);

ALTER TABLE public.sales_order_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant users can access SO items through SO" ON public.sales_order_items
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.sales_orders WHERE id = sales_order_items.sales_order_id AND tenant_id = public.get_user_tenant_id())
  );

-- Enable realtime for POS tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.pos_sales;
ALTER PUBLICATION supabase_realtime ADD TABLE public.pos_customers;