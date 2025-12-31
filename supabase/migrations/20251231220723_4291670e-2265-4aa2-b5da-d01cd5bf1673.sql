-- Add temperature, distance, and offline_reason columns to onus table
ALTER TABLE public.onus 
ADD COLUMN IF NOT EXISTS temperature numeric DEFAULT NULL,
ADD COLUMN IF NOT EXISTS distance numeric DEFAULT NULL,
ADD COLUMN IF NOT EXISTS offline_reason text DEFAULT NULL;

-- Add index for faster filtering
CREATE INDEX IF NOT EXISTS idx_onus_status ON public.onus(status);
CREATE INDEX IF NOT EXISTS idx_onus_olt_id_status ON public.onus(olt_id, status);