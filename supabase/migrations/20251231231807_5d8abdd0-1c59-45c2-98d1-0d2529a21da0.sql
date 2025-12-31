-- Alerts: allow authenticated users to delete + ensure UPDATE has WITH CHECK
ALTER TABLE public.alerts ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  -- Recreate UPDATE policy with WITH CHECK
  IF EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'alerts'
      AND policyname = 'Authenticated users can update alerts'
  ) THEN
    EXECUTE 'DROP POLICY "Authenticated users can update alerts" ON public.alerts';
  END IF;
END $$;

CREATE POLICY "Authenticated users can update alerts"
ON public.alerts
FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

-- Add DELETE policy so frontend delete works
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'alerts'
      AND policyname = 'Authenticated users can delete alerts'
  ) THEN
    EXECUTE 'DROP POLICY "Authenticated users can delete alerts" ON public.alerts';
  END IF;
END $$;

CREATE POLICY "Authenticated users can delete alerts"
ON public.alerts
FOR DELETE
TO authenticated
USING (true);
