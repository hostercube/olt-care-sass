-- =====================================================
-- BANDWIDTH MANAGEMENT MODULE
-- =====================================================

-- 1. Bandwidth Item Categories
CREATE TABLE public.bandwidth_item_categories (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 2. Bandwidth Items (Products)
CREATE TABLE public.bandwidth_items (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    category_id UUID REFERENCES public.bandwidth_item_categories(id) ON DELETE SET NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    unit VARCHAR(50) DEFAULT 'Mbps',
    unit_price DECIMAL(12,2) DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 3. Bandwidth Providers (Suppliers)
CREATE TABLE public.bandwidth_providers (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    company_name VARCHAR(255),
    email VARCHAR(255),
    phone VARCHAR(50),
    address TEXT,
    contact_person VARCHAR(255),
    account_number VARCHAR(100),
    bank_details TEXT,
    notes TEXT,
    total_due DECIMAL(12,2) DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 4. Bandwidth Purchase Bills (Buy)
CREATE TABLE public.bandwidth_purchase_bills (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    provider_id UUID REFERENCES public.bandwidth_providers(id) ON DELETE SET NULL,
    invoice_number VARCHAR(100) NOT NULL,
    billing_date DATE NOT NULL DEFAULT CURRENT_DATE,
    from_date DATE,
    to_date DATE,
    subtotal DECIMAL(12,2) DEFAULT 0,
    vat_amount DECIMAL(12,2) DEFAULT 0,
    discount DECIMAL(12,2) DEFAULT 0,
    total_amount DECIMAL(12,2) DEFAULT 0,
    paid_amount DECIMAL(12,2) DEFAULT 0,
    due_amount DECIMAL(12,2) DEFAULT 0,
    payment_status VARCHAR(50) DEFAULT 'due',
    payment_method VARCHAR(50),
    paid_by VARCHAR(255),
    received_by VARCHAR(255),
    remarks TEXT,
    attachment_url TEXT,
    created_by UUID,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 5. Bandwidth Purchase Bill Items
CREATE TABLE public.bandwidth_purchase_bill_items (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    bill_id UUID NOT NULL REFERENCES public.bandwidth_purchase_bills(id) ON DELETE CASCADE,
    item_id UUID REFERENCES public.bandwidth_items(id) ON DELETE SET NULL,
    item_name VARCHAR(255) NOT NULL,
    description TEXT,
    unit VARCHAR(50) DEFAULT 'Mbps',
    quantity DECIMAL(12,2) DEFAULT 1,
    rate DECIMAL(12,2) DEFAULT 0,
    vat_percent DECIMAL(5,2) DEFAULT 0,
    vat_amount DECIMAL(12,2) DEFAULT 0,
    from_date DATE,
    to_date DATE,
    total DECIMAL(12,2) DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 6. Bandwidth Clients (Sell to)
CREATE TABLE public.bandwidth_clients (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    company_name VARCHAR(255),
    email VARCHAR(255),
    phone VARCHAR(50),
    address TEXT,
    contact_person VARCHAR(255),
    account_number VARCHAR(100),
    bank_details TEXT,
    notes TEXT,
    total_receivable DECIMAL(12,2) DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 7. Bandwidth Sales Invoices (Sell)
CREATE TABLE public.bandwidth_sales_invoices (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    client_id UUID REFERENCES public.bandwidth_clients(id) ON DELETE SET NULL,
    invoice_number VARCHAR(100) NOT NULL,
    billing_date DATE NOT NULL DEFAULT CURRENT_DATE,
    due_date DATE,
    from_date DATE,
    to_date DATE,
    subtotal DECIMAL(12,2) DEFAULT 0,
    vat_amount DECIMAL(12,2) DEFAULT 0,
    discount DECIMAL(12,2) DEFAULT 0,
    total_amount DECIMAL(12,2) DEFAULT 0,
    paid_amount DECIMAL(12,2) DEFAULT 0,
    due_amount DECIMAL(12,2) DEFAULT 0,
    payment_status VARCHAR(50) DEFAULT 'due',
    remarks TEXT,
    attachment_url TEXT,
    created_by UUID,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 8. Bandwidth Sales Invoice Items
CREATE TABLE public.bandwidth_sales_invoice_items (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    invoice_id UUID NOT NULL REFERENCES public.bandwidth_sales_invoices(id) ON DELETE CASCADE,
    item_id UUID REFERENCES public.bandwidth_items(id) ON DELETE SET NULL,
    item_name VARCHAR(255) NOT NULL,
    description TEXT,
    unit VARCHAR(50) DEFAULT 'Mbps',
    quantity DECIMAL(12,2) DEFAULT 1,
    rate DECIMAL(12,2) DEFAULT 0,
    vat_percent DECIMAL(5,2) DEFAULT 0,
    vat_amount DECIMAL(12,2) DEFAULT 0,
    from_date DATE,
    to_date DATE,
    total DECIMAL(12,2) DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 9. Bandwidth Bill Collections (Payment Receipts)
CREATE TABLE public.bandwidth_bill_collections (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    client_id UUID REFERENCES public.bandwidth_clients(id) ON DELETE SET NULL,
    invoice_id UUID REFERENCES public.bandwidth_sales_invoices(id) ON DELETE SET NULL,
    receipt_number VARCHAR(100) NOT NULL,
    collection_date DATE NOT NULL DEFAULT CURRENT_DATE,
    amount DECIMAL(12,2) NOT NULL,
    payment_method VARCHAR(50) DEFAULT 'cash',
    received_by VARCHAR(255),
    remarks TEXT,
    created_by UUID,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 10. Bandwidth Provider Payments (Pay to providers)
CREATE TABLE public.bandwidth_provider_payments (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    provider_id UUID REFERENCES public.bandwidth_providers(id) ON DELETE SET NULL,
    bill_id UUID REFERENCES public.bandwidth_purchase_bills(id) ON DELETE SET NULL,
    payment_number VARCHAR(100) NOT NULL,
    payment_date DATE NOT NULL DEFAULT CURRENT_DATE,
    amount DECIMAL(12,2) NOT NULL,
    payment_method VARCHAR(50) DEFAULT 'bank_transfer',
    paid_by VARCHAR(255),
    remarks TEXT,
    created_by UUID,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.bandwidth_item_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bandwidth_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bandwidth_providers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bandwidth_purchase_bills ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bandwidth_purchase_bill_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bandwidth_clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bandwidth_sales_invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bandwidth_sales_invoice_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bandwidth_bill_collections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bandwidth_provider_payments ENABLE ROW LEVEL SECURITY;

-- RLS Policies for bandwidth_item_categories
CREATE POLICY "Tenant users can view their categories" ON public.bandwidth_item_categories
    FOR SELECT USING (
        tenant_id IN (SELECT tenant_id FROM public.tenant_users WHERE user_id = auth.uid())
        OR EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'super_admin')
    );

CREATE POLICY "Tenant users can insert categories" ON public.bandwidth_item_categories
    FOR INSERT WITH CHECK (
        tenant_id IN (SELECT tenant_id FROM public.tenant_users WHERE user_id = auth.uid())
        OR EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'super_admin')
    );

CREATE POLICY "Tenant users can update categories" ON public.bandwidth_item_categories
    FOR UPDATE USING (
        tenant_id IN (SELECT tenant_id FROM public.tenant_users WHERE user_id = auth.uid())
        OR EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'super_admin')
    );

CREATE POLICY "Tenant users can delete categories" ON public.bandwidth_item_categories
    FOR DELETE USING (
        tenant_id IN (SELECT tenant_id FROM public.tenant_users WHERE user_id = auth.uid())
        OR EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'super_admin')
    );

-- RLS Policies for bandwidth_items
CREATE POLICY "Tenant users can view their items" ON public.bandwidth_items
    FOR SELECT USING (
        tenant_id IN (SELECT tenant_id FROM public.tenant_users WHERE user_id = auth.uid())
        OR EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'super_admin')
    );

CREATE POLICY "Tenant users can insert items" ON public.bandwidth_items
    FOR INSERT WITH CHECK (
        tenant_id IN (SELECT tenant_id FROM public.tenant_users WHERE user_id = auth.uid())
        OR EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'super_admin')
    );

CREATE POLICY "Tenant users can update items" ON public.bandwidth_items
    FOR UPDATE USING (
        tenant_id IN (SELECT tenant_id FROM public.tenant_users WHERE user_id = auth.uid())
        OR EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'super_admin')
    );

CREATE POLICY "Tenant users can delete items" ON public.bandwidth_items
    FOR DELETE USING (
        tenant_id IN (SELECT tenant_id FROM public.tenant_users WHERE user_id = auth.uid())
        OR EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'super_admin')
    );

-- RLS Policies for bandwidth_providers
CREATE POLICY "Tenant users can view their providers" ON public.bandwidth_providers
    FOR SELECT USING (
        tenant_id IN (SELECT tenant_id FROM public.tenant_users WHERE user_id = auth.uid())
        OR EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'super_admin')
    );

CREATE POLICY "Tenant users can insert providers" ON public.bandwidth_providers
    FOR INSERT WITH CHECK (
        tenant_id IN (SELECT tenant_id FROM public.tenant_users WHERE user_id = auth.uid())
        OR EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'super_admin')
    );

