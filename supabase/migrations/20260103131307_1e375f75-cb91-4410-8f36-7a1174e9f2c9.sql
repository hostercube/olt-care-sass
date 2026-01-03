-- Add new SMS gateway columns
ALTER TABLE public.tenant_sms_gateways 
ADD COLUMN IF NOT EXISTS api_secret TEXT,
ADD COLUMN IF NOT EXISTS username TEXT,
ADD COLUMN IF NOT EXISTS password TEXT;

-- Update sms_gateway_settings for super admin too
ALTER TABLE public.sms_gateway_settings
ADD COLUMN IF NOT EXISTS api_secret TEXT,
ADD COLUMN IF NOT EXISTS username TEXT,
ADD COLUMN IF NOT EXISTS password TEXT;

-- Create districts table
CREATE TABLE IF NOT EXISTS public.districts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(tenant_id, name)
);

-- Create upazilas (police stations) table
CREATE TABLE IF NOT EXISTS public.upazilas (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  district_id UUID NOT NULL REFERENCES public.districts(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(district_id, name)
);

-- Create unions table
CREATE TABLE IF NOT EXISTS public.unions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  upazila_id UUID NOT NULL REFERENCES public.upazilas(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(upazila_id, name)
);

-- Create villages/markets table
CREATE TABLE IF NOT EXISTS public.villages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  union_id UUID NOT NULL REFERENCES public.unions(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  section_block TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(union_id, name)
);

-- Update areas table to reference the new hierarchy
ALTER TABLE public.areas
ADD COLUMN IF NOT EXISTS district_id UUID REFERENCES public.districts(id),
ADD COLUMN IF NOT EXISTS upazila_id UUID REFERENCES public.upazilas(id),
ADD COLUMN IF NOT EXISTS union_id UUID REFERENCES public.unions(id),
ADD COLUMN IF NOT EXISTS village_id UUID REFERENCES public.villages(id),
ADD COLUMN IF NOT EXISTS section_block TEXT;

-- Enable RLS on new tables
ALTER TABLE public.districts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.upazilas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.unions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.villages ENABLE ROW LEVEL SECURITY;

-- RLS policies for districts
CREATE POLICY "Super admins full access to districts" ON public.districts
  FOR ALL USING (is_super_admin());

CREATE POLICY "Tenant users can manage districts" ON public.districts
  FOR ALL USING (tenant_id = get_user_tenant_id());

-- RLS policies for upazilas  
CREATE POLICY "Super admins full access to upazilas" ON public.upazilas
  FOR ALL USING (is_super_admin());

CREATE POLICY "Tenant users can manage upazilas" ON public.upazilas
  FOR ALL USING (tenant_id = get_user_tenant_id());

-- RLS policies for unions
CREATE POLICY "Super admins full access to unions" ON public.unions
  FOR ALL USING (is_super_admin());

CREATE POLICY "Tenant users can manage unions" ON public.unions
  FOR ALL USING (tenant_id = get_user_tenant_id());

-- RLS policies for villages
CREATE POLICY "Super admins full access to villages" ON public.villages
  FOR ALL USING (is_super_admin());

CREATE POLICY "Tenant users can manage villages" ON public.villages
  FOR ALL USING (tenant_id = get_user_tenant_id());