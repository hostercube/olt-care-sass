-- Ensure related data is deleted automatically when an OLT is deleted

-- 1) OLT -> ONUs
ALTER TABLE public.onus
  DROP CONSTRAINT IF EXISTS onus_olt_id_fkey;
ALTER TABLE public.onus
  ADD CONSTRAINT onus_olt_id_fkey
  FOREIGN KEY (olt_id) REFERENCES public.olts(id)
  ON DELETE CASCADE;

-- 2) ONU -> power_readings
ALTER TABLE public.power_readings
  DROP CONSTRAINT IF EXISTS power_readings_onu_id_fkey;
ALTER TABLE public.power_readings
  ADD CONSTRAINT power_readings_onu_id_fkey
  FOREIGN KEY (onu_id) REFERENCES public.onus(id)
  ON DELETE CASCADE;

-- 3) ONU -> onu_status_history
ALTER TABLE public.onu_status_history
  DROP CONSTRAINT IF EXISTS onu_status_history_onu_id_fkey;
ALTER TABLE public.onu_status_history
  ADD CONSTRAINT onu_status_history_onu_id_fkey
  FOREIGN KEY (onu_id) REFERENCES public.onus(id)
  ON DELETE CASCADE;

-- 4) OLT -> debug logs
ALTER TABLE public.olt_debug_logs
  DROP CONSTRAINT IF EXISTS olt_debug_logs_olt_id_fkey;
ALTER TABLE public.olt_debug_logs
  ADD CONSTRAINT olt_debug_logs_olt_id_fkey
  FOREIGN KEY (olt_id) REFERENCES public.olts(id)
  ON DELETE CASCADE;

-- RLS: allow operators/admins to delete power readings when needed
DROP POLICY IF EXISTS "Operators and admins can delete power readings" ON public.power_readings;
CREATE POLICY "Operators and admins can delete power readings"
ON public.power_readings
FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'operator'::app_role));

-- RLS: allow operators/admins to delete status history when needed  
DROP POLICY IF EXISTS "Operators and admins can delete status history" ON public.onu_status_history;
CREATE POLICY "Operators and admins can delete status history"
ON public.onu_status_history
FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'operator'::app_role));