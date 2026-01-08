-- Create inventory brands table
CREATE TABLE IF NOT EXISTS public.inventory_brands (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  logo_url TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create inventory units table
CREATE TABLE IF NOT EXISTS public.inventory_units (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  short_name TEXT NOT NULL,
  unit_type TEXT NOT NULL DEFAULT 'quantity',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add new columns to inventory_items
ALTER TABLE public.inventory_items 
ADD COLUMN IF NOT EXISTS brand_id UUID,
ADD COLUMN IF NOT EXISTS unit_id UUID,
ADD COLUMN IF NOT EXISTS barcode TEXT,
ADD COLUMN IF NOT EXISTS color TEXT,
ADD COLUMN IF NOT EXISTS size TEXT,
ADD COLUMN IF NOT EXISTS weight NUMERIC,
ADD COLUMN IF NOT EXISTS dimensions TEXT,
ADD COLUMN IF NOT EXISTS warranty_period TEXT,
ADD COLUMN IF NOT EXISTS image_url TEXT;

-- Add tenant invoice branding fields
ALTER TABLE public.tenants
ADD COLUMN IF NOT EXISTS invoice_header TEXT,
ADD COLUMN IF NOT EXISTS invoice_footer TEXT,
ADD COLUMN IF NOT EXISTS invoice_terms TEXT,
ADD COLUMN IF NOT EXISTS invoice_prefix TEXT DEFAULT 'INV',
ADD COLUMN IF NOT EXISTS thermal_printer_enabled BOOLEAN DEFAULT false;

-- Add isp_customer_id to pos_sales
ALTER TABLE public.pos_sales 
ADD COLUMN IF NOT EXISTS isp_customer_id UUID;

-- Enable RLS
ALTER TABLE public.inventory_brands ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_units ENABLE ROW LEVEL SECURITY;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_inventory_brands_tenant ON public.inventory_brands(tenant_id);
CREATE INDEX IF NOT EXISTS idx_inventory_units_tenant ON public.inventory_units(tenant_id);
CREATE INDEX IF NOT EXISTS idx_inventory_items_barcode ON public.inventory_items(barcode);