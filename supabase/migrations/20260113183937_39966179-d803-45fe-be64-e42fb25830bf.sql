
-- Create location_visits table for customer location capture
CREATE TABLE public.location_visits (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  token VARCHAR(64) NOT NULL,
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  full_address TEXT,
  area VARCHAR(255),
  district VARCHAR(255),
  thana VARCHAR(255),
  ip_address VARCHAR(45),
  isp_name VARCHAR(255),
  asn VARCHAR(100),
  device_type VARCHAR(50),
  name VARCHAR(255),
  phone VARCHAR(20),
  verified_status VARCHAR(20) DEFAULT 'pending' CHECK (verified_status IN ('pending', 'verified', 'completed')),
  verified_by UUID,
  verified_at TIMESTAMP WITH TIME ZONE,
  visited_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create tenant_location_settings table for unique link tokens
CREATE TABLE public.tenant_location_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE UNIQUE,
  unique_token VARCHAR(64) NOT NULL UNIQUE,
  is_active BOOLEAN DEFAULT true,
  popup_title VARCHAR(255) DEFAULT 'Please provide your details',
  popup_description TEXT DEFAULT 'Enter your name and phone number for verification',
  require_name BOOLEAN DEFAULT false,
  require_phone BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create indexes for better query performance
CREATE INDEX idx_location_visits_tenant_id ON public.location_visits(tenant_id);
CREATE INDEX idx_location_visits_token ON public.location_visits(token);
CREATE INDEX idx_location_visits_verified_status ON public.location_visits(verified_status);
CREATE INDEX idx_location_visits_visited_at ON public.location_visits(visited_at);
CREATE INDEX idx_tenant_location_settings_token ON public.tenant_location_settings(unique_token);

-- Enable RLS
ALTER TABLE public.location_visits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tenant_location_settings ENABLE ROW LEVEL SECURITY;

-- RLS Policies for location_visits
-- Tenants can only view their own location visits
CREATE POLICY "Tenants can view own location visits"
ON public.location_visits FOR SELECT
USING (
  tenant_id IN (
    SELECT tenant_id FROM public.tenant_users WHERE user_id = auth.uid()
  )
);

-- Tenants can update their own location visits (for verification)
CREATE POLICY "Tenants can update own location visits"
ON public.location_visits FOR UPDATE
USING (
  tenant_id IN (
    SELECT tenant_id FROM public.tenant_users WHERE user_id = auth.uid()
  )
);

-- Public can insert location visits (for anonymous customers visiting links)
CREATE POLICY "Public can insert location visits"
ON public.location_visits FOR INSERT
WITH CHECK (true);

-- RLS Policies for tenant_location_settings
CREATE POLICY "Tenants can view own location settings"
ON public.tenant_location_settings FOR SELECT
USING (
  tenant_id IN (
    SELECT tenant_id FROM public.tenant_users WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Tenants can insert own location settings"
ON public.tenant_location_settings FOR INSERT
WITH CHECK (
  tenant_id IN (
    SELECT tenant_id FROM public.tenant_users WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Tenants can update own location settings"
ON public.tenant_location_settings FOR UPDATE
USING (
  tenant_id IN (
    SELECT tenant_id FROM public.tenant_users WHERE user_id = auth.uid()
  )
);

-- Public can view location settings by token (for public location capture page)
CREATE POLICY "Public can view active location settings"
ON public.tenant_location_settings FOR SELECT
USING (is_active = true);

-- Create function to generate unique token
CREATE OR REPLACE FUNCTION public.generate_location_token()
RETURNS TEXT AS $$
DECLARE
  chars TEXT := 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  result TEXT := '';
  i INTEGER;
BEGIN
  FOR i IN 1..32 LOOP
    result := result || substr(chars, floor(random() * length(chars) + 1)::integer, 1);
  END LOOP;
  RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to update updated_at
CREATE TRIGGER update_location_visits_updated_at
BEFORE UPDATE ON public.location_visits
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_tenant_location_settings_updated_at
BEFORE UPDATE ON public.tenant_location_settings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
