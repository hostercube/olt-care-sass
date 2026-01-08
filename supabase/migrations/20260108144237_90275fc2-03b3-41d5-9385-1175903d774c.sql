-- Insert default units for all existing tenants (fixing the column reference)
INSERT INTO public.inventory_units (tenant_id, name, short_name, unit_type)
SELECT DISTINCT id, 'Piece', 'pcs', 'quantity' FROM public.tenants ON CONFLICT DO NOTHING;

INSERT INTO public.inventory_units (tenant_id, name, short_name, unit_type)
SELECT DISTINCT id, 'Kilogram', 'kg', 'weight' FROM public.tenants ON CONFLICT DO NOTHING;

INSERT INTO public.inventory_units (tenant_id, name, short_name, unit_type)
SELECT DISTINCT id, 'Gram', 'g', 'weight' FROM public.tenants ON CONFLICT DO NOTHING;

INSERT INTO public.inventory_units (tenant_id, name, short_name, unit_type)
SELECT DISTINCT id, 'Meter', 'm', 'length' FROM public.tenants ON CONFLICT DO NOTHING;

INSERT INTO public.inventory_units (tenant_id, name, short_name, unit_type)
SELECT DISTINCT id, 'Feet', 'ft', 'length' FROM public.tenants ON CONFLICT DO NOTHING;

INSERT INTO public.inventory_units (tenant_id, name, short_name, unit_type)
SELECT DISTINCT id, 'Liter', 'L', 'volume' FROM public.tenants ON CONFLICT DO NOTHING;

INSERT INTO public.inventory_units (tenant_id, name, short_name, unit_type)
SELECT DISTINCT id, 'Box', 'box', 'quantity' FROM public.tenants ON CONFLICT DO NOTHING;

INSERT INTO public.inventory_units (tenant_id, name, short_name, unit_type)
SELECT DISTINCT id, 'Pack', 'pack', 'quantity' FROM public.tenants ON CONFLICT DO NOTHING;