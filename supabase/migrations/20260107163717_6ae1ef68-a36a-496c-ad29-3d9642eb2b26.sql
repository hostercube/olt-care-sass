-- Add username column to resellers if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'resellers' 
    AND column_name = 'username'
  ) THEN
    ALTER TABLE public.resellers ADD COLUMN username TEXT UNIQUE;
  END IF;
END $$;

-- Create indexes for faster login lookup
CREATE INDEX IF NOT EXISTS idx_staff_login ON public.staff(username, tenant_id) WHERE can_login = true;
CREATE INDEX IF NOT EXISTS idx_reseller_login ON public.resellers(username, tenant_id);