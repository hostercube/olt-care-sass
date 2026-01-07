-- Add manager_staff_id to reseller_branches so branch managers can be selected from the Staff module
ALTER TABLE public.reseller_branches
ADD COLUMN IF NOT EXISTS manager_staff_id uuid;

-- FK to staff table (tenant staff)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'reseller_branches_manager_staff_id_fkey'
  ) THEN
    ALTER TABLE public.reseller_branches
    ADD CONSTRAINT reseller_branches_manager_staff_id_fkey
    FOREIGN KEY (manager_staff_id) REFERENCES public.staff(id)
    ON DELETE SET NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_reseller_branches_manager_staff_id
  ON public.reseller_branches(manager_staff_id);

-- Optional: keep manager_employee_id for legacy, but ensure it's nullable (should already be)
-- No data migration is performed here because staff and employees are separate systems.
