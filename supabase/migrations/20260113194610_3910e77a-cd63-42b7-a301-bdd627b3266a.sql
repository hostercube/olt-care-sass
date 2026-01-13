-- Add user_agent column for detailed device detection
ALTER TABLE public.location_visits 
ADD COLUMN IF NOT EXISTS user_agent text;