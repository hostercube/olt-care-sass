-- Support Tickets System for ISP Management
-- This creates a complete ticket management system per tenant

-- Create ticket status enum
DO $$ BEGIN
  CREATE TYPE ticket_status AS ENUM ('open', 'in_progress', 'waiting', 'resolved', 'closed');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Create ticket priority enum
DO $$ BEGIN
  CREATE TYPE ticket_priority AS ENUM ('low', 'medium', 'high', 'urgent');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Create support_tickets table
CREATE TABLE IF NOT EXISTS public.support_tickets (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  ticket_number TEXT NOT NULL,
  customer_id UUID REFERENCES public.customers(id) ON DELETE SET NULL,
  customer_name TEXT,
  customer_phone TEXT,
  customer_email TEXT,
  subject TEXT NOT NULL,
  description TEXT,
  status ticket_status DEFAULT 'open',
  priority ticket_priority DEFAULT 'medium',
  category TEXT,
  assigned_to UUID,
  assigned_name TEXT,
  resolved_at TIMESTAMP WITH TIME ZONE,
  closed_at TIMESTAMP WITH TIME ZONE,
  resolution_notes TEXT,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(tenant_id, ticket_number)
);

-- Create ticket_comments table for ticket discussions
CREATE TABLE IF NOT EXISTS public.ticket_comments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  ticket_id UUID NOT NULL REFERENCES public.support_tickets(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  comment TEXT NOT NULL,
  is_internal BOOLEAN DEFAULT false,
  created_by UUID,
  created_by_name TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create ticket categories table for custom categories per tenant
CREATE TABLE IF NOT EXISTS public.ticket_categories (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(tenant_id, name)
);

-- Enable RLS
ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ticket_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ticket_categories ENABLE ROW LEVEL SECURITY;

-- RLS Policies for support_tickets
CREATE POLICY "Tenants can view their own tickets" 
ON public.support_tickets FOR SELECT 
USING (
  tenant_id IN (SELECT tenant_id FROM public.tenant_users WHERE user_id = auth.uid())
  OR public.is_super_admin()
);

CREATE POLICY "Tenants can create their own tickets" 
ON public.support_tickets FOR INSERT 
WITH CHECK (
  tenant_id IN (SELECT tenant_id FROM public.tenant_users WHERE user_id = auth.uid())
  OR public.is_super_admin()
);

CREATE POLICY "Tenants can update their own tickets" 
ON public.support_tickets FOR UPDATE 
USING (
  tenant_id IN (SELECT tenant_id FROM public.tenant_users WHERE user_id = auth.uid())
  OR public.is_super_admin()
);

CREATE POLICY "Tenants can delete their own tickets" 
ON public.support_tickets FOR DELETE 
USING (
  tenant_id IN (SELECT tenant_id FROM public.tenant_users WHERE user_id = auth.uid())
  OR public.is_super_admin()
);

-- RLS Policies for ticket_comments
CREATE POLICY "Tenants can view their ticket comments" 
ON public.ticket_comments FOR SELECT 
USING (
  tenant_id IN (SELECT tenant_id FROM public.tenant_users WHERE user_id = auth.uid())
  OR public.is_super_admin()
);

CREATE POLICY "Tenants can create ticket comments" 
ON public.ticket_comments FOR INSERT 
WITH CHECK (
  tenant_id IN (SELECT tenant_id FROM public.tenant_users WHERE user_id = auth.uid())
  OR public.is_super_admin()
);

CREATE POLICY "Tenants can update their ticket comments" 
ON public.ticket_comments FOR UPDATE 
USING (
  tenant_id IN (SELECT tenant_id FROM public.tenant_users WHERE user_id = auth.uid())
  OR public.is_super_admin()
);

CREATE POLICY "Tenants can delete their ticket comments" 
ON public.ticket_comments FOR DELETE 
USING (
  tenant_id IN (SELECT tenant_id FROM public.tenant_users WHERE user_id = auth.uid())
  OR public.is_super_admin()
);

-- RLS Policies for ticket_categories
CREATE POLICY "Tenants can view their ticket categories" 
ON public.ticket_categories FOR SELECT 
USING (
  tenant_id IN (SELECT tenant_id FROM public.tenant_users WHERE user_id = auth.uid())
  OR public.is_super_admin()
);

CREATE POLICY "Tenants can manage their ticket categories" 
ON public.ticket_categories FOR ALL 
USING (
  tenant_id IN (SELECT tenant_id FROM public.tenant_users WHERE user_id = auth.uid())
  OR public.is_super_admin()
);

-- Function to generate ticket number
CREATE OR REPLACE FUNCTION public.generate_ticket_number(_tenant_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE 
  _count INTEGER; 
  _number TEXT;
BEGIN
  SELECT COUNT(*) + 1 INTO _count FROM public.support_tickets WHERE tenant_id = _tenant_id;
  _number := 'TKT' || LPAD(_count::TEXT, 6, '0');
  RETURN _number;
END;
$$;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_support_tickets_tenant_id ON public.support_tickets(tenant_id);
CREATE INDEX IF NOT EXISTS idx_support_tickets_status ON public.support_tickets(status);
CREATE INDEX IF NOT EXISTS idx_support_tickets_customer_id ON public.support_tickets(customer_id);
CREATE INDEX IF NOT EXISTS idx_ticket_comments_ticket_id ON public.ticket_comments(ticket_id);
CREATE INDEX IF NOT EXISTS idx_ticket_categories_tenant_id ON public.ticket_categories(tenant_id);

-- Updated at trigger for support_tickets
CREATE TRIGGER update_support_tickets_updated_at
BEFORE UPDATE ON public.support_tickets
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();