CREATE POLICY "Tenant users can update providers" ON public.bandwidth_providers
    FOR UPDATE USING (
        tenant_id IN (SELECT tenant_id FROM public.tenant_users WHERE user_id = auth.uid())
        OR EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'super_admin')
    );

CREATE POLICY "Tenant users can delete providers" ON public.bandwidth_providers
    FOR DELETE USING (
        tenant_id IN (SELECT tenant_id FROM public.tenant_users WHERE user_id = auth.uid())
        OR EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'super_admin')
    );

-- RLS Policies for bandwidth_purchase_bills
CREATE POLICY "Tenant users can view their purchase bills" ON public.bandwidth_purchase_bills
    FOR SELECT USING (
        tenant_id IN (SELECT tenant_id FROM public.tenant_users WHERE user_id = auth.uid())
        OR EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'super_admin')
    );

CREATE POLICY "Tenant users can insert purchase bills" ON public.bandwidth_purchase_bills
    FOR INSERT WITH CHECK (
        tenant_id IN (SELECT tenant_id FROM public.tenant_users WHERE user_id = auth.uid())
        OR EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'super_admin')
    );

CREATE POLICY "Tenant users can update purchase bills" ON public.bandwidth_purchase_bills
    FOR UPDATE USING (
        tenant_id IN (SELECT tenant_id FROM public.tenant_users WHERE user_id = auth.uid())
        OR EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'super_admin')
    );

