-- Create table to store OLT polling debug logs for troubleshooting
CREATE TABLE public.olt_debug_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  olt_id UUID REFERENCES public.olts(id) ON DELETE CASCADE,
  olt_name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  raw_output TEXT,
  parsed_count INTEGER DEFAULT 0,
  connection_method TEXT,
  commands_sent TEXT[],
  error_message TEXT,
  duration_ms INTEGER
);

-- Enable RLS
ALTER TABLE public.olt_debug_logs ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to read debug logs
CREATE POLICY "Authenticated users can view debug logs" 
ON public.olt_debug_logs 
FOR SELECT 
TO authenticated
USING (true);

-- Create index for faster queries
CREATE INDEX idx_olt_debug_logs_olt_id ON public.olt_debug_logs(olt_id);
CREATE INDEX idx_olt_debug_logs_created_at ON public.olt_debug_logs(created_at DESC);

-- Add realtime for debug logs
ALTER PUBLICATION supabase_realtime ADD TABLE public.olt_debug_logs;