-- Enable realtime for onus table (if not already enabled)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'onus'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.onus;
  END IF;
END $$;

-- Enable full replica identity for complete row data in realtime
ALTER TABLE public.onus REPLICA IDENTITY FULL;

-- Enable realtime for power_readings table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'power_readings'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.power_readings;
  END IF;
END $$;

ALTER TABLE public.power_readings REPLICA IDENTITY FULL;