CREATE POLICY "Tenant users can delete purchase bills" ON public.bandwidth_purchase_bills
    FOR DELETE USING (
        tenant_id IN (SELECT tenant_id FROM public.tenant_users WHERE user_id = auth.uid())
        OR EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'super_admin')
    );

-- RLS Policies for bandwidth_purchase_bill_items (through parent bill)
CREATE POLICY "Users can view bill items through bill" ON public.bandwidth_purchase_bill_items
    FOR SELECT USING (
        bill_id IN (
            SELECT id FROM public.bandwidth_purchase_bills 
            WHERE tenant_id IN (SELECT tenant_id FROM public.tenant_users WHERE user_id = auth.uid())
        )
        OR EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'super_admin')
    );

CREATE POLICY "Users can insert bill items" ON public.bandwidth_purchase_bill_items
    FOR INSERT WITH CHECK (
        bill_id IN (
            SELECT id FROM public.bandwidth_purchase_bills 
            WHERE tenant_id IN (SELECT tenant_id FROM public.tenant_users WHERE user_id = auth.uid())
        )
        OR EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'super_admin')
    );

CREATE POLICY "Users can update bill items" ON public.bandwidth_purchase_bill_items
    FOR UPDATE USING (
        bill_id IN (
            SELECT id FROM public.bandwidth_purchase_bills 
            WHERE tenant_id IN (SELECT tenant_id FROM public.tenant_users WHERE user_id = auth.uid())
        )
        OR EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'super_admin')
    );

CREATE POLICY "Users can delete bill items" ON public.bandwidth_purchase_bill_items
    FOR DELETE USING (
        bill_id IN (
            SELECT id FROM public.bandwidth_purchase_bills 
            WHERE tenant_id IN (SELECT tenant_id FROM public.tenant_users WHERE user_id = auth.uid())
        )
        OR EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'super_admin')
    );

