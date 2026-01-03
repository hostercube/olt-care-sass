-- Enable RLS on system_languages and system_currencies
ALTER TABLE public.system_languages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_currencies ENABLE ROW LEVEL SECURITY;

-- Allow anyone to view languages and currencies (public read)
CREATE POLICY "Anyone can view languages" ON public.system_languages FOR SELECT USING (true);
CREATE POLICY "Super admins can manage languages" ON public.system_languages FOR ALL USING (is_super_admin());

CREATE POLICY "Anyone can view currencies" ON public.system_currencies FOR SELECT USING (true);
CREATE POLICY "Super admins can manage currencies" ON public.system_currencies FOR ALL USING (is_super_admin());