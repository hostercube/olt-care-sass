-- Fix linter: move pg_net out of public by recreating it in extensions schema
DO $$
BEGIN
  CREATE SCHEMA IF NOT EXISTS extensions;

  IF EXISTS (
    SELECT 1 FROM pg_extension WHERE extname = 'pg_net'
  ) THEN
    DROP EXTENSION pg_net;
  END IF;

  -- Recreate in extensions schema
  CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;
END $$;