-- RLS Policies for bandwidth_clients
CREATE POLICY "Tenant users can view their clients" ON public.bandwidth_clients
    FOR SELECT USING (
        tenant_id IN (SELECT tenant_id FROM public.tenant_users WHERE user_id = auth.uid())
        OR EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'super_admin')
    );

CREATE POLICY "Tenant users can insert clients" ON public.bandwidth_clients
    FOR INSERT WITH CHECK (
        tenant_id IN (SELECT tenant_id FROM public.tenant_users WHERE user_id = auth.uid())
        OR EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'super_admin')
    );

CREATE POLICY "Tenant users can update clients" ON public.bandwidth_clients
    FOR UPDATE USING (
        tenant_id IN (SELECT tenant_id FROM public.tenant_users WHERE user_id = auth.uid())
        OR EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'super_admin')
    );

CREATE POLICY "Tenant users can delete clients" ON public.bandwidth_clients
    FOR DELETE USING (
        tenant_id IN (SELECT tenant_id FROM public.tenant_users WHERE user_id = auth.uid())
        OR EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'super_admin')
    );

-- RLS Policies for bandwidth_sales_invoices
CREATE POLICY "Tenant users can view their sales invoices" ON public.bandwidth_sales_invoices
    FOR SELECT USING (
        tenant_id IN (SELECT tenant_id FROM public.tenant_users WHERE user_id = auth.uid())
        OR EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'super_admin')
    );

CREATE POLICY "Tenant users can insert sales invoices" ON public.bandwidth_sales_invoices
    FOR INSERT WITH CHECK (
        tenant_id IN (SELECT tenant_id FROM public.tenant_users WHERE user_id = auth.uid())
        OR EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'super_admin')
    );

CREATE POLICY "Tenant users can update sales invoices" ON public.bandwidth_sales_invoices
    FOR UPDATE USING (
        tenant_id IN (SELECT tenant_id FROM public.tenant_users WHERE user_id = auth.uid())
        OR EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'super_admin')
    );

CREATE POLICY "Tenant users can delete sales invoices" ON public.bandwidth_sales_invoices
    FOR DELETE USING (
        tenant_id IN (SELECT tenant_id FROM public.tenant_users WHERE user_id = auth.uid())
        OR EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'super_admin')
    );

-- RLS Policies for bandwidth_sales_invoice_items
CREATE POLICY "Users can view invoice items through invoice" ON public.bandwidth_sales_invoice_items
    FOR SELECT USING (
        invoice_id IN (
            SELECT id FROM public.bandwidth_sales_invoices 
            WHERE tenant_id IN (SELECT tenant_id FROM public.tenant_users WHERE user_id = auth.uid())
        )
        OR EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'super_admin')
    );

CREATE POLICY "Users can insert invoice items" ON public.bandwidth_sales_invoice_items
    FOR INSERT WITH CHECK (
        invoice_id IN (
            SELECT id FROM public.bandwidth_sales_invoices 
            WHERE tenant_id IN (SELECT tenant_id FROM public.tenant_users WHERE user_id = auth.uid())
        )
        OR EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'super_admin')
    );

CREATE POLICY "Users can update invoice items" ON public.bandwidth_sales_invoice_items
    FOR UPDATE USING (
        invoice_id IN (
            SELECT id FROM public.bandwidth_sales_invoices 
            WHERE tenant_id IN (SELECT tenant_id FROM public.tenant_users WHERE user_id = auth.uid())
        )
        OR EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'super_admin')
    );

CREATE POLICY "Users can delete invoice items" ON public.bandwidth_sales_invoice_items
    FOR DELETE USING (
        invoice_id IN (
            SELECT id FROM public.bandwidth_sales_invoices 
            WHERE tenant_id IN (SELECT tenant_id FROM public.tenant_users WHERE user_id = auth.uid())
        )
        OR EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'super_admin')
    );

-- RLS Policies for bandwidth_bill_collections
CREATE POLICY "Tenant users can view their collections" ON public.bandwidth_bill_collections
    FOR SELECT USING (
        tenant_id IN (SELECT tenant_id FROM public.tenant_users WHERE user_id = auth.uid())
        OR EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'super_admin')
    );

