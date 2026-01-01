-- Create device health history table for storing CPU, RAM, uptime snapshots
CREATE TABLE public.device_health_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  device_id UUID NOT NULL,
  device_type TEXT NOT NULL CHECK (device_type IN ('olt', 'mikrotik')),
  device_name TEXT NOT NULL,
  cpu_percent NUMERIC,
  memory_percent NUMERIC,
  uptime_seconds BIGINT,
  free_memory_bytes BIGINT,
  total_memory_bytes BIGINT,
  recorded_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create index for efficient querying by device and time
CREATE INDEX idx_device_health_device_id ON public.device_health_history(device_id);
CREATE INDEX idx_device_health_recorded_at ON public.device_health_history(recorded_at DESC);
CREATE INDEX idx_device_health_device_time ON public.device_health_history(device_id, recorded_at DESC);

-- Enable Row Level Security
ALTER TABLE public.device_health_history ENABLE ROW LEVEL SECURITY;

-- Create policies for authenticated users to view
CREATE POLICY "Authenticated users can view device health history" 
ON public.device_health_history 
FOR SELECT 
USING (true);

-- Create policy for system to insert health data
CREATE POLICY "System can insert device health history" 
ON public.device_health_history 
FOR INSERT 
WITH CHECK (true);

-- Create policy for operators and admins to delete old data
CREATE POLICY "Operators and admins can delete device health history" 
ON public.device_health_history 
FOR DELETE 
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'operator'::app_role));

-- Enable realtime for this table
ALTER PUBLICATION supabase_realtime ADD TABLE public.device_health_history;

-- Add comments for documentation
COMMENT ON TABLE public.device_health_history IS 'Stores periodic CPU, RAM, and uptime snapshots for OLTs and MikroTik devices';
COMMENT ON COLUMN public.device_health_history.cpu_percent IS 'CPU usage percentage (0-100)';
COMMENT ON COLUMN public.device_health_history.memory_percent IS 'Memory usage percentage (0-100)';
COMMENT ON COLUMN public.device_health_history.uptime_seconds IS 'Device uptime in seconds';