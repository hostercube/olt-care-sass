DO $$
BEGIN
  -- Add 'trial' to subscription_status enum (needed for module access + signup trials)
  IF NOT EXISTS (
    SELECT 1
    FROM pg_enum e
    JOIN pg_type t ON t.oid = e.enumtypid
    WHERE t.typname = 'subscription_status'
      AND e.enumlabel = 'trial'
  ) THEN
    ALTER TYPE public.subscription_status ADD VALUE 'trial' BEFORE 'active';
  END IF;
END $$;

DO $$
BEGIN
  -- Add 'pending' to tenant_status enum (needed when defaultTrialDays = 0)
  IF NOT EXISTS (
    SELECT 1
    FROM pg_enum e
    JOIN pg_type t ON t.oid = e.enumtypid
    WHERE t.typname = 'tenant_status'
      AND e.enumlabel = 'pending'
  ) THEN
    ALTER TYPE public.tenant_status ADD VALUE 'pending' BEFORE 'trial';
  END IF;
END $$;