CREATE POLICY "Tenant users can insert collections" ON public.bandwidth_bill_collections
    FOR INSERT WITH CHECK (
        tenant_id IN (SELECT tenant_id FROM public.tenant_users WHERE user_id = auth.uid())
        OR EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'super_admin')
    );

CREATE POLICY "Tenant users can update collections" ON public.bandwidth_bill_collections
    FOR UPDATE USING (
        tenant_id IN (SELECT tenant_id FROM public.tenant_users WHERE user_id = auth.uid())
        OR EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'super_admin')
    );

CREATE POLICY "Tenant users can delete collections" ON public.bandwidth_bill_collections
    FOR DELETE USING (
        tenant_id IN (SELECT tenant_id FROM public.tenant_users WHERE user_id = auth.uid())
        OR EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'super_admin')
    );

-- RLS Policies for bandwidth_provider_payments
CREATE POLICY "Tenant users can view their provider payments" ON public.bandwidth_provider_payments
    FOR SELECT USING (
        tenant_id IN (SELECT tenant_id FROM public.tenant_users WHERE user_id = auth.uid())
        OR EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'super_admin')
    );

CREATE POLICY "Tenant users can insert provider payments" ON public.bandwidth_provider_payments
    FOR INSERT WITH CHECK (
        tenant_id IN (SELECT tenant_id FROM public.tenant_users WHERE user_id = auth.uid())
        OR EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'super_admin')
    );

CREATE POLICY "Tenant users can update provider payments" ON public.bandwidth_provider_payments
    FOR UPDATE USING (
        tenant_id IN (SELECT tenant_id FROM public.tenant_users WHERE user_id = auth.uid())
        OR EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'super_admin')
    );

CREATE POLICY "Tenant users can delete provider payments" ON public.bandwidth_provider_payments
    FOR DELETE USING (
        tenant_id IN (SELECT tenant_id FROM public.tenant_users WHERE user_id = auth.uid())
        OR EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'super_admin')
    );

-- Add indexes for better query performance
CREATE INDEX idx_bandwidth_items_tenant ON public.bandwidth_items(tenant_id);
CREATE INDEX idx_bandwidth_items_category ON public.bandwidth_items(category_id);
CREATE INDEX idx_bandwidth_providers_tenant ON public.bandwidth_providers(tenant_id);
CREATE INDEX idx_bandwidth_clients_tenant ON public.bandwidth_clients(tenant_id);
CREATE INDEX idx_bandwidth_purchase_bills_tenant ON public.bandwidth_purchase_bills(tenant_id);
CREATE INDEX idx_bandwidth_purchase_bills_provider ON public.bandwidth_purchase_bills(provider_id);
CREATE INDEX idx_bandwidth_sales_invoices_tenant ON public.bandwidth_sales_invoices(tenant_id);
CREATE INDEX idx_bandwidth_sales_invoices_client ON public.bandwidth_sales_invoices(client_id);
CREATE INDEX idx_bandwidth_bill_collections_tenant ON public.bandwidth_bill_collections(tenant_id);
CREATE INDEX idx_bandwidth_provider_payments_tenant ON public.bandwidth_provider_payments(tenant_id);

-- Create updated_at triggers
CREATE TRIGGER update_bandwidth_item_categories_updated_at
    BEFORE UPDATE ON public.bandwidth_item_categories
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_bandwidth_items_updated_at
    BEFORE UPDATE ON public.bandwidth_items
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_bandwidth_providers_updated_at
    BEFORE UPDATE ON public.bandwidth_providers
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_bandwidth_clients_updated_at
    BEFORE UPDATE ON public.bandwidth_clients
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_bandwidth_purchase_bills_updated_at
    BEFORE UPDATE ON public.bandwidth_purchase_bills
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_bandwidth_sales_invoices_updated_at
    BEFORE UPDATE ON public.bandwidth_sales_invoices
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_bandwidth_bill_collections_updated_at
    BEFORE UPDATE ON public.bandwidth_bill_collections
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_bandwidth_provider_payments_updated_at
    BEFORE UPDATE ON public.bandwidth_provider_payments
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();