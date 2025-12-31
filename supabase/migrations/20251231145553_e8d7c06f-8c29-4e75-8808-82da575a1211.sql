-- Create onu_status_history table for tracking uptime
CREATE TABLE IF NOT EXISTS public.onu_status_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  onu_id UUID NOT NULL REFERENCES public.onus(id) ON DELETE CASCADE,
  status TEXT NOT NULL,
  changed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  duration_seconds INTEGER DEFAULT 0
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_onu_status_history_onu_id ON public.onu_status_history(onu_id);
CREATE INDEX IF NOT EXISTS idx_onu_status_history_changed_at ON public.onu_status_history(changed_at);

-- Enable RLS
ALTER TABLE public.onu_status_history ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to view status history
CREATE POLICY "Authenticated users can view status history"
ON public.onu_status_history
FOR SELECT
USING (true);

-- Allow system to insert status history
CREATE POLICY "System can insert status history"
ON public.onu_status_history
FOR INSERT
WITH CHECK (true);