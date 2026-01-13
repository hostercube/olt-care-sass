-- Force PostgREST schema cache reload (fixes "Could not find the 'nid_number' column" errors)
DO $$
BEGIN
  PERFORM pg_notify('pgrst', 'reload schema');
  PERFORM pg_notify('pgrst', 'reload config');
END $$;