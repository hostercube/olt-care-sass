-- RLS policies for inventory_brands
CREATE POLICY "Users can view brands for their tenant" ON public.inventory_brands
FOR SELECT USING (tenant_id IN (SELECT tenant_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "Users can insert brands for their tenant" ON public.inventory_brands
FOR INSERT WITH CHECK (tenant_id IN (SELECT tenant_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "Users can update brands for their tenant" ON public.inventory_brands
FOR UPDATE USING (tenant_id IN (SELECT tenant_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "Users can delete brands for their tenant" ON public.inventory_brands
FOR DELETE USING (tenant_id IN (SELECT tenant_id FROM public.profiles WHERE id = auth.uid()));

-- RLS policies for inventory_units
CREATE POLICY "Users can view units for their tenant" ON public.inventory_units
FOR SELECT USING (tenant_id IN (SELECT tenant_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "Users can insert units for their tenant" ON public.inventory_units
FOR INSERT WITH CHECK (tenant_id IN (SELECT tenant_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "Users can update units for their tenant" ON public.inventory_units
FOR UPDATE USING (tenant_id IN (SELECT tenant_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "Users can delete units for their tenant" ON public.inventory_units
FOR DELETE USING (tenant_id IN (SELECT tenant_id FROM public.profiles WHERE id = auth.uid()));